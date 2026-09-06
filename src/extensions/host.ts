import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { extensionId, type ExtensionManifest } from './manifest.js';
import { rpcError, rpcNotify, rpcResult, type JsonRpcMessage } from './jsonrpc.js';
import { ExtensionRuntime } from './runtime.js';

const runtime = new ExtensionRuntime();
const require = createRequire(import.meta.url);
let nextId = 1;

function parentSend(message: unknown): void {
  if (process.send) process.send(message);
}

function compatibilityApi(manifest: ExtensionManifest) {
  const id = extensionId(manifest);
  return {
    commands: {
      registerCommand: (command: string, handler: (...args: unknown[]) => unknown) => runtime.registerCommand(command, handler),
      executeCommand: (command: string, ...args: unknown[]) => runtime.callApi(id, 'command.execute', command, ...args)
    },
    workspace: {
      getConfiguration: () => runtime.callApi(id, 'configuration.get'),
      onDidChangeConfiguration: (listener: () => void) => runtime.subscribe('configuration', extensionId(manifest), listener)
    },
    languages: {
      unsupported: (name: string) => runtime.callApi(id, `languages.${name}`)
    },
    env: { unsupported: (name: string) => runtime.callApi(id, `env.${name}`) }
  };
}

async function activate(manifest: ExtensionManifest): Promise<unknown> {
  await runtime.activate(extensionId(manifest));
  if (!manifest.main) return undefined;
  const entry = extname(manifest.main) === '.cjs'
    ? join(manifest.main)
    : join(manifest.main);
  if (extname(manifest.main) === '.cjs') {
    const module = require(entry) as { activate?: (api: unknown) => unknown };
    return module.activate?.(compatibilityApi(manifest));
  }
  const module = await import(pathToFileURL(entry).href) as { activate?: (api: unknown) => unknown };
  return module.activate?.(compatibilityApi(manifest));
}

const handlers: Record<string, (params: unknown) => Promise<unknown>> = {
  initialize: async () => ({ capabilities: { commands: true, configuration: true, events: true, lsp: true } }),
  'extension.register': async (params) => {
    const manifest = params as ExtensionManifest;
    runtime.register(manifest);
    return { id: extensionId(manifest) };
  },
  'extension.activate': async (params) => activate(params as ExtensionManifest),
  'extension.deactivate': async (params) => { await runtime.deactivate(params as string); return true; },
  'command.execute': async (params) => {
    const { command, args } = params as { command: string; args: unknown[] };
    return runtime.executeCommand(command, ...args ?? []);
  },
  'configuration.update': async (params) => {
    const { id, values } = params as { id: string; values: Record<string, unknown> };
    runtime.updateConfiguration(id, values);
    return true;
  },
  'event.emit': async (params) => {
    const event = params as { type: 'workspace' | 'editor' | 'configuration'; name: string; payload?: unknown };
    runtime.emit(event);
    return true;
  },
  'api.call': async (params) => {
    const { id, api, args } = params as { id: string; api: string; args: unknown[] };
    return runtime.callApi(id, api, ...args ?? []);
  },
  'runtime.diagnostics': async (params) => runtime.diagnosticsFor(params as string)
};

process.on('message', async (message: JsonRpcMessage) => {
  if (!message || message.jsonrpc !== '2.0' || !('method' in message) || !('id' in message)) return;
  const id = message.id as number;
  try {
    const handler = handlers[message.method!];
    if (!handler) throw new Error(`Unknown method: ${message.method}`);
  } catch (error) {
    parentSend(rpcError(id, error instanceof Error ? error.message : String(error), error instanceof Error && error.name === 'UnsupportedApiError' ? -32601 : -32000));
  }
});

parentSend(rpcNotify('host.ready'));
process.on('disconnect', () => process.exit(0));
export { runtime };
