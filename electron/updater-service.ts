import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain, Notification } from 'electron';

export interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  releaseDate?: string;
  releaseNotes?: string;
  progress?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  errorMessage?: string;
}

let currentStatus: UpdateStatus = { state: 'idle' };
let targetWindow: BrowserWindow | null = null;

function sendStatusToWindow(status: UpdateStatus) {
  currentStatus = { ...currentStatus, ...status };
  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.webContents.send('updater:status', currentStatus);
  }
}

export function initAutoUpdater(win: BrowserWindow) {
  targetWindow = win;

  // Don't auto-download immediately without notifying, but allow one-click download or auto-check
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow({ state: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow({
      state: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
    });

    try {
      if (Notification.isSupported()) {
        new Notification({
          title: '🚀 Nova Atualização Disponível!',
          body: `A versão v${info.version} do Simplify your Work está pronta para download.`,
          icon: undefined,
        }).show();
      }
    } catch (e) {}
  });

  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow({
      state: 'not-available',
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    const errorMsg = err == null ? 'Erro desconhecido ao verificar atualizações' : (err.message || String(err));
    sendStatusToWindow({
      state: 'error',
      errorMessage: errorMsg,
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendStatusToWindow({
      state: 'downloading',
      progress: Math.round(progressObj.percent || 0),
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow({
      state: 'downloaded',
      version: info.version,
    });

    try {
      if (Notification.isSupported()) {
        new Notification({
          title: '✨ Atualização Baixada com Sucesso!',
          body: `A versão v${info.version} foi baixada. Reinicie o aplicativo para aplicar as novidades.`,
          icon: undefined,
        }).show();
      }
    } catch (e) {}
  });

  // Check for updates on startup after 15 seconds (only in packaged production build)
  setTimeout(() => {
    try {
      if (process.env.NODE_ENV !== 'development') {
        autoUpdater.checkForUpdates().catch(() => {});
      }
    } catch (e) {}
  }, 15000);
}

export function registerUpdaterIpc() {
  ipcMain.handle('updater:getStatus', () => {
    return currentStatus;
  });

  ipcMain.handle('updater:checkForUpdates', async () => {
    sendStatusToWindow({ state: 'checking', errorMessage: undefined });
    try {
      const result = await autoUpdater.checkForUpdates();
      return result;
    } catch (err: any) {
      sendStatusToWindow({
        state: 'error',
        errorMessage: err.message || 'Falha ao buscar atualizações no repositório.',
      });
      throw err;
    }
  });

  ipcMain.handle('updater:downloadUpdate', async () => {
    sendStatusToWindow({ state: 'downloading', progress: 0 });
    try {
      return await autoUpdater.downloadUpdate();
    } catch (err: any) {
      sendStatusToWindow({
        state: 'error',
        errorMessage: err.message || 'Falha ao baixar atualização.',
      });
      throw err;
    }
  });

  ipcMain.handle('updater:quitAndInstall', () => {
    autoUpdater.quitAndInstall(false, true);
  });
}
