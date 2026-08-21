# 📋 Regra Obrigatória: Documentação Modular de Funcionalidades

Esta regra define a obrigatoriedade de criação e manutenção contínua de um arquivo Markdown individual para **cada funcionalidade/componente** do projeto.

---

## 🎯 Objetivo e Diretriz Central
- **Um Markdown por Funcionalidade**: Toda funcionalidade, serviço, módulo ou componente principal do aplicativo deve possuir um arquivo Markdown exclusivo dedicado.
- **Localização Centralizada**: Todos os arquivos de documentação de funcionalidades devem ficar centralizados na pasta:
  📁 [`.agent/funcionalidades/`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/.agent/funcionalidades)
- **Atualização Contínua Obrigatória**: Sempre que uma funcionalidade for criada, refatorada ou editada no código-fonte, o Markdown correspondente **DEVE** ser atualizado imediatamente com as novas alterações e o histórico de versão incrementado.

---

## 📐 Estrutura Obrigatória de Cada Markdown de Funcionalidade

Cada arquivo em `.agent/funcionalidades/<nome_da_funcionalidade>.md` deve seguir rigorosamente a estrutura abaixo:

```markdown
# [Nome da Funcionalidade]

## 1. Descrição e Propósito
- O que a funcionalidade faz?
- Qual problema ela resolve e qual é o fluxo de utilização pelo usuário ou sistema?
- Componentes e arquivos envolvidos (`src/...`, `electron/...`, etc.).

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** (Sim / Não)
- **Adiciona/Remove dados?** (Sim / Não)
- **Coleções/Tabelas afetadas**: (ex: `users`, `reminders`, `notes`, `tokens`, etc.)
- **Operações detalhadas**:
  - Inserções (Create)
  - Consultas (Read)
  - Modificações (Update)
  - Exclusões (Delete)
  - Esquema/Estrutura dos documentos manipulados

## 3. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | O que foi modificado / Adicionado |
| :--- | :--- | :--- | :--- |
| `v1.0.0` | YYYY-MM-DD | ... | Criação inicial da funcionalidade. |
| `v1.1.0` | YYYY-MM-DD | ... | Detalhamento da alteração realizada... |
```

---

## 🗂️ Mapeamento de Funcionalidades e Componentes do Projeto

O agente deve garantir que existam markdowns para **TODAS** as funcionalidades do aplicativo dentro de `.agent/funcionalidades/`, incluindo:

1. **Autenticação & Acesso**:
   - `oauth.md`: Fluxo OAuth, provedores e sessões.
   - `cadastro_token.md`: Armazenamento seguro de tokens e credenciais.
   - `cadastro_usuario.md`: Registro, perfis e autenticação de usuários.

2. **Agenda & Integrações**:
   - `agenda_ics.md`: Leitura, importação e sincronização de links/arquivos ICS.
   - `agenda_funcionalidades.md`: Visualização, filtros e gestão de eventos da agenda.

3. **Lembretes & Notificações**:
   - `lembretes_criacao.md`: Formulário e regras de criação/edição de lembretes.
   - `notificacoes_envio.md`: Mecanismo de disparo de notificações do sistema/desktop.
   - `notificacoes_agenda.md`: Notificações automáticas derivadas de eventos da agenda.

4. **Anotações & Visualizadores**:
   - `anotacoes_editor.md`: Editor Rich Text, formatação e salvamento.
   - `visualizador_arquivos.md`: Visualizadores embutidos de PDF, Word, Planilhas, etc.

5. **Banco de Dados & Armazenamento**:
   - `banco_de_dados_requisicoes.md`: Mapeamento de **TODAS** as requisições, endpoints e consultas suportadas pelo banco de dados.

---

## ⚡ Regra de Execução do Agente
1. Ao implementar ou modificar código em qualquer funcionalidade:
   - Identifique o Markdown correspondente em `.agent/funcionalidades/`.
   - Se o Markdown não existir, crie-o imediatamente com a estrutura padrão.
   - Se já existir, documente a nova modificação na seção de **Impacto no Banco de Dados** (se aplicável) e adicione uma nova entrada na tabela de **Histórico de Versões**.
