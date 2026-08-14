# Política de Privacidade - Simplify your Work

**Última atualização:** 14 de agosto de 2026

A sua privacidade é extremamente importante para nós. Esta Política de Privacidade descreve como a aplicação **Simplify your Work** coleta, utiliza, armazena e protege as informações dos usuários ao utilizar nossos serviços e integrações, incluindo a autenticação oficial via **Atlassian OAuth 2.0**, integração com **Jira Cloud**, sincronização de **Calendário/Agenda (ICS/Outlook)** e armazenamento de dados locais/MongoDB.

---

## 1. Informações que Coletamos

Para fornecer os recursos de produtividade e gerenciamento de tarefas, o **Simplify your Work** pode coletar e processar os seguintes dados:

### 1.1. Dados de Autenticação Atlassian (OAuth 2.0)
Quando você opta por fazer login com sua conta Atlassian, solicitamos autorização via OAuth 2.0 para acessar:
- **Dados do Perfil:** Nome de exibição (*displayName*), endereço de e-mail e foto de perfil/avatar.
- **Identificadores da Conta:** *Account ID* da Atlassian e IDs das instâncias Jira Cloud às quais sua conta possui acesso (*Accessible Resources*).
- **Credenciais de Acesso:** Tokens de acesso (*Access Token*) e tokens de atualização (*Refresh Token*) emitidos pela Atlassian.

### 1.2. Dados de Integração do Jira Cloud
- Chaves de chamados (*Ticket Keys*), resumos (*Summary*), descrições, status, prioridades e datas de vencimento dos tickets consultados ou importados via filtros JQL.
- API Tokens cadastrados manualmente pelo usuário (quando aplicável).

### 1.3. Dados de Calendário e Lembretes
- Links de calendário público/compartilhado (formato `.ics` ou Outlook iCal).
- Títulos de eventos, horários de início e término e descrições para geração de lembretes e notificações no aplicativo.

### 1.4. Perfis de Usuário Locais e Preferências
- Configurações de temas e cores da interface.
- Anotações locais (*Notes*), listas de tarefas e histórico de pesquisas JQL salvas.

---

## 2. Como Utilizamos as Suas Informações

Utilizamos as informações coletadas **exclusivamente** para garantir o funcionamento correto e eficiente da aplicação, incluindo:
1. **Autenticação e Identificação:** Criar e gerenciar seu perfil de usuário dentro da aplicação e manter sua sessão ativa.
2. **Sincronização com o Jira:** Consultar, exibir e atualizar seus chamados e tickets do Jira diretamente na interface do app.
3. **Organização Pessoal:** Exibir eventos de agenda, agendar lembretes e permitir a tomada de notas.
4. **Personalização:** Salvar suas preferências de tema, layout e consultas JQL frequentes.

> **Importante:** Nós **NÃO** vendemos, alugamos, compartilhamos ou comercializamos seus dados pessoais com terceiros para fins publicitários ou de marketing.

---

## 3. Armazenamento e Segurança dos Dados

- **Armazenamento Local:** Todos os tokens de acesso, configurações de perfil, notas e cache de chamados são armazenados localmente no dispositivo do usuário ou no banco de dados MongoDB configurado e controlado pelo próprio usuário.
- **Criptografia e Comunicação Segura:** Todas as comunicações entre o **Simplify your Work** e os servidores da Atlassian e Microsoft ocorrem estritamente por meio de conexões criptografadas HTTPS / TLS.
- **Revogação de Acesso:** Os tokens OAuth armazenados no aplicativo podem ser excluídos a qualquer momento removendo a instância Jira nas Configurações do app ou revogando a autorização diretamente no painel da sua conta Atlassian.

---

## 4. Conformidade com a LGPD e GDPR

Em conformidade com a **Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)** e o **Regulamento Geral sobre a Proteção de Dados (GDPR)**, você possui os seguintes direitos em relação aos seus dados:
- **Acesso e Confirmação:** Confirmar a existência de tratamento e acessar os dados salvos no seu aplicativo.
- **Correção:** Solicitar a correção de dados incompletos ou desatualizados em seu perfil de usuário.
- **Exclusão dos Dados:** Excluir instâncias Jira, contas de usuário, notas e histórico armazenados no aplicativo a qualquer momento.
- **Revogação de Consentimento:** Desconectar sua conta Atlassian a qualquer momento.

---

## 5. Permissões de APIs de Terceiros (Atlassian / Microsoft)

O **Simplify your Work** utiliza as APIs oficiais da Atlassian sob os seguintes escopos de permissão:
- `read:jira-work`: Para leitura e consulta de chamados do Jira.
- `read:jira-user`: Para identificação do usuário nos chamados.
- `read:me`: Para obtenção do perfil básico (nome e e-mail) do usuário autenticado.
- `offline_access`: Para manter a conexão ativa sem necessidade de logins frequentes.

---

## 6. Alterações nesta Política de Privacidade

Podemos atualizar esta Política de Privacidade periodicamente para refletir melhorias no aplicativo ou mudanças regulatórias. Recomendamos que você revise este documento ocasionalmente.

---

## 7. Contato e Suporte

Se você tiver dúvidas sobre esta Política de Privacidade ou sobre o tratamento de dados na aplicação, entre em contato pelo e-mail de suporte ou através do repositório oficial da aplicação.
