import React, { useState, useMemo, useEffect } from 'react';
import { marked } from 'marked';
import {
  Briefcase,
  Plus,
  Search,
  Building2,
  Layers,
  FileText,
  Calendar,
  Bell,
  Trash2,
  Edit2,
  ExternalLink,
  Mail,
  Phone,
  Clock,
  Tag,
  CheckCircle2,
  AlertCircle,
  Folder,
  LayoutDashboard,
  Unlink,
  Link as LinkIcon,
  ChevronRight,
  Filter,
  Check,
  X,
  Calendar as CalendarIcon,
  Copy,
  Eye,
  MapPin,
  Video,
  GripVertical,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ListOrdered,
} from 'lucide-react';
import type {
  ClientAsset,
  ClientStatus,
  Ticket,
  NoteItem,
  NoteFolder,
  CalendarEvent,
  Reminder,
  JiraInstance,
  TicketStatus,
} from '../../types/index';
import { ClientModal } from './ClientModal';
import { TicketDetailModal } from '../tickets/TicketDetailModal';

interface ClientsViewProps {
  clients: ClientAsset[];
  tickets: Ticket[];
  notes: NoteItem[];
  folders: NoteFolder[];
  calendarEvents: CalendarEvent[];
  reminders: Reminder[];
  jiraInstances: JiraInstance[];
  initialClientId?: string | null;
  onSaveClient: (client: Partial<ClientAsset> & { name: string }) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  onSaveTicket?: (ticket: Partial<Ticket>) => Promise<void>;
  onUpdateTicketStatus?: (ticketId: string, status: TicketStatus) => Promise<void>;
  onDeleteTicket?: (ticketId: string) => Promise<void>;
  onReadNoteContent?: (filePath: string) => Promise<string>;
  onOpenNewTicketForClient?: (clientId: string) => void;
  onNavigateToNote?: (noteId: string) => void;
}

type ClientTab = 'overview' | 'tickets' | 'notes' | 'meetings' | 'reminders';

const STATUS_LABELS: Record<ClientStatus, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'Ativo', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  PROSPECT: { label: 'Prospect / Lead', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  INACTIVE: { label: 'Inativo', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
  ARCHIVED: { label: 'Arquivado', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
};

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients = [],
  tickets = [],
  notes = [],
  folders = [],
  calendarEvents = [],
  reminders = [],
  jiraInstances = [],
  initialClientId,
  onSaveClient,
  onDeleteClient,
  onSaveTicket,
  onUpdateTicketStatus,
  onDeleteTicket,
  onReadNoteContent,
  onOpenNewTicketForClient,
  onNavigateToNote,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    initialClientId || (clients.length > 0 ? clients[0].id : null)
  );

  useEffect(() => {
    if (initialClientId) {
      setSelectedClientId(initialClientId);
    }
  }, [initialClientId]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<ClientTab>('overview');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<ClientAsset | null>(null);

  // Link Items Modal State
  const [linkModalType, setLinkModalType] = useState<'ticket' | 'note' | 'folder' | 'meeting' | 'reminder' | null>(null);

  // Embedded Preview States (sem redirecionar para fora do módulo de Clientes)
  const [previewTicket, setPreviewTicket] = useState<Ticket | null>(null);
  const [previewNote, setPreviewNote] = useState<{ note: NoteItem; content: string } | null>(null);
  const [previewEvent, setPreviewEvent] = useState<CalendarEvent | null>(null);
  const [previewReminder, setPreviewReminder] = useState<Reminder | null>(null);

  // Selected client object
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || clients[0] || null;
  }, [clients, selectedClientId]);

  // Filtered clients list for left sidebar
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch =
        !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.contactEmail && c.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  const [overviewOrderMode, setOverviewOrderMode] = useState<'custom' | 'type' | 'recent' | 'az'>('custom');
  const [overviewCustomOrder, setOverviewCustomOrder] = useState<string[]>([]);
  const [draggedOverviewId, setDraggedOverviewId] = useState<string | null>(null);
  const [dragOverOverviewId, setDragOverOverviewId] = useState<string | null>(null);

  // Sincroniza a ordem manual da Visão Geral para o cliente atual
  useEffect(() => {
    if (selectedClientId) {
      try {
        const saved = localStorage.getItem(`client_overview_order_${selectedClientId}`);
        if (saved) {
          setOverviewCustomOrder(JSON.parse(saved));
        } else {
          setOverviewCustomOrder([]);
        }
      } catch {
        setOverviewCustomOrder([]);
      }
    }
  }, [selectedClientId]);

  // Client linked resources
  const clientTickets = useMemo(() => {
    if (!selectedClient) return [];
    const linkedIds = selectedClient.linkedTicketIds || [];
    return (tickets || []).filter((t) => linkedIds.includes(t.id) || t.clientId === selectedClient.id);
  }, [tickets, selectedClient]);

  const clientNotes = useMemo(() => {
    if (!selectedClient) return [];
    const linkedIds = selectedClient.linkedNoteIds || [];
    return (notes || []).filter((n) => linkedIds.includes(n.id) || n.clientId === selectedClient.id);
  }, [notes, selectedClient]);

  const clientFolders = useMemo(() => {
    if (!selectedClient) return [];
    const linkedIds = selectedClient.linkedFolderIds || [];
    return (folders || []).filter((f) => linkedIds.includes(f.id) || f.clientId === selectedClient.id);
  }, [folders, selectedClient]);

  const clientMeetings = useMemo(() => {
    if (!selectedClient) return [];
    const linkedIds = selectedClient.linkedEventIds || [];
    return (calendarEvents || []).filter((e) => linkedIds.includes(e.id) || e.clientId === selectedClient.id);
  }, [calendarEvents, selectedClient]);

  const clientReminders = useMemo(() => {
    if (!selectedClient) return [];
    const linkedIds = selectedClient.linkedReminderIds || [];
    return (reminders || []).filter((r) => linkedIds.includes(r.id) || r.clientId === selectedClient.id);
  }, [reminders, selectedClient]);

  const clientInstances = useMemo(() => {
    if (!selectedClient || !selectedClient.instanceIds) return [];
    return (jiraInstances || []).filter((i) => selectedClient.instanceIds?.includes(i.id));
  }, [jiraInstances, selectedClient]);

  // Consolidated Overview items for unified view & manual ordering
  const allOverviewItems = useMemo(() => {
    if (!selectedClient) return [];
    const list: Array<{
      uniqueId: string;
      id: string;
      type: 'ticket' | 'note' | 'meeting' | 'reminder';
      title: string;
      badge: string;
      badgeBg: string;
      badgeColor: string;
      statusLabel?: string;
      secondaryInfo?: string;
      rawDate: number;
      rawItem: any;
    }> = [];

    // 1. Tickets
    clientTickets.forEach((t) => {
      list.push({
        uniqueId: `ticket_${t.id}`,
        id: t.id,
        type: 'ticket',
        title: t.title,
        badge: t.key || 'LOCAL',
        badgeBg: t.source === 'JIRA' ? 'rgba(0,82,204,0.2)' : 'rgba(99,102,241,0.2)',
        badgeColor: t.source === 'JIRA' ? '#60a5fa' : '#a5b4fc',
        statusLabel: t.statusLabel || t.jiraStatus || (t.status === 'DONE' ? 'Concluído' : t.status === 'IN_PROGRESS' ? 'Em Andamento' : 'A Fazer'),
        rawDate: new Date(t.updatedAt || t.startDate || t.dueDate || 0).getTime(),
        rawItem: t,
      });
    });

    // 2. Notes & Docs
    clientNotes.forEach((n) => {
      const isFile =
        n.format === 'file' ||
        ['pdf', 'docx', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'webp'].includes(
          ((n.filePath || n.title || '').split('.').pop() || '').toLowerCase()
        );
      const ext = (n.title.split('.').pop() || 'NOTA').toUpperCase();
      list.push({
        uniqueId: `note_${n.id}`,
        id: n.id,
        type: 'note',
        title: n.title,
        badge: isFile ? ext : 'NOTA',
        badgeBg: isFile ? 'rgba(245, 158, 11, 0.18)' : 'rgba(168, 85, 247, 0.18)',
        badgeColor: isFile ? '#fbbf24' : '#c084fc',
        statusLabel: isFile ? 'Documento' : 'Anotação',
        secondaryInfo: `Atualizado em: ${new Date(n.updatedAt).toLocaleDateString('pt-BR')}`,
        rawDate: new Date(n.updatedAt).getTime(),
        rawItem: n,
      });
    });

    // 3. Meetings
    clientMeetings.forEach((m) => {
      const calId = (m.calendarId || '').toLowerCase();
      const calName = (m.calendarName || '').toLowerCase();
      const isOutlook =
        calId === 'outlook' ||
        calName.includes('outlook') ||
        calName.includes('microsoft');
      const isGoogle =
        calId === 'google' ||
        calName.includes('google') ||
        calName.includes('gmail');
      const sourceTag = isOutlook ? 'OUTLOOK' : isGoogle ? 'GOOGLE' : (m.calendarName || 'AGENDA').toUpperCase();
      list.push({
        uniqueId: `meeting_${m.id}`,
        id: m.id,
        type: 'meeting',
        title: m.title,
        badge: sourceTag,
        badgeBg: isOutlook
          ? 'rgba(2, 132, 199, 0.18)'
          : isGoogle
          ? 'rgba(5, 150, 105, 0.18)'
          : 'rgba(52, 211, 153, 0.18)',
        badgeColor: isOutlook ? '#38bdf8' : isGoogle ? '#34d399' : '#6ee7b7',
        statusLabel: new Date(m.start).toLocaleDateString('pt-BR'),
        secondaryInfo: `${new Date(m.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${new Date(m.end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        rawDate: new Date(m.start).getTime(),
        rawItem: m,
      });
    });

    // 4. Reminders
    clientReminders.forEach((r) => {
      list.push({
        uniqueId: `reminder_${r.id}`,
        id: r.id,
        type: 'reminder',
        title: r.title,
        badge: 'LEMBRETE',
        badgeBg: 'rgba(236, 72, 153, 0.18)',
        badgeColor: '#f472b6',
        statusLabel: r.enabled ? 'Ativo' : 'Pausado',
        secondaryInfo: r.message,
        rawDate: new Date(r.scheduledTime || r.createdAt).getTime(),
        rawItem: r,
      });
    });

    return list;
  }, [selectedClient, clientTickets, clientNotes, clientMeetings, clientReminders]);

  const sortedOverviewItems = useMemo(() => {
    const items = [...allOverviewItems];
    if (overviewOrderMode === 'type') {
      const typePriority: Record<string, number> = { ticket: 1, note: 2, meeting: 3, reminder: 4 };
      return items.sort((a, b) => (typePriority[a.type] || 99) - (typePriority[b.type] || 99));
    }
    if (overviewOrderMode === 'recent') {
      return items.sort((a, b) => b.rawDate - a.rawDate);
    }
    if (overviewOrderMode === 'az') {
      return items.sort((a, b) => a.title.localeCompare(b.title));
    }

    if (overviewCustomOrder.length > 0) {
      return items.sort((a, b) => {
        const idxA = overviewCustomOrder.indexOf(a.uniqueId);
        const idxB = overviewCustomOrder.indexOf(b.uniqueId);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
    }

    return items;
  }, [allOverviewItems, overviewOrderMode, overviewCustomOrder]);

  const handleMoveOverviewItem = (index: number, direction: 'up' | 'down') => {
    const currentIds = sortedOverviewItems.map((item) => item.uniqueId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentIds.length) return;

    const newOrder = [...currentIds];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    setOverviewCustomOrder(newOrder);
    setOverviewOrderMode('custom');
    if (selectedClient) {
      localStorage.setItem(`client_overview_order_${selectedClient.id}`, JSON.stringify(newOrder));
    }
  };

  const handleDragStartOverview = (e: React.DragEvent, uniqueId: string) => {
    e.dataTransfer.setData('text/plain', uniqueId);
    setDraggedOverviewId(uniqueId);
  };

  const handleDropOverview = (e: React.DragEvent, targetUniqueId: string) => {
    e.preventDefault();
    if (!draggedOverviewId || draggedOverviewId === targetUniqueId) {
      setDraggedOverviewId(null);
      setDragOverOverviewId(null);
      return;
    }

    const currentIds = sortedOverviewItems.map((item) => item.uniqueId);
    const fromIdx = currentIds.indexOf(draggedOverviewId);
    const toIdx = currentIds.indexOf(targetUniqueId);

    if (fromIdx !== -1 && toIdx !== -1) {
      const newOrder = [...currentIds];
      const [moved] = newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, moved);

      setOverviewCustomOrder(newOrder);
      setOverviewOrderMode('custom');
      if (selectedClient) {
        localStorage.setItem(`client_overview_order_${selectedClient.id}`, JSON.stringify(newOrder));
      }
    }

    setDraggedOverviewId(null);
    setDragOverOverviewId(null);
  };

  const handleOpenOverviewItem = async (item: typeof sortedOverviewItems[0]) => {
    if (item.type === 'ticket') {
      setPreviewTicket(item.rawItem);
    } else if (item.type === 'note') {
      const note = item.rawItem as NoteItem;
      const isFile =
        note.format === 'file' ||
        ['pdf', 'docx', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'webp'].includes(
          ((note.filePath || note.title || '').split('.').pop() || '').toLowerCase()
        );
      if (isFile && onOpenFileViewer) {
        onOpenFileViewer(note);
        return;
      }
      let content = '';
      if (note.filePath && (window as any).electronAPI?.readFile) {
        try {
          const res = await (window as any).electronAPI.readFile(note.filePath);
          if (res && res.success) {
            content = res.content || '';
          }
        } catch (e) {
          console.error(e);
        }
      }
      setPreviewNote({ note, content });
    } else if (item.type === 'meeting') {
      setPreviewMeeting(item.rawItem);
    } else if (item.type === 'reminder') {
      setPreviewReminder(item.rawItem);
    }
  };

  // Handlers for linking/unlinking items
  const handleToggleLinkItem = async (type: 'ticket' | 'note' | 'folder' | 'event' | 'reminder', itemId: string) => {
    if (!selectedClient) return;

    let linkedTicketIds = [...(selectedClient.linkedTicketIds || [])];
    let linkedNoteIds = [...(selectedClient.linkedNoteIds || [])];
    let linkedFolderIds = [...(selectedClient.linkedFolderIds || [])];
    let linkedEventIds = [...(selectedClient.linkedEventIds || [])];
    let linkedReminderIds = [...(selectedClient.linkedReminderIds || [])];

    if (type === 'ticket') {
      linkedTicketIds = linkedTicketIds.includes(itemId)
        ? linkedTicketIds.filter((id) => id !== itemId)
        : [...linkedTicketIds, itemId];
    } else if (type === 'note') {
      linkedNoteIds = linkedNoteIds.includes(itemId)
        ? linkedNoteIds.filter((id) => id !== itemId)
        : [...linkedNoteIds, itemId];
    } else if (type === 'folder') {
      linkedFolderIds = linkedFolderIds.includes(itemId)
        ? linkedFolderIds.filter((id) => id !== itemId)
        : [...linkedFolderIds, itemId];
    } else if (type === 'event') {
      linkedEventIds = linkedEventIds.includes(itemId)
        ? linkedEventIds.filter((id) => id !== itemId)
        : [...linkedEventIds, itemId];
    } else if (type === 'reminder') {
      linkedReminderIds = linkedReminderIds.includes(itemId)
        ? linkedReminderIds.filter((id) => id !== itemId)
        : [...linkedReminderIds, itemId];
    }

    await onSaveClient({
      ...selectedClient,
      linkedTicketIds,
      linkedNoteIds,
      linkedFolderIds,
      linkedEventIds,
      linkedReminderIds,
    });
  };

  const handleDeleteClientConfirm = async (client: ClientAsset) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${client.name}"? Os tickets, notas e reuniões não serão apagados, apenas o vínculo com o cliente.`)) {
      await onDeleteClient(client.id);
      if (selectedClientId === client.id) {
        setSelectedClientId(clients.find((c) => c.id !== client.id)?.id || null);
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        height: '100%',
        backgroundColor: 'var(--bg-main)',
        overflow: 'hidden',
      }}
    >
      {/* ── Left Column: Clients List (JSM Assets Explorer) ── */}
      <div
        style={{
          width: '340px',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 18px 14px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <Briefcase size={17} />
              </div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#fff' }}>
                Clientes (Assets)
              </h2>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => {
                setClientToEdit(null);
                setIsModalOpen(true);
              }}
              style={{ padding: '6px 12px', fontSize: '12px', gap: '4px' }}
              title="Criar novo cliente"
            >
              <Plus size={14} /> Novo
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente, instância, email..."
              style={{ paddingLeft: '32px', fontSize: '12px' }}
            />
          </div>

          {/* Status Filter Pills */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
            {['ALL', 'ACTIVE', 'PROSPECT', 'INACTIVE'].map((st) => {
              const isSelected = statusFilter === st;
              const label =
                st === 'ALL'
                  ? 'Todos'
                  : st === 'ACTIVE'
                  ? 'Ativos'
                  : st === 'PROSPECT'
                  ? 'Prospects'
                  : 'Inativos';

              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.04)',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Clients Scrollable List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {filteredClients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 14px', color: 'var(--text-muted)' }}>
              <Building2 size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
              <p style={{ fontSize: '13px', margin: 0 }}>Nenhum cliente encontrado.</p>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setClientToEdit(null);
                  setIsModalOpen(true);
                }}
                style={{ marginTop: '12px', fontSize: '12px', padding: '6px 12px' }}
              >
                <Plus size={13} /> Cadastrar Cliente
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredClients.map((client) => {
                const isSelected = selectedClient?.id === client.id;
                const clientColor = client.color || '#0052cc';
                const statusMeta = STATUS_LABELS[client.status] || STATUS_LABELS.ACTIVE;

                // Counts
                const tCount = (client.linkedTicketIds || []).length + tickets.filter((t) => t.clientId === client.id).length;
                const nCount = (client.linkedNoteIds || []).length + notes.filter((n) => n.clientId === client.id).length;
                const mCount = (client.linkedEventIds || []).length + calendarEvents.filter((e) => e.clientId === client.id).length;

                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClientId(client.id)}
                    style={{
                      position: 'relative',
                      padding: '12px 14px 12px 18px',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.14)' : 'var(--bg-card-app)',
                      border: isSelected
                        ? '1px solid var(--accent-primary)'
                        : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Faixa Colorida Lateral Dedicada - Nunca é sobrescrita pelo estado isSelected */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '5px',
                        backgroundColor: clientColor,
                        borderRadius: '10px 0 0 10px',
                        boxShadow: isSelected ? `0 0 8px ${clientColor}80` : 'none',
                        zIndex: 2,
                      }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: isSelected ? '#fff' : 'var(--text-main)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {client.name}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '10px',
                          backgroundColor: statusMeta.bg,
                          color: statusMeta.color,
                          flexShrink: 0,
                        }}
                      >
                        {statusMeta.label}
                      </span>
                    </div>

                    {/* Description excerpt */}
                    {client.description && (
                      <p
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {client.description}
                      </p>
                    )}

                    {/* Resources Counters Badge Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {tCount > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }} title="Tickets Vinculados">
                          <LayoutDashboard size={12} color="#60a5fa" /> {tCount}
                        </span>
                      )}
                      {nCount > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }} title="Anotações Vinculadas">
                          <FileText size={12} color="#a78bfa" /> {nCount}
                        </span>
                      )}
                      {mCount > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }} title="Reuniões Vinculadas">
                          <Calendar size={12} color="#34d399" /> {mCount}
                        </span>
                      )}
                      {client.instanceIds && client.instanceIds.length > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: 'auto' }} title="Instâncias Jira">
                          <Layers size={12} color="#0052cc" /> {client.instanceIds.length} inst.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right Column: Selected Client Detail Panel (JSM Asset Overview & Linked Items) ── */}
      {selectedClient ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto',
            padding: '24px 32px',
            gap: '20px',
          }}
        >
          {/* Header Card */}
          <div
            style={{
              padding: '20px 24px',
              backgroundColor: 'var(--bg-card-app)',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
              borderTop: `4px solid ${selectedClient.color || '#0052cc'}`,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  backgroundColor: `${selectedClient.color || '#0052cc'}25`,
                  border: `1px solid ${selectedClient.color || '#0052cc'}60`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: selectedClient.color || '#0052cc',
                  boxShadow: `0 4px 16px ${selectedClient.color || '#0052cc'}30`,
                  flexShrink: 0,
                }}
              >
                <Briefcase size={26} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#fff' }}>
                    {selectedClient.name}
                  </h1>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 10px',
                      borderRadius: '12px',
                      backgroundColor: STATUS_LABELS[selectedClient.status]?.bg || 'rgba(16,185,129,0.15)',
                      color: STATUS_LABELS[selectedClient.status]?.color || '#10b981',
                    }}
                  >
                    {STATUS_LABELS[selectedClient.status]?.label || 'Ativo'}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      color: 'var(--text-secondary)',
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}
                  >
                    Asset ID: {selectedClient.id}
                  </span>
                </div>

                <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {selectedClient.description || 'Nenhuma descrição detalhada informada.'}
                </p>

                {/* Contact Info Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {selectedClient.contactEmail && (
                    <span style={{ fontSize: '12px', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={13} /> {selectedClient.contactEmail}
                    </span>
                  )}
                  {selectedClient.contactPhone && (
                    <span style={{ fontSize: '12px', color: '#86efac', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={13} /> {selectedClient.contactPhone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setClientToEdit(selectedClient);
                  setIsModalOpen(true);
                }}
                style={{ padding: '7px 14px', fontSize: '12px', gap: '6px' }}
              >
                <Edit2 size={13} /> Editar Cliente
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleDeleteClientConfirm(selectedClient)}
                style={{ padding: '7px 12px', fontSize: '12px', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                title="Excluir Cliente"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* ── Navigation Tabs (Overview, Tickets, Notes, Meetings, Reminders) ── */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-subtle)',
              gap: '4px',
            }}
          >
            {[
              { id: 'overview' as ClientTab, label: 'Visão Geral', icon: Building2 },
              { id: 'tickets' as ClientTab, label: `Tickets (${clientTickets.length})`, icon: LayoutDashboard },
              { id: 'notes' as ClientTab, label: `Anotações (${clientNotes.length})`, icon: FileText },
              { id: 'meetings' as ClientTab, label: `Reuniões (${clientMeetings.length})`, icon: Calendar },
              { id: 'reminders' as ClientTab, label: `Lembretes (${clientReminders.length})`, icon: Bell },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    borderBottom: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                    backgroundColor: 'transparent',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={15} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── TAB 1: VISÃO GERAL ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Summary Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div style={statCardStyle} onClick={() => setActiveTab('tickets')} role="button" tabIndex={0}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Tickets Vinculados
                  </span>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#60a5fa', marginTop: '4px' }}>
                    {clientTickets.length}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {clientTickets.filter((t) => t.status === 'DONE').length} concluídos
                  </span>
                </div>

                <div style={statCardStyle} onClick={() => setActiveTab('notes')} role="button" tabIndex={0}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Anotações & Docs
                  </span>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#a78bfa', marginTop: '4px' }}>
                    {clientNotes.length}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {clientFolders.length} pastas associadas
                  </span>
                </div>

                <div style={statCardStyle} onClick={() => setActiveTab('meetings')} role="button" tabIndex={0}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Reuniões na Agenda
                  </span>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                    {clientMeetings.length}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Google + Outlook
                  </span>
                </div>

                <div style={statCardStyle}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Instâncias Jira
                  </span>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#0052cc', marginTop: '4px' }}>
                    {clientInstances.length}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Sites Atlassian conectados
                  </span>
                </div>
              </div>

              {/* Connected Jira Instances Box */}
              <div
                style={{
                  padding: '18px 20px',
                  backgroundColor: 'var(--bg-card-app)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={16} color="#0052cc" />
                    <strong style={{ fontSize: '14px', color: '#fff' }}>
                      Instâncias Jira Conectadas a este Cliente
                    </strong>
                  </div>
                </div>

                {clientInstances.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                    Nenhuma instância Jira atribuída a este cliente. Clique em "Editar Cliente" para vincular um site Jira.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                    {clientInstances.map((inst) => (
                      <div
                        key={inst.id}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(0, 82, 204, 0.08)',
                          border: '1px solid rgba(0, 82, 204, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <img src="./assets/jira-badge.png" alt="Jira" style={{ width: '22px', height: '22px' }} />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {inst.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {inst.domain}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Seção: Todos os Recursos e Demandas Vinculadas (Ordenação Manual) ── */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  marginTop: '6px',
                }}
              >
                {/* Header da Lista com Controles de Ordenação */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '4px 0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ListOrdered size={16} color="var(--accent-primary)" />
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                      Recursos & Demandas Vinculadas ({sortedOverviewItems.length})
                    </h3>
                  </div>

                  {/* Barra de Filtros de Ordenação */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginRight: '2px' }}>
                      Ordenar por:
                    </span>

                    <button
                      type="button"
                      onClick={() => setOverviewOrderMode('custom')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: overviewOrderMode === 'custom' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                        color: overviewOrderMode === 'custom' ? '#fff' : 'var(--text-secondary)',
                        border: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      title="Ordem personalizada (arraste os itens para reordenar manualmente)"
                    >
                      <GripVertical size={12} />
                      <span>Manual</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOverviewOrderMode('type')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: overviewOrderMode === 'type' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                        color: overviewOrderMode === 'type' ? '#fff' : 'var(--text-secondary)',
                        border: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      title="Agrupar por tipo (Tickets, Notas, Reuniões, Lembretes)"
                    >
                      <Layers size={12} />
                      <span>Por Tipo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOverviewOrderMode('recent')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: overviewOrderMode === 'recent' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                        color: overviewOrderMode === 'recent' ? '#fff' : 'var(--text-secondary)',
                        border: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      title="Ordenar pelos mais recentes"
                    >
                      <Clock size={12} />
                      <span>Recentes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOverviewOrderMode('az')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: overviewOrderMode === 'az' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                        color: overviewOrderMode === 'az' ? '#fff' : 'var(--text-secondary)',
                        border: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      title="Ordem alfabética de A a Z"
                    >
                      <span>A-Z</span>
                    </button>
                  </div>
                </div>

                {/* Lista de Itens no formato da primeira imagem */}
                {sortedOverviewItems.length === 0 ? (
                  <div style={emptyStateStyle}>
                    <Briefcase size={30} style={{ opacity: 0.35 }} />
                    <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Nenhum recurso (ticket, anotação, reunião ou lembrete) vinculado a este cliente ainda.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setLinkModalType('ticket')}
                        style={{ fontSize: '12px', padding: '6px 12px', gap: '5px' }}
                      >
                        <LayoutDashboard size={13} color="#60a5fa" /> Vincular Ticket
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setLinkModalType('note')}
                        style={{ fontSize: '12px', padding: '6px 12px', gap: '5px' }}
                      >
                        <FileText size={13} color="#c084fc" /> Vincular Nota
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setLinkModalType('meeting')}
                        style={{ fontSize: '12px', padding: '6px 12px', gap: '5px' }}
                      >
                        <Calendar size={13} color="#34d399" /> Vincular Reunião
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sortedOverviewItems.map((item, index) => {
                      const isDragged = draggedOverviewId === item.uniqueId;
                      const isDragOver = dragOverOverviewId === item.uniqueId;

                      return (
                        <div
                          key={item.uniqueId}
                          draggable
                          onDragStart={(e) => handleDragStartOverview(e, item.uniqueId)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverOverviewId(item.uniqueId);
                          }}
                          onDragLeave={() => setDragOverOverviewId(null)}
                          onDrop={(e) => handleDropOverview(e, item.uniqueId)}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '10px',
                            backgroundColor: isDragOver
                              ? 'rgba(99, 102, 241, 0.25)'
                              : 'var(--bg-card-app)',
                            border: isDragOver
                              ? '1px dashed var(--accent-primary)'
                              : '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            opacity: isDragged ? 0.4 : 1,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            transition: 'all 0.12s ease',
                          }}
                          className="overview-item-row"
                        >
                          {/* Left: Drag Handle + Badge + Title */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                            {/* Drag Handle Icon */}
                            <div
                              style={{
                                cursor: 'grab',
                                display: 'flex',
                                alignItems: 'center',
                                color: 'var(--text-muted)',
                                opacity: 0.6,
                              }}
                              title="Arraste para reordenar"
                            >
                              <GripVertical size={14} />
                            </div>

                            {/* Resource Badge */}
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '5px',
                                backgroundColor: item.badgeBg,
                                color: item.badgeColor,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              {item.badge}
                            </span>

                            {/* Item Title with Click to Open Preview */}
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#fff',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                cursor: 'pointer',
                              }}
                              onClick={() => handleOpenOverviewItem(item)}
                              title={`Clique para abrir o preview • ${item.title}`}
                            >
                              {item.title}
                            </span>
                          </div>

                          {/* Right: Status / Time + Reorder Up/Down + Preview + Unlink */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            {item.secondaryInfo && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {item.secondaryInfo}
                              </span>
                            )}

                            {item.statusLabel && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  backgroundColor: 'rgba(255,255,255,0.06)',
                                  color: 'var(--text-secondary)',
                                  fontWeight: 600,
                                }}
                              >
                                {item.statusLabel}
                              </span>
                            )}

                            {/* Reorder Buttons (Up / Down) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveOverviewItem(index, 'up')}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: index === 0 ? 'rgba(255,255,255,0.1)' : 'var(--text-muted)',
                                  cursor: index === 0 ? 'default' : 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                                title="Mover para cima"
                              >
                                <ChevronUp size={13} />
                              </button>
                              <button
                                type="button"
                                disabled={index === sortedOverviewItems.length - 1}
                                onClick={() => handleMoveOverviewItem(index, 'down')}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color:
                                    index === sortedOverviewItems.length - 1
                                      ? 'rgba(255,255,255,0.1)'
                                      : 'var(--text-muted)',
                                  cursor:
                                    index === sortedOverviewItems.length - 1 ? 'default' : 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                                title="Mover para baixo"
                              >
                                <ChevronDown size={13} />
                              </button>
                            </div>

                            {/* Preview Eye Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenOverviewItem(item)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--accent-primary)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              title="Visualizar em preview"
                            >
                              <Eye size={14} />
                            </button>

                            {/* Unlink Button */}
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleLinkItem(
                                  item.type === 'meeting' ? 'event' : item.type,
                                  item.id
                                )
                              }
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              title="Desvincular do cliente"
                            >
                              <Unlink size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 2: TICKETS ── */}
          {activeTab === 'tickets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                  Tickets Vinculados ({clientTickets.length})
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setLinkModalType('ticket')}
                    style={{ fontSize: '12px', padding: '6px 12px', gap: '4px' }}
                  >
                    <LinkIcon size={13} /> Vincular Ticket
                  </button>
                  {onOpenNewTicketForClient && (
                    <button
                      className="btn btn-primary"
                      onClick={() => onOpenNewTicketForClient(selectedClient.id)}
                      style={{ fontSize: '12px', padding: '6px 12px', gap: '4px' }}
                    >
                      <Plus size={13} /> Criar Ticket
                    </button>
                  )}
                </div>
              </div>

              {clientTickets.length === 0 ? (
                <div style={emptyStateStyle}>
                  <LayoutDashboard size={28} style={{ opacity: 0.4 }} />
                  <p style={{ margin: '8px 0 0', fontSize: '13px' }}>Nenhum ticket vinculado a este cliente ainda.</p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setLinkModalType('ticket')}
                    style={{ marginTop: '12px', fontSize: '12px' }}
                  >
                    Vincular Ticket Existente
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {clientTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-card-app)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, cursor: 'pointer' }}
                        onClick={() => setPreviewTicket(ticket)}
                        title="Clique para visualizar o ticket"
                      >
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: ticket.source === 'JIRA' ? 'rgba(0,82,204,0.2)' : 'rgba(99,102,241,0.2)',
                            color: ticket.source === 'JIRA' ? '#60a5fa' : '#a5b4fc',
                          }}
                        >
                          {ticket.key || 'LOCAL'}
                        </span>
                        <strong style={{ fontSize: '13px', color: '#fff' }}>{ticket.title}</strong>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {ticket.statusLabel || ticket.status}
                        </span>

                        <button
                          type="button"
                          onClick={() => setPreviewTicket(ticket)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--accent-primary)',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="Visualizar Ticket"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleLinkItem('ticket', ticket.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="Desvincular do cliente"
                        >
                          <Unlink size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: ANOTAÇÕES & PASTAS ── */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                  Anotações e Documentos ({clientNotes.length})
                </h3>
                <button
                  className="btn btn-secondary"
                  onClick={() => setLinkModalType('note')}
                  style={{ fontSize: '12px', padding: '6px 12px', gap: '4px' }}
                >
                  <LinkIcon size={13} /> Vincular Anotação
                </button>
              </div>

              {clientNotes.length === 0 ? (
                <div style={emptyStateStyle}>
                  <FileText size={28} style={{ opacity: 0.4 }} />
                  <p style={{ margin: '8px 0 0', fontSize: '13px' }}>Nenhuma anotação vinculada a este cliente.</p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setLinkModalType('note')}
                    style={{ marginTop: '12px', fontSize: '12px' }}
                  >
                    Vincular Anotação Existente
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {clientNotes.map((note) => {
                    const handleNoteClick = async () => {
                      if (note.format === 'file' || note.originalFileName) {
                        (window as any).openFileViewer?.(note.filePath);
                      } else {
                        let content = note.content || '';
                        if (onReadNoteContent && note.filePath) {
                          try {
                            content = await onReadNoteContent(note.filePath);
                          } catch (e) {
                            console.error(e);
                          }
                        }
                        setPreviewNote({ note, content });
                      }
                    };

                    return (
                      <div
                        key={note.id}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--bg-card-app)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, cursor: 'pointer' }}
                          onClick={handleNoteClick}
                          title="Clique para visualizar o documento"
                        >
                          <FileText size={16} color="var(--accent-primary)" />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{note.title}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Atualizado em: {new Date(note.updatedAt).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={handleNoteClick}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--accent-primary)',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                            title="Visualizar Anotação"
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleLinkItem('note', note.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                            title="Desvincular do cliente"
                          >
                            <Unlink size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: REUNIÕES & AGENDA ── */}
          {activeTab === 'meetings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                  Reuniões e Compromissos da Agenda ({clientMeetings.length})
                </h3>
                <button
                  className="btn btn-secondary"
                  onClick={() => setLinkModalType('meeting')}
                  style={{ fontSize: '12px', padding: '6px 12px', gap: '4px' }}
                >
                  <LinkIcon size={13} /> Vincular Reunião da Agenda
                </button>
              </div>

              {clientMeetings.length === 0 ? (
                <div style={emptyStateStyle}>
                  <Calendar size={28} style={{ opacity: 0.4 }} />
                  <p style={{ margin: '8px 0 0', fontSize: '13px' }}>Nenhuma reunião da agenda associada a este cliente.</p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setLinkModalType('meeting')}
                    style={{ marginTop: '12px', fontSize: '12px' }}
                  >
                    Vincular Reunião
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {clientMeetings.map((evt) => (
                    <div
                      key={evt.id}
                      style={{
                        position: 'relative',
                        padding: '12px 16px 12px 18px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-card-app)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Faixa Colorida Lateral Dedicada */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '4px',
                          backgroundColor: evt.color || '#6366f1',
                          borderRadius: '10px 0 0 10px',
                        }}
                      />
                      <div
                        style={{ flex: 1, cursor: 'pointer' }}
                        onClick={() => setPreviewEvent(evt)}
                        title="Clique para visualizar detalhes da reunião"
                      >
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{evt.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={12} />
                          {new Date(evt.start).toLocaleString('pt-BR')} • {evt.calendarName || 'Agenda'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setPreviewEvent(evt)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--accent-primary)',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="Visualizar Reunião"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleLinkItem('event', evt.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="Desvincular da agenda do cliente"
                        >
                          <Unlink size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 5: LEMBRETES ── */}
          {activeTab === 'reminders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                  Lembretes e Alarmes ({clientReminders.length})
                </h3>
                <button
                  className="btn btn-secondary"
                  onClick={() => setLinkModalType('reminder')}
                  style={{ fontSize: '12px', padding: '6px 12px', gap: '4px' }}
                >
                  <LinkIcon size={13} /> Vincular Lembrete
                </button>
              </div>

              {clientReminders.length === 0 ? (
                <div style={emptyStateStyle}>
                  <Bell size={28} style={{ opacity: 0.4 }} />
                  <p style={{ margin: '8px 0 0', fontSize: '13px' }}>Nenhum lembrete vinculado a este cliente.</p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setLinkModalType('reminder')}
                    style={{ marginTop: '12px', fontSize: '12px' }}
                  >
                    Vincular Lembrete Existente
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {clientReminders.map((rem) => (
                    <div
                      key={rem.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-card-app)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{ flex: 1, cursor: 'pointer' }}
                        onClick={() => setPreviewReminder(rem)}
                        title="Clique para visualizar o lembrete"
                      >
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{rem.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {rem.message}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setPreviewReminder(rem)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--accent-primary)',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="Visualizar Lembrete"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleLinkItem('reminder', rem.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="Desvincular do cliente"
                        >
                          <Unlink size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Selecione ou cadastre um cliente à esquerda.
        </div>
      )}

      {/* ── Client Create / Edit Modal ── */}
      {isModalOpen && (
        <ClientModal
          isOpen={isModalOpen}
          clientToEdit={clientToEdit}
          jiraInstances={jiraInstances}
          onClose={() => {
            setIsModalOpen(false);
            setClientToEdit(null);
          }}
          onSave={onSaveClient}
        />
      )}

      {/* ── Link Resource Modal (Picker) ── */}
      {linkModalType && selectedClient && (
        <LinkItemPickerModal
          type={linkModalType}
          selectedClient={selectedClient}
          tickets={tickets}
          notes={notes}
          calendarEvents={calendarEvents}
          reminders={reminders}
          onToggleLink={handleToggleLinkItem}
          onClose={() => setLinkModalType(null)}
        />
      )}

      {/* ── Preview Modal: Ticket Detail Modal (Embutido sem redirecionamento) ── */}
      {previewTicket && (
        <TicketDetailModal
          ticket={previewTicket}
          allTickets={tickets}
          notes={notes}
          jiraInstances={jiraInstances}
          onClose={() => setPreviewTicket(null)}
          onUpdateStatus={onUpdateTicketStatus || (async () => {})}
          onDeleteTicket={onDeleteTicket || (async () => {})}
          onSaveTicket={onSaveTicket}
          onNavigateToNote={onNavigateToNote}
        />
      )}

      {/* ── Preview Modal: Anotação / Documento ── */}
      {previewNote && (
        <NotePreviewModal
          note={previewNote.note}
          content={previewNote.content}
          onClose={() => setPreviewNote(null)}
          onNavigateToNote={onNavigateToNote}
        />
      )}

      {/* ── Preview Modal: Reunião da Agenda ── */}
      {previewEvent && (
        <MeetingPreviewModal
          event={previewEvent}
          notes={notes}
          onOpenNote={handleNoteClick}
          onClose={() => setPreviewEvent(null)}
        />
      )}

      {/* ── Preview Modal: Lembrete ── */}
      {previewReminder && (
        <ReminderPreviewModal
          reminder={previewReminder}
          onClose={() => setPreviewReminder(null)}
        />
      )}
    </div>
  );
};

// ── Link Picker Modal Component ───────────────────────────
interface LinkItemPickerModalProps {
  type: 'ticket' | 'note' | 'folder' | 'meeting' | 'reminder';
  selectedClient: ClientAsset;
  tickets: Ticket[];
  notes: NoteItem[];
  calendarEvents: CalendarEvent[];
  reminders: Reminder[];
  onToggleLink: (type: 'ticket' | 'note' | 'folder' | 'event' | 'reminder', id: string) => Promise<void>;
  onClose: () => void;
}

const LinkItemPickerModal: React.FC<LinkItemPickerModalProps> = ({
  type,
  selectedClient,
  tickets,
  notes,
  calendarEvents,
  reminders,
  onToggleLink,
  onClose,
}) => {
  const [filter, setFilter] = useState('');
  const [calendarSourceFilter, setCalendarSourceFilter] = useState<'all' | 'outlook' | 'google'>('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState<'today' | 'tomorrow' | 'useful' | 'next30' | 'this_month' | 'past30' | 'all'>('useful');
  const [sortMode, setSortMode] = useState<'closest' | 'newest' | 'oldest'>('closest');

  const title =
    type === 'ticket'
      ? 'Vincular Tickets ao Cliente'
      : type === 'note'
      ? 'Vincular Anotações ao Cliente'
      : type === 'meeting'
      ? 'Vincular Reuniões da Agenda ao Cliente'
      : 'Vincular Lembretes ao Cliente';

  const items = useMemo(() => {
    const f = filter.toLowerCase().trim();
    const now = new Date();
    const nowMs = now.getTime();

    if (type === 'ticket') {
      return tickets
        .filter((t) => !f || t.title.toLowerCase().includes(f) || (t.key && t.key.toLowerCase().includes(f)))
        .map((t) => ({
          id: t.id,
          title: t.title,
          subtitle: `${t.key || 'LOCAL'} • ${t.statusLabel || t.status}`,
          isLinked: (selectedClient.linkedTicketIds || []).includes(t.id) || t.clientId === selectedClient.id,
          badge: null as { text: string; bg: string; color: string } | null,
          timeTag: null as string | null,
        }));
    } else if (type === 'note') {
      return notes
        .filter((n) => !f || n.title.toLowerCase().includes(f))
        .map((n) => ({
          id: n.id,
          title: n.title,
          subtitle: `Atualizado em: ${new Date(n.updatedAt).toLocaleDateString('pt-BR')}`,
          isLinked: (selectedClient.linkedNoteIds || []).includes(n.id) || n.clientId === selectedClient.id,
          badge: null as { text: string; bg: string; color: string } | null,
          timeTag: null as string | null,
        }));
    } else if (type === 'meeting') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const next30Ms = todayStart + 30 * 24 * 60 * 60 * 1000;
      const next60Ms = todayStart + 60 * 24 * 60 * 60 * 1000;
      const past15Ms = todayStart - 15 * 24 * 60 * 60 * 1000;
      const past30Ms = todayStart - 30 * 24 * 60 * 60 * 1000;

      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();

      // 1. Filtragem por Fonte e Texto
      const filtered = calendarEvents.filter((e) => {
        if (!e || !e.start || !e.title) return false;
        if (f && !e.title.toLowerCase().includes(f) && !(e.location || '').toLowerCase().includes(f)) {
          return false;
        }

        const calId = (e.calendarId || '').toLowerCase();
        const calName = (e.calendarName || '').toLowerCase();
        const loc = (e.location || '').toLowerCase();
        const rawId = (e.id || '').toLowerCase();

        const isGoogle =
          calId === 'google' ||
          calName.includes('google') ||
          calName.includes('gmail') ||
          loc.includes('meet.google.com') ||
          rawId.includes('@google.com');

        const isOutlook =
          !isGoogle &&
          (calId === 'outlook' ||
            calName.includes('outlook') ||
            calName.includes('microsoft') ||
            loc.includes('teams.microsoft.com') ||
            rawId.includes('@outlook.com') ||
            true);

        if (calendarSourceFilter === 'google' && !isGoogle) return false;
        if (calendarSourceFilter === 'outlook' && (isGoogle || !isOutlook)) return false;

        // 2. Filtragem Temporal
        const evtTime = new Date(e.start).getTime();
        if (isNaN(evtTime)) return false;

        const d = new Date(e.start);
        const eventDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const dayDiff = Math.round((eventDayStart - todayStart) / (24 * 60 * 60 * 1000));

        if (timeRangeFilter === 'today') {
          return dayDiff === 0;
        } else if (timeRangeFilter === 'tomorrow') {
          return dayDiff === 1;
        } else if (timeRangeFilter === 'useful') {
          // Últimos 15 dias até próximos 60 dias (foco útil do cotidiano)
          return evtTime >= past15Ms && evtTime <= next60Ms;
        } else if (timeRangeFilter === 'next30') {
          // Próximos 30 dias a partir de hoje
          return evtTime >= todayStart && evtTime <= next30Ms;
        } else if (timeRangeFilter === 'this_month') {
          return evtTime >= firstDayOfMonth && evtTime <= lastDayOfMonth;
        } else if (timeRangeFilter === 'past30') {
          return evtTime >= past30Ms && evtTime <= nowMs;
        }

        return true; // 'all'
      });

      // 3. Ordenação: do mais próximo (Hoje -> Amanhã -> Futuro) até o mais distante
      filtered.sort((a, b) => {
        const timeA = new Date(a.start).getTime();
        const timeB = new Date(b.start).getTime();
        if (sortMode === 'closest') {
          const isAFutureOrToday = timeA >= todayStart;
          const isBFutureOrToday = timeB >= todayStart;
          if (isAFutureOrToday && isBFutureOrToday) {
            return timeA - timeB; // Cronológico crescente a partir de hoje (09:30 -> 11:00 -> 15:30 -> amanhã...)
          }
          if (isAFutureOrToday && !isBFutureOrToday) return -1;
          if (!isAFutureOrToday && isBFutureOrToday) return 1;
          return timeB - timeA; // Se ambos forem passados, o mais recente primeiro
        } else if (sortMode === 'newest') {
          return timeB - timeA;
        } else {
          return timeA - timeB;
        }
      });

      return filtered.map((e) => {
        const calId = (e.calendarId || '').toLowerCase();
        const calName = (e.calendarName || '').toLowerCase();
        const loc = (e.location || '').toLowerCase();
        const rawId = (e.id || '').toLowerCase();

        const isGoogle =
          calId === 'google' ||
          calName.includes('google') ||
          calName.includes('gmail') ||
          loc.includes('meet.google.com') ||
          rawId.includes('@google.com');

        const badge = isGoogle
          ? { text: 'Google Meet', bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }
          : { text: 'Outlook / Teams', bg: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8' };

        const d = new Date(e.start);
        const eventDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const dayDiff = Math.round((eventDayStart - todayStart) / (24 * 60 * 60 * 1000));
        let timeTag = '';
        if (dayDiff === 0) timeTag = 'Hoje';
        else if (dayDiff === 1) timeTag = 'Amanhã';
        else if (dayDiff === -1) timeTag = 'Ontem';
        else if (dayDiff > 1) timeTag = `Em ${dayDiff} dias`;
        else timeTag = `Há ${Math.abs(dayDiff)} dias`;

        const formattedDate = !isNaN(d.getTime())
          ? `${d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
          : e.start;

        return {
          id: e.id,
          title: e.title,
          subtitle: `${formattedDate}${e.location ? ` • 📍 ${e.location}` : ''}`,
          isLinked: (selectedClient.linkedEventIds || []).includes(e.id) || e.clientId === selectedClient.id,
          badge,
          timeTag,
        };
      });
    } else {
      return reminders
        .filter((r) => !f || r.title.toLowerCase().includes(f) || r.message.toLowerCase().includes(f))
        .map((r) => ({
          id: r.id,
          title: r.title,
          subtitle: r.message,
          isLinked: (selectedClient.linkedReminderIds || []).includes(r.id) || r.clientId === selectedClient.id,
          badge: null as { text: string; bg: string; color: string } | null,
          timeTag: null as string | null,
        }));
    }
  }, [type, filter, calendarSourceFilter, timeRangeFilter, sortMode, tickets, notes, calendarEvents, reminders, selectedClient]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(5px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          backgroundColor: 'var(--bg-card-app)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong style={{ fontSize: '15px', color: '#fff' }}>{title}</strong>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                color: 'var(--text-secondary)',
              }}
            >
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* ── Filtros Avançados para Reuniões ── */}
        {type === 'meeting' && (
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* 1. Provedor de Agenda */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Agenda:</span>
                <button
                  type="button"
                  onClick={() => setCalendarSourceFilter('all')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: calendarSourceFilter === 'all' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.04)',
                    color: calendarSourceFilter === 'all' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarSourceFilter('outlook')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: calendarSourceFilter === 'outlook' ? '#0284c7' : 'rgba(255,255,255,0.04)',
                    color: calendarSourceFilter === 'outlook' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  🏢 Outlook / Teams
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarSourceFilter('google')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: calendarSourceFilter === 'google' ? '#059669' : 'rgba(255,255,255,0.04)',
                    color: calendarSourceFilter === 'google' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  🟢 Google Meet
                </button>
              </div>

              {/* 2. Ordenação */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ordem:</span>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as any)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="closest" style={{ backgroundColor: '#1e1e2e' }}>⚡ Do Mais Próximo ao Mais Distante (Hoje ➔ Futuro)</option>
                  <option value="newest" style={{ backgroundColor: '#1e1e2e' }}>🔽 Futuras / Recentes Primeiro</option>
                  <option value="oldest" style={{ backgroundColor: '#1e1e2e' }}>🔼 Antigas Primeiro</option>
                </select>
              </div>
            </div>

            {/* 3. Filtro de Período Temporal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Período:</span>
              {[
                { id: 'today', label: '🔴 Hoje' },
                { id: 'tomorrow', label: '🟡 Amanhã' },
                { id: 'useful', label: '⚡ Recentes & Próximas' },
                { id: 'next30', label: '📅 Próximos 30 dias' },
                { id: 'this_month', label: '🗓️ Este Mês' },
                { id: 'past30', label: '⏪ Últimos 30 dias' },
                { id: 'all', label: '🌐 Todo o Histórico' },
              ].map((p) => {
                const isSelected = timeRangeFilter === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTimeRangeFilter(p.id as any)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '5px',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)',
                      fontSize: '10.5px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.02)',
                      color: isSelected ? '#a5b4fc' : 'var(--text-secondary)',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input de Busca Textual */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <input
            type="text"
            className="input-field"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={type === 'meeting' ? 'Buscar reuniões por título, assunto ou link...' : 'Filtrar itens...'}
            style={{ fontSize: '12px', width: '100%' }}
          />
        </div>

        {/* Lista de Itens */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)', fontSize: '12px' }}>
              <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Nenhum item encontrado no período/filtro selecionado.
              </p>
              {type === 'meeting' && timeRangeFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setTimeRangeFilter('all')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    fontSize: '11px',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  Ver todo o histórico de reuniões
                </button>
              )}
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => onToggleLink(type === 'meeting' ? 'event' : type, item.id)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: item.isLinked ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: item.isLinked ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: item.badge.bg,
                          color: item.badge.color,
                          flexShrink: 0,
                        }}
                      >
                        {item.badge.text}
                      </span>
                    )}
                    {item.timeTag && (
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: item.timeTag.includes('Hoje')
                            ? 'rgba(239, 68, 68, 0.25)'
                            : item.timeTag.includes('Amanhã') || item.timeTag.includes('Em')
                            ? 'rgba(99, 102, 241, 0.2)'
                            : 'rgba(255, 255, 255, 0.06)',
                          color: item.timeTag.includes('Hoje')
                            ? '#f87171'
                            : item.timeTag.includes('Amanhã') || item.timeTag.includes('Em')
                            ? '#a5b4fc'
                            : 'var(--text-muted)',
                          flexShrink: 0,
                        }}
                      >
                        {item.timeTag}
                      </span>
                    )}
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.subtitle}
                  </div>
                </div>

                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '6px',
                    border: item.isLinked ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    backgroundColor: item.isLinked ? 'var(--accent-primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {item.isLinked && <Check size={14} />}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={onClose} style={{ fontSize: '12px', padding: '6px 18px' }}>
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};

const statCardStyle: React.CSSProperties = {
  padding: '16px',
  borderRadius: '12px',
  backgroundColor: 'var(--bg-card-app)',
  border: '1px solid var(--border-subtle)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

const emptyStateStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px 20px',
  borderRadius: '12px',
  backgroundColor: 'rgba(255,255,255,0.02)',
  border: '1px dashed var(--border-subtle)',
  color: 'var(--text-muted)',
};

const jumpPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '5px 12px',
  borderRadius: '14px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid var(--border-subtle)',
  backgroundColor: 'var(--bg-card-app)',
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s ease',
};

// ── Note Preview Modal Component ──────────────────────────
interface NotePreviewModalProps {
  note: NoteItem;
  content: string;
  onClose: () => void;
  onNavigateToNote?: (noteId: string) => void;
}

const NotePreviewModal: React.FC<NotePreviewModalProps> = ({ note, content, onClose, onNavigateToNote }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMarkdown = note.format === 'markdown' || (!note.format && note.title.endsWith('.md'));

  const parsedHtml = useMemo(() => {
    if (isMarkdown) {
      try {
        return marked.parse(content || '');
      } catch (e) {
        return content;
      }
    }
    return content;
  }, [content, isMarkdown]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '800px',
          backgroundColor: 'var(--bg-card-app)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(167, 139, 250, 0.2)',
                border: '1px solid rgba(167, 139, 250, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a78bfa',
                flexShrink: 0,
              }}
            >
              <FileText size={18} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {note.title}
                </h2>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(167, 139, 250, 0.15)',
                    color: '#a78bfa',
                    flexShrink: 0,
                  }}
                >
                  {isMarkdown ? 'MARKDOWN' : 'RICH TEXT'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Atualizado em: {new Date(note.updatedAt).toLocaleString('pt-BR')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {onNavigateToNote && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToNote(note.id);
                }}
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '6px 12px', gap: '6px', backgroundColor: '#6366f1' }}
                title="Abrir no Editor de Anotações"
              >
                <ExternalLink size={14} /> Ir para Anotação
              </button>
            )}
            <button
              onClick={handleCopy}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px', gap: '4px' }}
            >
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Note Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            color: '#e2e8f0',
            fontSize: '14px',
            lineHeight: 1.7,
            backgroundColor: 'rgba(0,0,0,0.15)',
          }}
        >
          {isMarkdown ? (
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: parsedHtml as string }}
            />
          ) : (
            <div
              dangerouslySetInnerHTML={{ __html: parsedHtml as string }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ── Meeting Preview Modal Component ───────────────────────
interface MeetingPreviewModalProps {
  event: CalendarEvent;
  notes?: NoteItem[];
  onOpenNote?: (note: NoteItem) => void;
  onClose: () => void;
}

const MeetingPreviewModal: React.FC<MeetingPreviewModalProps> = ({
  event,
  notes = [],
  onOpenNote,
  onClose,
}) => {
  const startDate = new Date(event.start);
  const endDate = event.end ? new Date(event.end) : null;

  const linkedNoteIds = event.linkedNoteIds || [];
  const linkedNotes = useMemo(() => {
    return notes.filter((n) => linkedNoteIds.includes(n.id));
  }, [notes, linkedNoteIds]);

  const dateStr = !isNaN(startDate.getTime())
    ? startDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : event.start;

  const timeStr = !isNaN(startDate.getTime())
    ? `${startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${
        endDate && !isNaN(endDate.getTime()) ? ` - ${endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''
      }`
    : '';

  const isMeetingLink =
    event.location &&
    (event.location.includes('teams.microsoft.com') ||
      event.location.includes('meet.google.com') ||
      event.location.includes('zoom.us') ||
      event.location.startsWith('http'));

  const handleOpenLink = () => {
    if (event.location && (window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(event.location);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '650px',
          backgroundColor: 'var(--bg-card-app)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          borderTop: `4px solid ${event.color || '#34d399'}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: `${event.color || '#34d399'}25`,
                border: `1px solid ${event.color || '#34d399'}50`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: event.color || '#34d399',
                flexShrink: 0,
              }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                {event.title}
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} />
                <span>{dateStr}</span>
                {timeStr && <strong>• {timeStr}</strong>}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Meeting Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Calendar Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Calendário:
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 10px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                color: '#fff',
              }}
            >
              {event.calendarName || 'Agenda Principal'}
            </span>
          </div>

          {/* Location / Videoconference Link */}
          {event.location && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                {isMeetingLink ? <Video size={16} color="#34d399" /> : <MapPin size={16} color="var(--accent-primary)" />}
                <span style={{ fontSize: '13px', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {event.location}
                </span>
              </div>

              {isMeetingLink && (
                <button
                  onClick={handleOpenLink}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 12px', gap: '4px', flexShrink: 0 }}
                >
                  <ExternalLink size={13} /> Entrar na Reunião
                </button>
              )}
            </div>
          )}

          {/* Description */}
          {event.description ? (
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Pauta / Descrição:
              </span>
              <div
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {event.description}
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              Nenhuma descrição detalhada informada para esta reunião.
            </p>
          )}

          {/* ── Linked Notes & Documents in Meeting Preview ── */}
          {linkedNotes.length > 0 && (
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Anotações & Documentos Vinculados ({linkedNotes.length}):
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {linkedNotes.map((note) => {
                  const isFile =
                    note.format === 'file' ||
                    ['pdf', 'docx', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'webp'].includes(
                      ((note.filePath || note.title || '').split('.').pop() || '').toLowerCase()
                    );
                  const ext = (note.title.split('.').pop() || 'NOTA').toUpperCase();

                  return (
                    <div
                      key={note.id}
                      onClick={() => onOpenNote && onOpenNote(note)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: isFile ? 'rgba(245, 158, 11, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                            color: isFile ? '#fbbf24' : '#c084fc',
                            flexShrink: 0,
                          }}
                        >
                          {isFile ? ext : 'NOTA'}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {note.title}
                        </span>
                      </div>
                      <Eye size={14} color="var(--accent-primary)" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Reminder Preview Modal Component ──────────────────────
interface ReminderPreviewModalProps {
  reminder: Reminder;
  onClose: () => void;
}

const ReminderPreviewModal: React.FC<ReminderPreviewModalProps> = ({ reminder, onClose }) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '550px',
          backgroundColor: 'var(--bg-card-app)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          borderTop: '4px solid #fbbf24',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(251, 191, 36, 0.2)',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
                flexShrink: 0,
              }}
            >
              <Bell size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#fff' }}>
                {reminder.title}
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Tipo: {reminder.recurrence === 'DAILY' ? 'Diário' : reminder.recurrence === 'INTERVAL' ? `A cada ${reminder.intervalMinutes} minutos` : 'Disparo Único'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Mensagem do Alarme:
            </span>
            <div
              style={{
                padding: '14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-subtle)',
                fontSize: '14px',
                color: '#fff',
                lineHeight: 1.5,
              }}
            >
              {reminder.message || 'Sem mensagem cadastrada.'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Horário Programado</span>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24', marginTop: '2px' }}>
                {reminder.scheduledTime || 'Sem horário fixo'}
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Status do Alarme</span>
              <div style={{ fontSize: '14px', fontWeight: 700, color: reminder.isActive !== false ? '#10b981' : '#94a3b8', marginTop: '2px' }}>
                {reminder.isActive !== false ? '● Ativo' : '○ Pausado'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
