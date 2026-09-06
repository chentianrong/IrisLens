import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { editor, IDisposable, Uri } from 'monaco-editor';

type MonacoModule = typeof import('monaco-editor');
export type MonacoDiagnostic = { message: string; severity: 'error' | 'warning' | 'info'; startLineNumber?: number; startColumn?: number };
export type MonacoTheme = 'irislens-light' | 'irislens-dark';

export type MonacoEditorProps = {
  modelUri: string;
  value: string;
  language: string;
  theme: MonacoTheme;
  readOnly?: boolean;
  onChange: (value: string) => void;
  onDiagnostics?: (diagnostics: MonacoDiagnostic[]) => void;
  onFallback?: () => void;
};

export function applyMonacoDiagnostics(
  monaco: MonacoModule,
  modelUri: string,
  diagnostics: MonacoDiagnostic[]
): void {
  const owner = 'irislens-extension-runtime';
  monaco.editor.setModelMarkers(monaco.editor.getModel(monaco.Uri.parse(modelUri))!, owner, diagnostics.map((item) => ({
    message: item.message,
    severity: item.severity === 'error' ? monaco.MarkerSeverity.Error : item.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Info,
    startLineNumber: item.startLineNumber ?? 1,
    startColumn: item.startColumn ?? 1,
    endLineNumber: item.startLineNumber ?? 1,
    endColumn: (item.startColumn ?? 1) + 1
  })));
}

export function MonacoEditor(props: MonacoEditorProps): ReactElement {
  const container = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const disposables = useRef<IDisposable[]>([]);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void import('monaco-editor/esm/vs/editor/editor.main.js').then(async (monaco) => {
      if (cancelled || !container.current) return;
      const globalWindow = window as typeof window & { MonacoEnvironment?: { getWorkerUrl?: () => string } };
      globalWindow.MonacoEnvironment ??= {
        getWorkerUrl: () => new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url).toString()
      };
      monaco.editor.defineTheme('irislens-light', { base: 'vs', inherit: true, rules: [], colors: { 'editor.background': '#ffffff' } });
      monaco.editor.defineTheme('irislens-dark', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#11151b' } });
      const model = monaco.editor.createModel(props.value, props.language, monaco.Uri.parse(props.modelUri));
      const instance = monaco.editor.create(container.current, { model, theme: props.theme, automaticLayout: true, readOnly: props.readOnly, minimap: { enabled: false } });
      editorRef.current = instance;
      disposables.current.push(model.onDidChangeContent(() => props.onChange(model.getValue())));
      monaco.editor.onDidChangeMarkers(() => {
        const uri = monaco.Uri.parse(props.modelUri);
        props.onDiagnostics?.(monaco.editor.getModelMarkers({ resource: uri }).map((marker) => ({
          message: marker.message,
          severity: marker.severity === monaco.MarkerSeverity.Error ? 'error' : marker.severity === monaco.MarkerSeverity.Warning ? 'warning' : 'info',
          startLineNumber: marker.startLineNumber,
          startColumn: marker.startColumn
        })));
      });
      setReady(true);
    }).catch(() => {
      setFallback(true);
      props.onFallback?.();
    });
    return () => {
      cancelled = true;
      disposables.current.splice(0).forEach((disposable) => disposable.dispose());
      editorRef.current?.dispose();
      editorRef.current = null;
    };
  }, [props.language, props.modelUri, props.theme]);

  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (model && model.getValue() !== props.value) model.pushEditOperations([], [{ range: model.getFullModelRange(), text: props.value }], () => null);
  }, [props.value]);

  if (fallback) {
    return (
      <textarea
        aria-label={`Plain text editor for ${props.modelUri}`}
        data-editor-mode="plain-text"
        value={props.value}
        readOnly={props.readOnly}
        onChange={(event) => props.onChange(event.target.value)}
        style={{ width: '100%', height: '100%', resize: 'none' }}
      />
    );
  }

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <div ref={container} style={{ height: '100%' }} data-editor-mode={ready ? 'monaco' : 'loading'} />
      {!ready ? <div aria-live="polite">Loading editor…</div> : null}
    </div>
  );
}

export type { Uri };
