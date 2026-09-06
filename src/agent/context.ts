import type { ContextReference } from '../types.js';

export interface WorkspaceContextSource {
  activeFile?: { path: string; content: string };
  selection?: { path: string; content: string };
  search?: { query: string; matches: Array<{ path: string; content: string }> };
  explicit?: ContextReference[];
}

export function captureContext(source: WorkspaceContextSource): ContextReference[] {
  const references: ContextReference[] = [];
  if (source.activeFile) {
    references.push({
      id: `active:${source.activeFile.path}`,
      type: 'active-file',
      label: source.activeFile.path,
      path: source.activeFile.path,
      content: source.activeFile.content
    });
  }
  if (source.selection) {
    references.push({
      id: `selection:${source.selection.path}`,
      type: 'selection',
      label: `Selection — ${source.selection.path}`,
      path: source.selection.path,
      content: source.selection.content
    });
  }
  for (const [index, match] of (source.search?.matches ?? []).entries()) {
    references.push({
      id: `search:${source.search?.query}:${match.path}:${index}`,
      type: 'search',
      label: match.path,
      path: match.path,
      content: match.content
    });
  }
  references.push(...(source.explicit ?? []));
  return deduplicate(references);
}

export function buildRequestPayload(input: {
  message: string;
  context: ContextReference[];
  model: string;
}): { model: string; messages: Array<{ role: 'user'; content: string }>; context: ContextReference[] } {
  if (!input.message.trim()) throw new Error('Agent input is empty');
  if (!input.model.trim()) throw new Error('No default chat model selected');
  return {
    model: input.model,
    messages: [{ role: 'user', content: input.message }],
    context: input.context
  };
}

function deduplicate(references: ContextReference[]): ContextReference[] {
  const seen = new Set<string>();
  return references.filter((reference) => {
    if (seen.has(reference.id)) return false;
    seen.add(reference.id);
    return true;
  });
}
