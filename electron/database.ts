import mongoose from 'mongoose';
import Store from 'electron-store';
import type { Ticket, JiraInstance, Reminder, NoteItem } from '../src/types/index';

const store = new Store();
let isMongoConnected = false;
let currentMongoUri = (store.get('mongodb_uri') as string) || 'mongodb://127.0.0.1:27017/simplify_work';

// === MONGOOSE SCHEMAS ===
const JiraInstanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  domain: { type: String, required: true },
  email: { type: String, required: true },
  apiToken: { type: String, required: true },
});

const CommentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    author: { type: String, default: 'Eu' },
    body: { type: String, default: '' },
    created: { type: String, required: true },
    isLocal: { type: Boolean, default: false },
  },
  { _id: false }
);

const TicketSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  key: { type: String, default: '' },
  source: { type: String, required: true, default: 'LOCAL' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, required: true, default: 'TO_DO' },
  statusLabel: { type: String, default: 'A Fazer' },
  color: { type: String, default: '#3b82f6' },
  labels: { type: [String], default: [] },
  comments: [CommentSchema],
  priority: { type: String, default: 'Normal' },
  assignee: { type: String, default: 'Eu' },
  reporter: { type: String, default: 'Eu' },
  startDate: { type: String, default: '' },
  dueDate: { type: String, default: '' },
  jiraInstanceId: { type: String, default: '' },
  linkedTicketIds: { type: [String], default: [] },
  linkedNoteIds: { type: [String], default: [] },
  updatedAt: { type: String, required: true },
  createdAt: { type: String, required: true },
});

const ReminderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  recurrence: { type: String, required: true, default: 'INTERVAL' },
  intervalMinutes: { type: Number, default: 45 },
  scheduledTime: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
  lastTriggered: { type: String, default: '' },
  createdAt: { type: String, required: true },
});

const NoteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  filePath: { type: String, required: true },
  updatedAt: { type: String, required: true },
  format: { type: String, default: 'markdown' },
});

const SavedJqlQuerySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  jql: { type: String, required: true },
  jiraInstanceId: { type: String, required: true },
  createdAt: { type: String, required: true },
});

// Explicit Collection Names
const JiraInstanceModel = mongoose.models.JiraInstance || mongoose.model('JiraInstance', JiraInstanceSchema, 'jira_instances');
const TicketModel = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema, 'tickets');
const ReminderModel = mongoose.models.Reminder || mongoose.model('Reminder', ReminderSchema, 'reminders');
const NoteModel = mongoose.models.Note || mongoose.model('Note', NoteSchema, 'notes');
const SavedJqlQueryModel = mongoose.models.SavedJqlQuery || mongoose.model('SavedJqlQuery', SavedJqlQuerySchema, 'saved_jql_queries');

export async function initDatabase(): Promise<boolean> {
  if (isMongoConnected && mongoose.connection.readyState === 1) return true;

  const storedUri = store.get('mongodb_uri') as string;
  const urisToTry = storedUri
    ? [storedUri, 'mongodb://127.0.0.1:27017/simplify_work', 'mongodb://localhost:27017/simplify_work']
    : ['mongodb://127.0.0.1:27017/simplify_work', 'mongodb://localhost:27017/simplify_work'];

  for (const uri of urisToTry) {
    try {
      console.log(`[MongoDB] Conectando a ${uri}...`);
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
        directConnection: true,
      });
      isMongoConnected = true;
      currentMongoUri = uri;
      store.set('mongodb_uri', uri);
      console.log(`[MongoDB Standalone] Conexão estabelecida com sucesso em ${uri}!`);
      return true;
    } catch (err) {
      console.warn(`[MongoDB] Não foi possível conectar a ${uri}`);
    }
  }

  isMongoConnected = false;
  return false;
}

export function getMongoStatus(): { connected: boolean; uri: string } {
  return {
    connected: isMongoConnected && mongoose.connection.readyState === 1,
    uri: currentMongoUri,
  };
}

export async function setMongoUri(newUri: string): Promise<boolean> {
  store.set('mongodb_uri', newUri);
  return await initDatabase();
}

// === JIRA INSTANCES ===
export async function dbGetJiraInstances(): Promise<JiraInstance[]> {
  try {
    if (isMongoConnected) {
      const docs = await JiraInstanceModel.find().lean();
      const list: JiraInstance[] = docs.map((d: any) => ({
        id: d.id,
        name: d.name,
        domain: d.domain,
        email: d.email,
        apiToken: d.apiToken,
      }));
      if (list && list.length > 0) store.set('jira_instances_backup', list);
      return list;
    }
  } catch (err) {
    console.error('[MongoDB Error dbGetJiraInstances]:', err);
  }
  return (store.get('jira_instances_backup') as JiraInstance[]) || [];
}

export async function dbSaveJiraInstance(instance: Omit<JiraInstance, 'id'> & { id?: string }): Promise<JiraInstance> {
  const id = instance.id || 'jira_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const data = { id, ...instance };

  try {
    if (isMongoConnected) {
      await JiraInstanceModel.findOneAndUpdate({ id }, data, { upsert: true, new: true });
    }
  } catch (err) {
    console.error('[MongoDB Error dbSaveJiraInstance]:', err);
  }

  // Dual store backup
  try {
    const current = (store.get('jira_instances_backup') as JiraInstance[]) || [];
    const exists = current.some((i) => i.id === id);
    const updatedList = exists ? current.map((i) => (i.id === id ? data : i)) : [data, ...current];
    store.set('jira_instances_backup', updatedList);
  } catch (e) {}

  return data;
}

export async function dbDeleteJiraInstance(id: string): Promise<boolean> {
  try {
    if (isMongoConnected) {
      await JiraInstanceModel.deleteOne({ id });
    }
  } catch (err) {
    console.error('[MongoDB Error dbDeleteJiraInstance]:', err);
  }

  try {
    const current = (store.get('jira_instances_backup') as JiraInstance[]) || [];
    store.set('jira_instances_backup', current.filter((i) => i.id !== id));
  } catch (e) {}

  return true;
}

// === SAVED JQL QUERIES ===
export async function dbGetSavedJqlQueries(): Promise<any[]> {
  try {
    if (isMongoConnected) {
      const docs = await SavedJqlQueryModel.find().sort({ createdAt: -1 }).lean();
      const list = docs.map((d: any) => ({
        id: d.id,
        name: d.name,
        jql: d.jql,
        jiraInstanceId: d.jiraInstanceId,
        createdAt: d.createdAt,
      }));
      if (list && list.length > 0) store.set('saved_jql_queries_backup', list);
      return list;
    }
  } catch (err) {
    console.error('[MongoDB Error dbGetSavedJqlQueries]:', err);
  }
  return (store.get('saved_jql_queries_backup') as any[]) || [];
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

  try {
    if (isMongoConnected) {
      await SavedJqlQueryModel.findOneAndUpdate({ id }, data, { upsert: true, new: true });
    }
  } catch (err) {
    console.error('[MongoDB Error dbSaveJqlQuery]:', err);
  }

  try {
    const current = (store.get('saved_jql_queries_backup') as any[]) || [];
    const exists = current.some((q) => q.id === id);
    const updatedList = exists ? current.map((q) => (q.id === id ? data : q)) : [data, ...current];
    store.set('saved_jql_queries_backup', updatedList);
  } catch (e) {}

  return data;
}

export async function dbDeleteJqlQuery(id: string): Promise<boolean> {
  try {
    if (isMongoConnected) {
      await SavedJqlQueryModel.deleteOne({ id });
    }
  } catch (err) {
    console.error('[MongoDB Error dbDeleteJqlQuery]:', err);
  }

  try {
    const current = (store.get('saved_jql_queries_backup') as any[]) || [];
    store.set('saved_jql_queries_backup', current.filter((q) => q.id !== id));
  } catch (e) {}

  return true;
}

// === TICKETS ===
export async function dbGetTickets(): Promise<Ticket[]> {
  try {
    if (isMongoConnected) {
      const docs = await TicketModel.find().sort({ createdAt: -1 }).lean();

      // Find highest existing numerical key for local tickets
      let highestKeyNum = 0;
      docs.forEach((d: any) => {
        if (d.source === 'LOCAL' && d.key) {
          const match = String(d.key).match(/^TASK-(\d+)$/i);
          if (match && match[1]) {
            const n = parseInt(match[1], 10);
            if (!isNaN(n) && n > highestKeyNum) highestKeyNum = n;
          }
        }
      });

      // Backfill missing keys for local tickets chronologically
      const sortedLocalDocs = docs
        .filter((d: any) => d.source === 'LOCAL' && !d.key)
        .sort((a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

      const assignedKeysMap = new Map<string, string>();
      sortedLocalDocs.forEach((d: any) => {
        highestKeyNum++;
        const newKey = `TASK-${highestKeyNum}`;
        assignedKeysMap.set(d.id, newKey);
        TicketModel.updateOne({ id: d.id }, { key: newKey }).exec().catch(() => {});
      });

      const list: Ticket[] = docs.map((d: any) => {
        let key = d.key || '';
        if (d.source === 'LOCAL' && !key) {
          key = assignedKeysMap.get(d.id) || 'TASK-1';
        }

        return {
          id: d.id,
          key,
          source: d.source,
          title: d.title,
          description: d.description,
          status: d.status,
          statusLabel: d.statusLabel,
          color: d.color,
          labels: d.labels || [],
          comments: d.comments || [],
          priority: d.priority,
          assignee: d.assignee,
          reporter: d.reporter,
          startDate: d.startDate,
          dueDate: d.dueDate,
          jiraInstanceId: d.jiraInstanceId,
          linkedTicketIds: d.linkedTicketIds || [],
          linkedNoteIds: d.linkedNoteIds || [],
          updatedAt: d.updatedAt,
          createdAt: d.createdAt,
        };
      });

      if (list && list.length > 0) store.set('tickets_backup', list);
      return list;
    }
  } catch (err) {
    console.error('[MongoDB Error dbGetTickets]:', err);
  }

  const backupList = (store.get('tickets_backup') as Ticket[]) || [];
  let maxBackupNum = 0;
  backupList.forEach((t) => {
    if (t.source === 'LOCAL' && t.key) {
      const match = String(t.key).match(/^TASK-(\d+)$/i);
      if (match && match[1]) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxBackupNum) maxBackupNum = n;
      }
    }
  });

  return backupList.map((t) => {
    if (t.source === 'LOCAL' && !t.key) {
      maxBackupNum++;
      return { ...t, key: `TASK-${maxBackupNum}` };
    }
    return t;
  });
}

export async function dbSaveTicket(ticket: Partial<Ticket>): Promise<Ticket> {
  const id = ticket.id || 'tck_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const now = new Date().toISOString();

  // Auto-generate TASK-N key for LOCAL tickets if key is missing
  let generatedKey = ticket.key || '';
  if (ticket.source === 'LOCAL' && !generatedKey) {
    try {
      let localTickets: Ticket[] = [];
      if (isMongoConnected) {
        const docs = await TicketModel.find({ source: 'LOCAL' }).lean();
        localTickets = docs as any[];
      }
      if (localTickets.length === 0) {
        const backup = (store.get('tickets_backup') as Ticket[]) || [];
        localTickets = backup.filter((t) => t.source === 'LOCAL');
      }

      let maxNum = 0;
      localTickets.forEach((t) => {
        if (t.key) {
          const match = String(t.key).match(/^TASK-(\d+)$/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        }
      });
      generatedKey = `TASK-${maxNum + 1}`;
    } catch (e) {
      generatedKey = 'TASK-1';
    }
  }

  // Preserve existing linkedTicketIds and linkedNoteIds if not explicitly provided in partial update
  let existingLinkedIds: string[] = [];
  let existingLinkedNoteIds: string[] = [];
  try {
    if (isMongoConnected) {
      const existingDoc = await TicketModel.findOne({ id }).lean();
      if (existingDoc) {
        if (Array.isArray((existingDoc as any).linkedTicketIds)) {
          existingLinkedIds = (existingDoc as any).linkedTicketIds;
        }
        if (Array.isArray((existingDoc as any).linkedNoteIds)) {
          existingLinkedNoteIds = (existingDoc as any).linkedNoteIds;
        }
      }
    }
  } catch (e) {}

  if (existingLinkedIds.length === 0 || existingLinkedNoteIds.length === 0) {
    try {
      const currentBackup = (store.get('tickets_backup') as Ticket[]) || [];
      const foundBackup = currentBackup.find((t) => t.id === id);
      if (foundBackup) {
        if (existingLinkedIds.length === 0 && Array.isArray(foundBackup.linkedTicketIds)) {
          existingLinkedIds = foundBackup.linkedTicketIds;
        }
        if (existingLinkedNoteIds.length === 0 && Array.isArray(foundBackup.linkedNoteIds)) {
          existingLinkedNoteIds = foundBackup.linkedNoteIds;
        }
      }
    } catch (e) {}
  }

  const finalLinkedIds = ticket.linkedTicketIds !== undefined
    ? ticket.linkedTicketIds
    : existingLinkedIds;

  const finalLinkedNoteIds = ticket.linkedNoteIds !== undefined
    ? ticket.linkedNoteIds
    : existingLinkedNoteIds;

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
    source: ticket.source || 'LOCAL',
    title: ticket.title || 'Sem Título',
    description: ticket.description || '',
    status: ticket.status || 'TO_DO',
    statusLabel: ticket.statusLabel || ticket.status || 'A Fazer',
    color: ticket.color || '#3b82f6',
    labels: ticket.labels || [],
    comments: sanitizedComments,
    priority: ticket.priority || 'Normal',
    assignee: ticket.assignee || 'Eu',
    reporter: ticket.reporter || 'Eu',
    startDate: ticket.startDate || '',
    dueDate: ticket.dueDate || '',
    jiraInstanceId: ticket.jiraInstanceId || '',
    linkedTicketIds: finalLinkedIds,
    linkedNoteIds: finalLinkedNoteIds,
    updatedAt: now,
    createdAt: ticket.createdAt || now,
  };

  try {
    if (isMongoConnected) {
      await TicketModel.findOneAndUpdate({ id }, data, { upsert: true, returnDocument: 'after' });
    }
  } catch (err) {
    console.error('[MongoDB Error dbSaveTicket]:', err);
  }

  try {
    const current = (store.get('tickets_backup') as Ticket[]) || [];
    const exists = current.some((t) => t.id === id);
    const updatedList = exists ? current.map((t) => (t.id === id ? data : t)) : [data, ...current];
    store.set('tickets_backup', updatedList);
  } catch (e) {}

  return data;
}

export async function dbDeleteTicket(id: string): Promise<boolean> {
  try {
    if (isMongoConnected) {
      await TicketModel.deleteOne({ id });
    }
  } catch (err) {
    console.error('[MongoDB Error dbDeleteTicket]:', err);
  }

  try {
    const current = (store.get('tickets_backup') as Ticket[]) || [];
    store.set('tickets_backup', current.filter((t) => t.id !== id));
  } catch (e) {}

  return true;
}

// === REMINDERS ===
export async function dbGetReminders(): Promise<Reminder[]> {
  try {
    if (isMongoConnected) {
      const docs = await ReminderModel.find().sort({ createdAt: -1 }).lean();
      const list: Reminder[] = docs.map((d: any) => ({
        id: d.id,
        title: d.title,
        message: d.message,
        recurrence: d.recurrence,
        intervalMinutes: d.intervalMinutes,
        scheduledTime: d.scheduledTime,
        enabled: Boolean(d.enabled),
        lastTriggered: d.lastTriggered,
        createdAt: d.createdAt,
      }));
      if (list && list.length > 0) store.set('reminders_backup', list);
      return list;
    }
  } catch (err) {
    console.error('[MongoDB Error dbGetReminders]:', err);
  }
  return (store.get('reminders_backup') as Reminder[]) || [];
}

export async function dbSaveReminder(reminder: Partial<Reminder>): Promise<Reminder> {
  const id = reminder.id || 'rem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const now = new Date().toISOString();
  const initialLastTriggered = reminder.lastTriggered !== undefined ? reminder.lastTriggered : '';

  const data: Reminder = {
    id,
    title: reminder.title || 'Novo Lembrete',
    message: reminder.message || '',
    recurrence: reminder.recurrence || 'INTERVAL',
    intervalMinutes: reminder.intervalMinutes !== undefined ? Number(reminder.intervalMinutes) : 60,
    scheduledTime: reminder.scheduledTime !== undefined ? reminder.scheduledTime : '',
    enabled: reminder.enabled !== undefined ? Boolean(reminder.enabled) : true,
    lastTriggered: initialLastTriggered,
    createdAt: reminder.createdAt || now,
  };

  try {
    if (isMongoConnected) {
      await ReminderModel.findOneAndUpdate({ id }, data, { upsert: true, new: true });
    }
  } catch (err) {
    console.error('[MongoDB Error dbSaveReminder]:', err);
  }

  try {
    const current = (store.get('reminders_backup') as Reminder[]) || [];
    const exists = current.some((r) => r.id === id);
    const updatedList = exists ? current.map((r) => (r.id === id ? data : r)) : [data, ...current];
    store.set('reminders_backup', updatedList);
  } catch (e) {}

  return data;
}

export async function dbDeleteReminder(id: string): Promise<boolean> {
  try {
    if (isMongoConnected) {
      await ReminderModel.deleteOne({ id });
    }
  } catch (err) {
    console.error('[MongoDB Error dbDeleteReminder]:', err);
  }

  try {
    const current = (store.get('reminders_backup') as Reminder[]) || [];
    store.set('reminders_backup', current.filter((r) => r.id !== id));
  } catch (e) {}

  return true;
}

// === NOTES ===
export async function dbGetNotes(): Promise<NoteItem[]> {
  try {
    if (isMongoConnected) {
      const docs = await NoteModel.find().sort({ updatedAt: -1 }).lean();
      const rawList: NoteItem[] = docs.map((d: any) => ({
        id: d.id,
        title: d.title,
        filePath: d.filePath,
        updatedAt: d.updatedAt,
      }));

      // Deduplicate by filePath so each physical file appears exactly once
      const uniqueMap = new Map<string, NoteItem>();
      rawList.forEach((item) => {
        if (!uniqueMap.has(item.filePath)) {
          uniqueMap.set(item.filePath, item);
        }
      });
      const list = Array.from(uniqueMap.values());

      if (list && list.length > 0) store.set('notes_backup', list);
      return list;
    }
  } catch (err) {
    console.error('[MongoDB Error dbGetNotes]:', err);
  }
  const backup = (store.get('notes_backup') as NoteItem[]) || [];
  const uniqueMap = new Map<string, NoteItem>();
  backup.forEach((item) => {
    if (!uniqueMap.has(item.filePath)) {
      uniqueMap.set(item.filePath, item);
    }
  });
  return Array.from(uniqueMap.values());
}

export async function dbSaveNoteMeta(note: Partial<NoteItem>): Promise<NoteItem> {
  let id = note.id;

  // If no ID is passed, search by filePath to preserve existing record ID
  if (!id && note.filePath) {
    try {
      if (isMongoConnected) {
        const existingDoc = await NoteModel.findOne({ filePath: note.filePath }).lean();
        if (existingDoc) {
          id = (existingDoc as any).id;
        }
      }
    } catch (e) {}

    if (!id) {
      const backup = (store.get('notes_backup') as NoteItem[]) || [];
      const match = backup.find((n) => n.filePath === note.filePath);
      if (match) id = match.id;
    }
  }

  if (!id) {
    id = 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  const now = new Date().toISOString();
  const data: NoteItem = {
    id,
    title: note.title || 'Nova Anotação',
    filePath: note.filePath || '',
    updatedAt: now,
    format: note.format || 'markdown',
  };

  try {
    if (isMongoConnected) {
      await NoteModel.findOneAndUpdate({ filePath: note.filePath }, data, { upsert: true, new: true });
    }
  } catch (err) {
    console.error('[MongoDB Error dbSaveNoteMeta]:', err);
  }

  try {
    const current = (store.get('notes_backup') as NoteItem[]) || [];
    const exists = current.some((n) => n.filePath === note.filePath || n.id === id);
    const updatedList = exists
      ? current.map((n) => (n.filePath === note.filePath || n.id === id ? data : n))
      : [data, ...current];

    // Deduplicate backup list
    const uniqueMap = new Map<string, NoteItem>();
    updatedList.forEach((item) => {
      if (!uniqueMap.has(item.filePath)) {
        uniqueMap.set(item.filePath, item);
      }
    });
    store.set('notes_backup', Array.from(uniqueMap.values()));
  } catch (e) {}

  return data;
}

export async function dbDeleteNoteMeta(id: string): Promise<boolean> {
  try {
    if (isMongoConnected) {
      await NoteModel.deleteOne({ id });
    }
  } catch (err) {
    console.error('[MongoDB Error dbDeleteNoteMeta]:', err);
  }

  try {
    const current = (store.get('notes_backup') as NoteItem[]) || [];
    store.set('notes_backup', current.filter((n) => n.id !== id));
  } catch (e) {}

  return true;
}
