'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('irislens', {
  bootstrap: () => ipcRenderer.invoke('agent:bootstrap'),
  captureContext: (type) => ipcRenderer.invoke('agent:capture-context', type),
  sendChat: (request, onToken) => {
    const channel = `agent:chat:${request.requestId}`;
    const listener = (_event, requestId, token) => {
      if (requestId === request.requestId) onToken(token);
    };
    ipcRenderer.on(channel, listener);
    return ipcRenderer.invoke('agent:chat', request, channel).finally(() => {
      ipcRenderer.removeListener(channel, listener);
    });
  },
  stopChat: (requestId) => ipcRenderer.invoke('agent:chat:stop', requestId),
  restartGateway: () => ipcRenderer.invoke('agent:gateway:restart'),
  saveConversation: (conversation) => ipcRenderer.invoke('agent:conversation:save', conversation),
  checkpoint: (conversationId, unsentInput) => ipcRenderer.invoke('agent:checkpoint', conversationId, unsentInput),
  listConversations: () => ipcRenderer.invoke('agent:conversation:list'),
  openConversation: (id) => ipcRenderer.invoke('agent:conversation:open', id),
  approvePatch: (id) => ipcRenderer.invoke('agent:patch:approve', id),
  rejectPatch: (id) => ipcRenderer.invoke('agent:patch:reject', id),
  approveTerminal: (id) => ipcRenderer.invoke('agent:terminal:approve', id),
  rejectTerminal: (id) => ipcRenderer.invoke('agent:terminal:reject', id),
  saveModelRoute: (route) => ipcRenderer.invoke('settings:route:save', route),
  schema: () => ipcRenderer.invoke('settings:schema'),
  probeModel: (route) => ipcRenderer.invoke('settings:probe', route),
  listWorkspaceFiles: (path) => ipcRenderer.invoke('workspace:list', path),
  readWorkspaceFile: (path) => ipcRenderer.invoke('workspace:read', path),
  writeWorkspaceFile: (path, content) => ipcRenderer.invoke('workspace:write', path, content),
  listExtensions: () => ipcRenderer.invoke('extensions:list'),
  installLocalExtension: (path) => ipcRenderer.invoke('extensions:install:local', path),
  searchExtensions: (query) => ipcRenderer.invoke('extensions:search', query),
  installOpenVsxExtension: (id) => ipcRenderer.invoke('extensions:install:open-vsx', id),
  setExtensionEnabled: (id, enabled) => ipcRenderer.invoke('extensions:set-enabled', id, enabled),
  setExtensionConfiguration: (id, values) => ipcRenderer.invoke('extensions:configure', id, values),
  setExtensionPermission: (id, capability, granted) => ipcRenderer.invoke('extensions:permission', id, capability, granted),
  readExtensionStorage: (id, key) => ipcRenderer.invoke('extensions:storage:read', id, key),
  writeExtensionStorage: (id, key, value) => ipcRenderer.invoke('extensions:storage:write', id, key, value),
  onGatewayState: (callback) => {
    const listener = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on('gateway:state', listener);
    return () => ipcRenderer.removeListener('gateway:state', listener);
  }
});
