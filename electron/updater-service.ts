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

function formatUpdaterError(err: any): string {
  if (!err) return 'Erro desconhecido ao verificar atualizações';
  const str = typeof err === 'string' ? err : (err.message || String(err));

  if (str.includes('404') || str.includes('releases.atom') || str.includes('Cannot find latest') || str.includes('latest.yml')) {
    return 'Nenhuma Release publicada no GitHub ainda (ou repositório privado). Publique a primeira versão em Releases no GitHub para liberar o download automático.';
  }
  if (str.includes('ENOTFOUND') || str.includes('ERR_INTERNET_DISCONNECTED') || str.includes('timeout')) {
    return 'Sem conexão com a internet para checar novas versões no momento.';
  }
  if (str.includes('authentication token') || str.includes('Bad credentials')) {
    return 'Repositório GitHub privado ou autenticação necessária para baixar releases.';
  }
  const cleanLine = str.split('\n')[0].trim();
  return cleanLine.length > 140 ? cleanLine.substring(0, 140) + '...' : cleanLine;
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
    const errorMsg = formatUpdaterError(err);
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
      const cleanErr = formatUpdaterError(err);
      sendStatusToWindow({
        state: 'error',
        errorMessage: cleanErr,
      });
      return { error: cleanErr };
    }
  });

  ipcMain.handle('updater:downloadUpdate', async () => {
    sendStatusToWindow({ state: 'downloading', progress: 0 });
    try {
      return await autoUpdater.downloadUpdate();
    } catch (err: any) {
      const cleanErr = formatUpdaterError(err);
      sendStatusToWindow({
        state: 'error',
        errorMessage: cleanErr,
      });
      return { error: cleanErr };
    }
  });

  ipcMain.handle('updater:quitAndInstall', () => {
    autoUpdater.quitAndInstall(false, true);
  });
}
