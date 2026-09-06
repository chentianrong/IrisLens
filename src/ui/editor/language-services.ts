import type { IDisposable, languages } from 'monaco-editor';

export type LanguageHandlers = {
  completion?: (model: { getValue(): string }, position: { lineNumber: number; column: number }) => Array<{ label: string; insertText: string; detail?: string }>;
  hover?: (model: { getValue(): string }, position: { lineNumber: number; column: number }) => { contents: string[] } | null;
  definition?: (model: { getValue(): string }, position: { lineNumber: number; column: number }) => Array<{ uri: string; range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } }>;
  format?: (model: { getValue(): string }) => string;
};

export function registerMonacoLanguageFeatures(
  monaco: typeof import('monaco-editor'),
  language: string,
  handlers: LanguageHandlers
): IDisposable[] {
  const disposables: IDisposable[] = [];
  if (handlers.completion) {
    disposables.push(monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems: (model, position) => ({
        suggestions: handlers.completion!(model, position).map((item, index) => ({
          label: item.label,
          kind: monaco.languages.CompletionItemKind.Text,
          insertText: item.insertText,
          detail: item.detail,
          sortText: String(index).padStart(4, '0')
        })) as never
      })
    }));
  }
  if (handlers.hover) {
    disposables.push(monaco.languages.registerHoverProvider(language, {
      provideHover: (model, position) => {
        const hover = handlers.hover!(model, position);
        return hover ? { contents: hover.contents.map((value) => ({ value })) } : null;
      }
    }));
  }
  if (handlers.definition) {
    disposables.push(monaco.languages.registerDefinitionProvider(language, {
      provideDefinition: (model, position) => handlers.definition!(model, position).map((item) => ({
        uri: monaco.Uri.parse(item.uri),
        range: item.range
      }))
    }));
  }
  if (handlers.format) {
    disposables.push(monaco.languages.registerDocumentFormattingEditProvider(language, {
      provideDocumentFormattingEdits: (model) => [{
        range: model.getFullModelRange(),
        text: handlers.format!(model)
      }]
    }));
  }
  return disposables;
}
