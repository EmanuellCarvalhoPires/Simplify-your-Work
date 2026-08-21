import http from 'http';
import crypto from 'crypto';
import { shell } from 'electron';
import type { AccessibleJiraSite } from '../src/types/electron';

// Default Atlassian OAuth credentials
const DEFAULT_ATLASSIAN_CLIENT_ID = 'ylA7OylhMAcq3fuSo5EzXmdoXmysHfhh';
const DEFAULT_ATLASSIAN_PROXY_URL = 'https://simplifyyourwork.vercel.app/api/token';

export interface OAuthUserInfo {
  account_id?: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface OAuthResult {
  sites: AccessibleJiraSite[];
  accessToken: string;
  refreshToken: string;
  userInfo?: OAuthUserInfo;
}

let activeOAuthServer: http.Server | null = null;
let activeOAuthTimeout: NodeJS.Timeout | null = null;

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generatePKCE() {
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = base64UrlEncode(hash);
  return { codeVerifier, codeChallenge };
}

export function cancelActiveOAuthFlow(): boolean {
  if (activeOAuthTimeout) {
    clearTimeout(activeOAuthTimeout);
    activeOAuthTimeout = null;
  }
  if (activeOAuthServer) {
    try {
      activeOAuthServer.close();
    } catch (e) {}
    activeOAuthServer = null;
    return true;
  }
  return false;
}

export function startAtlassianOAuthFlow(
  customClientId?: string,
  savedClientId?: string,
  customClientSecret?: string,
  savedClientSecret?: string,
  customProxyUrl?: string,
  savedProxyUrl?: string
): Promise<OAuthResult> {
  return new Promise((resolve, reject) => {
    cancelActiveOAuthFlow();

    const clientId = customClientId?.trim() || savedClientId?.trim() || process.env.VITE_ATLASSIAN_CLIENT_ID || process.env.ATLASSIAN_CLIENT_ID || DEFAULT_ATLASSIAN_CLIENT_ID;
    const clientSecret = customClientSecret?.trim() || savedClientSecret?.trim() || process.env.VITE_ATLASSIAN_CLIENT_SECRET || process.env.ATLASSIAN_CLIENT_SECRET || '';
    const proxyUrl = customProxyUrl?.trim() || savedProxyUrl?.trim() || process.env.VITE_ATLASSIAN_PROXY_URL || process.env.ATLASSIAN_PROXY_URL || DEFAULT_ATLASSIAN_PROXY_URL;
    const port = 3000;
    const redirectUri = `http://localhost:${port}/callback`;

    // Generate PKCE code verifier and challenge for enhanced OAuth security (RFC 7636)
    const { codeVerifier, codeChallenge } = generatePKCE();

    let server: http.Server | null = null;

    activeOAuthTimeout = setTimeout(() => {
      cancelActiveOAuthFlow();
      reject(new Error('Tempo limite excedido para o login na Atlassian (90 segundos). Tente novamente.'));
    }, 90 * 1000);

    server = http.createServer(async (req, res) => {
      try {
        if (!req.url) return;
        const reqUrl = new URL(req.url, `http://localhost:${port}`);

        if (reqUrl.pathname === '/callback') {
          const code = reqUrl.searchParams.get('code');
          const error = reqUrl.searchParams.get('error');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <div style="font-family:sans-serif; text-align:center; padding:50px;">
                <h2 style="color:#ef4444;">Login cancelado ou recusado</h2>
                <p>${error}</p>
                <p>Você pode fechar esta aba e retornar ao Simplify your Work.</p>
              </div>
            `);
            cancelActiveOAuthFlow();
            reject(new Error(`Autorização Atlassian recusada: ${error}`));
            return;
          }

          if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h3>Código de autorização não encontrado.</h3>');
            return;
          }

          // HTML response for browser user
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <div style="font-family:sans-serif; text-align:center; padding:50px; background:#181825; color:#ffffff;">
              <h2 style="color:#6366f1;">⚡ Login Atlassian Autorizado com Sucesso!</h2>
              <p style="color:#94a3b8;">Retorne ao aplicativo Simplify your Work para selecionar os sites Jira que deseja conectar.</p>
              <script>setTimeout(() => window.close(), 2500);</script>
            </div>
          `);

          cancelActiveOAuthFlow();

          // 2. Exchange authorization code for access_token & refresh_token
          let tokenRes: Response;

          let formattedProxyUrl = proxyUrl.trim();
          if (formattedProxyUrl && !formattedProxyUrl.startsWith('http://') && !formattedProxyUrl.startsWith('https://')) {
            if (formattedProxyUrl.includes('.vercel.app') || formattedProxyUrl.includes('.')) {
              formattedProxyUrl = `https://${formattedProxyUrl}`;
            } else {
              formattedProxyUrl = '';
            }
          }

          if (formattedProxyUrl) {
            // Use Serverless Auth Proxy (e.g., Vercel) - Zero Secret Exposure on Desktop!
            const targetUrl = formattedProxyUrl.endsWith('/api/token') ? formattedProxyUrl : `${formattedProxyUrl.replace(/\/+$/, '')}/api/token`;
            tokenRes = await fetch(targetUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code,
                redirect_uri: redirectUri,
                client_id: clientId,
                code_verifier: codeVerifier,
              }),
            });
          } else {
            // Direct Exchange with Atlassian
            const tokenPayload: any = {
              grant_type: 'authorization_code',
              client_id: clientId,
              code,
              redirect_uri: redirectUri,
              code_verifier: codeVerifier,
            };

            if (clientSecret) {
              tokenPayload.client_secret = clientSecret;
            }

            tokenRes = await fetch('https://auth.atlassian.com/oauth/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(tokenPayload),
            });
          }

          if (!tokenRes.ok) {
            const errText = await tokenRes.text();
            if (tokenRes.status === 401 && !clientSecret && !proxyUrl) {
              reject(new Error('A Atlassian recusou a autenticação sem o Client Secret. Preencha o "Client Secret" ou configure a "URL do Proxy Vercel" em Configurações.'));
            } else {
              reject(new Error(`Falha ao obter tokens Atlassian: ${tokenRes.status} ${errText}`));
            }
            return;
          }

          const tokenData = await tokenRes.json();
          const accessToken = tokenData.access_token;
          const refreshToken = tokenData.refresh_token || '';

          // 3. Fetch accessible Jira resources (sites)
          const sitesRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          });

          let parsedSites: AccessibleJiraSite[] = [];
          if (sitesRes.ok) {
            const sitesList = await sitesRes.json();
            parsedSites = (sitesList || []).map((s: any) => ({
              id: String(s.id || ''),
              name: String(s.name || s.url || 'Jira Cloud'),
              url: String(s.url || '').replace(/\/+$/, ''),
              avatarUrl: s.avatarUrl || '',
              scopes: s.scopes || [],
            }));
          }

          // 4. Fetch authenticated user profile (Atlassian /me API + Jira /myself fallback)
          let userInfo: OAuthUserInfo | undefined;
          try {
            const meRes = await fetch('https://api.atlassian.com/me', {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
              },
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              userInfo = {
                account_id: meData.account_id,
                email: meData.email,
                name: meData.name || meData.nickname || (meData.email ? meData.email.split('@')[0] : 'Usuário Atlassian'),
                picture: meData.picture,
              };
            }
          } catch (e) {
            console.warn('[OAuth] Erro ao buscar /me:', e);
          }

          if ((!userInfo || !userInfo.email) && parsedSites.length > 0) {
            try {
              const myselfRes = await fetch(`https://api.atlassian.com/ex/jira/${parsedSites[0].id}/rest/api/3/myself`, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  Accept: 'application/json',
                },
              });
              if (myselfRes.ok) {
                const myData = await myselfRes.json();
                userInfo = {
                  account_id: myData.accountId || userInfo?.account_id,
                  email: myData.emailAddress || userInfo?.email,
                  name: myData.displayName || userInfo?.name || 'Usuário Atlassian',
                  picture: myData.avatarUrls?.['48x48'] || userInfo?.picture,
                };
              }
            } catch (e) {
              console.warn('[OAuth] Erro ao buscar Jira /myself:', e);
            }
          }

          resolve({
            sites: parsedSites,
            accessToken,
            refreshToken,
            userInfo,
          });
        }
      } catch (err: any) {
        cancelActiveOAuthFlow();
        reject(err);
      }
    });

    server.listen(port, () => {
      activeOAuthServer = server;
      // 5. Open Atlassian Authorize URL in user's default browser with PKCE parameters (includes write:jira-work for commenting and modifying issues)
      const scopes = encodeURIComponent('read:me read:jira-work write:jira-work read:jira-user offline_access');
      const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&prompt=consent&code_challenge=${codeChallenge}&code_challenge_method=S256`;
      shell.openExternal(authUrl);
    });

    server.on('error', (err) => {
      cancelActiveOAuthFlow();
      reject(new Error(`Não foi possível iniciar o servidor OAuth local na porta ${port}: ${err.message}`));
    });
  });
}

export async function refreshAtlassianToken(
  refreshToken: string,
  customClientId?: string,
  savedClientId?: string,
  customClientSecret?: string,
  savedClientSecret?: string,
  customProxyUrl?: string,
  savedProxyUrl?: string
): Promise<{ accessToken: string; refreshToken?: string }> {
  const clientId = customClientId?.trim() || savedClientId?.trim() || process.env.VITE_ATLASSIAN_CLIENT_ID || process.env.ATLASSIAN_CLIENT_ID || DEFAULT_ATLASSIAN_CLIENT_ID;
  const clientSecret = customClientSecret?.trim() || savedClientSecret?.trim() || process.env.VITE_ATLASSIAN_CLIENT_SECRET || process.env.ATLASSIAN_CLIENT_SECRET || '';
  const proxyUrl = customProxyUrl?.trim() || savedProxyUrl?.trim() || process.env.VITE_ATLASSIAN_PROXY_URL || process.env.ATLASSIAN_PROXY_URL || DEFAULT_ATLASSIAN_PROXY_URL;

  let formattedProxyUrl = proxyUrl.trim();
  if (formattedProxyUrl && !formattedProxyUrl.startsWith('http://') && !formattedProxyUrl.startsWith('https://')) {
    if (formattedProxyUrl.includes('.vercel.app') || formattedProxyUrl.includes('.')) {
      formattedProxyUrl = `https://${formattedProxyUrl}`;
    } else {
      formattedProxyUrl = '';
    }
  }

  let tokenRes: Response | null = null;
  let lastError = '';

  // 1. Tenta renovar via Serverless Proxy se configurado
  if (formattedProxyUrl) {
    try {
      const targetUrl = formattedProxyUrl.endsWith('/api/token') ? formattedProxyUrl : `${formattedProxyUrl.replace(/\/+$/, '')}/api/token`;
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: clientId,
          refresh_token: refreshToken,
        }),
      });
      if (res.ok) {
        tokenRes = res;
      } else {
        const errBody = await res.text();
        lastError = `Proxy (${res.status}): ${errBody}`;
      }
    } catch (proxyErr: any) {
      lastError = `Proxy network error: ${proxyErr.message}`;
    }
  }

  // 2. Se o proxy falhar ou não estiver configurado, tenta direto na Atlassian
  if (!tokenRes || !tokenRes.ok) {
    try {
      const tokenPayload: any = {
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshToken,
      };
      if (clientSecret) {
        tokenPayload.client_secret = clientSecret;
      }
      const directRes = await fetch('https://auth.atlassian.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenPayload),
      });
      if (directRes.ok) {
        tokenRes = directRes;
      } else {
        const directErr = await directRes.text();
        lastError = `Atlassian Direct (${directRes.status}): ${directErr}`;
      }
    } catch (directNetErr: any) {
      lastError = `Atlassian Direct network error: ${directNetErr.message}`;
    }
  }

  if (!tokenRes || !tokenRes.ok) {
    throw new Error(`Falha ao renovar token Atlassian: ${lastError}`);
  }

  const tokenData = await tokenRes.json();
  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || refreshToken,
  };
}

