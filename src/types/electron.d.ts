import type { JiraInstance, Ticket, Reminder, NoteItem, ThemeConfig, CalendarEvent, CalendarFeed, UserProfile, ClientAsset } from './index';

export interface AccessibleJiraSite {
  id: string;
  name: string;
  url: string;
  avatarUrl?: string;
  scopes?: string[];
}

export interface OAuthUserInfo {
  account_id?: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface ElectronAPI {
  // Database (SQLite)
  getDatabaseStats: () => Promise<any | null>;
  openDatabaseFolder: () => Promise<boolean>;
  exportDatabaseBackup: () => Promise<boolean>;

  // MongoDB Status (Compatibility)
  getMongoStatus: () => Promise<{ connected: boolean; uri: string }>;
  setMongoUri: (uri: string) => Promise<boolean>;

  // Clients / Assets (JSM Style)
  getClients: () => Promise<ClientAsset[]>;
  saveClient: (client: Partial<ClientAsset> & { name: string }) => Promise<ClientAsset>;
  deleteClient: (id: string) => Promise<boolean>;

  // Jira Credentials
  getJiraInstances: () => Promise<JiraInstance[]>;
  saveJiraInstance: (instance: Partial<JiraInstance>) => Promise<JiraInstance>;
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
    sites: AccessibleJiraSite[];
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
  }) => Promise<{ success: boolean; comment: any; ticket?: Ticket }>;

  // Saved JQL Queries
  getSavedJqlQueries: () => Promise<any[]>;
  saveJqlQuery: (query: any) => Promise<any>;
  deleteJqlQuery: (id: string) => Promise<boolean>;

  // Tickets
  getTickets: () => Promise<Ticket[]>;
  saveTicket: (ticket: Partial<Ticket>) => Promise<Ticket>;
  deleteTicket: (id: string) => Promise<boolean>;
  deleteTickets: (ids: string[]) => Promise<boolean>;
  updateTicketStatuses: (ids: string[], status: any, statusLabel?: string) => Promise<boolean>;

  // Reminders & Notifications
  getReminders: () => Promise<Reminder[]>;
  saveReminder: (reminder: Partial<Reminder>) => Promise<Reminder>;
  deleteReminder: (id: string) => Promise<boolean>;
  testReminder: (reminder: Partial<Reminder>) => Promise<boolean>;
  getNotificationSettings: () => Promise<any>;
  saveNotificationSettings: (settings: any) => Promise<any>;
  checkMeetingStatus: (forceRefresh?: boolean) => Promise<any>;

  // Notes
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
  getNoteFolders: () => Promise<any[]>;
  saveNoteFolder: (folder: any) => Promise<any>;
  deleteNoteFolder: (id: string, deleteContents?: boolean) => Promise<boolean>;
  openNoteFolder: (folderId?: string) => Promise<boolean>;

  // File Viewer & Picker
  readLocalFile: (filePath: string) => Promise<{ mimeType: string; base64: string; text?: string; fileName: string; size: number }>;
  pickLocalFile: () => Promise<{ filePath: string; fileName: string; mimeType: string; base64: string; size: number } | null>;

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

  // Theme Settings
  getThemeSettings: () => Promise<ThemeConfig>;
  saveThemeSettings: (theme: ThemeConfig) => Promise<boolean>;

  // User Profiles
  getUsers: () => Promise<UserProfile[]>;
  getActiveUser: () => Promise<UserProfile | null>;
  setActiveUser: (id: string) => Promise<UserProfile | null>;
  saveUser: (user: Partial<UserProfile>) => Promise<UserProfile>;
  deleteUser: (id: string) => Promise<boolean>;

  // App Info & Version
  getAppVersion: () => Promise<string>;

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

  showNotification: (notification: { title: string; body: string }) => Promise<boolean>;
  openExternal: (url: string) => Promise<boolean>;
  showItemInFolder: (filePath: string) => Promise<boolean>;
  getLegalDocs: () => Promise<{ termsContent: string; privacyContent: string }>;
  openGoogleAuthWindow: (provider: string, serviceUrl?: string) => Promise<{ success: boolean; url?: string; closedByUser?: boolean }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        partition?: string;
        allowpopups?: string | boolean;
        webpreferences?: string;
        useragent?: string;
        autosize?: string | boolean;
        nodeintegration?: string | boolean;
        plugins?: string | boolean;
        disablewebsecurity?: string | boolean;
        httpreferrer?: string;
        style?: React.CSSProperties;
      };
    }
  }
}
