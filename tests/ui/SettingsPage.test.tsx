import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsPage } from '../../src/ui/settings/SettingsPage.js';
import { bundledSchema } from '../../src/gateway/schema.js';
import { darkTokens } from '../../src/ui/theme/tokens.js';

describe('SettingsPage', () => {
  it('renders schema-driven fields and saves one route', () => {
    const onSave = vi.fn();
    render(
      <SettingsPage
        tokens={darkTokens}
        schema={bundledSchema}
        onSave={onSave}
        onProbe={() => undefined}
      />
    );
    fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'https://api.example.com' } });
    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'secret' } });
    fireEvent.change(screen.getByLabelText('Model name'), { target: { value: 'gpt-test' } });
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ provider: 'openai-compatible', endpointProtocol: 'https', model: 'gpt-test' }));
  });

  it('discloses bundled fallback', () => {
    render(<SettingsPage tokens={darkTokens} schema={bundledSchema} onSave={() => undefined} onProbe={() => undefined} />);
    expect(screen.getByRole('alert').textContent).toContain('bundled LiteLLM schema');
  });
});
