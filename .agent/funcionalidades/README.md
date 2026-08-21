# 📚 Catálogo Central de Documentação de Funcionalidades

Esta pasta armazena o arquivo Markdown individual e dedicado para cada componente e funcionalidade do aplicativo **Simplify your Work**, em conformidade com a [Regra de Documentação Modular](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/regra_documentacao_funcionalidades.md).

---

## 🗂️ Índice Completo de Funcionalidades Documentadas

### 1. 🔐 Autenticação & Acesso
- [`oauth.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/oauth.md): Fluxo de autenticação OAuth 2.0 (Atlassian Cloud / Google), servidor de callback local e tokens.
- [`cadastro_token.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/cadastro_token.md): Cadastro manual de API Tokens Jira e credenciais de acesso direto.
- [`cadastro_usuario.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/cadastro_usuario.md): Gerenciamento de perfis de usuário, alternância de contas e preferências visuais.

### 2. 📅 Agenda & Integrações ICS
- [`agenda_ics.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/agenda_ics.md): Sincronização periódica, download remoto, parser RFC 5545 e cache de calendários.
- [`agenda_funcionalidades.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/agenda_funcionalidades.md): Visualizador de calendário (mês/semana/dia), filtros e correlação com tarefas.

### 3. ⏰ Lembretes & Notificações
- [`lembretes_criacao.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/lembretes_criacao.md): Criação e edição de lembretes com recorrência única, diária ou intervalada.
- [`notificacoes_envio.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/notificacoes_envio.md): Motor de background (`scheduler.ts`) e disparo de notificações nativas no Windows/Desktop.
- [`notificacoes_agenda.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/notificacoes_agenda.md): Alertas automáticos pré-programados baseados em horários de eventos da agenda.
- [`lembretes_supressao_reunioes.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/lembretes_supressao_reunioes.md): Supressão e adiamento inteligente de notificações durante reuniões do Microsoft Teams e da Agenda.

### 4. 📝 Anotações & Visualizador de Arquivos
- [`anotacoes_editor.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/anotacoes_editor.md): Editor de notas em Markdown e RichText (WYSIWYG), exportação e vinculação a tarefas.
- [`visualizador_arquivos.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/visualizador_arquivos.md): Modal embutido para visualização de PDFs, Word (.docx), Excel (.xlsx, .csv) e Imagens.

### 5. 📊 Quadro Kanban & Tickets
- [`tickets_kanban.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/tickets_kanban.md): Quadro Kanban reativo com colunas de status, drag-and-drop e ordenação.
- [`tickets_jql_filtros.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/tickets_jql_filtros.md): Motor de busca JQL em tempo real e seções de JQL salvas interativas.
- [`tickets_jira_integracao.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/tickets_jira_integracao.md): Importação de issues por chave ou consulta JQL, prevenção de duplicidade e queries favoritas.
- [`tickets_detalhes_edicao.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/tickets_detalhes_edicao.md): Modal de detalhes de tickets (subtarefas, comentários, anexos e vínculos).

### 6. 🏢 Clientes & Gestão de Assets (JSM)
- [`clientes_assets.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/clientes_assets.md): Centralização de clientes/ativos com vínculos transversais para tickets, anotações, reuniões da agenda, instâncias Jira e criação automática via OAuth Atlassian.

### 7. 💬 Comunicação & Web Apps Integrados (Teams, Outlook, IAs, Sites Personalizados)
- [`integracao_teams_web.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/integracao_teams_web.md): Módulo dedicado com Microsoft Teams Web via `<webview>` Electron, sessão persistente, permissões de chamadas/notificações e atalhos rápidos.
- [`integracao_outlook_web.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/integracao_outlook_web.md): Módulo dedicado com Microsoft Outlook Web via `<webview>` Electron, sessão persistente e atalhos de Email/Calendário.
- [`integracao_ia_web.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/integracao_ia_web.md): Módulo dedicado para Assistentes de IA (ChatGPT, Claude, Gemini) com seleção em configurações e aba dinâmica.
- [`sites_personalizados_webviews.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/sites_personalizados_webviews.md): Adição e renderização de qualquer site web personalizado na barra lateral (OneDrive, SharePoint, GitHub, etc.) com WebView e sessão persistente.

### 8. 🌐 Hub Unificado, Navegação, Busca Global & Configurações
- [`barra_lateral_navegacao.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/barra_lateral_navegacao.md): Barra lateral de navegação principal (Sidebar), ícones temáticos coloridos, badges suaves e reordenação drag-and-drop.
- [`busca_global_omnisearch.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/busca_global_omnisearch.md): Barra de pesquisa universal (Omnisearch estilo Jira Command Bar) com atalho `Ctrl+K`, filtros e busca em tickets, notas, arquivos, agenda, clientes e alarmes.
- [`hub_unificado.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/hub_unificado.md): Painel consolidado com métricas do dia, lembretes urgentes e compromissos.
- [`configuracoes_sistema.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/configuracoes_sistema.md): Configurações visuais (temas), credenciais OAuth, parâmetros do banco e diagnóstico.
- [`auto_updater.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/auto_updater.md): Sistema de atualização automática com `electron-updater`, verificação no GitHub Releases, download em segundo plano e reinicialização com 1 clique.
- [`banco_de_dados_requisicoes.md`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades/banco_de_dados_requisicoes.md): Tabela de IPCs, canais de comunicação Electron Main/Preload/Renderer e operações SQLite/Store.

---

> **Diretriz de Manutenção:** Sempre que qualquer código-fonte for modificado no projeto, o arquivo Markdown correspondente nesta pasta DEVE ser atualizado com o novo impacto e incremento na tabela de histórico de versões.
