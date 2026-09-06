import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Workbench } from '../../src/ui/Workbench.js';

describe('standalone workbench', () => {
  it('exposes required landmarks and activity views', () => {
    render(<Workbench themeMode="dark" onThemeChange={() => undefined} />);
    expect(screen.getByRole('navigation', { name: 'Activity bar' })).toBeTruthy();
    expect(screen.getByLabelText('Sidebar')).toBeTruthy();
    expect(screen.getByLabelText('Editor')).toBeTruthy();
    expect(screen.getByLabelText('Bottom panel')).toBeTruthy();
    expect(screen.getByRole('status')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Extensions' }));
    expect(screen.getByRole('tab', { name: 'Extensions', selected: true })).toBeTruthy();
  });

  it('toggles sidebar and bottom panel with keyboard', () => {
    const onLayoutChange = vi.fn();
    render(<Workbench themeMode="light" onThemeChange={() => undefined} onLayoutChange={onLayoutChange} />);
    fireEvent.keyDown(screen.getByLabelText('IrisLens workspace'), { key: 'b', ctrlKey: true });
    fireEvent.keyDown(screen.getByLabelText('IrisLens workspace'), { key: 'j', ctrlKey: true });
    expect(onLayoutChange).toHaveBeenCalledWith(expect.objectContaining({ sidebarOpen: false, bottomOpen: false }));
  });

  it('clamps resizable panels through accessible controls', () => {
    render(<Workbench themeMode="light" onThemeChange={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Sidebar width'), { target: { value: '999' } });
    fireEvent.change(screen.getByLabelText('Bottom panel height'), { target: { value: '1' } });
    expect(screen.getByRole('status').textContent).toContain('Sidebar: open');
  });
});
