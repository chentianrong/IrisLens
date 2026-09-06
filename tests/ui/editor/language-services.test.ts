import { describe, expect, it, vi } from 'vitest';
import { registerMonacoLanguageFeatures } from '../../../src/ui/editor/language-services.js';

describe('Monaco language bridge', () => {
  it('registers deterministic completion, hover, definition, and formatting providers', () => {
    const registered: string[] = [];
    const monaco = {
      languages: {
        CompletionItemKind: { Text: 15 },
        registerCompletionItemProvider: vi.fn((_language, provider) => { registered.push('completion'); return { dispose() {} }; }),
        registerHoverProvider: vi.fn((_language, provider) => { registered.push('hover'); return { dispose() {} }; }),
        registerDefinitionProvider: vi.fn((_language, provider) => { registered.push('definition'); return { dispose() {} }; }),
        registerDocumentFormattingEditProvider: vi.fn((_language, provider) => { registered.push('format'); return { dispose() {} }; })
      },
      Uri: { parse: (value: string) => ({ value }) }
    } as never;
    const disposables = registerMonacoLanguageFeatures(monaco, 'typescript', {
      completion: () => [{ label: 'value', insertText: 'value' }],
      hover: () => ({ contents: ['A value'] }),
      definition: () => [{ uri: 'file:///a.ts', range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 2 } }],
      format: () => 'formatted'
    });
    expect(registered).toEqual(['completion', 'hover', 'definition', 'format']);
    disposables.forEach((disposable) => disposable.dispose());
  });
});
