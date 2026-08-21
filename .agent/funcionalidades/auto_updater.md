# 🚀 Sistema de Atualizações Automáticas (Auto-Updater)

## 1. Descrição e Propósito
A funcionalidade de **Atualizações Automáticas (Auto-Updater)** permite que o aplicativo verifique, baixe e instale novas versões diretamente dos lançamentos oficiais (GitHub Releases) sem exigir que o usuário baixe instaladores manualmente ou execute scripts locais.

- **Finalidade**:
  - Verificar periodicamente em segundo plano se há novas versões disponíveis.
  - Oferecer verificação manual sob demanda com 1 clique na aba **Configurações > Atualizações**.
  - Exibir barra de progresso em tempo real durante o download da nova versão.
  - Disparar notificações desktop nativas no Windows informando quando uma atualização foi encontrada e quando terminou de baixar.
  - Aplicar a atualização e reiniciar o aplicativo de forma transparente com `quitAndInstallUpdate()`.
- **Fluxo de Utilização**:
  1. O usuário acessa a aba **Atualizações** em [`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx).
  2. Clica em **"Verificar Atualizações"**.
  3. O backend [`updater-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/updater-service.ts) consulta o repositório GitHub configurado no [`package.json`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/package.json).
  4. Se houver nova versão, o usuário clica em **"Baixar Atualização"**.
  5. Ao concluir o download, surge o botão **"Reiniciar & Aplicar Agora"** para atualizar o app instantaneamente.
- **Arquivos e Componentes Envolvidos**:
  - [`electron/updater-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/updater-service.ts)
  - [`electron/main.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/main.ts)
  - [`electron/preload.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/preload.ts)
  - [`src/components/settings/SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx)
  - [`src/types/electron.d.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/types/electron.d.ts)
  - [`package.json`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/package.json)

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Não.
- **Adiciona/Remove dados?** Não. A funcionalidade gerencia binários e metadados de versão da aplicação.

---

## 3. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | O que foi modificado / Adicionado |
| :--- | :--- | :--- | :--- |
| `v1.0.0` | 2026-08-21 | Antigravity AI | **Criação do Sistema de Auto-Updater**: 1) Integração do pacote `electron-updater` e criação do serviço [`electron/updater-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/updater-service.ts). 2) Configuração do provedor GitHub em [`package.json`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/package.json). 3) Exposição de IPCs de verificação, download, status e reinicialização em [`electron/preload.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/preload.ts). 4) Criação da aba visual de **Atualizações** em [`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx) com barra de progresso, status em tempo real e notificações desktop. |
