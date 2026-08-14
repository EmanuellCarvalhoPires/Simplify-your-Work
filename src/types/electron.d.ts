import type { JiraInstance, Ticket, Reminder, NoteItem, ThemeConfig, CalendarEvent, UserProfile } from './index';

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
  // MongoDB Status
  getMongoStatus: () => Promise<{ connected: boolean; uri: string }>;
  setMongoUri: (uri: string) => Promise<boolean>;

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

  // Saved JQL Queries
  getSavedJqlQueries: () => Promise<any[]>;
  saveJqlQuery: (query: any) => Promise<any>;
  deleteJqlQuery: (id: string) => Promise<boolean>;

  // Tickets
  getTickets: () => Promise<Ticket[]>;
  saveTicket: (ticket: Partial<Ticket>) => Promise<Ticket>;
  deleteTicket: (id: string) => Promise<boolean>;

  // Reminders
  getReminders: () => Promise<Reminder[]>;
  saveReminder: (reminder: Partial<Reminder>) => Promise<Reminder>;
  deleteReminder: (id: string) => Promise<boolean>;
  testReminder: (reminder: Partial<Reminder>) => Promise<boolean>;

  // Notes
  getNotes: () => Promise<NoteItem[]>;
  readNoteContent: (filePath: string) => Promise<string>;
  saveNoteContent: (filePath: string, title: string, content: string) => Promise<NoteItem>;
  createNote: (title: string) => Promise<NoteItem>;
  createRichNote: (title: string) => Promise<NoteItem>;
  saveFileNote: (fileData: { title: string; fileName: string; mimeType: string; base64: string; size: number }) => Promise<NoteItem>;
  deleteNote: (id: string) => Promise<boolean>;
  exportNoteAsTxt: (content: string, defaultFileName: string) => Promise<boolean>;
  saveNoteImage: (base64Data: string, ext: string) => Promise<string>;

  // File Viewer & Picker
  readLocalFile: (filePath: string) => Promise<{ mimeType: string; base64: string; text?: string; fileName: string; size: number }>;
  pickLocalFile: () => Promise<{ filePath: string; fileName: string; mimeType: string; base64: string; size: number } | null>;

  // Calendar / ICS
  syncCalendar: (customUrl?: string) => Promise<{ events: CalendarEvent[]; remindersCreated: number }>;
  getCalendarEvents: () => Promise<CalendarEvent[]>;
  getCalendarUrl: () => Promise<string>;
  setCalendarUrl: (url: string) => Promise<boolean>;

  // Theme Settings
  getThemeSettings: () => Promise<ThemeConfig>;
  saveThemeSettings: (theme: ThemeConfig) => Promise<boolean>;

  // User Profiles
  getUsers: () => Promise<UserProfile[]>;
  getActiveUser: () => Promise<UserProfile | null>;
  setActiveUser: (id: string) => Promise<UserProfile | null>;
  saveUser: (user: Partial<UserProfile>) => Promise<UserProfile>;
  deleteUser: (id: string) => Promise<boolean>;

  openExternal: (url: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
