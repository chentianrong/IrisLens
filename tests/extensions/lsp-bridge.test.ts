import { describe, expect, it } from 'vitest';
import { lspCompletionToMonaco, lspDefinitionToMonaco, lspDiagnosticsToMonaco, lspHoverToMonaco, lspTextEditsToMonaco } from '../../src/extensions/lsp-bridge.js';

describe('LSP to Monaco bridge', () => {
  it('maps diagnostics, completions, and hover', () => {
    expect(lspDiagnosticsToMonaco({ uri: 'file:///a.ts', diagnostics: [{ message: 'bad', severity: 1, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } } }] })[0]).toMatchObject({ severity: 'error', startLineNumber: 1 });
    expect(lspCompletionToMonaco({ items: [{ label: { label: 'value' }, detail: 'detail' }] })).toEqual([{ label: 'value', insertText: 'value', detail: 'detail' }]);
    expect(lspHoverToMonaco({ contents: [{ value: 'hello' }] })).toEqual({ contents: ['hello'] });
    expect(lspDefinitionToMonaco({ uri: 'file:///a.ts', range: { start: { line: 1, character: 2 }, end: { line: 3, character: 4 } } })).toEqual([{ uri: 'file:///a.ts', range: { startLineNumber: 2, startColumn: 3, endLineNumber: 4, endColumn: 5 } }]);
    expect(lspTextEditsToMonaco([{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, newText: 'x' }])).toEqual([{ range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 2 }, text: 'x' }]);
  });
});
