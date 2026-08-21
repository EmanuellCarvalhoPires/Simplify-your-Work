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

### Componentes e Arquivos Envolvidos:
- [`src/components/layout/Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx): Componente principal da barra lateral com renderização dos tópicos agrupadores, sub-itens indentados e botões avulsos.
- [`src/components/settings/SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx): Aba de gerenciamento com criação/edição/exclusão de tópicos, movimentação de itens e preview ao vivo.
- [`src/App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx): Gerencia o estado global de `sidebarConfig`, `activeTab` e sincronização.
- [`src/types/index.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/types/index.ts): Definições de tipos de `SidebarConfig`, `SidebarEntry`, `SidebarGroupEntry`, `SidebarItemEntry` e `NavTab`.

---

## 2. Impacto no Banco de Dados

- **Altera o banco de dados (SQLite/NeDB/Electron-store)?**: Não.
- **Armazenamento Local Utilizado**:
  - `localStorage.getItem('simplify_sidebar_config')`: Armazena o objeto `SidebarConfig` contendo o array estruturado de `entries` (botões e tópicos agrupados com seus `itemIds`).
  - Suporta migração automática da chave legada `simplify_sidebar_order`.

---

## 3. Histórico de Versões e Modificações

| Versão | Data | Autor / Agente | Detalhamento do que foi modificado |
| :--- | :--- | :--- | :--- |
| **v2.1** | 2026-08-20 | Antigravity AI | **Suporte a Sites Personalizados na Barra Lateral (Estilo Teams / Outlook)**: <br>1. Criado o componente [`CustomWebView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/web/CustomWebView.tsx) para carregar qualquer site com WebViews integrados e partição persistente (`persist:custom_<id>`).<br>2. Na aba **Barra Lateral & Tópicos** em [`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx), adicionado modal/formulário para cadastrar, editar, escolher ícones (14 opções), cores e vincular diretamente a tópicos ou na raiz.<br>3. Integrado ao [`Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx) e [`App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx) com persistência em `simplify_custom_sites`. |
| **v2.0** | 2026-08-20 | Antigravity AI | **Agrupamento em Tópicos e Ordenação Centralizada nas Configurações**: <br>1. Criada a estrutura de tópicos visuais fixos (não-colapsáveis) na barra lateral (`Sidebar.tsx`).<br>2. Adicionada a aba **Barra Lateral & Tópicos** em [`SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx) para criar novos tópicos, renomear, excluir, mover botões entre tópicos e reordenar com pré-visualização ao vivo.<br>3. Atualizados os tipos em [`src/types/index.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/types/index.ts) e sincronização no [`src/App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx). |
| **v1.0** | 2026-08-20 | Antigravity AI | Criação da documentação e implementação de ícones temáticos coloridos em badges translúcidos para todos os itens da barra lateral (Tickets, Agenda, Anotações, Clientes, Lembretes, Teams, Outlook, IAs e Configurações). |
