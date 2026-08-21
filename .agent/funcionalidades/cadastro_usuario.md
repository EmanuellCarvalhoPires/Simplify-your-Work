# 👤 Cadastro e Gestão de Usuários (Perfis)

## 1. Descrição e Propósito
A funcionalidade de **Cadastro de Usuário** gerencia os perfis de usuários locais do aplicativo, permitindo que múltiplos colaboradores ou diferentes contextos de trabalho (ex: Pessoal vs. Corporativo) coexistam no mesmo aplicativo com preferências visuais e configurações personalizadas.
- **Finalidade**:
  - Criar novos perfis com Nome, E-mail, Cargo/Role e Cor de Avatar.
  - Alternar o usuário ativo em tempo de execução através do Header do app.
  - Salvar temas e preferências visuais customizadas por perfil.
- **Fluxo de Utilização**:
  1. O usuário clica no avatar/perfil no cabeçalho superior ([`Header.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Header.tsx)).
  2. Um modal ([`UserModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/UserModal.tsx)) permite editar o perfil atual, cadastrar um novo usuário ou trocar de conta ativa.
  3. A alternância de usuário recarrega o contexto de preferências e temas instantaneamente.
- **Arquivos e Componentes Envolvidos**:
  - [`src/components/common/UserModal.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/common/UserModal.tsx)
  - [`src/components/layout/Header.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/layout/Header.tsx)
  - [`electron/database.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/database.ts)
  - [`src/types/index.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/types/index.ts)

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Sim
- **Adiciona/Remove dados?** Adiciona novos usuários, edita perfis e define qual usuário está ativo.
- **Coleções/Tabelas afetadas**:
  - `users`
  - `active_user_session` (ou chave `activeUserId` em configurações)
- **Operações detalhadas**:
  - **Create / Insert**: Insere novo documento de usuário com estrutura `UserProfile`:
    ```typescript
    {
      id: string;
      name: string;
      email: string;
      role?: string;
      avatarColor?: string;
      themeConfig: ThemeConfig;
      createdAt: string;
      updatedAt: string;
    }
    ```
  - **Read**: `getUsers()` e `getActiveUser()` recuperam a lista e a sessão atual.
  - **Update**: `saveUser()` atualiza campos do perfil e `setActiveUser(id)` atualiza a sessão ativa.
  - **Delete**: `deleteUser(id)` remove o perfil especificado (com validação para manter ao menos 1 perfil padrão).

---

## 3. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | O que foi modificado / Adicionado |
| :--- | :--- | :--- | :--- |
| `v1.0.0` | 2026-08-14 | Antigravity AI | Criação da gestão multiusuário, modal de seleção de perfil e persistência no banco. |
