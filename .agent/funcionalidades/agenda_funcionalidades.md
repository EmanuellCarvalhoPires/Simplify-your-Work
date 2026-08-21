# 🗓️ Visualizador e Funcionalidades da Agenda

## 1. Descrição e Propósito
A funcionalidade de **Visualização e Gestão da Agenda** fornece uma interface gráfica de alto nível para organização de compromissos diários, semanais e mensais integrados com os feeds do **Microsoft Outlook** e **Google Calendar**, além dos alarmes e lembretes do usuário.

### Finalidade:
- **Resolução de Conflitos Estrita por Cabeçalho & Priorização em Camadas**:
  - A quebra em colunas paralelas (*side-by-side*) ocorre **estritamente** quando um evento começa em cima da zona de cabeçalho do outro (`|startA - startB| < 39 min`), ou seja, quando haveria encobrimento físico do título e horário.
  - Eventos que começam depois do cabeçalho do evento anterior (ex: um evento de trabalho de fundo das 09:00 às 18:00 e compromissos às 10:00, 11:00 ou 14:00) mantêm a **largura total (100%)** com sobreposição em camadas. Eventos menores/mais específicos ganham `zIndex` superior com base na duração (`durationBonus`), garantindo que o evento sobreposto fique sempre por cima. Ao passar o mouse, o evento sob o cursor recebe elevação prioritária (`item.zIndex + 1000`), eliminando qualquer alternância rápida ou flickering.
- **Seção Fixa para Eventos de Dia Inteiro ("Dia todo")**:
  - Eventos de 24h ou sem horário específico são posicionados em uma barra dedicada no topo da grade de dias, despoluindo a linha do tempo horária.
- **Modal de Detalhes Completo do Evento (`EventDetailsModal`)**:
  - Exibição de título, origem (Google Calendar ou Microsoft Outlook), data, duração calculada, localização/link de reunião (com link clicável) e descrição completa.
  - Ação rápida para criar lembretes manuais a partir do evento.
- **Seletor de Visualização de Agendas**:
  - `🌟 Todas as Agendas`: visão unificada com chips de identificação de origem (`Outlook` / `Google`) e cores distintas.
  - `🏢 Microsoft Outlook`: visualização filtrada exclusivamente com compromissos corporativos (destaque em azul/índigo `#6366f1`).
  - `🟢 Google Calendar`: visualização filtrada exclusivamente com compromissos pessoais (destaque em verde esmeralda `#10b981`).
- **Modos de Visualização Completos**:
  - **Dia**: Timeline horária de 24h com marcação de hora atual e eventos em andamento.
  - **Semana**: Grade semanal de 7 colunas com linha de tempo contínua e indicador de hoje.
  - **Mês**: Visão em grade mensal com pílulas coloridas para cada compromisso e contagem de eventos extras.

### Fluxo de Utilização:
1. O usuário acessa a aba **Agenda** na barra lateral de navegação ([`Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx)).
2. O componente [`CalendarView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/calendar/CalendarView.tsx) renderiza os eventos na linha do tempo com posicionamento inteligente em camadas e divisão de colunas restrita a colisões de cabeçalho.
3. Clicar em qualquer evento abre o modal de detalhes com informações completas e atalhos.
4. Alarmes de desktop no Windows disparam automaticamente 30 minutos antes do início de qualquer compromisso.

### Arquivos e Componentes Envolvidos:
- [`src/components/calendar/CalendarView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/calendar/CalendarView.tsx)
- [`src/components/settings/SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx)
- [`electron/calendar-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/calendar-service.ts)

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Sim
- **Adiciona/Remove dados?** Lê eventos em cache e permite criar alarmes/lembretes adicionais no SQLite.
- **Coleções/Tabelas afetadas**:
  - `ics_calendar_feeds` (Electron Store)
  - `calendar_events_cache` (Electron Store)
  - `reminders` (SQLite)
- **Operações detalhadas**:
  - **Read**: Filtra e agrupa eventos para cálculo de colunas paralelas e sobreposição em camadas.
  - **Write**: Criação de lembretes adicionais pelo modal de detalhes do evento.

---

## 3. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | O que foi modificado / Adicionado |
| :--- | :--- | :--- | :--- |
| `v1.4.2` | 2026-08-20 | Antigravity AI | **Hierarquia Estrita de Camadas com `layer` e `hasChildrenAbove`**: Implementado algoritmo de detecção em 2 etapas em `computeEventLayout` ([`CalendarView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/calendar/CalendarView.tsx)). Eventos de fundo (ex: bloco verde de trabalho 09:00-18:00) recebem `layer: 0` e a flag `hasChildrenAbove: true`, com `zIndex` na faixa base (10-34) e elevação máxima controlada no hover (`+20`), impedindo fisicamente que o evento de fundo ultrapasse a base dos eventos contidos (`layer: 1`, `zIndex: 110+`). Os eventos sobrepostos (azuis) mantêm prioridade de clique e hover absoluto (`+500`), permitindo passar o mouse e selecionar diretamente os eventos internos sem interferência ou captura indevida do mouse pelo evento de fundo. |
| `v1.4.1` | 2026-08-20 | Antigravity AI | **Priorização Estrita de Eventos Sobrepostos e Eliminação de Flickering no Hover**: 1) Implementado `durationBonus` no cálculo de `item.zIndex` em `computeEventLayout` no [`CalendarView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/calendar/CalendarView.tsx), garantindo que eventos menores ou mais específicos que ocorrem sobre eventos mais longos de fundo (ex: reuniões dentro do horário de trabalho) tenham naturalmente camada/`zIndex` superior. 2) Corrigida a elevação de `zIndex` no mouse hover para `item.zIndex + 1000` (eliminando o valor estático anterior `60` que fazia o card cair para trás do evento de fundo e entrava em loop infinito de alternância rápida de hover). 3) Isolada a transição CSS em `box-shadow` e `transform` para garantir resposta instantânea do cursor. |
| `v1.4.0` | 2026-08-19 | Antigravity AI | 1) Correção na vinculação de notas a reuniões e eventos recorrentes (`toggleLinkNoteToEvent` no `calendar-service.ts`), sincronizando `baseId` e instâncias pontuais para evitar que a anotação desvincule/desapareça. 2) Correção no preview de anotações vinculadas dentro da Agenda (`CalendarView.tsx`), renderizando conteúdo em HTML/Markdown formatado com sanitização, imagens e tipografia rica em vez de código HTML bruto. |
| `v1.3.4` | 2026-08-17 | Antigravity AI | Correção da passagem de `onOpenFileViewer` no `App.tsx` com declaração de `handleOpenFileViewer` para abrir anexos e documentos vinculados a reuniões diretamente no visualizador embutido. |
| `v1.3.3` | 2026-08-17 | Antigravity AI | Blindagem robusta em `computeEventLayout`, `isEventAllDay`, `fmtTime` e `getDuration` contra eventos sem campo `end`, datas corrompidas ou `NaN` de conversão que provocavam crash no cálculo de posições CSS de timeline. |
| `v1.3.2` | 2026-08-17 | Antigravity AI | Refatoração completa de todos os subcomponentes de `CalendarView.tsx` (`TimelineView`, `DayView`, `WeekView`, `MonthView`, `EventDetailsModal`, `EventNotePickerModal`, `FeedManagerPanel`) de arrow functions `const` para `function declarations`, garantindo hoisting total do JavaScript e eliminando falhas de TDZ (*Cannot access before initialization*). |
| `v1.3.1` | 2026-08-17 | Antigravity AI | Correção de erro de inicialização (`ReferenceError` na TDZ por constantes de estilo `filterPillStyle`/`navBtnStyle` declaradas no fim do arquivo) e adição de sanitização segura em `getCachedEvents` para prevenir tela vazia/preta ao acessar a Agenda. |
| `v1.3.0` | 2026-08-17 | Antigravity AI | Adicionada a capacidade de **atribuir e vincular anotações/documentos a reuniões** da agenda (`linkedNoteIds`), com seletor `EventNotePickerModal`, criação rápida de atas (`+ Criar Ata`), visualização e preview embutido no modal de detalhes (`EventDetailsModal`) e sincronização no módulo de Clientes (`MeetingPreviewModal`). |
| `v1.2.1` | 2026-08-17 | Antigravity AI | Ajuste da quebra em colunas para ocorrer estritamente quando há conflito de cabeçalho (início de um evento sobrepondo o nome e horário do outro), mantendo sobreposição em largura total nos demais casos (eventos posteriores dentro de eventos de longa duração). |
| `v1.2.0` | 2026-08-17 | Antigravity AI | Implementação de algoritmo de detecção de conflitos, linha dedicada para eventos de Dia Inteiro e modal completo de detalhes do evento. |
| `v1.1.0` | 2026-08-14 | Antigravity AI | Adicionado seletor de visualização individual/combinada (Todas as Agendas, Microsoft Outlook, Google Calendar), badges temáticos por feed e painel de gerenciamento de feeds. |
| `v1.0.0` | 2026-08-14 | Antigravity AI | Criação da tela de calendário com suporte aos modos Dia, Semana e Mês com timeline horária. |
