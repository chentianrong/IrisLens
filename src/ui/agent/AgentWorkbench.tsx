import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import type { AgentWorkbenchApi } from '../../api.js';
import type { ChatMessage, ContextReference, ContextType, Conversation, FilePatch, TerminalCommand } from '../../types.js';
import { parsePlan } from '../../agent/message.js';
import { AgentPanel } from './AgentPanel.js';
import { darkTokens, type IrisTokens } from '../theme/tokens.js';

export type AgentWorkbenchProps = {
  api: AgentWorkbenchApi;
  tokens?: IrisTokens;
  width?: number;
};

function identifier(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid ?? Math.random().toString(36).slice(2)}`;
}

export function AgentWorkbench({ api, tokens = darkTokens, width = 380 }: AgentWorkbenchProps): ReactElement {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contexts, setContexts] = useState<ContextReference[]>([]);
  const [patches, setPatches] = useState<FilePatch[]>([]);
  const [terminalCommands, setTerminalCommands] = useState<TerminalCommand[]>([]);
  const [history, setHistory] = useState<Array<Pick<Conversation, 'id' | 'title' | 'updatedAt'>>>([]);
  const [initialInput, setInitialInput] = useState('');
  const [gatewayState, setGatewayState] = useState<'starting' | 'ready' | 'error'>('starting');
  const [gatewayError, setGatewayError] = useState<string>();
  const [model, setModel] = useState('');
  const controller = useRef<AbortController | null>(null);
  const activeRequestId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.bootstrap().then((state) => {
      if (cancelled) return;
      setConversationId(state.conversationId);
      setMessages(state.messages);
      setContexts(state.contexts);
      setPatches(state.patches);
      setTerminalCommands(state.terminalCommands);
      setHistory(state.history);
      setInitialInput(state.unsentInput);
      setGatewayState(state.gateway.state);
      setGatewayError(state.gateway.error);
      setModel(state.modelRoute?.model ?? '');
    }).catch(() => {
      if (!cancelled) {
        setGatewayState('error');
        setGatewayError('Agent bootstrap failed');
      }
    });
    return () => { cancelled = true; };
  }, [api]);

  const persist = useCallback(async (nextMessages: ChatMessage[]) => {
    if (!conversationId) return;
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: conversationId,
      title: nextMessages.find((message) => message.role === 'user')?.content.slice(0, 60) || 'Agent conversation',
      createdAt: nextMessages[0]?.createdAt ?? now,
      updatedAt: now,
      messages: nextMessages
    };
    await api.saveConversation(conversation);
    setHistory(await api.listConversations());
  }, [api, conversationId]);

  const submit = useCallback(async (input: string, attachedContext: ContextReference[]) => {
    if (!input.trim() || !conversationId || gatewayState !== 'ready' || !model.trim()) return;
    const now = new Date().toISOString();
    const assistantId = identifier('assistant');
    const userMessage: ChatMessage = { id: identifier('user'), conversationId, role: 'user', content: input, state: 'complete', context: attachedContext, createdAt: now };
    const assistantMessage: ChatMessage = { id: assistantId, conversationId, role: 'assistant', content: '', state: 'generating', createdAt: now };
    const nextMessages = [...messages, userMessage, assistantMessage];
    setMessages(nextMessages);
    await persist(nextMessages);
    await api.checkpoint(conversationId, '');

    const abort = new AbortController();
    controller.current = abort;
    activeRequestId.current = assistantId;
    try {
      const completion = await api.sendChat({
        requestId: assistantId,
        conversationId,
        prompt: input,
        context: attachedContext,
        model
      }, (token) => {
        setMessages((current) => current.map((message) => (
          message.id === assistantId ? { ...message, content: message.content + token } : message
        )));
      });
      setMessages((current) => {
        const updated = current.map((message) => {
          if (message.id !== assistantId) return message;
          const plan = parsePlan(message.content);
          return { ...message, state: completion.stopped ? 'stopped' as const : 'complete' as const, plan: plan.length ? plan : undefined };
        });
        void persist(updated);
        return updated;
      });
    } catch (error) {
      setMessages((current) => {
        const updated = current.map((message) => (
          message.id === assistantId
            ? { ...message, state: 'failed' as const, error: error instanceof Error ? error.message : String(error) }
            : message
        ));
        void persist(updated);
        return updated;
      });
    } finally {
      controller.current = null;
    }
  }, [api, conversationId, gatewayState, messages, model, persist]);

  const stop = useCallback(() => {
    const requestId = activeRequestId.current;
    if (controller.current && requestId) {
      controller.current.abort();
      void api.stopChat(requestId);
      activeRequestId.current = null;
    }
  }, [api]);

  const addContext = useCallback(async (type: ContextType) => {
    const context = await api.captureContext(type);
    if (context) setContexts((current) => current.some((item) => item.id === context.id) ? current : [...current, context]);
  }, [api]);

  const openConversation = useCallback(async (id: string) => {
    const result = await api.openConversation(id);
    if (!result) return;
    setConversationId(id);
    setMessages(result.conversation.messages);
    setPatches(result.patches);
    setTerminalCommands(result.terminalCommands);
  }, [api]);

  const retry = useCallback((messageId: string) => {
    const index = messages.findIndex((message) => message.id === messageId);
    if (index < 0) return;
    const previousUser = [...messages.slice(0, index)].reverse().find((message) => message.role === 'user');
    if (!previousUser) return;
    setMessages((current) => current.filter((message) => message.id !== messageId));
    void submit(previousUser.content, previousUser.context ?? []);
  }, [messages, submit]);

  return (
    <AgentPanel
      tokens={tokens}
      messages={messages}
      contexts={contexts}
      patches={patches}
      terminalCommands={terminalCommands}
      history={history}
      initialInput={initialInput}
      gatewayState={gatewayState}
      gatewayError={gatewayError}
      width={width}
      onOpen={() => undefined}
      onClose={() => undefined}
      onCollapse={() => undefined}
      onResize={() => undefined}
      onAddContext={(type) => void addContext(type)}
      onRemoveContext={(id) => setContexts((current) => current.filter((item) => item.id !== id))}
      onSubmit={(input, attachedContext) => void submit(input, attachedContext)}
      onRetry={retry}
      onStop={stop}
      onRestartGateway={() => void api.restartGateway().then((snapshot) => {
        setGatewayState(snapshot.state);
        setGatewayError(snapshot.error);
      })}
      onApprovePatch={(id) => void api.approvePatch(id).then((patch) => setPatches((current) => current.map((item) => item.id === id ? patch : item)))}
      onRejectPatch={(id) => void api.rejectPatch(id).then((patch) => setPatches((current) => current.map((item) => item.id === id ? patch : item)))}
      onApproveTerminal={(id) => void api.approveTerminal(id).then((command) => setTerminalCommands((current) => current.map((item) => item.id === id ? command : item)))}
      onRejectTerminal={(id) => void api.rejectTerminal(id).then((command) => setTerminalCommands((current) => current.map((item) => item.id === id ? command : item)))}
      onOpenConversation={(id) => void openConversation(id)}
    />
  );
}
