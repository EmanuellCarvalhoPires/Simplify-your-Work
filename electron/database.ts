import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import Store from 'electron-store';
import type { Ticket, JiraInstance, Reminder, NoteItem, UserProfile, ThemeConfig, NoteFolder, ClientAsset } from '../src/types/index';

const store = new Store();
let db: Database.Database | null = null;
let dbFilePath = '';

const defaultUserProfile: UserProfile = {
  id: 'user_default_main',
  name: 'Meu Perfil',
  email: 'usuario@empresa.com',
  role: 'Membro da Equipe',
  avatarColor: '#6366f1',
  themeConfig: {
    presetName: 'Dark Slate (Padrão)',
    bgMain: '#181825',
    bgSidebar: '#1e1e2e',
    bgHeader: '#1e1e2e',
    bgCardJira: '#1e293b',
    bgCardApp: '#27273a',
    accentPrimary: '#6366f1',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function getDatabasePath(): string {
  if (dbFilePath) return dbFilePath;
  try {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    dbFilePath = path.join(userDataPath, 'simplify_work.sqlite');
    return dbFilePath;
  } catch (e) {
    dbFilePath = path.resolve('simplify_work.sqlite');
    return dbFilePath;
  }
}

export async function initDatabase(): Promise<boolean> {
  try {
    const filePath = getDatabasePath();
    console.log(`[SQLite] Inicializando banco de dados em: ${filePath}`);

    db = new Database(filePath, { verbose: undefined });
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');

    createTables();
    migrateLegacyStoreData();

    console.log('[SQLite] Banco de dados inicializado com sucesso.');
    return true;
  } catch (err) {
    console.error('[SQLite Init Error]:', err);
    return false;
  }
}

function createTables() {
  if (!db) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS jira_instances (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      email TEXT NOT NULL,
      apiToken TEXT NOT NULL,
      authType TEXT DEFAULT 'API_TOKEN',
      accessToken TEXT DEFAULT '',
      refreshToken TEXT DEFAULT '',
      cloudId TEXT DEFAULT '',
      avatarUrl TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS saved_jql_queries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      jql TEXT NOT NULL,
      jiraInstanceId TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      key TEXT DEFAULT '',
      source TEXT NOT NULL DEFAULT 'LOCAL',
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'TO_DO',
      statusLabel TEXT DEFAULT 'A Fazer',
      jiraStatus TEXT DEFAULT '',
      color TEXT DEFAULT '#3b82f6',
      labels TEXT DEFAULT '[]',
      comments TEXT DEFAULT '[]',
      priority TEXT DEFAULT 'Normal',
      assignee TEXT DEFAULT 'Eu',
      reporter TEXT DEFAULT 'Eu',
      startDate TEXT DEFAULT '',
      dueDate TEXT DEFAULT '',
      jiraInstanceId TEXT DEFAULT '',
      linkedTicketIds TEXT DEFAULT '[]',
      linkedNoteIds TEXT DEFAULT '[]',
      updatedAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_key ON tickets(key);
    CREATE INDEX IF NOT EXISTS idx_tickets_source ON tickets(source);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      eventId TEXT DEFAULT '',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      recurrence TEXT NOT NULL DEFAULT 'INTERVAL',
      intervalMinutes INTEGER DEFAULT 45,
      scheduledTime TEXT DEFAULT '',
      enabled INTEGER DEFAULT 1,
      lastTriggered TEXT DEFAULT '',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      filePath TEXT NOT NULL UNIQUE,
      updatedAt TEXT NOT NULL,
      format TEXT DEFAULT 'richtext',
      fileType TEXT,
      originalFileName TEXT,
      fileSize INTEGER,
      mimeType TEXT,
      folderId TEXT DEFAULT '',
      isArchived INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_notes_filepath ON notes(filePath);

    CREATE TABLE IF NOT EXISTS note_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      parentId TEXT DEFAULT '',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT DEFAULT 'Desenvolvedor',
      avatarColor TEXT DEFAULT '#6366f1',
      themeConfig TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS client_assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT 'building',
      instanceIds TEXT DEFAULT '[]',
      linkedTicketIds TEXT DEFAULT '[]',
      linkedNoteIds TEXT DEFAULT '[]',
      linkedFolderIds TEXT DEFAULT '[]',
      linkedEventIds TEXT DEFAULT '[]',
      linkedReminderIds TEXT DEFAULT '[]',
      contactEmail TEXT DEFAULT '',
      contactPhone TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_client_assets_name ON client_assets(name);
    CREATE INDEX IF NOT EXISTS idx_client_assets_status ON client_assets(status);

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  try {
    db.exec("ALTER TABLE tickets ADD COLUMN jiraStatus TEXT DEFAULT ''");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE tickets ADD COLUMN clientId TEXT DEFAULT ''");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE notes ADD COLUMN folderId TEXT DEFAULT ''");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE notes ADD COLUMN clientId TEXT DEFAULT ''");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE notes ADD COLUMN isArchived INTEGER DEFAULT 0");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE note_folders ADD COLUMN parentId TEXT DEFAULT ''");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE note_folders ADD COLUMN clientId TEXT DEFAULT ''");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE note_folders ADD COLUMN isArchived INTEGER DEFAULT 0");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE reminders ADD COLUMN clientId TEXT DEFAULT ''");
  } catch (e) {}
}

function migrateLegacyStoreData() {
  if (!db) return;

  try {
    // 1. Migrate Users
    const userCount = (db.prepare('SELECT count(*) as count FROM user_profiles').get() as any)?.count || 0;
    if (userCount === 0) {
      const legacyUsers = (store.get('user_profiles_backup') as UserProfile[]) || [];
      const usersToInsert = legacyUsers.length > 0 ? legacyUsers : [defaultUserProfile];
      
      const insertUser = db.prepare(`
        INSERT OR REPLACE INTO user_profiles (id, name, email, role, avatarColor, themeConfig, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const tx = db.transaction((users: UserProfile[]) => {
        for (const u of users) {
          insertUser.run(
            u.id || `user_${Date.now()}`,
            u.name || 'Meu Perfil',
            u.email || 'usuario@empresa.com',
            u.role || 'Desenvolvedor',
            u.avatarColor || '#6366f1',
            JSON.stringify(u.themeConfig || defaultUserProfile.themeConfig),
            u.createdAt || new Date().toISOString(),
            u.updatedAt || new Date().toISOString()
          );
        }
      });
      tx(usersToInsert);
    }

    // 2. Migrate Jira Instances
    const jiraCount = (db.prepare('SELECT count(*) as count FROM jira_instances').get() as any)?.count || 0;
    if (jiraCount === 0) {
      const legacyJira = (store.get('jira_instances_backup') as JiraInstance[]) || [];
      if (legacyJira.length > 0) {
        const insertJira = db.prepare(`
          INSERT OR REPLACE INTO jira_instances (id, name, domain, email, apiToken, authType, accessToken, refreshToken, cloudId, avatarUrl)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const tx = db.transaction((list: JiraInstance[]) => {
          for (const j of list) {
            insertJira.run(
              j.id,
              j.name,
              j.domain,
              j.email,
              j.apiToken,
              j.authType || 'API_TOKEN',
              j.accessToken || '',
              j.refreshToken || '',
              j.cloudId || '',
              j.avatarUrl || ''
            );
          }
        });
        tx(legacyJira);
      }
    }

    // 3. Migrate Saved JQL
    const jqlCount = (db.prepare('SELECT count(*) as count FROM saved_jql_queries').get() as any)?.count || 0;
    if (jqlCount === 0) {
      const legacyJql = (store.get('saved_jql_queries_backup') as any[]) || [];
      if (legacyJql.length > 0) {
        const insertJql = db.prepare(`
          INSERT OR REPLACE INTO saved_jql_queries (id, name, jql, jiraInstanceId, createdAt)
          VALUES (?, ?, ?, ?, ?)
        `);
        const tx = db.transaction((list: any[]) => {
          for (const q of list) {
            insertJql.run(q.id, q.name, q.jql, q.jiraInstanceId, q.createdAt || new Date().toISOString());
          }
        });
        tx(legacyJql);
      }
    }

    // 4. Migrate Tickets
    const ticketCount = (db.prepare('SELECT count(*) as count FROM tickets').get() as any)?.count || 0;
    if (ticketCount === 0) {
      const legacyTickets = (store.get('tickets_backup') as Ticket[]) || [];
      if (legacyTickets.length > 0) {
        const insertTicket = db.prepare(`
          INSERT OR REPLACE INTO tickets (
            id, key, source, title, description, status, statusLabel, color, labels, comments,
            priority, assignee, reporter, startDate, dueDate, jiraInstanceId, linkedTicketIds,
            linkedNoteIds, updatedAt, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const tx = db.transaction((list: Ticket[]) => {
          for (const t of list) {
            insertTicket.run(
              t.id,
              t.key || '',
              t.source || 'LOCAL',
              t.title || 'Sem Título',
              t.description || '',
              t.status || 'TO_DO',
              t.statusLabel || 'A Fazer',
              t.color || '#3b82f6',
              JSON.stringify(t.labels || []),
              JSON.stringify(t.comments || []),
              t.priority || 'Normal',
              t.assignee || 'Eu',
              t.reporter || 'Eu',
              t.startDate || '',
              t.dueDate || '',
              t.jiraInstanceId || '',
              JSON.stringify(t.linkedTicketIds || []),
              JSON.stringify(t.linkedNoteIds || []),
              t.updatedAt || new Date().toISOString(),
              t.createdAt || new Date().toISOString()
            );
          }
        });
        tx(legacyTickets);
      }
    }

    // 5. Migrate Reminders
    const reminderCount = (db.prepare('SELECT count(*) as count FROM reminders').get() as any)?.count || 0;
    if (reminderCount === 0) {
      const legacyReminders = (store.get('reminders_backup') as Reminder[]) || [];
      if (legacyReminders.length > 0) {
        const insertReminder = db.prepare(`
          INSERT OR REPLACE INTO reminders (id, eventId, title, message, recurrence, intervalMinutes, scheduledTime, enabled, lastTriggered, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const tx = db.transaction((list: Reminder[]) => {
          for (const r of list) {
            insertReminder.run(
              r.id,
              r.eventId || '',
              r.title || 'Lembrete',
              r.message || '',
              r.recurrence || 'INTERVAL',
              r.intervalMinutes || 45,
              r.scheduledTime || '',
              r.enabled ? 1 : 0,
              r.lastTriggered || '',
              r.createdAt || new Date().toISOString()
            );
          }
        });
        tx(legacyReminders);
      }
    }

    // 6. Migrate Notes
    const noteCount = (db.prepare('SELECT count(*) as count FROM notes').get() as any)?.count || 0;
    if (noteCount === 0) {
      const legacyNotes = (store.get('notes_backup') as NoteItem[]) || [];
      if (legacyNotes.length > 0) {
        const insertNote = db.prepare(`
          INSERT OR REPLACE INTO notes (id, title, filePath, updatedAt, format, fileType, originalFileName, fileSize, mimeType)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const tx = db.transaction((list: NoteItem[]) => {
          for (const n of list) {
            insertNote.run(
              n.id,
              n.title || 'Nota',
              n.filePath,
              n.updatedAt || new Date().toISOString(),
              n.format || 'richtext',
              n.fileType || null,
              n.originalFileName || null,
              n.fileSize || null,
              n.mimeType || null
            );
          }
        });
        tx(legacyNotes);
      }
    }
  } catch (e) {
    console.error('[SQLite Migration Error]:', e);
  }
}

function getDirectorySize(dirPath: string): number {
  let total = 0;
  try {
    if (!fs.existsSync(dirPath)) return 0;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          total += getDirectorySize(fullPath);
        } else if (entry.isFile()) {
          const stat = fs.statSync(fullPath);
          total += stat.size;
        }
      } catch {}
    }
  } catch {}
  return total;
}

// === DATABASE STATS & UTILS ===
export function getDatabaseStats() {
  if (!db) return null;
  const filePath = getDatabasePath();
  const userDataPath = path.dirname(filePath);
  
  let totalBytes = 0;
  try {
    // 1. Tamanho do banco SQLite e arquivos de journaling WAL/SHM
    if (fs.existsSync(filePath)) {
      totalBytes += fs.statSync(filePath).size;
    }
    if (fs.existsSync(`${filePath}-wal`)) {
      totalBytes += fs.statSync(`${filePath}-wal`).size;
    }
    if (fs.existsSync(`${filePath}-shm`)) {
      totalBytes += fs.statSync(`${filePath}-shm`).size;
    }

    // 2. Tamanho de todas as notas físicas, documentos anexados e imagens
    const notesDir = path.join(userDataPath, 'notes');
    if (fs.existsSync(notesDir)) {
      totalBytes += getDirectorySize(notesDir);
    }

    // 3. Tamanho de backups locais ou outros arquivos de armazenamento
    const backupsDir = path.join(userDataPath, 'backups');
    if (fs.existsSync(backupsDir)) {
      totalBytes += getDirectorySize(backupsDir);
    }
  } catch (e) {
    console.error('Erro ao calcular tamanho total em disco:', e);
  }

  let fileSizeFormatted = '0 B';
  if (totalBytes > 1024 * 1024 * 1024) {
    fileSizeFormatted = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  } else if (totalBytes > 1024 * 1024) {
    fileSizeFormatted = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (totalBytes > 1024) {
    fileSizeFormatted = `${(totalBytes / 1024).toFixed(1)} KB`;
  } else {
    fileSizeFormatted = `${totalBytes} B`;
  }

  const ticketsCount = (db.prepare('SELECT count(*) as count FROM tickets').get() as any)?.count || 0;
  const notesCount = (db.prepare('SELECT count(*) as count FROM notes').get() as any)?.count || 0;
  const remindersCount = (db.prepare('SELECT count(*) as count FROM reminders').get() as any)?.count || 0;
  const jiraCount = (db.prepare('SELECT count(*) as count FROM jira_instances').get() as any)?.count || 0;
  const jqlCount = (db.prepare('SELECT count(*) as count FROM saved_jql_queries').get() as any)?.count || 0;
  const usersCount = (db.prepare('SELECT count(*) as count FROM user_profiles').get() as any)?.count || 0;

  return {
    engine: 'SQLite (better-sqlite3)',
    filePath,
    fileSize: fileSizeFormatted,
    isHealthy: true,
    tableCounts: {
      tickets: ticketsCount,
      notes: notesCount,
      reminders: remindersCount,
      jiraInstances: jiraCount,
      savedJqlQueries: jqlCount,
      users: usersCount,
    },
  };
}

// Backward compatibility helper for legacy Mongo status checks
export function getMongoStatus() {
  const stats = getDatabaseStats();
  return {
    connected: true,
    engine: 'SQLITE',
    uri: stats?.filePath || getDatabasePath(),
  };
}

export async function setMongoUri(_uri: string) {
  return { success: true, message: 'Operando 100% via SQLite local embutido.' };
}

// === SETTINGS KEY-VALUE STORE ===
export function dbGetSetting(key: string): string | null {
  if (!db) return (store.get(key) as string) || null;
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as any;
  if (row) return row.value;
  return (store.get(key) as string) || null;
}

export function dbSetSetting(key: string, value: string): void {
  if (db) {
    db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run(key, value);
  }
  store.set(key, value);
}

// === JIRA INSTANCES ===
export async function dbGetJiraInstances(): Promise<JiraInstance[]> {
  if (!db) return (store.get('jira_instances_backup') as JiraInstance[]) || [];
  try {
    const rows = db.prepare('SELECT * FROM jira_instances').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      domain: r.domain,
      email: r.email,
      apiToken: r.apiToken,
      authType: r.authType || (r.cloudId ? 'OAUTH' : 'API_TOKEN'),
      accessToken: r.accessToken || '',
      refreshToken: r.refreshToken || '',
      cloudId: r.cloudId || '',
      avatarUrl: r.avatarUrl || '',
    }));
  } catch (err) {
    console.error('[SQLite Error dbGetJiraInstances]:', err);
    return [];
  }
}

export async function dbSaveJiraInstance(instance: Omit<JiraInstance, 'id'> & { id?: string }): Promise<JiraInstance> {
  const id = instance.id || 'jira_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const data: JiraInstance = {
    id,
    name: instance.name,
    domain: instance.domain,
    email: instance.email,
    apiToken: instance.apiToken,
    authType: instance.authType || 'API_TOKEN',
    accessToken: instance.accessToken || '',
    refreshToken: instance.refreshToken || '',
    cloudId: instance.cloudId || '',
    avatarUrl: instance.avatarUrl || '',
  };

  if (db) {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO jira_instances (id, name, domain, email, apiToken, authType, accessToken, refreshToken, cloudId, avatarUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.id,
        data.name,
        data.domain,
        data.email,
        data.apiToken,
        data.authType,
        data.accessToken,
        data.refreshToken,
        data.cloudId,
        data.avatarUrl
      );
    } catch (err) {
      console.error('[SQLite Error dbSaveJiraInstance]:', err);
    }
  }

  return data;
}

export async function dbDeleteJiraInstance(id: string): Promise<boolean> {
  if (db) {
    try {
      // 1. Delete all tickets belonging to this Jira instance
      db.prepare(`
        DELETE FROM tickets 
        WHERE source = 'JIRA' 
          AND (jiraInstanceId = ? OR jiraInstanceId = '' OR jiraInstanceId IS NULL OR id LIKE ? OR id LIKE ?)
      `).run(id, `jira_%_${id}`, `%_${id}`);

      // 2. Delete saved JQL queries belonging to this Jira instance
      db.prepare('DELETE FROM saved_jql_queries WHERE jiraInstanceId = ?').run(id);

      // 3. Clean up references in client_assets
      const assets = db.prepare('SELECT id, instanceIds FROM client_assets').all() as any[];
      for (const asset of assets) {
        let instanceIds: string[] = [];
        try { instanceIds = JSON.parse(asset.instanceIds || '[]'); } catch (e) {}

        const newInstanceIds = instanceIds.filter((instId) => instId !== id);
        if (newInstanceIds.length !== instanceIds.length) {
          db.prepare('UPDATE client_assets SET instanceIds = ?, updatedAt = ? WHERE id = ?').run(
            JSON.stringify(newInstanceIds),
            new Date().toISOString(),
            asset.id
          );
        }
      }

      // 4. Delete the Jira instance itself
      db.prepare('DELETE FROM jira_instances WHERE id = ?').run(id);
    } catch (err) {
      console.error('[SQLite Error dbDeleteJiraInstance]:', err);
    }
  }
  return true;
}

// === SAVED JQL QUERIES ===
export async function dbGetSavedJqlQueries(): Promise<any[]> {
  if (!db) return (store.get('saved_jql_queries_backup') as any[]) || [];
  try {
    const rows = db.prepare('SELECT * FROM saved_jql_queries ORDER BY createdAt DESC').all() as any[];
    return rows;
  } catch (err) {
    console.error('[SQLite Error dbGetSavedJqlQueries]:', err);
    return [];
  }
}

export async function dbSaveJqlQuery(query: { id?: string; name: string; jql: string; jiraInstanceId: string }): Promise<any> {
  const id = query.id || 'jql_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const data = {
    id,
    name: query.name,
    jql: query.jql,
    jiraInstanceId: query.jiraInstanceId,
    createdAt: new Date().toISOString(),
  };

  if (db) {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO saved_jql_queries (id, name, jql, jiraInstanceId, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(data.id, data.name, data.jql, data.jiraInstanceId, data.createdAt);
    } catch (err) {
      console.error('[SQLite Error dbSaveJqlQuery]:', err);
    }
  }

  return data;
}

export async function dbDeleteJqlQuery(id: string): Promise<boolean> {
  if (db) {
    try {
      db.prepare('DELETE FROM saved_jql_queries WHERE id = ?').run(id);
    } catch (err) {
      console.error('[SQLite Error dbDeleteJqlQuery]:', err);
    }
  }
  return true;
}

// === TICKETS ===
export async function dbGetTickets(): Promise<Ticket[]> {
  if (!db) return (store.get('tickets_backup') as Ticket[]) || [];

  try {
    const rows = db.prepare('SELECT * FROM tickets ORDER BY createdAt DESC').all() as any[];

    // Check highest existing numerical key for local tickets
    let highestKeyNum = 0;
    rows.forEach((r) => {
      if (r.source === 'LOCAL' && r.key) {
        const match = String(r.key).match(/^TASK-(\d+)$/i);
        if (match && match[1]) {
          const n = parseInt(match[1], 10);
          if (!isNaN(n) && n > highestKeyNum) highestKeyNum = n;
        }
      }
    });

    // Backfill missing keys for local tickets chronologically
    const updateKeyStmt = db.prepare('UPDATE tickets SET key = ? WHERE id = ?');
    const sortedLocalRows = rows
      .filter((r) => r.source === 'LOCAL' && !r.key)
      .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

    sortedLocalRows.forEach((r) => {
      highestKeyNum++;
      const newKey = `TASK-${highestKeyNum}`;
      r.key = newKey;
      try {
        updateKeyStmt.run(newKey, r.id);
      } catch (e) {}
    });

    // Ensure non-local (JIRA) tickets always have a valid instance assigned, and clean up orphaned Jira tickets
    const currentInstances = db.prepare('SELECT id, domain FROM jira_instances').all() as any[];
    const validInstanceIds = new Set(currentInstances.map((i) => i.id));
    const updateInstStmt = db.prepare('UPDATE tickets SET jiraInstanceId = ? WHERE id = ?');
    const deleteOrphanedStmt = db.prepare("DELETE FROM tickets WHERE id = ? AND source = 'JIRA'");

    const filteredRows: any[] = [];

    for (const r of rows) {
      if (r.source === 'JIRA') {
        if (currentInstances.length === 0) {
          // No Jira instances exist in the app - delete orphaned Jira ticket
          try { deleteOrphanedStmt.run(r.id); } catch (e) {}
          continue;
        }

        if (!r.jiraInstanceId || !validInstanceIds.has(r.jiraInstanceId)) {
          // Try to match instance from ticket id suffix
          const matchedInst = currentInstances.find((inst) => r.id && r.id.endsWith(`_${inst.id}`));
          if (matchedInst) {
            r.jiraInstanceId = matchedInst.id;
            try { updateInstStmt.run(matchedInst.id, r.id); } catch (e) {}
          } else if (currentInstances.length === 1) {
            r.jiraInstanceId = currentInstances[0].id;
            try { updateInstStmt.run(currentInstances[0].id, r.id); } catch (e) {}
          } else {
            // Orphaned ticket from a deleted instance - remove it
            try { deleteOrphanedStmt.run(r.id); } catch (e) {}
            continue;
          }
        }
      }
      filteredRows.push(r);
    }

    return filteredRows.map((r) => {
      let labels: string[] = [];
      let comments: any[] = [];
      let linkedTicketIds: string[] = [];
      let linkedNoteIds: string[] = [];

      try { labels = JSON.parse(r.labels || '[]'); } catch (e) {}
      try { comments = JSON.parse(r.comments || '[]'); } catch (e) {}
      try { linkedTicketIds = JSON.parse(r.linkedTicketIds || '[]'); } catch (e) {}
      try { linkedNoteIds = JSON.parse(r.linkedNoteIds || '[]'); } catch (e) {}

      return {
        id: r.id,
        key: r.key || '',
        source: r.source || 'LOCAL',
        title: r.title || 'Sem Título',
        description: r.description || '',
        status: r.status || 'TO_DO',
        statusLabel: r.statusLabel || 'A Fazer',
        jiraStatus: r.jiraStatus || '',
        color: r.color || '#3b82f6',
        labels,
        comments,
        priority: r.priority || 'Normal',
        assignee: r.assignee || 'Eu',
        reporter: r.reporter || 'Eu',
        startDate: r.startDate || '',
        dueDate: r.dueDate || '',
        jiraInstanceId: r.jiraInstanceId || '',
        linkedTicketIds,
        linkedNoteIds,
        updatedAt: r.updatedAt,
        createdAt: r.createdAt,
      };
    });
  } catch (err) {
    console.error('[SQLite Error dbGetTickets]:', err);
    return [];
  }
}

export async function dbSaveTicket(ticket: Partial<Ticket>): Promise<Ticket> {
  const id = ticket.id || 'tck_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const now = new Date().toISOString();

  // Find existing row in SQLite if available
  let existingRow: any = null;
  if (db) {
    try {
      existingRow = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
    } catch (e) {}
  }

  // Auto-generate TASK-N key for LOCAL tickets if missing
  let generatedKey = ticket.key || existingRow?.key || '';
  if ((ticket.source === 'LOCAL' || (!ticket.source && existingRow?.source === 'LOCAL')) && !generatedKey) {
    try {
      if (db) {
        const localRows = db.prepare("SELECT key FROM tickets WHERE source = 'LOCAL'").all() as any[];
        let maxNum = 0;
        localRows.forEach((r) => {
          if (r.key) {
            const match = String(r.key).match(/^TASK-(\d+)$/i);
            if (match && match[1]) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > maxNum) maxNum = num;
            }
          }
        });
        generatedKey = `TASK-${maxNum + 1}`;
      } else {
        generatedKey = 'TASK-1';
      }
    } catch (e) {
      generatedKey = 'TASK-1';
    }
  }

  // Preserve existing relations if not explicitly provided
  let existingLinkedIds: string[] = [];
  let existingLinkedNoteIds: string[] = [];
  if (existingRow) {
    try { existingLinkedIds = JSON.parse(existingRow.linkedTicketIds || '[]'); } catch (e) {}
    try { existingLinkedNoteIds = JSON.parse(existingRow.linkedNoteIds || '[]'); } catch (e) {}
  }

  const finalLinkedIds = ticket.linkedTicketIds !== undefined ? ticket.linkedTicketIds : existingLinkedIds;
  const finalLinkedNoteIds = ticket.linkedNoteIds !== undefined ? ticket.linkedNoteIds : existingLinkedNoteIds;

  const sanitizedComments = (ticket.comments || []).map((c: any) => ({
    id: String(c.id || 'comm_' + Date.now()),
    author: String(c.author || 'Eu'),
    body: String(c.body || ''),
    created: String(c.created || now),
    isLocal: c.isLocal !== undefined ? Boolean(c.isLocal) : String(c.id || '').startsWith('comm_'),
  }));

  const data: Ticket = {
    id,
    key: generatedKey,
    source: ticket.source || existingRow?.source || 'LOCAL',
    title: ticket.title !== undefined ? ticket.title : (existingRow?.title || 'Sem Título'),
    description: ticket.description !== undefined ? ticket.description : (existingRow?.description || ''),
    status: ticket.status || existingRow?.status || 'TO_DO',
    statusLabel: ticket.statusLabel || ticket.status || existingRow?.statusLabel || 'A Fazer',
    jiraStatus: ticket.jiraStatus !== undefined ? ticket.jiraStatus : (existingRow?.jiraStatus || ''),
    color: ticket.color || existingRow?.color || '#3b82f6',
    labels: ticket.labels !== undefined ? ticket.labels : (existingRow ? JSON.parse(existingRow.labels || '[]') : []),
    comments: ticket.comments !== undefined ? sanitizedComments : (existingRow ? JSON.parse(existingRow.comments || '[]') : []),
    priority: ticket.priority || existingRow?.priority || 'Normal',
    assignee: ticket.assignee || existingRow?.assignee || 'Eu',
    reporter: ticket.reporter || existingRow?.reporter || 'Eu',
    startDate: ticket.startDate !== undefined ? ticket.startDate : (existingRow?.startDate || ''),
    dueDate: ticket.dueDate !== undefined ? ticket.dueDate : (existingRow?.dueDate || ''),
    jiraInstanceId: ticket.jiraInstanceId !== undefined ? ticket.jiraInstanceId : (existingRow?.jiraInstanceId || ''),
    linkedTicketIds: finalLinkedIds,
    linkedNoteIds: finalLinkedNoteIds,
    updatedAt: now,
    createdAt: ticket.createdAt || existingRow?.createdAt || now,
  };

  if (db) {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO tickets (
          id, key, source, title, description, status, statusLabel, jiraStatus, color, labels, comments,
          priority, assignee, reporter, startDate, dueDate, jiraInstanceId, linkedTicketIds,
          linkedNoteIds, updatedAt, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.id,
        data.key || '',
        data.source,
        data.title,
        data.description,
        data.status,
        data.statusLabel || 'A Fazer',
        data.jiraStatus || '',
        data.color || '#3b82f6',
        JSON.stringify(data.labels || []),
        JSON.stringify(data.comments || []),
        data.priority || 'Normal',
        data.assignee || 'Eu',
        data.reporter || 'Eu',
        data.startDate || '',
        data.dueDate || '',
        data.jiraInstanceId || '',
        JSON.stringify(data.linkedTicketIds || []),
        JSON.stringify(data.linkedNoteIds || []),
        data.updatedAt,
        data.createdAt
      );
    } catch (err) {
      console.error('[SQLite Error dbSaveTicket]:', err);
    }
  }

  return data;
}

export async function dbDeleteTicket(id: string): Promise<boolean> {
  if (db) {
    try {
      db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
    } catch (err) {
      console.error('[SQLite Error dbDeleteTicket]:', err);
    }
  }
  return true;
}

export async function dbDeleteTickets(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  if (db) {
    try {
      const deleteStmt = db.prepare('DELETE FROM tickets WHERE id = ?');
      const deleteMany = db.transaction((ticketIds: string[]) => {
        for (const tid of ticketIds) {
          deleteStmt.run(tid);
        }
      });
      deleteMany(ids);
    } catch (err) {
      console.error('[SQLite Error dbDeleteTickets]:', err);
    }
  }
  return true;
}

export async function dbBatchUpdateTicketStatus(
  ids: string[],
  status: TicketStatus,
  statusLabel?: string
): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  const now = new Date().toISOString();
  const label = statusLabel || (
    status === 'IN_PROGRESS' ? 'Em Progresso' :
    status === 'NEXT' ? 'Fazer em Seguida' :
    status === 'WAITING_CLIENT' ? 'Aguardando Cliente' :
    status === 'BLOCKED' ? 'Bloqueado' :
    status === 'DONE' ? 'Concluído' :
    status === 'BACKLOG' ? 'Backlog' : 'A Fazer'
  );

  if (db) {
    try {
      const updateStmt = db.prepare(`
        UPDATE tickets 
        SET status = ?, statusLabel = ?, updatedAt = ?
        WHERE id = ?
      `);
      const updateMany = db.transaction((ticketIds: string[]) => {
        for (const tid of ticketIds) {
          updateStmt.run(status, label, now, tid);
        }
      });
      updateMany(ids);
    } catch (err) {
      console.error('[SQLite Error dbBatchUpdateTicketStatus]:', err);
    }
  }
  return true;
}


// === REMINDERS ===
export async function dbGetReminders(): Promise<Reminder[]> {
  if (!db) return (store.get('reminders_backup') as Reminder[]) || [];
  try {
    const rows = db.prepare('SELECT * FROM reminders ORDER BY createdAt DESC').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      eventId: r.eventId || '',
      title: r.title,
      message: r.message,
      recurrence: r.recurrence,
      intervalMinutes: r.intervalMinutes,
      scheduledTime: r.scheduledTime,
      enabled: Boolean(r.enabled),
      lastTriggered: r.lastTriggered || '',
      createdAt: r.createdAt,
    }));
  } catch (err) {
    console.error('[SQLite Error dbGetReminders]:', err);
    return [];
  }
}

export async function dbSaveReminder(reminder: Partial<Reminder>): Promise<Reminder> {
  const id = reminder.id || 'rem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const now = new Date().toISOString();

  let existingRow: any = null;
  if (db) {
    try {
      existingRow = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
    } catch (e) {}
  }

  const data: Reminder = {
    id,
    eventId: reminder.eventId !== undefined ? reminder.eventId : (existingRow?.eventId || ''),
    title: reminder.title || existingRow?.title || 'Novo Lembrete',
    message: reminder.message !== undefined ? reminder.message : (existingRow?.message || ''),
    recurrence: reminder.recurrence || existingRow?.recurrence || 'INTERVAL',
    intervalMinutes: reminder.intervalMinutes !== undefined ? Number(reminder.intervalMinutes) : (existingRow?.intervalMinutes || 60),
    scheduledTime: reminder.scheduledTime !== undefined ? reminder.scheduledTime : (existingRow?.scheduledTime || ''),
    enabled: reminder.enabled !== undefined ? Boolean(reminder.enabled) : (existingRow ? Boolean(existingRow.enabled) : true),
    lastTriggered: reminder.lastTriggered !== undefined ? reminder.lastTriggered : (existingRow?.lastTriggered || ''),
    createdAt: reminder.createdAt || existingRow?.createdAt || now,
  };

  if (db) {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO reminders (id, eventId, title, message, recurrence, intervalMinutes, scheduledTime, enabled, lastTriggered, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.id,
        data.eventId || '',
        data.title,
        data.message,
        data.recurrence,
        data.intervalMinutes,
        data.scheduledTime,
        data.enabled ? 1 : 0,
        data.lastTriggered || '',
        data.createdAt
      );
    } catch (err) {
      console.error('[SQLite Error dbSaveReminder]:', err);
    }
  }

  return data;
}

export async function dbDeleteReminder(id: string): Promise<boolean> {
  if (db) {
    try {
      db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
    } catch (err) {
      console.error('[SQLite Error dbDeleteReminder]:', err);
    }
  }
  return true;
}

// === NOTES ===
export async function dbGetNotes(): Promise<NoteItem[]> {
  if (!db) return (store.get('notes_backup') as NoteItem[]) || [];
  try {
    const rows = db.prepare('SELECT * FROM notes ORDER BY updatedAt DESC').all() as any[];
    return rows.map((r) => {
      const ext = ((r.filePath || r.title || '').split('.').pop() || '').toLowerCase();
      const isBinaryFile = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
      return {
        id: r.id,
        title: r.title,
        filePath: r.filePath,
        updatedAt: r.updatedAt,
        format: r.format || (isBinaryFile ? 'file' : 'richtext'),
        fileType: r.fileType || undefined,
        originalFileName: r.originalFileName || undefined,
        fileSize: r.fileSize || undefined,
        mimeType: r.mimeType || undefined,
        folderId: r.folderId || undefined,
        isArchived: Boolean(r.isArchived),
      };
    });
  } catch (err) {
    console.error('[SQLite Error dbGetNotes]:', err);
    return [];
  }
}

export async function dbSaveNoteMeta(note: Partial<NoteItem>): Promise<NoteItem> {
  let existing: any = null;
  if (db) {
    try {
      if (note.filePath) {
        existing = db.prepare('SELECT * FROM notes WHERE filePath = ?').get(note.filePath);
      }
      if (!existing && note.id) {
        existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(note.id);
      }
    } catch (e) {}
  }

  const id = note.id || existing?.id || 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const now = new Date().toISOString();
  const filePath = note.filePath || existing?.filePath || '';
  const ext = ((filePath || note.title || '').split('.').pop() || '').toLowerCase();
  const isBinaryFile = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);

  const data: NoteItem = {
    id,
    title: note.title || existing?.title || 'Nova Anotação',
    filePath,
    updatedAt: now,
    format: note.format || existing?.format || (isBinaryFile ? 'file' : 'richtext'),
    fileType: note.fileType || existing?.fileType || undefined,
    originalFileName: note.originalFileName || existing?.originalFileName || undefined,
    fileSize: note.fileSize !== undefined ? note.fileSize : existing?.fileSize,
    mimeType: note.mimeType || existing?.mimeType || undefined,
    folderId: note.folderId !== undefined ? note.folderId : (existing?.folderId || ''),
    isArchived: note.isArchived !== undefined ? Boolean(note.isArchived) : (existing ? Boolean(existing.isArchived) : false),
  };

  if (db) {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO notes (id, title, filePath, updatedAt, format, fileType, originalFileName, fileSize, mimeType, folderId, isArchived)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.id,
        data.title,
        data.filePath,
        data.updatedAt,
        data.format,
        data.fileType || null,
        data.originalFileName || null,
        data.fileSize || null,
        data.mimeType || null,
        data.folderId || '',
        data.isArchived ? 1 : 0
      );
    } catch (err) {
      console.error('[SQLite Error dbSaveNoteMeta]:', err);
    }
  }

  return data;
}

export async function dbDeleteNoteMeta(id: string): Promise<boolean> {
  if (db) {
    try {
      db.prepare('DELETE FROM notes WHERE id = ? OR filePath = ?').run(id, id);
    } catch (err) {
      console.error('[SQLite Error dbDeleteNoteMeta]:', err);
    }
  }
  return true;
}

// === NOTE FOLDERS ===
export async function dbGetNoteFolders(): Promise<NoteFolder[]> {
  if (!db) return (store.get('note_folders_backup') as NoteFolder[]) || [];
  try {
    const rows = db.prepare('SELECT * FROM note_folders ORDER BY createdAt ASC').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color || '#6366f1',
      parentId: r.parentId || undefined,
      clientId: r.clientId || undefined,
      isArchived: r.isArchived === 1,
      createdAt: r.createdAt,
    }));
  } catch (err) {
    console.error('[SQLite Error dbGetNoteFolders]:', err);
    return [];
  }
}

export async function dbSaveNoteFolder(folder: Partial<NoteFolder> & { name: string }): Promise<NoteFolder> {
  const id = folder.id || 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const name = folder.name.trim();
  const color = folder.color || '#6366f1';
  const parentId = folder.parentId || '';
  const clientId = folder.clientId || '';
  const isArchived = folder.isArchived ? true : false;
  const createdAt = folder.createdAt || new Date().toISOString();

  const data: NoteFolder = {
    id,
    name,
    color,
    parentId: parentId || undefined,
    clientId: clientId || undefined,
    isArchived,
    createdAt,
  };

  if (db) {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO note_folders (id, name, color, parentId, clientId, isArchived, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(data.id, data.name, data.color, parentId, clientId, isArchived ? 1 : 0, data.createdAt);
    } catch (err) {
      console.error('[SQLite Error dbSaveNoteFolder]:', err);
    }
  }
  return data;
}

export async function dbDeleteNoteFolder(id: string, deleteContents: boolean = false): Promise<boolean> {
  if (db) {
    try {
      if (deleteContents) {
        // Collect all descendant folder IDs recursively
        const allFolders = db.prepare('SELECT id, parentId FROM note_folders').all() as Array<{ id: string; parentId: string }>;
        const idsToDelete = new Set<string>([id]);

        let added = true;
        while (added) {
          added = false;
          for (const f of allFolders) {
            if (f.parentId && idsToDelete.has(f.parentId) && !idsToDelete.has(f.id)) {
              idsToDelete.add(f.id);
              added = true;
            }
          }
        }

        const idsArray = Array.from(idsToDelete);
        const placeholders = idsArray.map(() => '?').join(',');

        // Delete notes inside these folders
        db.prepare(`DELETE FROM notes WHERE folderId IN (${placeholders})`).run(...idsArray);
        // Delete the folders
        db.prepare(`DELETE FROM note_folders WHERE id IN (${placeholders})`).run(...idsArray);
      } else {
        const folder = db.prepare('SELECT parentId FROM note_folders WHERE id = ?').get(id) as any;
        const targetParent = folder?.parentId || '';

        db.prepare('DELETE FROM note_folders WHERE id = ?').run(id);
        db.prepare('UPDATE note_folders SET parentId = ? WHERE parentId = ?').run(targetParent, id);
        db.prepare('UPDATE notes SET folderId = ? WHERE folderId = ?').run(targetParent, id);
      }
    } catch (err) {
      console.error('[SQLite Error dbDeleteNoteFolder]:', err);
    }
  }
  return true;
}

// === USER PROFILES ===
export async function dbGetUsers(): Promise<UserProfile[]> {
  if (!db) return (store.get('user_profiles_backup') as UserProfile[]) || [defaultUserProfile];
  try {
    const rows = db.prepare('SELECT * FROM user_profiles ORDER BY createdAt ASC').all() as any[];
    if (rows.length === 0) {
      await dbSaveUser(defaultUserProfile);
      return [defaultUserProfile];
    }
    return rows.map((r) => {
      let theme: ThemeConfig = defaultUserProfile.themeConfig;
      try { theme = JSON.parse(r.themeConfig); } catch (e) {}
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        avatarColor: r.avatarColor,
        themeConfig: theme,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });
  } catch (err) {
    console.error('[SQLite Error dbGetUsers]:', err);
    return [defaultUserProfile];
  }
}

export async function dbGetActiveUser(): Promise<UserProfile> {
  const users = await dbGetUsers();
  const activeId = dbGetSetting('active_user_id');
  if (activeId) {
    const found = users.find((u) => u.id === activeId);
    if (found) return found;
  }
  dbSetSetting('active_user_id', users[0].id);
  return users[0];
}

export async function dbSetActiveUser(id: string): Promise<UserProfile> {
  const users = await dbGetUsers();
  const found = users.find((u) => u.id === id);
  if (found) {
    dbSetSetting('active_user_id', found.id);
    dbSetSetting('themeConfig', JSON.stringify(found.themeConfig));
    return found;
  }
  return users[0];
}

export async function dbSaveUser(user: Partial<UserProfile>): Promise<UserProfile> {
  const users = await dbGetUsers();
  const now = new Date().toISOString();
  const id = user.id || `user_${Date.now()}`;
  const existing = users.find((u) => u.id === id);

  const data: UserProfile = {
    id,
    name: user.name || existing?.name || 'Novo Usuário',
    email: user.email || existing?.email || 'usuario@empresa.com',
    role: user.role || existing?.role || 'Desenvolvedor',
    avatarColor: user.avatarColor || existing?.avatarColor || '#6366f1',
    themeConfig: user.themeConfig || existing?.themeConfig || defaultUserProfile.themeConfig,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (db) {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO user_profiles (id, name, email, role, avatarColor, themeConfig, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.id,
        data.name,
        data.email,
        data.role,
        data.avatarColor,
        JSON.stringify(data.themeConfig),
        data.createdAt,
        data.updatedAt
      );
    } catch (err) {
      console.error('[SQLite Error dbSaveUser]:', err);
    }
  }

  const activeId = dbGetSetting('active_user_id');
  if (!activeId || activeId === id) {
    dbSetSetting('active_user_id', id);
    dbSetSetting('themeConfig', JSON.stringify(data.themeConfig));
  }

  return data;
}

export async function dbDeleteUser(id: string): Promise<boolean> {
  if (db) {
    try {
      db.prepare('DELETE FROM user_profiles WHERE id = ?').run(id);
    } catch (err) {
      console.error('[SQLite Error dbDeleteUser]:', err);
    }
  }

  const remaining = await dbGetUsers();
  if (remaining.length === 0) {
    const freshUser: UserProfile = {
      ...defaultUserProfile,
      id: `user_${Date.now()}`,
    };
    await dbSaveUser(freshUser);
    dbSetSetting('active_user_id', freshUser.id);
  } else {
    const activeId = dbGetSetting('active_user_id');
    if (activeId === id) {
      dbSetSetting('active_user_id', remaining[0].id);
      dbSetSetting('themeConfig', JSON.stringify(remaining[0].themeConfig));
    }
  }

  return true;
}

export async function dbSaveActiveUserTheme(theme: ThemeConfig): Promise<boolean> {
  const activeUser = await dbGetActiveUser();
  if (activeUser) {
    activeUser.themeConfig = theme;
    activeUser.updatedAt = new Date().toISOString();
    await dbSaveUser(activeUser);
  }
  dbSetSetting('themeConfig', JSON.stringify(theme));
  return true;
}

// ─── CLIENTS & ASSETS (JSM STYLE) ──────────────────────────

export async function dbGetClients(): Promise<ClientAsset[]> {
  if (!db) {
    const list = (store.get('client_assets_backup') as ClientAsset[]) || [];
    return Array.isArray(list) ? list : [];
  }

  try {
    const rows = db.prepare('SELECT * FROM client_assets ORDER BY name ASC').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      status: (r.status as any) || 'ACTIVE',
      color: r.color || '#6366f1',
      icon: r.icon || 'building',
      instanceIds: r.instanceIds ? JSON.parse(r.instanceIds) : [],
      linkedTicketIds: r.linkedTicketIds ? JSON.parse(r.linkedTicketIds) : [],
      linkedNoteIds: r.linkedNoteIds ? JSON.parse(r.linkedNoteIds) : [],
      linkedFolderIds: r.linkedFolderIds ? JSON.parse(r.linkedFolderIds) : [],
      linkedEventIds: r.linkedEventIds ? JSON.parse(r.linkedEventIds) : [],
      linkedReminderIds: r.linkedReminderIds ? JSON.parse(r.linkedReminderIds) : [],
      contactEmail: r.contactEmail || '',
      contactPhone: r.contactPhone || '',
      createdAt: r.createdAt || new Date().toISOString(),
      updatedAt: r.updatedAt || new Date().toISOString(),
    }));
  } catch (err) {
    console.error('[SQLite Error dbGetClients]:', err);
    return [];
  }
}

export async function dbSaveClient(client: Partial<ClientAsset> & { name: string }): Promise<ClientAsset> {
  const clients = await dbGetClients();
  const now = new Date().toISOString();
  const id = client.id || `client_${Date.now()}`;
  const existing = clients.find((c) => c.id === id);

  const cleanName = (client.name || existing?.name || 'Novo Cliente').trim();
  if (!cleanName) {
    throw new Error('O nome do cliente é obrigatório.');
  }

  const data: ClientAsset = {
    id,
    name: cleanName,
    description: client.description !== undefined ? client.description : (existing?.description || ''),
    status: client.status || existing?.status || 'ACTIVE',
    color: client.color || existing?.color || '#6366f1',
    icon: client.icon || existing?.icon || 'building',
    instanceIds: Array.isArray(client.instanceIds) ? client.instanceIds : (existing?.instanceIds || []),
    linkedTicketIds: Array.isArray(client.linkedTicketIds) ? client.linkedTicketIds : (existing?.linkedTicketIds || []),
    linkedNoteIds: Array.isArray(client.linkedNoteIds) ? client.linkedNoteIds : (existing?.linkedNoteIds || []),
    linkedFolderIds: Array.isArray(client.linkedFolderIds) ? client.linkedFolderIds : (existing?.linkedFolderIds || []),
    linkedEventIds: Array.isArray(client.linkedEventIds) ? client.linkedEventIds : (existing?.linkedEventIds || []),
    linkedReminderIds: Array.isArray(client.linkedReminderIds) ? client.linkedReminderIds : (existing?.linkedReminderIds || []),
    contactEmail: client.contactEmail !== undefined ? client.contactEmail : (existing?.contactEmail || ''),
    contactPhone: client.contactPhone !== undefined ? client.contactPhone : (existing?.contactPhone || ''),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (db) {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO client_assets (
          id, name, description, status, color, icon,
          instanceIds, linkedTicketIds, linkedNoteIds, linkedFolderIds,
          linkedEventIds, linkedReminderIds, contactEmail, contactPhone,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.id,
        data.name,
        data.description,
        data.status,
        data.color,
        data.icon,
        JSON.stringify(data.instanceIds || []),
        JSON.stringify(data.linkedTicketIds || []),
        JSON.stringify(data.linkedNoteIds || []),
        JSON.stringify(data.linkedFolderIds || []),
        JSON.stringify(data.linkedEventIds || []),
        JSON.stringify(data.linkedReminderIds || []),
        data.contactEmail,
        data.contactPhone,
        data.createdAt,
        data.updatedAt
      );
    } catch (err) {
      console.error('[SQLite Error dbSaveClient]:', err);
    }
  }

  // Also backup to store
  try {
    const updatedClients = clients.some((c) => c.id === id)
      ? clients.map((c) => (c.id === id ? data : c))
      : [...clients, data];
    store.set('client_assets_backup', updatedClients);
  } catch (e) {}

  return data;
}

export async function dbDeleteClient(id: string): Promise<boolean> {
  if (db) {
    try {
      db.prepare('DELETE FROM client_assets WHERE id = ?').run(id);
    } catch (err) {
      console.error('[SQLite Error dbDeleteClient]:', err);
    }
  }

  try {
    const clients = await dbGetClients();
    store.set('client_assets_backup', clients.filter((c) => c.id !== id));
  } catch (e) {}

  return true;
}

export async function dbCreateClientFromJiraInstance(instance: JiraInstance): Promise<ClientAsset> {
  const clients = await dbGetClients();
  const instDomain = (instance.domain || '').toLowerCase().trim();
  const instName = (instance.name || 'Jira Cloud').trim();

  // Check if client already exists for this instance
  const existing = clients.find((c) => 
    (c.instanceIds && c.instanceIds.includes(instance.id)) ||
    c.name.toLowerCase() === instName.toLowerCase() ||
    (c.description && instDomain && c.description.toLowerCase().includes(instDomain))
  );

  if (existing) {
    const updatedInstanceIds = Array.from(new Set([...(existing.instanceIds || []), instance.id]));
    return await dbSaveClient({
      ...existing,
      instanceIds: updatedInstanceIds,
    });
  }

  // Create new client asset
  return await dbSaveClient({
    name: instName,
    description: `Instância Jira Cloud conectada automaticamente via Atlassian OAuth (${instance.domain})`,
    status: 'ACTIVE',
    color: '#0052cc', // Atlassian Blue
    icon: 'building',
    instanceIds: [instance.id],
  });
}

