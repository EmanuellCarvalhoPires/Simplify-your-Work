# ⚙️ Configurações do Sistema & Customização de Temas

## 1. Descrição e Propósito
A funcionalidade de **Configurações do Sistema** permite gerenciar a personalização visual completa do aplicativo, parametrização de banco de dados, gestão de instâncias de integração e credenciais do Atlassian OAuth.
- **Finalidade**:
  - **Customização de Temas**: Edição de cores principais de fundo (`bgMain`, `bgSidebar`, `bgHeader`), cores de cards Jira e do App (`bgCardJira`, `bgCardApp`), cor de destaque (`accentPrimary`) e tipografia.
  - **Gerenciador de Instâncias Jira**: Adicionar, editar, testar e excluir conexões com Jira (OAuth ou API Token).
  - **Credenciais OAuth**: Configuração personalizada de Atlassian Client ID, Client Secret e URL de Proxy Serverless.
  - **Status e Backup do Banco de Dados**: Diagnóstico de integridade, contagem de registros por coleção, abertura da pasta física de dados e exportação de backups.
- **Fluxo de Utilização**:
  1. O usuário acessa o menu Configurações ([`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx)).
  2. Ajusta as cores do tema ou seleciona um preset predefinido (Dark Slate, Cyberpunk, Light, etc.).
  3. Clica em "Salvar Configurações" — os temas e variáveis CSS são aplicados dinamicamente em todo o DOM do app e persistidos no banco.
- **Arquivos e Componentes Envolvidos**:
  - [`src/components/settings/SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx)
  - [`electron/database.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/database.ts)
  - [`src/types/index.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/types/index.ts)

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Sim
- **Adiciona/Remove dados?** Modifica parâmetros globais e configurações de tema do usuário ativo.
- **Coleções/Tabelas afetadas**:
  - `system_settings`
  - `users` (quando as cores são salvas no perfil ativo)
- **Operações detalhadas**:
  - **Read**: `getThemeSettings()`, `getDatabaseStats()`, `getMongoStatus()`, `getAtlassianClientId()`, etc.
  - **Update**: `saveThemeSettings(theme)`, `saveAtlassianClientId(id)`, `saveAtlassianClientSecret(secret)`.

---

## 3. Histórico de Versões e Modificações
| `v2.2.1` | 2026-08-20 | Antigravity AI | **Reconciliação e Normalização Automática de Provedores de IA e Sites nos Tópicos**: Implementada a função `normalizeSidebarConfig` em [`Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx) e [`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx), garantindo que provedores de IA habilitados (como Claude ou ChatGPT) e novos sites fiquem sempre agrupados dentro de seus tópicos correspondentes (*Agentes de IA* e *Microsoft*), eliminando botões soltos/desalinhados no rodapé da barra lateral e exibindo todos os itens na lista de ordenação de configurações. |
| `v2.2.0` | 2026-08-20 | Antigravity AI | **Atualização da Estrutura Padrão da Barra Lateral & Sites Padrão**: Atualizada a constante `DEFAULT_SIDEBAR_CONFIG` e `DEFAULT_CUSTOM_SITES` em [`Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx) definindo a nova ordem padrão: 1) Tópico **MICROSOFT** (Outlook, Teams, OneDrive); 2) Tópico **AGENTES DE IA** (Gemini, Claude, ChatGPT); 3) Módulos principais (Agenda, Anotações, Clientes, Lembretes, Tickets). |
| `v2.1.0` | 2026-08-20 | Antigravity AI | **Correção do Handler de Persistência da Barra Lateral**: Declarada a função `handleSaveSidebarConfig` em [`src/App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx) para salvar atualizações de layout da barra lateral no `localStorage` (`simplify_sidebar_config`) e propagá-las reativamente para o estado global. |
| `v2.0.0` | 2026-08-20 | Antigravity AI | **Resolução de Tela Vazia & Camada Global de Estabilidade (RootErrorBoundary + DevTools)**:<br>1. Criado [`RootErrorBoundary`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/main.tsx) no topo da árvore React que captura qualquer falha inesperada na renderização de componentes, exibindo interface de diagnóstico com botões de recarregamento rápido, limpeza de cache local, cópia de stack trace e abertura de DevTools.<br>2. Adicionado timeout defensivo no carregamento inicial de dados em [`src/App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx) para liberar a interface caso alguma requisição IPC demore ou fique pendente.<br>3. Adicionados atalhos globais de teclado no Electron (`F12`, `Ctrl+Shift+I` para abrir/fechar DevTools, `F5` e `Ctrl+R` para recarregar) e handlers de erro de carregamento em [`electron/main.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/main.ts).<br>4. Sanitização defensiva em [`Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx) e [`Header.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Header.tsx) contra valores nulos ou corrompidos. |
| `v1.9.0` | 2026-08-20 | Antigravity AI | **Cadastro e Gestão de Sites Personalizados**: Adicionada ferramenta completa na aba 'Barra Lateral & Tópicos' para cadastrar novos sites/aplicativos web com nome, URL, seleção entre 14 ícones visuais, 12 cores e escolha de tópico de destino, com suporte a edição, exclusão e reordenação. |
| `v1.8.0` | 2026-08-20 | Antigravity AI | **Aba de Gerenciamento da Barra Lateral & Tópicos**: Adicionada nova seção no painel de configurações para gerenciar a ordenação dos botões e agrupar itens em tópicos visuais não-colapsáveis (ex: Microsoft, Agentes de IA), com criação/exclusão de tópicos, movimentação rápida de itens e prévia em tempo real. |
| `v1.7.0` | 2026-08-19 | Antigravity AI | **Correção do Logo/Ícone no Instalador NSIS e Executável Instalado**: <br>1. Atualizado [`scripts/convert-assets.mjs`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/scripts/convert-assets.mjs) para gerar arquivo `.ico` multi-resolução contendo todos os tamanhos padrão (16, 24, 32, 48, 64, 128, 256px) e copiar os ícones para a pasta `build/` (`icon.ico`, `installerIcon.ico`, `uninstallerIcon.ico`, `icon.png`).<br>2. Atualizado [`package.json`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/package.json) vinculando a conversão de assets nos scripts `build`, `pack` e `dist`, e adicionando a configuração dos ícones do instalador NSIS (`installerIcon`, `uninstallerIcon`, `installerHeaderIcon`).<br>3. Ajustada a resolução de ícones no runtime em [`electron/main.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/main.ts) (`resolveAppIcon()`) e [`electron/scheduler.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/scheduler.ts) para buscar primeiro em `app.getAppPath()` dentro do ASAR em produção. |
| `v1.6.0` | 2026-08-19 | Antigravity AI | Suporte a **Reordenação Arrastável (Drag & Drop)** dos botões e módulos do painel na barra lateral ([`Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx)), com feedback visual de linha de encaixe e persistência automática da ordem preferida do usuário no `localStorage` (`simplify_sidebar_order`). |
| `v1.5.0` | 2026-08-19 | Antigravity AI | Configurada abertura automática da janela principal sempre maximizada (`mainWindow.maximize()` na criação e no evento `ready-to-show` em `electron/main.ts`). |
| `v1.4.0` | 2026-08-19 | Antigravity AI | Remoção da barra de menu nativa do sistema operacional (`File, Edit, View, Window`) via `autoHideMenuBar: true`, `mainWindow.removeMenu()` e `Menu.setApplicationMenu(null)` em `electron/main.ts` para deixar o visual mais limpo e moderno. |
| `v1.3.0` | 2026-08-17 | Antigravity AI | **Configuração e geração do instalador e executável (`electron-builder`)**: Ajustado `package.json` com `npmRebuild: false` e `asarUnpack` para empacotar os binários nativos do `better-sqlite3` sem exigir compilador C++/Visual Studio no Windows, gerando com sucesso os executáveis em `dist-installer/` (Instalador NSIS e Versão Portátil). |
| `v1.2.0` | 2026-08-17 | Antigravity AI | Atualizado o cálculo de 'Tamanho em Disco' para computar a totalidade de dados do app (SQLite + WAL/SHM + notas + anexos + backups). |
| `v1.1.0` | 2026-08-14 | Antigravity AI | Adicionadas abas de diagnóstico de banco de dados, exportação de backup e credenciais Atlassian OAuth. |
| `v1.0.0` | 2026-08-14 | Antigravity AI | Criação do painel de configurações com editor de tema CSS em tempo real e gestão de instâncias. |
