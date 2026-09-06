import { describe, expect, it } from 'vitest';
import { GatewayManager, type ManagedProcess } from '../../src/gateway/manager.js';

describe('GatewayManager', () => {
  it('starts on a random localhost port, cleans up, and restarts', async () => {
    let processes = 0;
    const killed: number[] = [];
    let nextPid = 100;
    const makeProcess = (): ManagedProcess => {
      const pid = nextPid;
      nextPid += 1;
      return { pid, kill: () => killed.push(pid) };
    };
    let calls = 0;
    const manager = new GatewayManager({
      spawnProcess: () => {
        processes += 1;
        return makeProcess();
      },
      readinessUrl: (port) => `http://127.0.0.1:${port}/health`,
      fetchReadiness: async () => (calls += 1) >= 3,
      randomDelay: async () => undefined
    });
    const port = await manager.start({ pythonPath: '/usr/bin/python', workDir: '.' });
    expect(port).toBeGreaterThan(0);
    expect(manager.snapshot().state).toBe('ready');
    await manager.restart({ pythonPath: '/usr/bin/python', workDir: '.' });
    expect(killed).toEqual([100]);
    expect(processes).toBe(2);
  });

  it('redacts secrets in error state', () => {
    const manager = new GatewayManager({
      spawnProcess: () => ({ pid: 1, kill: () => undefined }),
      readinessUrl: () => '',
      fetchReadiness: async () => false,
      randomDelay: async () => undefined
    });
    manager.fail('failed with sk-secret123', ['sk-secret123']);
    expect(manager.snapshot().error).not.toContain('sk-secret123');
    expect(manager.snapshot().error).toContain('[REDACTED]');
  });
});
