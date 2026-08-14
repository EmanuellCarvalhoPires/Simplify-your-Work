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
  authType?: 'API_TOKEN' | 'OAUTH';
  accessToken?: string;
  refreshToken?: string;
  cloudId?: string;
  avatarUrl?: string;
}

export type ReminderRecurrence = 'ONCE' | 'DAILY' | 'INTERVAL';

export interface Reminder {
  id: string;
  eventId?: string;
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
  format?: 'markdown' | 'richtext' | 'file';
  fileType?: 'pdf' | 'docx' | 'xlsx' | 'xls' | 'csv' | 'image' | 'text' | 'other';
  originalFileName?: string;
  fileSize?: number;
  mimeType?: string;
  fileDataB64?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
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

export const DEFAULT_THEME: ThemeConfig = {
  presetName: 'Dark Slate (Padrão)',
  bgMain: '#181825',
  bgSidebar: '#1e1e2e',
  bgHeader: '#1e1e2e',
  bgCardJira: '#1e293b',
  bgCardApp: '#27273a',
  accentPrimary: '#6366f1',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
};

export interface SavedJqlQuery {
  id: string;
  name: string;
  jql: string;
  jiraInstanceId: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatarColor?: string;
  themeConfig: ThemeConfig;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthUserInfo {
  account_id?: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface ElectronAPI {
  getMongoStatus: () => Promise<{ connected: boolean; uri: string }>;
  setMongoUri: (uri: string) => Promise<boolean>;

  getJiraInstances: () => Promise<JiraInstance[]>;
  saveJiraInstance: (instance: Omit<JiraInstance, 'id'> & { id?: string }) => Promise<JiraInstance>;
  deleteJiraInstance: (id: string) => Promise<boolean>;
  fetchJiraTicket: (ticketKey: string, instanceId: string) => Promise<Ticket>;
  fetchJiraTicketsByJql: (
    jqlOrLink: string,
    instanceId: string
  ) => Promise<{
    tickets: Ticket[];
    newCount: number;
    updatedCount?: number;
    existingCount: number;
    existingKeys: string[];
  }>;

  getAtlassianClientId: () => Promise<string>;
  saveAtlassianClientId: (clientId: string) => Promise<boolean>;
  getAtlassianClientSecret: () => Promise<string>;
  saveAtlassianClientSecret: (clientSecret: string) => Promise<boolean>;
  getAtlassianProxyUrl: () => Promise<string>;
  saveAtlassianProxyUrl: (proxyUrl: string) => Promise<boolean>;
  startAtlassianOAuth: (customClientId?: string, customClientSecret?: string, customProxyUrl?: string) => Promise<{
    sites: Array<{ id: string; name: string; url: string; avatarUrl?: string; scopes?: string[] }>;
    accessToken: string;
    refreshToken: string;
    userInfo?: OAuthUserInfo;
  }>;
  cancelAtlassianOAuth: () => Promise<boolean>;

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

  getUsers: () => Promise<UserProfile[]>;
  getActiveUser: () => Promise<UserProfile | null>;
  setActiveUser: (id: string) => Promise<UserProfile | null>;
  saveUser: (user: Partial<UserProfile>) => Promise<UserProfile>;
  deleteUser: (id: string) => Promise<boolean>;

  openExternal: (url: string) => Promise<boolean>;
  getLegalDocs: () => Promise<{ termsContent: string; privacyContent: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
