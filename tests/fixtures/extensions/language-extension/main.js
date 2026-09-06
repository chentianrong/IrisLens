export function activate(api) {
  api.workspace.onDidChangeConfiguration(() => undefined, 'irislens.language-fixture');
}
