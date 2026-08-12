import React, { useState } from 'react';
import type { Ticket, JiraInstance, TicketStatus } from '../../types/index';
import { TicketColumn } from './TicketColumn';
import { AddJiraModal } from './AddJiraModal';
import { AddLocalTicketModal } from './AddLocalTicketModal';
import { TicketDetailModal } from './TicketDetailModal';
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
  SlidersHorizontal,
} from 'lucide-react';

interface TicketBoardProps {
  tickets: Ticket[];
  notes?: NoteItem[];
  jiraInstances: JiraInstance[];
  searchQuery: string;
  onFetchJiraTicket: (key: string, instanceId: string) => Promise<void>;
  onRefreshTickets?: () => Promise<void>;
  onSaveTicket: (ticket: Partial<Ticket>) => Promise<void>;
  onUpdateStatus: (ticketId: string, newStatus: TicketStatus) => Promise<void>;
  onDeleteTicket: (ticketId: string) => Promise<void>;
  onOpenSettings: () => void;
}

interface ToastNotice {
  type: 'success' | 'error';
  message: string;
}

type SortField = 'work' | 'labels' | 'status' | 'dueDate' | 'priority' | 'assignee';
type SortOrder = 'asc' | 'desc';

export const TicketBoard: React.FC<TicketBoardProps> = ({
  tickets = [],
  notes = [],
  jiraInstances = [],
  searchQuery = '',
  onFetchJiraTicket,
  onRefreshTickets,
  onSaveTicket,
  onUpdateStatus,
  onDeleteTicket,
  onOpenSettings,
}) => {
  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');
  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [toastNotice, setToastNotice] = useState<ToastNotice | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // Sorting State (Default: Status Order 1 to 6)
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Filters State
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('ALL');

  const triggerToast = (type: 'success' | 'error', message: string) => {
    setToastNotice({ type, message });
    setTimeout(() => {
      setToastNotice((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  // Safe Array Defensive Guarding
  const safeTickets = Array.isArray(tickets) ? tickets.filter((t) => t && typeof t === 'object') : [];
  const safeJiraInstances = Array.isArray(jiraInstances) ? jiraInstances.filter((i) => i && typeof i === 'object') : [];

  // Multi-Field Search & Status/Instance Filter
  const finalFilteredTickets = safeTickets.filter((t) => {
    if (!t) return false;

    // 1. Jira Instance Filter
    if (selectedInstanceId !== 'ALL') {
      if (selectedInstanceId === 'LOCAL_ONLY' && t.source !== 'LOCAL') return false;
      if (selectedInstanceId !== 'LOCAL_ONLY' && (t.source !== 'JIRA' || t.jiraInstanceId !== selectedInstanceId)) return false;
    }

    // 2. Status Filter
    if (statusFilter !== 'ALL' && t.status !== statusFilter) {
      return false;
    }

    // 3. Multi-Field Search (key, title, description, assignee, reporter, priority, statusLabel, labels)
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const key = (t.key || '').toLowerCase();
      const title = (t.title || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const assignee = (t.assignee || '').toLowerCase();
      const reporter = (t.reporter || '').toLowerCase();
      const priority = (t.priority || '').toLowerCase();
      const statusLabel = (t.statusLabel || '').toLowerCase();
      const labelsText = (t.labels || []).join(' ').toLowerCase();

      const matches =
        key.includes(q) ||
        title.includes(q) ||
        desc.includes(q) ||
        assignee.includes(q) ||
        reporter.includes(q) ||
        priority.includes(q) ||
        statusLabel.includes(q) ||
        labelsText.includes(q);

      if (!matches) return false;
    }

    return true;
  });

  // Interactive Column Sorting with Requested Status Priority Order
  const sortedFilteredTickets = [...finalFilteredTickets].sort((a, b) => {
    let valA: any = '';
    let valB: any = '';

    switch (sortField) {
      case 'work':
        valA = (a.key || a.title || '').toLowerCase();
        valB = (b.key || b.title || '').toLowerCase();
        break;
      case 'labels':
        valA = a.labels && a.labels.length > 0 ? a.labels[0].toLowerCase() : 'zzz';
        valB = b.labels && b.labels.length > 0 ? b.labels[0].toLowerCase() : 'zzz';
        break;
      case 'status':
        const statusOrder: Record<string, number> = {
          IN_PROGRESS: 1,
          NEXT: 2,
          TO_DO: 3,
          WAITING_CLIENT: 4,
          BACKLOG: 5,
          DONE: 6,
        };
        valA = statusOrder[a.status] || 99;
        valB = statusOrder[b.status] || 99;
        break;
      case 'dueDate':
        valA = a.dueDate ? new Date(a.dueDate).getTime() : a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        valB = b.dueDate ? new Date(b.dueDate).getTime() : b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        break;
      case 'priority':
        const priorityOrder = (p?: string) => {
          const str = (p || '').toLowerCase();
          if (str.includes('urgente') || str.includes('alta') || str.includes('high')) return 1;
          if (str.includes('média') || str.includes('medium') || str.includes('normal')) return 2;
          if (str.includes('baixa') || str.includes('low')) return 3;
          return 4;
        };
        valA = priorityOrder(a.priority);
        valB = priorityOrder(b.priority);
        break;
      case 'assignee':
        valA = (a.assignee || '').toLowerCase();
        valB = (b.assignee || '').toLowerCase();
        break;
      default:
        return 0;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ArrowUp size={12} color="#38bdf8" style={{ marginLeft: '4px' }} />
    ) : (
      <ArrowDown size={12} color="#38bdf8" style={{ marginLeft: '4px' }} />
    );
  };

  const jiraTickets = finalFilteredTickets.filter((t) => t && t.source === 'JIRA');
  const localTickets = finalFilteredTickets.filter((t) => t && t.source === 'LOCAL');

  const handleAddComment = async (ticketId: string, author: string, body: string) => {
    const target = safeTickets.find((t) => t.id === ticketId);
    if (!target) return;
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

      {/* Filter Control Bar for Jira Instances + Status Filter Pills + View Mode Toggle */}
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

          {/* Interactive Status Filter Pills Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '700', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <SlidersHorizontal size={13} color="#a78bfa" /> Status:
            </span>
            {[
              { id: 'ALL', label: 'Todos', color: '#94a3b8' },
              { id: 'IN_PROGRESS', label: 'Em Andamento', color: '#60a5fa' },
              { id: 'NEXT', label: 'Fazer em Seguida', color: '#a78bfa' },
              { id: 'TO_DO', label: 'A Fazer', color: '#f59e0b' },
              { id: 'WAITING_CLIENT', label: 'Aguardando Cliente', color: '#fb923c' },
              { id: 'BACKLOG', label: 'Backlog', color: '#94a3b8' },
              { id: 'DONE', label: 'Concluído', color: '#10b981' },
            ].map((st) => {
              const count = st.id === 'ALL'
                ? safeTickets.length
                : safeTickets.filter((t) => t.status === st.id).length;
              const isActive = statusFilter === st.id;

              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id as any)}
                  style={{
                    ...styles.statusFilterPill,
                    ...(isActive ? { backgroundColor: 'rgba(255, 255, 255, 0.12)', borderColor: st.color, color: st.color, fontWeight: '700' } : {}),
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: st.color, display: 'inline-block' }} />
                  {st.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* View Mode Switcher Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '13px' }}
            onClick={() => setIsJiraModalOpen(true)}
          >
            <Plus size={15} /> Puxar do Jira
          </button>

          <div style={styles.viewToggleGroup}>
            <button
              style={{
                ...styles.toggleBtn,
                ...(viewMode === 'KANBAN' ? styles.activeToggleBtn : {}),
              }}
              onClick={() => setViewMode('KANBAN')}
              title="Visualização em Colunas Kanban"
            >
              <LayoutGrid size={15} /> Kanban
            </button>
            <button
              style={{
                ...styles.toggleBtn,
                ...(viewMode === 'TABLE' ? styles.activeToggleBtn : {}),
              }}
              onClick={() => setViewMode('TABLE')}
              title="Visualização em Tabela Jira (Data Table)"
            >
              <TableIcon size={15} /> Tabela
            </button>
          </div>
        </div>
      </div>

      {/* Render Kanban View OR Data Table View */}
      {viewMode === 'KANBAN' ? (
        <div style={styles.boardContainer}>
          <TicketColumn
            title="Tickets Atlassian"
            iconSrc="./assets/jira-badge.png"
            tickets={jiraTickets}
            onAddClick={() => setIsJiraModalOpen(true)}
            onCardClick={(t) => setSelectedTicket(t)}
            accentColor="#0284c7"
          />

          <TicketColumn
            title="Tickets do App"
            iconSrc="./assets/app-badge.png"
            tickets={localTickets}
            onAddClick={() => setIsLocalModalOpen(true)}
            onCardClick={(t) => setSelectedTicket(t)}
            accentColor="#8b5cf6"
          />
        </div>
      ) : (
        /* Modern Jira Data Table View (With Clickable Column Sorting) */
        <div style={styles.tableWrapper}>
          <div style={styles.tableScrollContainer}>
            <table style={styles.dataTable}>
              <thead>
                <tr>
                  <th style={{ ...styles.thCellSortable, minWidth: '320px' }} onClick={() => handleSort('work')} title="Ordenar por Chamado/Título">
                    Work {renderSortIcon('work')}
                  </th>
                  <th style={{ ...styles.thCellSortable, width: '130px' }} onClick={() => handleSort('labels')} title="Ordenar por Label">
                    Labels {renderSortIcon('labels')}
                  </th>
                  <th style={{ ...styles.thCellSortable, width: '150px' }} onClick={() => handleSort('status')} title="Ordenar por Status">
                    Status {renderSortIcon('status')}
                  </th>
                  <th style={{ ...styles.thCellSortable, width: '130px' }} onClick={() => handleSort('dueDate')} title="Ordenar por Data">
                    Due date {renderSortIcon('dueDate')}
                  </th>
                  <th style={{ ...styles.thCellSortable, width: '140px' }} onClick={() => handleSort('priority')} title="Ordenar por Complexidade/Prioridade">
                    Complexidade {renderSortIcon('priority')}
                  </th>
                  <th style={{ ...styles.thCellSortable, width: '180px' }} onClick={() => handleSort('assignee')} title="Ordenar por Responsável">
                    Assignee {renderSortIcon('assignee')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedFilteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                      Nenhum ticket encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  sortedFilteredTickets.map((t) => {
                    const isHovered = hoveredRowId === t.id;

                    return (
                      <tr
                        key={t.id}
                        onMouseEnter={() => setHoveredRowId(t.id)}
                        onMouseLeave={() => setHoveredRowId(null)}
                        style={{
                          ...styles.tableRow,
                          ...(isHovered ? styles.hoveredRow : {}),
                        }}
                      >
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
            <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>
              Exibindo <b>{sortedFilteredTickets.length}</b> de <b>{safeTickets.length}</b> tickets (Ordenado por {sortField} {sortOrder === 'asc' ? '▲' : '▼'})
            </span>
            <button style={styles.tableRefreshBtn} onClick={() => onRefreshTickets && onRefreshTickets()} title="Recarregar">
              <RotateCcw size={14} /> <span style={{ fontSize: '12px' }}>Recarregar Dados</span>
            </button>
          </div>
        </div>
      )}

      {isJiraModalOpen && (
        <AddJiraModal
          jiraInstances={safeJiraInstances}
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
          onOpenLinkedTicket={(linkedTicket) => setSelectedTicket(linkedTicket)}
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
  statusFilterPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 10px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
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
    position: 'absolute',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    padding: '12px 20px',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
    minWidth: '380px',
    maxWidth: '650px',
    backdropFilter: 'blur(8px)',
  },
  boardContainer: {
    display: 'flex',
    gap: '24px',
    flex: 1,
    height: '100%',
    overflow: 'hidden',
    padding: '24px',
  },
  tableWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '24px',
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
};
