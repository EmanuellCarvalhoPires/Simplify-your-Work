import { JiraInstance, Ticket, JiraComment, TicketStatus } from '../src/types/index';

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

// Helper to build request URL and Headers depending on Auth Type (OAuth 2.0 3LO Bearer vs Basic API Token)
function getJiraRequestConfig(instance: JiraInstance, apiPath: string) {
  const isOAuth = instance.authType === 'OAUTH' || Boolean(instance.cloudId && (instance.accessToken || instance.apiToken));
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

export async function fetchJiraIssue(ticketKey: string, instance: JiraInstance): Promise<Ticket> {
  const formattedKey = ticketKey.trim().toUpperCase();
  const config = getJiraRequestConfig(instance, `/rest/api/3/issue/${formattedKey}`);

  let response: Response;
  try {
    response = await fetch(config.url, {
      method: 'GET',
      headers: config.headers,
    });
  } catch (netErr: any) {
    throw new Error(`Falha de conexão com o Jira (${instance.domain}). Verifique sua conexão de internet.`);
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Ticket "${formattedKey}" não foi encontrado no Jira (${instance.domain}). Verifique se a chave exata está correta.`);
    } else if (response.status === 401 || response.status === 403) {
      throw new Error(`Autenticação recusada no Jira (${response.status}). Se a sessão expirou, reconecte sua conta Atlassian em Configurações.`);
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

  if (!searchResult || !lastResponse || !lastResponse.ok) {
    const status = lastResponse ? lastResponse.status : 'Desconhecido';
    if (status === 400) {
      throw new Error(`A consulta JQL "${finalJql}" contém erros de sintaxe ou campos inválidos no Jira. Verifique nomes de marcas, projetos e status.`);
    } else if (status === 401 || status === 403) {
      throw new Error(`Autenticação recusada no Jira (${status}). Reconecte sua conta Atlassian ou verifique as permissões da instância.`);
    } else if (status === 410) {
      throw new Error(`A API de Busca JQL do Jira retornou 410 (Descontinuado). Verifique as permissões de leitura no projeto.`);
    }
    throw new Error(`Erro na API do Jira (${status}: ${lastResponse ? lastResponse.statusText : ''})`);
  }

  const issues = Array.isArray(searchResult.issues) ? searchResult.issues : [];

  if (issues.length === 0) {
    throw new Error(`Nenhum ticket foi encontrado para a busca JQL: "${finalJql}".`);
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
