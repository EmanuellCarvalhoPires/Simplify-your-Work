# 💬 Integração com o Microsoft Teams Web

## 1. Descrição e Propósito
A funcionalidade de **Integração com o Microsoft Teams Web** permite que o usuário acesse, converse e utilize o Microsoft Teams diretamente dentro do Simplify your Work através de uma aba dedicada no menu lateral, mantendo sessão persistente, autenticação corporativa (SSO / Azure AD), suporte a permissões de mídia e barra de ferramentas de navegação rápida.

### Fluxo de Funcionamento:
1. **Sessão Persistente Isolada (`persist:teams`)**:
   - Utiliza a tag `<webview>` do Electron configurada na partição de sessão `persist:teams`.
   - Armazena cookies, tokens de autenticação (MSAL / Azure AD) e cache em disco, eliminando a necessidade de refazer login a cada abertura do app.
2. **User-Agent Otimizado**:
   - Define um User-Agent de Google Chrome desktop moderno (`Chrome/126+`) para garantir a renderização completa da aplicação web do Teams sem bloqueios ou redirecionamentos de download.
3. **Gerenciamento de Permissões & Mídia**:
   - O processo principal do Electron (`electron/main.ts`) concede permissões para `media`, `camera`, `microphone`, `notifications` e `display-capture` solicitadas pelo Teams.
4. **Tratamento de Popups e Autenticação Corporativa**:
   - Intercepta requisições de novas janelas (`setWindowOpenHandler`): permite popups de login de contas corporativas da Microsoft (`login.microsoftonline.com`, `teams.microsoft.com`) e abre links externos comuns no navegador padrão do sistema operacional.
5. **Interface e Controles (`TeamsView.tsx`)**:
   - Barra de ferramentas superior com botões de **Voltar**, **Avançar**, **Recarregar**, **Página Inicial**, atalhos para **Chat** e **Calendário**, indicador de **Sessão Persistente** e botão **Abrir no Navegador Externo**.
   - Barra de progresso linear fina em posição absoluta (`position: absolute`, sem deslocamento de layout / zero Layout Shift) e overlay suave de carregamento inicial, eliminando tremores ou oscilações ao navegar entre conversas e canais.
   - Tela de fallback com reconexão em caso de perda de internet.

6. **Persistência em Segundo Plano (Background Active)**:
   - Em vez de destruir o `<webview>` ao trocar de tela, o componente [`TeamsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/teams/TeamsView.tsx) é mantido em DOM persistente com alternância de visibilidade (`display: flex` / `none`).
   - Garante que chamadas de áudio/vídeo e reuniões não caiam ao navegar em outras abas (Kanban, Anotações, Agenda) e permite retorno instantâneo (0ms de carregamento).
   - Utiliza *lazy loading* sob demanda: só é instanciado a partir do primeiro clique do usuário na aba Teams.

7. **Otimização de Viewport & Tela Cheia**:
   - Quando a aba Teams está selecionada, o cabeçalho superior global do aplicativo ([`Header.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Header.tsx)) é automaticamente ocultado para maximizar a área de visualização vertical do Microsoft Teams.

### Arquivos e Componentes Envolvidos:
- [`electron/main.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/main.ts): Habilita `webviewTag: true`, configura sessão persistente `persist:teams`, permissões e handlers de popup no Electron.
- [`src/types/electron.d.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/types/electron.d.ts): Tipagem TypeScript para o elemento JSX `<webview>` do Electron.
- [`src/components/layout/Sidebar.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Sidebar.tsx): Adiciona a aba `'teams'` no menu de navegação lateral.
- [`src/components/teams/TeamsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/teams/TeamsView.tsx): Componente visual com barra de ferramentas e container do webview.
- [`src/index.css`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/index.css): Animações `@keyframes teamsProgress` e `@keyframes spin` para feedback de carregamento suave.
- [`src/App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx): Gerenciamento da aba ativa, renderização em background persistente da `TeamsView` e ocultação dinâmica do `Header`.

---

## 2. Impacto no Banco de Dados
- **Altera o banco**: Não.
- **Armazenamento**: Gerenciado diretamente pelo motor de sessão nativo do Electron/Chromium no diretório de dados do usuário (`partition: "persist:teams"`).

---

## 3. Histórico de Versões e Modificações

| **v1.8.0** | 20/08/2026 | Antigravity AI | **Modal Interativo de Seleção de Telas e Janelas para Compartilhamento / Gravação**: Implementada a janela modal nativa `openScreenPickerModal` disparada pelo `setDisplayMediaRequestHandler` em [`electron/main.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/main.ts). O modal lista com miniaturas em tempo real e ícones de apps duas abas dedicadas: *🖥️ Telas Inteiras* (múltiplos monitores) e *🪟 Janelas de Aplicativos* (Chrome, VS Code, Excel, etc.), permitindo escolher exatamente o que transmitir ou gravar no Teams com suporte a confirmação por duplo clique / Enter e cancelamento com Esc. |
| **v1.7.0** | 20/08/2026 | Antigravity AI | **Persistência de DOM em Segundo Plano (Zero Reload ao Trocar de Abas)**: Corrigida a renderização no [`App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx) mantendo o container de `TeamsView` montado no DOM com visibilidade controlada via `display: flex/none`, impedindo que a página web, reuniões e chats reiniciem do zero ao navegar pelo app. |
| **v1.6.0** | 20/08/2026 | Antigravity AI | **Suporte a Compartilhamento de Tela WebRTC**: Implementação de `setDisplayMediaRequestHandler` e integração com `desktopCapturer.getSources` no Electron (`main.ts`), além das flags `--enable-usermedia-screen-capturing` e `--allow-http-screen-capture`, corrigindo o erro de compartilhamento de tela em reuniões e chamadas do Teams. |
| **v1.5.0** | 19/08/2026 | Antigravity AI | **Carregamento Automático ao Iniciar o App**: Alterada a inicialização de `hasOpenedTeams` para `true` em [`App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx), iniciando o carregamento em segundo plano do Microsoft Teams imediatamente assim que a aplicação é aberta, sem exigir clique prévio do usuário. |
| **v1.4.0** | 19/08/2026 | Antigravity AI | Eliminação completa da "tremidinha" (layout shift) na tela ao trocar de conversas no Teams: substituição do banner flexível por barra de progresso linear fina em `position: absolute` e overlay de inicialização isolado. |
| **v1.3.0** | 19/08/2026 | Antigravity AI | Redução e compactação da largura da barra lateral (`Sidebar.tsx`) de 240px para 180px, diminuindo paddings e tamanhos de fonte para maximizar o espaço útil horizontal do app. |
| **v1.2.0** | 19/08/2026 | Antigravity AI | Ocultação automática do cabeçalho global (`Header.tsx`) na aba Teams para ganho substancial de área útil vertical na tela. |
| **v1.1.0** | 19/08/2026 | Antigravity AI | Implementação de persistência em segundo plano (`hasOpenedTeams` + container `display: flex/none` em `App.tsx`), mantendo chamadas, áudio e rascunhos ativos sem recarregar ao trocar de aba. |
| **v1.0.0** | 19/08/2026 | Antigravity AI | Criação do módulo TeamsView com `<webview>` nativa, partição persistente `persist:teams`, suporte a permissões de chamadas/notificações e integração à barra de navegação. |
