declare global {
  interface Process {
    resourcesPath: string;
  }
}

declare module 'electron' {
  export interface BrowserWindow {
    loadURL(url: string): Promise<void>;
    loadFile(path: string): Promise<void>;
    isDestroyed(): boolean;
    webContents: {
      isDestroyed(): boolean;
      send(channel: string, ...args: unknown[]): void;
    };
  }

  export const BrowserWindow: {
    new (options: Record<string, unknown>): BrowserWindow;
    getAllWindows(): BrowserWindow[];
  };

  export const app: {
    whenReady(): Promise<void>;
    getPath(name: 'userData'): string;
    isPackaged: boolean;
    on(event: 'activate', listener: () => void): void;
    on(event: 'window-all-closed', listener: () => void): void;
    quit(): void;
  };

  export interface IpcMainEvent {
    sender: BrowserWindow['webContents'];
  }

  export interface IpcMain {
    handle(channel: string, listener: (event: IpcMainEvent, ...args: any[]) => unknown): void;
  }

  export const ipcMain: IpcMain;

  export const safeStorage: {
    isEncryptionAvailable(): boolean;
    encryptString(value: string): Buffer;
    decryptString(value: Buffer): string;
  };

}
