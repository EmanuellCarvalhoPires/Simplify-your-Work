# 🧭 Barra Lateral de Navegação (Sidebar) & Ícones Coloridos

Documentação técnica da barra lateral de navegação principal do aplicativo **Simplify your Work**, incluindo o sistema de tópicos agrupadores fixos, gerenciamento da ordenação via Configurações do Projeto, ícones temáticos coloridos e renderização de abas dinâmicas.

---

## 1. Descrição e Propósito

A barra lateral (`Sidebar`) é o componente central de navegação rápida entre os módulos e visões da aplicação. Ela permite ao usuário alternar com um clique entre Tickets Jira, Agenda, Anotações, Clientes/Assets, Lembretes, integrações com Microsoft Teams/Outlook, Assistentes de Inteligência Artificial habilitados (ChatGPT, Claude, Gemini) e Configurações gerais.

### Principais Recursos:
- **Tópicos Agrupadores Visuais Fixos**: Permite agrupar botões sob categorias temáticas personalizadas (ex: *Microsoft*, *Agentes de IA*, *Workspaces*, *Ferramentas*).
  - **Sempre Visível / Não-colapsável**: Conforme especificação, os tópicos não funcionam como pastas sanfona (não fecham/abrem), garantindo que todos os botões fiquem permanentemente acessíveis com 1 clique imediato.
  - **Identificação Visual**: Cada tópico conta com cabeçalho com ícone indicativo (`ChevronDown` + `Folder`), título em destaque e os botões filhos indentados com linha guia vertical e marcadores luminosos.
- **Gestão & Reordenação nas Configurações**: A ordenação de todos os blocos (tópicos e botões avulsos) e a atribuição de botões a tópicos é realizada de forma centralizada e intuitiva na aba **Barra Lateral & Tópicos** das Configurações ([`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx)), com prévia em tempo real.
- **Ícones Temáticos Coloridos**: Cada módulo possui uma cor e badge translúcido de identificação visual exclusiva:
  - **Tickets**: Azul Ciano Claro (`#38bdf8`)
  - **Agenda**: Âmbar / Laranja Calendário (`#f59e0b`)
  - **Anotações**: Amarelo Ouro (`#eab308`)
  - **Clientes**: Verde Esmeralda (`#10b981`)
  - **Lembretes**: Rosa Avermelhado / Alerta (`#f43f5e`)
  - **Microsoft Teams**: Roxo / Índigo Teams (`#818cf8`)
  - **Microsoft Outlook**: Azul Oceano Outlook (`#0ea5e9`)
  - **Assistentes de IA**: Cores oficiais dos provedores (ChatGPT `#10a37f`, Claude `#d97706`, Gemini `#3b82f6`)
  - **Configurações**: Violeta / Púrpura (`#a855f7`)
- **Badge Suave & Contraste Ativo**: Ícones repousam sobre um badge com fundo suave na mesma tonalidade (`item.color + '22'`) quando inativos. Ao selecionar uma aba, o item ganha realce no tema principal (`var(--accent-primary)`) com o ícone em branco nítido e indicador vertical iluminado.
- **Inclusão Dinâmica de IAs**: Lê a configuração ativa de IA (`aiConfig.enabledProviders`) e renderiza os atalhos das IAs habilitadas automaticamente.

- **Modo Recolhível / Compacto da Barra Lateral**: Permite ao usuário recolher a coluna lateral com um clique no botão do painel superior (`PanelLeftClose` / `PanelLeftOpen`).
  - No modo recolhido (`width: 64px`), apenas os ícones temáticos coloridos permanecem visíveis e centralizados, ocultando os rótulos de texto e convertendo os cabeçalhos de tópicos em divisores discretos.
  - O estado recolhido é persistido automaticamente em `localStorage.getItem('simplify_sidebar_collapsed')`.
- **Otimização de Memória RAM & Pré-carregamento de Sites**:
  - Cada site web ou assistente virtual (OneDrive, Confluence, Teams, Outlook, Gemini, Claude, etc.) conta com um seletor visual na aba **Barra Lateral & Tópicos** das Configurações ([`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx)):
    - **⚡ Pré-carregado**: Mantém o processo Chromium do WebView ativo na memória em segundo plano para acesso imediato.
    - **⏱️ Ao clicar (Sob Demanda)**: Desmonta o WebView quando o usuário não estiver na aba correspondente, matando o Render Process do Electron e liberando instantaneamente a memória RAM.
  - Persistido em `localStorage.getItem('simplify_sites_preload')` e na propriedade `preload` de cada [`CustomSite`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/types/index.ts).
- **Remoção de Módulos Obsoletos**: As funcionalidades de "Tickets" e "Clientes" foram removidas da barra lateral, dos menus e da navegação principal.

### Componentes e Arquivos Envolvidos:
- [`src/components/layout/Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx): Componente principal da barra lateral com suporte a modo compacto/recolhido e tópicos.
- [`src/components/settings/SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx): Gerenciador da estrutura, tópicos e alternância de pré-carregamento (RAM).
- [`src/components/common/CustomSiteModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/CustomSiteModal.tsx): Modal de cadastro/edição de sites com suporte ao checkbox de pré-carregamento na RAM.
- [`src/App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx): Gerencia o ciclo de vida e a desmontagem dinâmica dos WebViews sob demanda para economia de RAM.
- [`src/types/index.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/types/index.ts): Definições de tipos de `SidebarConfig`, `CustomSite` com `preload?: boolean`.

---

## 2. Impacto no Banco de Dados

- **Altera o banco de dados (SQLite/NeDB/Electron-store)?**: Não.
- **Armazenamento Local Utilizado**:
  - `localStorage.getItem('simplify_sidebar_config')`: Armazena o objeto `SidebarConfig` com as entradas ativas.
  - `localStorage.getItem('simplify_sidebar_collapsed')`: Armazena booleano (`true`/`false`) do estado recolhido da coluna.
  - `localStorage.getItem('simplify_sites_preload')`: Mapeamento de IDs de sites para `true` (pré-carregado) ou `false` (ao clicar).

---

## 3. Histórico de Versões e Modificações

| Versão | Data | Autor / Agente | Detalhamento do que foi modificado |
| :--- | :--- | :--- | :--- |
| **v2.3** | 2026-10-15 | Antigravity AI | **Coluna Recolhível, Otimização de RAM por Pré-carregamento e Remoção de Tickets/Clientes**: <br>1. **Recolhimento da Coluna Lateral**: Implementado botão no header do Painel (`PanelLeftClose`/`PanelLeftOpen`) que transiciona a coluna para largura compacta de 64px, mantendo apenas os ícones centralizados e persistindo em `simplify_sidebar_collapsed`.<br>2. **Remoção de Tickets e Clientes**: Removidos de `ALL_NAV_ITEMS`, `DEFAULT_SIDEBAR_CONFIG`, menus de configuração, navegação e busca global, definindo a Agenda (`calendar`) como tela inicial padrão.<br>3. **Controle de Memória RAM & Pré-carregamento**: Adicionado botão de alternância em cada site na aba **Barra Lateral & Tópicos** e no [`CustomSiteModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/CustomSiteModal.tsx) permitindo definir quais sites ficam pré-carregados na RAM e quais carregam sob demanda (desmontando o `<webview>` ao sair da aba para liberar RAM imediatamente). |
| **v2.2** | 2026-08-26 | Antigravity AI | **Correção Completa de Criação/Edição de Sites e Menu de Contexto (Right-Click)**: <br>1. Corrigidos erros de estado em [`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx) que bloqueavam o salvamento e edição de sites personalizados.<br>2. Modularizado o componente [`CustomSiteModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/CustomSiteModal.tsx) reutilizável para criação e edição.<br>3. Implementado Menu de Contexto com Botão Direito no [`Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx): *Editar Site*, *Copiar Link*, *Abrir no Navegador Externo*, *Excluir Site*, *Adicionar Site ao Tópico* e *Gerenciar Tópicos*.<br>4. Adicionados botões de ação rápida `+` nos cabeçalhos de tópicos e `+ Adicionar Site` na base da barra lateral.<br>5. Adicionado botão *Editar Site* na barra de ferramentas de [`CustomWebView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/web/CustomWebView.tsx). |
| **v2.1** | 2026-08-20 | Antigravity AI | **Suporte a Sites Personalizados na Barra Lateral (Estilo Teams / Outlook)**: <br>1. Criado o componente [`CustomWebView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/web/CustomWebView.tsx) para carregar qualquer site com WebViews integrados e partição persistente (`persist:custom_<id>`).<br>2. Na aba **Barra Lateral & Tópicos** em [`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx), adicionado modal/formulário para cadastrar, editar, escolher ícones (14 opções), cores e vincular diretamente a tópicos ou na raiz.<br>3. Integrado ao [`Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx) e [`App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx) com persistência em `simplify_custom_sites`. |
| **v2.0** | 2026-08-20 | Antigravity AI | **Agrupamento em Tópicos e Ordenação Centralizada nas Configurações**: <br>1. Criada a estrutura de tópicos visuais fixos (não-colapsáveis) na barra lateral (`Sidebar.tsx`).<br>2. Adicionada a aba **Barra Lateral & Tópicos** em [`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx) para criar novos tópicos, renomear, excluir, mover botões entre tópicos e reordenar com pré-visualização ao vivo.<br>3. Atualizados os tipos em [`src/types/index.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/types/index.ts) e sincronização no [`src/App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx). |
| **v1.0** | 2026-08-20 | Antigravity AI | Criação da documentação e implementação de ícones temáticos coloridos em badges translúcidos para todos os itens da barra lateral (Tickets, Agenda, Anotações, Clientes, Lembretes, Teams, Outlook, IAs e Configurações). |
