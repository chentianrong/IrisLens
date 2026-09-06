import type { MonacoDiagnostic } from '../ui/editor/MonacoEditor.js';
import type { LspDiagnostic } from './lsp.js';

export function lspDiagnosticsToMonaco(diagnostic: LspDiagnostic): MonacoDiagnostic[] {
  return diagnostic.diagnostics.map((item) => ({
    message: item.message,
    severity: item.severity === 1 ? 'error' : item.severity === 2 ? 'warning' : 'info',
    startLineNumber: item.range.start.line + 1,
    startColumn: item.range.start.character + 1
  }));
}

export function lspCompletionToMonaco(result: unknown): Array<{ label: string; insertText: string; detail?: string }> {
  const items = Array.isArray(result) ? result : ((result as { items?: unknown[] })?.items ?? []);
  return items.map((item) => {
    const value = item as { label?: string | { label?: string }; insertText?: string; detail?: string };
    const label = typeof value.label === 'string' ? value.label : value.label?.label ?? '';
    return { label, insertText: value.insertText ?? label, detail: value.detail };
  });
}

export function lspHoverToMonaco(result: unknown): { contents: string[] } | null {
  const value = result as { contents?: unknown } | null;
  if (!value) return null;
  const contents = Array.isArray(value.contents) ? value.contents : [value.contents];
  return { contents: contents.map((item) => typeof item === 'string' ? item : (item as { value?: string }).value ?? '').filter(Boolean) };
}

export function lspDefinitionToMonaco(result: unknown): Array<{ uri: string; range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } }> {
  const locations = Array.isArray(result) ? result : [result];
  return locations.filter(Boolean).map((item) => {
    const location = item as { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } };
    return {
      uri: location.uri,
      range: {
        startLineNumber: location.range.start.line + 1,
        startColumn: location.range.start.character + 1,
        endLineNumber: location.range.end.line + 1,
        endColumn: location.range.end.character + 1
      }
    };
  });
}

export function lspTextEditsToMonaco(result: unknown): Array<{ range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }; text: string }> {
  const edits = Array.isArray(result) ? result : [];
  return edits.map((item) => {
    const edit = item as { range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string };
    return {
      range: {
        startLineNumber: edit.range.start.line + 1,
        startColumn: edit.range.start.character + 1,
        endLineNumber: edit.range.end.line + 1,
        endColumn: edit.range.end.character + 1
      },
      text: edit.newText
    };
  });
}
