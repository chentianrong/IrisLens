import Database from 'better-sqlite3';

export type SqliteDb = Database.Database;

export interface Migration {
  id: number;
  name: string;
  up: string[];
  down: string[];
}

export const migrations: Migration[] = [
  {
    id: 1,
    name: 'agent-workbench',
    up: [
      `CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        state TEXT NOT NULL,
        error TEXT,
        context_json TEXT NOT NULL DEFAULT '[]',
        plan_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE patch_decisions (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        path TEXT NOT NULL,
        before_content TEXT NOT NULL,
        after_content TEXT NOT NULL,
        decision TEXT NOT NULL
      )`,
      `CREATE TABLE terminal_decisions (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        command TEXT NOT NULL,
        decision TEXT NOT NULL
      )`,
      `CREATE TABLE checkpoint (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        conversation_id TEXT,
        unsent_input TEXT NOT NULL DEFAULT ''
      )`,
      `CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL
      )`,
      'CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at)',
      'CREATE INDEX idx_patch_conversation ON patch_decisions(conversation_id)',
      'CREATE INDEX idx_terminal_conversation ON terminal_decisions(conversation_id)'
    ],
    down: [
      'DROP INDEX IF EXISTS idx_terminal_conversation',
      'DROP INDEX IF EXISTS idx_patch_conversation',
      'DROP INDEX IF EXISTS idx_messages_conversation',
      'DROP TABLE IF EXISTS app_settings',
      'DROP TABLE IF EXISTS checkpoint',
      'DROP TABLE IF EXISTS terminal_decisions',
      'DROP TABLE IF EXISTS patch_decisions',
      'DROP TABLE IF EXISTS messages',
      'DROP TABLE IF EXISTS conversations'
    ]
  }
];

function appliedIds(db: SqliteDb): number[] {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)');
  return (db.prepare('SELECT id FROM schema_migrations ORDER BY id').all() as Array<{ id: number }>).map((row) => row.id);
}

export function migrate(db: SqliteDb, targetVersion = migrations.length): void {
  const applied = new Set(appliedIds(db));
  const forward = targetVersion >= 0 && targetVersion <= migrations.length;
  if (!forward) throw new Error(`Unknown migration target: ${targetVersion}`);
  for (const migration of migrations.filter((item) => !applied.has(item.id) && item.id <= targetVersion)) {
    db.transaction(() => {
      for (const statement of migration.up) db.exec(statement);
      db.prepare('INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)').run(
        migration.id,
        migration.name,
        new Date().toISOString()
      );
    })();
  }
  for (const migration of [...migrations].reverse().filter((item) => applied.has(item.id) && item.id > targetVersion)) {
    db.transaction(() => {
      for (const statement of migration.down) db.exec(statement);
      db.prepare('DELETE FROM schema_migrations WHERE id = ?').run(migration.id);
    })();
  }
}
