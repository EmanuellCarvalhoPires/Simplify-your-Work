# 🔇 Supressão de Lembretes Durante Reuniões (Microsoft Teams & Agenda)

## 1. Descrição e Propósito
A funcionalidade de **Supressão de Lembretes em Reuniões** evita que notificações e sons do Simplify your Work interrompam o usuário durante reuniões, apresentações e chamadas de vídeo/áudio no **Microsoft Teams** ou durante compromissos em andamento na **Agenda (Outlook / Google Calendar)**.

### Fluxo de Funcionamento:
1. **Detecção Híbrida em Tempo Real**:
   - **Janelas & Processos do Sistema (Windows)**: Inspeciona via script PowerShell os processos `ms-teams.exe`, `Teams.exe` e navegadores com reuniões do Teams abertas, verificando se há janelas ativas contendo títulos de chamada (`| Microsoft Teams`, `Reunião`, `Meeting`, `Chamada`, `Call`).
   - **Agenda ICS & Calendários**: Verifica se há eventos e reuniões agendadas ocorrendo no momento atual (`start <= now <= end`).
   - **Micro-cache**: Resultados são cacheados por 4 segundos para manter o consumo de CPU em níveis desprezíveis.
2. **Intervenção no Agendador (`scheduler.ts`)**:
   - Antes de disparar qualquer toast ou som no Windows (`triggerNotification`), o agendador consulta `shouldSuppressNotification()`.
   - Se uma reunião for detectada e a configuração estiver ativa, a notificação é silenciada e adiada.
3. **Pós-Reunião (Adiar Notificações)**:
   - Se `postponeMutedReminders` estiver ativado, o lembrete permanece em fila para ser disparado imediatamente após o término da reunião.
4. **Interface & Configurações**:
   - Aba **"Notificações & Reuniões"** em **Configurações** (`SettingsView.tsx`), permitindo ativar/desativar as regras e visualizar o status do detector em tempo real.
   - Banner informativo na tela de **Lembretes** (`ReminderManager.tsx`) quando o modo silencioso estiver ativo.

### Arquivos e Componentes Envolvidos:
- [`electron/teams-detector.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/teams-detector.ts): Módulo central de detecção e preferências.
- [`electron/scheduler.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/scheduler.ts): Lógica de suspensão/adiamento no agendador.
- [`electron/main.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/main.ts): IPC handlers para status e configurações.
- [`electron/preload.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/preload.ts): Exposição segura da API.
- [`src/types/index.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/types/index.ts): Interfaces `NotificationSettings` e `MeetingStatus`.
- [`src/components/settings/SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx): Aba de gerenciamento e monitoramento ao vivo.
- [`src/components/reminders/ReminderManager.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/reminders/ReminderManager.tsx): Indicador visual do status da reunião.

---

## 2. Impacto no Banco de Dados
- **Altera o banco**: Sim (persiste chave-valor de configurações).
- **Coleção/Tabela**: `app_settings` (SQLite) + fallback `electron-store`.
- **Chave de Configuração**: `'notification_settings'`
- **Esquema de Dados**:
  ```json
  {
    "muteInTeamsMeetings": true,
    "muteInCalendarMeetings": false,
    "postponeMutedReminders": true
  }
  ```
- **Operações**:
  - `SELECT value FROM app_settings WHERE key = 'notification_settings'`
  - `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('notification_settings', ?)`

---

## 3. Histórico de Versões e Modificações

| Versão | Data | Autor / Agente | Detalhamento do que foi modificado |
| :--- | :--- | :--- | :--- |
| **v1.1.0** | 21/08/2026 | Antigravity AI | Correção de repetição contínua de logs no console ao pausar lembretes durante reuniões, introduzindo deduplicação de logs via Set em memória (`loggedPausedReminders`), execução sequencial com flag `isChecking` para evitar concorrência e disparo correto pós-reunião. |
| **v1.0.0** | 14/08/2026 | Antigravity AI | Criação da funcionalidade de supressão inteligente de lembretes em reuniões do Teams e Agenda, integração com `scheduler.ts`, endpoints IPC e interface de controle em `SettingsView.tsx`. |
