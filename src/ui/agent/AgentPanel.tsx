import { useState, type ReactElement } from 'react';
import { Button, Field, Input, Spinner, Textarea, Text } from '@fluentui/react-components';
import type { ChatMessage, ContextReference, ContextType, Conversation, FilePatch, GatewayState, PlanStep, TerminalCommand } from '../../types.js';
import type { IrisTokens } from '../theme/tokens.js';
import { clampAgentWidth } from '../layout.js';

export type AgentPanelProps = {
  tokens: IrisTokens;
  messages: ChatMessage[];
  contexts: ContextReference[];
  gatewayState: GatewayState;
  gatewayError?: string;
  history?: Array<Pick<Conversation, 'id' | 'title' | 'updatedAt'>>;
  patches?: FilePatch[];
  terminalCommands?: TerminalCommand[];
  initialInput?: string;
  activePlan?: PlanStep[];
  onOpen: () => void;
  onClose: () => void;
  onCollapse: () => void;
  onResize: (width: number) => void;
  width: number;
  onAddContext: (type: ContextType) => void;
  onRemoveContext: (id: string) => void;
  onSubmit: (input: string, contexts: ContextReference[]) => void;
  onRetry: (messageId: string) => void;
  onStop: () => void;
  onRestartGateway: () => void;
  onApprovePatch: (id: string) => void;
  onRejectPatch: (id: string) => void;
  onApproveTerminal: (id: string) => void;
  onRejectTerminal: (id: string) => void;
  onOpenConversation: (id: string) => void;
};

export function AgentPanel(props: AgentPanelProps): ReactElement {
  const width = clampAgentWidth(props.width);
  const [input, setInput] = useState(props.initialInput ?? '');
  const [collapsed, setCollapsed] = useState(false);
  const disabled = props.gatewayState !== 'ready';
  const generating = props.messages.some((message) => message.state === 'generating');

  return (
    <section
      aria-label="Agent panel"
      style={{
        width: `${width}px`,
        minWidth: 340,
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        gap: props.tokens.spacingM,
        borderLeft: `1px solid ${props.tokens.colorNeutralStroke}`,
        background: props.tokens.colorNeutralBackground,
        color: props.tokens.colorNeutralForeground,
        padding: props.tokens.spacingM
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text weight="semibold">Agent</Text>
        <div style={{ display: 'flex', gap: props.tokens.spacingS }}>
          <Button size="small" onClick={props.onCollapse}>{collapsed ? 'Expand' : 'Collapse'}</Button>
          <Button size="small" onClick={props.onClose}>Close</Button>
          <Button size="small" onClick={props.onOpen}>Open</Button>
        </div>
      </header>

      <div>
        <Button size="small" onClick={() => props.onResize(props.width - 20)}>Narrower</Button>
        <Button size="small" onClick={() => props.onResize(props.width + 20)}>Wider</Button>
      </div>

      <div style={{ display: 'flex', gap: props.tokens.spacingS, flexWrap: 'wrap' }}>
        <Button size="small" onClick={() => props.onAddContext('active-file')}>Active file</Button>
        <Button size="small" onClick={() => props.onAddContext('selection')}>Selection</Button>
        <Button size="small" onClick={() => props.onAddContext('search')}>Search</Button>
        <Button size="small" onClick={() => props.onAddContext('explicit')}>Reference</Button>
      </div>

      <details>
        <summary>{props.contexts.length} context references</summary>
        <ul>
          {props.contexts.map((context) => (
            <li key={context.id}>
              <span>{context.label}</span>
              <Button size="small" onClick={() => props.onRemoveContext(context.id)}>Remove</Button>
            </li>
          ))}
        </ul>
      </details>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: props.tokens.spacingM }}>
        {props.messages.map((message) => (
          <article
            key={message.id}
            data-role={message.role}
            data-state={message.state}
            style={{
              border: `1px solid ${props.tokens.colorNeutralStroke}`,
              borderRadius: props.tokens.borderRadiusMedium,
              padding: props.tokens.spacingM,
              whiteSpace: 'pre-wrap'
            }}
          >
            <strong>{message.role === 'user' ? 'You' : 'Agent'}</strong>
            {message.state === 'generating' ? <Spinner size="extra-tiny" label="Generating" /> : null}
            <p>{message.content}</p>
            {message.context?.length ? (
              <details>
                <summary>{message.context.length} attached references</summary>
                <ul>{message.context.map((item) => <li key={item.id}>{item.label}</li>)}</ul>
              </details>
            ) : null}
            {message.plan?.length ? (
              <ol aria-label="Task plan">
                {message.plan.map((step) => (
                  <li key={step.id} data-state={step.state}>{step.title}</li>
                ))}
              </ol>
            ) : null}
            {message.error ? <Text role="alert">{message.error}</Text> : null}
            {message.state === 'stopped' || message.state === 'failed' || message.state === 'retryable' ? (
              <Button size="small" onClick={() => props.onRetry(message.id)}>Retry</Button>
            ) : null}
          </article>
        ))}
      </div>

      {props.patches?.map((patch) => (
        <details key={patch.id}>
          <summary>{patch.path} — {patch.decision}</summary>
          <pre>{patch.before}</pre>
          <pre>{patch.after}</pre>
          <Button size="small" onClick={() => props.onApprovePatch(patch.id)} disabled={patch.decision !== 'proposed'}>Apply</Button>
          <Button size="small" onClick={() => props.onRejectPatch(patch.id)} disabled={patch.decision !== 'proposed'}>Reject</Button>
        </details>
      ))}

      {props.terminalCommands?.map((command) => (
        <div key={command.id}>
          <code>{command.command}</code>
          <Button size="small" onClick={() => props.onApproveTerminal(command.id)} disabled={command.decision !== 'proposed'}>Approve</Button>
          <Button size="small" onClick={() => props.onRejectTerminal(command.id)} disabled={command.decision !== 'proposed'}>Reject</Button>
        </div>
      ))}

      <Field label="Prompt">
        <Textarea
          value={input}
          disabled={disabled}
          onChange={(_, data) => setInput(data.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.ctrlKey && !disabled && !generating) {
              props.onSubmit(input, props.contexts);
              setInput('');
            }
          }}
        />
      </Field>
      <div style={{ display: 'flex', gap: props.tokens.spacingS }}>
        <Button appearance="primary" disabled={disabled || generating} onClick={() => { props.onSubmit(input, props.contexts); setInput(''); }}>
          Send
        </Button>
        <Button disabled={!generating} onClick={props.onStop}>Stop</Button>
      </div>
      {props.gatewayState === 'error' ? (
        <div>
          <Text role="alert">{props.gatewayError ?? 'Gateway error'}</Text>
          <Button size="small" onClick={props.onRestartGateway}>Restart gateway</Button>
        </div>
      ) : null}

      <details>
        <summary>Conversation history</summary>
        <ul aria-label="Conversation history">
          {(props.history ?? []).map((conversation) => (
            <li key={conversation.id}>
              <Button size="small" onClick={() => props.onOpenConversation(conversation.id)}>{conversation.title}</Button>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
