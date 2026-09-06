import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkspaceEditor } from '../../../src/ui/editor/WorkspaceEditor.js';

vi.mock('monaco-editor/esm/vs/editor/editor.main.js', () => {
  throw new Error('test fallback');
});

const api = {
  listWorkspaceFiles: vi.fn().mockResolvedValue([
    { path: 'src', name: 'src', directory: true },
    { path: 'README.md', name: 'README.md', directory: false }
  ]),
  readWorkspaceFile: vi.fn().mockResolvedValue('# hello'),
  writeWorkspaceFile: vi.fn().mockResolvedValue(undefined)
};

describe('WorkspaceEditor', () => {
  it('opens files and saves through workspace IPC', async () => {
    render(<WorkspaceEditor api={api} themeMode="dark" />);
    await waitFor(() => expect(screen.getByRole('tab', { name: /README\.md/ })).toBeTruthy());
    const textarea = await screen.findByRole('textbox', { name: 'Plain text editor for file:///README.md' });
    fireEvent.change(textarea, { target: { value: '# changed' } });
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    await waitFor(() => expect(api.writeWorkspaceFile).toHaveBeenCalledWith('README.md', '# changed'));
  });
});
