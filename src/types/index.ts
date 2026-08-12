export type TicketSource = 'JIRA' | 'LOCAL';

export type TicketStatus =
  | 'IN_PROGRESS'
  | 'NEXT'
  | 'TO_DO'
  | 'WAITING_CLIENT'
  | 'BACKLOG'
  | 'DONE';

export interface JiraComment {
  id: string;
  author: string;
  body: string;
  created: string;
  isLocal?: boolean;
}

export interface Ticket {
  id: string;
  key?: string;
  source: TicketSource;
  title: string;
  description: string;
  status: TicketStatus;
  statusLabel?: string;
  color?: string;
  labels: string[];
  comments: JiraComment[];
  priority?: string;
  assignee?: string;
  reporter?: string;
  startDate?: string;
  dueDate?: string;
  jiraInstanceId?: string;
  linkedTicketIds?: string[];
  linkedNoteIds?: string[];
  updatedAt: string;
  createdAt: string;
}

export interface JiraInstance {
  id: string;
  name: string;
  domain: string;
  email: string;
  apiToken: string;
}

export type ReminderRecurrence = 'ONCE' | 'DAILY' | 'INTERVAL';

export interface Reminder {
  id: string;
  title: string;
  message: string;
  recurrence: ReminderRecurrence;
  intervalMinutes?: number;
  scheduledTime?: string;
  enabled: boolean;
  lastTriggered?: string;
  createdAt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  filePath: string;
  updatedAt: string;
  format?: 'markdown' | 'richtext';
}

export interface ThemeConfig {
  presetName: string;
  bgMain: string;
  bgSidebar: string;
  bgHeader: string;
  bgCardJira: string;
  bgCardApp: string;
  accentPrimary: string;
  textPrimary: string;
  textSecondary: string;
}

export interface SavedJqlQuery {
  id: string;
  name: string;
  jql: string;
  jiraInstanceId: string;
  createdAt: string;
}

export interface ElectronAPI {
  getMongoStatus: () => Promise<{ connected: boolean; uri: string }>;
  setMongoUri: (uri: string) => Promise<boolean>;

  getJiraInstances: () => Promise<JiraInstance[]>;
  saveJiraInstance: (instance: Omit<JiraInstance, 'id'> & { id?: string }) => Promise<JiraInstance>;
  deleteJiraInstance: (id: string) => Promise<boolean>;
  fetchJiraTicket: (ticketKey: string, instanceId: string) => Promise<Ticket>;
  fetchJiraTicketsByJql: (jqlOrLink: string, instanceId: string) => Promise<{ tickets: Ticket[]; newCount: number; updatedCount: number }>;

  getSavedJqlQueries: () => Promise<SavedJqlQuery[]>;
  saveJqlQuery: (query: Omit<SavedJqlQuery, 'id' | 'createdAt'> & { id?: string }) => Promise<SavedJqlQuery>;
  deleteJqlQuery: (id: string) => Promise<boolean>;

  getTickets: () => Promise<Ticket[]>;
  saveTicket: (ticket: Partial<Ticket>): Promise<Ticket>;
  deleteTicket: (id: string) => Promise<boolean>;

  getReminders: () => Promise<Reminder[]>;
  saveReminder: (reminder: Partial<Reminder>) => Promise<Reminder>;
  deleteReminder: (id: string) => Promise<boolean>;
  testReminder: (reminder: Partial<Reminder>) => Promise<boolean>;

  getNotes: () => Promise<NoteItem[]>;
  readNoteContent: (filePath: string) => Promise<string>;
  saveNoteContent: (filePath: string, title: string, content: string) => Promise<NoteItem>;
  createNote: (title: string) => Promise<NoteItem>;
  createRichNote: (title: string) => Promise<NoteItem>;
  deleteNote: (id: string) => Promise<boolean>;
  exportNoteAsTxt: (content: string, defaultFileName: string) => Promise<boolean>;
  saveNoteImage: (base64Data: string, ext: string) => Promise<string>;

  getThemeSettings: () => Promise<ThemeConfig>;
  saveThemeSettings: (theme: ThemeConfig) => Promise<boolean>;

  openExternal: (url: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
