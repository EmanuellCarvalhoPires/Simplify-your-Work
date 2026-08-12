import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import mongoose from 'mongoose';
import {
  initDatabase,
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
  dbGetReminders,
  dbSaveReminder,
  dbDeleteReminder,
  dbGetNotes,
} from './database';
import { fetchJiraIssue, fetchJiraIssuesByJql } from './jira-service';
import {
  readNoteContent,
  saveNoteContent,
  createNote,
  createRichNote,
  deleteNote,
  exportNoteAsTxt,
  saveNoteImage,
} from './markdown-service';
import { startReminderScheduler, triggerNotification } from './scheduler';
import type { ThemeConfig } from '../src/types/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Windows AppUserModelId so Windows Action Center accepts native notification toasts
if (process.platform === 'win32') {
  app.setAppUserModelId('com.simplifyyourwork.app');
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

function createWindow() {
  const iconPath = path.join(app.getAppPath(), 'public', 'assets', 'app-icon.png');
  const preloadPath = path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 920,
    minWidth: 1000,
    minHeight: 650,
    title: 'Simplify your Work',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    frame: true,
    titleBarStyle: 'default',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Load app HTML
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

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
  // === MONGO STATUS ===
  ipcMain.handle('mongo:getStatus', () => {
    return getMongoStatus();
  });

  ipcMain.handle('mongo:setUri', async (_, uri: string) => {
    return await setMongoUri(uri);
  });

  // === JIRA CREDENTIALS ===
  ipcMain.handle('jira:getInstances', async () => {
    return await dbGetJiraInstances();
  });

  ipcMain.handle('jira:saveInstance', async (_, instance) => {
    return await dbSaveJiraInstance(instance);
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

    const ticket = await fetchJiraIssue(ticketKey, instance);
    return await dbSaveTicket(ticket);
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
    let newCount = 0;
    let updatedCount = 0;

    for (const fresh of fetchedTickets) {
      const existing = existingTickets.find((t) => t.id === fresh.id);

      if (existing) {
        // Merge comments: keep local comments from existing ticket, add fresh Jira comments
        const localComments = (existing.comments || []).filter(
          (c) => c.isLocal || (c.id && String(c.id).startsWith('comm_'))
        );
        const jiraComments = fresh.comments || [];
        const combinedCommentsMap = new Map();

        jiraComments.forEach((c) => combinedCommentsMap.set(c.id, c));
        localComments.forEach((c) => combinedCommentsMap.set(c.id, c));

        const mergedComments = Array.from(combinedCommentsMap.values()).sort(
          (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
        );

        const mergedLinkedTicketIds = Array.from(
          new Set([...(existing.linkedTicketIds || []), ...(fresh.linkedTicketIds || [])])
        );
        const mergedLinkedNoteIds = Array.from(
          new Set([...(existing.linkedNoteIds || []), ...(fresh.linkedNoteIds || [])])
        );

        const mergedTicket: Ticket = {
          ...fresh,
          comments: mergedComments,
          linkedTicketIds: mergedLinkedTicketIds,
          linkedNoteIds: mergedLinkedNoteIds,
        };

        const saved = await dbSaveTicket(mergedTicket);
        savedTickets.push(saved);
        updatedCount++;
      } else {
        const saved = await dbSaveTicket(fresh);
        savedTickets.push(saved);
        newCount++;
      }
    }

    return { tickets: savedTickets, newCount, updatedCount };
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

  ipcMain.handle('notes:create', async (_, title) => {
    return await createNote(title);
  });

  ipcMain.handle('notes:createRich', async (_, title) => {
    return await createRichNote(title);
  });

  ipcMain.handle('notes:saveImage', async (_, { base64Data, ext }) => {
    return await saveNoteImage(base64Data, ext);
  });

  ipcMain.handle('notes:delete', async (_, id) => {
    return await deleteNote(id);
  });

  ipcMain.handle('notes:exportTxt', async (_, { content, defaultFileName }) => {
    return await exportNoteAsTxt(content, defaultFileName);
  });

  // === THEME ===
  ipcMain.handle('theme:get', () => {
    return (store.get('themeConfig') as ThemeConfig) || defaultTheme;
  });

  // === SYSTEM ===
  ipcMain.handle('system:openExternal', async (_, url: string) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });
}

app.whenReady().then(async () => {
  await initDatabase();
  registerIpcHandlers();
  startReminderScheduler();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (e) {
    console.error('Erro ao encerrar a conexão com o MongoDB:', e);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
