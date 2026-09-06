import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { bundledSchemaVersion, discoverSchema, type DiscoveredSchema } from './schema.js';

const execFileAsync = promisify(execFile);

export type RuntimeSchemaRunner = (pythonPath: string, scriptPath: string) => Promise<string>;

export async function extractRuntimeSchema(
  pythonPath: string,
  runner: RuntimeSchemaRunner = async (python, script) => {
    const { stdout } = await execFileAsync(python, [script], { timeout: 10_000 });
    return stdout;
  }
): Promise<DiscoveredSchema> {
  try {
    const output = await runner(pythonPath, join(process.cwd(), 'gateway/discover_schema.py'));
    return discoverSchema(JSON.parse(output));
  } catch {
    return { ...discoverSchema(null), version: bundledSchemaVersion };
  }
}
