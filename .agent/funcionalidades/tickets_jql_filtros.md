# 🔍 Filtros JQL e Seções de JQL Salvas para Tickets

## 1. Descrição e Propósito
A funcionalidade de **Filtros JQL e Seções Salvas** permite aos usuários filtrar instantaneamente a listagem e o quadro de tickets (tanto importados do Jira quanto criados localmente) utilizando a sintaxe JQL (Jira Query Language), além de organizar visões rápidas através de seções customizadas e persistentes de JQL salvas.

- **Finalidade**:
  - Avaliar em tempo real consultas JQL digitadas livremente pelo usuário no frontend (ex: `status in ("In Progress", "TO_DO") AND priority = "High" AND assignee = currentUser()`).
  - Substituir os antigos botões estáticos de filtro por status por uma barra dinâmica de **Seções de JQL Salvas** com contadores em tempo real.
  - Oferecer seções padrão do sistema (`Todos os Tickets`, `Em Andamento`, `A Fazer`, `Meus Tickets`, `Aguardando / Bloqueado`, `Concluídos`).
  - Permitir salvar qualquer consulta JQL digitada como uma nova seção personalizada persistente.
  - Possibilitar a exclusão e gestão das seções personalizadas criadas pelo usuário.
  - Integrar botão de sincronização direta com a API do Jira para puxar novos tickets com base no JQL atual.

- **Fluxo de Utilização**:
  1. O usuário acessa a aba de Tickets (`TicketBoard.tsx`).
  2. Clica em qualquer uma das seções JQL salvas ou digita uma expressão no campo de JQL.
  3. O motor `jqlEvaluator.ts` faz a análise sintática (tokenização e AST) e filtra os tickets na Tabela e no Kanban imediatamente.
  4. O usuário pode clicar em "+ Salvar como Seção" ou no botão "Salvar Seção" para nomear e persistir o filtro nos favoritos.
  5. Seções personalizadas exibem botão de exclusão rápida (`×`) no card/pill.

- **Avaliação em Tempo Real**:
  - Para tickets do Jira, a cláusula `status` avalia diretamente o status real importado da API do Jira (`ticket.statusLabel` como "Fechado", "Cancelado", "Revisão", "In Progress", "A Fazer", etc.) em vez de buckets locais sintéticos.
  - Para tickets criados localmente, avalia o status selecionado pelo usuário.
  - Suporta normalização insensível a maiúsculas/minúsculas e acentos (ex: `Revisão` matches `revisao`, `Concluído` matches `concluido`).

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Sim
- **Adiciona/Remove dados?** Salva e remove registros de consultas JQL favoritas.
- **Coleções/Tabelas afetadas**:
  - `saved_jql_queries`
- **Operações detalhadas**:
  - **Create / Update**: `saveJqlQuery({ id, name, jql, jiraInstanceId, createdAt })` persiste seções JQL criadas na barra de tickets.
  - **Read**: `getSavedJqlQueries()` carrega as seções salvas do usuário para exibição nas abas/pills.
  - **Delete**: `deleteJqlQuery(id)` remove seções JQL personalizadas quando o usuário exclui o chip.

---

## 3. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | O que foi modificado / Adicionado |
| :--- | :--- | :--- | :--- |
| `v1.0.0` | 2026-08-14 | Antigravity AI | Criação do motor `jqlEvaluator.ts`, barra de busca JQL em tempo real e substituição dos filtros de status por seções de JQL salvas interativas. |
| `v1.1.0` | 2026-08-14 | Antigravity AI | Ajuste para avaliar o status original importado do Jira (`statusLabel`) no JQL em vez dos agrupamentos locais do app. |
