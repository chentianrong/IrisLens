import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Workbench } from '../../src/ui/Workbench.js';

describe('IrisLens workbench', () => {
  it('opens, closes, collapses, and resizes the Agent panel', () => {
    render(
      <Workbench themeMode="dark" onThemeChange={() => undefined} agent={<div>Agent content</div>} settings={<div>Settings content</div>} />
    );
    expect(screen.getByLabelText('Agent panel')).toBeTruthy();

    fireEvent.click(screen.getByText('Collapse Agent'));
    expect(screen.queryByLabelText('Agent panel')).toBeNull();

    fireEvent.click(screen.getByText('Open Agent'));
    fireEvent.change(screen.getByLabelText('Agent panel width'), { target: { value: '420' } });
    expect(screen.getByRole('status').textContent).toContain('Width: 420px');

    fireEvent.click(screen.getByText('Close Agent'));
    expect(screen.queryByLabelText('Agent panel')).toBeNull();
  });

  it('follows the selected system theme', () => {
    const onThemeChange = vi.fn();
    render(<Workbench themeMode="system" systemPrefersDark onThemeChange={onThemeChange} />);
    expect(screen.getByRole('status').textContent).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'light' } });
    expect(onThemeChange).toHaveBeenCalledWith('light');
  });
});
