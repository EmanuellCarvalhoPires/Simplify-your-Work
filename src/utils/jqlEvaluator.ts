import type { Ticket } from '../types/index';

type TokenType =
  | 'IDENTIFIER'
  | 'STRING'
  | 'NUMBER'
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'GREATER'
  | 'GREATER_EQUAL'
  | 'LESS'
  | 'LESS_EQUAL'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'IN'
  | 'NOT_IN'
  | 'IS'
  | 'EMPTY'
  | 'NULL'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

// AST Nodes
type ExpressionNode =
  | LogicalNode
  | NotNode
  | ComparisonNode
  | InNode
  | IsEmptyNode;

interface LogicalNode {
  type: 'LOGICAL';
  operator: 'AND' | 'OR';
  left: ExpressionNode;
  right: ExpressionNode;
}

interface NotNode {
  type: 'NOT';
  expr: ExpressionNode;
}

interface ComparisonNode {
  type: 'COMPARISON';
  field: string;
  operator: '=' | '!=' | '~' | '!~' | '>' | '>=' | '<' | '<=';
  value: string;
}

interface InNode {
  type: 'IN';
  field: string;
  operator: 'IN' | 'NOT_IN';
  values: string[];
}

interface IsEmptyNode {
  type: 'IS_EMPTY';
  field: string;
  isNot: boolean;
}

/**
 * Tokenize JQL string with Unicode support (accents, hyphens, etc.)
 */
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  // Strip trailing ORDER BY ... clause for filtering
  const orderByIndex = input.search(/\border\s+by\b/i);
  const cleanInput = orderByIndex !== -1 ? input.slice(0, orderByIndex) : input;

  while (i < cleanInput.length) {
    const char = cleanInput[i];

    // Whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // String literals ("..." or '...')
    if (char === '"' || char === "'") {
      const quote = char;
      const start = i;
      i++;
      let str = '';
      while (i < cleanInput.length && cleanInput[i] !== quote) {
        if (cleanInput[i] === '\\' && i + 1 < cleanInput.length) {
          i++;
          str += cleanInput[i];
        } else {
          str += cleanInput[i];
        }
        i++;
      }
      if (i < cleanInput.length && cleanInput[i] === quote) {
        i++; // consume closing quote
      }
      tokens.push({ type: 'STRING', value: str, pos: start });
      continue;
    }

    // Two-character operators
    const twoChar = cleanInput.slice(i, i + 2);
    if (twoChar === '!=') {
      tokens.push({ type: 'NOT_EQUALS', value: '!=', pos: i });
      i += 2;
      continue;
    }
    if (twoChar === '!~') {
      tokens.push({ type: 'NOT_CONTAINS', value: '!~', pos: i });
      i += 2;
      continue;
    }
    if (twoChar === '>=') {
      tokens.push({ type: 'GREATER_EQUAL', value: '>=', pos: i });
      i += 2;
      continue;
    }
    if (twoChar === '<=') {
      tokens.push({ type: 'LESS_EQUAL', value: '<=', pos: i });
      i += 2;
      continue;
    }

    // Single-character operators / punctuation
    if (char === '=') {
      tokens.push({ type: 'EQUALS', value: '=', pos: i });
      i++;
      continue;
    }
    if (char === '~') {
      tokens.push({ type: 'CONTAINS', value: '~', pos: i });
      i++;
      continue;
    }
    if (char === '>') {
      tokens.push({ type: 'GREATER', value: '>', pos: i });
      i++;
      continue;
    }
    if (char === '<') {
      tokens.push({ type: 'LESS', value: '<', pos: i });
      i++;
      continue;
    }
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(', pos: i });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')', pos: i });
      i++;
      continue;
    }
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',', pos: i });
      i++;
      continue;
    }

    // Words / Identifiers / Keywords / Functions (Unicode aware for accents: ã, é, ç, etc.)
    if (/[\p{L}\p{N}_.:\-]/u.test(char)) {
      const start = i;
      let word = '';
      while (i < cleanInput.length && /[\p{L}\p{N}_.:\-()]/u.test(cleanInput[i])) {
        // Special handle currentUser() function call
        if (cleanInput.slice(i, i + 13).toLowerCase() === 'currentuser()') {
          word = 'currentUser()';
          i += 13;
          break;
        }
        if (cleanInput[i] === '(' || cleanInput[i] === ')') break;
        word += cleanInput[i];
        i++;
      }

      const upper = word.toUpperCase();
      if (upper === 'AND') {
        tokens.push({ type: 'AND', value: 'AND', pos: start });
      } else if (upper === 'OR') {
        tokens.push({ type: 'OR', value: 'OR', pos: start });
      } else if (upper === 'NOT') {
        // Check if next word is IN
        const remaining = cleanInput.slice(i).trimStart();
        if (remaining.toUpperCase().startsWith('IN')) {
          tokens.push({ type: 'NOT_IN', value: 'NOT IN', pos: start });
          i += cleanInput.slice(i).indexOf('IN') + 2;
        } else {
          tokens.push({ type: 'NOT', value: 'NOT', pos: start });
        }
      } else if (upper === 'IN') {
        tokens.push({ type: 'IN', value: 'IN', pos: start });
      } else if (upper === 'IS') {
        tokens.push({ type: 'IS', value: 'IS', pos: start });
      } else if (upper === 'EMPTY') {
        tokens.push({ type: 'EMPTY', value: 'EMPTY', pos: start });
      } else if (upper === 'NULL') {
        tokens.push({ type: 'NULL', value: 'NULL', pos: start });
      } else {
        tokens.push({ type: 'IDENTIFIER', value: word, pos: start });
      }
      continue;
    }

    // Unrecognized character: advance
    i++;
  }

  return tokens;
}

/**
 * Parser for JQL tokens into AST
 */
class JqlParser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): ExpressionNode | null {
    if (this.tokens.length === 0) return null;
    const node = this.parseOr();
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek()?.type === type;
  }

  private parseOr(): ExpressionNode {
    let expr = this.parseAnd();

    while (this.match('OR')) {
      const right = this.parseAnd();
      expr = {
        type: 'LOGICAL',
        operator: 'OR',
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseAnd(): ExpressionNode {
    let expr = this.parseUnary();

    while (this.match('AND')) {
      const right = this.parseUnary();
      expr = {
        type: 'LOGICAL',
        operator: 'AND',
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseUnary(): ExpressionNode {
    if (this.match('NOT')) {
      const expr = this.parseUnary();
      return {
        type: 'NOT',
        expr,
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): ExpressionNode {
    // Parenthesized subexpression
    if (this.match('LPAREN')) {
      const expr = this.parseOr();
      if (this.match('RPAREN')) {
        return expr;
      }
      return expr;
    }

    // Atomic Condition: field operator value
    if (this.check('IDENTIFIER') || this.check('STRING')) {
      const fieldToken = this.advance();
      const field = fieldToken.value;

      // IS EMPTY / IS NOT EMPTY / IS NULL / IS NOT NULL
      if (this.match('IS')) {
        let isNot = false;
        if (this.match('NOT')) {
          isNot = true;
        }
        if (this.match('EMPTY', 'NULL')) {
          return {
            type: 'IS_EMPTY',
            field,
            isNot,
          };
        }
      }

      // IN (...) or NOT IN (...)
      if (this.match('IN', 'NOT_IN')) {
        const opType = this.previous().type === 'NOT_IN' ? 'NOT_IN' : 'IN';
        const values: string[] = [];

        if (this.match('LPAREN')) {
          while (!this.check('RPAREN') && !this.isAtEnd()) {
            if (this.match('IDENTIFIER', 'STRING', 'NUMBER', 'AND', 'OR', 'NOT')) {
              values.push(this.previous().value);
            } else if (!this.check('RPAREN')) {
              // Consume next token as raw value if inside list
              const t = this.advance();
              if (t.value && t.type !== 'COMMA') {
                values.push(t.value);
              }
            }
            this.match('COMMA');
          }
          this.match('RPAREN');
        }

        return {
          type: 'IN',
          field,
          operator: opType,
          values,
        };
      }

      // Comparison operators: =, !=, ~, !~, >, >=, <, <=
      if (
        this.match(
          'EQUALS',
          'NOT_EQUALS',
          'CONTAINS',
          'NOT_CONTAINS',
          'GREATER',
          'GREATER_EQUAL',
          'LESS',
          'LESS_EQUAL'
        )
      ) {
        const opToken = this.previous();
        let value = '';

        if (this.match('IDENTIFIER', 'STRING', 'NUMBER', 'AND', 'OR', 'NOT')) {
          value = this.previous().value;
        }

        return {
          type: 'COMPARISON',
          field,
          operator: opToken.value as any,
          value,
        };
      }

      // Fallback: simple text match on all fields if bare word
      return {
        type: 'COMPARISON',
        field: 'text',
        operator: '~',
        value: field,
      };
    }

    // Default fallback node if parsing error
    return {
      type: 'COMPARISON',
      field: 'text',
      operator: '~',
      value: '',
    };
  }
}

/**
 * Normalizes status strings for flexible matching
 */
function normalizeStatus(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents for normalized check
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a string matches target using the exact imported Jira status
 */
function matchesStatus(ticket: Ticket, targetValue: string): boolean {
  const targetNorm = normalizeStatus(targetValue);
  if (!targetNorm) return false;

  // The actual Jira status name imported from Jira API (e.g. "Em Andamento", "Revisão", "Pendente", "Fechado", "Cancelado")
  const jiraStatusName = ticket.jiraStatus || (ticket.source === 'JIRA' ? ticket.statusLabel : '') || '';
  const jiraStatusNorm = normalizeStatus(jiraStatusName);

  // 1. Direct exact match with the imported Jira status
  if (jiraStatusNorm && jiraStatusNorm === targetNorm) {
    return true;
  }

  // 2. Substring match on the actual Jira status name (e.g. "Revisão Técnica" matches "Revisão")
  if (jiraStatusNorm && targetNorm.length >= 3) {
    if (jiraStatusNorm.includes(targetNorm) || targetNorm.includes(jiraStatusNorm)) {
      return true;
    }
  }

  // 3. For pure LOCAL tickets (without Jira connection/status), match against local status / label
  if (!jiraStatusNorm) {
    const rawLocalStatus = normalizeStatus(ticket.status);
    const localLabel = normalizeStatus(ticket.statusLabel);
    if (rawLocalStatus === targetNorm || localLabel === targetNorm) return true;
    if (targetNorm.length >= 3 && (localLabel.includes(targetNorm) || targetNorm.includes(localLabel))) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates an AST Node against a Ticket item
 */
function evaluateNode(node: ExpressionNode, ticket: Ticket, currentUserName = 'Eu'): boolean {
  switch (node.type) {
    case 'LOGICAL': {
      const leftRes = evaluateNode(node.left, ticket, currentUserName);
      if (node.operator === 'AND') {
        return leftRes ? evaluateNode(node.right, ticket, currentUserName) : false;
      }
      if (node.operator === 'OR') {
        return leftRes ? true : evaluateNode(node.right, ticket, currentUserName);
      }
      return false;
    }

    case 'NOT':
      return !evaluateNode(node.expr, ticket, currentUserName);

    case 'IS_EMPTY': {
      const field = node.field.toLowerCase();
      let isEmpty = false;

      if (field === 'assignee') {
        isEmpty = !ticket.assignee || ticket.assignee.trim() === '' || ticket.assignee === 'Não atribuído';
      } else if (field === 'reporter') {
        isEmpty = !ticket.reporter || ticket.reporter.trim() === '';
      } else if (field === 'duedate' || field === 'due') {
        isEmpty = !ticket.dueDate;
      } else if (field === 'labels' || field === 'label') {
        isEmpty = !ticket.labels || ticket.labels.length === 0;
      } else if (field === 'description' || field === 'desc') {
        isEmpty = !ticket.description || ticket.description.trim() === '';
      } else if (field === 'jira' || field === 'instance') {
        isEmpty = ticket.source !== 'JIRA';
      }

      return node.isNot ? !isEmpty : isEmpty;
    }

    case 'IN': {
      const field = node.field.toLowerCase();
      const inValues = node.values.map((v) => v.toLowerCase().trim());

      let hasMatch = false;

      if (field === 'status' || field === 'statuslabel') {
        hasMatch = node.values.some((v) => matchesStatus(ticket, v));
      } else if (field === 'project') {
        const ticketProj = (ticket.key || '').split('-')[0].toLowerCase();
        hasMatch = inValues.includes(ticketProj);
      } else if (field === 'key' || field === 'issue' || field === 'issuekey') {
        const key = (ticket.key || '').toLowerCase();
        hasMatch = inValues.includes(key);
      } else if (field === 'priority') {
        const prio = (ticket.priority || '').toLowerCase();
        hasMatch = inValues.some((v) => prio.includes(v) || v.includes(prio));
      } else if (field === 'assignee') {
        const userClean = currentUserName.toLowerCase();
        hasMatch = inValues.some((v) => {
          if (v === 'currentuser()' || v === 'currentuser') {
            const ass = (ticket.assignee || '').toLowerCase();
            return ass === 'eu' || ass.includes(userClean) || userClean.includes(ass);
          }
          return (ticket.assignee || '').toLowerCase().includes(v);
        });
      } else if (field === 'labels' || field === 'label') {
        const ticketLabels = (ticket.labels || []).map((l) => l.toLowerCase());
        hasMatch = inValues.some((v) => {
          const vNorm = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return ticketLabels.some((tl) => {
            const tlNorm = tl.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return tl === v || tlNorm === vNorm || tl.includes(v) || v.includes(tl);
          });
        });
      } else if (field === 'source') {
        const src = (ticket.source || '').toLowerCase();
        hasMatch = inValues.includes(src);
      } else {
        // Generic / custom field search (e.g. Organizations, Components, etc.)
        const fullText = [
          ticket.key,
          ticket.title,
          ticket.description,
          ticket.assignee,
          ticket.reporter,
          ticket.statusLabel,
          ...(ticket.labels || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        hasMatch = inValues.some((v) => fullText.includes(v));
      }

      return node.operator === 'NOT_IN' ? !hasMatch : hasMatch;
    }

    case 'COMPARISON': {
      const field = node.field.toLowerCase();
      const targetVal = node.value.trim();
      const op = node.operator;

      // Status matching
      if (field === 'status' || field === 'statuslabel') {
        const isMatch = matchesStatus(ticket, targetVal);
        return op === '!=' || op === '!~' ? !isMatch : isMatch;
      }

      // Project matching (e.g. project = "PROJ")
      if (field === 'project') {
        const ticketProj = (ticket.key || '').split('-')[0].toLowerCase();
        const targetProj = targetVal.toLowerCase();
        const isMatch = ticketProj === targetProj;
        return op === '!=' ? !isMatch : isMatch;
      }

      // Key / Issue matching (e.g. key = "PROJ-123")
      if (field === 'key' || field === 'issue' || field === 'issuekey') {
        const k = (ticket.key || '').toLowerCase();
        const targetK = targetVal.toLowerCase();
        if (op === '~') return k.includes(targetK);
        if (op === '!~') return !k.includes(targetK);
        if (op === '!=') return k !== targetK;
        return k === targetK;
      }

      // Title / Summary matching
      if (field === 'summary' || field === 'title') {
        const title = (ticket.title || '').toLowerCase();
        const target = targetVal.toLowerCase();
        if (op === '=' || op === '~') return title.includes(target);
        if (op === '!=' || op === '!~') return !title.includes(target);
        return false;
      }

      // Description matching
      if (field === 'description' || field === 'desc') {
        const desc = (ticket.description || '').toLowerCase();
        const target = targetVal.toLowerCase();
        if (op === '=' || op === '~') return desc.includes(target);
        if (op === '!=' || op === '!~') return !desc.includes(target);
        return false;
      }

      // Assignee matching (handles currentUser() and names)
      if (field === 'assignee') {
        const assignee = (ticket.assignee || '').toLowerCase();
        const target = targetVal.toLowerCase();
        const userClean = currentUserName.toLowerCase();

        let isSelf = false;
        if (target === 'currentuser()' || target === 'currentuser') {
          isSelf = assignee === 'eu' || assignee.includes(userClean) || userClean.includes(assignee);
          return op === '!=' ? !isSelf : isSelf;
        }

        const matches = assignee.includes(target);
        return op === '!=' ? !matches : matches;
      }

      // Reporter matching
      if (field === 'reporter') {
        const rep = (ticket.reporter || '').toLowerCase();
        const target = targetVal.toLowerCase();
        const matches = rep.includes(target);
        return op === '!=' ? !matches : matches;
      }

      // Priority matching
      if (field === 'priority') {
        const p = (ticket.priority || '').toLowerCase();
        const target = targetVal.toLowerCase();
        const matches = p.includes(target) || target.includes(p);
        return op === '!=' ? !matches : matches;
      }

      // Labels matching
      if (field === 'labels' || field === 'label') {
        const labels = (ticket.labels || []).map((l) => l.toLowerCase());
        const target = targetVal.toLowerCase();
        const matches = labels.some((l) => l.includes(target) || target.includes(l));
        return op === '!=' ? !matches : matches;
      }

      // Source matching (JIRA / LOCAL)
      if (field === 'source') {
        const src = (ticket.source || '').toLowerCase();
        const target = targetVal.toLowerCase();
        const matches = src === target;
        return op === '!=' ? !matches : matches;
      }

      // Date comparisons (dueDate, createdAt, updatedAt)
      if (field === 'duedate' || field === 'created' || field === 'updated' || field === 'createdat' || field === 'updatedat') {
        const rawDate =
          field === 'duedate'
            ? ticket.dueDate
            : field === 'created' || field === 'createdat'
            ? ticket.createdAt
            : ticket.updatedAt;

        if (!rawDate) return false;

        const ticketTime = new Date(rawDate).getTime();
        const targetTime = new Date(targetVal).getTime();

        if (isNaN(ticketTime) || isNaN(targetTime)) return false;

        if (op === '>') return ticketTime > targetTime;
        if (op === '>=') return ticketTime >= targetTime;
        if (op === '<') return ticketTime < targetTime;
        if (op === '<=') return ticketTime <= targetTime;
        if (op === '!=') return ticketTime !== targetTime;
        return Math.abs(ticketTime - targetTime) < 86400000;
      }

      // Universal / Custom field search (e.g. Organizations = Telecall)
      const query = targetVal.toLowerCase();
      if (!query) return true;

      const fullText = [
        ticket.key,
        ticket.title,
        ticket.description,
        ticket.assignee,
        ticket.reporter,
        ticket.priority,
        ticket.status,
        ticket.statusLabel,
        ...(ticket.labels || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const contains = fullText.includes(query);
      return op === '!=' || op === '!~' ? !contains : contains;
    }
  }

  return true;
}

/**
 * Main function to evaluate a single ticket against a JQL query string.
 */
export function evaluateTicketJql(ticket: Ticket, jql: string, currentUserName?: string): boolean {
  if (!jql || !jql.trim() || jql.trim().toUpperCase() === 'ALL') {
    return true;
  }

  try {
    const tokens = tokenize(jql);
    if (tokens.length === 0) return true;

    const parser = new JqlParser(tokens);
    const ast = parser.parse();

    if (!ast) return true;
    return evaluateNode(ast, ticket, currentUserName);
  } catch (err) {
    console.warn('[JQL Evaluation Error]:', err);
    return true;
  }
}

/**
 * Filter an array of tickets by a JQL expression.
 */
export function filterTicketsByJql(
  tickets: Ticket[],
  jql: string,
  currentUserName?: string
): { filtered: Ticket[]; isValid: boolean; error?: string } {
  if (!jql || !jql.trim() || jql.trim().toUpperCase() === 'ALL') {
    return { filtered: tickets, isValid: true };
  }

  try {
    const tokens = tokenize(jql);
    if (tokens.length === 0) {
      return { filtered: tickets, isValid: true };
    }

    const parser = new JqlParser(tokens);
    const ast = parser.parse();

    if (!ast) {
      return { filtered: tickets, isValid: true };
    }

    const filtered = tickets.filter((t) => evaluateNode(ast, t, currentUserName));
    return { filtered, isValid: true };
  } catch (err: any) {
    return {
      filtered: tickets,
      isValid: false,
      error: err.message || 'Sintaxe JQL inválida',
    };
  }
}
