# 🔐 Autenticação OAuth 2.0 (Atlassian & Google)

## 1. Descrição e Propósito
A funcionalidade de **OAuth 2.0** permite a autenticação delegada segura com o ecossistema Atlassian (Jira Cloud) e suporte a provedores externos (Google).
- **Finalidade**: Permitir que o usuário conecte instâncias do Jira sem necessidade de expor ou digitar manualmente API Tokens e senhas sensíveis, obtendo automaticamente a lista de sites Jira disponíveis (`cloudId`, `name`, `url`), token de acesso (`access_token`) e token de renovação (`refresh_token`).
- **Fluxo de Utilização**:
  1. O usuário clica em "Conectar via OAuth" nas Configurações ou no modal de adição de instâncias Jira.
  2. O processo principal do Electron (`oauth-service.ts`) inicia um servidor HTTP local efêmero (ex: `http://localhost:3456/callback`) ou se comunica via proxy configurado.
  3. Abre a janela do navegador para o usuário autorizar o aplicativo na Atlassian.
  4. O callback recebe o `authorization_code`, realiza o handshake para obter tokens e consulta as instâncias acessíveis em `https://api.atlassian.com/oauth/token/accessible-resources`.
  5. As instâncias descobertas são salvas no banco de dados local associadas aos tokens obtidos.
- **Arquivos e Componentes Envolvidos**:
  - [`electron/oauth-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/oauth-service.ts)
  - [`electron/main.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/main.ts)
  - [`src/components/settings/SettingsView.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/settings/SettingsView.tsx)
  - [`src/components/tickets/AddJiraModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/tickets/AddJiraModal.tsx)

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Sim
- **Adiciona/Remove dados?** Adiciona e Modifica instâncias de Jira e credenciais de configuração.
- **Coleções/Tabelas afetadas**:
  - `jira_instances`
  - `system_settings` (credenciais OAuth customizadas: Client ID, Secret, Proxy URL)
- **Operações detalhadas**:
  - **Create / Insert**: Insere novo registro na coleção `jira_instances` com campos:
    ```typescript
    {
      id: string;
      name: string;
      domain: string;
      email: string;
      apiToken: string; // Vazio ou token de fallback
      authType: 'OAUTH';
      accessToken: string;
      refreshToken: string;
      cloudId: string;
      avatarUrl?: string;
    }
    ```
  - **Update**: Atualiza tokens de acesso expirados via `refresh_token` automático.
  - **Read**: Recupera tokens ativos para executar chamadas de API Jira.

---

## 3. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | O que foi modificado / Adicionado |
| :--- | :--- | :--- | :--- |
| `v1.3.0` | 2026-08-20 | Antigravity AI | **Renovação Proativa em Segundo Plano (`startJiraTokenRefresher`)**: Adicionado agendador em background que roda a cada 30 minutos em [`electron/jira-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/jira-service.ts) e [`electron/main.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/main.ts), renovando proativamente os tokens das instâncias OAuth antes da marca de 60 minutos da Atlassian, mantendo as sessões sempre ativas sem requisições de login. |
| `v1.2.0` | 2026-08-20 | Antigravity AI | **Prevenção de Solicitações Repetidas de Login & Mutex de Rotação de Tokens**: 1) Alterado o parâmetro de autorização em [`electron/oauth-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/oauth-service.ts) de `prompt=login` para `prompt=consent`, permitindo que o navegador reaproveite a sessão ativa do usuário sem exigir nova digitação de senha/2FA. 2) Implementado mutex de concorrência (`refreshPromises`) e recarga atômica do SQLite em [`electron/jira-service.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/jira-service.ts), impedindo que múltiplas requisições paralelas invalidem os *rotating refresh tokens* da Atlassian. 3) Adicionado fallback duplo de renovação (Proxy -> Endpoint direto da Atlassian). |
| `v1.1.0` | 2026-08-14 | Antigravity AI | Adicionado suporte a Proxy Serverless para ambientes restritos e renovação automática de refresh token. |
| `v1.0.0` | 2026-08-14 | Antigravity AI | Criação inicial do fluxo OAuth com servidor local e Atlassian Cloud Resources. |
