import { spawn } from 'node:child_process';
import { GatewayManager } from './manager.js';

export function createGatewayManager(onUnexpectedExit?: (message: string) => void): GatewayManager {
  return new GatewayManager({
    spawnProcess: ({ command, args, env, cwd }) => {
      const child = spawn(command, args, { env, cwd, stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout?.on('data', (chunk) => process.stdout.write(chunk));
      child.stderr?.on('data', (chunk) => process.stderr.write(chunk));
      return {
        pid: child.pid ?? 0,
        kill: () => child.kill(),
        onExit: (callback) => child.once('exit', callback)
      };
    },
    readinessUrl: (port) => `http://127.0.0.1:${port}/health`,
    fetchReadiness: async (url) => {
      try {
        const response = await fetch(url);
        return response.ok;
      } catch {
        return false;
      }
    },
    randomDelay: async () => new Promise((resolve) => setTimeout(resolve, 250)),
    onUnexpectedExit
  });
}
