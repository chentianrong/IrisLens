export type JsonRpcMessage = {
  jsonrpc: '2.0';
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

export function isResponse(message: JsonRpcMessage): boolean {
  return 'id' in message && !('method' in message);
}

export function rpcRequest(id: number, method: string, params?: unknown): JsonRpcMessage {
  return { jsonrpc: '2.0', id, method, params };
}

export function rpcNotify(method: string, params?: unknown): JsonRpcMessage {
  return { jsonrpc: '2.0', method, params };
}

export function rpcResult(id: number, result: unknown, error?: { code: number; message: string; data?: unknown }): JsonRpcMessage {
  return { jsonrpc: '2.0', id, result, error };
}

export function rpcError(id: number, message: string, code = -32000, data?: unknown): JsonRpcMessage {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}
