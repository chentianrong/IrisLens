import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { approvePatch, approveTerminal, rejectPatch, rejectTerminal, renderPatchDiff } from '../../src/agent/actions.js';
import type { FilePatch, TerminalCommand } from '../../src/types.js';

describe('approval-safe Agent actions', () => {
  async function createPatch(): Promise<FilePatch> {
    const patchPath = join(await mkdtemp(join(tmpdir(), 'irislens-patch-')), 'a.ts');
    await writeFile(patchPath, 'const a = 1;\n', 'utf8');
    return { id: 'p1', conversationId: 'c1', path: patchPath, before: 'const a = 1;\n', after: 'const a = 2;\n', decision: 'proposed' };
  }

  const command: TerminalCommand = { id: 't1', conversationId: 'c1', command: 'npm test', decision: 'proposed' };

  it('renders a per-file review diff', async () => {
    const patch = await createPatch();
    expect(renderPatchDiff(patch)).toContain(`--- a/${patch.path}`);
    expect(renderPatchDiff(patch)).toContain('+const a = 2;');
  });

  it('applies only when content matches and uses an atomic write', async () => {
    const patch = await createPatch();
    const editor = { read: async () => patch.before, write: async () => undefined };
    const approved = await approvePatch(patch, editor);
    expect(approved.decision).toBe('approved');
    await expect(readFile(patch.path, 'utf8')).resolves.toBe(patch.after);
  });

  it('refuses a stale patch and rejects without writing', async () => {
    const patch = await createPatch();
    await expect(approvePatch(patch, { read: async () => 'changed', write: async () => undefined })).rejects.toThrow('Workspace changed before patch approval');
    expect(rejectPatch(patch).decision).toBe('rejected');
  });

  it('runs a terminal command only after approval and records rejection otherwise', async () => {
    const runner = { run: vi.fn() };
    await approveTerminal(command, runner);
    expect(runner.run).toHaveBeenCalledWith('npm test');
    rejectTerminal(command);
    expect(runner.run).toHaveBeenCalledTimes(1);
  });
});
