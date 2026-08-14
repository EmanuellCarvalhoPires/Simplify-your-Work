import React, { useState } from 'react';
import type { Reminder, ReminderRecurrence } from '../../types/index';
import { Bell, Plus, Clock, Trash2, CheckCircle2, X, Send } from 'lucide-react';

interface ReminderManagerProps {
  reminders: Reminder[];
  onSaveReminder: (reminder: Partial<Reminder>) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
}

export const ReminderManager: React.FC<ReminderManagerProps> = ({
  reminders,
  onSaveReminder,
  onDeleteReminder,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>('INTERVAL');
  const [intervalMinutes, setIntervalMinutes] = useState(45);
  const [scheduledTime, setScheduledTime] = useState('14:00');
  const [loading, setLoading] = useState(false);

  const handleOpenAddModal = () => {
    setEditingReminder(null);
    setTitle('');
    setMessage('Hora de fazer uma pausa, beber água e se alongar!');
    setRecurrence('INTERVAL');
    setIntervalMinutes(45);
    setScheduledTime('14:00');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (r: Reminder) => {
    setEditingReminder(r);
    setTitle(r.title);
    setMessage(r.message);
    setRecurrence(r.recurrence);
    setIntervalMinutes(r.intervalMinutes || 45);
    setScheduledTime(r.scheduledTime || '14:00');
    setIsModalOpen(true);
  };

  const handleTestNotification = async (r: Partial<Reminder>) => {
    // 1. Try Electron Native Windows Notification
    if (window.electronAPI && window.electronAPI.testReminder) {
      await window.electronAPI.testReminder(r);
      return;
    }

    // 2. Fallback to Web Browser Notification
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`⏰ ${r.title || 'Lembrete Simplify your Work'}`, {
          body: r.message || 'Hora de fazer uma pausa!',
          icon: './assets/app-icon.png',
        });
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(`⏰ ${r.title || 'Lembrete Simplify your Work'}`, {
            body: r.message || 'Hora de fazer uma pausa!',
            icon: './assets/app-icon.png',
          });
        }
      }
    } else {
      alert('Notificações de sistema não são suportadas neste navegador.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setLoading(true);
      const reminderData: Partial<Reminder> = {
        id: editingReminder ? editingReminder.id : undefined,
        title: title.trim(),
        message: message.trim(),
        recurrence,
        intervalMinutes: recurrence === 'INTERVAL' ? Number(intervalMinutes) : undefined,
        scheduledTime: recurrence !== 'INTERVAL' ? scheduledTime : undefined,
        enabled: editingReminder ? editingReminder.enabled : true,
      };

      await onSaveReminder(reminderData);

      // Trigger test notification
      await handleTestNotification(reminderData);

      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [typeFilter, setTypeFilter] = useState<'all' | 'manual' | 'calendar'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const filteredReminders = React.useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return reminders.filter((r) => {
      // 1. Source Type Filter
      if (typeFilter === 'manual' && Boolean(r.eventId)) return false;
      if (typeFilter === 'calendar' && !r.eventId) return false;

      // 2. Time Period Filter
      if (timeFilter !== 'all') {
        let rDate: Date | null = null;
        if (r.scheduledTime) {
          if (r.scheduledTime.includes('T') || r.scheduledTime.includes('-')) {
            const parsed = new Date(r.scheduledTime);
            if (!isNaN(parsed.getTime())) rDate = parsed;
          } else {
            const match = r.scheduledTime.match(/(\d{1,2}):(\d{2})/);
            if (match) {
              rDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(match[1], 10), parseInt(match[2], 10));
            }
          }
        }

        if (!rDate) {
          if (r.recurrence === 'INTERVAL') return true;
          return false;
        }

        if (timeFilter === 'today') {
          if (rDate < todayStart || rDate > todayEnd) return false;
        } else if (timeFilter === 'week') {
          if (rDate < weekStart || rDate > weekEnd) return false;
        } else if (timeFilter === 'month') {
          if (rDate < monthStart || rDate > monthEnd) return false;
        }
      }

      return true;
    });
  }, [reminders, typeFilter, timeFilter]);

  const formatMeetingTimeTag = (r: Reminder) => {
    if (r.eventId) {
      if (r.scheduledTime) {
        const dt = new Date(r.scheduledTime);
        if (!isNaN(dt.getTime())) {
          const dateStr = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
          const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          return `Próxima Reunião: ${dateStr} às ${timeStr}`;
        }
      }
      return `Lembrete 30 min antes da reunião`;
    }
    if (r.recurrence === 'INTERVAL') return `A cada ${r.intervalMinutes} minutos`;
    if (r.recurrence === 'DAILY') return `Todos os dias às ${r.scheduledTime}`;
    if (r.recurrence === 'ONCE') return `Data/Hora: ${r.scheduledTime || 'Sem data'}`;
    return '';
  };

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.heading}>Lembretes &amp; Notificações do Windows</h1>
          <p style={styles.subheading}>
            Configure alertas recorrentes para saúde e produtividade enquanto trabalha (Beber água, postura, reuniões).
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <Plus size={18} /> Criar Novo Lembrete
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', padding: '12px 18px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
        {/* Source Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Origem:</span>
          <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'manual', label: '📌 Manuais (Criados)' },
              { id: 'calendar', label: '📅 Agenda (Outlook)' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTypeFilter(f.id as any)}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: typeFilter === f.id ? 'var(--accent-primary)' : 'var(--bg-card-app)',
                  color: typeFilter === f.id ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.12s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Período:</span>
          <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'today', label: 'Dia (Hoje)' },
              { id: 'week', label: 'Semana' },
              { id: 'month', label: 'Mês' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTimeFilter(f.id as any)}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: timeFilter === f.id ? 'var(--accent-primary)' : 'var(--bg-card-app)',
                  color: timeFilter === f.id ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.12s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        {filteredReminders.length === 0 ? (
          <div style={styles.emptyCard}>
            <Bell size={48} color="var(--text-muted)" />
            <h3 style={{ marginTop: '16px', fontSize: '17px', color: 'var(--text-primary)' }}>
              Nenhum lembrete encontrado para os filtros selecionados
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Altere os filtros de período/origem ou crie um novo lembrete.
            </p>
            <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={handleOpenAddModal}>
              <Plus size={16} /> Adicionar Lembrete
            </button>
          </div>
        ) : (
          filteredReminders.map((r) => (
            <div
              key={r.id}
              style={{
                ...styles.card,
                opacity: r.enabled ? 1 : 0.65,
                borderLeft: `6px solid ${r.enabled ? (r.eventId ? '#6366f1' : 'var(--accent-primary)') : 'var(--text-muted)'}`,
              }}
            >
              <div style={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bell size={20} color={r.enabled ? (r.eventId ? '#818cf8' : 'var(--accent-blue)') : 'var(--text-muted)'} />
                  <div>
                    <h3 style={styles.cardTitle}>{r.title}</h3>
                    {r.eventId && (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#818cf8', backgroundColor: 'rgba(99,102,241,0.15)', padding: '2px 6px', borderRadius: '4px', marginTop: '2px', display: 'inline-block' }}>
                        📅 Agenda Outlook
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className={`btn ${r.enabled ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => handleToggleActive(r)}
                  >
                    {r.enabled ? <CheckCircle2 size={14} /> : null}
                    {r.enabled ? 'Ativo' : 'Pausado'}
                  </button>
                  <button className="btn-icon" onClick={() => onDeleteReminder(r.id)} title="Excluir">
                    <Trash2 size={16} color="#f43f5e" />
                  </button>
                </div>
              </div>

              <p style={styles.cardMsg}>{r.message}</p>

              <div style={styles.cardFooter}>
                <div style={styles.timeTag}>
                  <Clock size={14} />
                  {formatMeetingTimeTag(r)}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => handleTestNotification(r)}
                    title="Disparar notificação do Windows agora para testar"
                  >
                    <Send size={13} /> Testar
                  </button>
                  {!r.eventId && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => handleOpenEditModal(r)}
                    >
                      Editar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: '20px', fontWeight: '800' }}>
                {editingReminder ? 'Editar Lembrete' : 'Criar Novo Lembrete'}
              </h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '16px' }}>
              <div>
                <label style={styles.label}>Título do Alerta:</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Beber Água, Levantar e Alongar, Daily Meeting..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={styles.label}>Mensagem da Notificação do Windows:</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Mensagem que aparecerá na notificação no canto da tela..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={styles.label}>Tipo de Recorrência:</label>
                <select
                  className="input-field"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as ReminderRecurrence)}
                >
                  <option value="INTERVAL">Intervalo Recorrente (A cada X minutos)</option>
                  <option value="DAILY">Diário (Horário fixo todos os dias)</option>
                  <option value="ONCE">Data e Hora Específica</option>
                </select>
              </div>

              {recurrence === 'INTERVAL' && (
                <div>
                  <label style={styles.label}>Intervalo de Repetição (em Minutos):</label>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    className="input-field"
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                    required
                  />
                </div>
              )}

              {recurrence === 'DAILY' && (
                <div>
                  <label style={styles.label}>Horário do Disparo Diário (HH:mm):</label>
                  <input
                    type="time"
                    className="input-field"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required
                  />
                </div>
              )}

              {recurrence === 'ONCE' && (
                <div>
                  <label style={styles.label}>Data e Hora do Disparo:</label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required
                  />
                </div>
              )}

              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar & Testar Notificação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '28px',
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '24px',
    borderRadius: '20px',
    border: '1px solid var(--border-subtle)',
  },
  heading: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#ffffff',
  },
  subheading: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '20px',
  },
  emptyCard: {
    gridColumn: '1 / -1',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: '20px',
    border: '2px dashed var(--border-subtle)',
    padding: '50px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'var(--bg-sidebar)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    boxShadow: 'var(--shadow-md)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#ffffff',
  },
  cardMsg: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.45',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '10px',
    borderTop: '1px solid var(--border-subtle)',
  },
  timeTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--accent-blue)',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    padding: '4px 10px',
    borderRadius: '10px',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '700',
    marginBottom: '8px',
    color: 'var(--text-secondary)',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '12px',
  },
};
