# 📅 Integração e Sincronização de Agenda ICS (Outlook & Google Calendar)

## 1. Descrição e Propósito
A funcionalidade de **Agenda ICS** permite a importação, download remoto e sincronização periódica de links de calendários no padrão iCalendar (RFC 5545), suportando com total paridade:
- **Microsoft Outlook / Office 365 (Trabalho)**: links `.ics` ou links publicados `.html`.
- **Google Calendar (Pessoal)**: links de endereço secreto no formato iCal (`https://calendar.google.com/calendar/ical/.../basic.ics`) ou links de protocolo `webcal://...`.
- **Feeds ICS Adicionais / Personalizados**: URLs genéricas de feeds iCalendar.

### Finalidade:
- Processar URLs públicas, privadas ou assinadas de feeds `.ics` com conversão automática de protocolos (`webcal://` -> `https://`).
- Realizar o parse completo de eventos `VEVENT`, extraindo resumo, data/hora de início e fim (incluindo suporte a eventos de dia inteiro `allDay`), fuso horário, descrição, localização e regras de recorrência (`RRULE` com `DAILY`, `WEEKLY` com `BYDAY`, `MONTHLY`).
- Sincronização multi-feed unificada ou individual, associando cada evento ao respectivo `calendarId`, `calendarName` e código de cor (ex: `#6366f1` para Outlook e `#10b981` para Google).
- Geração automatizada de lembretes no Windows 30 minutos antes de reuniões de ambas as agendas.

### Fluxo de Utilização:
1. O usuário cadastra a URL da agenda do Outlook e/ou a URL da agenda pessoal do Google Calendar nas Configurações ou diretamente no modal de feeds da Agenda.
2. O serviço de backend Electron [`calendar-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/calendar-service.ts) faz o download HTTPS/HTTP, analisa o payload ICS e extrai os eventos normalizados.
3. Os eventos consolidados são salvos no cache `calendar_events_cache` e disponibilizados para visualização no [`CalendarView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/calendar/CalendarView.tsx), permitindo alternar entre visão unificada e filtros individuais de agenda.

### Arquivos e Componentes Envolvidos:
- [`electron/calendar-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/calendar-service.ts)
- [`electron/main.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/main.ts)
- [`electron/preload.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/preload.ts)
- [`electron/scheduler.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/scheduler.ts)
- [`src/types/index.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/types/index.ts)
- [`src/types/electron.d.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/types/electron.d.ts)
- [`src/components/calendar/CalendarView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/calendar/CalendarView.tsx)
- [`src/components/settings/SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx)

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Sim
- **Adiciona/Remove dados?** Persiste as fontes de feeds no `electron-store` (`ics_calendar_feeds`), armazena o cache consolidado de eventos (`calendar_events_cache`) e cadastra lembretes vinculados no SQLite (`reminders`).
- **Coleções/Tabelas afetadas**:
  - `ics_calendar_feeds` (Electron Store)
  - `calendar_events_cache` (Electron Store)
  - `reminders` (SQLite - Tabela de Lembretes do Sistema)
- **Operações detalhadas**:
  - **Create / Insert**: Salva configuração do feed ICS (`CalendarFeed`) e faz upsert dos eventos recebidos:
    ```typescript
    export interface CalendarFeed {
      id: string; // 'outlook' | 'google' | custom
      name: string;
      url: string;
      type: 'outlook' | 'google' | 'custom';
      color: string;
      enabled: boolean;
      lastSynced?: string;
      eventCount?: number;
    }

    export interface CalendarEvent {
      id: string;
      title: string;
      start: string; // ISO 8601
      end: string;   // ISO 8601
      location?: string;
      description?: string;
      calendarId?: string;
      calendarName?: string;
      color?: string;
      allDay?: boolean;
    }
    ```
  - **Read**: Recupera feeds configurados (`getCalendarFeeds`), eventos em cache (`getCachedEvents`) e agenda alarmes ativos.
  - **Delete / Purge**: Limpa lembretes de reuniões canceladas ou já expiradas no SQLite.

---

## 3. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | O que foi modificado / Adicionado |
| :--- | :--- | :--- | :--- |
| `v1.2.0` | 2026-08-21 | Antigravity AI | **Resolução de Eventos Duplicados e Suporte a Exceções de Recorrência (RFC 5545 `RECURRENCE-ID`)**: 1) Adicionado parsing de `RECURRENCE-ID`, `SEQUENCE` e `LAST-MODIFIED` em [`electron/calendar-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/calendar-service.ts). 2) Exclusão automática de ocorrências originais de séries recorrentes (`exdates`) quando uma ocorrência individual tem o título, horário ou detalhes alterados no Google Calendar ou Outlook. 3) Camada inteligente de deduplicação e sobreposição por slot temporal (`calendarId__start__end__UID`), impedindo que eventos editados gerem instâncias duplicadas lado a lado na agenda. |
| `v1.1.0` | 2026-08-14 | Antigravity AI | Suporte a múltiplos feeds ICS com importação nativa da Agenda Pessoal do Google Calendar, normalização de URLs `webcal://`, tratamento de eventos all-day, vinculação de cores/tags por feed e sincronização individual/unificada. |
| `v1.0.0` | 2026-08-14 | Antigravity AI | Criação inicial do parser ICS, suporte a links Microsoft Outlook e cache de eventos. |
