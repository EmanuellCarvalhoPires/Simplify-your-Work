# 🔄 Integração Jira & Importação por JQL / Chave

## 1. Descrição e Propósito
A funcionalidade de **Integração com o Jira** conecta o aplicativo às APIs REST do Jira Cloud / Server para buscar, importar em lote e sincronizar tickets e consultas JQL salvas.
- **Finalidade**:
  - Buscar tickets individuais por chave (ex: `PROJ-123`).
  - Executar filtros JQL complexos ou importar tickets a partir de links diretos de filtros do Jira.
  - Salvar consultas JQL frequentes (`savedJqlQueries`) para importação e atualização recorrente com 1 clique.
  - **Prevenção de Duplicidade**: Identificar tickets já existentes no banco local por chave (`key`) e instância (`jiraInstanceId`), informando ao usuário contadores exatos de tickets novos (`newCount`), atualizados (`updatedCount`) e ignorados/existentes (`existingCount`, `existingKeys`).
  - **Envio Bidirecional de Comentários (Interno vs Externo)**: Ao comentar em um ticket do Jira, o usuário pode alternar entre 🔒 **Nota Interna (Padrão)** e 🌐 **Resposta ao Cliente / Externo**. O comentário é enviado automaticamente à API REST com a propriedade `sd.public.comment` (ou endpoint Service Desk), garantindo que notas internas fiquem restritas à equipe técnica e respostas externas fiquem visíveis para clientes.
  - **Notificação e Fallback de Erro**: Em caso de falha de autenticação, erro de rede ou falta de permissão, o sistema dispara imediatamente uma Notificação Desktop Nativa no Windows e Toast no app, salvando o comentário localmente para evitar perda de dados.
- **Fluxo de Utilização**:
  1. O usuário clica em "Adicionar Jira" no quadro de tickets ([`AddJiraModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/AddJiraModal.tsx)).
  2. Seleciona a instância conectada e digita a Chave da Issue ou uma query JQL.
  3. O backend [`jira-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/jira-service.ts) faz as requisições autenticadas (OAuth ou API Token), faz o mapeamento dos campos (título, descrição, prioridade, responsável, labels, datas e comentários) e salva os novos tickets no banco local.
  4. No modal de detalhes do ticket ([`TicketDetailModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/TicketDetailModal.tsx)), novos comentários inseridos pelo usuário são postados diretamente na API do Jira via `electronAPI.addJiraComment`.
- **Arquivos e Componentes Envolvidos**:
  - [`src/components/tickets/AddJiraModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/AddJiraModal.tsx)
  - [`src/components/tickets/TicketDetailModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/TicketDetailModal.tsx)
  - [`src/components/tickets/TicketBoard.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/TicketBoard.tsx)
  - [`electron/jira-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/jira-service.ts)
  - [`electron/main.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/main.ts)
  - [`electron/preload.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/preload.ts)
  - [`electron/database.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/database.ts)

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Sim
- **Adiciona/Remove dados?** Insere tickets sincronizados do Jira, atualiza lista de comentários remotos e armazena queries JQL salvas.
- **Coleções/Tabelas afetadas**:
  - `tickets`
  - `saved_jql_queries`
- **Operações detalhadas**:
  - **Create / Upsert**: Insere tickets com `source: 'JIRA'` contendo dados da API:
    ```typescript
    {
      id: string;
      key: string;
      source: 'JIRA';
      title: string;
      description: string;
      status: TicketStatus;
      priority?: string;
      assignee?: string;
      reporter?: string;
      labels: string[];
      comments: JiraComment[];
      jiraInstanceId: string;
      updatedAt: string;
      createdAt: string;
    }
    ```
  - **Create / Read / Delete**: Salva, lista e remove consultas na coleção `saved_jql_queries`.

---

## 3. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | O que foi modificado / Adicionado |
| :--- | :--- | :--- | :--- |
| `v1.0.0` | 2026-08-14 | Antigravity AI | Criação da importação por chave e consulta JQL com suporte a Basic Auth e OAuth. |
| `v1.1.0` | 2026-08-14 | Antigravity AI | Implementação de prevenção de duplicidade, contadores de novos/existentes e salvamento de queries favoritas. |
| `v1.2.0` | 2026-08-14 | Antigravity AI | Separação explícita entre `status` local da tarefa e `jiraStatus` remoto do Jira, preservando o fluxo local e sincronizando o status do Jira via API. |
| `v1.3.0` | 2026-08-14 | Antigravity AI | Implementação do envio bidirecional de comentários para o Jira via API REST (ADF / JSON) com notificação desktop e visual em caso de falha. |
| `v1.7.0` | 2026-08-21 | Antigravity AI | **Atualização Automática de Instância de Origem & Exclusão em Cascata**: 1) Ao buscar tickets por JQL (`jira:fetchTicketsByJql`) ou Chave (`jira:fetchTicket`), caso o ticket já exista no app, a sua instância de origem (`jiraInstanceId`) é automaticamente atualizada para a instância selecionada no modal, juntamente com a sincronização de título, descrição, labels, comentários remotos e status remoto (preservando o status e comentários locais). 2) Mensagens de feedback aprimoradas no modal ([`AddJiraModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/AddJiraModal.tsx)) notificando sucesso na atualização de tickets existentes. 3) Garantido que todos os tickets não-locais possuam instância atribuída no SQLite ([`electron/database.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/database.ts)). 4) Ao deletar uma instância Jira das Configurações, todos os tickets daquela instância são removidos em cascata do banco e da interface. |
| `v1.6.0` | 2026-08-21 | Antigravity AI | **Correção de Escopo do Helper `isCommentInternalFromJira`**: Movida a função utilitária `isCommentInternalFromJira` para o escopo global/módulo de [`electron/jira-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/jira-service.ts), corrigindo o erro de execução `ReferenceError: isCommentInternalFromJira is not defined` que impedia a importação e busca de tickets por JQL (`jira:fetchTicketsByJql`). |
| `v1.5.0` | 2026-08-20 | Antigravity AI | **Suporte e Distinção entre Comentários Internos e Externos no Jira**: 1) Adicionado seletor visual de abas no modal de detalhes do ticket ([`TicketDetailModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/TicketDetailModal.tsx)) permitindo escolher entre 🔒 **Nota Interna (Padrão)** e 🌐 **Resposta ao Cliente (Externo)**. 2) O envio padrão é **sempre Nota Interna** (`isInternal: true`), integrando com a propriedade `sd.public.comment` do Jira Cloud ADF e endpoint Jira Service Desk API. 3) Identificação e exibição de badges contextuais (🔒 `INTERNO` / 🌐 `EXTERNO`) nos comentários já cadastrados. |
| `v1.4.0` | 2026-08-14 | Antigravity AI | Garantia de que comentários enviados com sucesso (tanto novos quanto locais reenviados) sejam classificados e exibidos como comentários oficiais do JIRA (`isLocal: false`). |

