import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const executable = process.env.IRISLENS_EXECUTABLE;
if (!executable) {
  console.error('IRISLENS_EXECUTABLE must point to the packaged IrisLens binary.');
  process.exit(1);
}

const child = spawn(executable, [], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    IRISLENS_SMOKE: '1',
    ELECTRON_RUN_AS_NODE: undefined,
    ELECTRON_DISABLE_SANDBOX: process.env.IRISLENS_DISABLE_SANDBOX === '1' ? '1' : undefined
  }
});
let output = '';
child.stdout.on('data', (chunk) => { output += chunk.toString(); });
child.stderr.on('data', (chunk) => { output += chunk.toString(); });
const deadline = Date.now() + 30_000;
while (Date.now() < deadline) {
  if (output.includes('IrisLens shell ready')) {
    console.log('Smoke passed: IrisLens IDE shell reached.');
    console.log(/IrisLens gateway (ready|error): .*/.exec(output)?.[0] ?? 'IrisLens gateway readiness not reported.');
    child.kill();
    process.exit(0);
  }
  await delay(250);
}
console.error('Smoke failed: packaged application did not reach IrisLens shell.');
console.error(output);
child.kill();
process.exit(1);
