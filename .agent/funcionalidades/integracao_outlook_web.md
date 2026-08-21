# ✉️ Módulo de Integração Microsoft Outlook Web

## 1. Descrição e Propósito
O módulo de integração com o **Microsoft Outlook Web** fornece uma aba dedicada no menu de navegação do aplicativo para acesso ao email e calendário corporativo/pessoal da Microsoft (`https://outlook.office.com/mail/`).

### Fluxo de Uso e Recursos:
- **Sessão Persistente Isolada (`persist:outlook`)**: Utiliza a tag `<webview>` nativa do Electron na partição `persist:outlook`, garantindo que os dados de login e sessão permanecem armazenados de forma independente.
- **Navegação e Atalhos Rápidos**:
  - Botões de **Voltar**, **Avançar**, **Recarregar** e **Página Inicial**.
  - Atalhos diretos para **Email** (`https://outlook.office.com/mail/`) e **Calendário** (`https://outlook.office.com/calendar/`).
  - Botão de abertura externa no navegador padrão.
- **DOM Persistente**: Mantém o componente [`OutlookView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/outlook/OutlookView.tsx) em DOM com alternância de visibilidade (`display: flex` / `none`) para evitar recarregamento da página ao alternar entre abas.
- **Autenticação SSO**: O Electron intercepta requisições de novas janelas (`setWindowOpenHandler`) permitindo popups de autenticação Microsoft (`login.microsoftonline.com`, `outlook.office.com`, etc.).

---

## 2. Impacto no Banco de Dados
- **Altera o banco**: Não.
- **Detalhamento**: A sessão do Outlook é armazenada diretamente pelo motor Chromium do Electron na pasta de dados do usuário (nível do SO).

---

## 3. Componentes e Arquivos Envolvidos
- [`electron/main.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/main.ts): Habilita sessão persistente `persist:outlook`, permissões e handlers de popup no Electron.
- [`src/components/layout/Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx): Adiciona a aba `'outlook'` no menu de navegação lateral.
- [`src/components/outlook/OutlookView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/outlook/OutlookView.tsx): Componente visual com barra de ferramentas e container do webview.
- [`src/App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx): Gerencia a renderização condicional e persistência do DOM do Outlook Web.
- [`src/index.css`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/index.css): Estilo de animação `.outlook-loading-bar-inner` para o carregamento do Outlook.

---

## 4. Histórico de Versões e Modificações

| **v1.2.0** | 20/08/2026 | Antigravity AI | **Persistência de DOM em Segundo Plano (Zero Reload ao Trocar de Abas)**: Corrigida a renderização no [`App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx) mantendo o container de `OutlookView` montado no DOM com visibilidade controlada via `display: flex/none`, impedindo que a página web, emails e calendário reiniciem do zero ao navegar pelo app. |
| **v1.1.0** | 19/08/2026 | Antigravity AI | **Carregamento Automático ao Iniciar o App**: Alterada a inicialização de `hasOpenedOutlook` para `true` em [`App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx), iniciando o carregamento em segundo plano do Microsoft Outlook Web imediatamente assim que a aplicação é aberta, sem exigir clique prévio do usuário. |
| **v1.0.0** | 19/08/2026 | Antigravity AI | Criação do módulo OutlookView com `<webview>` nativa, partição persistente `persist:outlook`, atalhos de Email/Calendário e integração à barra de navegação. |
