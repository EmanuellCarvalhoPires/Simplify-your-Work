# 🗄️ Banco de Dados, Coleções e Mapeamento de Requisições

## 1. Descrição e Propósito
O módulo de **Banco de Dados** gerencia toda a persistência de dados do Simplify your Work, operando com arquitetura híbrida de banco de dados embutido local (NeDB / Arquivos JSON estruturados em disco) com suporte a conexão com MongoDB remoto / local.
- **Finalidade**:
  - Garantir o funcionamento 100% offline-first de todas as entidades do sistema.
  - Expor canais seguros via Electron IPC (`contextBridge` em [`preload.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/preload.ts)) para que o processo React Renderer execute operações assíncronas no banco de dados gerenciado pelo processo Main em [`database.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/database.ts).
  - Fornecer métricas de integridade, contagem de registros, backup automático e exportação de dados.
- **Arquivos e Componentes Envolvidos**:
  - [`electron/database.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/database.ts)
  - [`electron/preload.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/preload.ts)
  - [`src/types/index.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/types/index.ts)
  - [`src/types/electron.d.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/types/electron.d.ts)

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Sim (módulo central de controle e execução de todas as transações).
- **Coleções/Tabelas Mantidas**:
  1. `client_assets`: Clientes e ativos cadastrados (com instâncias Jira e vínculos de tickets, notas, eventos e lembretes).
  2. `tickets`: Todos os tickets locais e do Jira.
  3. `notes`: Metadados e caminhos de anotações e arquivos anexos.
  4. `reminders`: Lembretes cadastrados e estados de disparo.
  5. `jira_instances`: Conexões e credenciais de instâncias Jira (API Token / OAuth).
  6. `saved_jql_queries`: Consultas JQL favoritas cadastradas pelo usuário.
  7. `users`: Perfis de usuário com preferências de tema associadas.
  8. `system_settings`: Configurações globais (tema padrão, URI do MongoDB, Client IDs OAuth).
  9. `calendar_events_cache`: Cache de eventos baixados de feeds ICS.

---

## 3. Mapeamento Completo de Todas as Requisições (IPC Channels)

### 🏢 Gestão de Clientes (Assets estilo JSM)
| Canal / Método IPC | Parâmetros | Tipo de Operação | Descrição |
| :--- | :--- | :--- | :--- |
| `getClients` | Nenhum | Read | Retorna todos os clientes cadastrados (`client_assets`) com arrays de vínculos decodificados. |
| `saveClient` | `client: Partial<ClientAsset> & { name }` | Create / Update (Upsert) | Cria novo cliente ou atualiza metadados, instâncias Jira e vínculos transversais. |
| `deleteClient` | `id: string` | Delete | Remove o cliente do banco SQLite preservando os tickets e anotações originais. |

### 📊 Diagnóstico e Manutenção do Banco
| Canal / Método IPC | Parâmetros | Tipo de Operação | Descrição |
| :--- | :--- | :--- | :--- |
| `getDatabaseStats` | Nenhum | Read | Retorna estatísticas de contagem por tabela, caminho do arquivo e integridade. |
| `openDatabaseFolder` | Nenhum | Sistema | Abre a pasta física dos arquivos de dados no Windows Explorer. |
| `showItemInFolder` | `filePath: string` | Sistema | Revela o arquivo selecionado diretamente na sua pasta do Windows Explorer (`shell.showItemInFolder`). |
| `exportDatabaseBackup` | Nenhum | Sistema/Read | Gera cópia compactada ou JSON de backup de todas as coleções. |
| `getMongoStatus` | Nenhum | Read | Verifica o estado da conexão com o MongoDB (conectado / desconectado / URI). |
| `setMongoUri` | `uri: string` | Update | Configura e tenta conectar a uma nova instância do MongoDB. |

### 🎫 Gestão de Tickets
| Canal / Método IPC | Parâmetros | Tipo de Operação | Descrição |
| :--- | :--- | :--- | :--- |
| `getTickets` | Nenhum | Read | Retorna todos os tickets armazenados no banco local. |
| `saveTicket` | `ticket: Partial<Ticket>` | Create / Update (Upsert) | Cria novo ticket local ou atualiza campos de ticket existente. |
| `deleteTicket` | `id: string` | Delete | Remove o ticket com o ID especificado do banco. |
| `deleteTickets` | `ids: string[]` | Batch Delete | Remove múltiplos tickets atomicamente via transação SQLite (`tickets:deleteMany`). |
| `updateTicketStatuses` | `ids: string[], status: TicketStatus, statusLabel?: string` | Batch Update | Atualiza o status de múltiplos tickets atomicamente via transação SQLite (`tickets:updateStatusMany`). |
| `fetchJiraTicket` | `ticketKey, instanceId` | Read / Upsert | Busca issue na API do Jira e grava/atualiza no banco local. |
| `fetchJiraTicketsByJql` | `jqlOrLink, instanceId` | Read / Bulk Upsert | Executa busca JQL e sincroniza em lote prevenindo duplicidade. |
| `addJiraComment` | `ticketId, ticketKey, instanceId?, commentBody` | API Post / Upsert | Envia comentário à API do Jira e persiste localmente. Dispara notificação desktop em falhas. |

### ⏰ Gestão de Lembretes & Notificações
| Canal / Método IPC | Parâmetros | Tipo de Operação | Descrição |
| :--- | :--- | :--- | :--- |
| `getReminders` | Nenhum | Read | Lista todos os lembretes ativos e inativos. |
| `saveReminder` | `reminder: Partial<Reminder>` | Create / Update | Cria ou edita horários, mensagens e recorrências. |
| `deleteReminder` | `id: string` | Delete | Remove o lembrete e desagenda sua execução no timer. |
| `testReminder` | `reminder: Partial<Reminder>` | Disparo Imediato | Emite uma notificação de teste na tela sem salvar no banco. |
| `getNotificationSettings` | Nenhum | Read | Retorna regras de supressão no Teams e agenda. |
| `saveNotificationSettings` | `settings: Partial<NotificationSettings>` | Create / Update | Salva preferências de supressão e adiamento no banco. |
| `checkMeetingStatus` | `forceRefresh?: boolean` | Read (Sistema/Agenda) | Retorna em tempo real se o usuário está em reunião do Teams ou chamada. |
| `showNotification` | `{ title, body }` | Disparo Imediato | Emite notificação nativa do Windows (Windows Toast / Action Center). |

### 📝 Gestão de Anotações & Pastas
| Canal / Método IPC | Parâmetros | Tipo de Operação | Descrição |
| :--- | :--- | :--- | :--- |
| `getNotes` | Nenhum | Read | Retorna lista com metadados de todas as anotações. |
| `readNoteContent` | `filePath: string` | Read (Filesystem) | Lê o conteúdo textual/HTML de uma anotação em disco. |
| `saveNoteContent` | `filePath, title, content` | Update / File Write | Salva alterações no arquivo e atualiza timestamp no banco. |
| `createNote` | `title: string` | Create / File Write | Cria arquivo Markdown vazio e adiciona registro no banco. |
| `createRichNote` | `title: string` | Create / File Write | Cria arquivo RichText formatado e adiciona registro no banco. |
| `saveFileNote` | `fileData` | Create / Binary Write | Anexa documento ou planilha na pasta de arquivos e registra na pasta especificada. |
| `updateNoteMeta` | `note: Partial<NoteItem> & { id }` | Update | Atualiza título, meta e move a anotação para outra pasta (`folderId`). |
| `deleteNote` | `id: string` | Delete / File Unlink | Exclui o registro no banco e remove o arquivo físico do disco. |
| `exportNoteAsTxt` | `content, defaultFileName` | Exportação | Abre diálogo para salvar arquivo `.txt` em pasta do usuário. |
| `saveNoteImage` | `base64Data, ext` | File Write | Salva imagem embutida na pasta de assets locais. |
| `getNoteFolders` | Nenhum | Read | Retorna todas as pastas de anotações cadastradas (`note_folders`), incluindo `parentId` para hierarquia em árvore e `isArchived`. |
| `saveNoteFolder` | `folder: Partial<NoteFolder> & { name }` | Create / Update | Cria ou edita uma pasta de anotações (nome, cor, pasta mãe `parentId` e status `isArchived`), sincronizando o diretório físico no disco. |
| `deleteNoteFolder` | `id: string, deleteContents?: boolean` | Delete / File Unlink / Cascade Update | Exclui a pasta no SQLite e no Windows Explorer. Se `deleteContents = true`, remove recursivamente todos os arquivos e subpastas físicos e registros; se `false`, move o conteúdo para o nível superior e remove o diretório vazio. |
| `openNoteFolder` | `folderId?: string` | Sistema / Shell | Abre a pasta física correspondente diretamente no Windows Explorer. |

### 🔑 Instâncias Jira & OAuth
| Canal / Método IPC | Parâmetros | Tipo de Operação | Descrição |
| :--- | :--- | :--- | :--- |
| `getJiraInstances` | Nenhum | Read | Lista todas as instâncias Jira configuradas. |
| `saveJiraInstance` | `instance: JiraInstance` | Create / Update | Adiciona ou atualiza conexão Jira com credenciais. |
| `deleteJiraInstance` | `id: string` | Delete | Remove a conexão e credenciais da instância. |
| `startAtlassianOAuth` | `clientId?, secret?, proxyUrl?` | Autenticação / Read | Inicia handshake OAuth e retorna sites e tokens de acesso. |
| `cancelAtlassianOAuth` | Nenhum | Sistema | Encerra o servidor local de callback se a autenticação for cancelada. |
| `getSavedJqlQueries` | Nenhum | Read | Lista todas as consultas JQL salvas pelo usuário. |
| `saveJqlQuery` | `query: SavedJqlQuery` | Create / Update | Salva consulta JQL para reaproveitamento rápido. |
| `deleteJqlQuery` | `id: string` | Delete | Remove consulta JQL salva. |

### 👤 Perfis de Usuário & Temas
| Canal / Método IPC | Parâmetros | Tipo de Operação | Descrição |
| :--- | :--- | :--- | :--- |
| `getUsers` | Nenhum | Read | Lista todos os perfis de usuários cadastrados. |
| `getActiveUser` | Nenhum | Read | Retorna o perfil do usuário atualmente selecionado. |
| `setActiveUser` | `id: string` | Update | Alterna a sessão para o usuário com o ID fornecido. |
| `saveUser` | `user: Partial<UserProfile>` | Create / Update | Cria ou atualiza dados cadastrais e tema do usuário. |
| `deleteUser` | `id: string` | Delete | Remove o perfil de usuário. |
| `getThemeSettings` | Nenhum | Read | Carrega as cores do tema atualmente aplicado. |
| `saveThemeSettings` | `theme: ThemeConfig` | Update | Grava a paleta de cores no banco de dados. |

---

## 4. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | O que foi modificado / Adicionado |
| :--- | :--- | :--- | :--- |
| `v1.8.0` | 2026-08-20 | Antigravity AI | Auditoria de integridade e sincronização das definições de `openNoteFolder`, `showItemInFolder` e `openGoogleAuthWindow` em `src/types/index.ts` e `src/types/electron.d.ts`. |
| `v1.7.0` | 2026-08-19 | Antigravity AI | Adicionado campo `isArchived INTEGER DEFAULT 0` tanto na tabela `notes` quanto na tabela `note_folders` do SQLite (com migration automática `ALTER TABLE`) e novo canal IPC `system:showItemInFolder` (`showItemInFolder`) para abrir a localização física de qualquer anotação/documento no Windows Explorer. |
| `v1.6.0` | 2026-08-17 | Antigravity AI | Sincronização completa de tipos do ElectronAPI em `electron.d.ts` e `index.ts`, abrangendo métodos de anotações, visualizador de arquivos, agenda e detecção de reuniões. |
| `v1.5.0` | 2026-08-17 | Antigravity AI | Adicionados canais IPC `tickets:deleteMany` e `tickets:updateStatusMany` para exclusão e atualização atômica de tickets em lote com transações SQLite. |
| `v1.4.0` | 2026-08-17 | Antigravity AI | Adicionado campo `parentId` na tabela `note_folders` e suporte a subpastas aninhadas em árvore com migração SQLite automática. |
| `v1.3.0` | 2026-08-14 | Antigravity AI | Adicionados canais IPC `jira:addComment` (envio à API Jira e sincronização de comentários) e `system:showNotification`. |
| `v1.2.0` | 2026-08-14 | Antigravity AI | Adicionados canais IPC para configurações de supressão de notificações e detecção de reuniões do Microsoft Teams (`teams-detector.ts`). |
| `v1.1.0` | 2026-08-14 | Antigravity AI | Adicionado suporte a MongoDB remoto/local, estatísticas de tabelas e canais de exportação de backup. |
| `v1.0.0` | 2026-08-14 | Antigravity AI | Criação do mecanismo de persistência local offline-first com SQLite e IPC seguro. |
