import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { openAgentStore } from '../persistence/store.js';
import { safeStorageSecrets } from './safe-storage-secrets.js';
import { createGatewayManager } from '../gateway/runtime.js';
import { AgentService } from './agent-service.js';
import { ExtensionService } from './extension-service.js';
import { WorkspaceService } from './workspace-service.js';
import type { ModelRoute } from '../api.js';

const here = dirname(fileURLToPath(import.meta.url));

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    title: 'IrisLens',
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: join(here, 'preload.cjs') }
  });
  if (process.env['VITE_DEV_SERVER_URL']) void window.loadURL(process.env['VITE_DEV_SERVER_URL']);
  else void window.loadFile(join(here, '../workbench/index.html'));
  if (process.env['IRISLENS_SMOKE'] === '1') {
    console.log('IrisLens shell ready');
    console.log(`IrisLens gateway ${process.env['IRISLENS_GATEWAY_STATE'] === 'ready' ? 'ready' : 'error'}: ${process.env['IRISLENS_GATEWAY_STATE'] === 'ready' ? '127.0.0.1' : 'gateway not initialized'}`);
  }
  return window;
}

export function registerIpc(service: AgentService): void {
  ipcMain.handle('agent:bootstrap', () => service.bootstrap());
  ipcMain.handle('agent:capture-context', (_event, type) => service.captureContext(type));
  ipcMain.handle('agent:chat', async (event, request, onTokenChannel: string) => {
    return service.sendChat(request, (token) => {
      if (!event.sender.isDestroyed()) event.sender.send(onTokenChannel, request.requestId, token);
    });
  });
  ipcMain.handle('agent:chat:stop', (_event, requestId) => service.stopChat(requestId));
  ipcMain.handle('agent:gateway:restart', () => service.restartGateway());
  ipcMain.handle('agent:conversation:save', (_event, conversation) => service.saveConversation(conversation));
  ipcMain.handle('agent:checkpoint', (_event, conversationId, unsentInput) => service.checkpoint(conversationId, unsentInput));
  ipcMain.handle('agent:conversation:list', () => service.listConversations());
  ipcMain.handle('agent:conversation:open', (_event, id) => service.openConversation(id));
  ipcMain.handle('agent:patch:approve', (_event, id) => service.approvePatch(id));
  ipcMain.handle('agent:patch:reject', (_event, id) => service.rejectPatch(id));
  ipcMain.handle('agent:terminal:approve', (_event, id) => service.approveTerminal(id));
  ipcMain.handle('agent:terminal:reject', (_event, id) => service.rejectTerminal(id));
  ipcMain.handle('settings:route:save', (_event, route) => service.saveModelRoute(route));
  ipcMain.handle('settings:schema', () => service.schema());
  ipcMain.handle('settings:probe', (_event, route) => service.probe(route));
}

export function registerWorkspaceIpc(workspace: WorkspaceService): void {
  ipcMain.handle('workspace:list', (_event, path) => workspace.list(path));
  ipcMain.handle('workspace:read', (_event, path) => workspace.read(path));
  ipcMain.handle('workspace:write', (_event, path, content) => workspace.write(path, content));
}

export function registerExtensionIpc(extensions: ExtensionService): void {
  ipcMain.handle('extensions:list', () => extensions.list());
  ipcMain.handle('extensions:install:local', (_event, path) => extensions.installLocal(path));
  ipcMain.handle('extensions:search', (_event, query) => extensions.search(query));
  ipcMain.handle('extensions:install:open-vsx', (_event, id) => extensions.installOpenVsx(id));
  ipcMain.handle('extensions:set-enabled', (_event, id, enabled) => extensions.setEnabled(id, enabled));
  ipcMain.handle('extensions:configure', (_event, id, values) => extensions.configure(id, values));
  ipcMain.handle('extensions:permission', (_event, id, capability, granted) => extensions.setPermission(id, capability, granted));
  ipcMain.handle('extensions:storage:read', (_event, id, key) => extensions.readStorage(id, key));
  ipcMain.handle('extensions:storage:write', (_event, id, key, value) => extensions.writeStorage(id, key, value));
}

app.whenReady().then(async () => {
  const dataDirectory = app.getPath('userData');
  const store = openAgentStore(new Database(join(dataDirectory, 'agent.sqlite')));
  const secrets = safeStorageSecrets(dataDirectory, {
    isEncryptionAvailable: () => safeStorage.isEncryptionAvailable(),
    encryptString: (value) => safeStorage.encryptString(value),
    decryptString: (value) => safeStorage.decryptString(value)
  });
  const gateway = createGatewayManager((message) => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send('gateway:state', { state: 'error', error: message });
    }
  });
  const service = new AgentService({
    store,
    secrets,
    gateway,
    pythonPath: process.env.IRISLENS_PYTHON ?? 'python3',
    gatewayWorkDir: app.isPackaged ? join((process as NodeJS.Process & { resourcesPath: string }).resourcesPath, 'gateway') : join(process.cwd(), 'gateway')
  });
  const workspace = new WorkspaceService(process.env.IRISLENS_WORKSPACE ?? join(dataDirectory, 'workspace'));
  const extensions = new ExtensionService({ dataDirectory });
  registerIpc(service);
  registerWorkspaceIpc(workspace);
  registerExtensionIpc(extensions);
  createMainWindow();
  void service.restartGateway().then((snapshot) => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send('gateway:state', snapshot);
    }
  }).catch(() => undefined);
  void extensions.start().catch((error) => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send('extensions:diagnostics', { level: 'error', message: error.message });
    }
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

export type { ModelRoute };
