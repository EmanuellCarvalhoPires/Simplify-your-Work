# 📝 Detalhes, Edição e Modal de Tickets

## 1. Descrição e Propósito
A funcionalidade de **Detalhes e Edição de Tickets** fornece uma visão aprofundada de cada item de trabalho (seja local ou importado do Jira), permitindo a edição de campos, inclusão de comentários, checklist de subtarefas, anexos e vínculos com anotações.
- **Finalidade**:
  - Exibir título, descrição rica, prioridade, status, datas de início/vencimento e responsáveis.
  - Adicionar comentários com sincronização automática direta na API do Jira (quando o ticket for originado do Jira) ou salvamento local.
  - Exibir badges visuais diferenciando comentários sincronizados da API (`JIRA`) e comentários registrados localmente (`LOCAL`).
  - Notificar o usuário imediatamente (notificação desktop e toast) caso ocorra erro ao enviar o comentário para o Jira, preservando o texto localmente.
  - **Exclusão de Comentários Locais**: Permite ao usuário excluir comentários criados localmente no aplicativo através de botão dedicado ("Excluir") com confirmação e persistência imediata no SQLite.
  - Vincular notas existentes (`linkedNoteIds`) para acesso rápido à documentação do ticket.
  - Adicionar subtarefas/checklist interno para controle fino da execução da tarefa.
  - Anexar arquivos e visualizá-los diretamente no app.
- **Fluxo de Utilização**:
  1. O usuário clica no card de um ticket no Kanban ([`TicketCard.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/TicketCard.tsx)).
  2. O modal [`TicketDetailModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/TicketDetailModal.tsx) é aberto com todos os detalhes carregados.
  3. Ao digitar um comentário e clicar em "Enviar ao Jira" / "Comentar", o sistema posta o comentário via API Jira ou salva localmente, informando o status ao usuário em tempo real.
  4. Para comentários locais (`LOCAL`), é exibido o botão "Excluir", permitindo remover o comentário com confirmação.
  5. Qualquer edição em títulos, datas, status ou comentários é salva no banco local através de `saveTicket`.
- **Arquivos e Componentes Envolvidos**:
  - [`src/components/tickets/TicketDetailModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/TicketDetailModal.tsx)
  - [`src/components/tickets/TicketBoard.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/TicketBoard.tsx)
  - [`src/components/tickets/AddLocalTicketModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/AddLocalTicketModal.tsx)
  - [`src/components/common/FileViewerModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/FileViewerModal.tsx)
  - [`electron/jira-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/jira-service.ts)
  - [`electron/database.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/database.ts)

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Sim
- **Adiciona/Remove dados?** Modifica tickets, adiciona/remove comentários (locais ou remotos do Jira), vínculos de notas e anexos.
- **Coleções/Tabelas afetadas**:
  - `tickets`
- **Operações detalhadas**:
  - **Update**: Atualiza o documento `Ticket` com novas propriedades (comentários, labels, datas, prioridade, checklist):
    ```typescript
    {
      ...ticket,
      comments: [...ticket.comments, newComment],
      linkedNoteIds: updatedNoteIds,
      updatedAt: new Date().toISOString()
    }
    ```
  - **Delete**: `deleteTicket(id)` remove o ticket do banco se solicitado pelo usuário.

---

## 3. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | O que foi modificado / Adicionado |
| :--- | :--- | :--- | :--- |
| `v1.0.0` | 2026-08-14 | Antigravity AI | Criação do modal de detalhes com comentários, checklist, datas e vinculação de notas. |
| `v1.1.0` | 2026-08-14 | Antigravity AI | Inclusão do campo dedicado "Status no Jira" no modal de detalhes do ticket, exibindo o status remoto vindo da API sem poluir a tabela. |
| `v1.2.0` | 2026-08-14 | Antigravity AI | Integração do envio de comentários para API do Jira com feedback de carregamento, aviso de erro no modal e fallback para persistência local. |
| `v1.3.0` | 2026-08-14 | Antigravity AI | Adicionada funcionalidade de exclusão de comentários locais com diálogo de confirmação e sincronização no SQLite. |
| `v1.5.0` | 2026-08-17 | Antigravity AI | Destacado o badge do **Status oficial do Jira** (`jiraStatus` / `statusLabel`) no cabeçalho superior (`topHeader`) do modal de detalhes do Ticket e mantido nos campos da barra lateral. |
| `v1.4.0` | 2026-08-14 | Antigravity AI | Adicionado botão "Enviar ao Jira" diretamente nos cards de comentários locais pendentes, convertendo-os automaticamente para comentários com badge oficial `JIRA` (`isLocal: false`) após o envio com sucesso. |
