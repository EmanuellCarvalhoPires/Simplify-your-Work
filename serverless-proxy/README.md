# 🛡️ Servidor Proxy Serverless para Atlassian OAuth 2.0 (Simplify your Work)

Este servidor proxy serverless permite que seu aplicativo desktop **Simplify your Work** realize o login OAuth 2.0 com a Atlassian **sem expor o Client Secret** no executável ou no computador dos usuários.

---

## ⚡ Como Implantar Gratuitamente no Vercel (em 2 minutos)

### Opção 1: Via Vercel CLI (Recomendado e mais rápido)
1. Instale o Vercel CLI no terminal (se ainda não tiver):
   ```bash
   npm i -g vercel
   ```
2. Entre na pasta deste proxy no terminal:
   ```bash
   cd serverless-proxy
   ```
3. Execute o comando de deploy:
   ```bash
   vercel --prod
   ```
4. Durante a publicação, quando o Vercel perguntar pelas variáveis de ambiente (ou no painel do Vercel em *Settings -> Environment Variables*), adicione:
   - **Nome:** `ATLASSIAN_CLIENT_SECRET`
   - **Valor:** `O_SEU_CLIENT_SECRET_DA_ATLASSIAN`

---

### Opção 2: Via GitHub / Vercel Dashboard
1. Suba esta pasta `serverless-proxy` em um repositório no seu GitHub.
2. Acesse [vercel.com](https://vercel.com) e clique em **Add New Project**.
3. Importe o repositório.
4. Em **Environment Variables**, adicione:
   - `ATLASSIAN_CLIENT_SECRET` = `seu_client_secret_da_atlassian`
5. Clique em **Deploy**.

---

## 🔗 URL Final do seu Proxy

Após o deploy, o Vercel fornecerá uma URL pública como:
`https://simplify-auth-proxy.vercel.app`

A URL do endpoint de token será:
👉 **`https://simplify-auth-proxy.vercel.app/api/token`**

Cole essa URL no campo **URL do Servidor Proxy Auth** dentro do aplicativo **Simplify your Work** (em *Configurações -> APIs do Jira (2)*).
