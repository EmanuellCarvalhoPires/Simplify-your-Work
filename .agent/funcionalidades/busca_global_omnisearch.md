# 🔍 Busca Global Unificada (Omnisearch / Command Palette estilo Jira)

## 1. Descrição e Propósito
A funcionalidade de **Busca Global (Omnisearch)** oferece um motor de busca universal e instantâneo baseado no comportamento do **Jira Command / Global Search**, permitindo que o usuário localize qualquer entidade cadastrada no aplicativo a partir de um único local.

- **Posicionamento & Formas de Ativação**:
  - Localizada no centro do topo do aplicativo ([`Header.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Header.tsx)) com badge visual `<kbd>Ctrl K</kbd>`.
  - **Atalhos de Teclado**: Pressionar `Ctrl + K` (ou `Cmd + K`) em qualquer tela abre instantaneamente o modal de busca com foco automático.
  - Tecla de atalho `Esc` fecha a busca e retorna à tela anterior.

- **Entidades e Dados Pesquisados em Tempo Real**:
  1. **🎫 Tickets (Jira e Locais)**: Busca em chave (ex: `DADOS-123`), título, descrição, labels, responsável (`assignee`), relator e status.
  2. **📝 Anotações & Documentos**: Busca em títulos de notas Markdown e RichText, identificando a pasta de origem.
  3. **📎 Arquivos Anexados**: Busca em nomes originais de arquivos (PDFs, planilhas Excel `.xlsx`, documentos Word `.docx`, `.csv` e imagens).
  4. **📅 Agenda & Reuniões**: Busca em títulos de eventos, locais, descrições e calendários integrados (Google e Outlook).
  5. **🏢 Clientes (Assets estilo JSM)**: Busca em nomes de clientes/organizações, descrições, instâncias Jira e e-mails de contato.
  6. **⏰ Lembretes & Alarmes**: Busca em títulos de lembretes e mensagens programadas.

- **Filtros por Categoria (Pills no topo do Modal)**:
  - `✨ Tudo`: Resultados consolidados de todas as entidades.
  - `🎫 Tickets`: Restringe apenas a tarefas do Kanban.
  - `📝 Anotações`: Filtra apenas blocos de texto e notas.
  - `📎 Arquivos`: Filtra apenas documentos anexos.
  - `📅 Agenda`: Filtra apenas compromissos e videoconferências.
  - `🏢 Clientes`: Filtra apenas assets de clientes.
  - `⏰ Alarmes`: Filtra apenas alertas programados.

- **Seção "Visualizados Recentemente"**:
  - Quando a barra de pesquisa é aberta sem texto digitado, exibe os itens mais recentes para navegação imediata.

- **Navegação por Teclado e Ação Direta**:
  - Navegação entre itens via setas `↑` e `↓`.
  - Tecla `Tab` para alternar rapidamente entre as categorias.
  - Tecla `Enter` executa a ação e navega para o módulo correspondente:
    - *Ticket*: Redireciona para o quadro Kanban e abre o modal de detalhes do ticket.
    - *Nota*: Abre a anotação selecionada no editor.
    - *Arquivo*: Abre o arquivo embutido no modal visualizador ([`FileViewerModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/FileViewerModal.tsx)).
    - *Agenda*: Redireciona para o calendário mensal/semanal.
    - *Cliente*: Abre o painel do cliente no módulo de Clientes / Assets.
    - *Lembrete*: Redireciona para o gerenciador de lembretes.

- **Componentes Envolvidos**:
  - [`src/components/search/GlobalSearchModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/search/GlobalSearchModal.tsx)
  - [`src/components/layout/Header.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Header.tsx)
  - [`src/App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx)
  - [`electron/main.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/main.ts) (Configuração de ícone da aplicação no Windows via `AppUserModelId` e `resolveAppIcon`).

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Não (opera como camada de consulta e agregação em memória sobre os dados sincronizados do SQLite).
- **Coleções consultadas**: `tickets`, `notes`, `note_folders`, `calendar_events_cache`, `client_assets`, `reminders`.

---

## 3. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | Detalhamento do que foi modificado |
| :--- | :--- | :--- | :--- |
| `v1.0.1` | 2026-08-17 | Antigravity AI | Corrigida ordem de declaração da constante `searchResults` no `GlobalSearchModal` antes dos `useEffects` para eliminar o erro de inicialização em tempo de execução, e aprimorada a resolução de caminhos absolutos do ícone `.ico`/`.png` no Electron para o Windows. |
| `v1.0.0` | 2026-08-17 | Antigravity AI | Criação do modal de busca universal `GlobalSearchModal` estilo Jira Search com atalho `Ctrl+K`, filtros de categoria em pills, destaque de palavras pesquisadas, seção de itens recentes, suporte a navegação por teclado e integração com tickets, notas, arquivos, agenda, clientes e alarmes. Configurado `app.setAppUserModelId` e resolução de `app-icon.ico` / `app-icon.png` no Electron para exibição correta do logo do app na barra de tarefas do Windows. |
