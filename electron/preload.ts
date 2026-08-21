import { contextBridge, ipcRenderer } from 'electron';
import type { JiraInstance, Ticket, Reminder, NoteItem, ThemeConfig } from '../src/types/index';

const api = {
  // Database (SQLite)
  getDatabaseStats: (): Promise<{
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
  } | null> => ipcRenderer.invoke('database:getStats'),
  openDatabaseFolder: (): Promise<boolean> => ipcRenderer.invoke('database:openFolder'),
  exportDatabaseBackup: (): Promise<boolean> => ipcRenderer.invoke('database:exportBackup'),

  // MongoDB Status (Compatibility)
  getMongoStatus: (): Promise<{ connected: boolean; uri: string }> => ipcRenderer.invoke('mongo:getStatus'),
  setMongoUri: (uri: string): Promise<boolean> => ipcRenderer.invoke('mongo:setUri', uri),

  // Clients & Assets (JSM Style)
  getClients: (): Promise<any[]> => ipcRenderer.invoke('clients:getAll'),
  saveClient: (client: any): Promise<any> => ipcRenderer.invoke('clients:save', client),
  deleteClient: (id: string): Promise<boolean> => ipcRenderer.invoke('clients:delete', id),

  // Jira Credentials
  getJiraInstances: (): Promise<JiraInstance[]> => ipcRenderer.invoke('jira:getInstances'),
  saveJiraInstance: (instance: any): Promise<JiraInstance> => ipcRenderer.invoke('jira:saveInstance', instance),
  deleteJiraInstance: (id: string): Promise<boolean> => ipcRenderer.invoke('jira:deleteInstance', id),
  fetchJiraTicket: (ticketKey: string, instanceId: string): Promise<Ticket> =>
    ipcRenderer.invoke('jira:fetchTicket', { ticketKey, instanceId }),
  fetchJiraTicketsByJql: (
    jqlOrLink: string,
    instanceId: string
  ): Promise<{
    tickets: Ticket[];
    newCount: number;
    updatedCount?: number;
    existingCount: number;
    existingKeys: string[];
  }> => ipcRenderer.invoke('jira:fetchTicketsByJql', { jqlOrLink, instanceId }),
  getAtlassianClientId: (): Promise<string> => ipcRenderer.invoke('jira:getOAuthClientId'),
  saveAtlassianClientId: (clientId: string): Promise<boolean> => ipcRenderer.invoke('jira:saveOAuthClientId', clientId),
  getAtlassianClientSecret: (): Promise<string> => ipcRenderer.invoke('jira:getOAuthClientSecret'),
  saveAtlassianClientSecret: (clientSecret: string): Promise<boolean> => ipcRenderer.invoke('jira:saveOAuthClientSecret', clientSecret),
  getAtlassianProxyUrl: (): Promise<string> => ipcRenderer.invoke('jira:getOAuthProxyUrl'),
  saveAtlassianProxyUrl: (proxyUrl: string): Promise<boolean> => ipcRenderer.invoke('jira:saveOAuthProxyUrl', proxyUrl),
  startAtlassianOAuth: (customClientId?: string, customClientSecret?: string, customProxyUrl?: string) =>
    ipcRenderer.invoke('jira:startOAuth', customClientId, customClientSecret, customProxyUrl),
  cancelAtlassianOAuth: (): Promise<boolean> => ipcRenderer.invoke('jira:cancelOAuth'),
  addJiraComment: (params: {
    ticketId: string;
    ticketKey: string;
    instanceId?: string;
    commentBody: string;
    isInternal?: boolean;
  }): Promise<{ success: boolean; comment: any; ticket?: Ticket }> =>
    ipcRenderer.invoke('jira:addComment', params),

  // Saved JQL Queries
  getSavedJqlQueries: (): Promise<any[]> => ipcRenderer.invoke('jira:getSavedJqlQueries'),
  saveJqlQuery: (query: any): Promise<any> => ipcRenderer.invoke('jira:saveJqlQuery', query),
  deleteJqlQuery: (id: string): Promise<boolean> => ipcRenderer.invoke('jira:deleteJqlQuery', id),

  // Tickets
  getTickets: (): Promise<Ticket[]> => ipcRenderer.invoke('tickets:getAll'),
  saveTicket: (ticket: Partial<Ticket>): Promise<Ticket> => ipcRenderer.invoke('tickets:save', ticket),
  deleteTicket: (id: string): Promise<boolean> => ipcRenderer.invoke('tickets:delete', id),
  deleteTickets: (ids: string[]): Promise<boolean> => ipcRenderer.invoke('tickets:deleteMany', ids),
  updateTicketStatuses: (ids: string[], status: TicketStatus, statusLabel?: string): Promise<boolean> =>
    ipcRenderer.invoke('tickets:updateStatusMany', { ids, status, statusLabel }),

  // Reminders & Notifications
  getReminders: (): Promise<Reminder[]> => ipcRenderer.invoke('reminders:getAll'),
  saveReminder: (reminder: Partial<Reminder>): Promise<Reminder> => ipcRenderer.invoke('reminders:save', reminder),
  deleteReminder: (id: string): Promise<boolean> => ipcRenderer.invoke('reminders:delete', id),
  testReminder: (reminder: Partial<Reminder>): Promise<boolean> => ipcRenderer.invoke('reminders:test', reminder),
  getNotificationSettings: (): Promise<any> => ipcRenderer.invoke('notifications:getSettings'),
  saveNotificationSettings: (settings: any): Promise<any> => ipcRenderer.invoke('notifications:saveSettings', settings),
  checkMeetingStatus: (forceRefresh?: boolean): Promise<any> => ipcRenderer.invoke('teams:checkMeetingStatus', forceRefresh),

  // Notes
  getNotes: (): Promise<NoteItem[]> => ipcRenderer.invoke('notes:getAll'),
  readNoteContent: (filePath: string): Promise<string> => ipcRenderer.invoke('notes:readContent', filePath),
  saveNoteContent: (filePath: string, title: string, content: string): Promise<NoteItem> =>
    ipcRenderer.invoke('notes:saveContent', { filePath, title, content }),
  createNote: (title: string, folderId?: string): Promise<NoteItem> =>
    ipcRenderer.invoke('notes:create', title, folderId),
  createRichNote: (title: string, folderId?: string): Promise<NoteItem> =>
    ipcRenderer.invoke('notes:createRich', title, folderId),
  saveFileNote: (fileData: { title: string; fileName: string; mimeType: string; base64: string; size: number; folderId?: string }): Promise<NoteItem> =>
    ipcRenderer.invoke('notes:saveFileNote', fileData),
  updateNoteMeta: (note: Partial<NoteItem> & { id: string }): Promise<NoteItem> =>
    ipcRenderer.invoke('notes:updateMeta', note),
  deleteNote: (id: string): Promise<boolean> => ipcRenderer.invoke('notes:delete', id),
  exportNoteAsTxt: (content: string, defaultFileName: string): Promise<boolean> =>
    ipcRenderer.invoke('notes:exportTxt', { content, defaultFileName }),
  saveNoteImage: (base64Data: string, ext: string): Promise<string> =>
    ipcRenderer.invoke('notes:saveImage', { base64Data, ext }),
  getNoteFolders: (): Promise<any[]> => ipcRenderer.invoke('notes:getFolders'),
  saveNoteFolder: (folder: any): Promise<any> => ipcRenderer.invoke('notes:saveFolder', folder),
  deleteNoteFolder: (id: string, deleteContents?: boolean): Promise<boolean> =>
    ipcRenderer.invoke('notes:deleteFolder', id, deleteContents),
  openNoteFolder: (folderId?: string): Promise<boolean> => ipcRenderer.invoke('notes:openFolder', folderId),

  // File Viewer & Picker
  readLocalFile: (filePath: string) => ipcRenderer.invoke('system:readLocalFile', filePath),
  pickLocalFile: () => ipcRenderer.invoke('system:pickLocalFile'),

  // Calendar / ICS
  getCalendarFeeds: () => ipcRenderer.invoke('calendar:getFeeds'),
  saveCalendarFeed: (feed: any) => ipcRenderer.invoke('calendar:saveFeed', feed),
  deleteCalendarFeed: (id: string) => ipcRenderer.invoke('calendar:deleteFeed', id),
  syncCalendar: (customUrl?: string, feedId?: string) => ipcRenderer.invoke('calendar:sync', customUrl, feedId),
  getCalendarEvents: () => ipcRenderer.invoke('calendar:getEvents'),
  getCalendarUrl: () => ipcRenderer.invoke('calendar:getUrl'),
  setCalendarUrl: (url: string) => ipcRenderer.invoke('calendar:setUrl', url),
  saveEventMetadata: (eventId: string, meta: any) => ipcRenderer.invoke('calendar:saveEventMetadata', eventId, meta),
  toggleLinkNoteToEvent: (eventId: string, noteId: string) => ipcRenderer.invoke('calendar:toggleLinkNoteToEvent', eventId, noteId),
  getEventMetadataMap: () => ipcRenderer.invoke('calendar:getEventMetadataMap'),

  // Theme Settings
  getThemeSettings: (): Promise<ThemeConfig> => ipcRenderer.invoke('theme:get'),
  saveThemeSettings: (theme: ThemeConfig): Promise<boolean> => ipcRenderer.invoke('theme:save', theme),

  // User Profiles
  getUsers: () => ipcRenderer.invoke('users:get'),
  getActiveUser: () => ipcRenderer.invoke('users:getActive'),
  setActiveUser: (id: string) => ipcRenderer.invoke('users:setActive', id),
  saveUser: (user: any) => ipcRenderer.invoke('users:save', user),
  deleteUser: (id: string) => ipcRenderer.invoke('users:delete', id),

  // Auto Updater
  getUpdateStatus: (): Promise<any> => ipcRenderer.invoke('updater:getStatus'),
  checkForUpdates: (): Promise<any> => ipcRenderer.invoke('updater:checkForUpdates'),
  downloadUpdate: (): Promise<any> => ipcRenderer.invoke('updater:downloadUpdate'),
  quitAndInstallUpdate: (): Promise<void> => ipcRenderer.invoke('updater:quitAndInstall'),
  onUpdateStatus: (callback: (status: any) => void) => {
    const handler = (_: any, status: any) => callback(status);
    ipcRenderer.on('updater:status', handler);
    return () => ipcRenderer.removeListener('updater:status', handler);
  },

  showNotification: (notification: { title: string; body: string }): Promise<boolean> =>
    ipcRenderer.invoke('system:showNotification', notification),
  openDevTools: (): Promise<boolean> => ipcRenderer.invoke('system:openDevTools'),
  openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke('system:openExternal', url),
  showItemInFolder: (filePath: string): Promise<boolean> => ipcRenderer.invoke('system:showItemInFolder', filePath),
  getLegalDocs: (): Promise<{ termsContent: string; privacyContent: string }> => ipcRenderer.invoke('system:getLegalDocs'),
  openGoogleAuthWindow: (provider: string, serviceUrl?: string): Promise<{ success: boolean; url?: string; closedByUser?: boolean }> =>
    ipcRenderer.invoke('system:openGoogleAuthWindow', { provider, serviceUrl }),
};

try {
  if (process.contextIsolated) {
    contextBridge.exposeInMainWorld('electronAPI', api);
  } else {
    (window as any).electronAPI = api;
  }
} catch (e) {
  (window as any).electronAPI = api;
}
