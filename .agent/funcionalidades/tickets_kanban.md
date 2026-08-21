# 📊 Quadro Kanban de Tarefas e Tickets

## 1. Descrição e Propósito
A funcionalidade de **Quadro Kanban** fornece a interface central para gerenciamento de fluxo de trabalho do usuário, combinando tickets importados do Jira e tickets criados localmente no mesmo painel visual.
- **Finalidade**:
  - Organizar tickets nas colunas de status padrão: `BACKLOG`, `TO_DO`, `NEXT`, `IN_PROGRESS`, `WAITING_CLIENT` e `DONE`.
  - Permitir a movimentação de cards entre colunas via arrastar-e-soltar (Drag-and-Drop) ou seleção rápida de status.
  - Exibir badges visuais de prioridade, etiquetas (labels), contadores de comentários e indicador de origem (`JIRA` vs `LOCAL`).
  - Fornecer filtros por texto, responsável, etiquetas, instância do Jira e seções dinâmicas de JQL salvas.
  - **Seleção Múltipla & Operações em Lote**: Permite selecionar múltiplos tickets simultaneamente (tanto na visão Lista quanto no Kanban) para exclusão em lote e alteração de status em lote através de uma Floating Action Bar.
- **Fluxo de Utilização**:
  1. O usuário acessa a visão de Tickets ([`TicketBoard.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/TicketBoard.tsx)).
  2. Filtra por seções JQL salvas ou digita queries JQL livres com avaliação em tempo real.
  3. As colunas ([`TicketColumn.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/TicketColumn.tsx)) distribuem os cards ([`TicketCard.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/TicketCard.tsx)).
  4. O usuário pode marcar checkboxes individuais nos cards ou na tabela, ou clicar em "Selecionar todos os visíveis".
  5. Uma Floating Action Bar surge na parte inferior permitindo alterar status em lote ou abrir o modal de confirmação de exclusão em lote.
  6. Ao confirmar exclusão em lote, os tickets são removidos atomicamente do SQLite via `dbDeleteTickets`.
- **Arquivos e Componentes Envolvidos**:
  - [`src/components/tickets/TicketBoard.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/TicketBoard.tsx)
  - [`src/utils/jqlEvaluator.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/utils/jqlEvaluator.ts)
  - [`src/components/tickets/TicketColumn.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/TicketColumn.tsx)
  - [`src/components/tickets/TicketCard.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/TicketCard.tsx)
  - [`electron/database.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/database.ts)
  - [`electron/main.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/main.ts)
  - [`electron/preload.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/preload.ts)

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Sim
- **Adiciona/Remove dados?** Modifica status e remove tickets em lote ou individualmente.
- **Coleções/Tabelas afetadas**:
  - `tickets`
- **Operações detalhadas**:
  - **Read**: `getTickets()` carrega todos os tickets para distribuição nas colunas/tabela.
  - **Update**: `saveTicket({ id, status, updatedAt })` e `updateTicketStatuses(ids, status, statusLabel)` persistem as mudanças de status (inclusive em lote com transações SQLite).
  - **Delete**: `deleteTicket(id)` e `deleteTickets(ids)` removem registros de forma única ou atômica em lote no SQLite.

---

## 3. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | O que foi modificado / Adicionado |
| :--- | :--- | :--- | :--- |
| `v1.3.0` | 2026-08-21 | Antigravity AI | **Preview Completo e Navegação Direta de Anotações Linkadas**: 1) Adicionados botões de ação rápida no card de cada anotação vinculada (`Prévia`, `Ir para Anotação` e `Desvincular`) em [`TicketDetailModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/TicketDetailModal.tsx). 2) Suporte a preview de notas Markdown, RichText (HTML) e Anexos/Arquivos via [`FileViewerModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/FileViewerModal.tsx). 3) Botão de redirecionamento imediato no cabeçalho do popup de prévia e nos cards para alternar automaticamente para a aba *Anotações* e focar na nota selecionada. |
| `v1.2.0` | 2026-08-17 | Antigravity AI | Implementação de seleção múltipla de tickets (tabela e Kanban), Floating Action Bar, exclusão em lote com modal de confirmação e alteração em lote de status. |
| `v1.1.0` | 2026-08-14 | Antigravity AI | Integração com seções de JQL salvas e motor de filtragem JQL em tempo real. |
| `v1.0.0` | 2026-08-14 | Antigravity AI | Criação do quadro Kanban completo com colunas reativas e persistência em banco de dados. |
