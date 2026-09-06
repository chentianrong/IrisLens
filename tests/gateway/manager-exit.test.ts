import { describe, expect, it, vi } from 'vitest';
import { GatewayManager, type ManagedProcess } from '../../src/gateway/manager.js';

describe('GatewayManager unexpected exit', () => {
  it('transitions to a deterministic error state when the child exits', async () => {
    let exitListener: ((code: number | null) => void) | undefined;
    const child: ManagedProcess = {
      pid: 51,
      kill: () => undefined,
      onExit: (listener) => { exitListener = listener; }
    };
    const onUnexpectedExit = vi.fn();
    const manager = new GatewayManager({
      spawnProcess: () => child,
      readinessUrl: (port) => `http://127.0.0.1:${port}/health`,
      fetchReadiness: async () => true,
      randomDelay: async () => undefined,
      onUnexpectedExit
    });
    await manager.start({ pythonPath: 'python', workDir: '.' });
    exitListener?.(2);
    expect(manager.snapshot()).toMatchObject({ state: 'error', error: 'Gateway exited unexpectedly with code 2' });
    expect(onUnexpectedExit).toHaveBeenCalledWith('Gateway exited unexpectedly with code 2');
  });
});
