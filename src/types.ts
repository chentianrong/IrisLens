export type GatewayState = 'starting' | 'ready' | 'error';

export type MessageState = 'complete' | 'generating' | 'stopped' | 'failed' | 'retryable';

export type ContextType = 'active-file' | 'selection' | 'search' | 'explicit';

export interface ContextReference {
  id: string;
  type: ContextType;
  label: string;
  path?: string;
  content?: string;
}

export type PlanStepState = 'pending' | 'active' | 'complete' | 'failed';

export interface PlanStep {
  id: string;
  title: string;
  state: PlanStepState;
}

export type PatchDecision = 'proposed' | 'approved' | 'rejected';

export interface FilePatch {
  id: string;
  conversationId: string;
  path: string;
  before: string;
  after: string;
  decision: PatchDecision;
}

export type TerminalDecision = 'proposed' | 'approved' | 'rejected' | 'executed';

export interface TerminalCommand {
  id: string;
  conversationId: string;
  command: string;
  decision: TerminalDecision;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  state: MessageState;
  context?: ContextReference[];
  plan?: PlanStep[];
  error?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export type SecretStore = {
  setPassword(service: string, account: string, password: string): Promise<void>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
};
