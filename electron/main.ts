import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, dialog, session, desktopCapturer } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import {
  initDatabase,
  getDatabaseStats,
  getDatabasePath,
  getMongoStatus,
  setMongoUri,
  dbGetJiraInstances,
  dbSaveJiraInstance,
  dbDeleteJiraInstance,
  dbGetSavedJqlQueries,
  dbSaveJqlQuery,
  dbDeleteJqlQuery,
  dbGetTickets,
  dbSaveTicket,
  dbDeleteTicket,
  dbDeleteTickets,
  dbBatchUpdateTicketStatus,
  dbGetReminders,
  dbSaveReminder,
  dbDeleteReminder,
  dbGetNotes,
  dbSaveNoteMeta,
  dbGetNoteFolders,
  dbSaveNoteFolder,
  dbDeleteNoteFolder,
  dbGetUsers,
  dbGetActiveUser,
  dbSetActiveUser,
  dbSaveUser,
  dbDeleteUser,
  dbSaveActiveUserTheme,
  dbGetClients,
  dbSaveClient,
  dbDeleteClient,
  dbCreateClientFromJiraInstance,
} from './database';
import { fetchJiraIssue, fetchJiraIssuesByJql, postJiraComment, startJiraTokenRefresher } from './jira-service';
import {
  readNoteContent,
  saveNoteContent,
  createNote,
  createRichNote,
  saveFileNote,
  pickLocalFile,
  deleteNote,
  exportNoteAsTxt,
  saveNoteImage,
  openNoteFolder,
  updateNoteMetaAndMoveFile,
  getPhysicalFolderPath,
  deleteNoteFolderService,
} from './markdown-service';
import { startReminderScheduler, triggerNotification } from './scheduler';
import { startAtlassianOAuthFlow, cancelActiveOAuthFlow } from './oauth-service';
import {
  syncIcsCalendar,
  getCachedEvents,
  getCalendarUrl,
  setCalendarUrl,
  getCalendarFeeds,
  saveCalendarFeed,
  deleteCalendarFeed,
  saveEventMetadata,
  toggleLinkNoteToEvent,
  getEventMetadataMap,
} from './calendar-service';
import {
  getNotificationSettings,
  saveNotificationSettings,
  checkMeetingStatus,
  triggerCalendarNotification,
} from './teams-detector';
import { initAutoUpdater, registerUpdaterIpc } from './updater-service';
import type { ThemeConfig, CalendarFeed, NotificationSettings, MeetingStatus } from '../src/types/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global crash protection for uncaught async exceptions and rejections
process.on('uncaughtException', (error) => {
  console.error('[Electron Uncaught Exception]:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Electron Unhandled Rejection]:', reason);
});

// Disable automation flags and WebAuthentication/Windows Security Key prompts
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled,WebAuthentication,WebAuthenticationConditionalUI');
app.commandLine.appendSwitch('disable-features', 'WidgetLayering,WebAuthentication,WebAuthenticationModernDesktop,WebAuthenticationConditionalUI,WebAuthenticationLargeBlob,WebAuthenticationAndroidCredMan');

// Enable WebRTC screen sharing and user media capture (Microsoft Teams / Web calls)
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('allow-http-screen-capture');

// Configure Windows AppUserModelId so Windows Action Center and Taskbar accept native notifications & icons
if (process.platform === 'win32') {
  if (app.isPackaged) {
    app.setAppUserModelId('com.simplifyyourwork.app');
  } else {
    app.setAppUserModelId(process.execPath);
  }
}

const store = new Store();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const defaultTheme: ThemeConfig = {
  presetName: 'Dark Slate Premium',
  bgMain: '#181825',
  bgSidebar: '#1e1e2e',
  bgHeader: '#1e1e2e',
  bgCardJira: '#1e293b',
  bgCardApp: '#27273a',
  accentPrimary: '#6366f1',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
};

function resolveAppIcon(): string {
  const appPath = app.getAppPath();
  const candidates = [
    path.join(appPath, 'public/assets/app-icon.png'),
    path.join(appPath, 'dist/assets/app-icon.png'),
    path.join(appPath, 'public/assets/app-icon.ico'),
    path.join(appPath, 'dist/assets/app-icon.ico'),
    path.resolve(process.cwd(), 'public/assets/app-icon.png'),
    path.resolve(process.cwd(), 'public/assets/app-icon.ico'),
    path.resolve(__dirname, '../public/assets/app-icon.png'),
    path.resolve(__dirname, '../public/assets/app-icon.ico'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.resolve(process.cwd(), 'public/assets/app-icon.png');
}

function createWindow() {
  const iconPath = resolveAppIcon();
  const iconImg = nativeImage.createFromPath(iconPath);
  const preloadPath = path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 920,
    minWidth: 1000,
    minHeight: 650,
    title: 'Simplify your Work',
    icon: !iconImg.isEmpty() ? iconImg : iconPath,
    frame: true,
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: true,
    },
  });

  mainWindow.removeMenu();
  mainWindow.setMenuBarVisibility(false);
  Menu.setApplicationMenu(null);
  mainWindow.maximize();

  if (!iconImg.isEmpty()) {
    mainWindow.setIcon(iconImg);
  }

  mainWindow.on('page-title-updated', (e) => {
    e.preventDefault();
  });

  mainWindow.once('ready-to-show', () => {
    if (!iconImg.isEmpty()) {
      mainWindow?.setIcon(iconImg);
    }
    mainWindow?.maximize();
    mainWindow?.show();
  });

  // Atalhos de teclado para depuração e recarregamento (F12, Ctrl+Shift+I, F5, Ctrl+R)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        mainWindow?.webContents.toggleDevTools();
        event.preventDefault();
      } else if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
        mainWindow?.webContents.reload();
        event.preventDefault();
      }
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Electron] Falha ao carregar página (${errorCode}): ${errorDescription} - ${validatedURL}`);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[Electron] Processo de renderização terminou inesperadamente:', details);
  });

  // Load app HTML
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Auto-updater initialization
  initAutoUpdater(mainWindow);

  // Tray setup
  setupTray();
}

function setupTray() {
  const trayIconPath = path.join(app.getAppPath(), 'public', 'assets', 'tray-icon.png');
  let image = nativeImage.createEmpty();
  if (fs.existsSync(trayIconPath)) {
    image = nativeImage.createFromPath(trayIconPath);
  }

  tray = new Tray(image);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir Simplify your Work',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Sair do Aplicativo',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Simplify your Work - Central de Produtividade');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function registerIpcHandlers() {
  // === SQLITE DATABASE STATUS & UTILITIES ===
  ipcMain.handle('database:getStats', () => {
    return getDatabaseStats();
  });

  ipcMain.handle('database:openFolder', async () => {
    const dbPath = getDatabasePath();
    if (fs.existsSync(dbPath)) {
      shell.showItemInFolder(dbPath);
      return true;
    } else {
      shell.openPath(path.dirname(dbPath));
      return true;
    }
  });

  ipcMain.handle('database:exportBackup', async () => {
    const dbPath = getDatabasePath();
    if (!fs.existsSync(dbPath)) {
      throw new Error('Arquivo do banco de dados não foi encontrado.');
    }

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Exportar Backup do Banco de Dados SQLite',
      defaultPath: `simplify_work_backup_${new Date().toISOString().slice(0, 10)}.sqlite`,
      filters: [{ name: 'Banco SQLite', extensions: ['sqlite', 'db'] }],
    });

    if (canceled || !filePath) return false;

    fs.copyFileSync(dbPath, filePath);
    return true;
  });

  // === AUTO UPDATER ===
  registerUpdaterIpc();

  // === MONGO COMPATIBILITY (Legacy) ===
  ipcMain.handle('mongo:getStatus', () => {
    return getMongoStatus();
  });

  ipcMain.handle('mongo:setUri', async (_, uri: string) => {
    return await setMongoUri(uri);
  });

  // === CLIENTS & ASSETS (JSM Style) ===
  ipcMain.handle('clients:getAll', async () => {
    return await dbGetClients();
  });

  ipcMain.handle('clients:save', async (_, client) => {
    return await dbSaveClient(client);
  });

  ipcMain.handle('clients:delete', async (_, id) => {
    return await dbDeleteClient(id);
  });

  // === JIRA CREDENTIALS ===
  ipcMain.handle('jira:getInstances', async () => {
    return await dbGetJiraInstances();
  });

  ipcMain.handle('jira:saveInstance', async (_, instance) => {
    const saved = await dbSaveJiraInstance(instance);
    try {
      // Automatically create or update client asset for this Jira instance
      await dbCreateClientFromJiraInstance(saved);
    } catch (err) {
      console.warn('[Auto Client Asset Error]:', err);
    }
    return saved;
  });

  ipcMain.handle('jira:deleteInstance', async (_, id) => {
    return await dbDeleteJiraInstance(id);
  });

  ipcMain.handle('jira:fetchTicket', async (_, { ticketKey, instanceId }) => {
    const instances = await dbGetJiraInstances();
    const instance = instances.find((i) => i.id === instanceId);
    if (!instance) {
      throw new Error(`Instância do Jira (ID: ${instanceId}) não foi encontrada no aplicativo. Verifique se ela está cadastrada nas Configurações.`);
    }

    const freshTicket = await fetchJiraIssue(ticketKey, instance);
    freshTicket.jiraInstanceId = instance.id;
    const existingTickets = await dbGetTickets();
    const cleanKey = ticketKey.trim().toUpperCase();
    const existing = existingTickets.find((t) => (t.key || '').trim().toUpperCase() === cleanKey || t.id === freshTicket.id);

    if (existing) {
      // Merge remote comments and preserve any local comments created by the user
      const existingLocalComments = (existing.comments || []).filter((c) => c.isLocal);
      const freshRemoteComments = freshTicket.comments || [];
      const mergedComments = [...existingLocalComments, ...freshRemoteComments.filter((fc) => !existingLocalComments.some((ec) => ec.id === fc.id))];

      // Preserve local status and update remote jiraStatus, origin instance and remote fields
      return await dbSaveTicket({
        ...existing,
        jiraInstanceId: instance.id, // Atualiza a instância de origem do app!
        jiraStatus: freshTicket.jiraStatus || freshTicket.statusLabel || '',
        title: freshTicket.title || existing.title,
        description: freshTicket.description !== undefined ? freshTicket.description : existing.description,
        labels: freshTicket.labels || existing.labels,
        comments: mergedComments.length > 0 ? mergedComments : existing.comments,
        assignee: freshTicket.assignee || existing.assignee,
        reporter: freshTicket.reporter || existing.reporter,
        priority: freshTicket.priority || existing.priority,
        updatedAt: freshTicket.updatedAt || new Date().toISOString(),
      });
    }

    return await dbSaveTicket(freshTicket);
  });

  ipcMain.handle('jira:fetchTicketsByJql', async (_, { jqlOrLink, instanceId }) => {
    const instances = await dbGetJiraInstances();
    const instance = instances.find((i) => i.id === instanceId);
    if (!instance) {
      throw new Error(`Instância do Jira (ID: ${instanceId}) não foi encontrada no aplicativo.`);
    }

    const fetchedTickets = await fetchJiraIssuesByJql(jqlOrLink, instance);
    const existingTickets = await dbGetTickets();

    const savedTickets: Ticket[] = [];
    const existingKeys: string[] = [];
    let newCount = 0;
    let updatedCount = 0;

    for (const fresh of fetchedTickets) {
      fresh.jiraInstanceId = instance.id;
      const freshKey = (fresh.key || '').trim().toUpperCase();
      const existing = existingTickets.find((t) => {
        const tKey = (t.key || '').trim().toUpperCase();
        return (freshKey && tKey === freshKey) || t.id === fresh.id || (freshKey && t.id.toUpperCase().includes(`_${freshKey}_`));
      });

      if (existing) {
        // Ticket already exists in app - update its origin instance (jiraInstanceId), remote jiraStatus, comments, fields while preserving local workflow status
        const keyName = freshKey || existing.key || fresh.id;
        if (!existingKeys.includes(keyName)) {
          existingKeys.push(keyName);
        }

        const existingLocalComments = (existing.comments || []).filter((c) => c.isLocal);
        const freshRemoteComments = fresh.comments || [];
        const mergedComments = [...existingLocalComments, ...freshRemoteComments.filter((fc) => !existingLocalComments.some((ec) => ec.id === fc.id))];

        const updated = await dbSaveTicket({
          ...existing,
          jiraInstanceId: instance.id, // Atualiza a instância de origem do app!
          jiraStatus: fresh.jiraStatus || fresh.statusLabel || '',
          title: fresh.title || existing.title,
          description: fresh.description !== undefined ? fresh.description : existing.description,
          labels: fresh.labels || existing.labels,
          comments: mergedComments.length > 0 ? mergedComments : existing.comments,
          priority: fresh.priority || existing.priority,
          assignee: fresh.assignee || existing.assignee,
          reporter: fresh.reporter || existing.reporter,
          updatedAt: fresh.updatedAt || new Date().toISOString(),
        });
        savedTickets.push(updated);
        updatedCount++;
      } else {
        // New ticket - save it with origin instance
        const saved = await dbSaveTicket(fresh);
        savedTickets.push(saved);
        newCount++;
      }
    }

    return {
      tickets: savedTickets,
      newCount,
      updatedCount,
      existingCount: existingKeys.length,
      existingKeys,
    };
  });

  ipcMain.handle('jira:addComment', async (_, { ticketId, ticketKey, instanceId, commentBody, isInternal = true }) => {
    const cleanKey = (ticketKey || '').trim().toUpperCase();
    if (!cleanKey) {
      throw new Error('Chave do ticket no Jira não foi informada.');
    }
    if (!commentBody || !commentBody.trim()) {
      throw new Error('O conteúdo do comentário não pode estar vazio.');
    }

    const instances = await dbGetJiraInstances();
    let instance = instances.find((i) => i.id === instanceId);
    if (!instance && instances.length === 1) {
      instance = instances[0];
    }
    if (!instance && instances.length > 1 && instanceId) {
      instance = instances.find((i) => i.name === instanceId || i.domain === instanceId);
    }
    if (!instance && instances.length > 0) {
      instance = instances[0];
    }

    if (!instance) {
      const errMsg = `Nenhuma instância do Jira encontrada para o ticket ${cleanKey}. Verifique as configurações.`;
      triggerNotification({
        title: `❌ Falha ao comentar no Jira (${cleanKey})`,
        message: errMsg,
      });
      throw new Error(errMsg);
    }

    try {
      const remoteComment = await postJiraComment(cleanKey, commentBody.trim(), instance, Boolean(isInternal));

      // Sincronizar o comentário no banco SQLite local
      const existingTickets = await dbGetTickets();
      const existing = existingTickets.find(
        (t) => t.id === ticketId || (t.key || '').trim().toUpperCase() === cleanKey
      );

      let savedTicket: Ticket | undefined;
      if (existing) {
        const otherComments = (existing.comments || []).filter((c) => c.id !== remoteComment.id);
        const updatedComments = [remoteComment, ...otherComments];
        updatedComments.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

        savedTicket = await dbSaveTicket({
          ...existing,
          comments: updatedComments,
          updatedAt: new Date().toISOString(),
        });
      }

      return {
        success: true,
        comment: remoteComment,
        ticket: savedTicket,
      };
    } catch (err: any) {
      console.error(`[Jira Comment Error] Falha ao enviar comentário para ${cleanKey}:`, err);
      // Disparar Notificação Desktop Nativa do Windows para alertar o usuário
      triggerNotification({
        title: `❌ Falha ao comentar no Jira (${cleanKey})`,
        message: `Não foi possível enviar o comentário via API: ${err.message || 'Erro desconhecido'}`,
      });
      throw err;
    }
  });

  // === SAVED JQL QUERIES ===
  ipcMain.handle('jira:getSavedJqlQueries', async () => {
    return await dbGetSavedJqlQueries();
  });

  ipcMain.handle('jira:saveJqlQuery', async (_, query) => {
    return await dbSaveJqlQuery(query);
  });

  ipcMain.handle('jira:deleteJqlQuery', async (_, id) => {
    return await dbDeleteJqlQuery(id);
  });

  // === TICKETS ===
  ipcMain.handle('tickets:getAll', async () => {
    return await dbGetTickets();
  });

  ipcMain.handle('tickets:save', async (_, ticket) => {
    return await dbSaveTicket(ticket);
  });

  ipcMain.handle('tickets:delete', async (_, id) => {
    return await dbDeleteTicket(id);
  });

  ipcMain.handle('tickets:deleteMany', async (_, ids: string[]) => {
    return await dbDeleteTickets(ids);
  });

  ipcMain.handle('tickets:updateStatusMany', async (_, { ids, status, statusLabel }) => {
    return await dbBatchUpdateTicketStatus(ids, status, statusLabel);
  });

  // === REMINDERS ===
  ipcMain.handle('reminders:getAll', async () => {
    return await dbGetReminders();
  });

  ipcMain.handle('reminders:save', async (_, reminder) => {
    return await dbSaveReminder(reminder);
  });

  ipcMain.handle('reminders:delete', async (_, id) => {
    return await dbDeleteReminder(id);
  });

  ipcMain.handle('reminders:test', (_, reminder) => {
    triggerNotification(reminder);
    return true;
  });

  // === NOTIFICATION & TEAMS MEETING SETTINGS ===
  ipcMain.handle('notifications:getSettings', async () => {
    return getNotificationSettings();
  });

  ipcMain.handle('notifications:saveSettings', async (_, settings: Partial<NotificationSettings>) => {
    return saveNotificationSettings(settings);
  });

  ipcMain.handle('teams:checkMeetingStatus', async (_, forceRefresh?: boolean) => {
    return await checkMeetingStatus(forceRefresh);
  });

  // === NOTES ===
  ipcMain.handle('notes:getAll', async () => {
    return await dbGetNotes();
  });

  ipcMain.handle('notes:readContent', async (_, filePath) => {
    return await readNoteContent(filePath);
  });

  ipcMain.handle('notes:saveContent', async (_, { filePath, title, content }) => {
    return await saveNoteContent(filePath, title, content);
  });

  ipcMain.handle('notes:create', async (_, title, folderId) => {
    return await createNote(title, folderId);
  });

  ipcMain.handle('notes:createRich', async (_, title, folderId) => {
    return await createRichNote(title, folderId);
  });

  ipcMain.handle('notes:saveFileNote', async (_, fileData) => {
    return await saveFileNote(fileData);
  });

  ipcMain.handle('notes:saveImage', async (_, { base64Data, ext }) => {
    return await saveNoteImage(base64Data, ext);
  });

  ipcMain.handle('notes:updateMeta', async (_, note) => {
    return await updateNoteMetaAndMoveFile(note);
  });

  ipcMain.handle('notes:delete', async (_, id) => {
    return await deleteNote(id);
  });

  ipcMain.handle('notes:exportTxt', async (_, { content, defaultFileName }) => {
    return await exportNoteAsTxt(content, defaultFileName);
  });

  ipcMain.handle('notes:getFolders', async () => {
    return await dbGetNoteFolders();
  });

  ipcMain.handle('notes:saveFolder', async (_, folder) => {
    const saved = await dbSaveNoteFolder(folder);
    await getPhysicalFolderPath(saved.id);
    return saved;
  });

  ipcMain.handle('notes:deleteFolder', async (_, id, deleteContents) => {
    return await deleteNoteFolderService(id, Boolean(deleteContents));
  });

  ipcMain.handle('notes:openFolder', async (_, folderId) => {
    return await openNoteFolder(folderId);
  });

  // === ATLASSIAN OAUTH ===
  ipcMain.handle('jira:getOAuthClientId', async () => {
    return (store.get('atlassian_client_id') as string) || process.env.VITE_ATLASSIAN_CLIENT_ID || process.env.ATLASSIAN_CLIENT_ID || 'ylA7OylhMAcq3fuSo5EzXmdoXmysHfhh';
  });

  ipcMain.handle('jira:saveOAuthClientId', async (_, clientId: string) => {
    store.set('atlassian_client_id', clientId.trim());
    return true;
  });

  ipcMain.handle('jira:getOAuthClientSecret', async () => {
    return (store.get('atlassian_client_secret') as string) || process.env.VITE_ATLASSIAN_CLIENT_SECRET || process.env.ATLASSIAN_CLIENT_SECRET || '';
  });

  ipcMain.handle('jira:saveOAuthClientSecret', async (_, clientSecret: string) => {
    store.set('atlassian_client_secret', clientSecret.trim());
    return true;
  });

  ipcMain.handle('jira:getOAuthProxyUrl', async () => {
    return (store.get('atlassian_proxy_url') as string) || process.env.VITE_ATLASSIAN_PROXY_URL || process.env.ATLASSIAN_PROXY_URL || 'https://simplifyyourwork.vercel.app/api/token';
  });

  ipcMain.handle('jira:saveOAuthProxyUrl', async (_, proxyUrl: string) => {
    store.set('atlassian_proxy_url', proxyUrl.trim());
    return true;
  });

  ipcMain.handle('jira:startOAuth', async (_, customClientId?: string, customClientSecret?: string, customProxyUrl?: string) => {
    const savedClientId = (store.get('atlassian_client_id') as string) || '';
    const savedClientSecret = (store.get('atlassian_client_secret') as string) || '';
    const savedProxyUrl = (store.get('atlassian_proxy_url') as string) || '';
    return await startAtlassianOAuthFlow(customClientId, savedClientId, customClientSecret, savedClientSecret, customProxyUrl, savedProxyUrl);
  });

  ipcMain.handle('jira:cancelOAuth', async () => {
    return cancelActiveOAuthFlow();
  });

  // === THEME ===
  ipcMain.handle('theme:get', async () => {
    const activeUser = await dbGetActiveUser();
    return activeUser?.themeConfig || (store.get('themeConfig') as ThemeConfig) || defaultTheme;
  });

  ipcMain.handle('theme:save', async (_, theme: ThemeConfig) => {
    return await dbSaveActiveUserTheme(theme);
  });

  // === USER PROFILES ===
  ipcMain.handle('users:get', async () => {
    return await dbGetUsers();
  });

  ipcMain.handle('users:getActive', async () => {
    return await dbGetActiveUser();
  });

  ipcMain.handle('users:setActive', async (_, id: string) => {
    return await dbSetActiveUser(id);
  });

  ipcMain.handle('users:save', async (_, user: any) => {
    return await dbSaveUser(user);
  });

  ipcMain.handle('users:delete', async (_, id: string) => {
    return await dbDeleteUser(id);
  });

  // === SYSTEM ===
  ipcMain.handle('system:openExternal', async (_, url: string) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });

  ipcMain.handle('system:showItemInFolder', async (_, filePath: string) => {
    if (!filePath) return false;
    try {
      if (fs.existsSync(filePath)) {
        shell.showItemInFolder(filePath);
        return true;
      } else if (fs.existsSync(path.dirname(filePath))) {
        await shell.openPath(path.dirname(filePath));
        return true;
      }
    } catch (e) {
      console.error('[Error system:showItemInFolder]:', e);
    }
    return false;
  });

  ipcMain.handle('system:readLocalFile', async (_, filePath: string) => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado no caminho: ${filePath}`);
    }

    const stat = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    let mimeType = 'application/octet-stream';
    if (ext === '.pdf') mimeType = 'application/pdf';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.svg') mimeType = 'image/svg+xml';
    else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === '.doc') mimeType = 'application/msword';
    else if (ext === '.xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (ext === '.xls') mimeType = 'application/vnd.ms-excel';
    else if (ext === '.csv') mimeType = 'text/csv';
    else if (ext === '.txt' || ext === '.log' || ext === '.json' || ext === '.md' || ext === '.html' || ext === '.js' || ext === '.ts') {
      mimeType = 'text/plain';
    }

    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    let text: string | undefined = undefined;

    if (mimeType.startsWith('text/') || ext === '.csv' || ext === '.json' || ext === '.md') {
      text = buffer.toString('utf-8');
    }

    return {
      mimeType,
      base64,
      text,
      fileName,
      size: stat.size,
    };
  });

  ipcMain.handle('system:pickLocalFile', async () => {
    return await pickLocalFile();
  });

  // === CALENDAR / ICS ===
  ipcMain.handle('calendar:getFeeds', async () => {
    return getCalendarFeeds();
  });

  ipcMain.handle('calendar:saveFeed', async (_, feed: Partial<CalendarFeed> & { id: string }) => {
    return saveCalendarFeed(feed);
  });

  ipcMain.handle('calendar:deleteFeed', async (_, id: string) => {
    return deleteCalendarFeed(id);
  });

  ipcMain.handle('calendar:sync', async (_, customUrl?: string, feedId?: string) => {
    return await syncIcsCalendar(customUrl, feedId);
  });

  ipcMain.handle('calendar:getEvents', async () => {
    return getCachedEvents();
  });

  ipcMain.handle('calendar:getUrl', async () => {
    return getCalendarUrl();
  });

  ipcMain.handle('calendar:setUrl', async (_, url: string) => {
    return setCalendarUrl(url);
  });

  ipcMain.handle('calendar:saveEventMetadata', async (_, eventId: string, meta: any) => {
    return saveEventMetadata(eventId, meta);
  });

  ipcMain.handle('calendar:toggleLinkNoteToEvent', async (_, eventId: string, noteId: string) => {
    return toggleLinkNoteToEvent(eventId, noteId);
  });

  ipcMain.handle('calendar:getEventMetadataMap', async () => {
    return getEventMetadataMap();
  });

  // === LEGAL DOCS ===
  ipcMain.handle('system:getLegalDocs', async () => {
    const baseDir = app.getAppPath();
    const termsPath = path.join(baseDir, 'registrosMarkdown', 'termos_de_uso.md');
    const privacyPath = path.join(baseDir, 'registrosMarkdown', 'politica_de_privacidade.md');

    let termsContent = '';
    let privacyContent = '';

    if (fs.existsSync(termsPath)) {
      termsContent = fs.readFileSync(termsPath, 'utf-8');
    }
    if (fs.existsSync(privacyPath)) {
      privacyContent = fs.readFileSync(privacyPath, 'utf-8');
    }

    return { termsContent, privacyContent };
  });

  // === SYSTEM NOTIFICATION ===
  ipcMain.handle('system:showNotification', async (_, { title, body }) => {
    triggerNotification({
      title: title || 'Notificação Simplify your Work',
      message: body || '',
    });
    return true;
  });

  // === SYSTEM DEVTOOLS ===
  ipcMain.handle('system:openDevTools', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
      return true;
    }
    return false;
  });

  // === GOOGLE AUTH WINDOW (NATIVE TOP-LEVEL WINDOW TO BYPASS EMBEDDED WEBVIEW BLOCK) ===
  ipcMain.handle('system:openGoogleAuthWindow', async (_, { provider, serviceUrl }) => {
    return new Promise((resolve) => {
      const authPartition = `persist:ai_${provider}`;
      const authWin = new BrowserWindow({
        width: 520,
        height: 700,
        parent: mainWindow || undefined,
        modal: true,
        title: 'Login Google',
        autoHideMenuBar: true,
        webPreferences: {
          partition: authPartition,
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false,
        },
      });

      authWin.removeMenu();
      authWin.setMenuBarVisibility(false);

      const loginUrl =
        serviceUrl ||
        (provider === 'gemini'
          ? 'https://accounts.google.com/ServiceLogin?service=mail&continue=https://gemini.google.com/'
          : 'https://accounts.google.com/ServiceLogin');

      authWin.loadURL(loginUrl);

      let isResolved = false;

      const checkSuccess = (url: string) => {
        if (
          (url.includes('gemini.google.com') && !url.includes('accounts.google.com')) ||
          (url.includes('chatgpt.com') && !url.includes('auth0.openai.com') && !url.includes('accounts.google.com')) ||
          (url.includes('claude.ai') && !url.includes('auth.anthropic.com') && !url.includes('accounts.google.com')) ||
          url.includes('myaccount.google.com')
        ) {
          if (!isResolved) {
            isResolved = true;
            setTimeout(() => {
              if (!authWin.isDestroyed()) {
                authWin.close();
              }
              resolve({ success: true, url });
            }, 600);
          }
        }
      };

      authWin.webContents.on('did-navigate', (_e, url) => checkSuccess(url));
      authWin.webContents.on('did-navigate-in-page', (_e, url) => checkSuccess(url));

      authWin.on('closed', () => {
        if (!isResolved) {
          isResolved = true;
          resolve({ success: false, closedByUser: true });
        }
      });
    });
  });
}

const MODERN_CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const GOOGLE_AUTH_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0';

app.userAgentFallback = MODERN_CHROME_UA;

function configureSessionHeadersAndPermissions(
  targetSession: Electron.Session,
  allowedPermissions: string[]
) {
  targetSession.setUserAgent(MODERN_CHROME_UA);

  targetSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const isGoogleAuth =
      details.url.includes('accounts.google.com') ||
      details.url.includes('accounts.youtube.com') ||
      details.url.includes('oauth2.googleapis.com');

    if (isGoogleAuth) {
      details.requestHeaders['User-Agent'] = GOOGLE_AUTH_UA;
      delete details.requestHeaders['Sec-Ch-Ua'];
      delete details.requestHeaders['Sec-Ch-Ua-Mobile'];
      delete details.requestHeaders['Sec-Ch-Ua-Platform'];
    } else {
      details.requestHeaders['User-Agent'] = MODERN_CHROME_UA;
    }
    delete details.requestHeaders['X-Electron'];
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  targetSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    // Bloqueia tentativas de chave de segurança física (Windows Security Key / WebAuthn)
    if (permission === 'security-key' || permission === 'u2f' || permission === 'webauthn') {
      return callback(false);
    }
    if (allowedPermissions.includes(permission)) {
      return callback(true);
    }
    callback(true);
  });

  targetSession.setPermissionCheckHandler(() => {
    return true;
  });

  // Habilita captura de tela e janelas para WebRTC (Microsoft Teams, chamadas e reuniões) com seletor interativo
  targetSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 360, height: 200 },
        fetchWindowIcons: true,
      });

      if (!sources || sources.length === 0) {
        callback({});
        return;
      }

      // Abre a janela modal com abas para escolha de Tela Inteira ou Janela Específica
      const chosenSource = await openScreenPickerModal(sources);
      if (chosenSource) {
        callback({ video: chosenSource, audio: 'loopback' });
      } else {
        // Usuário cancelou
        callback({});
      }
    } catch (err) {
      console.error('Erro ao processar requisição de compartilhamento de tela:', err);
      callback({});
    }
  });
}

/**
 * Janela Modal Interativa de Seleção de Fonte de Vídeo (Telas Inteiras ou Janelas Específicas)
 */
async function openScreenPickerModal(
  sources: Electron.DesktopCapturerSource[]
): Promise<Electron.DesktopCapturerSource | null> {
  return new Promise((resolve) => {
    if (!sources || sources.length === 0) {
      resolve(null);
      return;
    }

    const pickerWin = new BrowserWindow({
      width: 780,
      height: 600,
      minWidth: 620,
      minHeight: 480,
      parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
      modal: true,
      title: 'Compartilhar Conteúdo - Microsoft Teams',
      autoHideMenuBar: true,
      backgroundColor: '#181825',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    pickerWin.removeMenu();
    pickerWin.setMenuBarVisibility(false);

    let isResolved = false;

    const serializedSources = sources.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.id.startsWith('screen:') ? 'screen' : 'window',
      thumbnail: s.thumbnail ? s.thumbnail.toDataURL() : '',
      appIcon: s.appIcon ? s.appIcon.toDataURL() : '',
    }));

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Compartilhar Conteúdo</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; user-select: none; }
          body { background: #181825; color: #f8fafc; display: flex; flex-direction: column; height: 100vh; overflow: hidden; padding: 20px; }
          .header { margin-bottom: 14px; }
          .header h2 { font-size: 18px; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 8px; }
          .header p { font-size: 13px; color: #94a3b8; margin-top: 4px; }
          
          .tabs { display: flex; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 16px; }
          .tab-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.15s ease; }
          .tab-btn:hover { background: rgba(255,255,255,0.1); color: #ffffff; }
          .tab-btn.active { background: #6366f1; border-color: #6366f1; color: #ffffff; box-shadow: 0 4px 12px rgba(99,102,241,0.35); }
          
          .grid-container { flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; padding-right: 4px; align-content: start; }
          .grid-container::-webkit-scrollbar { width: 6px; }
          .grid-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
          
          .source-card { background: #1e1e2e; border: 2px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; }
          .source-card:hover { transform: translateY(-2px); border-color: rgba(99,102,241,0.6); box-shadow: 0 6px 16px rgba(0,0,0,0.3); }
          .source-card.selected { border-color: #6366f1; background: rgba(99,102,241,0.15); box-shadow: 0 0 0 1px #6366f1, 0 6px 20px rgba(99,102,241,0.3); }
          
          .thumb-wrapper { width: 100%; aspect-ratio: 16/10; background: #11111b; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
          .thumb-img { width: 100%; height: 100%; object-fit: contain; }
          
          .info-box { padding: 10px; display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.2); }
          .app-icon { width: 18px; height: 18px; object-fit: contain; flex-shrink: 0; }
          .source-title { font-size: 12px; font-weight: 500; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
          
          .empty-state { grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #64748b; font-size: 14px; }
          
          .footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.1); }
          .btn { padding: 10px 22px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s ease; display: inline-flex; align-items: center; justify-content: center; }
          .btn-cancel { background: rgba(255,255,255,0.08); color: #cbd5e1; }
          .btn-cancel:hover { background: rgba(255,255,255,0.15); color: #ffffff; }
          .btn-primary { background: #6366f1; color: #ffffff; opacity: 0.4; pointer-events: none; }
          .btn-primary.enabled { opacity: 1; pointer-events: auto; }
          .btn-primary.enabled:hover { background: #4f46e5; box-shadow: 0 4px 14px rgba(99,102,241,0.4); }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>🖥️ Compartilhar Tela ou Janela</h2>
          <p>Selecione a tela inteira ou uma janela específica de aplicativo para transmitir na chamada.</p>
        </div>
        
        <div class="tabs">
          <button id="tab-screens" class="tab-btn active" onclick="switchTab('screen')">
            🖥️ Telas Inteiras (<span id="count-screens">0</span>)
          </button>
          <button id="tab-windows" class="tab-btn" onclick="switchTab('window')">
            🪟 Janelas de Aplicativos (<span id="count-windows">0</span>)
          </button>
        </div>
        
        <div id="grid" class="grid-container"></div>
        
        <div class="footer">
          <button class="btn btn-cancel" onclick="cancelSelection()">Cancelar</button>
          <button id="btn-share" class="btn btn-primary" onclick="confirmSelection()">Compartilhar</button>
        </div>

        <script>
          const { ipcRenderer } = require('electron');
          const allSources = ${JSON.stringify(serializedSources)};
          let currentTab = 'screen';
          let selectedSourceId = null;

          const screens = allSources.filter(s => s.type === 'screen');
          const windows = allSources.filter(s => s.type === 'window');

          document.getElementById('count-screens').textContent = screens.length;
          document.getElementById('count-windows').textContent = windows.length;

          if (screens.length === 0 && windows.length > 0) {
            currentTab = 'window';
            document.getElementById('tab-screens').classList.remove('active');
            document.getElementById('tab-windows').classList.add('active');
          } else if (screens.length > 0) {
            selectedSourceId = screens[0].id;
          }

          function renderGrid() {
            const grid = document.getElementById('grid');
            grid.innerHTML = '';
            
            const list = currentTab === 'screen' ? screens : windows;
            
            if (list.length === 0) {
              grid.innerHTML = '<div class="empty-state">Nenhuma ' + (currentTab === 'screen' ? 'tela' : 'janela de aplicativo') + ' encontrada no momento.</div>';
              updateShareButton();
              return;
            }

            list.forEach(item => {
              const card = document.createElement('div');
              card.className = 'source-card' + (item.id === selectedSourceId ? ' selected' : '');
              card.onclick = () => selectSource(item.id);
              card.ondblclick = () => { selectSource(item.id); confirmSelection(); };

              const thumbWrap = document.createElement('div');
              thumbWrap.className = 'thumb-wrapper';
              if (item.thumbnail) {
                const img = document.createElement('img');
                img.className = 'thumb-img';
                img.src = item.thumbnail;
                thumbWrap.appendChild(img);
              }
              card.appendChild(thumbWrap);

              const info = document.createElement('div');
              info.className = 'info-box';
              
              if (item.appIcon) {
                const icon = document.createElement('img');
                icon.className = 'app-icon';
                icon.src = item.appIcon;
                info.appendChild(icon);
              }

              const title = document.createElement('span');
              title.className = 'source-title';
              title.textContent = item.name || 'Sem título';
              title.title = item.name || '';
              info.appendChild(title);

              card.appendChild(info);
              grid.appendChild(card);
            });

            updateShareButton();
          }

          function selectSource(id) {
            selectedSourceId = id;
            renderGrid();
          }

          function switchTab(tab) {
            currentTab = tab;
            document.getElementById('tab-screens').classList.toggle('active', tab === 'screen');
            document.getElementById('tab-windows').classList.toggle('active', tab === 'window');
            
            const list = currentTab === 'screen' ? screens : windows;
            if (!list.some(s => s.id === selectedSourceId) && list.length > 0) {
              selectedSourceId = list[0].id;
            }
            renderGrid();
          }

          function updateShareButton() {
            const btn = document.getElementById('btn-share');
            if (selectedSourceId) {
              btn.classList.add('enabled');
            } else {
              btn.classList.remove('enabled');
            }
          }

          function confirmSelection() {
            if (selectedSourceId) {
              ipcRenderer.send('screen-picker-selected', selectedSourceId);
            }
          }

          function cancelSelection() {
            ipcRenderer.send('screen-picker-cancelled');
          }

          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') cancelSelection();
            if (e.key === 'Enter' && selectedSourceId) confirmSelection();
          });

          renderGrid();
        </script>
      </body>
      </html>
    `;

    pickerWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    const onSelected = (_: any, sourceId: string) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      const chosen = sources.find((s) => s.id === sourceId) || null;
      try {
        if (!pickerWin.isDestroyed()) pickerWin.close();
      } catch {}
      resolve(chosen);
    };

    const onCancelled = () => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      try {
        if (!pickerWin.isDestroyed()) pickerWin.close();
      } catch {}
      resolve(null);
    };

    const cleanup = () => {
      ipcMain.removeListener('screen-picker-selected', onSelected);
      ipcMain.removeListener('screen-picker-cancelled', onCancelled);
    };

    ipcMain.once('screen-picker-selected', onSelected);
    ipcMain.once('screen-picker-cancelled', onCancelled);

    pickerWin.on('closed', () => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve(null);
      }
    });
  });
}

function setupTeamsSession() {
  const teamsSession = session.fromPartition('persist:teams');
  configureSessionHeadersAndPermissions(teamsSession, [
    'media',
    'notifications',
    'camera',
    'microphone',
    'mediaKeySystem',
    'display-capture',
    'clipboard-read',
    'clipboard-sanitized-write',
  ]);
}

function setupOutlookSession() {
  const outlookSession = session.fromPartition('persist:outlook');
  configureSessionHeadersAndPermissions(outlookSession, [
    'media',
    'notifications',
    'mediaKeySystem',
    'clipboard-read',
    'clipboard-sanitized-write',
  ]);
}

function setupAiSession() {
  const aiPartitions = [
    'persist:ai',
    'persist:ai_chatgpt',
    'persist:ai_claude',
    'persist:ai_gemini',
  ];

  const allowedPermissions = [
    'media',
    'notifications',
    'microphone',
    'camera',
    'mediaKeySystem',
    'clipboard-read',
    'clipboard-sanitized-write',
    'display-capture',
  ];

  aiPartitions.forEach((part) => {
    const s = session.fromPartition(part);
    configureSessionHeadersAndPermissions(s, allowedPermissions);
  });
}

// Global handler for webContents, popups, and SSO auth windows
app.on('web-contents-created', (_, contents) => {
  contents.setUserAgent(MODERN_CHROME_UA);

  contents.setWindowOpenHandler(({ url }) => {
    if (
      url.includes('login.microsoftonline.com') ||
      url.includes('teams.microsoft.com') ||
      url.includes('teams.live.com') ||
      url.includes('outlook.office.com') ||
      url.includes('outlook.live.com') ||
      url.includes('outlook.office365.com') ||
      url.includes('office.com') ||
      url.includes('live.com') ||
      url.includes('microsoft.com') ||
      url.includes('msftauth.net') ||
      url.includes('accounts.google.com') ||
      url.includes('google.com') ||
      url.includes('gstatic.com') ||
      url.includes('googleusercontent.com') ||
      url.includes('auth0.openai.com') ||
      url.includes('auth.openai.com') ||
      url.includes('openai.com') ||
      url.includes('chatgpt.com') ||
      url.includes('auth.anthropic.com') ||
      url.includes('claude.ai') ||
      url.includes('anthropic.com') ||
      url.includes('id.atlassian.com') ||
      url.includes('auth.atlassian.com') ||
      url.includes('atlassian.net') ||
      url.includes('atlassian.com') ||
      url.includes('appleid.apple.com')
    ) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    await initDatabase();
    registerIpcHandlers();
    configureSessionHeadersAndPermissions(session.defaultSession, [
      'media',
      'notifications',
      'camera',
      'microphone',
      'mediaKeySystem',
      'display-capture',
      'clipboard-read',
      'clipboard-sanitized-write',
    ]);
    setupTeamsSession();
    setupOutlookSession();
    setupAiSession();
    startReminderScheduler();
    startJiraTokenRefresher();
    createWindow();

    // Auto-sync Microsoft Outlook ICS Calendar and 30-min reminders in background
    setTimeout(() => {
      syncIcsCalendar().catch((err) => console.error('[Auto Sync Calendar Error]:', err));
    }, 1000);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}



app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
