import { spawn } from 'node:child_process';
import { readFile, rename, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AgentWorkbenchApi, BootstrapState, ChatCompletion, ChatRequest, GatewaySnapshot, ModelRoute } from '../api.js';
import { approvePatch, rejectPatch, approveTerminal, rejectTerminal, type TerminalRunner, type WorkspaceEditor } from '../agent/actions.js';
import { buildRequestPayload, captureContext, type WorkspaceContextSource } from '../agent/context.js';
import { streamSse } from '../gateway/stream.js';
import { extractRuntimeSchema } from '../gateway/discovery.js';
import { probeModel } from '../gateway/probe.js';
import { saveModelRoute, validateRoute } from '../gateway/settings.js';
import type { AgentStore } from '../persistence/store.js';
import type { ChatMessage, ContextType, Conversation, FilePatch, TerminalCommand } from '../types.js';
import type { SecretStore } from '../types.js';
import type { GatewayManager } from '../gateway/manager.js';

export type AgentServiceOptions = {
  store: AgentStore;
  secrets: SecretStore;
  gateway: GatewayManager;
  pythonPath?: string;
  gatewayWorkDir?: string;
  onToken?: (requestId: string, token: string) => void;
  contextSource?: Partial<WorkspaceContextSource>;
};

export class AgentService implements Pick<
  AgentWorkbenchApi,
  | 'bootstrap' | 'captureContext' | 'sendChat' | 'stopChat' | 'restartGateway'
  | 'saveConversation' | 'checkpoint' | 'listConversations' | 'openConversation'
  | 'approvePatch' | 'rejectPatch' | 'approveTerminal' | 'rejectTerminal'
> {
  private readonly controllers = new Map<string, AbortController>();

  constructor(private readonly options: AgentServiceOptions) {}

  async bootstrap(): Promise<BootstrapState> {
    const checkpoint = this.options.store.checkpointValue();
    const activeId = checkpoint.conversationId ?? this.options.store.listConversations()[0]?.id ?? null;
    const conversation = activeId ? this.options.store.getConversation(activeId) : undefined;
    return {
      gateway: this.options.gateway.snapshot(),
      modelRoute: this.options.store.getSetting<ModelRoute>('modelRoute'),
      conversationId: activeId,
      unsentInput: checkpoint.unsentInput,
      messages: conversation?.messages ?? [],
      contexts: [],
      patches: activeId ? this.options.store.patchesFor(activeId) : [],
      terminalCommands: activeId ? this.options.store.terminalFor(activeId) : [],
      history: this.options.store.listConversations()
    };
  }

  async captureContext(type: ContextType) {
    const source = this.options.contextSource ?? {};
    if (type === 'active-file' && source.activeFile) return captureContext(source)[0] ?? null;
    if (type === 'selection' && source.selection) return captureContext(source).find((item) => item.type === 'selection') ?? null;
    if (type === 'search' && source.search) return captureContext(source).find((item) => item.type === 'search') ?? null;
    if (type === 'explicit') return { id: `explicit:${Date.now()}`, type, label: 'User reference' };
    return null;
  }

  async sendChat(request: ChatRequest, onToken: (token: string) => void): Promise<ChatCompletion> {
    const gateway = this.options.gateway.snapshot();
    if (gateway.state !== 'ready' || !gateway.port) throw new Error(gateway.error ?? 'Gateway is not ready');
    const route = this.options.store.getSetting<ModelRoute>('modelRoute');
    if (!route) throw new Error('No default chat model selected');
    const payload = buildRequestPayload({ message: request.prompt, context: request.context, model: route.model });
    const controller = new AbortController();
    this.controllers.set(request.requestId, controller);
    let content = '';
    try {
      await streamSse(
        `http://127.0.0.1:${gateway.port}/chat/completions`,
        payload,
        (token) => {
          content += token;
          onToken(token);
          this.options.onToken?.(request.requestId, token);
        },
        controller.signal
      );
      await this.completeAssistant(request.requestId, content, 'complete');
      return { content, stopped: false };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        await this.completeAssistant(request.requestId, content, 'stopped', 'Stopped by user');
        return { content, stopped: true };
      }
      await this.completeAssistant(request.requestId, content, 'failed', error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      this.controllers.delete(request.requestId);
    }
  }

  stopChat(requestId: string): Promise<void> {
    this.controllers.get(requestId)?.abort();
    this.controllers.delete(requestId);
    return Promise.resolve();
  }

  async restartGateway(): Promise<GatewaySnapshot> {
    try {
      const port = await this.options.gateway.start({
        pythonPath: this.options.pythonPath ?? 'python3',
        workDir: this.options.gatewayWorkDir ?? process.cwd()
      });
      return { state: 'ready', port };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.options.gateway.fail(message);
      return this.options.gateway.snapshot();
    }
  }

  saveConversation(conversation: Conversation): Promise<void> {
    this.options.store.saveConversation(conversation);
    return Promise.resolve();
  }

  checkpoint(conversationId: string | null, unsentInput: string): Promise<void> {
    this.options.store.checkpoint(conversationId, unsentInput);
    return Promise.resolve();
  }

  listConversations() {
    return Promise.resolve(this.options.store.listConversations());
  }

  openConversation(id: string) {
    const conversation = this.options.store.getConversation(id);
    if (!conversation) return Promise.resolve(null);
    return Promise.resolve({
      conversation,
      patches: this.options.store.patchesFor(id),
      terminalCommands: this.options.store.terminalFor(id)
    });
  }

  async approvePatch(patchId: string): Promise<FilePatch> {
    const patch = this.options.store.patchById(patchId);
    if (!patch) throw new Error('Patch not found');
    const editor: WorkspaceEditor = {
      read: (path) => readFile(path, 'utf8'),
      write: async (path, content) => {
        const temporary = `${path}.irislens-${Date.now()}.tmp`;
        await mkdir(dirname(path), { recursive: true });
        await writeFile(temporary, content, 'utf8');
        await rename(temporary, path);
      }
    };
    const approved = await approvePatch(patch, editor);
    this.options.store.recordPatch(approved);
    await this.recordAudit(patch.conversationId, `Approved patch ${patch.path}`);
    return approved;
  }

  async rejectPatch(patchId: string): Promise<FilePatch> {
    const patch = this.options.store.patchById(patchId);
    if (!patch) throw new Error('Patch not found');
    const rejected = rejectPatch(patch);
    this.options.store.recordPatch(rejected);
    await this.recordAudit(patch.conversationId, `Rejected patch ${patch.path}`);
    return rejected;
  }

  async approveTerminal(commandId: string): Promise<TerminalCommand> {
    const command = this.options.store.terminalById(commandId);
    if (!command) throw new Error('Terminal command not found');
    const runner: TerminalRunner = {
      run: (commandText) => new Promise((resolve, reject) => {
        const child = spawn(commandText, { shell: true, stdio: 'inherit' });
        child.once('error', reject);
        child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Command exited with code ${code}`)));
      })
    };
    const executed = await approveTerminal(command, runner);
    this.options.store.recordTerminal(executed);
    await this.recordAudit(command.conversationId, `Executed command: ${command.command}`);
    return executed;
  }

  async rejectTerminal(commandId: string): Promise<TerminalCommand> {
    const command = this.options.store.terminalById(commandId);
    if (!command) throw new Error('Terminal command not found');
    const rejected = rejectTerminal(command);
    this.options.store.recordTerminal(rejected);
    await this.recordAudit(command.conversationId, `Rejected command: ${command.command}`);
    return rejected;
  }

  async saveModelRoute(input: Omit<ModelRoute, 'secretRef'> & { apiKey: string }): Promise<ModelRoute> {
    const route = await saveModelRoute(input, this.options.secrets);
    this.options.store.setSetting('modelRoute', route);
    return route;
  }

  async schema(pythonPath = this.options.pythonPath ?? 'python3') {
    return extractRuntimeSchema(pythonPath);
  }

  async probe(route: { baseUrl: string; model: string }) {
    validateRoute({ baseUrl: route.baseUrl, provider: 'probe', endpointProtocol: route.baseUrl.startsWith('https://') ? 'https' : 'http', model: route.model, secretRef: 'probe' });
    return probeModel(route, async (url) => fetch(url));
  }

  private async completeAssistant(requestId: string, content: string, state: ChatMessage['state'], error?: string) {
    const checkpoint = this.options.store.checkpointValue();
    const conversationId = checkpoint.conversationId;
    if (!conversationId) return;
    const conversation = this.options.store.getConversation(conversationId);
    if (!conversation) return;
    const plan = state === 'complete' ? (await import('../agent/message.js')).parsePlan(content) : [];
    const messages = conversation.messages.map((message) => (
      message.id === requestId ? { ...message, content, state, error, plan: plan.length ? plan : undefined } : message
    ));
    if (!messages.some((message) => message.id === requestId)) return;
    this.options.store.saveConversation({ ...conversation, messages, updatedAt: new Date().toISOString() });
  }

  private async recordAudit(conversationId: string, content: string) {
    const conversation = this.options.store.getConversation(conversationId);
    if (!conversation) return;
    const message: ChatMessage = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      conversationId,
      role: 'assistant',
      content,
      state: 'complete',
      createdAt: new Date().toISOString()
    };
    this.options.store.saveConversation({ ...conversation, messages: [...conversation.messages, message], updatedAt: message.createdAt });
  }
}
