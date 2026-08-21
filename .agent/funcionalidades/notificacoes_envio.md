# 🔔 Mecanismo de Envio de Notificações Desktop

## 1. Descrição e Propósito
A funcionalidade de **Envio de Notificações Desktop** é responsável por alertar o usuário através de notificações nativas do sistema operacional (Windows Toast Notifications / Electron Notification API).
- **Finalidade**:
  - Garantir que o usuário receba avisos em tempo real mesmo com a aplicação minimizada na bandeja do sistema (System Tray).
  - Gerenciar a fila de execução em segundo plano através de um temporizador de alta precisão no processo principal do Electron.
  - Reproduzir alertas sonoros ou exibir botões de ação para abrir o app diretamente no item notificado.
- **Fluxo de Utilização**:
  1. O motor [`scheduler.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/scheduler.ts) roda em background checando a cada ciclo os lembretes ativos e horários programados.
  2. Ao atingir o momento programado, instancia um objeto `Notification` nativo do Electron:
     ```typescript
     new Notification({
       title: reminder.title,
       body: reminder.message,
       icon: iconPath,
       silent: false
     }).show();
     ```
  3. Atualiza o carimbo `lastTriggered` no banco de dados para evitar disparos duplicados em loop.
- **Arquivos e Componentes Envolvidos**:
  - [`electron/scheduler.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/scheduler.ts)
  - [`electron/teams-detector.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/teams-detector.ts)
  - [`electron/main.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/main.ts)
  - [`electron/preload.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/preload.ts)

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Sim
- **Adiciona/Remove dados?** Atualiza metadados dos lembretes executados e preferências de supressão em `app_settings`.
- **Coleções/Tabelas afetadas**:
  - `reminders`
  - `app_settings`
- **Operações detalhadas**:
  - **Update**: Atualiza o campo `lastTriggered` com o timestamp ISO 8601 atual. Para lembretes silenciados em reunião com adiamento ativo, preserva o status para disparar logo após a reunião terminar.

---

## 3. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | O que foi modificado / Adicionado |
| :--- | :--- | :--- | :--- |
| `v1.0.0` | 2026-08-14 | Antigravity AI | Criação do motor de scheduler e disparo nativo de notificações Electron. |
| `v1.1.0` | 2026-08-14 | Antigravity AI | Correção na lógica de temporização para evitar disparos duplicados ou perda de eventos com app minimizado. |
| `v1.2.0` | 2026-08-14 | Antigravity AI | Integração com `teams-detector.ts` para suspender notificações automaticamente durante chamadas do Microsoft Teams ou reuniões da Agenda. |
