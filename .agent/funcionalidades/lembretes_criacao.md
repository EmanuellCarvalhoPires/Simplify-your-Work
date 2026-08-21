# ⏰ Criação e Gestão de Lembretes

## 1. Descrição e Propósito
A funcionalidade de **Criação e Gestão de Lembretes** permite configurar alarmes e notificações programadas para tarefas críticas, compromissos ou revisões periódicas.
- **Finalidade**:
  - Criar lembretes únicos (`ONCE`), diários (`DAILY`) ou por intervalo contínuo de minutos (`INTERVAL`).
  - Visualização em **Lista estruturada** com colunas claras ou em **Cards / Grid** com alternador rápido.
  - Filtros avançados combináveis: busca em tempo real, status (ativos/pausados), origem (manuais/agenda), recorrência (intervalo, diário, pontual) e período (iminentes, hoje, semana, mês).
  - Mecanismo multidirecional de ordenação por próximo disparo (`upcoming`), mais recentes (`recent`), alfabético por título (`name`), status (`status`) e recorrência (`recurrence`), com seletor de direção (Ascendente / Descendente).
  - Mini Dashboard com métricas no topo (total cadastrado, ativos, iminentes < 30min, rotinas periódicas e eventos sincronizados de calendário).
  - Chips inteligentes de contagem regressiva em tempo real (`"🚨 Pronto para disparar"`, `"⏳ Em X min"`, `"⏰ Hoje às HH:mm"`, `"📅 Em X dias"`, `"Pausado"`).
  - Templates rápidos no modal de criação (💧 Beber água, 🧘 Alongamento/Postura, ☕ Pausa para café, 📋 Daily Meeting, 🏁 Fechamento do dia).
  - Ações rápidas nos itens: Ativação/Pausa instantânea, teste de notificação, edição, duplicação e exclusão com confirmação.
- **Fluxo de Utilização**:
  1. O usuário acessa a seção de Lembretes ([`ReminderManager.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/reminders/ReminderManager.tsx)) ou o painel do Hub.
  2. Filtra ou busca instantaneamente seus alertas por texto ou categoria na barra de ferramentas superior.
  3. Pode criar novos lembretes escolhendo um template com 1 clique ou preenchendo os campos personalizados.
  4. Ao salvar, o lembrete é registrado no banco e agendado pelo serviço de background ([`scheduler.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/scheduler.ts)).
- **Arquivos e Componentes Envolvidos**:
  - [`src/components/reminders/ReminderManager.tsx`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/src/components/reminders/ReminderManager.tsx)
  - [`electron/scheduler.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/scheduler.ts)
  - [`electron/database.ts`](file:///c:/Users/Trabalho/Documents/Simplify%20your%20Work/electron/database.ts)

---

## 2. Impacto no Banco de Dados
- **Altera o banco de dados?** Sim
- **Adiciona/Remove dados?** Cria, modifica e exclui lembretes do banco de dados.
- **Coleções/Tabelas afetadas**:
  - `reminders`
- **Operações detalhadas**:
  - **Create / Insert**: Salva novo documento `Reminder`:
    ```typescript
    {
      id: string;
      eventId?: string;
      title: string;
      message: string;
      recurrence: 'ONCE' | 'DAILY' | 'INTERVAL';
      intervalMinutes?: number;
      scheduledTime?: string;
      enabled: boolean;
      lastTriggered?: string;
      createdAt: string;
    }
    ```
  - **Read**: `getReminders()` carrega todos os lembretes para o renderer.
  - **Update**: `saveReminder()` atualiza título, horários, estado `enabled` ou registro de `lastTriggered`.
  - **Delete**: `deleteReminder(id)` remove o registro do banco e cancela a programação no scheduler.

---

## 3. Histórico de Versões e Modificações
| Versão | Data | Autor / Agente | O que foi modificado / Adicionado |
| :--- | :--- | :--- | :--- |
| `v1.6.0` | 2026-08-21 | Antigravity AI | Otimização do agendador (`scheduler.ts`): prevenção de spam de logs em loops de checagem ao pausar notificações durante reuniões, eliminação de concorrência assíncrona com `isChecking` e ciclo ordenado. |
| `v1.5.0` | 2026-08-19 | Antigravity AI | Correção no expurgo de lembretes de reuniões passadas ou removidas da agenda e ajuste no cálculo de contagem regressiva para não marcar eventos passados como "Pronto para disparar". |
| `v1.4.0` | 2026-08-19 | Antigravity AI | Implementada visualização em Lista moderna com alternador para Cards/Grid; busca textual instantânea; filtros por status, origem, recorrência e período; ordenação com direção (Asc/Desc); mini dashboard de métricas; modelos rápidos (presets) de criação; e ações de duplicação e ativação rápida. |
| `v1.3.0` | 2026-08-17 | Antigravity AI | Remoção dos botões de "Testar" nos cards de lembretes e do disparo automático de teste ao salvar, tornando a interface mais limpa e focada na gestão de lembretes. |
| `v1.2.0` | 2026-08-14 | Antigravity AI | Implementada ordenação cronológica automática pelos lembretes mais próximos de acontecer (`upcoming`), com contagem regressiva visual e seletor de ordenação. |
| `v1.1.0` | 2026-08-14 | Antigravity AI | Ajustes no formulário e sincronização automática de estado com o scheduler de background. |
| `v1.0.0` | 2026-08-14 | Antigravity AI | Implementação do formulário de criação de lembretes, suporte a recorrências e teste em tempo real. |
