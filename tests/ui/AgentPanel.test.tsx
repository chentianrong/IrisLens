import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AgentPanel } from '../../src/ui/agent/AgentPanel.js';
import { darkTokens } from '../../src/ui/theme/tokens.js';
import type { ChatMessage, ContextReference } from '../../src/types.js';

const contexts: ContextReference[] = [{ id: 'active:src/app.ts', type: 'active-file', label: 'src/app.ts', path: 'src/app.ts', content: 'code' }];
const messages: ChatMessage[] = [{ id: 'm1', conversationId: 'c1', role: 'assistant', content: 'Working', state: 'complete', createdAt: '' }];

function renderPanel(overrides: Partial<Parameters<typeof AgentPanel>[0]> = {}) {
  const props = {
    tokens: darkTokens, messages, contexts, gatewayState: 'ready' as const, width: 380,
    onOpen: vi.fn(), onClose: vi.fn(), onCollapse: vi.fn(), onResize: vi.fn(),
    onAddContext: vi.fn(), onRemoveContext: vi.fn(), onSubmit: vi.fn(), onRetry: vi.fn(), onStop: vi.fn(),
    onRestartGateway: vi.fn(), onApprovePatch: vi.fn(), onRejectPatch: vi.fn(), onApproveTerminal: vi.fn(), onRejectTerminal: vi.fn(), onOpenConversation: vi.fn(),
    ...overrides
  };
  render(<AgentPanel {...props} />);
  return props;
}

describe('AgentPanel', () => {
  it('disables chat while gateway is unavailable and offers restart', () => {
    const props = renderPanel({ gatewayState: 'error', gatewayError: 'start failed' });
    expect((screen.getByLabelText('Prompt') as HTMLTextAreaElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Restart gateway'));
    expect(props.onRestartGateway).toHaveBeenCalled();
  });

  it('submits visible context and shows message state', () => {
    const props = renderPanel();
    fireEvent.click(screen.getByText('Send'));
    expect(props.onSubmit).toHaveBeenCalledWith('', contexts);
    expect(screen.getByText('Working')).toBeTruthy();
    expect(screen.getByRole('article').getAttribute('data-state')).toBe('complete');
  });

  it('opens collapsible context references', () => {
    renderPanel();
    fireEvent.click(screen.getByText('1 context references'));
    expect(screen.getByText('src/app.ts')).toBeTruthy();
  });
});
