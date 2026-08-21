# 🏢 Clientes (Assets estilo Jira Service Management)

## 1. Descrição e Propósito
A funcionalidade de **Clientes (Assets)** centraliza todas as entidades e recursos do ecossistema do Simplify your Work em torno de um **Cliente / Ativo Organizacional**, seguindo o mesmo paradigma de **Assets / Objetos do Jira Service Management (JSM)**.

- **Posicionamento**:
  - Localizado diretamente na barra lateral de navegação ([`Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx)), **logo abaixo de "Anotações"** e acima de "Lembretes".
  - Ícone: `Briefcase`.

- **Atribuição Transversal de Recursos**:
  - **Instâncias Jira**: Associação de instâncias Atlassian/Jira cadastradas (Cloud ID, domínios, tokens).
  - **Tickets**: Vínculo com tickets locais e tickets do Jira, com contadores de status e atalhos para abrir diretamente no quadro Kanban ou criar novos tickets específicos para o cliente.
  - **Anotações & Documentos**: Vínculo com notas Markdown/RichText e pastas inteiras de documentos anexos (PDF, Word, Excel, CSV).
  - **Agenda & Reuniões**: Vínculo com compromissos e reuniões importados dos feeds do Google Calendar e Microsoft Outlook (ICS).
  - **Lembretes & Alarmes**: Vínculo com alertas e notificações agendadas.

- **Criação Automática via OAuth Atlassian 3LO**:
  - Ao realizar a autenticação automática pelo botão *"Entrar com Conta Atlassian (Automático)"*, o backend cria ou atualiza automaticamente um Cliente (Asset) para cada instância Jira autorizada, associando o domínio e os metadados do site.

- **Interface Unificada em Fluxo Contínuo ([`ClientsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/clients/ClientsView.tsx))**:
  - **Coluna Lateral de Assets**: Busca em tempo real, filtros por status (Ativo, Prospect, Inativo, Arquivado), cartões com bordas coloridas e badges com contadores de tickets, notas e reuniões.
  - **Painel de Detalhes Completo em Página Única**:
    - **Header**: Nome, status, ID do asset, e-mail/telefone e ações rápidas (Editar / Excluir).
    - **Barra de Atalhos Rápidos (Jump Pills)**: Botões fixos com âncoras de rolagem suave para navegação instantânea.
    - **Seção 1: Visão Geral & Métricas**: Métricas consolidadas (tickets abertos/concluídos, notas, reuniões, instâncias conectadas) e cartões das instâncias Jira vinculadas.
    - **Seção 2: Tickets Vinculados**: Lista completa de tickets com status, atalhos de abertura e botões para vincular ou criar tickets.
    - **Seção 3: Anotações & Documentos**: Lista de notas e arquivos anexos vinculados com data de atualização.
    - **Seção 4: Reuniões & Agenda**: Lista de compromissos da agenda (Google e Outlook) associados ao cliente.
    - **Seção 5: Lembretes & Alarmes**: Lista de lembretes e alarmes programados.

- **Visualização de Clientes/Assets como Pastas no Editor de Anotações ([`NoteEditor.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/notes/NoteEditor.tsx))**:
  - Clientes cadastrados aparecem automaticamente organizados como pastas interativas no painel lateral de anotações com ícone `Briefcase`, borda e cor temáticas e badge `Asset`.
  - **Agrupamento Automático**: Todos os documentos, anotações e arquivos vinculados (`linkedNoteIds` ou `note.clientId`) são filtrados e renderizados sob a pasta daquele cliente.
  - **Drag & Drop**: Arrastar e soltar qualquer anotação/arquivo sobre a pasta do cliente vincula o item imediatamente ao cliente.
  - **Menu de Contexto do Cliente**: Criação de novas notas/anexos direcionados ao cliente, atalho para abrir a ficha no módulo de Clientes e modal `ManageClientLinksModal` para pesquisar e gerenciar vínculos em massa.
  - **Badge e Dropdown no Topo da Nota**: Visualização de chip do cliente na nota ativa e opção de mover para a pasta de qualquer cliente no dropdown superior.

- **Modal de Criação e Edição ([`ClientModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/clients/ClientModal.tsx))**:
  - **Nome** (*obrigatório*);
  - **Descrição / Escopo** (*opcional*);
  - **Instâncias Jira Cadastradas** (seleção múltipla com prévia de domínio e badges);
  - **Status do Cliente** (`ACTIVE`, `PROSPECT`, `INACTIVE`, `ARCHIVED`);
  - **Paleta de Cores do Card** (presets de cores temáticas);
  - **E-mail e Telefone de Contato** (*opcionais*).

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Sim.
- **Adiciona/Remove dados?** Cria, edita e remove clientes e vínculos em tabelas do SQLite.
- **Coleções/Tabelas afetadas**:
  - `client_assets` (nova tabela):
    - `id TEXT PRIMARY KEY`
    - `name TEXT NOT NULL`
    - `description TEXT DEFAULT ''`
    - `status TEXT NOT NULL DEFAULT 'ACTIVE'`
    - `color TEXT DEFAULT '#6366f1'`
    - `icon TEXT DEFAULT 'building'`
    - `instanceIds TEXT DEFAULT '[]'`
    - `linkedTicketIds TEXT DEFAULT '[]'`
    - `linkedNoteIds TEXT DEFAULT '[]'`
    - `linkedFolderIds TEXT DEFAULT '[]'`
    - `linkedEventIds TEXT DEFAULT '[]'`
    - `linkedReminderIds TEXT DEFAULT '[]'`
    - `contactEmail TEXT DEFAULT ''`
    - `contactPhone TEXT DEFAULT ''`
    - `createdAt TEXT NOT NULL`
    - `updatedAt TEXT NOT NULL`
  - `tickets` (coluna `clientId TEXT DEFAULT ''`)
  - `notes` (coluna `clientId TEXT DEFAULT ''`)
  - `note_folders` (coluna `clientId TEXT DEFAULT ''`)
  - `reminders` (coluna `clientId TEXT DEFAULT ''`)

- **Operações e Métodos CRUD**:
  - `dbGetClients()`: Retorna todos os clientes cadastrados com arrays de IDs decodificados.
  - `dbSaveClient(client)`: Insere ou atualiza cliente com validação de nome obrigatório.
  - `dbDeleteClient(id)`: Remove o registro do cliente sem apagar os recursos originais (tickets, notas, reuniões).
  - `dbCreateClientFromJiraInstance(instance)`: Cria ou atualiza automaticamente o asset/cliente vinculado a uma instância Jira cadastrada via OAuth.

---

## 3. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | Detalhamento do que foi modificado |
| :--- | :--- | :--- | :--- |
| `v1.7.4` | 2026-08-20 | Antigravity AI | **Blindagem contra `TypeError: filter of undefined` na Renderização de Clientes**: 1) Adicionados valores padrão defensivos (`= []`) e guarda `(array || [])` para todas as propriedades de lista (`clients`, `tickets`, `notes`, `folders`, `calendarEvents`, `reminders`, `jiraInstances`) em [`ClientsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/clients/ClientsView.tsx). 2) Passadas as props completas de tickets, lembretes, instâncias Jira e handlers no [`src/App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx). |
| `v1.7.3` | 2026-08-19 | Antigravity AI | **Blindagem Definitiva do Drag & Drop de Pastas para Clientes / Assets**: 1) Implementados `useRef` atômicos (`draggedFolderIdRef` e `draggedNoteIdRef`) que preservam a identidade da pasta/nota mesmo se o evento nativo do browser disparar `onDragEnd` ou closure do React antes do término do drop. 2) Adicionado `pointerEvents: 'none'` nos botões e textos da caixa tracejada do cliente durante o arraste, impedindo que os elementos filhos cancelem nativamente o evento de drop. 3) Drop target estendido para toda a lista expandida do cliente (`styles.folderNotesList`). |
| `v1.7.2` | 2026-08-19 | Antigravity AI | **Modal de Gestão de Vínculos com Abas de Pastas e Notas & Atalhos de Menu**: 1) Modal `ManageClientLinksModal` atualizado com abas dedicadas para **Pastas** e **Anotações**, permitindo marcar e desmarcar pastas inteiras para vincular/desvincular ao cliente com um clique. 2) Adicionado menu de atalhos rápidos **"🏢 Vincular a Cliente"** no menu de 3 pontinhos de cada pasta para movimentação instantânea. 3) Reforçada a detecção de pastas no evento de drop do cliente. |
| `v1.7.1` | 2026-08-19 | Antigravity AI | **Inclusão de Pastas Completas dentro de Assets & Reordenação Livre**: 1) Suporte para aninhar pastas e subpastas inteiras dentro de assets de clientes (`folder.clientId` e `client.linkedFolderIds`). 2) **Drag & Drop de Pastas**: Arrastar qualquer pasta sobre o nó do cliente vincula a pasta e todas as suas anotações ao cliente. 3) **Criação Direta de Subpastas**: Menu de 3 pontinhos do cliente e caixa vazia com ação `+ Subpasta` para criar pastas já direcionadas ao cliente. 4) Seletor de localização no modal de pastas com suporte ao grupo `🏢 Clientes & Assets`. |
| `v1.7.0` | 2026-08-19 | Antigravity AI | **Visualização de Clientes/Assets como Pastas no Editor de Anotações & Agrupamento Automático**: 1) Os clientes/assets cadastrados passam a ser exibidos como pastas organizacionais de primeiro nível na árvore lateral do editor de notas (`NoteEditor.tsx`), com cor customizada, ícone `Briefcase`, badge `Asset` e contador dinâmico de itens vinculados. 2) **Agrupamento Automático**: Notas e arquivos vinculados (`linkedNoteIds` ou `note.clientId`) são filtrados e renderizados sob a pasta do respectivo cliente. 3) **Drag & Drop**: Suporte a arrastar notas/arquivos sobre a pasta do cliente para vinculação imediata com feedback visual e auto-expansão. 4) **Ações Rápidas & Modal de Vínculos**: Menu de 3 pontinhos com "+ Nota", "+ Arquivo", "Gerenciar Anotações Vinculadas" (modal com busca e seleção em lote) e atalho para abrir no módulo de Clientes. 5) **Seleção de Destino**: Dropdown de pastas do editor e modal de criação de notas agora incluem as opções de clientes/assets. |
| `v1.6.3` | 2026-08-17 | Antigravity AI | **Adição dos filtros rápidos "Hoje" e "Amanhã" no seletor de período**: Incluídas as opções `🔴 Hoje` e `🟡 Amanhã` na barra de períodos de reuniões do modal `LinkItemPickerModal`, permitindo filtrar instantaneamente apenas os compromissos do dia atual ou do dia seguinte. |
| `v1.6.2` | 2026-08-17 | Antigravity AI | **Correção de persistência das faixas coloridas dos clientes na barra lateral**: Implementada faixa física colorida dedicada (`position: absolute`, `width: 5px`, `backgroundColor: clientColor`) nos cards de clientes e de reuniões, eliminando o conflito de precedência da propriedade CSS shorthand `border` que sobrescrevia o `borderLeft` colorido ao selecionar uma opção. |
| `v1.6.1` | 2026-08-17 | Antigravity AI | **Correção de ordenação cronológica e cálculo de datas relativas**: (1) Ajustado o cálculo de `dayDiff` para comparar datas em `00:00:00`, eliminando falso "Amanhã" em eventos do período da tarde de hoje; (2) Ordenação padrão ajustada para **Cronológica Crescente a partir de hoje** (*Hoje 09:30 ➔ 11:00 ➔ 15:30 ➔ Amanhã 10:00 ➔ 11:00 ➔ Próximos dias*). |
| `v1.6.0` | 2026-08-17 | Antigravity AI | **Aprimoramento completo dos filtros e ordenação no modal de vinculação de reuniões (`LinkItemPickerModal`)**: (1) Classificação estrita e sem falso-positivos entre Google e Outlook; (2) Adicionados filtros de período temporal (*⚡ Recentes & Próximas (Foco Atual)*, *📅 Próximos 30 dias*, *🗓️ Este Mês*, *⏪ Últimos 30 dias*, *🌐 Todo o Histórico*); (3) Ordenação inteligente (*⚡ Do Mais Próximo ao Mais Distante*, *🔽 Recentes / Futuras*, *🔼 Antigas*); (4) Tags de proximidade relativa (*Hoje, Amanhã, Em X dias, Há X dias*) e formatação humanizada de horários. |
| `v1.5.1` | 2026-08-17 | Antigravity AI | **Correção no filtro de reuniões da agenda**: Ajustada a lógica de identificação do provedor de calendário (`calendarId` e `calendarName`) tanto no modal de vinculação (`LinkItemPickerModal`) quanto na aba Visão Geral. Removida a checagem que buscava termos como "teams" ou "meet" na descrição/localização do evento, eliminando falsos positivos onde reuniões do Google eram exibidas sob o filtro Outlook. |
| `v1.5.0` | 2026-08-17 | Antigravity AI | Adicionada na aba **Visão Geral**, logo abaixo do painel de instâncias Jira, a lista consolidada de todos os recursos vinculados ao cliente (*Tickets, Anotações/Docs, Reuniões e Lembretes*) no formato de cartões em linhas arredondadas, com suporte completo a **ordenação manual (Drag-and-Drop / botões Subir e Descer)**, ordenação por tipo/data/A-Z, e clique direto para abrir previews embutidos. |
| `v1.4.0` | 2026-08-17 | Antigravity AI | Adicionado filtro por provedor de calendário (**Todas / Outlook / Google**) no modal `LinkItemPickerModal` para seleção e vinculação rápida de reuniões ao asset/cliente. |
| `v1.3.0` | 2026-08-17 | Antigravity AI | Implementação de modais de **Preview Embutidos** para todos os recursos vinculados ao cliente (*Tickets, Anotações, Documentos/Arquivos, Reuniões e Lembretes*), permitindo visualizar, ler, copiar e interagir com qualquer item sem sair ou ser redirecionado para fora do módulo de Clientes. |
| `v1.2.0` | 2026-08-17 | Antigravity AI | Restauração da navegação clássica por abas dedicadas (*Visão Geral, Tickets, Anotações, Reuniões e Lembretes*) com design limpo e fluido, tornando os cartões de estatísticas interativos para alternância imediata de abas. |
| `v1.1.0` | 2026-08-17 | Antigravity AI | Tentativa de unificação de todas as seções na mesma página com barra de âncoras. |
| `v1.0.0` | 2026-08-17 | Antigravity AI | Criação inicial do módulo de **Clientes (Assets estilo Jira Service Management)**, adicionado na barra lateral abaixo de Anotações, com tabela SQLite `client_assets`, IPCs `clients:getAll`, `clients:save`, `clients:delete`, componentes `ClientsView` (split view com abas de Visão Geral, Tickets, Anotações, Reuniões e Lembretes), modal `ClientModal`, criação automática de assets para instâncias Jira no login OAuth Atlassian e suporte a vínculos transversais de tickets, notas, reuniões da agenda e lembretes. |
