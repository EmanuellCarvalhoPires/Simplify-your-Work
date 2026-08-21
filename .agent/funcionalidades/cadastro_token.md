# 🔑 Cadastro e Gestão de Tokens de API

## 1. Descrição e Propósito
A funcionalidade de **Cadastro de Token** gerencia a inclusão e validação manual de credenciais de acesso para serviços externos que utilizam autenticação direta (Basic Auth ou Bearer Token).
- **Finalidade**: Permitir a conexão com instâncias do Jira Server / Jira Data Center ou Jira Cloud através de e-mail corporativo + Atlassian API Token, bem como credenciais para calendários ICS remotos protegidos.
- **Fluxo de Utilização**:
  1. O usuário acessa a aba de Configurações ou o modal "Adicionar Instância Jira".
  2. Preenche o Nome da Conexão, Domínio (ex: `empresa.atlassian.net`), E-mail do usuário e o API Token gerado no portal Atlassian.
  3. O sistema testa a validade da credencial através do IPC `saveJiraInstance` e persiste os dados com segurança.
- **Arquivos e Componentes Envolvidos**:
  - [`electron/database.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/database.ts)
  - [`electron/jira-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/jira-service.ts)
  - [`src/components/settings/SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx)
  - [`src/components/tickets/AddJiraModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/AddJiraModal.tsx)

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Sim
- **Adiciona/Remove dados?** Adiciona, edita e remove instâncias Jira vinculadas a API Tokens.
- **Coleções/Tabelas afetadas**:
  - `jira_instances`
- **Operações detalhadas**:
  - **Create / Insert**: Insere objeto de instância contendo:
    ```typescript
    {
      id: string;
      name: string;
      domain: string;
      email: string;
      apiToken: string;
      authType: 'API_TOKEN';
    }
    ```
  - **Read**: Consulta instâncias registradas via `getJiraInstances`.
  - **Delete**: Remove instâncias do banco via `deleteJiraInstance(id)`.

---

## 3. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | O que foi modificado / Adicionado |
| :--- | :--- | :--- | :--- |
| `v1.1.0` | 2026-08-21 | Antigravity AI | **Exclusão em Cascata de Tickets e Consultas**: Ao deletar uma instância de integração Jira, o backend SQLite [`electron/database.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/database.ts) e a interface [`src/App.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/App.tsx) removem automaticamente todos os tickets não-locais e queries JQL vinculados àquela instância, além de limpar referências no módulo de Clientes (Assets). |
| `v1.0.0` | 2026-08-14 | Antigravity AI | Criação da persistência de API Tokens para Jira e validação de domínio. |
