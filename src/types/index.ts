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
  isInternal?: boolean;
}

export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'PROSPECT' | 'ARCHIVED';

export interface ClientAsset {
  id: string;
  name: string;
  description?: string;
  status: ClientStatus;
  color?: string;
  icon?: string;
  instanceIds?: string[];
  linkedTicketIds?: string[];
  linkedNoteIds?: string[];
  linkedFolderIds?: string[];
  linkedEventIds?: string[];
  linkedReminderIds?: string[];
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  key?: string;
  source: TicketSource;
  title: string;
  description: string;
  status: TicketStatus;
  statusLabel?: string;
  jiraStatus?: string;
  color?: string;
  labels: string[];
  comments: JiraComment[];
  priority?: string;
  assignee?: string;
  reporter?: string;
  startDate?: string;
  dueDate?: string;
  jiraInstanceId?: string;
  clientId?: string;
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
  clientId?: string;
  createdAt: string;
}

export interface NotificationSettings {
  muteInTeamsMeetings: boolean;
  muteInCalendarMeetings: boolean;
  postponeMutedReminders: boolean;
}

export interface MeetingStatus {
  inMeeting: boolean;
  reason?: string;
  source?: 'windows_process' | 'calendar_event' | 'none';
  meetingTitle?: string;
  detectedAt: string;
}

export type ActiveAiProvider = 'chatgpt' | 'claude' | 'gemini';
export type AiProvider = 'none' | ActiveAiProvider;

export interface AiAssistantConfig {
  enabledProviders: ActiveAiProvider[];
  // Compatibilidade legada
  provider?: AiProvider;
  customUrl?: string;
}

export interface AiProviderInfo {
  id: ActiveAiProvider;
  name: string;
  url: string;
  description: string;
  company: string;
  color: string;
}

export const AI_PROVIDERS: Record<ActiveAiProvider, AiProviderInfo> = {
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    description: 'Assistente conversacional da OpenAI com modelos GPT-4o e raciocínio avançado.',
    company: 'OpenAI',
    color: '#10a37f',
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai',
    description: 'IA da Anthropic com ampla janela de contexto, análise documental e codificação precisa.',
    company: 'Anthropic',
    color: '#d97706',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com',
    description: 'IA multimodal do Google com integração a ferramentas, buscas e workspace.',
    company: 'Google',
    color: '#3b82f6',
  },
};

export const DEFAULT_AI_CONFIG: AiAssistantConfig = {
  enabledProviders: ['gemini'],
};

export interface CustomSite {
  id: string;
  title: string;
  url: string;
  icon?: string;
  color?: string;
  partition?: string;
  createdAt: string;
}

export type NavTab =
  | 'tickets'
  | 'calendar'
  | 'notes'
  | 'clients'
  | 'reminders'
  | 'teams'
  | 'outlook'
  | 'ai_chatgpt'
  | 'ai_claude'
  | 'ai_gemini'
  | 'settings'
  | (string & {});

export interface SidebarGroupEntry {
  type: 'group';
  id: string;
  title: string;
  itemIds: NavTab[];
}

export interface SidebarItemEntry {
  type: 'item';
  id: NavTab;
}

export type SidebarEntry = SidebarItemEntry | SidebarGroupEntry;

export interface SidebarConfig {
  entries: SidebarEntry[];
}

export interface NoteFolder {
  id: string;
  name: string;
  color?: string;
  parentId?: string;
  clientId?: string;
  isArchived?: boolean;
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
  folderId?: string;
  clientId?: string;
  isArchived?: boolean;
}

export interface CalendarFeed {
  id: string;
  name: string;
  url: string;
  type: 'outlook' | 'google' | 'custom';
  color: string;
  enabled: boolean;
  lastSynced?: string;
  eventCount?: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  calendarId?: string;
  calendarName?: string;
  color?: string;
  allDay?: boolean;
  clientId?: string;
  linkedNoteIds?: string[];
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

export interface DatabaseStats {
  engine: string;
  filePath: string;
  fileSize: string;
  isHealthy: boolean;
  tableCounts: {
    tickets: number;
    notes: number;
    reminders: number;
    jiraInstances: number;
    savedJqlQueries: number;
    users: number;
  };
}

export interface ElectronAPI {
  getDatabaseStats: () => Promise<any | null>;
  openDatabaseFolder: () => Promise<boolean>;
  exportDatabaseBackup: () => Promise<boolean>;

  getMongoStatus: () => Promise<{ connected: boolean; uri: string }>;
  setMongoUri: (uri: string) => Promise<boolean>;

  // Clients / Assets (JSM Style)
  getClients: () => Promise<ClientAsset[]>;
  saveClient: (client: Partial<ClientAsset> & { name: string }) => Promise<ClientAsset>;
  deleteClient: (id: string) => Promise<boolean>;

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
  addJiraComment: (params: {
    ticketId: string;
    ticketKey: string;
    instanceId?: string;
    commentBody: string;
  }) => Promise<{ success: boolean; comment: JiraComment; ticket?: Ticket }>;

  getSavedJqlQueries: () => Promise<SavedJqlQuery[]>;
  saveJqlQuery: (query: Omit<SavedJqlQuery, 'id' | 'createdAt'> & { id?: string }) => Promise<SavedJqlQuery>;
  deleteJqlQuery: (id: string) => Promise<boolean>;

  getTickets: () => Promise<Ticket[]>;
  saveTicket: (ticket: Partial<Ticket>): Promise<Ticket>;
  deleteTicket: (id: string) => Promise<boolean>;
  deleteTickets: (ids: string[]) => Promise<boolean>;
  updateTicketStatuses: (ids: string[], status: TicketStatus, statusLabel?: string) => Promise<boolean>;

  getReminders: () => Promise<Reminder[]>;
  saveReminder: (reminder: Partial<Reminder>) => Promise<Reminder>;
  deleteReminder: (id: string) => Promise<boolean>;
  testReminder: (reminder: Partial<Reminder>) => Promise<boolean>;
  getNotificationSettings: () => Promise<NotificationSettings>;
  saveNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<NotificationSettings>;
  checkMeetingStatus: (forceRefresh?: boolean) => Promise<MeetingStatus>;

  getNotes: () => Promise<NoteItem[]>;
  readNoteContent: (filePath: string) => Promise<string>;
  saveNoteContent: (filePath: string, title: string, content: string) => Promise<NoteItem>;
  createNote: (title: string, folderId?: string) => Promise<NoteItem>;
  createRichNote: (title: string, folderId?: string) => Promise<NoteItem>;
  saveFileNote: (fileData: { title: string; fileName: string; mimeType: string; base64: string; size: number; folderId?: string }) => Promise<NoteItem>;
  updateNoteMeta: (note: Partial<NoteItem> & { id: string }) => Promise<NoteItem>;
  deleteNote: (id: string) => Promise<boolean>;
  exportNoteAsTxt: (content: string, defaultFileName: string) => Promise<boolean>;
  saveNoteImage: (base64Data: string, ext: string) => Promise<string>;
  getNoteFolders: () => Promise<NoteFolder[]>;
  saveNoteFolder: (folder: Partial<NoteFolder> & { name: string }) => Promise<NoteFolder>;
  deleteNoteFolder: (id: string, deleteContents?: boolean) => Promise<boolean>;
  openNoteFolder: (folderId?: string) => Promise<boolean>;

  // File Viewer & Picker
  readLocalFile: (filePath: string) => Promise<{ mimeType: string; base64: string; text?: string; fileName: string; size: number }>;
  pickLocalFile: () => Promise<{ filePath: string; fileName: string; mimeType: string; base64: string; size: number } | null>;

  getThemeSettings: () => Promise<ThemeConfig>;
  saveThemeSettings: (theme: ThemeConfig) => Promise<boolean>;

  getUsers: () => Promise<UserProfile[]>;
  getActiveUser: () => Promise<UserProfile | null>;
  setActiveUser: (id: string) => Promise<UserProfile | null>;
  saveUser: (user: Partial<UserProfile>) => Promise<UserProfile>;
  deleteUser: (id: string) => Promise<boolean>;

  // Auto Updater
  getUpdateStatus: () => Promise<{
    state: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
    version?: string;
    releaseDate?: string;
    releaseNotes?: string;
    progress?: number;
    bytesPerSecond?: number;
    transferred?: number;
    total?: number;
    errorMessage?: string;
  }>;
  checkForUpdates: () => Promise<any>;
  downloadUpdate: () => Promise<any>;
  quitAndInstallUpdate: () => Promise<void>;
  onUpdateStatus: (callback: (status: any) => void) => () => void;

  // Calendar / ICS
  getCalendarFeeds: () => Promise<CalendarFeed[]>;
  saveCalendarFeed: (feed: Partial<CalendarFeed> & { id: string }) => Promise<CalendarFeed[]>;
  deleteCalendarFeed: (id: string) => Promise<CalendarFeed[]>;
  syncCalendar: (customUrl?: string, feedId?: string) => Promise<{ events: CalendarEvent[]; remindersCreated: number; feedResults?: Array<{ id: string; success: boolean; count: number; error?: string }> }>;
  getCalendarEvents: () => Promise<CalendarEvent[]>;
  getCalendarUrl: () => Promise<string>;
  setCalendarUrl: (url: string) => Promise<boolean>;
  saveEventMetadata: (eventId: string, meta: any) => Promise<any>;
  toggleLinkNoteToEvent: (eventId: string, noteId: string) => Promise<string[]>;
  getEventMetadataMap: () => Promise<Record<string, any>>;

  showNotification: (notification: { title: string; body: string }) => Promise<boolean>;
  openExternal: (url: string) => Promise<boolean>;
  showItemInFolder: (filePath: string) => Promise<boolean>;
  getLegalDocs: () => Promise<{ termsContent: string; privacyContent: string }>;
  openGoogleAuthWindow: (provider: string, serviceUrl?: string) => Promise<{ success: boolean; url?: string; closedByUser?: boolean }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
