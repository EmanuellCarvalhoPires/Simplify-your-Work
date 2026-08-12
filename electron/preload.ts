import { contextBridge, ipcRenderer } from 'electron';
import type { JiraInstance, Ticket, Reminder, NoteItem, ThemeConfig } from '../src/types/index';

const api = {
  // MongoDB Status
  getMongoStatus: (): Promise<{ connected: boolean; uri: string }> => ipcRenderer.invoke('mongo:getStatus'),
  setMongoUri: (uri: string): Promise<boolean> => ipcRenderer.invoke('mongo:setUri', uri),

  // Jira Credentials
  getJiraInstances: (): Promise<JiraInstance[]> => ipcRenderer.invoke('jira:getInstances'),
  saveJiraInstance: (instance: any): Promise<JiraInstance> => ipcRenderer.invoke('jira:saveInstance', instance),
  deleteJiraInstance: (id: string): Promise<boolean> => ipcRenderer.invoke('jira:deleteInstance', id),
  fetchJiraTicket: (ticketKey: string, instanceId: string): Promise<Ticket> =>
    ipcRenderer.invoke('jira:fetchTicket', { ticketKey, instanceId }),
  fetchJiraTicketsByJql: (jqlOrLink: string, instanceId: string): Promise<{ tickets: Ticket[]; newCount: number; updatedCount: number }> =>
    ipcRenderer.invoke('jira:fetchTicketsByJql', { jqlOrLink, instanceId }),

  // Saved JQL Queries
  getSavedJqlQueries: (): Promise<any[]> => ipcRenderer.invoke('jira:getSavedJqlQueries'),
  saveJqlQuery: (query: any): Promise<any> => ipcRenderer.invoke('jira:saveJqlQuery', query),
  deleteJqlQuery: (id: string): Promise<boolean> => ipcRenderer.invoke('jira:deleteJqlQuery', id),

  // Tickets
  getTickets: (): Promise<Ticket[]> => ipcRenderer.invoke('tickets:getAll'),
  saveTicket: (ticket: Partial<Ticket>): Promise<Ticket> => ipcRenderer.invoke('tickets:save', ticket),
  deleteTicket: (id: string): Promise<boolean> => ipcRenderer.invoke('tickets:delete', id),

  // Reminders
  getReminders: (): Promise<Reminder[]> => ipcRenderer.invoke('reminders:getAll'),
  saveReminder: (reminder: Partial<Reminder>): Promise<Reminder> => ipcRenderer.invoke('reminders:save', reminder),
  deleteReminder: (id: string): Promise<boolean> => ipcRenderer.invoke('reminders:delete', id),
  testReminder: (reminder: Partial<Reminder>): Promise<boolean> => ipcRenderer.invoke('reminders:test', reminder),

  // Notes
  getNotes: (): Promise<NoteItem[]> => ipcRenderer.invoke('notes:getAll'),
  readNoteContent: (filePath: string): Promise<string> => ipcRenderer.invoke('notes:readContent', filePath),
  saveNoteContent: (filePath: string, title: string, content: string): Promise<NoteItem> =>
    ipcRenderer.invoke('notes:saveContent', { filePath, title, content }),
  createNote: (title: string): Promise<NoteItem> => ipcRenderer.invoke('notes:create', title),
  createRichNote: (title: string): Promise<NoteItem> => ipcRenderer.invoke('notes:createRich', title),
  deleteNote: (id: string): Promise<boolean> => ipcRenderer.invoke('notes:delete', id),
  exportNoteAsTxt: (content: string, defaultFileName: string): Promise<boolean> =>
    ipcRenderer.invoke('notes:exportTxt', { content, defaultFileName }),
  saveNoteImage: (base64Data: string, ext: string): Promise<string> =>
    ipcRenderer.invoke('notes:saveImage', { base64Data, ext }),

  // Theme Settings
  getThemeSettings: (): Promise<ThemeConfig> => ipcRenderer.invoke('theme:get'),
  saveThemeSettings: (theme: ThemeConfig): Promise<boolean> => ipcRenderer.invoke('theme:save', theme),

  openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke('system:openExternal', url),
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
