# 🚀 Guia Definitivo: Fluxo Automatizado de Releases & Auto-Updater no Electron com GitHub Actions

Este documento é um guia passo a passo completo para implementar o mesmo sistema de **atualização automática e distribuição contínua (CI/CD)** utilizado no Simplify your Work em qualquer aplicativo desktop Electron (React, Vue ou HTML/JS puro).

---

## 🏗️ 1. Como Funciona a Arquitetura

1. **GitHub Actions (CI/CD na Nuvem):** Ao alterar a versão no `package.json` e fazer `git push`, o GitHub inicia uma máquina virtual Windows, compila seu projeto e gera o executável `.exe`, o mapa de blocos `.blockmap` e o manifesto `latest.yml`.
2. **GitHub Releases:** Os binários são publicados diretamente na aba Releases do seu repositório oficial com tag de versão.
3. **`electron-updater` (No Aplicativo Instalado):** O aplicativo Electron consulta periodicamente as Releases públicas do GitHub. Ao detectar uma nova versão, abre um modal interativo perguntando se o usuário deseja baixar e reiniciar para aplicar.

---

## 📦 2. Dependências Necessárias

Instale os pacotes essenciais de build e auto-update no seu projeto:

```bash
npm install electron-updater
npm install --save-dev electron-builder
```

---

## ⚙️ 3. Configuração do `package.json`

No seu `package.json`, adicione o bloco `"publish"` dentro de `"build"` apontando para o seu repositório no GitHub, e configure os scripts de execução:

```json
{
  "name": "meu-app-electron",
  "version": "1.0.0",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "dist": "npm run build && electron-builder",
    "release": "npm run build && electron-builder --publish always"
  },
  "build": {
    "appId": "com.meuapp.app",
    "productName": "Meu App Electron",
    "publish": {
      "provider": "github",
      "owner": "SEU_USUARIO_GITHUB",
      "repo": "NOME_DO_REPOSITORIO"
    },
    "directories": {
      "output": "dist-installer"
    },
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

---

## 🛡️ 4. Configuração do `.gitignore`

> ⚠️ **Crítico:** O GitHub rejeita commits com arquivos acima de 100 MB. Certifique-se de que as pastas de compilação e binários estejam no `.gitignore`.

Adicione ao seu `.gitignore`:

```gitignore
node_modules
dist
dist-electron
dist-installer
release
*.exe
*.blockmap
*.asar
```

---

## 🤖 5. Workflow do GitHub Actions (`.github/workflows/release.yml`)

Crie o arquivo `.github/workflows/release.yml` na raiz do seu repositório:

```yaml
name: Build & Publish Release

on:
  push:
    branches:
      - main
    paths:
      - 'package.json'
    tags:
      - 'v*'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  release:
    name: Build & Publish Windows App
    runs-on: windows-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Application
        run: npm run build

      - name: Build and Publish Release to GitHub
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx electron-builder --publish always
```

---

## 🔒 6. Permissões no Repositório GitHub (Passo Único)

Para permitir que o GitHub Actions crie e anexe arquivos nas Releases:

1. No seu repositório no GitHub, clique em **Settings**.
2. No menu lateral esquerdo, vá em **Actions** > **General**.
3. Role até a seção **Workflow permissions**.
4. Selecione a opção: **"Read and write permissions"** (Permissões de leitura e gravação).
5. Clique em **Save**.

---

## 🖥️ 7. Código do Backend Electron (`electron/updater-service.ts`)

Crie o serviço responsável por gerenciar as atualizações no processo principal:

```typescript
import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain, Notification } from 'electron';

export interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  progress?: number;
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
  if (str.includes('404') || str.includes('latest.yml')) {
    return 'Nenhuma Release publicada no GitHub ainda (ou repositório privado).';
  }
  return str.split('\n')[0].trim();
}

export function initAutoUpdater(win: BrowserWindow) {
  targetWindow = win;

  // Controle estrito: Não baixa nem instala sem a confirmação do usuário
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => sendStatusToWindow({ state: 'checking' }));
  
  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow({ state: 'available', version: info.version });
    if (Notification.isSupported()) {
      new Notification({
        title: '🚀 Nova Atualização Disponível!',
        body: `A versão v${info.version} está disponível para download.`,
      }).show();
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow({ state: 'not-available', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    sendStatusToWindow({ state: 'error', errorMessage: formatUpdaterError(err) });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendStatusToWindow({
      state: 'downloading',
      progress: Math.round(progressObj.percent || 0),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow({ state: 'downloaded', version: info.version });
  });
}

export function registerUpdaterIpc() {
  ipcMain.handle('updater:getStatus', () => currentStatus);
  ipcMain.handle('updater:checkForUpdates', async () => {
    sendStatusToWindow({ state: 'checking', errorMessage: undefined });
    try {
      return await autoUpdater.checkForUpdates();
    } catch (err: any) {
      const cleanErr = formatUpdaterError(err);
      sendStatusToWindow({ state: 'error', errorMessage: cleanErr });
      return { error: cleanErr };
    }
  });

  ipcMain.handle('updater:downloadUpdate', async () => {
    sendStatusToWindow({ state: 'downloading', progress: 0 });
    try {
      return await autoUpdater.downloadUpdate();
    } catch (err: any) {
      const cleanErr = formatUpdaterError(err);
      sendStatusToWindow({ state: 'error', errorMessage: cleanErr });
      return { error: cleanErr };
    }
  });

  ipcMain.handle('updater:quitAndInstall', () => {
    autoUpdater.quitAndInstall(false, true);
  });
}
```

---

## 🌉 8. Exposição no Preload (`electron/preload.ts`)

Exponha as chamadas IPC para o frontend de forma segura via `contextBridge`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getUpdateStatus: () => ipcRenderer.invoke('updater:getStatus'),
  checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('updater:downloadUpdate'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('updater:quitAndInstall'),
  onUpdateStatus: (callback: (status: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('updater:status', handler);
    return () => ipcRenderer.removeListener('updater:status', handler);
  },
});
```

---

## 🎨 9. Integração no Frontend (React / App.tsx)

No seu componente principal (ex: `App.tsx`), adicione a verificação suave 2.5s após a inicialização e escute os eventos para exibir um modal de confirmação:

```tsx
import React, { useState, useEffect } from 'react';

export default function App() {
  const [updateStatus, setUpdateStatus] = useState<any>({ state: 'idle' });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // 1. Escuta mudanças de status
    if (window.electronAPI?.onUpdateStatus) {
      const unsubscribe = window.electronAPI.onUpdateStatus((status) => {
        if (status) {
          setUpdateStatus(status);
          if (status.state === 'available' || status.state === 'downloaded') {
            setShowModal(true);
          }
        }
      });
      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    // 2. Busca automática suave após abrir o app
    const timer = setTimeout(async () => {
      if (window.electronAPI?.checkForUpdates) {
        try {
          await window.electronAPI.checkForUpdates();
        } catch (e) {}
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleDownload = () => window.electronAPI?.downloadUpdate();
  const handleInstall = () => window.electronAPI?.quitAndInstallUpdate();

  return (
    <div>
      {/* Conteúdo do seu App */}

      {/* Modal de Atualização */}
      {showModal && updateStatus.state === 'available' && (
        <div className="modal">
          <h3>🚀 Nova Versão Disponível: v{updateStatus.version}!</h3>
          <p>Deseja atualizar o aplicativo agora?</p>
          <button onClick={handleDownload}>Atualizar Agora</button>
          <button onClick={() => setShowModal(false)}>Lembrar Mais Tarde</button>
        </div>
      )}

      {showModal && updateStatus.state === 'downloading' && (
        <div className="modal">
          <p>Baixando atualização: {updateStatus.progress || 0}%</p>
        </div>
      )}

      {showModal && updateStatus.state === 'downloaded' && (
        <div className="modal">
          <h3>✨ Download Concluído!</h3>
          <button onClick={handleInstall}>Reiniciar & Aplicar</button>
        </div>
      )}
    </div>
  );
}
```

---

## 🚀 10. Como Lançar uma Nova Versão no Dia a Dia

Uma vez configurado o fluxo acima, para lançar uma nova versão:

1. Altere a `"version"` no seu `package.json` (ex: `"1.0.1"`).
2. Envie o commit para a branch `main`:
   ```bash
   git commit -am "release: v1.0.1"
   git push origin main
   ```
3. **Pronto!** O GitHub Actions compilará o projeto e anexará o instalador `.exe`, o `latest.yml` e o `.blockmap` na Release automaticamente. Todos os usuários com o app aberto receberão a notificação para atualizar!
