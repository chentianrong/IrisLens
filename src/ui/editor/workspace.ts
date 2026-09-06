export type WorkspaceEntry = { path: string; name: string; directory: boolean };

export type WorkspaceApi = {
  listWorkspaceFiles(path?: string): Promise<WorkspaceEntry[]>;
  readWorkspaceFile(path: string): Promise<string>;
  writeWorkspaceFile(path: string, content: string): Promise<void>;
};

export function languageForPath(path: string): string {
  const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  switch (extension) {
    case 'ts': case 'tsx': return 'typescript';
    case 'js': case 'jsx': case 'mjs': case 'cjs': return 'javascript';
    case 'json': return 'json';
    case 'css': return 'css';
    case 'html': return 'html';
    case 'md': return 'markdown';
    case 'py': return 'python';
    case 'yml': case 'yaml': return 'yaml';
    default: return path.endsWith('.iris') ? 'irislens' : 'plaintext';
  }
}
