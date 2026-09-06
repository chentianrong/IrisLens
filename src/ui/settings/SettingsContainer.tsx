import { useEffect, useState, type ReactElement } from 'react';
import type { DiscoveredSchema } from '../../gateway/schema.js';
import type { ModelRoute } from '../../gateway/settings.js';
import type { IrisTokens } from '../theme/tokens.js';
import { SettingsPage } from './SettingsPage.js';

import type { WindowAgentApi } from '../windowApi.js';

type SettingsApi = Pick<WindowAgentApi, 'schema' | 'saveModelRoute' | 'probeModel'>;

export type SettingsContainerProps = {
  tokens: IrisTokens;
  api: SettingsApi;
};

export function SettingsContainer({ tokens, api }: SettingsContainerProps): ReactElement {
  const [schema, setSchema] = useState<DiscoveredSchema>();
  const [route, setRoute] = useState<ModelRoute>();
  const [probeResult, setProbeResult] = useState<string>();
  const [draft, setDraft] = useState<Omit<ModelRoute, 'secretRef' | 'defaultChat'> & { defaultChat: boolean; apiKey: string }>();

  useEffect(() => {
    void api.schema().then(setSchema).catch(() => undefined);
  }, [api]);

  if (!schema) return <section aria-label="Model settings">Loading settings…</section>;

  return (
    <SettingsPage
      tokens={tokens}
      schema={schema}
      route={route}
      probeResult={probeResult}
      onSave={(next) => {
        setDraft(next);
        void api.saveModelRoute(next).then((saved) => {
          setRoute(saved);
          setProbeResult(`Saved ${saved.model} route.`);
        }).catch((error) => setProbeResult(error instanceof Error ? error.message : 'Failed to save route'));
      }}
      onProbe={() => {
        if (!draft && !route) {
          setProbeResult('Save a route before testing connection.');
          return;
        }
        const target = draft ?? route!;
        void api.probeModel({ baseUrl: target.baseUrl, model: target.model }).then((result) => {
          if (result.category === 'available') setProbeResult('Model is available.');
          else setProbeResult(`${result.category}${result.status ? ` (HTTP ${result.status})` : ''}: ${result.summary ?? 'probe failed'}`);
        }).catch((error) => setProbeResult(error instanceof Error ? error.message : 'Probe failed'));
      }}
    />
  );
}
