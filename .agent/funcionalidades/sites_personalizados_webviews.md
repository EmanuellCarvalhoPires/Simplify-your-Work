# 🌐 Sites Personalizados & WebViews Integrados (Estilo Teams / Outlook)

Documentação técnica da funcionalidade de **Sites Personalizados**, que permite aos usuários adicionar qualquer endereço web ou sistema corporativo (como OneDrive, SharePoint, WhatsApp Web, GitHub, Trello, Confluence, etc.) como um botão nativo na barra lateral, com renderização em tela cheia via WebView e sessões/logins persistentes.

---

## 1. Descrição e Propósito

### Finalidade:
- Permitir a inclusão de sites e sistemas web arbitrários diretamente no painel do aplicativo.
- Proporcionar uma experiência idêntica às integrações do **Microsoft Teams**, **Microsoft Outlook** e **Assistentes de IA** (ChatGPT, Claude, Gemini).
- Manter **sessões de login e cookies totalmente isolados e persistentes** para cada site adicionado (`persist:custom_<id>`).

### Fluxo de Utilização:
1. O usuário acessa **Configurações > Barra Lateral & Tópicos** ([`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx)).
2. Clica no botão **"+ Adicionar Site Web"** (ou no atalho "+ Add Site" de um tópico específico).
3. Preenche o formulário:
   - **Nome do Site**: Ex: *OneDrive*, *SharePoint*, *WhatsApp*, *GitHub*.
   - **URL / Link**: Ex: `https://onedrive.live.com` (formatação automática de protocolo).
   - **Ícone**: Escolha visual entre 14 ícones categorizados (🌐 Globo, ☁️ Nuvem/OneDrive, 📁 Pasta/Drive, 💼 Trabalho, 💬 Chat, 💻 Código/GitHub, 📊 Dashboard/Kanban, 🔗 Link, ✨ IA, 📄 Docs, ✅ Tarefas, 📚 Projetos, 🛡️ Segurança, ⚡ Rápido).
   - **Cor do Badge**: Paleta de 12 cores estilizadas.
   - **Tópico de Destino**: Escolha de tópico (ex: agrupar dentro de *Microsoft*) ou como botão avulso.
4. Ao salvar, o site aparece na barra lateral ([`Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx)) e na pré-visualização ao vivo.
5. Ao clicar no botão na barra lateral, o componente [`CustomWebView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/web/CustomWebView.tsx) é carregado em tela cheia com barra de navegação completa (Voltar ⬅️, Avançar ➡️, Recarregar 🔄, Home 🏠, Copiar Link 📋, Abrir no Navegador Externo ↗️ e Badge de Sessão Segura).

### Componentes e Arquivos Envolvidos:
- [`src/components/web/CustomWebView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/web/CustomWebView.tsx): Componente dedicado de navegação web com Electron `<webview>` e partição persistente isolada.
- [`src/components/settings/SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx): Aba de gerenciamento com formulário/modal para adicionar, editar, excluir e reordenar sites.
- [`src/components/layout/Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx): Renderização dinâmica de botões de sites com badges coloridos e ícones personalizados.
- [`src/App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx): Gerenciamento de estado de `customSites` e montagem em segundo plano dos WebViews.
- [`src/types/index.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/types/index.ts): Interface `CustomSite` e tipo `NavTab`.

---

## 2. Impacto no Banco de Dados

- **Altera o banco de dados (SQLite/NeDB)?**: Não.
- **Armazenamento Local Utilizado**:
  - `localStorage.getItem('simplify_custom_sites')`: Armazena o array `CustomSite[]` com as propriedades `{ id, title, url, icon, color, partition, createdAt }`.
  - `localStorage.getItem('simplify_sidebar_config')`: Armazena a posição do site na hierarquia (dentro de um tópico ou na raiz).
  - Partições Electron de Sessão: Cookies e autenticações são gravados nativamente em disco pelo Chromium no diretório de perfil da partição `persist:custom_<id>`.

---

## 3. Histórico de Versões e Modificações

| **v1.3** | 2026-08-20 | Antigravity AI | **Correção de ReferenceError nos Ícones de Presets**: <br>1. Centralizada a exportação de `BRAND_ICON_PRESETS`, `SYSTEM_ICON_PRESETS` e `EMOJI_KEYBOARD_PRESETS` diretamente dentro de [`BrandIcons.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/BrandIcons.tsx), eliminando variáveis não importadas em [`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx) que causavam quebra no carregamento do bundle.<br>2. Reinicialização e validação dos processos Electron com execução e interface restabelecidas. |
| **v1.2** | 2026-08-20 | Antigravity AI | **Correção de Renderização Inicial e Fallback de Abas**: <br>1. Propagação correta de `customSites` para a `Sidebar.tsx` e cálculo de visualização em tela cheia no `App.tsx`.<br>2. Adicionadas proteções de segurança e try-catch no parser do `DynamicCustomIcon`.<br>3. Adicionado fallback automático no `App.tsx` para garantir que a tela nunca fique vazia caso a aba ativa não seja encontrada ou tenha sido removida. |
| **v1.1** | 2026-08-20 | Antigravity AI | **Catálogo Expandido de Ícones de Marcas, Teclado e Emojis Livres**: <br>1. Criada a biblioteca [`BrandIcons.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/BrandIcons.tsx) contendo SVGs de marcas famosas (OneDrive, GitHub, Microsoft, Jira, Trello, Notion, WhatsApp, Google Drive, Figma, Slack, GitLab, Confluence) e componente universal `DynamicCustomIcon`.<br>2. Seletor categorizado no modal com 3 abas: *Marcas & Apps*, *Sistema & Lucide* (42 ícones) e *Emojis do Teclado* (grid rápida + digitação livre de qualquer emoji via `Win + .`).<br>3. Renderização reativa integrada na Sidebar e no topo do CustomWebView. |
| **v1.0** | 2026-08-20 | Antigravity AI | **Criação da Funcionalidade de Sites Personalizados**: <br>1. Criação do componente [`CustomWebView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/web/CustomWebView.tsx) com barra de navegação, tratamento de erros e sessão persistente.<br>2. Gerenciador completo em [`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx) com modal de cadastro/edição, seleção de 14 ícones e 12 cores, e associação a tópicos.<br>3. Suporte no [`Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx) e [`App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx). |
