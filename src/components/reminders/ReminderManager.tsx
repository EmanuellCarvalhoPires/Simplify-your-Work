import React, { useState, useEffect, useMemo } from 'react';
import type { Reminder, ReminderRecurrence, MeetingStatus } from '../../types/index';
import {
  Bell,
  Plus,
  Clock,
  Trash2,
  CheckCircle2,
  X,
  Send,
  VolumeX,
  Search,
  LayoutList,
  LayoutGrid,
  Edit2,
  Copy,
  Calendar,
  Repeat,
  Sparkles,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Play,
  Pause,
  Layers,
  Flame,
  Check,
} from 'lucide-react';

interface ReminderManagerProps {
  reminders: Reminder[];
  onSaveReminder: (reminder: Partial<Reminder>) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
}

type ViewMode = 'list' | 'grid';
type SortField = 'upcoming' | 'recent' | 'name' | 'status' | 'recurrence';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'paused';
type SourceFilter = 'all' | 'manual' | 'calendar';
type RecurrenceFilter = 'all' | 'INTERVAL' | 'DAILY' | 'ONCE';
type PeriodFilter = 'all' | 'urgent' | 'today' | 'week' | 'month';

interface QuickPreset {
  label: string;
  icon: string;
  title: string;
  message: string;
  recurrence: ReminderRecurrence;
  intervalMinutes?: number;
  scheduledTime?: string;
}

const QUICK_PRESETS: QuickPreset[] = [
  {
    label: '💧 Beber Água (35m)',
    icon: '💧',
    title: '💧 Beber Água',
    message: 'Hora de se hidratar! Beba um copo de água fresca para manter o foco.',
    recurrence: 'INTERVAL',
    intervalMinutes: 35,
  },
  {
    label: '🧘 Alongar & Postura (60m)',
    icon: '🧘',
    title: '🧘 Corrigir Postura & Alongar',
    message: 'Levante-se, estique as costas e respire fundo por 1 minuto.',
    recurrence: 'INTERVAL',
    intervalMinutes: 60,
  },
  {
    label: '☕ Pausa para Café (2h)',
    icon: '☕',
    title: '☕ Pausa Rápida',
    message: 'Faça uma pausa de 5 minutos para descansar a visão e recarregar a mente.',
    recurrence: 'INTERVAL',
    intervalMinutes: 120,
  },
  {
    label: '📋 Daily Meeting (09:30)',
    icon: '📋',
    title: '📋 Daily Meeting',
    message: 'Reunião de alinhamento diário da equipe.',
    recurrence: 'DAILY',
    scheduledTime: '09:30',
  },
  {
    label: '🏁 Fechamento do Dia (18:00)',
    icon: '🏁',
    title: '🏁 Resumo do Dia & Apontamentos',
    message: 'Revise os tickets do Jira, anote pendências e finalize as atividades de hoje.',
    recurrence: 'DAILY',
    scheduledTime: '18:00',
  },
];

export const ReminderManager: React.FC<ReminderManagerProps> = ({
  reminders,
  onSaveReminder,
  onDeleteReminder,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [meetingStatus, setMeetingStatus] = useState<MeetingStatus | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testSuccessId, setTestSuccessId] = useState<string | null>(null);

  // View & Filter States
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [recurrenceFilter, setRecurrenceFilter] = useState<RecurrenceFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [sortField, setSortField] = useState<SortField>('upcoming');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Form States
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>('INTERVAL');
  const [intervalMinutes, setIntervalMinutes] = useState(45);
  const [scheduledTime, setScheduledTime] = useState('14:00');
  const [loading, setLoading] = useState(false);

  // Update clock every 10 seconds for real-time countdown chips
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Teams meeting detector
  useEffect(() => {
    const checkMeeting = async () => {
      if (window.electronAPI?.checkMeetingStatus) {
        try {
          const status = await window.electronAPI.checkMeetingStatus();
          setMeetingStatus(status);
        } catch (e) {
          // ignore
        }
      }
    };
    checkMeeting();
    const interval = setInterval(checkMeeting, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenAddModal = () => {
    setEditingReminder(null);
    setTitle('');
    setMessage('');
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

  const handleApplyPreset = (preset: QuickPreset) => {
    setTitle(preset.title);
    setMessage(preset.message);
    setRecurrence(preset.recurrence);
    if (preset.intervalMinutes) setIntervalMinutes(preset.intervalMinutes);
    if (preset.scheduledTime) setScheduledTime(preset.scheduledTime);
  };

  const handleToggleActive = async (r: Reminder) => {
    try {
      await onSaveReminder({
        ...r,
        enabled: !r.enabled,
      });
    } catch (err) {
      console.error('Erro ao alternar status do lembrete:', err);
    }
  };

  const handleDuplicateReminder = async (r: Reminder) => {
    try {
      const duplicateData: Partial<Reminder> = {
        title: `${r.title} (Cópia)`,
        message: r.message,
        recurrence: r.recurrence,
        intervalMinutes: r.intervalMinutes,
        scheduledTime: r.scheduledTime,
        enabled: true,
      };
      await onSaveReminder(duplicateData);
      setCopiedId(r.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Erro ao duplicar lembrete:', err);
    }
  };

  const handleTestNotification = async (r: Partial<Reminder>) => {
    try {
      if (r.id) {
        setTestSuccessId(r.id);
        setTimeout(() => setTestSuccessId(null), 2000);
      }

      if (window.electronAPI && window.electronAPI.testReminder) {
        await window.electronAPI.testReminder(r);
        return;
      }

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
    } catch (e) {
      console.error('Erro ao disparar teste de notificação:', e);
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
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar lembrete:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSourceFilter('all');
    setRecurrenceFilter('all');
    setPeriodFilter('all');
    setSortField('upcoming');
    setSortDirection('asc');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    sourceFilter !== 'all' ||
    recurrenceFilter !== 'all' ||
    periodFilter !== 'all' ||
    sortField !== 'upcoming' ||
    sortDirection !== 'asc';

  /**
   * Calcula o timestamp exato do próximo disparo para qualquer tipo de lembrete
   */
  const getNextTriggerTimestamp = (r: Reminder, now = currentTime): number => {
    const nowMs = now.getTime();

    if (r.eventId) {
      if (r.scheduledTime) {
        const dt = new Date(r.scheduledTime);
        if (!isNaN(dt.getTime())) {
          const remTime = dt.getTime() - 30 * 60 * 1000;
          if (remTime < nowMs) {
            // Reunião/lembrete no passado: retornar timestamp futuro distante para não marcar como "Pronto para disparar"
            return nowMs + 1000 * 60 * 60 * 24 * 365;
          }
          return remTime;
        }
      }
      return nowMs + 1000 * 60 * 60 * 24 * 365;
    }

    if (r.recurrence === 'INTERVAL') {
      const intervalMins = Number(r.intervalMinutes) || 60;
      const intervalMs = intervalMins * 60 * 1000;
      if (r.lastTriggered) {
        const last = new Date(r.lastTriggered).getTime();
        if (!isNaN(last)) {
          return last + intervalMs;
        }
      }
      const created = r.createdAt ? new Date(r.createdAt).getTime() : nowMs;
      return created + intervalMs;
    }

    if (r.recurrence === 'DAILY' && r.scheduledTime) {
      let hour = 0;
      let min = 0;
      if (r.scheduledTime.includes('T') || r.scheduledTime.includes('-')) {
        const d = new Date(r.scheduledTime);
        if (!isNaN(d.getTime())) {
          hour = d.getHours();
          min = d.getMinutes();
        }
      } else {
        const match = r.scheduledTime.match(/(\d{1,2}):(\d{2})/);
        if (match) {
          hour = parseInt(match[1], 10);
          min = parseInt(match[2], 10);
        }
      }

      const todayTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, min, 0, 0);
      const last = r.lastTriggered ? new Date(r.lastTriggered) : null;
      const isLastToday =
        last &&
        last.getFullYear() === now.getFullYear() &&
        last.getMonth() === now.getMonth() &&
        last.getDate() === now.getDate() &&
        last.getTime() >= todayTarget.getTime() - 60000;

      if (todayTarget.getTime() > nowMs && !isLastToday) {
        return todayTarget.getTime();
      } else if (todayTarget.getTime() <= nowMs && !isLastToday) {
        return todayTarget.getTime();
      } else {
        return new Date(todayTarget.getTime() + 24 * 60 * 60 * 1000).getTime();
      }
    }

    if (r.recurrence === 'ONCE' && r.scheduledTime) {
      let targetMs = 0;
      if (r.scheduledTime.includes('T') || r.scheduledTime.includes('-')) {
        const parsed = new Date(r.scheduledTime);
        if (!isNaN(parsed.getTime())) {
          targetMs = parsed.getTime();
        }
      } else {
        const match = r.scheduledTime.match(/(\d{1,2}):(\d{2})/);
        if (match) {
          const hour = parseInt(match[1], 10);
          const min = parseInt(match[2], 10);
          targetMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, min, 0, 0).getTime();
        }
      }
      if (targetMs > 0) {
        if (targetMs < nowMs) {
          return nowMs + 1000 * 60 * 60 * 24 * 365;
        }
        return targetMs;
      }
    }

    return nowMs + 1000 * 60 * 60 * 24 * 365;
  };

  /**
   * Formata texto amigável de contagem regressiva para exibição
   */
  const formatCountdown = (
    r: Reminder,
    now = currentTime
  ): { text: string; isUrgent: boolean; isDue: boolean; color: string; bg: string; border: string } => {
    if (!r.enabled) {
      return {
        text: 'Pausado',
        isUrgent: false,
        isDue: false,
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.12)',
        border: 'rgba(148, 163, 184, 0.25)',
      };
    }

    const nowMs = now.getTime();
    const nextMs = getNextTriggerTimestamp(r, now);
    const diffMs = nextMs - nowMs;

    if (diffMs <= 0) {
      return {
        text: '🚨 Pronto para disparar',
        isUrgent: true,
        isDue: true,
        color: '#f43f5e',
        bg: 'rgba(244, 63, 94, 0.15)',
        border: 'rgba(244, 63, 94, 0.35)',
      };
    }

    const diffMin = Math.ceil(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin <= 1) {
      return {
        text: '⏳ Em menos de 1 min',
        isUrgent: true,
        isDue: true,
        color: '#fbbf24',
        bg: 'rgba(245, 158, 11, 0.18)',
        border: 'rgba(245, 158, 11, 0.4)',
      };
    }
    if (diffMin <= 15) {
      return {
        text: `⏳ Em ${diffMin} min`,
        isUrgent: true,
        isDue: false,
        color: '#fbbf24',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.35)',
      };
    }
    if (diffMin < 60) {
      return {
        text: `⏳ Em ${diffMin} min`,
        isUrgent: false,
        isDue: false,
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.12)',
        border: 'rgba(56, 189, 248, 0.25)',
      };
    }
    if (diffHours < 24) {
      const nextDate = new Date(nextMs);
      const isToday = nextDate.getDate() === now.getDate();
      const timeStr = nextDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return {
        text: isToday ? `⏰ Hoje às ${timeStr} (em ${diffHours}h)` : `⏰ Amanhã às ${timeStr} (em ${diffHours}h)`,
        isUrgent: false,
        isDue: false,
        color: '#a5b4fc',
        bg: 'rgba(99, 102, 241, 0.12)',
        border: 'rgba(99, 102, 241, 0.25)',
      };
    }

    const nextDate = new Date(nextMs);
    const dateStr = `${String(nextDate.getDate()).padStart(2, '0')}/${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    const timeStr = nextDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return {
      text: `📅 Em ${diffDays}d (${dateStr} ${timeStr})`,
      isUrgent: false,
      isDue: false,
      color: '#94a3b8',
      bg: 'rgba(148, 163, 184, 0.1)',
      border: 'rgba(148, 163, 184, 0.2)',
    };
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = reminders.length;
    const active = reminders.filter((r) => r.enabled).length;
    const paused = total - active;
    const calendar = reminders.filter((r) => Boolean(r.eventId)).length;
    const recurring = reminders.filter((r) => r.recurrence === 'INTERVAL' || r.recurrence === 'DAILY').length;

    let urgentCount = 0;
    const nowMs = currentTime.getTime();
    reminders.forEach((r) => {
      if (r.enabled) {
        const nextMs = getNextTriggerTimestamp(r, currentTime);
        const diffMs = nextMs - nowMs;
        if (diffMs <= 30 * 60 * 1000) {
          urgentCount++;
        }
      }
    });

    return { total, active, paused, calendar, recurring, urgentCount };
  }, [reminders, currentTime]);

  // Filtered and Sorted reminders
  const filteredReminders = useMemo(() => {
    const now = currentTime;
    const nowMs = now.getTime();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const filtered = reminders.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesMessage = r.message ? r.message.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesMessage) return false;
      }

      if (statusFilter === 'active' && !r.enabled) return false;
      if (statusFilter === 'paused' && r.enabled) return false;

      if (sourceFilter === 'manual' && Boolean(r.eventId)) return false;
      if (sourceFilter === 'calendar' && !r.eventId) return false;

      if (recurrenceFilter !== 'all' && r.recurrence !== recurrenceFilter) return false;

      if (periodFilter === 'urgent') {
        if (!r.enabled) return false;
        const nextMs = getNextTriggerTimestamp(r, now);
        if (nextMs - nowMs > 15 * 60 * 1000) return false;
      } else if (periodFilter !== 'all') {
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

        if (periodFilter === 'today') {
          if (rDate < todayStart || rDate > todayEnd) return false;
        } else if (periodFilter === 'week') {
          if (rDate < weekStart || rDate > weekEnd) return false;
        } else if (periodFilter === 'month') {
          if (rDate < monthStart || rDate > monthEnd) return false;
        }
      }

      return true;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'name') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortField === 'recent') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = dateA - dateB;
      } else if (sortField === 'status') {
        const valA = a.enabled ? 1 : 0;
        const valB = b.enabled ? 1 : 0;
        comparison = valB - valA;
      } else if (sortField === 'recurrence') {
        comparison = a.recurrence.localeCompare(b.recurrence);
      } else {
        if (a.enabled && !b.enabled) return -1;
        if (!a.enabled && b.enabled) return 1;

        const timeA = getNextTriggerTimestamp(a, now);
        const timeB = getNextTriggerTimestamp(b, now);

        const isDueA = timeA <= nowMs;
        const isDueB = timeB <= nowMs;
        if (isDueA && !isDueB) return -1;
        if (!isDueA && isDueB) return 1;

        comparison = timeA - timeB;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [
    reminders,
    currentTime,
    searchQuery,
    statusFilter,
    sourceFilter,
    recurrenceFilter,
    periodFilter,
    sortField,
    sortDirection,
  ]);

  const formatScheduleBadge = (r: Reminder) => {
    if (r.eventId) {
      if (r.scheduledTime) {
        const dt = new Date(r.scheduledTime);
        if (!isNaN(dt.getTime())) {
          const dateStr = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
          const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          return `Reunião: ${dateStr} às ${timeStr} (-30min)`;
        }
      }
      return 'Agenda (Alerta 30m antes)';
    }

    if (r.recurrence === 'INTERVAL') return `A cada ${r.intervalMinutes || 45} min`;
    if (r.recurrence === 'DAILY') return `Diário às ${r.scheduledTime || '00:00'}`;
    if (r.recurrence === 'ONCE') {
      if (r.scheduledTime) {
        const dt = new Date(r.scheduledTime);
        if (!isNaN(dt.getTime())) {
          return `Único: ${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        }
      }
      return `Único: ${r.scheduledTime || 'Sem data'}`;
    }
    return '';
  };

  return (
    <div style={styles.container}>
      {/* ── Top Bar Header ── */}
      <div style={styles.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)',
            }}
          >
            <Bell size={24} />
          </div>
          <div>
            <h1 style={styles.heading}>Lembretes &amp; Alertas do Windows</h1>
            <p style={styles.subheading}>
              Gerencie alarmes sonoros, avisos de saúde e notificações inteligentes em tempo real.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-primary" onClick={handleOpenAddModal} style={{ gap: '8px', padding: '10px 18px' }}>
            <Plus size={18} /> Novo Lembrete
          </button>
        </div>
      </div>

      {/* ── Meeting Status Banner ── */}
      {meetingStatus?.inMeeting && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '14px',
            padding: '12px 20px',
            color: '#fbbf24',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <VolumeX size={20} />
            <div>
              <strong style={{ fontSize: '13px', display: 'block' }}>
                Modo Silencioso em Reunião Ativo
              </strong>
              <span style={{ fontSize: '12px', opacity: 0.9 }}>
                {meetingStatus.reason || 'Reunião detectada no Microsoft Teams. Os lembretes estão em pausa temporária.'}
              </span>
            </div>
          </div>
          <span
            style={{
              fontSize: '11px',
              backgroundColor: 'rgba(245, 158, 11, 0.25)',
              padding: '4px 12px',
              borderRadius: '8px',
              fontWeight: 700,
            }}
          >
            Adiados para o pós-reunião
          </span>
        </div>
      )}

      {/* ── Mini Dashboard / Metrics ── */}
      <div style={styles.metricsGrid}>
        <div
          style={{
            ...styles.metricCard,
            borderLeft: '4px solid var(--accent-primary)',
            cursor: 'pointer',
          }}
          onClick={() => {
            setStatusFilter('all');
            setSourceFilter('all');
            setPeriodFilter('all');
          }}
          title="Clique para ver todos"
        >
          <div style={styles.metricIconWrap}>
            <Layers size={18} color="var(--accent-primary)" />
          </div>
          <div>
            <div style={styles.metricValue}>{metrics.total}</div>
            <div style={styles.metricLabel}>Total Cadastrado</div>
          </div>
        </div>

        <div
          style={{
            ...styles.metricCard,
            borderLeft: '4px solid #10b981',
            cursor: 'pointer',
          }}
          onClick={() => setStatusFilter('active')}
          title="Clique para filtrar ativos"
        >
          <div style={{ ...styles.metricIconWrap, backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div>
            <div style={styles.metricValue}>{metrics.active}</div>
            <div style={styles.metricLabel}>Lembretes Ativos</div>
          </div>
        </div>

        <div
          style={{
            ...styles.metricCard,
            borderLeft: '4px solid #f59e0b',
            cursor: 'pointer',
          }}
          onClick={() => setPeriodFilter('urgent')}
          title="Clique para filtrar iminentes"
        >
          <div style={{ ...styles.metricIconWrap, backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
            <Flame size={18} color="#f59e0b" />
          </div>
          <div>
            <div style={styles.metricValue}>{metrics.urgentCount}</div>
            <div style={styles.metricLabel}>Iminentes (&lt; 30 min)</div>
          </div>
        </div>

        <div
          style={{
            ...styles.metricCard,
            borderLeft: '4px solid #38bdf8',
            cursor: 'pointer',
          }}
          onClick={() => {
            setRecurrenceFilter('all');
            setSourceFilter('manual');
          }}
          title="Clique para filtrar recorrentes manuais"
        >
          <div style={{ ...styles.metricIconWrap, backgroundColor: 'rgba(56, 189, 248, 0.15)' }}>
            <Repeat size={18} color="#38bdf8" />
          </div>
          <div>
            <div style={styles.metricValue}>{metrics.recurring}</div>
            <div style={styles.metricLabel}>Rotinas Periódicas</div>
          </div>
        </div>

        <div
          style={{
            ...styles.metricCard,
            borderLeft: '4px solid #818cf8',
            cursor: 'pointer',
          }}
          onClick={() => setSourceFilter('calendar')}
          title="Clique para filtrar lembretes de agenda"
        >
          <div style={{ ...styles.metricIconWrap, backgroundColor: 'rgba(129, 140, 248, 0.15)' }}>
            <Calendar size={18} color="#818cf8" />
          </div>
          <div>
            <div style={styles.metricValue}>{metrics.calendar}</div>
            <div style={styles.metricLabel}>Sinc. de Reuniões</div>
          </div>
        </div>
      </div>

      {/* ── Filters & Controls Bar ── */}
      <div style={styles.controlsContainer}>
        {/* Row 1: Search & View Toggle */}
        <div style={styles.controlsRowTop}>
          <div style={styles.searchWrap}>
            <Search size={16} color="var(--text-muted)" style={{ marginLeft: '12px' }} />
            <input
              type="text"
              placeholder="Buscar lembretes por título ou mensagem..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={styles.clearSearchBtn}
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={styles.segmentedControl}>
              <button
                style={{
                  ...styles.segmentBtn,
                  backgroundColor: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)',
                }}
                onClick={() => setViewMode('list')}
                title="Visualização em Lista"
              >
                <LayoutList size={16} />
                <span>Lista</span>
              </button>
              <button
                style={{
                  ...styles.segmentBtn,
                  backgroundColor: viewMode === 'grid' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'grid' ? '#fff' : 'var(--text-secondary)',
                }}
                onClick={() => setViewMode('grid')}
                title="Visualização em Cards"
              >
                <LayoutGrid size={16} />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Filter Selectors & Sort Options */}
        <div style={styles.controlsRowBottom}>
          <div style={styles.filterGroupWrap}>
            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Status:</span>
              <select
                className="input-field"
                style={styles.compactSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">Todos os Status</option>
                <option value="active">🟢 Apenas Ativos</option>
                <option value="paused">⏸️ Apenas Pausados</option>
              </select>
            </div>

            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Origem:</span>
              <select
                className="input-field"
                style={styles.compactSelect}
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
              >
                <option value="all">Todas as Origens</option>
                <option value="manual">📌 Manuais (Criados)</option>
                <option value="calendar">📅 Agendas (Outlook/Google)</option>
              </select>
            </div>

            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Tipo:</span>
              <select
                className="input-field"
                style={styles.compactSelect}
                value={recurrenceFilter}
                onChange={(e) => setRecurrenceFilter(e.target.value as RecurrenceFilter)}
              >
                <option value="all">Todos os Tipos</option>
                <option value="INTERVAL">🔄 Intervalo Recorrente</option>
                <option value="DAILY">⏰ Diário (Horário Fixo)</option>
                <option value="ONCE">🎯 Data/Hora Única</option>
              </select>
            </div>

            <div style={styles.filterItem}>
              <span style={styles.filterLabel}>Período:</span>
              <select
                className="input-field"
                style={styles.compactSelect}
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
              >
                <option value="all">Qualquer Período</option>
                <option value="urgent">🔥 Iminentes (&lt; 15 min)</option>
                <option value="today">📅 Para Hoje</option>
                <option value="week">🗓️ Esta Semana</option>
                <option value="month">📆 Este Mês</option>
              </select>
            </div>
          </div>

          <div style={styles.sortGroupWrap}>
            <span style={styles.filterLabel}>Ordenar por:</span>
            <select
              className="input-field"
              style={styles.compactSelect}
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
            >
              <option value="upcoming">⏳ Próximo Disparo</option>
              <option value="recent">🕒 Mais Recentes</option>
              <option value="name">🔤 Título (A-Z)</option>
              <option value="status">⚡ Status (Ativos)</option>
              <option value="recurrence">🔁 Tipo de Recorrência</option>
            </select>

            <button
              className="btn btn-secondary"
              style={styles.sortDirectionBtn}
              onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              title={`Direção: ${sortDirection === 'asc' ? 'Crescente' : 'Decrescente'}`}
            >
              {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              <span>{sortDirection === 'asc' ? 'Asc' : 'Desc'}</span>
            </button>

            {hasActiveFilters && (
              <button
                className="btn btn-secondary"
                style={styles.resetFiltersBtn}
                onClick={handleResetFilters}
                title="Limpar todos os filtros e ordenações"
              >
                <RotateCcw size={13} />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Counter & Active Pills */}
        <div style={styles.resultInfoBar}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Exibindo <strong style={{ color: 'var(--text-primary)' }}>{filteredReminders.length}</strong> de{' '}
            <strong>{reminders.length}</strong> lembretes
          </span>

          {hasActiveFilters && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 600 }}>Filtros ativos:</span>
              {searchQuery && (
                <span style={styles.activePill}>
                  Busca: "{searchQuery}" <X size={10} style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
                </span>
              )}
              {statusFilter !== 'all' && (
                <span style={styles.activePill}>
                  Status: {statusFilter === 'active' ? 'Ativos' : 'Pausados'}{' '}
                  <X size={10} style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('all')} />
                </span>
              )}
              {sourceFilter !== 'all' && (
                <span style={styles.activePill}>
                  Origem: {sourceFilter === 'manual' ? 'Manuais' : 'Agenda'}{' '}
                  <X size={10} style={{ cursor: 'pointer' }} onClick={() => setSourceFilter('all')} />
                </span>
              )}
              {recurrenceFilter !== 'all' && (
                <span style={styles.activePill}>
                  Tipo: {recurrenceFilter}{' '}
                  <X size={10} style={{ cursor: 'pointer' }} onClick={() => setRecurrenceFilter('all')} />
                </span>
              )}
              {periodFilter !== 'all' && (
                <span style={styles.activePill}>
                  Período: {periodFilter}{' '}
                  <X size={10} style={{ cursor: 'pointer' }} onClick={() => setPeriodFilter('all')} />
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content: List or Grid ── */}
      {filteredReminders.length === 0 ? (
        <div style={styles.emptyCard}>
          <Bell size={48} color="var(--text-muted)" />
          <h3 style={{ marginTop: '16px', fontSize: '17px', color: 'var(--text-primary)', fontWeight: 700 }}>
            Nenhum lembrete encontrado
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '400px' }}>
            Não encontramos nenhum alerta com os filtros aplicados. Altere os termos da busca ou crie um novo lembrete.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            {hasActiveFilters && (
              <button className="btn btn-secondary" onClick={handleResetFilters}>
                <RotateCcw size={14} /> Redefinir Filtros
              </button>
            )}
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              <Plus size={16} /> Adicionar Lembrete
            </button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* ══════════════ LIST VIEW (WITH STICKY HEADER & DEDICATED SCROLLBAR) ══════════════ */
        <div style={styles.listContainer}>
          <div style={styles.listHeaderRow}>
            <div style={{ width: '90px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Status
            </div>
            <div style={{ flex: 1, minWidth: '220px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Lembrete &amp; Conteúdo
            </div>
            <div style={{ width: '180px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Recorrência / Horário
            </div>
            <div style={{ width: '180px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Próximo Disparo
            </div>
            <div style={{ width: '140px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Ações
            </div>
          </div>

          <div style={styles.listBody}>
            {filteredReminders.map((r) => {
              const countdown = formatCountdown(r);
              const isAgenda = Boolean(r.eventId);

              return (
                <div
                  key={r.id}
                  style={{
                    ...styles.listItemRow,
                    opacity: r.enabled ? 1 : 0.65,
                    borderLeft: `4px solid ${
                      !r.enabled
                        ? 'var(--text-muted)'
                        : isAgenda
                        ? '#818cf8'
                        : countdown.isDue
                        ? '#f43f5e'
                        : countdown.isUrgent
                        ? '#f59e0b'
                        : 'var(--accent-primary)'
                    }`,
                  }}
                >
                  {/* Status Toggle Column */}
                  <div style={{ width: '90px', display: 'flex', alignItems: 'center' }}>
                    <button
                      onClick={() => handleToggleActive(r)}
                      style={{
                        ...styles.statusToggleButton,
                        backgroundColor: r.enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.12)',
                        borderColor: r.enabled ? 'rgba(16, 185, 129, 0.35)' : 'rgba(148, 163, 184, 0.25)',
                        color: r.enabled ? '#10b981' : '#94a3b8',
                      }}
                      title={r.enabled ? 'Clique para pausar' : 'Clique para ativar'}
                    >
                      {r.enabled ? <Play size={11} fill="currentColor" /> : <Pause size={11} />}
                      <span>{r.enabled ? 'Ativo' : 'Pausa'}</span>
                    </button>
                  </div>

                  {/* Title and Message Column */}
                  <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={styles.listTitle}>{r.title}</span>
                      {isAgenda && (
                        <span style={styles.agendaBadge}>
                          <Calendar size={10} /> Agenda Outlook
                        </span>
                      )}
                    </div>
                    {r.message && <span style={styles.listSubtitle}>{r.message}</span>}
                  </div>

                  {/* Recurrence & Schedule Details */}
                  <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <Clock size={13} color="var(--accent-blue)" />
                      <span>{formatScheduleBadge(r)}</span>
                    </div>
                  </div>

                  {/* Countdown Badge Column */}
                  <div style={{ width: '180px', display: 'flex', alignItems: 'center' }}>
                    <span
                      style={{
                        ...styles.countdownChip,
                        backgroundColor: countdown.bg,
                        color: countdown.color,
                        borderColor: countdown.border,
                      }}
                    >
                      {countdown.text}
                    </span>
                  </div>

                  {/* Actions Column */}
                  <div style={{ width: '140px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    <button
                      className="btn-icon"
                      style={styles.actionIconBtn}
                      onClick={() => handleTestNotification(r)}
                      title="Testar Notificação no Windows"
                    >
                      {testSuccessId === r.id ? <Check size={14} color="#10b981" /> : <Send size={14} color="var(--accent-blue)" />}
                    </button>

                    {!isAgenda && (
                      <button
                        className="btn-icon"
                        style={styles.actionIconBtn}
                        onClick={() => handleDuplicateReminder(r)}
                        title="Duplicar Lembrete"
                      >
                        {copiedId === r.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    )}

                    {!isAgenda && (
                      <button
                        className="btn-icon"
                        style={styles.actionIconBtn}
                        onClick={() => handleOpenEditModal(r)}
                        title="Editar Lembrete"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}

                    <button
                      className="btn-icon"
                      style={{ ...styles.actionIconBtn, color: '#f43f5e' }}
                      onClick={() => {
                        if (confirm(`Deseja realmente excluir o lembrete "${r.title}"?`)) {
                          onDeleteReminder(r.id);
                        }
                      }}
                      title="Excluir Lembrete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ══════════════ GRID / CARDS VIEW ══════════════ */
        <div style={styles.grid}>
          {filteredReminders.map((r) => {
            const countdown = formatCountdown(r);
            const isAgenda = Boolean(r.eventId);

            return (
              <div
                key={r.id}
                style={{
                  ...styles.card,
                  opacity: r.enabled ? 1 : 0.7,
                  borderLeft: `5px solid ${
                    !r.enabled
                      ? 'var(--text-muted)'
                      : isAgenda
                      ? '#818cf8'
                      : countdown.isDue
                      ? '#f43f5e'
                      : countdown.isUrgent
                      ? '#f59e0b'
                      : 'var(--accent-primary)'
                  }`,
                }}
              >
                <div style={styles.cardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: r.enabled ? 'rgba(56, 189, 248, 0.12)' : 'rgba(148, 163, 184, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: r.enabled ? 'var(--accent-blue)' : 'var(--text-muted)',
                      }}
                    >
                      <Bell size={18} />
                    </div>
                    <div>
                      <h3 style={styles.cardTitle}>{r.title}</h3>
                      {isAgenda && (
                        <span style={styles.agendaBadge}>
                          <Calendar size={10} /> Agenda Outlook
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => handleToggleActive(r)}
                      style={{
                        ...styles.statusToggleButton,
                        backgroundColor: r.enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.12)',
                        borderColor: r.enabled ? 'rgba(16, 185, 129, 0.35)' : 'rgba(148, 163, 184, 0.25)',
                        color: r.enabled ? '#10b981' : '#94a3b8',
                      }}
                      title={r.enabled ? 'Pausar' : 'Ativar'}
                    >
                      {r.enabled ? <Play size={11} fill="currentColor" /> : <Pause size={11} />}
                      <span>{r.enabled ? 'Ativo' : 'Pausado'}</span>
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '6px' }}>
                  <span
                    style={{
                      ...styles.countdownChip,
                      backgroundColor: countdown.bg,
                      color: countdown.color,
                      borderColor: countdown.border,
                    }}
                  >
                    {countdown.text}
                  </span>
                </div>

                {r.message && <p style={styles.cardMsg}>{r.message}</p>}

                <div style={styles.cardFooter}>
                  <div style={styles.timeTag}>
                    <Clock size={13} />
                    {formatScheduleBadge(r)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      className="btn-icon"
                      style={styles.actionIconBtn}
                      onClick={() => handleTestNotification(r)}
                      title="Testar Notificação"
                    >
                      {testSuccessId === r.id ? <Check size={13} color="#10b981" /> : <Send size={13} color="var(--accent-blue)" />}
                    </button>

                    {!isAgenda && (
                      <button
                        className="btn-icon"
                        style={styles.actionIconBtn}
                        onClick={() => handleDuplicateReminder(r)}
                        title="Duplicar"
                      >
                        {copiedId === r.id ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                      </button>
                    )}

                    {!isAgenda && (
                      <button
                        className="btn-icon"
                        style={styles.actionIconBtn}
                        onClick={() => handleOpenEditModal(r)}
                        title="Editar"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}

                    <button
                      className="btn-icon"
                      style={{ ...styles.actionIconBtn, color: '#f43f5e' }}
                      onClick={() => {
                        if (confirm(`Deseja realmente excluir o lembrete "${r.title}"?`)) {
                          onDeleteReminder(r.id);
                        }
                      }}
                      title="Excluir"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal de Criação & Edição ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-blue)',
                  }}
                >
                  <Bell size={18} />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: '800' }}>
                  {editingReminder ? 'Editar Lembrete' : 'Criar Novo Lembrete'}
                </h2>
              </div>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {!editingReminder && (
              <div style={styles.presetsSection}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Sparkles size={14} color="var(--accent-blue)" />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Modelos Rápidos Pré-configurados:
                  </span>
                </div>
                <div style={styles.presetsGrid}>
                  {QUICK_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      style={styles.presetChipBtn}
                      title={`Preencher formulário com: ${preset.title}`}
                    >
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={styles.label}>
                  Título do Lembrete: <span style={{ color: '#f43f5e' }}>*</span>
                </label>
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
                <label style={styles.label}>Mensagem da Notificação do Windows (Opcional):</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Texto explicativo que aparecerá no pop-up do Windows..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div>
                <label style={styles.label}>Tipo de Recorrência:</label>
                <select
                  className="input-field"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as ReminderRecurrence)}
                >
                  <option value="INTERVAL">🔄 Intervalo Recorrente (A cada X minutos)</option>
                  <option value="DAILY">⏰ Diário (Horário fixo todos os dias)</option>
                  <option value="ONCE">🎯 Data e Hora Específica</option>
                </select>
              </div>

              {recurrence === 'INTERVAL' && (
                <div>
                  <label style={styles.label}>Intervalo de Repetição (em Minutos):</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      className="input-field"
                      value={intervalMinutes}
                      onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                      required
                    />
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[15, 30, 45, 60, 120].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '11px' }}
                          onClick={() => setIntervalMinutes(mins)}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {recurrence === 'DAILY' && (
                <div>
                  <label style={styles.label}>Horário do Disparo Diário (HH:mm):</label>
                  <input
                    type="time"
                    className="input-field"
                    style={{ cursor: 'pointer' }}
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch (err) {}
                    }}
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
                    style={{ cursor: 'pointer' }}
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch (err) {}
                    }}
                    required
                  />
                </div>
              )}

              <div style={styles.modalActions}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleTestNotification({ title: title || 'Teste de Notificação', message: message || 'Lembrete de teste' })}
                  title="Testar como a notificação ficará no Windows"
                  style={{ marginRight: 'auto', gap: '6px', fontSize: '12px' }}
                >
                  <Send size={13} /> Testar Notificação
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Salvando...' : editingReminder ? 'Atualizar' : 'Criar Lembrete'}
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
    padding: '24px 28px 40px 28px',
    flex: 1,
    height: '100%',
    maxHeight: '100%',
    minHeight: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '20px 24px',
    borderRadius: '18px',
    border: '1px solid var(--border-subtle)',
    backdropFilter: 'blur(10px)',
  },
  heading: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: '-0.02em',
  },
  subheading: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '3px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  metricCard: {
    backgroundColor: 'var(--bg-sidebar)',
    borderRadius: '14px',
    padding: '14px 16px',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: 'var(--shadow-sm)',
    transition: 'transform 0.15s ease, background-color 0.15s ease',
  },
  metricIconWrap: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricValue: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: '1.1',
  },
  metricLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
    fontWeight: '600',
  },
  controlsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '16px',
    border: '1px solid var(--border-subtle)',
  },
  controlsRowTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--bg-card-app)',
    borderRadius: '10px',
    border: '1px solid var(--border-subtle)',
    flex: 1,
    minWidth: '260px',
    maxWidth: '460px',
    position: 'relative',
  },
  searchInput: {
    width: '100%',
    padding: '8px 32px 8px 10px',
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '8px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedControl: {
    display: 'flex',
    borderRadius: '10px',
    backgroundColor: 'var(--bg-card-app)',
    border: '1px solid var(--border-subtle)',
    padding: '3px',
    gap: '2px',
  },
  segmentBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 700,
    border: 'none',
    borderRadius: '7px',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  },
  controlsRowBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  filterGroupWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  filterItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  filterLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  compactSelect: {
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 600,
    borderRadius: '8px',
    backgroundColor: 'var(--bg-card-app)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  sortGroupWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  sortDirectionBtn: {
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  resetFiltersBtn: {
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
    color: '#f43f5e',
  },
  resultInfoBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    flexWrap: 'wrap',
    paddingTop: '4px',
  },
  activePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    color: 'var(--accent-blue)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-sidebar)',
    borderRadius: '16px',
    border: '1px solid var(--border-subtle)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-md)',
    maxHeight: 'calc(100vh - 360px)',
    minHeight: '320px',
  },
  listHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 18px',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid var(--border-subtle)',
    gap: '16px',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  listBody: {
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    flex: 1,
  },
  listItemRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 18px',
    borderBottom: '1px solid var(--border-subtle)',
    gap: '16px',
    transition: 'background-color 0.15s ease',
  },
  listTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#ffffff',
  },
  listSubtitle: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '450px',
  },
  statusToggleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 700,
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  },
  agendaBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    fontWeight: 700,
    color: '#818cf8',
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    border: '1px solid rgba(129, 140, 248, 0.25)',
    padding: '2px 7px',
    borderRadius: '6px',
  },
  countdownChip: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: '8px',
    border: '1px solid',
    whiteSpace: 'nowrap',
  },
  actionIconBtn: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
    maxHeight: 'calc(100vh - 360px)',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  emptyCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '18px',
    border: '2px dashed var(--border-subtle)',
    padding: '48px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'var(--bg-sidebar)',
    borderRadius: '16px',
    padding: '18px',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxShadow: 'var(--shadow-md)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8px',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#ffffff',
  },
  cardMsg: {
    fontSize: '13px',
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
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--accent-blue)',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    padding: '3px 8px',
    borderRadius: '8px',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '14px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  presetsSection: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
  },
  presetsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  presetChipBtn: {
    padding: '5px 10px',
    fontSize: '11px',
    fontWeight: 600,
    borderRadius: '8px',
    backgroundColor: 'var(--bg-card-app)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '700',
    marginBottom: '6px',
    color: 'var(--text-secondary)',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '10px',
    paddingTop: '12px',
    borderTop: '1px solid var(--border-subtle)',
  },
};
