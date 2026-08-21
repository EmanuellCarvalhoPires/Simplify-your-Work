import { JiraInstance, Ticket, JiraComment, TicketStatus } from '../src/types/index';
import { refreshAtlassianToken } from './oauth-service';
import { dbSaveJiraInstance, dbGetJiraInstances } from './database';

// Helper to convert Atlassian Document Format (ADF) nodes to clean text
function parseAdfNode(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  if (node.type === 'hardBreak') return '\n';

  if (Array.isArray(node.content)) {
    const childrenText = node.content.map(parseAdfNode).join('');
    if (node.type === 'paragraph' || node.type === 'heading') {
      return childrenText + '\n\n';
    }
    if (node.type === 'listItem') {
      return '• ' + childrenText + '\n';
    }
    return childrenText;
  }
  return '';
}

export function parseAdfToText(adfObj: any): string {
  if (!adfObj) return '';
  if (typeof adfObj === 'string') return adfObj;
  if (adfObj.type === 'doc' && Array.isArray(adfObj.content)) {
    return adfObj.content.map(parseAdfNode).join('').trim();
  }
  return String(adfObj);
}

// Helper to detect if a Jira comment is internal (Service Desk internal note) vs public
export function isCommentInternalFromJira(c: any): boolean {
  if (!c) return true;
  if (c.jsdPublic === false) return true;
  if (c.public === false) return true;
  if (Array.isArray(c.properties)) {
    const sdProp = c.properties.find((p: any) => p.key === 'sd.public.comment');
    if (sdProp && sdProp.value && sdProp.value.internal === true) return true;
    if (sdProp && sdProp.value && sdProp.value.internal === false) return false;
  }
  if (c.visibility && (c.visibility.type === 'role' || c.visibility.type === 'group')) return true;
  if (c.jsdPublic === true || c.public === true) return false;
  return false;
}

// Helper to build request URL and Headers depending on Auth Type (OAuth 2.0 3LO Bearer vs Basic API Token)
function getJiraRequestConfig(instance: JiraInstance, apiPath: string) {
  const isOAuth = instance.authType === 'OAUTH' || Boolean(instance.cloudId && (instance.accessToken || instance.refreshToken));
  const cleanPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;

  if (isOAuth && instance.cloudId) {
    const token = instance.accessToken || instance.apiToken || '';
    return {
      isOAuth: true,
      url: `https://api.atlassian.com/ex/jira/${instance.cloudId}${cleanPath}`,
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };
  }

  let cleanDomain = instance.domain.trim().replace(/\/+$/, '');
  if (!cleanDomain.startsWith('http://') && !cleanDomain.startsWith('https://')) {
    cleanDomain = `https://${cleanDomain}`;
  }
  const authString = `${instance.email.trim()}:${instance.apiToken.trim()}`;
  const base64Auth = Buffer.from(authString).toString('base64');
  return {
    isOAuth: false,
    url: `${cleanDomain}${cleanPath}`,
    headers: {
      'Authorization': `Basic ${base64Auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  };
}

// Mutex to prevent multiple concurrent refresh requests from invalidating rotating refresh tokens
const refreshPromises = new Map<string, Promise<boolean>>();

async function tryRefreshToken(instance: JiraInstance): Promise<boolean> {
  const instanceKey = instance.id || instance.domain;

  if (refreshPromises.has(instanceKey)) {
    console.log(`[Jira Auth] Aguardando renovação em andamento para ${instance.name || instance.domain}...`);
    return await refreshPromises.get(instanceKey)!;
  }

  const refreshPromise = (async () => {
    try {
      // 1. Recarrega a instância mais recente do banco de dados para evitar tokens obsoletos
      const currentInstances = await dbGetJiraInstances();
      const freshInstance = currentInstances.find((i) => i.id === instance.id || i.domain === instance.domain) || instance;

      // Se a instância já foi atualizada recentemente por outra requisição e o accessToken mudou, atualiza a referência local
      if (freshInstance.accessToken && freshInstance.accessToken !== instance.accessToken) {
        instance.accessToken = freshInstance.accessToken;
        instance.refreshToken = freshInstance.refreshToken;
        console.log(`[Jira Auth] Token já havia sido renovado por outra requisição.`);
        return true;
      }

      const tokenToRefresh = freshInstance.refreshToken || freshInstance.apiToken || instance.refreshToken || instance.apiToken || '';
      if (!tokenToRefresh) return false;

      console.log(`[Jira Auth] Renovando access_token expirado para ${freshInstance.name || freshInstance.domain}...`);
      const refreshed = await refreshAtlassianToken(tokenToRefresh);
      if (refreshed && refreshed.accessToken) {
        instance.accessToken = refreshed.accessToken;
        freshInstance.accessToken = refreshed.accessToken;
        if (refreshed.refreshToken) {
          instance.refreshToken = refreshed.refreshToken;
          freshInstance.refreshToken = refreshed.refreshToken;
        }
        await dbSaveJiraInstance(freshInstance);
        console.log(`[Jira Auth] Token OAuth renovado e persistido com sucesso!`);
        return true;
      }
    } catch (e: any) {
      console.warn(`[Jira Auth] Falha ao renovar token automaticamente: ${e.message}`);
    } finally {
      refreshPromises.delete(instanceKey);
    }
    return false;
  })();

  refreshPromises.set(instanceKey, refreshPromise);
  return await refreshPromise;
}

export async function fetchJiraIssue(ticketKey: string, instance: JiraInstance): Promise<Ticket> {
  const formattedKey = ticketKey.trim().toUpperCase();
  let config = getJiraRequestConfig(instance, `/rest/api/3/issue/${formattedKey}`);

  let response: Response;
  try {
    response = await fetch(config.url, {
      method: 'GET',
      headers: config.headers,
    });
  } catch (netErr: any) {
    throw new Error(`Falha de conexão com o Jira (${instance.domain}). Verifique sua conexão de internet.`);
  }

  if ((response.status === 401 || response.status === 403) && (instance.refreshToken || instance.authType === 'OAUTH')) {
    const refreshed = await tryRefreshToken(instance);
    if (refreshed) {
      config = getJiraRequestConfig(instance, `/rest/api/3/issue/${formattedKey}`);
      try {
        response = await fetch(config.url, {
          method: 'GET',
          headers: config.headers,
        });
      } catch (e) {}
    }
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Ticket "${formattedKey}" não foi encontrado no Jira (${instance.domain}). Verifique se a chave exata está correta.`);
    } else if (response.status === 401 || response.status === 403) {
      throw new Error(`Autenticação recusada no Jira (${response.status}). Reconecte sua conta Atlassian em Configurações para renovar o acesso.`);
    }
    throw new Error(`Erro na API do Jira (${response.status}: ${response.statusText})`);
  }

  const issue = await response.json();
  const fields = issue.fields || {};

  // Parse Description
  const descriptionText = parseAdfToText(fields.description);

  // Parse Comments
  const commentsList: JiraComment[] = [];
  if (fields.comment && Array.isArray(fields.comment.comments)) {
    fields.comment.comments.forEach((c: any) => {
      commentsList.push({
        id: String(c.id || 'comm_' + Date.now()),
        author: c.author ? c.author.displayName || c.author.name || 'Desconhecido' : 'Desconhecido',
        body: parseAdfToText(c.body),
        created: c.created || new Date().toISOString(),
        isLocal: false,
        isInternal: isCommentInternalFromJira(c),
      });
    });
  }

  // Sort comments descending by creation date (newest comments first)
  commentsList.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

  // Parse Status
  const statusName = fields.status ? fields.status.name : 'A Fazer';
  const statusCategoryKey = fields.status && fields.status.statusCategory ? fields.status.statusCategory.key : '';

  let mappedStatus: TicketStatus = 'TO_DO';
  const lowerStatus = statusName.toLowerCase();
  if (statusCategoryKey === 'done' || lowerStatus.includes('conclu') || lowerStatus.includes('done')) {
    mappedStatus = 'DONE';
  } else if (lowerStatus.includes('backlog')) {
    mappedStatus = 'BACKLOG';
  } else if (lowerStatus.includes('priorit')) {
    mappedStatus = 'PRIORITIZED';
  } else if (lowerStatus.includes('seguida') || lowerStatus.includes('next')) {
    mappedStatus = 'NEXT';
  } else if (lowerStatus.includes('cliente') || lowerStatus.includes('waiting')) {
    mappedStatus = 'WAITING_CLIENT';
  } else if (lowerStatus.includes('bloque') || lowerStatus.includes('block')) {
    mappedStatus = 'BLOCKED';
  } else if (statusCategoryKey === 'indeterminate' || lowerStatus.includes('progresso') || lowerStatus.includes('progress') || lowerStatus.includes('andamento')) {
    mappedStatus = 'IN_PROGRESS';
  }

  const now = new Date().toISOString();

  return {
    id: `jira_${issue.key}_${instance.id}`,
    key: issue.key,
    source: 'JIRA',
    title: fields.summary || `Ticket ${issue.key}`,
    description: descriptionText,
    status: mappedStatus,
    statusLabel: statusName,
    jiraStatus: statusName,
    color: '#0284c7', // Slate Blue for Jira
    labels: Array.isArray(fields.labels) ? fields.labels : [],
    comments: commentsList,
    priority: fields.priority ? fields.priority.name : 'Normal',
    assignee: fields.assignee ? fields.assignee.displayName : 'Não atribuído',
    reporter: fields.reporter ? fields.reporter.displayName : 'Desconhecido',
    startDate: '',
    dueDate: '',
    jiraInstanceId: instance.id,
    updatedAt: fields.updated || now,
    createdAt: fields.created || now,
  };
}

export async function fetchJiraIssuesByJql(jqlOrLink: string, instance: JiraInstance): Promise<Ticket[]> {
  let finalJql = jqlOrLink.trim();

  // Extract filter ID or JQL param if user pasted a full URL
  if (finalJql.startsWith('http://') || finalJql.startsWith('https://')) {
    try {
      const parsedUrl = new URL(finalJql);
      const filterParam = parsedUrl.searchParams.get('filter');
      const jqlParam = parsedUrl.searchParams.get('jql');

      if (filterParam) {
        finalJql = `filter = ${filterParam}`;
      } else if (jqlParam) {
        finalJql = jqlParam;
      }
    } catch (e) {
      // Fallback
    }
  } else if (/^\d+$/.test(finalJql)) {
    // If user entered just a filter ID like "10024"
    finalJql = `filter = ${finalJql}`;
  }

  const fieldsParam = 'summary,description,status,assignee,reporter,priority,labels,created,updated,comment';
  const encodedJql = encodeURIComponent(finalJql);

  const payloadBody = JSON.stringify({
    jql: finalJql,
    maxResults: 100,
    fields: ['summary', 'description', 'status', 'assignee', 'reporter', 'priority', 'labels', 'created', 'updated', 'comment'],
  });

  const baseConfig = getJiraRequestConfig(instance, '/');
  const baseUrl = baseConfig.url.replace(/\/+$/, '');

  // Candidate API Search Endpoints to try sequentially until success
  const candidateRequests = [
    // Candidate 1: Jira Cloud v3 POST /rest/api/3/search/jql
    { url: `${baseUrl}/rest/api/3/search/jql`, method: 'POST', body: payloadBody },
    // Candidate 2: Jira Cloud v3 GET /rest/api/3/search
    { url: `${baseUrl}/rest/api/3/search?jql=${encodedJql}&maxResults=100&fields=${fieldsParam}`, method: 'GET', body: undefined },
    // Candidate 3: Jira v2 GET /rest/api/2/search
    { url: `${baseUrl}/rest/api/2/search?jql=${encodedJql}&maxResults=100&fields=${fieldsParam}`, method: 'GET', body: undefined },
    // Candidate 4: Jira v2 POST /rest/api/2/search
    { url: `${baseUrl}/rest/api/2/search`, method: 'POST', body: payloadBody },
    // Candidate 5: Legacy POST /rest/api/3/search
    { url: `${baseUrl}/rest/api/3/search`, method: 'POST', body: payloadBody },
  ];

  let lastResponse: Response | null = null;
  let searchResult: any = null;

    for (const candidate of candidateRequests) {
      try {
        console.log(`[Jira JQL Search] Testando endpoint: ${candidate.method} ${candidate.url}`);
        const res = await fetch(candidate.url, {
          method: candidate.method,
          headers: baseConfig.headers,
          body: candidate.body,
        });

        lastResponse = res;

        if (res.ok) {
          searchResult = await res.json();
          console.log(`[Jira JQL Search] Sucesso com ${candidate.method} ${candidate.url}`);
          break;
        } else {
          console.warn(`[Jira JQL Search] Endpoint ${candidate.method} ${candidate.url} retornou ${res.status}`);
        }
      } catch (err) {
        console.warn(`[Jira JQL Search] Erro ao chamar ${candidate.url}:`, err);
      }
    }

    // If initial search failed with 401/403, attempt token refresh and retry
    if ((!searchResult || !lastResponse || !lastResponse.ok) && (lastResponse?.status === 401 || lastResponse?.status === 403) && (instance.refreshToken || instance.authType === 'OAUTH')) {
      const refreshed = await tryRefreshToken(instance);
      if (refreshed) {
        const freshBaseConfig = getJiraRequestConfig(instance, '/');
        const freshBaseUrl = freshBaseConfig.url.replace(/\/+$/, '');
        const freshCandidates = [
          { url: `${freshBaseUrl}/rest/api/3/search/jql`, method: 'POST', body: payloadBody },
          { url: `${freshBaseUrl}/rest/api/3/search?jql=${encodedJql}&maxResults=100&fields=${fieldsParam}`, method: 'GET', body: undefined },
          { url: `${freshBaseUrl}/rest/api/2/search?jql=${encodedJql}&maxResults=100&fields=${fieldsParam}`, method: 'GET', body: undefined },
          { url: `${freshBaseUrl}/rest/api/2/search`, method: 'POST', body: payloadBody },
          { url: `${freshBaseUrl}/rest/api/3/search`, method: 'POST', body: payloadBody },
        ];

        for (const candidate of freshCandidates) {
          try {
            console.log(`[Jira JQL Search Retry] Testando endpoint: ${candidate.method} ${candidate.url}`);
            const res = await fetch(candidate.url, {
              method: candidate.method,
              headers: freshBaseConfig.headers,
              body: candidate.body,
            });

            lastResponse = res;

            if (res.ok) {
              searchResult = await res.json();
              console.log(`[Jira JQL Search Retry] Sucesso com ${candidate.method} ${candidate.url}`);
              break;
            }
          } catch (err) {}
        }
      }
    }

    if (!searchResult || !lastResponse || !lastResponse.ok) {
      const status = lastResponse ? lastResponse.status : 'Desconhecido';
      if (status === 400) {
        throw new Error(`A consulta JQL "${finalJql}" contém erros de sintaxe ou campos inválidos no Jira. Verifique nomes de marcas, projetos e status.`);
      } else if (status === 401 || status === 403) {
        throw new Error(`Autenticação recusada no Jira (${status}). Reconecte sua conta Atlassian ou verifique as credenciais da instância.`);
      } else if (status === 410) {
        throw new Error(`A API de Busca JQL do Jira retornou 410 (Descontinuado). Verifique as permissões de leitura no projeto.`);
      }
      throw new Error(`Erro na API do Jira (${status}: ${lastResponse ? lastResponse.statusText : ''})`);
    }

  const issues = Array.isArray(searchResult.issues) ? searchResult.issues : [];

  if (issues.length === 0) {
    return [];
  }

  const now = new Date().toISOString();

  return issues.map((issue: any) => {
    const fields = issue.fields || {};
    const descriptionText = parseAdfToText(fields.description);

    const commentsList: JiraComment[] = [];
    if (fields.comment && Array.isArray(fields.comment.comments)) {
      fields.comment.comments.forEach((c: any) => {
        commentsList.push({
          id: String(c.id || 'comm_' + Date.now()),
          author: c.author ? c.author.displayName || c.author.name || 'Desconhecido' : 'Desconhecido',
          body: parseAdfToText(c.body),
          created: c.created || now,
          isLocal: false,
          isInternal: isCommentInternalFromJira(c),
        });
      });
    }

    commentsList.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    const statusName = fields.status ? fields.status.name : 'A Fazer';
    const statusCategoryKey = fields.status && fields.status.statusCategory ? fields.status.statusCategory.key : '';

    let mappedStatus: TicketStatus = 'TO_DO';
    const lowerStatus = statusName.toLowerCase();
    if (statusCategoryKey === 'done' || lowerStatus.includes('conclu') || lowerStatus.includes('done')) {
      mappedStatus = 'DONE';
    } else if (lowerStatus.includes('backlog')) {
      mappedStatus = 'BACKLOG';
    } else if (lowerStatus.includes('priorit')) {
      mappedStatus = 'PRIORITIZED';
    } else if (lowerStatus.includes('seguida') || lowerStatus.includes('next')) {
      mappedStatus = 'NEXT';
    } else if (lowerStatus.includes('cliente') || lowerStatus.includes('waiting')) {
      mappedStatus = 'WAITING_CLIENT';
    } else if (lowerStatus.includes('bloque') || lowerStatus.includes('block')) {
      mappedStatus = 'BLOCKED';
    } else if (statusCategoryKey === 'indeterminate' || lowerStatus.includes('progresso') || lowerStatus.includes('progress') || lowerStatus.includes('andamento')) {
      mappedStatus = 'IN_PROGRESS';
    }

    return {
      id: `jira_${issue.key}_${instance.id}`,
      key: issue.key,
      source: 'JIRA',
      title: fields.summary || `Ticket ${issue.key}`,
      description: descriptionText,
      status: mappedStatus,
      statusLabel: statusName,
      jiraStatus: statusName,
      color: '#0284c7',
      labels: Array.isArray(fields.labels) ? fields.labels : [],
      comments: commentsList,
      priority: fields.priority ? fields.priority.name : 'Normal',
      assignee: fields.assignee ? fields.assignee.displayName : 'Não atribuído',
      reporter: fields.reporter ? fields.reporter.displayName : 'Desconhecido',
      startDate: '',
      dueDate: '',
      jiraInstanceId: instance.id,
      updatedAt: fields.updated || now,
      createdAt: fields.created || now,
    };
  });
}

export function convertTextToAdf(text: string) {
  const paragraphs = text.split('\n');
  return {
    type: 'doc',
    version: 1,
    content: paragraphs.map((p) => ({
      type: 'paragraph',
      content: p ? [{ type: 'text', text: p }] : [],
    })),
  };
}

export async function postJiraComment(
  ticketKey: string,
  commentBody: string,
  instance: JiraInstance,
  isInternal: boolean = true
): Promise<JiraComment> {
  const formattedKey = ticketKey.trim().toUpperCase();

  // Jira Cloud API v3 expects Atlassian Document Format (ADF) with sd.public.comment property for internal note
  const adfPayload = JSON.stringify({
    body: convertTextToAdf(commentBody),
    properties: [
      {
        key: 'sd.public.comment',
        value: {
          internal: isInternal,
        },
      },
    ],
  });

  // Jira API v2 or Server expects plain text { body: "comment", properties: [...] }
  const plainPayload = JSON.stringify({
    body: commentBody,
    properties: [
      {
        key: 'sd.public.comment',
        value: {
          internal: isInternal,
        },
      },
    ],
  });

  // Service Desk API endpoint payload (for Jira Service Management requests)
  const serviceDeskPayload = JSON.stringify({
    body: commentBody,
    public: !isInternal,
  });

  const baseConfig = getJiraRequestConfig(instance, '/');
  const baseUrl = baseConfig.url.replace(/\/+$/, '');

  // Candidate API endpoints to try sequentially
  const candidateRequests = [
    { url: `${baseUrl}/rest/api/3/issue/${formattedKey}/comment`, method: 'POST', body: adfPayload },
    { url: `${baseUrl}/rest/servicedeskapi/request/${formattedKey}/comment`, method: 'POST', body: serviceDeskPayload },
    { url: `${baseUrl}/rest/api/2/issue/${formattedKey}/comment`, method: 'POST', body: plainPayload },
  ];

  let lastResponse: Response | null = null;
  let commentData: any = null;

  for (const candidate of candidateRequests) {
    try {
      console.log(`[Jira Post Comment] Enviando requisição (${isInternal ? 'INTERNO' : 'EXTERNO'}) para: ${candidate.method} ${candidate.url}`);
      const res = await fetch(candidate.url, {
        method: candidate.method,
        headers: baseConfig.headers,
        body: candidate.body,
      });

      lastResponse = res;
      if (res.ok || res.status === 201 || res.status === 200) {
        commentData = await res.json();
        console.log(`[Jira Post Comment] Comentário criado com sucesso no Jira (${candidate.url})`);
        break;
      } else {
        console.warn(`[Jira Post Comment] Endpoint ${candidate.url} retornou status ${res.status}`);
      }
    } catch (err: any) {
      console.warn(`[Jira Post Comment] Erro ao chamar ${candidate.url}:`, err);
    }
  }

  // If 401/403 and OAuth, attempt to refresh token
  if (
    (!commentData || !lastResponse || (!lastResponse.ok && lastResponse.status !== 201 && lastResponse.status !== 200)) &&
    (lastResponse?.status === 401 || lastResponse?.status === 403) &&
    (instance.refreshToken || instance.authType === 'OAUTH')
  ) {
    const refreshed = await tryRefreshToken(instance);
    if (refreshed) {
      const freshBaseConfig = getJiraRequestConfig(instance, '/');
      const freshBaseUrl = freshBaseConfig.url.replace(/\/+$/, '');
      const freshCandidates = [
        { url: `${freshBaseUrl}/rest/api/3/issue/${formattedKey}/comment`, method: 'POST', body: adfPayload },
        { url: `${freshBaseUrl}/rest/servicedeskapi/request/${formattedKey}/comment`, method: 'POST', body: serviceDeskPayload },
        { url: `${freshBaseUrl}/rest/api/2/issue/${formattedKey}/comment`, method: 'POST', body: plainPayload },
      ];

      for (const candidate of freshCandidates) {
        try {
          const res = await fetch(candidate.url, {
            method: candidate.method,
            headers: freshBaseConfig.headers,
            body: candidate.body,
          });
          lastResponse = res;
          if (res.ok || res.status === 201 || res.status === 200) {
            commentData = await res.json();
            break;
          }
        } catch (err) {}
      }
    }
  }

  if (!commentData || !lastResponse || (!lastResponse.ok && lastResponse.status !== 201 && lastResponse.status !== 200)) {
    let errorDetail = '';
    if (lastResponse) {
      try {
        const errJson = await lastResponse.json();
        if (errJson.errorMessages && Array.isArray(errJson.errorMessages)) {
          errorDetail = errJson.errorMessages.join(', ');
        } else if (errJson.errors) {
          errorDetail = Object.entries(errJson.errors)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
        }
      } catch (e) {
        errorDetail = lastResponse.statusText;
      }
    }

    const status = lastResponse ? lastResponse.status : 'Conexão';
    if (status === 404) {
      throw new Error(`O ticket "${formattedKey}" não foi encontrado no Jira (${instance.domain}).`);
    } else if (status === 403) {
      throw new Error(
        `Permissão negada no Jira para adicionar comentários no ticket "${formattedKey}". Detalhes: ${
          errorDetail || 'Verifique se seu usuário tem permissão de comentar neste projeto.'
        }`
      );
    } else if (status === 401) {
      throw new Error(`Autenticação recusada no Jira. Reconecte sua conta Atlassian em Configurações para renovar o token.`);
    }
    throw new Error(`Falha na API do Jira (${status}): ${errorDetail || 'Não foi possível registrar o comentário.'}`);
  }

  const now = new Date().toISOString();
  return {
    id: String(commentData.id || 'comm_' + Date.now()),
    author: commentData.author
      ? commentData.author.displayName || commentData.author.name || 'Você'
      : 'Você',
    body: parseAdfToText(commentData.body) || commentBody,
    created: commentData.created || now,
    isLocal: false,
    isInternal: isInternal ?? isCommentInternalFromJira(commentData),
  };
}

let jiraRefreshTimer: NodeJS.Timeout | null = null;

export function startJiraTokenRefresher(): void {
  if (jiraRefreshTimer) return;

  // Executa a cada 30 minutos para renovar tokens com folga de segurança (Atlassian expira em 60 min)
  jiraRefreshTimer = setInterval(async () => {
    try {
      const instances = await dbGetJiraInstances();
      const oauthInstances = instances.filter(
        (i) => i.authType === 'OAUTH' || Boolean(i.cloudId && (i.refreshToken || i.accessToken))
      );
      for (const inst of oauthInstances) {
        if (inst.refreshToken || inst.apiToken) {
          console.log(`[Jira Token Refresher] Renovando token proativamente em segundo plano para ${inst.name || inst.domain}...`);
          await tryRefreshToken(inst);
        }
      }
    } catch (err: any) {
      console.warn('[Jira Token Refresher] Erro no agendador proativo:', err);
    }
  }, 30 * 60 * 1000);

  // Verificação inicial após 10 segundos da inicialização do app
  setTimeout(async () => {
    try {
      const instances = await dbGetJiraInstances();
      const oauthInstances = instances.filter(
        (i) => i.authType === 'OAUTH' || Boolean(i.cloudId && (i.refreshToken || i.accessToken))
      );
      for (const inst of oauthInstances) {
        if (inst.refreshToken || inst.apiToken) {
          await tryRefreshToken(inst);
        }
      }
    } catch (e) {}
  }, 10000);
}

