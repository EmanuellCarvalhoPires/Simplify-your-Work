import React, { useState, useEffect } from 'react';
import type { Ticket, Reminder, NoteItem } from '../../types/index';
import {
  GripVertical,
  LayoutDashboard,
  Bell,
  FileText,
  Clock,
  AlertCircle,
  Tag,
  MessageSquare,
  Send,
  Sparkles,
  Plus,
  Table as TableIcon,
  LayoutGrid,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

export type HubItemType = 'ticket' | 'reminder' | 'note';

export interface HubItem {
  id: string;
  type: HubItemType;
  data: Ticket | Reminder | NoteItem;
}

interface UnifiedHubProps {
  tickets: Ticket[];
  reminders: Reminder[];
  notes: NoteItem[];
  onSelectTab: (tab: any) => void;
  onCardClickTicket: (ticket: Ticket) => void;
  onTestReminder: (reminder: Reminder) => void;
  onCardClickNote: (note: NoteItem) => void;
}

export const UnifiedHub: React.FC<UnifiedHubProps> = ({
  tickets,
  reminders,
  notes,
  onSelectTab,
  onCardClickTicket,
  onTestReminder,
  onCardClickNote,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'ticket' | 'reminder' | 'note'>('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [items, setItems] = useState<HubItem[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Sync and order items
  useEffect(() => {
    // 1. Build raw items array
    const rawItems: HubItem[] = [
      ...tickets.map((t) => ({ id: t.id, type: 'ticket' as HubItemType, data: t })),
      ...reminders.map((r) => ({ id: r.id, type: 'reminder' as HubItemType, data: r })),
      ...notes.map((n) => ({ id: n.id, type: 'note' as HubItemType, data: n })),
    ];

    // 2. Load saved order from localStorage
    try {
      const savedOrderRaw = localStorage.getItem('simplify_hub_order');
      if (savedOrderRaw) {
        const savedOrderIds: string[] = JSON.parse(savedOrderRaw);
        rawItems.sort((a, b) => {
          const indexA = savedOrderIds.indexOf(a.id);
          const indexB = savedOrderIds.indexOf(b.id);
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
      }
    } catch (e) {
      console.error('Erro ao ler ordem do Hub:', e);
    }

    setItems(rawItems);
  }, [tickets, reminders, notes]);

  // Save order whenever items change
  const saveOrder = (newItems: HubItem[]) => {
    setItems(newItems);
    try {
      const orderIds = newItems.map((item) => item.id);
      localStorage.setItem('simplify_hub_order', JSON.stringify(orderIds));
    } catch (e) {
      console.error('Erro ao salvar ordem do Hub:', e);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const updated = [...items];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);

    setDraggedIndex(null);
    saveOrder(updated);
  };

  const filteredItems = items.filter((item) => {
    if (filterType === 'ALL') return true;
    return item.type === filterType;
  });

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'None';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Banner */}
      <div style={styles.topBar}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={24} color="var(--accent-primary)" />
            <h1 style={styles.heading}>Meu Hub - Central Tudo-em-Um</h1>
          </div>
          <p style={styles.subheading}>
            Todos os seus Tickets, Lembretes do Windows e Anotações reunidos em um só lugar com visualizações flexíveis.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Category Filter Pills */}
          <div style={styles.filterPills}>
            <button
              style={{ ...styles.filterBtn, ...(filterType === 'ALL' ? styles.activeFilter : {}) }}
              onClick={() => setFilterType('ALL')}
            >
              Todos ({items.length})
            </button>
            <button
              style={{ ...styles.filterBtn, ...(filterType === 'ticket' ? styles.activeFilter : {}) }}
              onClick={() => setFilterType('ticket')}
            >
              <LayoutDashboard size={14} /> Tickets ({tickets.length})
            </button>
            <button
              style={{ ...styles.filterBtn, ...(filterType === 'reminder' ? styles.activeFilter : {}) }}
              onClick={() => setFilterType('reminder')}
            >
              <Bell size={14} /> Lembretes ({reminders.length})
            </button>
            <button
              style={{ ...styles.filterBtn, ...(filterType === 'note' ? styles.activeFilter : {}) }}
              onClick={() => setFilterType('note')}
            >
              <FileText size={14} /> Anotações ({notes.length})
            </button>
          </div>

          {/* View Mode Toggle Switcher */}
          <div style={styles.viewToggleGroup}>
            <button
              style={{
                ...styles.toggleBtn,
                ...(viewMode === 'CARDS' ? styles.activeToggleBtn : {}),
              }}
              onClick={() => setViewMode('CARDS')}
            >
              <LayoutGrid size={14} /> Cards
            </button>
            <button
              style={{
                ...styles.toggleBtn,
                ...(viewMode === 'TABLE' ? styles.activeToggleBtn : {}),
              }}
              onClick={() => setViewMode('TABLE')}
            >
              <TableIcon size={14} /> Tabela
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'CARDS' ? (
        <>
          <div style={styles.dragHint}>
            <GripVertical size={16} color="var(--accent-primary)" />
            <span>💡 <b>Dica de Ordenação Livre:</b> Clique, segure e arraste qualquer card para organizar a sua tela do jeito que quiser!</span>
          </div>

          {/* Grid of Draggable Cards */}
          <div style={styles.grid}>
            {filteredItems.length === 0 ? (
              <div style={styles.emptyCard}>
                <Sparkles size={48} color="var(--text-muted)" />
                <h3 style={{ marginTop: '16px', fontSize: '17px', color: 'var(--text-primary)' }}>
                  Nenhum item cadastrado no seu Hub
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Crie tickets, configure lembretes ou escreva anotações para visualizar tudo de forma unificada aqui.
                </p>
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const isDraggingThis = draggedIndex === index;

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    style={{
                      ...styles.cardWrapper,
                      opacity: isDraggingThis ? 0.4 : 1,
                      transform: isDraggingThis ? 'scale(0.97)' : 'none',
                    }}
                  >
                    {/* Render Item by Type */}
                    {item.type === 'ticket' && (
                      <TicketHubCard
                        ticket={item.data as Ticket}
                        onCardClick={onCardClickTicket}
                      />
                    )}

                    {item.type === 'reminder' && (
                      <ReminderHubCard
                        reminder={item.data as Reminder}
                        onTestReminder={onTestReminder}
                        onEditClick={() => onSelectTab('reminders')}
                      />
                    )}

                    {item.type === 'note' && (
                      <NoteHubCard
                        note={item.data as NoteItem}
                        onCardClick={onCardClickNote}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* Modern Data Table View Mode for Meu Hub */
        <div style={styles.tableHubContainer}>
          {/* 1. Tickets Data Table */}
          {(filterType === 'ALL' || filterType === 'ticket') && (
            <div style={styles.sectionTableBox}>
              <div style={styles.sectionTableHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <LayoutDashboard size={18} color="#38bdf8" />
                  <h3 style={styles.sectionTitle}>Tickets ({tickets.length})</h3>
                </div>
                <button style={styles.linkTabBtn} onClick={() => onSelectTab('tickets')}>
                  Ver Quadro Completo <ExternalLink size={13} />
                </button>
              </div>
              <div style={styles.tableScrollBox}>
                <table style={styles.dataTable}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.thCell, width: '100px' }}>Origem</th>
                      <th style={{ ...styles.thCell, width: '120px' }}>Chave</th>
                      <th style={styles.thCell}>Título do Ticket</th>
                      <th style={{ ...styles.thCell, width: '140px' }}>Status</th>
                      <th style={{ ...styles.thCell, width: '120px' }}>Prioridade</th>
                      <th style={{ ...styles.thCell, width: '160px' }}>Responsável</th>
                      <th style={{ ...styles.thCell, width: '150px' }}>Atualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          Nenhum ticket cadastrado.
                        </td>
                      </tr>
                    ) : (
                      tickets.map((t) => (
                        <tr key={t.id} style={styles.tableRow} onClick={() => onCardClickTicket(t)}>
                          <td style={styles.tdCell}>
                            {t.source === 'JIRA' ? (
                              <span style={styles.jiraTag}>JIRA</span>
                            ) : (
                              <span style={styles.appTag}>LOCAL</span>
                            )}
                          </td>
                          <td style={{ ...styles.tdCell, fontFamily: 'JetBrains Mono, monospace', fontWeight: '700', color: '#38bdf8' }}>
                            {t.key || '-'}
                          </td>
                          <td style={{ ...styles.tdCell, fontWeight: '600', color: '#ffffff' }}>{t.title}</td>
                          <td style={styles.tdCell}>
                            <span style={styles.statusPill}>{t.statusLabel || t.status}</span>
                          </td>
                          <td style={{ ...styles.tdCell, color: 'var(--text-secondary)' }}>{t.priority || 'Normal'}</td>
                          <td style={{ ...styles.tdCell, color: '#ffffff' }}>{t.assignee || 'Eu'}</td>
                          <td style={{ ...styles.tdCell, color: 'var(--text-muted)' }}>{formatDate(t.updatedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. Reminders Data Table */}
          {(filterType === 'ALL' || filterType === 'reminder') && (
            <div style={styles.sectionTableBox}>
              <div style={styles.sectionTableHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bell size={18} color="#f59e0b" />
                  <h3 style={styles.sectionTitle}>Lembretes ({reminders.length})</h3>
                </div>
                <button style={styles.linkTabBtn} onClick={() => onSelectTab('reminders')}>
                  Gerenciar Lembretes <ExternalLink size={13} />
                </button>
              </div>
              <div style={styles.tableScrollBox}>
                <table style={styles.dataTable}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.thCell, width: '90px' }}>Status</th>
                      <th style={styles.thCell}>Título do Lembrete</th>
                      <th style={styles.thCell}>Mensagem</th>
                      <th style={{ ...styles.thCell, width: '140px' }}>Recorrência</th>
                      <th style={{ ...styles.thCell, width: '160px' }}>Horário / Frequência</th>
                      <th style={{ ...styles.thCell, width: '110px', textAlign: 'center' }}>Testar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reminders.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          Nenhum lembrete cadastrado.
                        </td>
                      </tr>
                    ) : (
                      reminders.map((r) => (
                        <tr key={r.id} style={styles.tableRow}>
                          <td style={styles.tdCell}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                padding: '3px 8px',
                                borderRadius: '5px',
                                backgroundColor: r.enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                                color: r.enabled ? '#10b981' : '#94a3b8',
                                border: r.enabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(148, 163, 184, 0.3)',
                              }}
                            >
                              {r.enabled ? 'Ativo' : 'Pausado'}
                            </span>
                          </td>
                          <td style={{ ...styles.tdCell, fontWeight: '600', color: '#ffffff' }}>{r.title}</td>
                          <td style={{ ...styles.tdCell, color: 'var(--text-secondary)' }}>{r.message}</td>
                          <td style={styles.tdCell}>
                            <span style={styles.labelChip}>
                              {r.recurrence === 'ONCE' ? 'Execução Única' : r.recurrence === 'DAILY' ? 'Diário' : 'Intervalo'}
                            </span>
                          </td>
                          <td style={{ ...styles.tdCell, color: '#38bdf8', fontWeight: '600' }}>
                            {r.recurrence === 'INTERVAL'
                              ? `A cada ${r.intervalMinutes || 45} min`
                              : r.scheduledTime || '14:00'}
                          </td>
                          <td style={{ ...styles.tdCell, textAlign: 'center' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                              onClick={() => onTestReminder(r)}
                            >
                              Notificar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Notes Data Table */}
          {(filterType === 'ALL' || filterType === 'note') && (
            <div style={styles.sectionTableBox}>
              <div style={styles.sectionTableHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={18} color="#c084fc" />
                  <h3 style={styles.sectionTitle}>Anotações Markdown ({notes.length})</h3>
                </div>
                <button style={styles.linkTabBtn} onClick={() => onSelectTab('notes')}>
                  Abrir Bloco de Notas <ExternalLink size={13} />
                </button>
              </div>
              <div style={styles.tableScrollBox}>
                <table style={styles.dataTable}>
                  <thead>
                    <tr>
                      <th style={styles.thCell}>Título da Nota</th>
                      <th style={styles.thCell}>Caminho do Arquivo</th>
                      <th style={{ ...styles.thCell, width: '160px' }}>Modificado</th>
                      <th style={{ ...styles.thCell, width: '100px', textAlign: 'center' }}>Abrir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notes.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          Nenhuma anotação criada.
                        </td>
                      </tr>
                    ) : (
                      notes.map((n) => (
                        <tr key={n.id} style={styles.tableRow} onClick={() => onCardClickNote(n)}>
                          <td style={{ ...styles.tdCell, fontWeight: '600', color: '#ffffff' }}>📝 {n.title}</td>
                          <td style={{ ...styles.tdCell, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                            {n.filePath}
                          </td>
                          <td style={{ ...styles.tdCell, color: 'var(--text-secondary)' }}>{formatDate(n.updatedAt)}</td>
                          <td style={{ ...styles.tdCell, textAlign: 'center' }}>
                            <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                              Abrir
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// === SUB-COMPONENTS FOR CARDS VIEW ===
const TicketHubCard: React.FC<{ ticket: Ticket; onCardClick: (t: Ticket) => void }> = ({ ticket, onCardClick }) => {
  const isJira = ticket.source === 'JIRA';
  return (
    <div
      style={{ ...styles.hubCard, borderLeft: `5px solid ${isJira ? '#38bdf8' : '#8b5cf6'}` }}
      onClick={() => onCardClick(ticket)}
    >
      <div style={styles.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isJira ? (
            <img src="./assets/jira-badge.png" alt="Jira" style={{ width: '18px', height: '18px' }} />
          ) : (
            <img src="./assets/app-badge.png" alt="App" style={{ width: '18px', height: '18px' }} />
          )}
          <span style={styles.cardTag}>{isJira ? 'Jira Ticket' : 'Ticket Local'}</span>
        </div>
        {ticket.key && <span style={styles.keyTag}>{ticket.key}</span>}
      </div>
      <h3 style={styles.cardTitle}>{ticket.title}</h3>
      <p style={styles.cardSnippet}>
        {ticket.description
          ? ticket.description.slice(0, 100) + (ticket.description.length > 100 ? '...' : '')
          : 'Sem descrição fornecida.'}
      </p>
      <div style={styles.cardFooter}>
        <span style={styles.statusPill}>{ticket.statusLabel || ticket.status}</span>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{ticket.assignee || 'Eu'}</span>
      </div>
    </div>
  );
};

const ReminderHubCard: React.FC<{
  reminder: Reminder;
  onTestReminder: (r: Reminder) => void;
  onEditClick: () => void;
}> = ({ reminder, onTestReminder, onEditClick }) => {
  return (
    <div style={{ ...styles.hubCard, borderLeft: '5px solid #f59e0b' }}>
      <div style={styles.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={18} color="#f59e0b" />
          <span style={styles.cardTag}>Lembrete do Windows</span>
        </div>
        <button
          className="btn btn-secondary"
          style={{ padding: '2px 8px', fontSize: '11px' }}
          onClick={(e) => {
            e.stopPropagation();
            onTestReminder(reminder);
          }}
        >
          Notificar
        </button>
      </div>
      <h3 style={styles.cardTitle}>{reminder.title}</h3>
      <p style={styles.cardSnippet}>{reminder.message}</p>
      <div style={styles.cardFooter}>
        <span style={styles.labelChip}>
          {reminder.recurrence === 'INTERVAL'
            ? `A cada ${reminder.intervalMinutes || 45} min`
            : `Às ${reminder.scheduledTime || '14:00'}`}
        </span>
        <span
          style={{
            fontSize: '11px',
            color: reminder.enabled ? '#10b981' : '#94a3b8',
            fontWeight: '700',
          }}
        >
          {reminder.enabled ? '● Ativo' : '○ Pausado'}
        </span>
      </div>
    </div>
  );
};

const NoteHubCard: React.FC<{ note: NoteItem; onCardClick: (n: NoteItem) => void }> = ({ note, onCardClick }) => {
  return (
    <div style={{ ...styles.hubCard, borderLeft: '5px solid #c084fc' }} onClick={() => onCardClick(note)}>
      <div style={styles.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color="#c084fc" />
          <span style={styles.cardTag}>Anotação Markdown</span>
        </div>
      </div>
      <h3 style={styles.cardTitle}>📝 {note.title}</h3>
      <p style={{ ...styles.cardSnippet, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
        {note.filePath}
      </p>
      <div style={styles.cardFooter}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Atualizado {new Date(note.updatedAt).toLocaleDateString('pt-BR')}
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    height: '100%',
    overflowY: 'auto',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#ffffff',
    margin: 0,
  },
  subheading: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  filterPills: {
    display: 'flex',
    gap: '6px',
  },
  filterBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border-subtle)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  activeFilter: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    color: '#818cf8',
    border: '1px solid rgba(99, 102, 241, 0.4)',
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
  dragHint: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '10px',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    color: 'var(--text-primary)',
    fontSize: '13px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
  cardWrapper: {
    cursor: 'grab',
    transition: 'transform 0.2s ease',
  },
  hubCard: {
    backgroundColor: 'var(--bg-sidebar)',
    borderRadius: '14px',
    padding: '18px',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTag: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
  },
  keyTag: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '12px',
    fontWeight: '700',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
    lineHeight: '1.3',
  },
  cardSnippet: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    margin: 0,
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: '8px',
  },
  statusPill: {
    fontSize: '11px',
    fontWeight: '700',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    padding: '3px 8px',
    borderRadius: '5px',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  labelChip: {
    fontSize: '11px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#e2e8f0',
    padding: '3px 8px',
    borderRadius: '5px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  emptyCard: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: '16px',
    border: '1px dashed var(--border-subtle)',
  },
  tableHubContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
  },
  sectionTableBox: {
    backgroundColor: '#13131a',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
  },
  sectionTableHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
  },
  linkTabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--accent-blue)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  tableScrollBox: {
    overflowX: 'auto',
  },
  dataTable: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '13px',
  },
  thCell: {
    padding: '14px 18px',
    backgroundColor: 'rgba(22, 22, 30, 0.95)',
    color: '#94a3b8',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  tdCell: {
    padding: '14px 18px',
    verticalAlign: 'middle',
  },
  tableRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    height: '54px',
  },
  jiraTag: {
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    color: '#38bdf8',
    fontSize: '11px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '5px',
    border: '1px solid rgba(56, 189, 248, 0.3)',
  },
  appTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    color: '#c084fc',
    fontSize: '11px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '5px',
    border: '1px solid rgba(192, 132, 252, 0.3)',
  },
};
