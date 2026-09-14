# 🌐 Sites Personalizados & WebViews Integrados (Estilo Teams / Outlook)

Documentação técnica da funcionalidade de **Sites Personalizados**, que permite aos usuários adicionar qualquer endereço web ou sistema corporativo (como OneDrive, SharePoint, WhatsApp Web, GitHub, Trello, Confluence, Discord, Azure, AWS, Jira, etc.) como um botão nativo na barra lateral, com renderização em tela cheia via WebView e sessões/logins persistentes.

---

## 1. Descrição e Propósito

### Finalidade:
- Permitir a inclusão de sites e sistemas web arbitrários diretamente no painel do aplicativo.
- Proporcionar uma experiência idêntica às integrações do **Microsoft Teams**, **Microsoft Outlook** e **Assistentes de IA** (ChatGPT, Claude, Gemini).
- Manter **sessões de login e cookies totalmente isolados e persistentes** para cada site adicionado (`persist:custom_<id>`).
- Suportar a personalização total de ícones, incluindo **Upload de imagens locais (PNG, SVG, JPG, WebP, ICO)**, **Busca automática de Favicons do site**, **Catálogo expandido de marcas populares**, **Ícones de sistema / Lucide** e **Emojis**.

### Fluxo de Utilização:
1. O usuário acessa **Configurações > Barra Lateral & Tópicos** ([`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx)).
2. Clica no botão **"+ Adicionar Site Web"** (ou no atalho "+ Add Site" de um tópico específico).
3. Preenche o formulário:
   - **Nome do Site**: Ex: *Confluence*, *OneDrive*, *SharePoint*, *WhatsApp*, *GitHub*.
   - **URL / Link**: Ex: `https://onedrive.live.com` ou `https://meusistema.atlassian.net` (com botão de ação rápida `⚡ Buscar Favicon do Site` para puxar o favicon oficial em 1 clique).
   - **Ícone do Botão**: Seletor com 4 abas categorizadas:
     - 🌟 **Marcas**: 22 ícones vetoriais nativos de serviços populares (OneDrive, GitHub, Microsoft 365, Jira, Confluence, Bitbucket, Azure, AWS, Trello, Notion, WhatsApp, Discord, Slack, Google Drive, Figma, GitLab, Linear, Asana, Spotify, YouTube, LinkedIn, X/Twitter).
     - ⌨️ **Sistema**: 41 ícones temáticos Lucide com barra de pesquisa instantânea.
     - 😀 **Emojis**: Grade de emojis populares e campo para digitação/colagem de qualquer emoji com atalho `Win + .`.
     - 🖼️ **Upload / URL**: Área de seleção/arrastar de arquivos locais (com auto-redimensionamento inteligente via Canvas para otimização), campo para colar URLs diretas de logos/imagens e galeria de ícones do usuário salvos para reutilização com remoção rápida.
   - **Cor do Badge**: Paleta de 12 cores estilizadas.
   - **Tópico de Destino**: Escolha de tópico (ex: agrupar dentro de *Microsoft*) ou como botão avulso.
4. Ao salvar, o site aparece na barra lateral ([`Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx)) e na pré-visualização ao vivo.
5. Ao clicar no botão na barra lateral, o componente [`CustomWebView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/web/CustomWebView.tsx) é carregado em tela cheia com barra de navegação completa (Voltar ⬅️, Avançar ➡️, Recarregar 🔄, Home 🏠, Copiar Link 📋, Abrir no Navegador Externo ↗️ e Badge de Sessão Segura).

### Componentes e Arquivos Envolvidos:
- [`src/components/common/BrandIcons.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/BrandIcons.tsx): Catálogo de SVGs vetoriais de marcas, biblioteca de presets e componente universal `DynamicCustomIcon` com suporte seguro a Base64, URLs de imagem e fallbacks de erro (`CustomImageIcon`).
- [`src/components/common/CustomSiteModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/CustomSiteModal.tsx): Modal unificado e modular para criação e edição de sites personalizados, seleção de ícones (Marcas, Sistema, Emojis, Upload), cores e tópicos de destino.
- [`src/components/web/CustomWebView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/web/CustomWebView.tsx): Componente dedicado de navegação web com Electron `<webview>`, partição persistente isolada e botão "Editar Site" na barra superior.
- [`src/components/settings/SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx): Aba de gerenciamento com listagem, reordenação e disparador do modal para adicionar, editar e excluir sites.
- [`src/components/layout/Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx): Renderização dinâmica de botões de sites com menu de contexto (Right-Click) e atalhos rápidos de adição direta.
- [`src/App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx): Gerenciamento de estado de `customSites`, renderização do `CustomSiteModal` global e montagem em segundo plano dos WebViews.
- [`src/types/index.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/types/index.ts): Interface `CustomSite` e tipo `NavTab`.

---

## 2. Impacto no Banco de Dados

- **Altera o banco de dados (SQLite/NeDB)?**: Não.
- **Armazenamento Local Utilizado**:
  - `localStorage.getItem('simplify_custom_sites')`: Armazena o array `CustomSite[]` com as propriedades `{ id, title, url, icon, color, partition, createdAt }`.
  - `localStorage.getItem('simplify_custom_uploaded_icons')`: Armazena o array de strings (Data URLs em Base64 / links de favicons) da biblioteca de ícones personalizados salvos pelo usuário.
  - `localStorage.getItem('simplify_sidebar_config')`: Armazena a posição do site na hierarquia (dentro de um tópico ou na raiz).
  - Partições Electron de Sessão: Cookies e autenticações são gravados nativamente em disco pelo Chromium no diretório de perfil da partição `persist:custom_<id>`.

---

## 3. Histórico de Versões e Modificações

| Versão | Data | Autor / Agente | Detalhamento do que foi modificado |
| :--- | :--- | :--- | :--- |
| **v1.6** | 2026-08-26 | Antigravity AI | **Resolução Completa de Criação/Edição, Modal Modular e Menu de Contexto**: <br>1. Criado o componente standalone [`CustomSiteModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/CustomSiteModal.tsx) eliminando problemas de variáveis de estado ausentes (`siteTargetGroup`) em [`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx).<br>2. Corrigida a normalização de itens no [`Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx) que reinjetava sites hardcoded antigos e não limpava sites removidos.<br>3. Adicionado menu de contexto (Right-Click) nos botões da barra lateral para *Editar Site*, *Copiar Link*, *Abrir no Navegador Externo* e *Excluir Site*.<br>4. Adicionado botão *Editar Site* diretamente na barra de navegação do [`CustomWebView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/web/CustomWebView.tsx).<br>5. Integração global de criação/edição/exclusão no [`App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx). |
| **v1.5** | 2026-08-25 | Antigravity AI | **Suporte a Aceleração por Hardware, WebGL e GPU Rasterization para Whiteboards**: <br>1. Adicionadas flags de aceleração gráfica por GPU no Electron Main Process (`ignore-gpu-blocklist`, `enable-gpu-rasterization`, `enable-zero-copy`, `enable-accelerated-2d-canvas`, `enable-features=CanvasOopRasterization`) em [`electron/main.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/main.ts).<br>2. Habilitada a propriedade `webpreferences="contextIsolation=yes, javascript=yes, webgl=yes, experimentalFeatures=yes"` nos componentes [`CustomWebView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/web/CustomWebView.tsx), [`TeamsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/teams/TeamsView.tsx), [`OutlookView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/outlook/OutlookView.tsx) e [`AiAssistantView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/ai/AiAssistantView.tsx), eliminando avisos de baixa performance e lentidão em quadros interativos como Confluence Whiteboard, Jira Whiteboard, Miro e Figma. |
| **v1.4** | 2026-08-24 | Antigravity AI | **Upload de Ícones Customizados, Busca de Favicon e Biblioteca de Ícones**: <br>1. Criada a aba *🖼️ Upload / URL* no modal de criação e edição de sites personalizados, permitindo upload de arquivos locais (PNG, SVG, JPG, WebP, ICO) com compressão e redimensionamento automático via Canvas (128x128px max) para manter o LocalStorage ultra-leve.<br>2. Implementada a busca automática de Favicon oficial (`⚡ Buscar Favicon do Site`) com 1 clique a partir da URL informada.<br>3. Criada a galeria de ícones do usuário (`simplify_custom_uploaded_icons`) para salvar e reutilizar ícones customizados em novos sites com opção de exclusão rápida.<br>4. Atualizado o `DynamicCustomIcon` e criado `CustomImageIcon` em [`BrandIcons.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/BrandIcons.tsx) com renderização de Base64, URLs Web e tratamento de fallback de erro.<br>5. Adicionados novos ícones de marcas vetoriais (Discord, Azure, AWS, Bitbucket, Asana, Linear, Spotify, YouTube, LinkedIn, X/Twitter). |
| **v1.3** | 2026-08-20 | Antigravity AI | **Correção de ReferenceError nos Ícones de Presets**: <br>1. Centralizada a exportação de `BRAND_ICON_PRESETS`, `SYSTEM_ICON_PRESETS` e `EMOJI_KEYBOARD_PRESETS` diretamente dentro de [`BrandIcons.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/BrandIcons.tsx), eliminando variáveis não importadas em [`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx) que causavam quebra no carregamento do bundle.<br>2. Reinicialização e validação dos processos Electron com execução e interface restabelecidas. |
| **v1.2** | 2026-08-20 | Antigravity AI | **Correção de Renderização Inicial e Fallback de Abas**: <br>1. Propagação correta de `customSites` para a `Sidebar.tsx` e cálculo de visualização em tela cheia no `App.tsx`.<br>2. Adicionadas proteções de segurança e try-catch no parser do `DynamicCustomIcon`.<br>3. Adicionado fallback automático no `App.tsx` para garantir que a tela nunca fique vazia caso a aba ativa não seja encontrada ou tenha sido removida. |
| **v1.1** | 2026-08-20 | Antigravity AI | **Catálogo Expandido de Ícones de Marcas, Teclado e Emojis Livres**: <br>1. Criada a biblioteca [`BrandIcons.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/BrandIcons.tsx) contendo SVGs de marcas famosas (OneDrive, GitHub, Microsoft, Jira, Trello, Notion, WhatsApp, Google Drive, Figma, Slack, GitLab, Confluence) e componente universal `DynamicCustomIcon`.<br>2. Seletor categorizado no modal com 3 abas: *Marcas & Apps*, *Sistema & Lucide* (42 ícones) e *Emojis do Teclado* (grid rápida + digitação livre de qualquer emoji via `Win + .`).<br>3. Renderização reativa integrada na Sidebar e no topo do CustomWebView. |
| **v1.0** | 2026-08-20 | Antigravity AI | **Criação da Funcionalidade de Sites Personalizados**: <br>1. Criação do componente [`CustomWebView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/web/CustomWebView.tsx) com barra de navegação, tratamento de erros e sessão persistente.<br>2. Gerenciador completo em [`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx) com modal de cadastro/edição, seleção de 14 ícones e 12 cores, e associação a tópicos.<br>3. Suporte no [`Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx) e [`App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx). |
