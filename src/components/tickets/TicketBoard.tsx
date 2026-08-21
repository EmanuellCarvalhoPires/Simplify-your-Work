import React, { useState, useEffect, useMemo } from 'react';
import type { Ticket, JiraInstance, TicketStatus, NoteItem, SavedJqlQuery, UserProfile } from '../../types/index';
import { TicketColumn } from './TicketColumn';
import { AddJiraModal } from './AddJiraModal';
import { AddLocalTicketModal } from './AddLocalTicketModal';
import { TicketDetailModal } from './TicketDetailModal';
import { filterTicketsByJql } from '../../utils/jqlEvaluator';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Filter,
  Globe,
  LayoutGrid,
  Table as TableIcon,
  User,
  Plus,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Terminal,
  Search,
  Bookmark,
  Save,
  Trash2,
  HelpCircle,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Check,
  CheckSquare,
  Square,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface TicketBoardProps {
  tickets: Ticket[];
  notes?: NoteItem[];
  jiraInstances: JiraInstance[];
  searchQuery: string;
  activeUser?: UserProfile | null;
  onFetchJiraTicket: (key: string, instanceId: string) => Promise<void>;
  onRefreshTickets?: () => Promise<void>;
  onSaveTicket: (ticket: Partial<Ticket>) => Promise<void>;
  onUpdateStatus: (ticketId: string, newStatus: TicketStatus) => Promise<void>;
  onDeleteTicket: (ticketId: string) => Promise<void>;
  onDeleteTickets?: (ticketIds: string[]) => Promise<void>;
  onBatchUpdateStatus?: (ticketIds: string[], newStatus: TicketStatus) => Promise<void>;
  onOpenSettings: () => void;
  onNavigateToNote?: (noteId: string) => void;
}

interface ToastNotice {
  type: 'success' | 'error';
  message: string;
}

type SortField = 'work' | 'labels' | 'status' | 'dueDate' | 'priority' | 'assignee';
type SortOrder = 'asc' | 'desc';

export interface SortRule {
  field: SortField;
  order: SortOrder;
}

interface JqlSectionDef {
  id: string;
  name: string;
  jql: string;
  icon?: string;
  color?: string;
  isCustom?: boolean;
  jiraInstanceId?: string;
}

const DEFAULT_JQL_SECTIONS: JqlSectionDef[] = [
  {
    id: 'ALL',
    name: 'Todos os Tickets',
    jql: '',
    icon: '🌐',
    color: '#94a3b8',
  },
];

export const TicketBoard: React.FC<TicketBoardProps> = ({
  tickets = [],
  notes = [],
  jiraInstances = [],
  searchQuery = '',
  activeUser,
  onFetchJiraTicket,
  onRefreshTickets,
  onSaveTicket,
  onUpdateStatus,
  onDeleteTicket,
  onDeleteTickets,
  onBatchUpdateStatus,
  onOpenSettings,
  onNavigateToNote,
}) => {
  const [viewMode, setViewMode] = useState<'TABLE' | 'KANBAN'>('TABLE');
  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [toastNotice, setToastNotice] = useState<ToastNotice | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // Multi-Selection State & Batch Operations
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState<boolean>(false);
  const [isBatchStatusDropdownOpen, setIsBatchStatusDropdownOpen] = useState<boolean>(false);
  const [isPerformingBatchAction, setIsPerformingBatchAction] = useState<boolean>(false);

  // Sorting State (Default: Status Order 1)
  const [sortRules, setSortRules] = useState<SortRule[]>([{ field: 'status', order: 'asc' }]);

  // Filters State
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('ALL');

  // JQL & Saved JQL Sections State
  const [savedJqlQueries, setSavedJqlQueries] = useState<SavedJqlQuery[]>(() => {
    try {
      const stored = localStorage.getItem('simplify_saved_jql');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activeSectionId, setActiveSectionId] = useState<string>('ALL');
  const [jqlQueryInput, setJqlQueryInput] = useState<string>('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [saveQueryName, setSaveQueryName] = useState<string>('');
  const [isSyncingJql, setIsSyncingJql] = useState<boolean>(false);

  // Load Saved JQL Queries from Backend/Electron
  useEffect(() => {
    const loadSavedQueries = async () => {
      if (window.electronAPI && window.electronAPI.getSavedJqlQueries) {
        try {
          const queries = await window.electronAPI.getSavedJqlQueries();
          if (Array.isArray(queries)) {
            setSavedJqlQueries(queries);
            localStorage.setItem('simplify_saved_jql', JSON.stringify(queries));
          }
        } catch (e) {
          console.error('Erro ao carregar queries JQL salvas:', e);
        }
      }
    };
    loadSavedQueries();
  }, []);

  const triggerToast = (type: 'success' | 'error', message: string) => {
    setToastNotice({ type, message });
    setTimeout(() => {
      setToastNotice((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  // Safe Array Defensive Guarding
  const safeTickets = Array.isArray(tickets) ? tickets.filter((t) => t && typeof t === 'object') : [];
  const safeJiraInstances = Array.isArray(jiraInstances) ? jiraInstances.filter((i) => i && typeof i === 'object') : [];

  // All available sections: Default sections + Custom saved JQL sections
  const allSections: JqlSectionDef[] = useMemo(() => {
    const customSections: JqlSectionDef[] = savedJqlQueries.map((sq) => ({
      id: sq.id,
      name: sq.name,
      jql: sq.jql,
      icon: '🔖',
      color: '#38bdf8',
      isCustom: true,
      jiraInstanceId: sq.jiraInstanceId,
    }));
    return [...DEFAULT_JQL_SECTIONS, ...customSections];
  }, [savedJqlQueries]);

  // Handler for selecting a JQL section
  const handleSelectSection = (sec: JqlSectionDef) => {
    setActiveSectionId(sec.id);
    setJqlQueryInput(sec.jql);
  };

  // Handler for saving current JQL query as a new section
  const handleSaveCurrentJql = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanJql = jqlQueryInput.trim();
    if (!cleanJql) {
      triggerToast('error', 'Digite uma consulta JQL válida antes de salvar a seção.');
      return;
    }

    const cleanName = saveQueryName.trim() || `Filtro JQL ${new Date().toLocaleDateString('pt-BR')}`;

    try {
      if (window.electronAPI && window.electronAPI.saveJqlQuery) {
        const saved = await window.electronAPI.saveJqlQuery({
          name: cleanName,
          jql: cleanJql,
          jiraInstanceId: selectedInstanceId === 'ALL' || selectedInstanceId === 'LOCAL_ONLY' ? '' : selectedInstanceId,
        });

        setSavedJqlQueries((prev) => {
          const updated = [saved, ...prev.filter((q) => q.id !== saved.id)];
          localStorage.setItem('simplify_saved_jql', JSON.stringify(updated));
          return updated;
        });
        setActiveSectionId(saved.id);
      } else {
        const fallbackSaved: SavedJqlQuery = {
          id: 'jql_' + Date.now(),
          name: cleanName,
          jql: cleanJql,
          jiraInstanceId: selectedInstanceId === 'ALL' || selectedInstanceId === 'LOCAL_ONLY' ? '' : selectedInstanceId,
          createdAt: new Date().toISOString(),
        };
        setSavedJqlQueries((prev) => {
          const updated = [fallbackSaved, ...prev];
          localStorage.setItem('simplify_saved_jql', JSON.stringify(updated));
          return updated;
        });
        setActiveSectionId(fallbackSaved.id);
      }

      setSaveQueryName('');
      setIsSaveModalOpen(false);
      triggerToast('success', `Seção JQL "${cleanName}" salva com sucesso!`);
    } catch (err: any) {
      console.error(err);
      triggerToast('error', 'Erro ao salvar a seção JQL.');
    }
  };

  // Handler for deleting a custom saved JQL query section
  const handleDeleteCustomSection = async (sectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (window.electronAPI && window.electronAPI.deleteJqlQuery) {
        await window.electronAPI.deleteJqlQuery(sectionId);
      }
      setSavedJqlQueries((prev) => {
        const updated = prev.filter((q) => q.id !== sectionId);
        localStorage.setItem('simplify_saved_jql', JSON.stringify(updated));
        return updated;
      });

      if (activeSectionId === sectionId) {
        setActiveSectionId('ALL');
        setJqlQueryInput('');
      }
      triggerToast('success', 'Seção JQL removida.');
    } catch (err) {
      triggerToast('error', 'Erro ao excluir a seção JQL.');
    }
  };

  // Handler for syncing JQL directly with Jira
  const handleSyncJiraWithJql = async () => {
    if (!jqlQueryInput.trim()) {
      triggerToast('error', 'Digite uma consulta JQL para sincronizar com o Jira.');
      return;
    }
    if (safeJiraInstances.length === 0) {
      triggerToast('error', 'Nenhuma instância do Jira conectada.');
      return;
    }

    const instId =
      selectedInstanceId !== 'ALL' && selectedInstanceId !== 'LOCAL_ONLY'
        ? selectedInstanceId
        : safeJiraInstances[0]?.id;

    if (!instId) {
      triggerToast('error', 'Selecione uma instância do Jira.');
      return;
    }

    try {
      setIsSyncingJql(true);
      if (window.electronAPI && window.electronAPI.fetchJiraTicketsByJql) {
        const res = await window.electronAPI.fetchJiraTicketsByJql(jqlQueryInput.trim(), instId);
        if (res.newCount > 0) {
          triggerToast('success', `✨ ${res.newCount} novo(s) ticket(s) sincronizado(s) do Jira!`);
          if (onRefreshTickets) await onRefreshTickets();
        } else if (res.existingCount > 0) {
          triggerToast('success', `Todos os ${res.existingCount} tickets retornados pelo Jira já estão no aplicativo.`);
        } else {
          triggerToast('success', 'Nenhum ticket encontrado no Jira para este JQL.');
        }
      }
    } catch (err: any) {
      const rawMsg = err.message || 'Falha ao sincronizar com Jira via JQL.';
      const cleanMsg = rawMsg.replace(/Error invoking remote method '.*?': Error: /g, '').replace(/Error: /g, '');
      triggerToast('error', cleanMsg);
    } finally {
      setIsSyncingJql(false);
    }
  };

  // Step 1: Filter by Jira Instance
  const instanceFilteredTickets = useMemo(() => {
    return safeTickets.filter((t) => {
      if (!t) return false;
      if (selectedInstanceId === 'ALL') return true;
      if (selectedInstanceId === 'LOCAL_ONLY') return t.source === 'LOCAL';
      return t.source === 'JIRA' && t.jiraInstanceId === selectedInstanceId;
    });
  }, [safeTickets, selectedInstanceId]);

  // Step 2: Filter by Multi-Field Global Search Query (Header)
  const searchFilteredTickets = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return instanceFilteredTickets;
    const q = searchQuery.toLowerCase().trim();

    return instanceFilteredTickets.filter((t) => {
      const key = (t.key || '').toLowerCase();
      const title = (t.title || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const assignee = (t.assignee || '').toLowerCase();
      const reporter = (t.reporter || '').toLowerCase();
      const priority = (t.priority || '').toLowerCase();
      const statusLabel = (t.statusLabel || '').toLowerCase();
      const labelsText = (t.labels || []).join(' ').toLowerCase();

      return (
        key.includes(q) ||
        title.includes(q) ||
        desc.includes(q) ||
        assignee.includes(q) ||
        reporter.includes(q) ||
        priority.includes(q) ||
        statusLabel.includes(q) ||
        labelsText.includes(q)
      );
    });
  }, [instanceFilteredTickets, searchQuery]);

  // Step 3: Evaluate JQL filter on the tickets
  const currentUserName = activeUser?.name || 'Eu';
  const { filtered: finalFilteredTickets, isValid: isJqlValid, error: jqlError } = useMemo(() => {
    return filterTicketsByJql(searchFilteredTickets, jqlQueryInput, currentUserName);
  }, [searchFilteredTickets, jqlQueryInput, currentUserName]);

  // Pre-calculate count for each section pill for snappy UX feedback
  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allSections.forEach((sec) => {
      const res = filterTicketsByJql(instanceFilteredTickets, sec.jql, currentUserName);
      counts[sec.id] = res.filtered.length;
    });
    return counts;
  }, [allSections, instanceFilteredTickets, currentUserName]);

  const getFieldValue = (ticket: Ticket, field: SortField) => {
    switch (field) {
      case 'work':
        return (ticket.key || ticket.title || '').toLowerCase();
      case 'labels':
        return ticket.labels && ticket.labels.length > 0 ? ticket.labels[0].toLowerCase() : 'zzz';
      case 'status': {
        const statusOrder: Record<string, number> = {
          IN_PROGRESS: 1,
          NEXT: 2,
          TO_DO: 3,
          WAITING_CLIENT: 4,
          BACKLOG: 5,
          DONE: 6,
        };
        return statusOrder[ticket.status] || 99;
      }
      case 'dueDate':
        return ticket.dueDate ? new Date(ticket.dueDate).getTime() : ticket.updatedAt ? new Date(ticket.updatedAt).getTime() : 0;
      case 'priority': {
        const priorityOrder = (p?: string) => {
          const str = (p || '').toLowerCase();
          if (str.includes('urgente') || str.includes('alta') || str.includes('high')) return 1;
          if (str.includes('média') || str.includes('medium') || str.includes('normal')) return 2;
          if (str.includes('baixa') || str.includes('low')) return 3;
          return 4;
        };
        return priorityOrder(ticket.priority);
      }
      case 'assignee':
        return (ticket.assignee || '').toLowerCase();
      default:
        return '';
    }
  };

  const compareByRule = (a: Ticket, b: Ticket, rule: SortRule) => {
    const valA = getFieldValue(a, rule.field);
    const valB = getFieldValue(b, rule.field);

    if (valA < valB) return rule.order === 'asc' ? -1 : 1;
    if (valA > valB) return rule.order === 'asc' ? 1 : -1;
    return 0;
  };

  // Interactive Multi-Column Sorting (Primary & Secondary Sort)
  const sortedFilteredTickets = [...finalFilteredTickets].sort((a, b) => {
    for (const rule of sortRules) {
      const res = compareByRule(a, b, rule);
      if (res !== 0) return res;
    }
    return 0;
  });

  const handleSort = (field: SortField, e?: React.MouseEvent) => {
    setSortRules((prevRules) => {
      const existingIndex = prevRules.findIndex((r) => r.field === field);

      // Toggle direction of existing active sort column
      if (existingIndex !== -1) {
        const updated = [...prevRules];
        updated[existingIndex] = {
          ...updated[existingIndex],
          order: updated[existingIndex].order === 'asc' ? 'desc' : 'asc',
        };
        return updated;
      }

      // If we currently have less than 2 sort rules active:
      if (prevRules.length < 2) {
        return [...prevRules, { field, order: 'asc' }];
      }

      // If 2 rules are already active, clicking an unsorted column replaces 2ª Ordem
      return [prevRules[0], { field, order: 'asc' }];
    });
  };

  const handleRemoveSort = (field: SortField, e: React.MouseEvent) => {
    e.preventDefault();
    setSortRules((prevRules) => prevRules.filter((r) => r.field !== field));
  };

  const renderSortIcon = (field: SortField) => {
    const index = sortRules.findIndex((r) => r.field === field);
    if (index === -1) return null;

    const rule = sortRules[index];
    const isPrimary = index === 0;

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          marginLeft: '6px',
          padding: '1px 5px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '700',
          backgroundColor: isPrimary ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)',
          color: isPrimary ? '#38bdf8' : '#c084fc',
          border: `1px solid ${isPrimary ? 'rgba(56, 189, 248, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
        }}
        title={`${isPrimary ? '1ª Ordem' : '2ª Ordem'} (${rule.order === 'asc' ? 'Crescente' : 'Decrescente'})`}
      >
        <span>{isPrimary ? '1º' : '2º'}</span>
        {rule.order === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      </span>
    );
  };

  // Selection Logic
  const toggleSelectTicket = (ticketId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTicketIds((prev) => {
      const next = new Set(prev);
      if (next.has(ticketId)) {
        next.delete(ticketId);
      } else {
        next.add(ticketId);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (sortedFilteredTickets.length === 0) return;
    const allVisibleIds = sortedFilteredTickets.map((t) => t.id);
    const areAllSelected = allVisibleIds.every((id) => selectedTicketIds.has(id));

    setSelectedTicketIds((prev) => {
      const next = new Set(prev);
      if (areAllSelected) {
        allVisibleIds.forEach((id) => next.delete(id));
      } else {
        allVisibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedTicketIds(new Set());
    setIsBatchStatusDropdownOpen(false);
  };

  const isAllVisibleSelected =
    sortedFilteredTickets.length > 0 &&
    sortedFilteredTickets.every((t) => selectedTicketIds.has(t.id));

  const isSomeVisibleSelected =
    !isAllVisibleSelected &&
    sortedFilteredTickets.some((t) => selectedTicketIds.has(t.id));

  // Batch Operations
  const handleConfirmBatchDelete = async () => {
    const idsToDelete = Array.from(selectedTicketIds);
    if (idsToDelete.length === 0) return;

    try {
      setIsPerformingBatchAction(true);
      if (onDeleteTickets) {
        await onDeleteTickets(idsToDelete);
      } else {
        for (const id of idsToDelete) {
          await onDeleteTicket(id);
        }
      }
      setSelectedTicketIds(new Set());
      setIsBatchDeleteModalOpen(false);
      triggerToast('success', `🗑️ ${idsToDelete.length} ticket(s) excluído(s) com sucesso!`);
      if (onRefreshTickets) await onRefreshTickets();
    } catch (err: any) {
      console.error('Erro na exclusão em lote:', err);
      triggerToast('error', 'Erro ao excluir tickets selecionados.');
    } finally {
      setIsPerformingBatchAction(false);
    }
  };

  const handleBatchChangeStatus = async (newStatus: TicketStatus) => {
    const idsToUpdate = Array.from(selectedTicketIds);
    if (idsToUpdate.length === 0) return;

    try {
      setIsPerformingBatchAction(true);
      if (onBatchUpdateStatus) {
        await onBatchUpdateStatus(idsToUpdate, newStatus);
      } else {
        for (const id of idsToUpdate) {
          await onUpdateStatus(id, newStatus);
        }
      }
      setIsBatchStatusDropdownOpen(false);
      triggerToast('success', `✅ Status de ${idsToUpdate.length} ticket(s) alterado com sucesso!`);
      if (onRefreshTickets) await onRefreshTickets();
    } catch (err: any) {
      console.error('Erro na alteração de status em lote:', err);
      triggerToast('error', 'Erro ao atualizar o status dos tickets.');
    } finally {
      setIsPerformingBatchAction(false);
    }
  };

  const selectedTicketsList = useMemo(() => {
    return safeTickets.filter((t) => selectedTicketIds.has(t.id));
  }, [safeTickets, selectedTicketIds]);

  const handleAddComment = async (ticketId: string, author: string, body: string, isInternal: boolean = true) => {
    const target = safeTickets.find((t) => t.id === ticketId);
    if (!target) return;

    if (target.source === 'JIRA' && target.key && window.electronAPI?.addJiraComment) {
      try {
        const res = await window.electronAPI.addJiraComment({
          ticketId: target.id,
          ticketKey: target.key,
          instanceId: target.jiraInstanceId,
          commentBody: body,
          isInternal,
        });

        if (res.ticket) {
          setSelectedTicket(res.ticket);
          await onSaveTicket(res.ticket);
        } else {
          const newComments = [
            res.comment,
            ...(target.comments || []).filter((c) => c.id !== res.comment.id),
          ];
          newComments.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
          const updatedTicket = {
            ...target,
            comments: newComments,
            updatedAt: new Date().toISOString(),
          };
          setSelectedTicket(updatedTicket);
          await onSaveTicket(updatedTicket);
        }

        setToastNotice({
          type: 'success',
          message: `${isInternal ? 'Nota interna enviada' : 'Comentário externo enviado'} com sucesso para o ticket ${target.key} no Jira!`,
        });
        setTimeout(() => setToastNotice(null), 4000);
        return;
      } catch (jiraErr: any) {
        console.error('[TicketBoard] Falha ao enviar comentário via API Jira:', jiraErr);

        // Fallback local: salva o comentário localmente com isLocal: true para preservar o texto digitado
        const localComment: JiraComment = {
          id: 'comm_local_' + Date.now(),
          author: author || 'Eu (Você)',
          body,
          created: new Date().toISOString(),
          isLocal: true,
          isInternal,
        };
        const fallbackComments = [localComment, ...(target.comments || [])];
        fallbackComments.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        const updatedTicket = {
          ...target,
          comments: fallbackComments,
          updatedAt: new Date().toISOString(),
        };
        setSelectedTicket(updatedTicket);
        await onSaveTicket(updatedTicket);

        setToastNotice({
          type: 'error',
          message: `Falha ao enviar para o Jira (${target.key}): ${jiraErr.message || 'Erro de API'}. Comentário salvo localmente.`,
        });
        setTimeout(() => setToastNotice(null), 7000);

        throw jiraErr;
      }
    }

    const newComments = [
      ...(target.comments || []),
      {
        id: 'comm_' + Date.now(),
        author,
        body,
        created: new Date().toISOString(),
        isLocal: true,
      },
    ];
    await onSaveTicket({
      ...target,
      comments: newComments,
    });
    setSelectedTicket({
      ...target,
      comments: newComments,
    });
  };

  const handleDeleteComment = async (ticketId: string, commentId: string) => {
    const target = safeTickets.find((t) => t.id === ticketId);
    if (!target) return;
    const updatedComments = (target.comments || []).filter((c) => c.id !== commentId);
    const updatedTicket = {
      ...target,
      comments: updatedComments,
      updatedAt: new Date().toISOString(),
    };
    setSelectedTicket(updatedTicket);
    await onSaveTicket(updatedTicket);
    setToastNotice({
      type: 'success',
      message: 'Comentário local excluído com sucesso.',
    });
    setTimeout(() => setToastNotice(null), 3000);
  };

  const getStatusBadgeStyle = (status: TicketStatus) => {
    switch (status) {
      case 'BACKLOG':
        return { backgroundColor: 'rgba(148, 163, 184, 0.18)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.4)' };
      case 'PRIORITIZED':
        return { backgroundColor: 'rgba(6, 182, 212, 0.18)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.4)' };
      case 'NEXT':
        return { backgroundColor: 'rgba(139, 92, 246, 0.18)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.4)' };
      case 'IN_PROGRESS':
        return { backgroundColor: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)' };
      case 'WAITING_CLIENT':
        return { backgroundColor: 'rgba(249, 115, 22, 0.18)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.4)' };
      case 'BLOCKED':
        return { backgroundColor: 'rgba(244, 63, 94, 0.18)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.4)' };
      case 'DONE':
        return { backgroundColor: 'rgba(16, 185, 129, 0.18)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)' };
      default:
        return { backgroundColor: 'rgba(245, 158, 11, 0.18)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)' };
    }
  };

  const getPriorityBadgeStyle = (priority?: string) => {
    const p = (priority || '').toLowerCase();
    if (p.includes('alta') || p.includes('high') || p.includes('urgente')) {
      return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' };
    }
    if (p.includes('média') || p.includes('medium')) {
      return { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' };
    }
    return { backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)' };
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'None';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return String(isoString);
    }
  };

  return (
    <div style={styles.boardWrapper}>
      {/* Toast Notice Banner */}
      {toastNotice && (
        <div
          style={{
            ...styles.toastBanner,
            backgroundColor:
              toastNotice.type === 'success'
                ? 'rgba(16, 185, 129, 0.95)'
                : 'rgba(244, 63, 94, 0.95)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {toastNotice.type === 'success' ? (
              <CheckCircle2 size={20} color="#ffffff" />
            ) : (
              <AlertTriangle size={20} color="#ffffff" />
            )}
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>
              {toastNotice.message}
            </span>
          </div>
          <button className="btn-icon" onClick={() => setToastNotice(null)} style={{ color: '#ffffff' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Filter Bar: Instance Filter + Actions + View Mode */}
      <div style={styles.filterBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--accent-blue)" />
            <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Instância Jira:
            </span>
            <select
              className="input-field"
              value={selectedInstanceId}
              onChange={(e) => setSelectedInstanceId(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="ALL">🌐 Todas as Instâncias Atlassian ({safeTickets.filter((t) => t && t.source === 'JIRA').length} tickets)</option>
              {safeJiraInstances.map((inst) => {
                const count = safeTickets.filter((t) => t && t.source === 'JIRA' && t.jiraInstanceId === inst.id).length;
                return (
                  <option key={inst.id} value={inst.id}>
                    🎯 {inst.name} ({inst.domain}) - [{count} tickets]
                  </option>
                );
              })}
              <option value="LOCAL_ONLY">💻 Apenas Tickets Locais (Sem Jira)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons & View Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            className="btn"
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              backgroundColor: 'rgba(139, 92, 246, 0.2)',
              color: '#c084fc',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              borderRadius: '8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              height: '34px',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setIsLocalModalOpen(true)}
            title="Criar uma nova tarefa local"
          >
            <Plus size={15} /> Criar Tarefa
          </button>

          <button
            className="btn btn-primary"
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              height: '34px',
            }}
            onClick={() => setIsJiraModalOpen(true)}
            title="Puxar ou atualizar um ticket via chave do Jira"
          >
            <Plus size={15} /> Puxar do Jira
          </button>

          <div style={styles.viewToggleGroup}>
            <button
              style={{
                ...styles.toggleBtn,
                ...(viewMode === 'TABLE' ? styles.activeToggleBtn : {}),
              }}
              onClick={() => setViewMode('TABLE')}
              title="Visualização em Tabela de Lista"
            >
              <TableIcon size={15} /> Lista
            </button>
            <button
              style={{
                ...styles.toggleBtn,
                ...(viewMode === 'KANBAN' ? styles.activeToggleBtn : {}),
              }}
              onClick={() => setViewMode('KANBAN')}
              title="Visualização em Colunas Kanban por Status"
            >
              <LayoutGrid size={15} /> Kanban
            </button>
          </div>
        </div>
      </div>

      {/* JQL Sections Bar (Replaces Status Filter Pills) & JQL Search Input */}
      <div style={styles.jqlSectionContainer}>
        {/* Row 1: Saved JQL Sections Pills */}
        <div style={styles.jqlSectionsRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{ fontWeight: '700', fontSize: '12px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Bookmark size={14} color="#38bdf8" /> Seções JQL:
            </span>
          </div>

          <div style={styles.jqlPillsScroll}>
            {allSections.map((sec) => {
              const isActive = activeSectionId === sec.id;
              const count = sectionCounts[sec.id] ?? 0;
              const pillColor = sec.color || '#38bdf8';

              return (
                <div
                  key={sec.id}
                  onClick={() => handleSelectSection(sec)}
                  style={{
                    ...styles.jqlSectionPill,
                    ...(isActive
                      ? {
                          backgroundColor: 'rgba(56, 189, 248, 0.15)',
                          borderColor: pillColor,
                          color: '#ffffff',
                          boxShadow: `0 0 10px rgba(56, 189, 248, 0.25)`,
                          fontWeight: '700',
                        }
                      : {}),
                  }}
                  title={sec.jql ? `JQL: ${sec.jql}` : 'Exibir todos os tickets sem filtro'}
                >
                  <span>{sec.icon || '📌'}</span>
                  <span>{sec.name}</span>
                  <span
                    style={{
                      ...styles.pillBadgeCount,
                      backgroundColor: isActive ? pillColor : 'rgba(255, 255, 255, 0.1)',
                      color: isActive ? '#0f172a' : '#94a3b8',
                    }}
                  >
                    {count}
                  </span>

                  {sec.isCustom && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCustomSection(sec.id, e)}
                      style={styles.deletePillBtn}
                      title="Excluir esta seção JQL salva"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Quick Button to Save Current JQL as Section */}
            {jqlQueryInput.trim() && (
              <button
                type="button"
                onClick={() => {
                  setSaveQueryName('');
                  setIsSaveModalOpen(true);
                }}
                style={styles.saveSectionBtn}
                title="Salvar a consulta JQL digitada como uma nova seção"
              >
                <Plus size={13} /> Salvar como Seção
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Interactive Real-Time JQL Search Input Bar */}
        <div style={styles.jqlInputBar}>
          <div style={styles.jqlInputWrapper}>
            <Terminal size={16} color="#38bdf8" style={{ flexShrink: 0, marginLeft: '12px' }} />
            <input
              type="text"
              className="input-field"
              value={jqlQueryInput}
              onChange={(e) => {
                setJqlQueryInput(e.target.value);
                // If typed custom text, unselect predefined section if text deviates
                const matchingSec = allSections.find((s) => s.jql === e.target.value);
                setActiveSectionId(matchingSec ? matchingSec.id : 'custom');
              }}
              placeholder='Filtrar por JQL... Ex: status in ("In Progress", "TO_DO") AND priority = "High" AND assignee = currentUser()'
              style={styles.jqlInputField}
            />

            {jqlQueryInput && (
              <button
                type="button"
                onClick={() => {
                  setJqlQueryInput('');
                  setActiveSectionId('ALL');
                }}
                style={styles.clearJqlBtn}
                title="Limpar consulta JQL"
              >
                <X size={14} />
              </button>
            )}

            {/* Match Counter / Validation Badge */}
            <div style={styles.jqlStatusBadge}>
              {isJqlValid ? (
                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700' }}>
                  <Sparkles size={12} color="#10b981" />
                  {jqlQueryInput.trim()
                    ? `${finalFilteredTickets.length} ticket(s) filtrado(s)`
                    : `${finalFilteredTickets.length} tickets`}
                </span>
              ) : (
                <span
                  style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700' }}
                  title={jqlError || 'Sintaxe JQL incompleta'}
                >
                  <AlertTriangle size={12} color="#f59e0b" />
                  Sintaxe JQL em digitação
                </span>
              )}
            </div>
          </div>

          {/* Action buttons inside JQL input bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {safeJiraInstances.length > 0 && jqlQueryInput.trim() && (
              <button
                type="button"
                onClick={handleSyncJiraWithJql}
                disabled={isSyncingJql}
                style={styles.syncJiraBtn}
                title="Buscar e importar novos tickets do Jira que correspondam a este JQL"
              >
                <RefreshCw size={13} className={isSyncingJql ? 'animate-spin' : ''} />
                <span>{isSyncingJql ? 'Sincronizando...' : 'Puxar do Jira'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSaveQueryName('');
                setIsSaveModalOpen(true);
              }}
              style={styles.saveQueryActionBtn}
              title="Salvar consulta JQL nos favoritos"
            >
              <Save size={13} />
              <span>Salvar Seção</span>
            </button>
          </div>
        </div>
      </div>

      {/* Save JQL Section Modal */}
      {isSaveModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSaveModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bookmark size={20} color="#38bdf8" />
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#ffffff' }}>Salvar Nova Seção JQL</h3>
              </div>
              <button className="btn-icon" onClick={() => setIsSaveModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCurrentJql} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={styles.modalLabel}>Nome da Seção:</label>
                <input
                  type="text"
                  className="input-field"
                  value={saveQueryName}
                  onChange={(e) => setSaveQueryName(e.target.value)}
                  placeholder="Ex: Minhas Tarefas Críticas, Bugs em Aberto..."
                  autoFocus
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={styles.modalLabel}>Consulta JQL:</label>
                <textarea
                  className="input-field"
                  value={jqlQueryInput}
                  onChange={(e) => setJqlQueryInput(e.target.value)}
                  placeholder='Ex: project = "PROJ" AND status = "In Progress"'
                  rows={3}
                  required
                  style={{
                    width: '100%',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px',
                    lineHeight: '1.4',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIsSaveModalOpen(false)}
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)' }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={15} /> Salvar Seção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Render Data Table View OR 6-Status Kanban Board */}
      {viewMode === 'KANBAN' ? (
        <div style={styles.boardContainer}>
          {[
            { status: 'IN_PROGRESS' as const, label: 'Em Andamento', color: '#3b82f6' },
            { status: 'NEXT' as const, label: 'Fazer em Seguida', color: '#f59e0b' },
            { status: 'TO_DO' as const, label: 'A Fazer', color: '#06b6d4' },
            { status: 'WAITING_CLIENT' as const, label: 'Aguardando Cliente', color: '#ec4899' },
            { status: 'BACKLOG' as const, label: 'Backlog', color: '#64748b' },
            { status: 'DONE' as const, label: 'Concluído', color: '#10b981' },
          ].map((col) => {
            const colTickets = sortedFilteredTickets.filter((t) => t.status === col.status);
            return (
              <TicketColumn
                key={col.status}
                title={col.label}
                tickets={colTickets}
                accentColor={col.color}
                selectedTicketIds={selectedTicketIds}
                onAddClick={() => setIsLocalModalOpen(true)}
                onCardClick={(t) => setSelectedTicket(t)}
                onToggleSelectTicket={toggleSelectTicket}
              />
            );
          })}
        </div>
      ) : (
        /* Modern Jira Data Table View (With Clickable Column Sorting & Multi-Select) */
        <div style={styles.tableWrapper}>
          <div style={styles.tableScrollContainer}>
            <table style={styles.dataTable}>
              <thead>
                <tr>
                  <th style={{ ...styles.thCellCheckbox, width: '48px' }}>
                    <button
                      type="button"
                      onClick={handleSelectAllVisible}
                      style={{
                        ...styles.tableMasterCheckbox,
                        backgroundColor: isAllVisibleSelected
                          ? '#38bdf8'
                          : isSomeVisibleSelected
                          ? 'rgba(56, 189, 248, 0.2)'
                          : 'rgba(255, 255, 255, 0.08)',
                        borderColor:
                          isAllVisibleSelected || isSomeVisibleSelected
                            ? '#38bdf8'
                            : 'rgba(255, 255, 255, 0.25)',
                      }}
                      title={
                        isAllVisibleSelected
                          ? 'Desmarcar todos os visíveis'
                          : 'Selecionar todos os visíveis'
                      }
                    >
                      {isAllVisibleSelected ? (
                        <Check size={12} color="#0f172a" strokeWidth={3.5} />
                      ) : isSomeVisibleSelected ? (
                        <span
                          style={{
                            width: '8px',
                            height: '2px',
                            backgroundColor: '#38bdf8',
                            borderRadius: '1px',
                          }}
                        />
                      ) : null}
                    </button>
                  </th>
                  <th
                    style={{ ...styles.thCellSortable, minWidth: '320px' }}
                    onClick={(e) => handleSort('work', e)}
                    onContextMenu={(e) => handleRemoveSort('work', e)}
                    title="Clique esquerdo: Alternar/Adicionar ordenação | Clique direito: Remover ordenação desta coluna"
                  >
                    Work {renderSortIcon('work')}
                  </th>
                  <th
                    style={{ ...styles.thCellSortable, width: '130px' }}
                    onClick={(e) => handleSort('labels', e)}
                    onContextMenu={(e) => handleRemoveSort('labels', e)}
                    title="Clique esquerdo: Alternar/Adicionar ordenação | Clique direito: Remover ordenação desta coluna"
                  >
                    Labels {renderSortIcon('labels')}
                  </th>
                  <th
                    style={{ ...styles.thCellSortable, width: '150px' }}
                    onClick={(e) => handleSort('status', e)}
                    onContextMenu={(e) => handleRemoveSort('status', e)}
                    title="Clique esquerdo: Alternar/Adicionar ordenação | Clique direito: Remover ordenação desta coluna"
                  >
                    Status {renderSortIcon('status')}
                  </th>
                  <th
                    style={{ ...styles.thCellSortable, width: '130px' }}
                    onClick={(e) => handleSort('dueDate', e)}
                    onContextMenu={(e) => handleRemoveSort('dueDate', e)}
                    title="Clique esquerdo: Alternar/Adicionar ordenação | Clique direito: Remover ordenação desta coluna"
                  >
                    Due date {renderSortIcon('dueDate')}
                  </th>
                  <th
                    style={{ ...styles.thCellSortable, width: '140px' }}
                    onClick={(e) => handleSort('priority', e)}
                    onContextMenu={(e) => handleRemoveSort('priority', e)}
                    title="Clique esquerdo: Alternar/Adicionar ordenação | Clique direito: Remover ordenação desta coluna"
                  >
                    Complexidade {renderSortIcon('priority')}
                  </th>
                  <th
                    style={{ ...styles.thCellSortable, width: '180px' }}
                    onClick={(e) => handleSort('assignee', e)}
                    onContextMenu={(e) => handleRemoveSort('assignee', e)}
                    title="Clique esquerdo: Alternar/Adicionar ordenação | Clique direito: Remover ordenação desta coluna"
                  >
                    Assignee {renderSortIcon('assignee')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedFilteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <Terminal size={32} color="#64748b" />
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                          Nenhum ticket encontrado para esta consulta JQL e filtros.
                        </span>
                        {jqlQueryInput.trim() && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn"
                              style={{
                                padding: '6px 14px',
                                fontSize: '12px',
                                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                fontWeight: '700',
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                setJqlQueryInput('');
                                setActiveSectionId('ALL');
                              }}
                            >
                              Limpar Filtro JQL
                            </button>
                            <button
                              className="btn"
                              style={{
                                padding: '6px 14px',
                                fontSize: '12px',
                                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                                color: '#c084fc',
                                border: '1px solid rgba(139, 92, 246, 0.4)',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                              }}
                              onClick={() => setIsLocalModalOpen(true)}
                            >
                              <Plus size={14} /> Criar Tarefa
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedFilteredTickets.map((t) => {
                    const isHovered = hoveredRowId === t.id;
                    const isSelected = selectedTicketIds.has(t.id);

                    return (
                      <tr
                        key={t.id}
                        onMouseEnter={() => setHoveredRowId(t.id)}
                        onMouseLeave={() => setHoveredRowId(null)}
                        style={{
                          ...styles.tableRow,
                          ...(isHovered ? styles.hoveredRow : {}),
                          ...(isSelected ? styles.selectedTableRow : {}),
                        }}
                      >
                        <td style={{ ...styles.tdCell, width: '48px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={(e) => toggleSelectTicket(t.id, e)}
                            style={{
                              ...styles.tableRowCheckbox,
                              backgroundColor: isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)',
                              borderColor: isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.25)',
                            }}
                            title={isSelected ? 'Desmarcar ticket' : 'Selecionar ticket'}
                          >
                            {isSelected && <Check size={12} color="#0f172a" strokeWidth={3.5} />}
                          </button>
                        </td>
                        <td style={styles.tdCell}>
                          <div style={styles.workCell} onClick={() => setSelectedTicket(t)}>
                            {t.key && <span style={styles.tableKeyLink}>{t.key}</span>}
                            <span style={styles.tableTitleText}>{t.title || 'Sem título'}</span>
                          </div>
                        </td>
                        <td style={styles.tdCell}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {t.labels && t.labels.length > 0 ? (
                              t.labels.map((lbl) => (
                                <span key={lbl} style={styles.tableLabelChip}>{lbl}</span>
                              ))
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None</span>
                            )}
                          </div>
                        </td>
                        <td style={styles.tdCell}>
                          <select
                            style={{
                              ...styles.tableStatusSelect,
                              ...getStatusBadgeStyle(t.status),
                            }}
                            value={t.status || 'TO_DO'}
                            onChange={(e) => onUpdateStatus(t.id, e.target.value as TicketStatus)}
                          >
                            <option value="BACKLOG">Backlog</option>
                            <option value="PRIORITIZED">Priorizado</option>
                            <option value="TO_DO">A Fazer</option>
                            <option value="NEXT">Fazer em Seguida</option>
                            <option value="IN_PROGRESS">Em Andamento</option>
                            <option value="WAITING_CLIENT">Aguardando Cliente</option>
                            <option value="BLOCKED">Bloqueado</option>
                            <option value="DONE">Concluído</option>
                          </select>
                        </td>
                        <td style={{ ...styles.tdCell, fontSize: '13px', color: '#cbd5e1' }}>
                          {formatDate(t.dueDate || t.updatedAt)}
                        </td>
                        <td style={styles.tdCell}>
                          <span style={{ ...styles.tablePriorityBadge, ...getPriorityBadgeStyle(t.priority) }}>
                            {(t.priority || 'Normal').toUpperCase()}
                          </span>
                        </td>
                        <td style={styles.tdCell}>
                          <div style={styles.tableAssigneeBox}>
                            <div style={styles.tableAvatarCircle}>
                              {t.assignee ? t.assignee.charAt(0).toUpperCase() : 'E'}
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>
                              {t.assignee || 'Emanuell Pires'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Navigation Bar */}
          <div style={styles.tableFooterBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>
                Exibindo <b>{sortedFilteredTickets.length}</b> de <b>{safeTickets.length}</b> tickets
              </span>
              {selectedTicketIds.size > 0 && (
                <span
                  style={{
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: '11px',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                  }}
                >
                  {selectedTicketIds.size} selecionado{selectedTicketIds.size > 1 ? 's' : ''}
                </span>
              )}
              {sortRules.length > 0 ? (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>(</span>
                  {sortRules.map((rule, idx) => {
                    const fieldLabels: Record<SortField, string> = {
                      work: 'Chamado',
                      labels: 'Label',
                      status: 'Status',
                      dueDate: 'Data',
                      priority: 'Complexidade',
                      assignee: 'Responsável',
                    };
                    return (
                      <span key={rule.field} style={{ color: idx === 0 ? '#38bdf8' : '#c084fc', fontWeight: '600' }}>
                        {idx === 0 ? 'Ordem 1: ' : ' | Ordem 2: '}
                        {fieldLabels[rule.field]} {rule.order === 'asc' ? '▲' : '▼'}
                      </span>
                    );
                  })}
                  <span>)</span>
                </span>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>(Sem ordenação)</span>
              )}
              {sortRules.length > 1 && (
                <button
                  onClick={() => setSortRules([sortRules[0]])}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '11px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '0 4px',
                  }}
                  title="Remover a 2ª Ordem de ordenação"
                >
                  Limpar 2ª Ordem
                </button>
              )}
              {sortRules.length === 0 && (
                <button
                  onClick={() => setSortRules([{ field: 'status', order: 'asc' }])}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#38bdf8',
                    fontSize: '11px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '0 4px',
                  }}
                  title="Restaurar a ordenação padrão por Status"
                >
                  Restaurar ordenação por Status
                </button>
              )}
            </div>
            <button style={styles.tableRefreshBtn} onClick={() => onRefreshTickets && onRefreshTickets()} title="Recarregar">
              <RotateCcw size={14} /> <span style={{ fontSize: '12px' }}>Recarregar Dados</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedTicketIds.size > 0 && (
        <div style={styles.floatingBulkBar}>
          <div style={styles.floatingBulkLeft}>
            <div style={styles.bulkSelectionBadge}>
              <CheckCircle2 size={16} color="#38bdf8" />
              <span style={{ fontWeight: '700', fontSize: '13px', color: '#ffffff' }}>
                {selectedTicketIds.size} selecionado{selectedTicketIds.size > 1 ? 's' : ''}
              </span>
            </div>

            {selectedTicketIds.size < sortedFilteredTickets.length && (
              <button
                type="button"
                onClick={() => {
                  const allIds = sortedFilteredTickets.map((t) => t.id);
                  setSelectedTicketIds(new Set(allIds));
                }}
                style={styles.bulkSelectAllBtn}
              >
                Selecionar todos os {sortedFilteredTickets.length} visíveis
              </button>
            )}
          </div>

          <div style={styles.floatingBulkRight}>
            {/* Batch Status Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsBatchStatusDropdownOpen(!isBatchStatusDropdownOpen)}
                disabled={isPerformingBatchAction}
                style={styles.bulkStatusBtn}
                title="Mudar status de todos os tickets selecionados"
              >
                <Layers size={14} />
                <span>Alterar Status</span>
                <ChevronDown size={14} />
              </button>

              {isBatchStatusDropdownOpen && (
                <div style={styles.statusDropdownMenu}>
                  <div style={styles.statusDropdownHeader}>
                    Definir status para {selectedTicketIds.size} ticket(s):
                  </div>
                  {[
                    { status: 'TO_DO' as const, label: 'A Fazer', color: '#06b6d4' },
                    { status: 'NEXT' as const, label: 'Fazer em Seguida', color: '#a78bfa' },
                    { status: 'IN_PROGRESS' as const, label: 'Em Andamento', color: '#60a5fa' },
                    { status: 'WAITING_CLIENT' as const, label: 'Aguardando Cliente', color: '#fb923c' },
                    { status: 'BACKLOG' as const, label: 'Backlog', color: '#94a3b8' },
                    { status: 'PRIORITIZED' as const, label: 'Priorizado', color: '#06b6d4' },
                    { status: 'BLOCKED' as const, label: 'Bloqueado', color: '#f43f5e' },
                    { status: 'DONE' as const, label: 'Concluído', color: '#10b981' },
                  ].map((st) => (
                    <button
                      key={st.status}
                      type="button"
                      style={styles.statusDropdownItem}
                      onClick={() => handleBatchChangeStatus(st.status)}
                    >
                      <span
                        style={{
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          backgroundColor: st.color,
                          flexShrink: 0,
                        }}
                      />
                      <span>{st.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Batch Delete Button */}
            <button
              type="button"
              onClick={() => setIsBatchDeleteModalOpen(true)}
              disabled={isPerformingBatchAction}
              style={styles.bulkDeleteBtn}
              title="Excluir todos os tickets selecionados"
            >
              <Trash2 size={14} />
              <span>Excluir ({selectedTicketIds.size})</span>
            </button>

            {/* Clear Selection Button */}
            <button
              type="button"
              onClick={handleClearSelection}
              style={styles.bulkCancelBtn}
              title="Desmarcar todos os tickets"
            >
              <X size={14} />
              <span>Desmarcar</span>
            </button>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {isBatchDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsBatchDeleteModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <Trash2 size={20} color="#ef4444" />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                    Excluir {selectedTicketIds.size} Ticket(s)
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Esta ação removerá os tickets selecionados do banco de dados local.
                  </span>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setIsBatchDeleteModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '13px', color: '#fca5a5', lineHeight: '1.45' }}>
                  Tem certeza de que deseja excluir <b>{selectedTicketIds.size}</b> ticket(s)?
                  Tarefas locais excluídas não poderão ser recuperadas. Tickets do Jira podem ser sincronizados novamente via chave ou JQL.
                </span>
              </div>

              {/* Selected Tickets Preview List */}
              <div
                style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: '#0f0f17',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {selectedTicketsList.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      {t.key && (
                        <span
                          style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontWeight: '700',
                            color: '#38bdf8',
                            fontSize: '11px',
                          }}
                        >
                          {t.key}
                        </span>
                      )}
                      <span
                        style={{
                          color: '#ffffff',
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {t.title}
                      </span>
                    </div>
                    <span
                      style={{
                        ...styles.tablePriorityBadge,
                        ...getStatusBadgeStyle(t.status),
                        fontSize: '10px',
                        padding: '1px 6px',
                      }}
                    >
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                disabled={isPerformingBatchAction}
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                disabled={isPerformingBatchAction}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: isPerformingBatchAction ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
                }}
              >
                <Trash2 size={15} />
                <span>
                  {isPerformingBatchAction
                    ? 'Excluindo...'
                    : `Confirmar Exclusão (${selectedTicketIds.size})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isJiraModalOpen && (
        <AddJiraModal
          jiraInstances={safeJiraInstances}
          existingTickets={tickets}
          onClose={() => setIsJiraModalOpen(false)}
          onFetchJiraTicket={async (key, instId) => {
            await onFetchJiraTicket(key, instId);
            if (onRefreshTickets) await onRefreshTickets();
          }}
          onOpenSettings={onOpenSettings}
          onSuccessNotice={async (msg) => {
            triggerToast('success', msg);
            if (onRefreshTickets) await onRefreshTickets();
          }}
          onErrorNotice={(msg) => triggerToast('error', msg)}
        />
      )}

      {isLocalModalOpen && (
        <AddLocalTicketModal
          onClose={() => setIsLocalModalOpen(false)}
          onSaveTicket={onSaveTicket}
        />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          allTickets={safeTickets}
          notes={notes}
          jiraInstances={safeJiraInstances}
          onClose={() => setSelectedTicket(null)}
          onUpdateStatus={onUpdateStatus}
          onDeleteTicket={onDeleteTicket}
          onSaveTicket={async (updated) => {
            await onSaveTicket(updated);
            setSelectedTicket((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
          }}
          onSyncJiraTicket={onFetchJiraTicket}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          onOpenLinkedTicket={(linkedTicket) => setSelectedTicket(linkedTicket)}
          onNavigateToNote={onNavigateToNote}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  boardWrapper: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    backgroundColor: 'var(--bg-sidebar)',
    borderBottom: '1px solid var(--border-subtle)',
    gap: '16px',
  },
  filterSelect: {
    width: 'auto',
    minWidth: '220px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: '600',
  },
  jqlSectionContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '12px 24px',
    backgroundColor: '#161622',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  jqlSectionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    overflow: 'hidden',
  },
  jqlPillsScroll: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '2px',
    flex: 1,
    scrollbarWidth: 'none',
  },
  jqlSectionPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#cbd5e1',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    userSelect: 'none',
  },
  pillBadgeCount: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '1px 6px',
    borderRadius: '10px',
    marginLeft: '2px',
  },
  deletePillBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.5)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px',
    borderRadius: '50%',
    marginLeft: '2px',
    transition: 'color 0.15s ease',
  },
  saveSectionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 10px',
    borderRadius: '16px',
    fontSize: '11px',
    fontWeight: '700',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    border: '1px dashed rgba(56, 189, 248, 0.4)',
    color: '#38bdf8',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  jqlInputBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  jqlInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#0f0f17',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '8px',
    position: 'relative',
    transition: 'border-color 0.2s ease',
  },
  jqlInputField: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#38bdf8',
    fontFamily: 'JetBrains Mono, "Courier New", monospace',
    fontSize: '12.5px',
    fontWeight: '500',
    padding: '7px 12px',
    outline: 'none',
  },
  clearJqlBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jqlStatusBadge: {
    padding: '0 12px',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  },
  syncJiraBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    border: '1px solid rgba(2, 132, 199, 0.4)',
    color: '#38bdf8',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  saveQueryActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#f8fafc',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  modalLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  },
  viewToggleGroup: {
    display: 'flex',
    gap: '4px',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: '3px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  activeToggleBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#60a5fa',
    border: '1px solid rgba(59, 130, 246, 0.4)',
  },
  toastBanner: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '12px 20px',
    borderRadius: '12px',
    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)',
    minWidth: '320px',
    maxWidth: '520px',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
  boardContainer: {
    display: 'flex',
    gap: '16px',
    flex: 1,
    height: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    padding: '20px 24px',
  },
  tableWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '20px 24px 24px 24px',
    backgroundColor: 'var(--bg-main)',
    gap: '12px',
  },
  tableScrollContainer: {
    flex: 1,
    overflow: 'auto',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: '#13131a',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
  },
  dataTable: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '13px',
  },
  thCellSortable: {
    padding: '14px 18px',
    backgroundColor: 'rgba(22, 22, 30, 0.95)',
    color: '#94a3b8',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backdropFilter: 'blur(8px)',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'color 0.15s ease',
  },
  tdCell: {
    padding: '14px 18px',
    verticalAlign: 'middle',
  },
  tableRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    transition: 'all 0.15s ease',
    height: '56px',
  },
  hoveredRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
  },
  workCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  tableKeyLink: {
    color: '#38bdf8',
    fontWeight: '700',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '13px',
    cursor: 'pointer',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    padding: '3px 10px',
    borderRadius: '6px',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    minWidth: '82px',
    textAlign: 'center',
    display: 'inline-block',
  },
  tableTitleText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '13px',
    lineHeight: '1.4',
  },
  tableLabelChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#e2e8f0',
    fontSize: '11px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '5px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  tableStatusSelect: {
    padding: '5px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    outline: 'none',
  },
  tablePriorityBadge: {
    padding: '3px 9px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    display: 'inline-block',
  },
  tableAssigneeBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  tableAvatarCircle: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#0284c7',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
  },
  tableFooterBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 18px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  tableRefreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    color: 'var(--text-secondary)',
    padding: '4px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  thCellCheckbox: {
    padding: '14px 12px',
    backgroundColor: 'rgba(22, 22, 30, 0.95)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backdropFilter: 'blur(8px)',
    textAlign: 'center',
  },
  tableMasterCheckbox: {
    width: '20px',
    height: '20px',
    borderRadius: '5px',
    border: '1.5px solid',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.15s ease',
  },
  tableRowCheckbox: {
    width: '20px',
    height: '20px',
    borderRadius: '5px',
    border: '1.5px solid',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.15s ease',
  },
  selectedTableRow: {
    backgroundColor: 'rgba(56, 189, 248, 0.09)',
  },
  floatingBulkBar: {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '24px',
    padding: '10px 18px',
    borderRadius: '16px',
    backgroundColor: 'rgba(15, 17, 26, 0.92)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(56, 189, 248, 0.35)',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(56, 189, 248, 0.15)',
    minWidth: '460px',
    maxWidth: '90vw',
    animation: 'fadeInUp 0.25s ease-out',
  },
  floatingBulkLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  bulkSelectionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    padding: '6px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(56, 189, 248, 0.3)',
  },
  bulkSelectAllBtn: {
    background: 'transparent',
    border: 'none',
    color: '#38bdf8',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '4px 6px',
  },
  floatingBulkRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  bulkStatusBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    color: '#ffffff',
    fontSize: '12.5px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  statusDropdownMenu: {
    position: 'absolute',
    bottom: 'calc(100% + 10px)',
    left: '0',
    width: '210px',
    backgroundColor: '#13141f',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    zIndex: 1100,
  },
  statusDropdownHeader: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    padding: '6px 8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    marginBottom: '2px',
  },
  statusDropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 10px',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'background-color 0.15s ease',
  },
  bulkDeleteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.45)',
    color: '#f87171',
    fontSize: '12.5px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  bulkCancelBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '7px 10px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'var(--text-muted)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
