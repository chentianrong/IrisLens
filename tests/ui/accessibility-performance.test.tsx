import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentPanel } from '../../src/ui/agent/AgentPanel.js';
import { Workbench } from '../../src/ui/Workbench.js';
import { darkTokens } from '../../src/ui/theme/tokens.js';

describe('Agent accessibility and startup budget', () => {
  it('exposes desktop landmarks and controls within the render budget', () => {
    const started = performance.now();
    render(
      <div>
        <Workbench themeMode="dark" onThemeChange={() => undefined} agent={<div>Agent</div>} settings={<div>Settings</div>} />
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
          onSubmit={() => undefined}
          onRetry={() => undefined}
          onStop={() => undefined}
          onRestartGateway={() => undefined}
          onApprovePatch={() => undefined}
          onRejectPatch={() => undefined}
          onApproveTerminal={() => undefined}
          onRejectTerminal={() => undefined}
          onOpenConversation={() => undefined}
        />
      </div>
    );
    const elapsed = performance.now() - started;
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByLabelText('Prompt')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy();
    expect(elapsed).toBeLessThan(500);
  });
});
