# ⏰ Notificações Integradas da Agenda & Compromissos

## 1. Descrição e Propósito
A funcionalidade de **Notificações da Agenda** integra os eventos sincronizados via ICS e os prazos de tickets diretamente à esteira de notificações nativas do sistema operacional.
- **Finalidade**:
  - Avisar o usuário com antecedência pré-configurada (ex: 5 min, 15 min, 1 hora antes) sobre reuniões, prazos de entrega e compromissos do dia.
  - Sincronizar as datas de início e fim dos eventos baixados pelo serviço de calendário para alimentar o motor do scheduler.
- **Fluxo de Utilização**:
  1. A sincronização de calendário atualiza o cache de eventos ([`calendar-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/calendar-service.ts)).
  2. O serviço identifica eventos que possuem alertas habilitados ou padrão do sistema.
  3. O scheduler agenda o disparo da notificação levando em consideração o fuso horário local.
  4. Quando o horário de antecedência é atingido, o usuário recebe um alerta nativo no Windows com o título e local do evento.
- **Arquivos e Componentes Envolvidos**:
  - [`electron/calendar-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/calendar-service.ts)
  - [`electron/scheduler.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/scheduler.ts)
  - [`src/components/calendar/CalendarView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/calendar/CalendarView.tsx)

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Sim
- **Adiciona/Remove dados?** Cria ou atualiza registros de controle de notificações vinculadas a eventos.
- **Coleções/Tabelas afetadas**:
  - `calendar_events_cache`
  - `reminders` (quando gerados automaticamente com `eventId`)
- **Operações detalhadas**:
  - **Create / Upsert**: Cria lembretes automatizados atrelados ao `eventId`.
  - **Read**: Lê eventos futuros da agenda para calcular o próximo ciclo de notificações.

---

## 3. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | O que foi modificado / Adicionado |
| :--- | :--- | :--- | :--- |
| `v1.0.0` | 2026-08-14 | Antigravity AI | Criação da integração entre eventos de calendário e o despachante de notificações. |
