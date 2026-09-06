import type {
  ChatMessage,
  ContextReference,
  Conversation,
  FilePatch,
  PlanStep,
  TerminalCommand
} from '../types.js';
import { migrate, type SqliteDb } from './database.js';

type MessageRow = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  state: ChatMessage['state'];
  error: string | null;
  context_json: string;
  plan_json: string;
  created_at: string;
};

export interface ApplicationSettings {
  modelRoute?: Record<string, unknown>;
  theme?: 'light' | 'dark' | 'system';
  schemaSource?: 'discovered' | 'bundled-fallback';
  schemaVersion?: string;
}

export function openAgentStore(db: SqliteDb): AgentStore {
  migrate(db);
  return new AgentStore(db);
}

export class AgentStore {
  constructor(private readonly db: SqliteDb) {}

  saveConversation(conversation: Conversation): void {
    this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO conversations (id, title, created_at, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET title = excluded.title, updated_at = excluded.updated_at`
        )
        .run(conversation.id, conversation.title, conversation.createdAt, conversation.updatedAt);
      this.db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conversation.id);
      const insert = this.db.prepare(
        `INSERT INTO messages
         (id, conversation_id, role, content, state, error, context_json, plan_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const message of conversation.messages) {
        insert.run(
          message.id,
          message.conversationId,
          message.role,
          message.content,
          message.state,
          message.error ?? null,
          JSON.stringify(message.context ?? []),
          JSON.stringify(message.plan ?? []),
          message.createdAt
        );
      }
    })();
  }

  listConversations(): Array<Pick<Conversation, 'id' | 'title' | 'updatedAt'>> {
    return this.db
      .prepare('SELECT id, title, updated_at AS updatedAt FROM conversations ORDER BY updated_at DESC')
      .all() as Array<Pick<Conversation, 'id' | 'title' | 'updatedAt'>>;
  }

  getConversation(id: string): Conversation | undefined {
    const row = this.db
      .prepare('SELECT id, title, created_at AS createdAt, updated_at AS updatedAt FROM conversations WHERE id = ?')
      .get(id) as Conversation | undefined;
    if (!row) return undefined;
    const rows = this.db
      .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at, rowid')
      .all(id) as MessageRow[];
    return {
      ...row,
      messages: rows.map((item) => {
        const context = JSON.parse(item.context_json) as ContextReference[];
        const plan = JSON.parse(item.plan_json) as PlanStep[];
        return {
          id: item.id,
          conversationId: item.conversation_id,
          role: item.role,
          content: item.content,
          state: item.state,
          error: item.error ?? undefined,
          context: context.length > 0 ? context : undefined,
          plan: plan.length > 0 ? plan : undefined,
          createdAt: item.created_at
        };
      })
    };
  }

  checkpoint(conversationId: string | null, unsentInput: string): void {
    this.db
      .prepare(
        `INSERT INTO checkpoint (id, conversation_id, unsent_input) VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET conversation_id = excluded.conversation_id, unsent_input = excluded.unsent_input`
      )
      .run(conversationId, unsentInput);
  }

  checkpointValue(): { conversationId: string | null; unsentInput: string } {
    const row = this.db.prepare('SELECT conversation_id, unsent_input FROM checkpoint WHERE id = 1').get() as
      | { conversation_id: string | null; unsent_input: string }
      | undefined;
    return { conversationId: row?.conversation_id ?? null, unsentInput: row?.unsent_input ?? '' };
  }

  recordPatch(patch: FilePatch): void {
    this.db
      .prepare(
        `INSERT INTO patch_decisions (id, conversation_id, path, before_content, after_content, decision)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET decision = excluded.decision`
      )
      .run(patch.id, patch.conversationId, patch.path, patch.before, patch.after, patch.decision);
  }

  patchesFor(conversationId: string): FilePatch[] {
    const rows = this.db
      .prepare('SELECT * FROM patch_decisions WHERE conversation_id = ? ORDER BY rowid')
      .all(conversationId) as Array<{
      id: string;
      conversation_id: string;
      path: string;
      before_content: string;
      after_content: string;
      decision: FilePatch['decision'];
    }>;
    return rows.map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      path: row.path,
      before: row.before_content,
      after: row.after_content,
      decision: row.decision
    }));
  }

  patchById(id: string): FilePatch | undefined {
    const row = this.db
      .prepare('SELECT id, conversation_id, path, before_content, after_content, decision FROM patch_decisions WHERE id = ?')
      .get(id) as
      | { id: string; conversation_id: string; path: string; before_content: string; after_content: string; decision: FilePatch['decision'] }
      | undefined;
    return row
      ? { id: row.id, conversationId: row.conversation_id, path: row.path, before: row.before_content, after: row.after_content, decision: row.decision }
      : undefined;
  }

  recordTerminal(command: TerminalCommand): void {
    this.db
      .prepare(
        `INSERT INTO terminal_decisions (id, conversation_id, command, decision) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET decision = excluded.decision`
      )
      .run(command.id, command.conversationId, command.command, command.decision);
  }

  terminalFor(conversationId: string): TerminalCommand[] {
    return this.db
      .prepare('SELECT id, conversation_id, command, decision FROM terminal_decisions WHERE conversation_id = ? ORDER BY rowid')
      .all(conversationId) as TerminalCommand[];
  }

  terminalById(id: string): TerminalCommand | undefined {
    const row = this.db
      .prepare('SELECT id, conversation_id, command, decision FROM terminal_decisions WHERE id = ?')
      .get(id) as { id: string; conversation_id: string; command: string; decision: TerminalCommand['decision'] } | undefined;
    return row ? { id: row.id, conversationId: row.conversation_id, command: row.command, decision: row.decision } : undefined;
  }

  setSetting<T>(key: string, value: T): void {
    this.db
      .prepare(
        `INSERT INTO app_settings (key, value_json) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`
      )
      .run(key, JSON.stringify(value));
  }

  getSetting<T>(key: string): T | undefined {
    const row = this.db.prepare('SELECT value_json FROM app_settings WHERE key = ?').get(key) as
      | { value_json: string }
      | undefined;
    return row ? (JSON.parse(row.value_json) as T) : undefined;
  }
}
