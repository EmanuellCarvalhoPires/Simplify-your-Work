// Vercel Serverless Function: Proxy de Autenticação OAuth Atlassian (Simplify your Work)
export default async function handler(req, res) {
  // Configuração de CORS para aceitar chamadas de aplicativos cliente
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const { code, redirect_uri, client_id, code_verifier, grant_type, refresh_token } = req.body || {};

    const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET;
    if (!clientSecret) {
      return res.status(500).json({ error: 'ATLASSIAN_CLIENT_SECRET não configurado nas variáveis de ambiente do Vercel.' });
    }

    const finalGrantType = grant_type || (refresh_token ? 'refresh_token' : 'authorization_code');

    let payload;
    if (finalGrantType === 'refresh_token') {
      if (!refresh_token || !client_id) {
        return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes para renovação: refresh_token, client_id' });
      }
      payload = {
        grant_type: 'refresh_token',
        client_id,
        client_secret: clientSecret,
        refresh_token,
      };
    } else {
      if (!code || !redirect_uri || !client_id) {
        return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes: code, redirect_uri, client_id' });
      }
      payload = {
        grant_type: 'authorization_code',
        client_id,
        client_secret: clientSecret,
        code,
        redirect_uri,
      };
      if (code_verifier) {
        payload.code_verifier = code_verifier;
      }
    }

    const tokenRes = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await tokenRes.json();
    return res.status(tokenRes.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno no servidor proxy.' });
  }
}
