import { homedir, platform } from 'node:os';
import { join } from 'node:path';

export function userDataDirectory(appName = 'IrisLens', os = platform(), home = homedir()): string {
  if (os === 'win32') return join(process.env.APPDATA ?? join(home, 'AppData', 'Roaming'), appName);
  if (os === 'darwin') return join(home, 'Library', 'Application Support', appName);
  return join(process.env.XDG_DATA_HOME ?? join(home, '.local', 'share'), appName.toLowerCase());
}
