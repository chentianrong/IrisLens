import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AgentPanel } from '../../src/ui/agent/AgentPanel.js';
import { darkTokens } from '../../src/ui/theme/tokens.js';

describe('Agent keyboard conventions', () => {
  it('sends with Ctrl+Enter and retains VS Code-style desktop layout', () => {
    const onSubmit = vi.fn();
    render(
      <AgentPanel
        tokens={darkTokens}
        messages={[]}
        contexts={[]}
        gatewayState="ready"
        width={380}
        onOpen={() => undefined}
        onClose={() => undefined}
        onCollapse={() => undefined}
        onResize={() => undefined}
        onAddContext={() => undefined}
        onRemoveContext={() => undefined}
        onSubmit={onSubmit}
        onRetry={() => undefined}
        onStop={() => undefined}
        onRestartGateway={() => undefined}
        onApprovePatch={() => undefined}
        onRejectPatch={() => undefined}
        onApproveTerminal={() => undefined}
        onRejectTerminal={() => undefined}
        onOpenConversation={() => undefined}
      />
    );
    fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: 'hello' } });
    fireEvent.keyDown(screen.getByLabelText('Prompt'), { key: 'Enter', ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledWith('hello', []);
  });
});
