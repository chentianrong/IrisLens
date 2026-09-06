import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AgentWorkbench } from '../../src/ui/agent/AgentWorkbench.js';
import type { AgentWorkbenchApi } from '../../src/api.js';

function api(overrides: Partial<AgentWorkbenchApi> = {}): AgentWorkbenchApi {
  return {
    bootstrap: vi.fn().mockResolvedValue({
      gateway: { state: 'ready', port: 4123 },
      modelRoute: { id: 'default', baseUrl: 'https://api.example.com', provider: 'openai-compatible', endpointProtocol: 'https', model: 'gpt-test', defaultChat: true, secretRef: 'model-route:default' },
      conversationId: 'conversation-1',
      unsentInput: '',
      messages: [],
      contexts: [],
      patches: [],
      terminalCommands: [],
      history: []
    }),
    captureContext: vi.fn().mockResolvedValue(null),
    sendChat: vi.fn(async (_request, onToken) => {
      onToken('Hello');
      onToken(' world');
      return { content: 'Hello world', stopped: false };
    }),
    stopChat: vi.fn().mockResolvedValue(undefined),
    restartGateway: vi.fn().mockResolvedValue({ state: 'ready' }),
    saveConversation: vi.fn().mockResolvedValue(undefined),
    checkpoint: vi.fn().mockResolvedValue(undefined),
    listConversations: vi.fn().mockResolvedValue([]),
    openConversation: vi.fn().mockResolvedValue(null),
    approvePatch: vi.fn(),
    rejectPatch: vi.fn(),
    approveTerminal: vi.fn(),
    rejectTerminal: vi.fn(),
    ...overrides
  };
}

describe('AgentWorkbench', () => {
  it('streams assistant tokens into the generating message', async () => {
    const agentApi = api();
    render(<AgentWorkbench api={agentApi} />);
    await waitFor(() => expect(agentApi.bootstrap).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: 'Summarize' } });
    fireEvent.keyDown(screen.getByLabelText('Prompt'), { key: 'Enter', ctrlKey: true });
    await screen.findByText('Hello world');
    await waitFor(() => expect(screen.getByText('Hello world').closest('article')?.getAttribute('data-state')).toBe('complete'));
    expect(agentApi.sendChat).toHaveBeenCalledWith(expect.objectContaining({ prompt: 'Summarize', model: 'gpt-test' }), expect.any(Function));
  });

  it('stops an active request and retains received content', async () => {
    let rejectRequest: ((error: unknown) => void) | undefined;
    const agentApi = api({
      sendChat: vi.fn((_request, onToken): Promise<{ content: string; stopped: boolean }> => new Promise((_resolve, reject) => {
        onToken('partial');
        rejectRequest = reject;
      })),
      stopChat: vi.fn().mockResolvedValue(undefined)
    });
    render(<AgentWorkbench api={agentApi} />);
    await screen.findByLabelText('Prompt');
    fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: 'Long response' } });
    fireEvent.keyDown(screen.getByLabelText('Prompt'), { key: 'Enter', ctrlKey: true });
    await screen.findByText('partial');
    fireEvent.click(screen.getByText('Stop'));
    rejectRequest?.(new DOMException('aborted', 'AbortError'));
    await waitFor(() => expect(agentApi.stopChat).toHaveBeenCalled());
    expect(screen.getByText('partial')).toBeTruthy();
  });
});
