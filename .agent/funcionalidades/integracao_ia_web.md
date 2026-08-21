# 🤖 Módulo de Integração com Assistentes de IA (Claude, Gemini, ChatGPT)

## 1. Descrição e Propósito
O módulo de **Assistente de Inteligência Artificial** permite ao usuário escolher e integrar diretamente na interface do aplicativo os principais modelos de IA do mercado: **ChatGPT**, **Claude** e **Google Gemini**.

Ao configurar a IA desejada nas configurações do sistema, uma aba correspondente é criada dinamicamente na barra lateral de navegação com o nome e o ícone do provedor escolhido, mantendo o ambiente de trabalho e as conversas ativas continuamente.

### Recursos e Arquitetura:
- **Provedores Suportados**:
  - 🟢 **ChatGPT (OpenAI)**: `https://chatgpt.com`
  - 🟠 **Claude (Anthropic)**: `https://claude.ai`
  - 🔵 **Gemini (Google)**: `https://gemini.google.com`
- **Suporte a Múltiplas IAs Simultâneas**:
  - O usuário pode ativar uma, duas ou todas as três IAs simultaneamente.
  - Cada IA ativada gera sua própria aba dedicada na barra lateral com rótulo e ícone personalizados.
- **Sessões Persistentes Isoladas (`persist:ai_<provedor>`)**:
  - Cada IA opera em uma partição isolada do Electron (`persist:ai_chatgpt`, `persist:ai_claude`, `persist:ai_gemini`).
  - Sessões, cookies e logins permanecem salvos individualmente.
- **Autenticação SSO & Popups**:
  - O Electron (`electron/main.ts`) intercepta aberturas de janelas e autoriza fluxos de login com Google (`accounts.google.com`), OpenAI (`auth0.openai.com`), Anthropic/Claude (`auth.anthropic.com`) e Apple ID.
- **Navegação & Persistência de DOM**:
  - Cada componente [`AiAssistantView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/ai/AiAssistantView.tsx) é mantido em DOM persistente (`display: activeTab === 'ai_' + provider ? 'flex' : 'none'`), preservando o estado das conversas de todas as IAs em segundo plano.
  - Barra de ferramentas com botões de Voltar, Avançar, Recarregar, Início, Indicador de Provedor Ativo, Badge de Sessão Persistente e Abertura em Navegador Externo.

---

## 2. Impacto no Banco de Dados
- **Altera o banco**: Não diretamente no SQLite (armazenado em `localStorage` sob a chave `simplify_ai_config` com o array `enabledProviders`).
- **Detalhamento**: As sessões dos webviews são gerenciadas diretamente pelo motor Chromium do Electron nas partições `persist:ai_<provedor>`.

---

## 3. Componentes e Arquivos Envolvidos
- [`src/types/index.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/types/index.ts): Definição dos tipos `ActiveAiProvider`, `AiAssistantConfig` e `AI_PROVIDERS`.
- [`src/components/settings/SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx): Aba de configuração de IA com seleção múltipla, ativação/desativação individual e em massa.
- [`src/components/ai/AiAssistantView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/ai/AiAssistantView.tsx): Componente de visualização Webview com partição individual e controles de navegação.
- [`src/components/layout/Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx): Renderização dinâmica das abas de cada IA ativada na barra lateral.
- [`src/App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx): Gerenciamento do estado `aiConfig`, renderização múltipla de DOMs persistentes e sanitização de providers.
- [`electron/main.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/main.ts): Configuração de partições `persist:ai_*`, User-Agent e permissões de login SSO para todos os serviços de IA.
- [`src/index.css`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/index.css): Estilização da barra de progresso `.ai-loading-bar-inner`.

---

## 4. Histórico de Versões e Modificações

| **v1.3.0** | 20/08/2026 | Antigravity AI | Remoção completa do Atlassian Rovo do código, tipos, configurações, sessões do Electron e barra lateral. |
| **v1.2.0** | 20/08/2026 | Antigravity AI | Adição da Janela Nativa Segura de Login Google (`system:openGoogleAuthWindow`), desativação de WebAuthn/Windows Security Key e auto-gatilho do painel Ask Rovo. |
| **v1.1.1** | 20/08/2026 | Antigravity AI | Ajuste de User-Agent (Chrome 131 desktop), injeção de Client Hints (`Sec-Ch-Ua`) e bypass de bloqueio do Google OAuth ("Esse navegador ou app pode não ser seguro") via `onBeforeSendHeaders`. |
| **v1.1.0** | 20/08/2026 | Antigravity AI | Suporte a seleção e ativação simultânea de múltiplas IAs (ChatGPT, Claude e Gemini) na barra lateral, com partições isoladas (`persist:ai_<provedor>`) e preservação de DOM para todas as IAs ativas. |
| **v1.0.0** | 20/08/2026 | Antigravity AI | Criação do módulo de Assistente de IA nas configurações com seleção entre ChatGPT, Claude, Gemini e Atlassian Rovo, aba dinâmica na barra lateral e Webview persistente (`persist:ai`). |
