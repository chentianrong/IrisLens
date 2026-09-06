import type { ChatMessage, ContextReference, ContextType, Conversation, FilePatch, GatewayState, ModelRouteLike, TerminalCommand } from './types-bridge.js';

export type GatewaySnapshot = {
  state: GatewayState;
  port?: number;
  error?: string;
};

export type ModelRoute = ModelRouteLike;

export type BootstrapState = {
  gateway: GatewaySnapshot;
  modelRoute?: ModelRoute;
  conversationId: string | null;
  unsentInput: string;
  messages: ChatMessage[];
  contexts: ContextReference[];
  patches: FilePatch[];
  terminalCommands: TerminalCommand[];
  history: Array<Pick<Conversation, 'id' | 'title' | 'updatedAt'>>;
};

export type ChatRequest = {
  requestId: string;
  conversationId: string;
  prompt: string;
  context: ContextReference[];
  model: string;
};

export type ChatCompletion = {
  content: string;
  stopped: boolean;
};

export type AgentWorkbenchApi = {
  bootstrap(): Promise<BootstrapState>;
  captureContext(type: ContextType): Promise<ContextReference | null>;
  sendChat(request: ChatRequest, onToken: (token: string) => void): Promise<ChatCompletion>;
  stopChat(requestId: string): Promise<void>;
  restartGateway(): Promise<GatewaySnapshot>;
  saveConversation(conversation: Conversation): Promise<void>;
  checkpoint(conversationId: string | null, unsentInput: string): Promise<void>;
  listConversations(): Promise<Array<Pick<Conversation, 'id' | 'title' | 'updatedAt'>>>;
  openConversation(id: string): Promise<{ conversation: Conversation; patches: FilePatch[]; terminalCommands: TerminalCommand[] } | null>;
  approvePatch(patchId: string): Promise<FilePatch>;
  rejectPatch(patchId: string): Promise<FilePatch>;
  approveTerminal(commandId: string): Promise<TerminalCommand>;
  rejectTerminal(commandId: string): Promise<TerminalCommand>;
};
