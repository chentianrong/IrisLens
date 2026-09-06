import { useState, type ReactElement } from 'react';
import { Button, Checkbox, Field, Input, Select, Text } from '@fluentui/react-components';
import type { DiscoveredSchema, ProviderSchema } from '../../gateway/schema.js';
import type { ModelRoute } from '../../gateway/settings.js';
import type { IrisTokens } from '../theme/tokens.js';

export type SettingsPageProps = {
  tokens: IrisTokens;
  schema: DiscoveredSchema;
  route?: ModelRoute;
  onSave: (route: Omit<ModelRoute, 'secretRef' | 'defaultChat'> & { defaultChat: boolean; apiKey: string }) => void;
  onProbe: () => void;
  probeResult?: string;
};

export function SettingsPage(props: SettingsPageProps): ReactElement {
  const [provider, setProvider] = useState(props.route?.provider ?? props.schema.providers[0]?.provider ?? '');
  const [baseUrl, setBaseUrl] = useState(props.route?.baseUrl ?? '');
  const [endpointProtocol, setEndpointProtocol] = useState(props.route?.endpointProtocol ?? 'https');
  const [modelName, setModelName] = useState(props.route?.model ?? '');
  const [apiKey, setApiKey] = useState('');
  const [defaultChat, setDefaultChat] = useState(props.route?.defaultChat ?? false);
  const selected: ProviderSchema | undefined = props.schema.providers.find((item) => item.provider === provider);

  return (
    <section aria-label="Model settings" style={{ color: props.tokens.colorNeutralForeground, display: 'grid', gap: props.tokens.spacingM, maxWidth: 640 }}>
      <Text size={500} weight="semibold">Model settings</Text>
      {props.schema.source === 'bundled-fallback' ? (
        <Text role="alert">Using bundled LiteLLM schema because discovery failed.</Text>
      ) : null}
      <Field label="Provider">
        <Select value={provider} onChange={(_, data) => setProvider(data.value)}>
          {props.schema.providers.map((item) => <option key={item.provider} value={item.provider}>{item.provider}</option>)}
        </Select>
      </Field>
      <Field label="Endpoint protocol">
        <Select value={endpointProtocol} onChange={(_, data) => setEndpointProtocol(data.value as 'http' | 'https')}>
          {(selected?.protocols ?? ['http', 'https']).map((protocol) => <option key={protocol} value={protocol}>{protocol}</option>)}
        </Select>
      </Field>
      <Field label="Base URL"><Input value={baseUrl} onChange={(_, data) => setBaseUrl(data.value)} /></Field>
      <Field label="API key"><Input type="password" value={apiKey} onChange={(_, data) => setApiKey(data.value)} /></Field>
      <Field label="Model name"><Input value={modelName} onChange={(_, data) => setModelName(data.value)} /></Field>
      <Checkbox label="Default chat model" checked={defaultChat} onChange={(_, data) => setDefaultChat(Boolean(data.checked))} />
      <div style={{ display: 'flex', gap: props.tokens.spacingS }}>
        <Button appearance="primary" onClick={() => props.onSave({ id: props.route?.id ?? 'default', baseUrl, provider, endpointProtocol, model: modelName, defaultChat, apiKey })}>Save</Button>
        <Button onClick={props.onProbe}>Test connection</Button>
      </div>
      {props.probeResult ? <Text role="status">{props.probeResult}</Text> : null}
      <Text size={200}>Schema version: {props.schema.version} ({props.schema.source})</Text>
    </section>
  );
}
