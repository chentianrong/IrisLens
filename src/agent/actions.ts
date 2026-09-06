import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { FilePatch, TerminalCommand } from '../types.js';

export interface WorkspaceEditor {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
}

export interface TerminalRunner {
  run(command: string): Promise<void>;
}

function unifiedDiff(path: string, before: string, after: string): string {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  return [
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ -1,${beforeLines.length} +1,${afterLines.length} @@`,
    ...beforeLines.map((line) => `-${line}`),
    ...afterLines.map((line) => `+${line}`)
  ].join('\n');
}

export function renderPatchDiff(patch: FilePatch): string {
  return unifiedDiff(patch.path, patch.before, patch.after);
}

export async function approvePatch(patch: FilePatch, editor: WorkspaceEditor): Promise<FilePatch> {
  if (patch.decision === 'approved') throw new Error('Patch was already approved');
  const current = await editor.read(patch.path);
  if (current !== patch.before) throw new Error('Workspace changed before patch approval');
  const tempPath = `${patch.path}.irislens-${Date.now()}.tmp`;
  await mkdir(dirname(patch.path), { recursive: true });
  await writeFile(tempPath, patch.after, 'utf8');
  await rename(tempPath, patch.path);
  return { ...patch, decision: 'approved' };
}

export function rejectPatch(patch: FilePatch): FilePatch {
  return { ...patch, decision: 'rejected' };
}

export async function approveTerminal(command: TerminalCommand, runner: TerminalRunner): Promise<TerminalCommand> {
  if (command.decision !== 'proposed') throw new Error('Only a proposed command can be approved');
  await runner.run(command.command);
  return { ...command, decision: 'executed' };
}

export function rejectTerminal(command: TerminalCommand): TerminalCommand {
  return { ...command, decision: 'rejected' };
}
