export type { ChatMessage, ContextReference, ContextType, Conversation, FilePatch, GatewayState, TerminalCommand } from './types.js';

export type ModelRouteLike = {
  id: string;
  baseUrl: string;
  provider: string;
  endpointProtocol: 'http' | 'https';
  model: string;
  defaultChat: boolean;
  secretRef: string;
};
