# 👁️ Visualizador Embutido de Arquivos e Documentos

## 1. Descrição e Propósito
A funcionalidade do **Visualizador Embutido de Arquivos** oferece uma experiência nativa para abrir, inspecionar e ler anexos e documentos sem a necessidade de sair do aplicativo ou depender de softwares externos instalados na máquina.
- **Finalidade**:
  - Renderizar diretamente na tela arquivos em formato:
    - **PDF**: Visualizador embutido com navegação por páginas e zoom.
    - **Word (`.docx`)**: Renderização de conteúdo formatado e estilos.
    - **Planilhas (`.xlsx`, `.xls`, `.csv`)**: Visualização em tabela interativa com linhas, colunas e dados tabulares.
    - **Imagens (`.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`)**: Visualizador com suporte a ampliação e proporção original.
    - **Texto Puro (`.txt`, `.json`, `.log`, `.xml`)**: Renderização com quebra de linha e numeração.
- **Fluxo de Utilização**:
  1. O usuário clica em um anexo de ticket ([`TicketDetailModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/TicketDetailModal.tsx)) ou em um arquivo importado na lista de anotações.
  2. O modal [`FileViewerModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/FileViewerModal.tsx) é acionado com os dados em Base64 ou caminho do arquivo.
  3. O visualizador identifica o MIME type ou extensão e renderiza o componente apropriado de visualização rápida com botão de download/exportação.
- **Arquivos e Componentes Envolvidos**:
  - [`src/components/common/FileViewerModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/FileViewerModal.tsx)
  - [`src/components/tickets/TicketDetailModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/TicketDetailModal.tsx)
  - [`src/components/notes/NoteEditor.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/notes/NoteEditor.tsx)

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Não diretamente (operação de leitura em memória/visualização), exceto quando um arquivo é carregado e anexado permanentemente como nota (`NoteItem`) ou anexo de ticket.
- **Adiciona/Remove dados?** Lê streams de dados e strings em Base64.
- **Coleções/Tabelas afetadas**:
  - `notes` (Leitura de arquivos anexados)
  - `tickets` (Leitura de anexos vinculados)

---

## 3. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | O que foi modificado / Adicionado |
| :--- | :--- | :--- | :--- |
| `v1.3.0` | 2026-08-19 | Antigravity AI | 1) **Alternador de Visualização em CSV**: Implementado seletor entre "📊 Tabela" (grid estruturado) e "📝 Texto CSV" (conteúdo bruto formatado com contagem de linhas). 2) **Botão Abrir na Pasta**: Adicionado botão no cabeçalho do visualizador para revelar o arquivo no Windows Explorer via IPC `showItemInFolder`. 3) **Ampliação da Largura Útil**: Expandido o container de leitura de documentos Word (`.docx`), Markdown (`.md`) e tabelas de um limite estático de 880px para 100% fluido com margens balanceadas. |
| `v1.2.0` | 2026-08-17 | Antigravity AI | Integração global do `handleOpenFileViewer` no `App.tsx` para suporte a abertura direta de arquivos a partir da Agenda e de links rápidos. |
| `v1.1.0` | 2026-08-14 | Antigravity AI | Correção de manipulação de anexos com caminhos especiais e renderização responsiva. |
