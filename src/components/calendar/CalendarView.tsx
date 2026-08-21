import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  RefreshCw,
  Bell,
  MapPin,
  Settings,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  ExternalLink,
  Info,
  Check,
  Globe,
  Plus,
  Trash2,
  X,
  Clock,
  FileText,
  Tag,
  Link as LinkIcon,
  Unlink,
  Eye,
  Search,
} from 'lucide-react';
import type { CalendarEvent, CalendarFeed, NoteItem } from '../../types/index';
import { marked } from 'marked';

interface CalendarViewProps {
  notes?: NoteItem[];
  onRefreshReminders?: () => void;
  onOpenFileViewer?: (file: NoteItem) => void;
  onCreateNote?: (title: string) => Promise<NoteItem>;
}

type ViewMode = 'day' | 'week' | 'month';

// ─── Helpers ────────────────────────────────────────────────
const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAYS_FULL = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

function sameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function startOfWeek(d: Date): Date {
  const s = new Date(d);
  s.setDate(s.getDate() - s.getDay());
  s.setHours(0, 0, 0, 0);
  return s;
}

function isEventAllDay(evt: CalendarEvent): boolean {
  if (!evt) return false;
  if (evt.allDay) return true;
  try {
    const s = new Date(evt.start);
    const e = evt.end ? new Date(evt.end) : new Date(s.getTime() + 60 * 60 * 1000);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return false;
    const diffMs = e.getTime() - s.getTime();
    if (diffMs >= 23 * 60 * 60 * 1000 && s.getHours() === 0 && s.getMinutes() === 0) {
      return true;
    }
  } catch {}
  return false;
}

function fmtTime(iso: string, allDay = false) {
  if (allDay) return 'Dia inteiro';
  if (!iso) return '--:--';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

function fmtDateShort(d: Date) {
  if (!d || isNaN(d.getTime())) return '--/--';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getDuration(s: string, e: string, allDay = false) {
  if (allDay) return 'Dia todo';
  if (!s) return '';
  try {
    const dStart = new Date(s);
    const dEnd = e ? new Date(e) : new Date(dStart.getTime() + 60 * 60 * 1000);
    if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) return '';
    const m = Math.round((dEnd.getTime() - dStart.getTime()) / 60000);
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const rem = m % 60;
      return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
    }
    return m > 0 ? `${m}min` : '';
  } catch {
    return '';
  }
}

const navBtnStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: '8px',
  border: '1px solid var(--border-subtle)',
  backgroundColor: 'var(--bg-card-app)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all .12s ease',
};

const filterPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '5px 12px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  border: '1px solid var(--border-subtle)',
  transition: 'all 0.15s ease',
};

// ─── Component ──────────────────────────────────────────────
export function CalendarView({
  notes: propNotes,
  onRefreshReminders,
  onOpenFileViewer,
  onCreateNote,
}: CalendarViewProps) {
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [feeds, setFeeds] = useState<CalendarFeed[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingFeedId, setSyncingFeedId] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCalendarFilter, setSelectedCalendarFilter] = useState<string>('all');
  const [selectedEventModal, setSelectedEventModal] = useState<CalendarEvent | null>(null);

  const [notes, setNotes] = useState<NoteItem[]>(propNotes || []);
  const [previewNote, setPreviewNote] = useState<{ note: NoteItem; content: string } | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Sincroniza notas quando prop mudar ou carrega do electronAPI
  useEffect(() => {
    if (propNotes && propNotes.length > 0) {
      setNotes(propNotes);
    } else if (window.electronAPI?.getNotes) {
      window.electronAPI.getNotes().then((loaded) => {
        if (Array.isArray(loaded)) setNotes(loaded);
      }).catch(console.error);
    }
  }, [propNotes]);

  const handleToggleLinkNoteToEvent = async (eventId: string, noteId: string) => {
    let updatedLinkedIds: string[] = [];
    if (window.electronAPI?.toggleLinkNoteToEvent) {
      try {
        updatedLinkedIds = await window.electronAPI.toggleLinkNoteToEvent(eventId, noteId);
      } catch (err) {
        console.error(err);
      }
    }

    setAllEvents((prev) =>
      prev.map((e) => {
        if (e.id === eventId || e.id.startsWith(`${eventId}_rec_`)) {
          const current = e.linkedNoteIds || [];
          const next = current.includes(noteId)
            ? current.filter((id) => id !== noteId)
            : [...current, noteId];
          return { ...e, linkedNoteIds: updatedLinkedIds.length > 0 ? updatedLinkedIds : next };
        }
        return e;
      })
    );

    if (
      selectedEventModal &&
      (selectedEventModal.id === eventId || selectedEventModal.id.startsWith(`${eventId}_rec_`))
    ) {
      setSelectedEventModal((prev) => {
        if (!prev) return null;
        const current = prev.linkedNoteIds || [];
        const next = current.includes(noteId)
          ? current.filter((id) => id !== noteId)
          : [...current, noteId];
        return { ...prev, linkedNoteIds: updatedLinkedIds.length > 0 ? updatedLinkedIds : next };
      });
    }
  };

  const handleQuickCreateNoteForEvent = async (event: CalendarEvent) => {
    const title = `Ata de Reunião: ${event.title}`;
    let createdNote: NoteItem | null = null;

    if (onCreateNote) {
      createdNote = await onCreateNote(title);
    } else if (window.electronAPI?.createRichNote) {
      createdNote = await window.electronAPI.createRichNote(title);
    }

    if (createdNote) {
      setNotes((prev) => [createdNote!, ...prev]);
      await handleToggleLinkNoteToEvent(event.id, createdNote.id);
    }
  };

  const handleOpenNotePreview = async (note: NoteItem) => {
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
    if (note.filePath && (window as any).electronAPI?.readNoteContent) {
      try {
        content = (await (window as any).electronAPI.readNoteContent(note.filePath)) || '';
      } catch (e) {
        console.error(e);
      }
    }
    setPreviewNote({ note, content });
  };

  // ── Init ──
  useEffect(() => {
    initCalendar();
  }, []);

  const initCalendar = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const api = window.electronAPI;
      if (!api) {
        setErrorMsg('ElectronAPI não disponível.');
        setLoading(false);
        return;
      }

      // Load feeds list
      if (api.getCalendarFeeds) {
        try {
          const feedList = await api.getCalendarFeeds();
          if (Array.isArray(feedList)) setFeeds(feedList);
        } catch {}
      }

      // Load cached events
      if (api.getCalendarEvents) {
        try {
          const cached = await api.getCalendarEvents();
          if (Array.isArray(cached)) setAllEvents(cached);
        } catch {}
      }

      // Auto initial sync
      if (api.syncCalendar) {
        try {
          const res = await api.syncCalendar();
          if (res && Array.isArray(res.events)) {
            setAllEvents(res.events);
            if (api.getCalendarFeeds) {
              const updatedFeeds = await api.getCalendarFeeds();
              if (Array.isArray(updatedFeeds)) setFeeds(updatedFeeds);
            }
            if (onRefreshReminders) onRefreshReminders();
          }
        } catch {}
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao carregar calendário.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setLoading(true);
    setSyncMsg('');
    setErrorMsg('');
    try {
      const api = window.electronAPI;
      if (!api?.syncCalendar) {
        setErrorMsg('API de sincronização indisponível.');
        setLoading(false);
        return;
      }
      const res = await api.syncCalendar();
      if (res && Array.isArray(res.events)) {
        setAllEvents(res.events);
        if (api.getCalendarFeeds) {
          const updatedFeeds = await api.getCalendarFeeds();
          if (Array.isArray(updatedFeeds)) setFeeds(updatedFeeds);
        }
        setSyncMsg(
          `Sincronizado com sucesso! ${res.events.length} compromissos encontrados (${res.remindersCreated || 0} lembretes atualizados).`
        );
        if (onRefreshReminders) onRefreshReminders();
      }
    } catch (err: any) {
      setErrorMsg('Erro: ' + (err?.message || 'desconhecido'));
    } finally {
      setLoading(false);
      setTimeout(() => setSyncMsg(''), 6000);
    }
  };

  const handleSyncSingleFeed = async (feed: CalendarFeed) => {
    if (!feed.url.trim()) {
      setErrorMsg(`Por favor, insira o link da agenda "${feed.name}" antes de sincronizar.`);
      return;
    }
    setSyncingFeedId(feed.id);
    setSyncMsg('');
    setErrorMsg('');
    try {
      const api = window.electronAPI;
      if (!api?.syncCalendar) return;
      const res = await api.syncCalendar(feed.url.trim(), feed.id);
      if (res && Array.isArray(res.events)) {
        setAllEvents(res.events);
        if (api.getCalendarFeeds) {
          const updatedFeeds = await api.getCalendarFeeds();
          if (Array.isArray(updatedFeeds)) setFeeds(updatedFeeds);
        }
        setSyncMsg(`Agenda "${feed.name}" sincronizada com sucesso!`);
        if (onRefreshReminders) onRefreshReminders();
      }
    } catch (err: any) {
      setErrorMsg(`Erro ao sincronizar "${feed.name}": ` + (err?.message || ''));
    } finally {
      setSyncingFeedId(null);
      setTimeout(() => setSyncMsg(''), 6000);
    }
  };

  const handleSaveFeed = async (feedData: Partial<CalendarFeed> & { id: string }) => {
    try {
      const api = window.electronAPI;
      if (!api?.saveCalendarFeed) return;
      const updatedFeeds = await api.saveCalendarFeed(feedData);
      if (Array.isArray(updatedFeeds)) setFeeds(updatedFeeds);
    } catch (err: any) {
      setErrorMsg('Erro ao salvar configuração: ' + (err?.message || ''));
    }
  };

  // ── Filter: 6 months past → 6 months future ──
  const baseFilteredEvents = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    const sixMonthsAhead = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
    return (Array.isArray(allEvents) ? allEvents : [])
      .filter((e) => {
        if (!e || !e.start || !e.title) return false;
        try {
          const d = new Date(e.start);
          return !isNaN(d.getTime()) && d >= sixMonthsAgo && d <= sixMonthsAhead;
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [allEvents]);

  // ── Apply Calendar Selector Filter ──
  const filteredEvents = useMemo(() => {
    if (selectedCalendarFilter === 'all') {
      return baseFilteredEvents;
    }
    return baseFilteredEvents.filter((e) => e.calendarId === selectedCalendarFilter);
  }, [baseFilteredEvents, selectedCalendarFilter]);

  // Counts by calendar feed
  const calendarCounts = useMemo(() => {
    const counts: Record<string, number> = { all: baseFilteredEvents.length };
    for (const feed of feeds) {
      counts[feed.id] = baseFilteredEvents.filter((e) => e.calendarId === feed.id).length;
    }
    return counts;
  }, [baseFilteredEvents, feeds]);

  // ── Navigation ──
  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + dir);
    else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  // ── Navigation label ──
  const navLabel = useMemo(() => {
    if (viewMode === 'day') {
      return `${WEEKDAYS_FULL[currentDate.getDay()]}, ${currentDate.getDate()} de ${MONTHS_PT[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
    } else if (viewMode === 'week') {
      const ws = startOfWeek(currentDate);
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      return `${fmtDateShort(ws)} – ${fmtDateShort(we)} ${MONTHS_PT[ws.getMonth()]} ${ws.getFullYear()}`;
    } else {
      return `${MONTHS_PT[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  }, [viewMode, currentDate]);

  // ── Events for current view ──
  const viewEvents = useMemo(() => {
    if (viewMode === 'day') {
      return filteredEvents.filter((e) => {
        try {
          return sameDay(new Date(e.start), currentDate);
        } catch {
          return false;
        }
      });
    } else if (viewMode === 'week') {
      const ws = startOfWeek(currentDate);
      const we = new Date(ws);
      we.setDate(we.getDate() + 7);
      return filteredEvents.filter((e) => {
        try {
          const d = new Date(e.start);
          return d >= ws && d < we;
        } catch {
          return false;
        }
      });
    } else {
      const ms = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const me = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      return filteredEvents.filter((e) => {
        try {
          const d = new Date(e.start);
          return d >= ms && d <= me;
        } catch {
          return false;
        }
      });
    }
  }, [filteredEvents, viewMode, currentDate]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        height: '100%',
        backgroundColor: 'var(--bg-main)',
        padding: '24px 28px',
        overflowY: 'auto',
        gap: '16px',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
            }}
          >
            <CalendarIcon size={22} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0 }}>
                Agenda & Calendários
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: 'var(--text-secondary)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                Outlook + Google ICS
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              {filteredEvents.length} eventos no horizonte • Visualização com resolução de conflitos
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowSettings(!showSettings)}
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              gap: '6px',
              backgroundColor: showSettings ? 'rgba(99,102,241,0.2)' : undefined,
              borderColor: showSettings ? 'var(--accent-primary)' : undefined,
            }}
          >
            <Settings size={14} /> Gerenciar Feeds ICS
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSyncAll}
            disabled={loading}
            style={{ padding: '7px 16px', fontSize: '12px', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin-anim' : ''} /> Sincronizar Tudo
          </button>
        </div>
      </div>

      {/* Messages */}
      {syncMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: '10px',
            color: '#10b981',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} />
          {syncMsg}
        </div>
      )}
      {errorMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px',
            color: '#f87171',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* ── Settings Panel: Manage Feeds (Outlook + Google) ── */}
      {showSettings && (
        <FeedManagerPanel
          feeds={feeds}
          syncingFeedId={syncingFeedId}
          onSaveFeed={handleSaveFeed}
          onSyncFeed={handleSyncSingleFeed}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* ── Calendar Selector Bar (Todas / Outlook / Google) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '10px 14px',
          backgroundColor: 'var(--bg-card-app)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Calendar Feed Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginRight: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Layers size={13} /> Agendas:
          </span>

          {/* Option: All Calendars */}
          <button
            onClick={() => setSelectedCalendarFilter('all')}
            style={{
              ...filterPillStyle,
              backgroundColor:
                selectedCalendarFilter === 'all'
                  ? 'var(--accent-primary)'
                  : 'rgba(255,255,255,0.05)',
              color: selectedCalendarFilter === 'all' ? '#fff' : 'var(--text-secondary)',
              borderColor:
                selectedCalendarFilter === 'all'
                  ? 'var(--accent-primary)'
                  : 'var(--border-subtle)',
            }}
          >
            <span>🌟 Todas as Agendas</span>
            <span
              style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor:
                  selectedCalendarFilter === 'all'
                    ? 'rgba(255,255,255,0.25)'
                    : 'rgba(255,255,255,0.08)',
                color: '#fff',
              }}
            >
              {calendarCounts.all || 0}
            </span>
          </button>

          {/* Feeds Options */}
          {feeds.map((f) => {
            const isSelected = selectedCalendarFilter === f.id;
            const count = calendarCounts[f.id] || 0;
            const isGoogle = f.id === 'google' || f.type === 'google';
            const isOutlook = f.id === 'outlook' || f.type === 'outlook';

            return (
              <button
                key={f.id}
                onClick={() => setSelectedCalendarFilter(f.id)}
                style={{
                  ...filterPillStyle,
                  backgroundColor: isSelected
                    ? f.color || (isGoogle ? '#10b981' : '#6366f1')
                    : 'rgba(255,255,255,0.05)',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  borderColor: isSelected
                    ? f.color || (isGoogle ? '#10b981' : '#6366f1')
                    : 'var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: f.color || (isGoogle ? '#10b981' : '#6366f1'),
                  }}
                />
                <span>
                  {isOutlook
                    ? '🏢 Microsoft Outlook'
                    : isGoogle
                    ? '🟢 Google Calendar'
                    : f.name}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: isSelected
                      ? 'rgba(255,255,255,0.25)'
                      : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sync Info Indicator */}
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Exibindo:</span>
          <strong style={{ color: '#fff' }}>
            {selectedCalendarFilter === 'all'
              ? 'Visão Unificada (Todas)'
              : feeds.find((f) => f.id === selectedCalendarFilter)?.name || selectedCalendarFilter}
          </strong>
        </div>
      </div>

      {/* ── View Controls (Day / Week / Month + Navigation) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Mode Switcher */}
        <div
          style={{
            display: 'flex',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {(['day', 'week', 'month'] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              style={{
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: viewMode === m ? 'var(--accent-primary)' : 'var(--bg-card-app)',
                color: viewMode === m ? '#fff' : 'var(--text-secondary)',
                transition: 'all .15s ease',
              }}
            >
              {m === 'day' ? 'Dia' : m === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>

        {/* Date Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => navigate(-1)} style={navBtnStyle}>
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToday}
            style={{ ...navBtnStyle, padding: '6px 14px', fontSize: '12px', fontWeight: 700 }}
          >
            Hoje
          </button>
          <button onClick={() => navigate(1)} style={navBtnStyle}>
            <ChevronRight size={18} />
          </button>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#fff',
              marginLeft: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            {navLabel}
          </span>
        </div>
      </div>

      {/* ── View Content ── */}
      {viewMode === 'day' && (
        <DayView
          events={viewEvents}
          date={currentDate}
          isMultiCalendar={selectedCalendarFilter === 'all'}
          onEventClick={(evt) => setSelectedEventModal(evt)}
        />
      )}
      {viewMode === 'week' && (
        <WeekView
          events={viewEvents}
          currentDate={currentDate}
          isMultiCalendar={selectedCalendarFilter === 'all'}
          onSelectDay={(d) => {
            setCurrentDate(d);
            setViewMode('day');
          }}
          onEventClick={(evt) => setSelectedEventModal(evt)}
        />
      )}
      {viewMode === 'month' && (
        <MonthView
          events={viewEvents}
          currentDate={currentDate}
          allFiltered={filteredEvents}
          isMultiCalendar={selectedCalendarFilter === 'all'}
          onSelectDay={(d) => {
            setCurrentDate(d);
            setViewMode('day');
          }}
          onEventClick={(evt) => setSelectedEventModal(evt)}
        />
      )}

      {/* ── Event Details Modal ── */}
      {selectedEventModal && (
        <EventDetailsModal
          event={selectedEventModal}
          notes={notes}
          onClose={() => setSelectedEventModal(null)}
          onRefreshReminders={onRefreshReminders}
          onToggleLinkNote={handleToggleLinkNoteToEvent}
          onOpenFileViewer={onOpenFileViewer}
          onOpenNotePreview={handleOpenNotePreview}
          onCreateNoteForEvent={handleQuickCreateNoteForEvent}
        />
      )}

      {/* ── Note Preview Modal inside Calendar ── */}
      {previewNote && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setPreviewNote(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '650px',
              maxHeight: '80vh',
              backgroundColor: 'var(--bg-card-app)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="var(--accent-primary)" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                  {previewNote.note.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewNote(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, backgroundColor: 'var(--bg-main)' }}>
              {(() => {
                const raw = previewNote.content || '';
                if (!raw.trim()) {
                  return (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, fontStyle: 'italic' }}>
                      Esta anotação está vazia.
                    </p>
                  );
                }
                const isHtml = /<[a-z][\s\S]*>/i.test(raw);
                const htmlToRender = isHtml ? raw : (marked.parse(raw) as string);
                return (
                  <div
                    className="note-rendered-content"
                    style={{
                      fontSize: '13.5px',
                      lineHeight: 1.65,
                      color: 'var(--text-primary)',
                      wordBreak: 'break-word',
                    }}
                    dangerouslySetInnerHTML={{ __html: htmlToRender }}
                  />
                );
              })()}
            </div>
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(0,0,0,0.2)',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {previewNote.note.format === 'richtext' ? 'Anotação RichText' : 'Documento Markdown'}
              </span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setPreviewNote(null)}
                style={{ fontSize: '12px', padding: '6px 16px' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  TIMELINE & CONFLICT RESOLUTION ALGORITHM
// ═══════════════════════════════════════════════════════════
const HOUR_HEIGHT = 60; // 60px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HEADER_COLLISION_HOURS = 0.65; // ~39 minutos (área crítica onde o nome e horário são impressos no card)

interface LayoutEvent {
  event: CalendarEvent;
  topPx: number;
  heightPx: number;
  colIndex: number;
  totalCols: number;
  zIndex: number;
  layer: number;
  hasChildrenAbove: boolean;
  startH: number;
  endH: number;
  isOngoing: boolean;
  isAllDay: boolean;
}

function computeEventLayout(dayEvents: CalendarEvent[], day: Date, now: Date): LayoutEvent[] {
  if (!dayEvents || !Array.isArray(dayEvents) || dayEvents.length === 0) return [];

  const parsed: LayoutEvent[] = [];

  for (const evt of dayEvents) {
    if (!evt || !evt.start) continue;
    const s = new Date(evt.start);
    if (isNaN(s.getTime())) continue;

    let e = evt.end ? new Date(evt.end) : new Date(s.getTime() + 60 * 60 * 1000);
    if (isNaN(e.getTime()) || e.getTime() <= s.getTime()) {
      e = new Date(s.getTime() + 60 * 60 * 1000);
    }

    const isAllDay = isEventAllDay(evt);

    let startH = s.getHours() + s.getMinutes() / 60;
    let endH = e.getHours() + e.getMinutes() / 60;

    if (isNaN(startH)) startH = 0;
    if (isNaN(endH)) endH = startH + 1;

    // Normalize cross-day boundaries
    if (!sameDay(s, day) && s < day) startH = 0;
    if (!sameDay(e, day) && e > day) endH = 24;
    if (endH <= startH) endH = Math.min(startH + 0.5, 24);

    const durH = Math.max(endH - startH, 0.35); // minimum height ~21px
    const topPx = Math.max(0, startH * HOUR_HEIGHT);
    const heightPx = Math.max(20, durH * HOUR_HEIGHT);

    const isTdy = sameDay(day, now);
    const n = now.getTime();
    const isOngoing = isTdy && n >= s.getTime() && n <= e.getTime();

    parsed.push({
      event: evt,
      startH,
      endH,
      topPx,
      heightPx,
      colIndex: 0,
      totalCols: 1,
      zIndex: 5,
      layer: 0,
      hasChildrenAbove: false,
      isOngoing,
      isAllDay,
    });
  }

  // Sort by start time ascending, and longer duration first
  parsed.sort((a, b) => {
    if (Math.abs(a.startH - b.startH) > 0.001) return a.startH - b.startH;
    return (b.endH - b.startH) - (a.endH - a.startH);
  });

  // Cluster only when an event starts close enough to cover the header (name & time) of another event
  const clusters: (typeof parsed)[] = [];
  let currentCluster: typeof parsed = [];
  let clusterHeaderLimit = -1;

  for (const item of parsed) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterHeaderLimit = item.startH + HEADER_COLLISION_HOURS;
    } else {
      // Only split into side-by-side columns if the start of this item collides with the header area of the cluster
      if (item.startH < clusterHeaderLimit) {
        currentCluster.push(item);
        clusterHeaderLimit = Math.max(clusterHeaderLimit, item.startH + HEADER_COLLISION_HOURS);
      } else {
        clusters.push(currentCluster);
        currentCluster = [item];
        clusterHeaderLimit = item.startH + HEADER_COLLISION_HOURS;
      }
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Allocate columns per header-collision cluster
  const result: LayoutEvent[] = [];

  for (const cluster of clusters) {
    const columns: number[] = [];

    for (const item of cluster) {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        if (item.startH >= columns[i]) {
          item.colIndex = i;
          columns[i] = item.endH;
          placed = true;
          break;
        }
      }
      if (!placed) {
        item.colIndex = columns.length;
        columns.push(item.endH);
      }
    }

    const totalCols = columns.length;
    for (const item of cluster) {
      item.totalCols = totalCols;
      result.push(item);
    }
  }

  // Second pass: compute layer nesting and whether an event is a background event with smaller child events over it
  for (const item of result) {
    let layer = 0;
    let hasChildrenAbove = false;
    const itemDur = item.endH - item.startH;

    for (const other of result) {
      if (other === item) continue;
      const otherDur = other.endH - other.startH;
      const overlaps = other.startH < item.endH - 0.01 && other.endH > item.startH + 0.01;

      if (overlaps) {
        // Se 'other' é mais longo e engloba ou sobrepõe 'item', 'item' sobe de camada
        if (otherDur > itemDur + 0.25 || (Math.abs(otherDur - itemDur) <= 0.25 && other.startH < item.startH)) {
          layer++;
        }
        // Se 'other' é mais curto e está contido em 'item', 'item' tem eventos acima dele
        if (itemDur > otherDur + 0.25 || (Math.abs(itemDur - otherDur) <= 0.25 && item.startH < other.startH)) {
          hasChildrenAbove = true;
        }
      }
    }

    item.layer = layer;
    item.hasChildrenAbove = hasChildrenAbove;
    const layerBase = layer * 100 + 10;
    item.zIndex = layerBase + Math.min(60, Math.floor(item.startH * 2)) + item.colIndex;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════
//  TIMELINE VIEW (With All-Day Header & Side-by-Side Conflicts)
// ═══════════════════════════════════════════════════════════
function TimelineView({
  days,
  events,
  isMultiCalendar,
  onSelectDay,
  onEventClick,
}: {
  days: Date[];
  events: CalendarEvent[];
  isMultiCalendar?: boolean;
  onSelectDay: (d: Date) => void;
  onEventClick: (evt: CalendarEvent) => void;
}) {
  const [now, setNow] = useState(new Date());
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll to current hour or ~8 AM
  useEffect(() => {
    if (scrollRef.current) {
      const scrollHour = Math.max(0, now.getHours() - 1);
      scrollRef.current.scrollTop = scrollHour * HOUR_HEIGHT;
    }
  }, []);

  const isCurrentWeek = days.some((d) => sameDay(d, now));
  const todayIndex = days.findIndex((d) => sameDay(d, now));
  const currentHourFloat = now.getHours() + now.getMinutes() / 60;
  const nowTopPx = currentHourFloat * HOUR_HEIGHT;
  const numColumns = days.length;

  // Separate all-day events vs timed events
  const allDayEventsByDay = useMemo(() => {
    return days.map((day) => {
      return events.filter((e) => {
        try {
          return sameDay(new Date(e.start), day) && isEventAllDay(e);
        } catch {
          return false;
        }
      });
    });
  }, [days, events]);

  const hasAnyAllDay = allDayEventsByDay.some((arr) => arr.length > 0);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-card-app)',
        overflow: 'hidden',
      }}
    >
      {/* ── Sticky Header: Weekdays ── */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(0,0,0,0.2)',
        }}
      >
        {/* Hours Column Header Space */}
        <div
          style={{
            width: '55px',
            flexShrink: 0,
            borderRight: '1px solid var(--border-subtle)',
            padding: '12px 6px',
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-muted)',
          }}
        />

        {/* Days Header Columns */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))`,
          }}
        >
          {days.map((day, di) => {
            const isTdy = sameDay(day, now);
            return (
              <div
                key={di}
                onClick={() => onSelectDay(day)}
                style={{
                  padding: '10px 6px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderRight: di < numColumns - 1 ? '1px solid var(--border-subtle)' : 'none',
                  backgroundColor: isTdy ? 'rgba(99,102,241,0.08)' : 'transparent',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isTdy ? 'var(--accent-primary)' : 'var(--text-muted)',
                    textTransform: 'capitalize',
                  }}
                >
                  {WEEKDAYS_FULL[day.getDay()]}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: isTdy ? '#fff' : 'var(--text-main)',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isTdy ? 'var(--accent-primary)' : 'transparent',
                    }}
                  >
                    {day.getDate()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Dedicated All-Day Row (Google / Outlook Style) ── */}
      {hasAnyAllDay && (
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(0,0,0,0.12)',
            minHeight: '36px',
          }}
        >
          <div
            style={{
              width: '55px',
              flexShrink: 0,
              borderRight: '1px solid var(--border-subtle)',
              padding: '6px 4px',
              textAlign: 'center',
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Dia todo
          </div>

          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))`,
            }}
          >
            {days.map((day, di) => {
              const dayAllDay = allDayEventsByDay[di] || [];
              return (
                <div
                  key={di}
                  style={{
                    padding: '4px 6px',
                    borderRight: di < numColumns - 1 ? '1px solid var(--border-subtle)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    minWidth: 0,
                  }}
                >
                  {dayAllDay.map((evt) => {
                    const isGoogle = evt.calendarId === 'google';
                    const pillColor = evt.color || (isGoogle ? '#10b981' : '#6366f1');

                    return (
                      <div
                        key={evt.id}
                        onClick={() => onEventClick(evt)}
                        title={`${evt.title} (${evt.calendarName || (isGoogle ? 'Google' : 'Outlook')})`}
                        style={{
                          backgroundColor: isGoogle ? 'rgba(16,185,129,0.25)' : 'rgba(99,102,241,0.25)',
                          borderLeft: `3px solid ${pillColor}`,
                          borderRadius: '4px',
                          padding: '3px 6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#fff',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          transition: 'transform 0.1s ease',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {evt.title}
                        </span>
                        {isMultiCalendar && (
                          <span
                            style={{
                              fontSize: '8px',
                              padding: '1px 3px',
                              borderRadius: '3px',
                              backgroundColor: pillColor,
                              color: '#fff',
                              flexShrink: 0,
                            }}
                          >
                            {isGoogle ? 'Google' : 'Outlook'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Scrollable Timeline Grid Container ── */}
      <div
        ref={scrollRef}
        style={{
          height: '620px',
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', position: 'relative', height: `${24 * HOUR_HEIGHT}px` }}>
          {/* ── Left Column: Hours Labels ── */}
          <div
            style={{
              width: '55px',
              flexShrink: 0,
              position: 'relative',
              borderRight: '1px solid var(--border-subtle)',
              backgroundColor: 'rgba(0,0,0,0.1)',
            }}
          >
            {HOURS.map((h) => (
              <div
                key={h}
                style={{
                  position: 'absolute',
                  top: `${h * HOUR_HEIGHT - 8}px`,
                  right: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  userSelect: 'none',
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* ── Timeline Grid (Columns + Events + Gridlines) ── */}
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))`,
              position: 'relative',
              height: '100%',
            }}
          >
            {/* Horizontal Gridlines */}
            {HOURS.map((h) => (
              <React.Fragment key={h}>
                <div
                  style={{
                    position: 'absolute',
                    top: `${h * HOUR_HEIGHT}px`,
                    left: 0,
                    right: 0,
                    height: '1px',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    pointerEvents: 'none',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: `${h * HOUR_HEIGHT + 30}px`,
                    left: 0,
                    right: 0,
                    height: '1px',
                    borderTop: '1px dashed rgba(255,255,255,0.035)',
                    pointerEvents: 'none',
                  }}
                />
              </React.Fragment>
            ))}

            {/* Current Time Horizontal Line */}
            {isCurrentWeek && (
              <div
                style={{
                  position: 'absolute',
                  top: `${nowTopPx}px`,
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left:
                      todayIndex !== -1
                        ? `calc(${(todayIndex / numColumns) * 100}% - 5px)`
                        : '-5px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#818cf8',
                    boxShadow: '0 0 8px #818cf8, 0 0 14px #818cf8',
                    zIndex: 21,
                  }}
                />
                <div
                  style={{
                    width: '100%',
                    height: '2px',
                    backgroundColor: '#818cf8',
                    boxShadow: '0 0 8px rgba(129, 140, 248, 0.8)',
                  }}
                />
              </div>
            )}

            {/* ── Day Columns ── */}
            {days.map((day, di) => {
              // Exclude all-day events from the timed grid
              const timedDayEvts = events.filter((e) => {
                try {
                  return sameDay(new Date(e.start), day) && !isEventAllDay(e);
                } catch {
                  return false;
                }
              });

              // Compute collision resolution layout (side-by-side columns)
              const layoutItems = computeEventLayout(timedDayEvts, day, now);
              const isTdy = sameDay(day, now);

              return (
                <div
                  key={di}
                  style={{
                    position: 'relative',
                    height: '100%',
                    borderRight: di < numColumns - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    backgroundColor: isTdy ? 'rgba(99,102,241,0.03)' : 'transparent',
                    minWidth: 0,
                  }}
                >
                  {/* Positioned Events Side-by-Side when in conflict */}
                  {layoutItems.map((item, i) => {
                    const evt = item.event;
                    const isHovered = hoveredEventId === evt.id;
                    const isGoogle = evt.calendarId === 'google';
                    const baseAccent = evt.color || (isGoogle ? '#10b981' : '#6366f1');

                    const bgColor = item.isOngoing
                      ? 'rgba(239, 68, 68, 0.32)'
                      : isGoogle
                      ? 'rgba(16, 185, 129, 0.24)'
                      : 'rgba(99, 102, 241, 0.24)';

                    const borderLeftColor = item.isOngoing ? '#ef4444' : baseAccent;

                    // Compute dynamic left and width based on cluster columns
                    const colWidthPct = 100 / item.totalCols;
                    const colLeftPct = item.colIndex * colWidthPct;

                    const widthStyle =
                      item.totalCols > 1
                        ? `calc(${colWidthPct}% - 4px)`
                        : 'calc(100% - 6px)';
                    const leftStyle =
                      item.totalCols > 1
                        ? `calc(${colLeftPct}% + 2px)`
                        : '3px';

                    const hoverZIndex = item.hasChildrenAbove
                      ? item.zIndex + 20
                      : item.zIndex + 500;
                    const finalZIndex = isHovered ? hoverZIndex : item.isOngoing ? item.zIndex + 5 : item.zIndex;

                    return (
                      <div
                        key={`${evt.id}-${i}`}
                        onClick={() => onEventClick(evt)}
                        onMouseEnter={() => setHoveredEventId(evt.id)}
                        onMouseLeave={() => setHoveredEventId(null)}
                        title={`${fmtTime(evt.start)} - ${fmtTime(evt.end)}: ${evt.title}${evt.location ? ` • ${evt.location}` : ''} (${evt.calendarName || (isGoogle ? 'Google' : 'Outlook')})`}
                        style={{
                          position: 'absolute',
                          top: `${item.topPx}px`,
                          height: `${Math.max(item.heightPx - 2, 22)}px`,
                          left: leftStyle,
                          width: widthStyle,
                          backgroundColor: bgColor,
                          borderLeft: `4px solid ${borderLeftColor}`,
                          borderRadius: '6px',
                          padding: item.totalCols > 2 ? '2px 4px' : '4px 7px',
                          overflow: 'hidden',
                          boxSizing: 'border-box',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#ffffff',
                          cursor: 'pointer',
                          boxShadow: isHovered
                            ? '0 6px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.25)'
                            : item.zIndex > 5
                            ? '0 3px 8px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)'
                            : '0 2px 6px rgba(0,0,0,0.25)',
                          transform: isHovered && item.totalCols > 1 ? 'scale(1.03)' : 'none',
                          zIndex: finalZIndex,
                          transition: 'box-shadow 0.12s ease, transform 0.12s ease',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '4px',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: item.totalCols > 2 ? '10px' : '11px',
                              color: '#fff',
                            }}
                          >
                            {evt.title}
                          </div>
                          {isMultiCalendar && item.totalCols <= 2 && (
                            <span
                              style={{
                                fontSize: '8px',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                backgroundColor: isGoogle
                                  ? 'rgba(16, 185, 129, 0.45)'
                                  : 'rgba(99, 102, 241, 0.45)',
                                color: '#fff',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              {isGoogle ? 'Google' : 'Outlook'}
                            </span>
                          )}
                        </div>

                        {item.heightPx >= 34 && (
                          <div
                            style={{
                              fontSize: '10px',
                              color: 'rgba(255,255,255,0.8)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginTop: '2px',
                            }}
                          >
                            {fmtTime(evt.start)} - {fmtTime(evt.end)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  DAY VIEW
// ═══════════════════════════════════════════════════════════
function DayView({
  events,
  date,
  isMultiCalendar,
  onEventClick,
}: {
  events: CalendarEvent[];
  date: Date;
  isMultiCalendar?: boolean;
  onEventClick: (evt: CalendarEvent) => void;
}) {
  return (
    <TimelineView
      days={[date]}
      events={events}
      isMultiCalendar={isMultiCalendar}
      onSelectDay={() => {}}
      onEventClick={onEventClick}
    />
  );
}

// ═══════════════════════════════════════════════════════════
//  WEEK VIEW
// ═══════════════════════════════════════════════════════════
function WeekView({
  events,
  currentDate,
  isMultiCalendar,
  onSelectDay,
  onEventClick,
}: {
  events: CalendarEvent[];
  currentDate: Date;
  isMultiCalendar?: boolean;
  onSelectDay: (d: Date) => void;
  onEventClick: (evt: CalendarEvent) => void;
}) {
  const ws = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <TimelineView
      days={days}
      events={events}
      isMultiCalendar={isMultiCalendar}
      onSelectDay={onSelectDay}
      onEventClick={onEventClick}
    />
  );
}

// ═══════════════════════════════════════════════════════════
//  MONTH VIEW
// ═══════════════════════════════════════════════════════════
function MonthView({
  currentDate,
  allFiltered,
  isMultiCalendar,
  onSelectDay,
  onEventClick,
}: {
  events: CalendarEvent[];
  currentDate: Date;
  allFiltered: CalendarEvent[];
  isMultiCalendar?: boolean;
  onSelectDay: (d: Date) => void;
  onEventClick: (evt: CalendarEvent) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay(); // 0=Sun
  const totalDays = lastDay.getDate();
  const today = new Date();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsForDay = (day: Date) =>
    allFiltered.filter((e) => {
      try {
        return sameDay(new Date(e.start), day);
      } catch {
        return false;
      }
    });

  return (
    <div style={{ width: '100%' }}>
      {/* Weekday headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: '4px',
          marginBottom: '4px',
          width: '100%',
        }}
      >
        {WEEKDAYS_SHORT.map((w) => (
          <div
            key={w}
            style={{
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              padding: '6px 0',
              textTransform: 'uppercase',
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: '4px',
          width: '100%',
        }}
      >
        {cells.map((day, i) => {
          if (!day)
            return (
              <div
                key={`empty-${i}`}
                style={{
                  minHeight: '80px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px',
                }}
              />
            );
          const isTdy = sameDay(day, today);
          const dayEvts = eventsForDay(day);

          return (
            <div
              key={i}
              onClick={() => onSelectDay(day)}
              style={{
                minHeight: '80px',
                padding: '6px',
                cursor: 'pointer',
                borderRadius: '8px',
                backgroundColor: isTdy ? 'rgba(99,102,241,0.1)' : 'var(--bg-card-app)',
                border: isTdy ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                transition: 'all .12s ease',
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: isTdy ? 800 : 600,
                  color: isTdy ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  textAlign: 'right',
                }}
              >
                {day.getDate()}
              </span>

              {dayEvts.slice(0, 3).map((evt, j) => {
                const isGoogle = evt.calendarId === 'google';
                const isAllDay = isEventAllDay(evt);
                const pillColor = evt.color || (isGoogle ? '#10b981' : '#6366f1');

                return (
                  <div
                    key={`${evt.id}-${j}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(evt);
                    }}
                    title={`${fmtTime(evt.start, isAllDay)} - ${evt.title} (${evt.calendarName || (isGoogle ? 'Google' : 'Outlook')})`}
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#fff',
                      backgroundColor: pillColor,
                      borderRadius: '4px',
                      padding: '1px 4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      width: '100%',
                      boxSizing: 'border-box',
                      minWidth: 0,
                    }}
                  >
                    {fmtTime(evt.start, isAllDay)} {evt.title}
                  </div>
                );
              })}
              {dayEvts.length > 3 && (
                <span
                  style={{
                    fontSize: '9px',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    fontWeight: 700,
                  }}
                >
                  +{dayEvts.length - 3}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  EVENT DETAILS MODAL
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  EVENT NOTE PICKER MODAL (Vincular Anotações à Reunião)
// ═══════════════════════════════════════════════════════════
interface EventNotePickerModalProps {
  notes: NoteItem[];
  linkedNoteIds: string[];
  onToggleLinkNote: (noteId: string) => Promise<void>;
  onClose: () => void;
}

function EventNotePickerModal({
  notes,
  linkedNoteIds,
  onToggleLinkNote,
  onClose,
}: EventNotePickerModalProps) {
  const [search, setSearch] = useState('');

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => !search.trim() || n.title.toLowerCase().includes(search.toLowerCase()));
  }, [notes, search]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 10050,
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
          maxWidth: '520px',
          maxHeight: '80vh',
          backgroundColor: 'var(--bg-card-app)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255,255,255,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={17} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#fff' }}>
              Vincular Anotações a esta Reunião
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar anotação ou documento..."
              style={{ paddingLeft: '32px', fontSize: '12px' }}
              autoFocus
            />
          </div>
        </div>

        {/* Notes List */}
        <div style={{ padding: '12px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filteredNotes.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Nenhuma anotação encontrada.
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isLinked = linkedNoteIds.includes(note.id);
              const isFile =
                note.format === 'file' ||
                ['pdf', 'docx', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'webp'].includes(
                  ((note.filePath || note.title || '').split('.').pop() || '').toLowerCase()
                );
              const ext = (note.title.split('.').pop() || 'NOTA').toUpperCase();

              return (
                <div
                  key={note.id}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: isLinked ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255,255,255,0.03)',
                    border: isLinked ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
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
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {note.title}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={isLinked ? 'btn btn-secondary' : 'btn btn-primary'}
                    onClick={() => onToggleLinkNote(note.id)}
                    style={{ fontSize: '11px', padding: '4px 10px', flexShrink: 0, gap: '4px' }}
                  >
                    {isLinked ? (
                      <>
                        <Check size={12} color="#10b981" /> Vinculada
                      </>
                    ) : (
                      <>
                        <Plus size={12} /> Vincular
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.2)',
          }}
        >
          <button type="button" className="btn btn-primary" onClick={onClose} style={{ fontSize: '12px', padding: '6px 16px' }}>
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  EVENT DETAILS MODAL
// ═══════════════════════════════════════════════════════════
interface EventDetailsModalProps {
  event: CalendarEvent;
  notes?: NoteItem[];
  onClose: () => void;
  onRefreshReminders?: () => void;
  onToggleLinkNote?: (eventId: string, noteId: string) => Promise<void>;
  onOpenFileViewer?: (file: NoteItem) => void;
  onOpenNotePreview?: (note: NoteItem) => void;
  onCreateNoteForEvent?: (event: CalendarEvent) => Promise<void>;
}

function EventDetailsModal({
  event,
  notes = [],
  onClose,
  onRefreshReminders,
  onToggleLinkNote,
  onOpenFileViewer,
  onOpenNotePreview,
  onCreateNoteForEvent,
}: EventDetailsModalProps) {
  const isGoogle = event.calendarId === 'google';
  const isAllDay = isEventAllDay(event);
  const accentColor = event.color || (isGoogle ? '#10b981' : '#6366f1');
  const dur = getDuration(event.start, event.end, isAllDay);
  const [reminderCreated, setReminderCreated] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const linkedNoteIds = event.linkedNoteIds || [];
  const linkedNotes = useMemo(() => {
    return notes.filter((n) => linkedNoteIds.includes(n.id));
  }, [notes, linkedNoteIds]);

  const handleCreateQuickReminder = async () => {
    try {
      const api = window.electronAPI;
      if (!api?.saveReminder) return;

      const schedTime = event.start;
      await api.saveReminder({
        title: `⏰ Lembrete: ${event.title}`,
        message: `Compromisso agendado para ${new Date(event.start).toLocaleString('pt-BR')}`,
        recurrence: 'ONCE',
        scheduledTime: schedTime,
        enabled: true,
      });

      setReminderCreated(true);
      if (onRefreshReminders) onRefreshReminders();
      setTimeout(() => setReminderCreated(false), 3000);
    } catch (err) {
      console.error('Erro ao criar lembrete rápido:', err);
    }
  };

  const handleNoteClick = (note: NoteItem) => {
    const isFile =
      note.format === 'file' ||
      ['pdf', 'docx', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'webp'].includes(
        ((note.filePath || note.title || '').split('.').pop() || '').toLowerCase()
      );
    if (isFile && onOpenFileViewer) {
      onOpenFileViewer(note);
    } else if (onOpenNotePreview) {
      onOpenNotePreview(note);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
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
          maxWidth: '540px',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-card-app)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Color Accent Stripe */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: isGoogle ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)',
            borderBottom: '1px solid var(--border-subtle)',
            borderTop: `4px solid ${accentColor}`,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: accentColor,
                  color: '#fff',
                }}
              >
                {event.calendarName || (isGoogle ? 'Google Calendar' : 'Microsoft Outlook')}
              </span>
              {isAllDay && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                >
                  Dia Inteiro
                </span>
              )}
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>
              {event.title}
            </h3>
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
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Time and Date */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: accentColor,
                flexShrink: 0,
              }}
            >
              <Clock size={16} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                {new Date(event.start).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {isAllDay
                  ? 'Compromisso de dia inteiro'
                  : `${fmtTime(event.start)} até ${fmtTime(event.end)}${dur ? ` (${dur})` : ''}`}
              </div>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3b82f6',
                  flexShrink: 0,
                }}
              >
                <MapPin size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Local / Link</div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginTop: '2px',
                    wordBreak: 'break-word',
                  }}
                >
                  {event.location.startsWith('http') ? (
                    <a
                      href={event.location}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#60a5fa', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      Acessar Reunião <ExternalLink size={12} />
                    </a>
                  ) : (
                    event.location
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                <FileText size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Detalhes</div>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    margin: '4px 0 0 0',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    maxHeight: '140px',
                    overflowY: 'auto',
                  }}
                >
                  {event.description}
                </p>
              </div>
            </div>
          )}

          {/* ── Linked Notes & Meeting Minutes Section ── */}
          <div
            style={{
              padding: '14px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={15} color="var(--accent-primary)" />
                <strong style={{ fontSize: '13px', color: '#fff' }}>
                  Anotações & Atas Vinculadas ({linkedNotes.length})
                </strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsPickerOpen(true)}
                  style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                >
                  <LinkIcon size={12} /> Vincular
                </button>
                {onCreateNoteForEvent && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onCreateNoteForEvent(event)}
                    style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                  >
                    <Plus size={12} /> Criar Ata
                  </button>
                )}
              </div>
            </div>

            {linkedNotes.length === 0 ? (
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  border: '1px dashed var(--border-subtle)',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setIsPickerOpen(true)}
              >
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                  Nenhuma anotação ou ata vinculada a esta reunião. Clique em <strong>Vincular</strong> ou <strong>Criar Ata</strong>.
                </p>
              </div>
            ) : (
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
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-main)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          overflow: 'hidden',
                          flex: 1,
                          cursor: 'pointer',
                        }}
                        onClick={() => handleNoteClick(note)}
                        title={`Visualizar anotação: ${note.title}`}
                      >
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
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {note.title}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleNoteClick(note)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--accent-primary)',
                            cursor: 'pointer',
                            padding: '3px',
                          }}
                          title="Visualizar anotação"
                        >
                          <Eye size={13} />
                        </button>
                        {onToggleLinkNote && (
                          <button
                            type="button"
                            onClick={() => onToggleLinkNote(event.id, note.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '3px',
                            }}
                            title="Desvincular da reunião"
                          >
                            <Unlink size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ fontSize: '11px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Bell size={13} /> Alarme automático ativo (30 min antes)
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCreateQuickReminder}
              disabled={reminderCreated}
              style={{ fontSize: '12px', padding: '6px 12px', gap: '4px' }}
            >
              <Bell size={13} />
              {reminderCreated ? 'Lembrete Criado!' : 'Criar Alarme'}
            </button>
            <button type="button" className="btn btn-primary" onClick={onClose} style={{ fontSize: '12px', padding: '6px 14px' }}>
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Note Picker Modal */}
      {isPickerOpen && (
        <EventNotePickerModal
          notes={notes}
          linkedNoteIds={linkedNoteIds}
          onToggleLinkNote={async (noteId) => {
            if (onToggleLinkNote) {
              await onToggleLinkNote(event.id, noteId);
            }
          }}
          onClose={() => setIsPickerOpen(false)}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  FEED MANAGER PANEL (Outlook + Google Calendar Setup)
// ═══════════════════════════════════════════════════════════
interface FeedManagerPanelProps {
  feeds: CalendarFeed[];
  syncingFeedId: string | null;
  onSaveFeed: (feedData: Partial<CalendarFeed> & { id: string }) => void;
  onSyncFeed: (feed: CalendarFeed) => void;
  onClose: () => void;
}

function FeedManagerPanel({
  feeds,
  syncingFeedId,
  onSaveFeed,
  onSyncFeed,
  onClose,
}: FeedManagerPanelProps) {
  const outlookFeed = feeds.find((f) => f.id === 'outlook') || {
    id: 'outlook',
    name: 'Microsoft Outlook (Trabalho)',
    url: '',
    type: 'outlook',
    color: '#6366f1',
    enabled: true,
  };

  const googleFeed = feeds.find((f) => f.id === 'google') || {
    id: 'google',
    name: 'Google Calendar (Pessoal)',
    url: '',
    type: 'google',
    color: '#10b981',
    enabled: true,
  };

  const [outlookUrl, setOutlookUrl] = useState(outlookFeed.url || '');
  const [googleUrl, setGoogleUrl] = useState(googleFeed.url || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (outlookFeed.url) setOutlookUrl(outlookFeed.url);
    if (googleFeed.url) setGoogleUrl(googleFeed.url);
  }, [feeds]);

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveFeed({ id: 'outlook', url: outlookUrl.trim(), enabled: Boolean(outlookUrl.trim()) });
    onSaveFeed({ id: 'google', url: googleUrl.trim(), enabled: Boolean(googleUrl.trim()) });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div
      style={{
        padding: '20px 24px',
        backgroundColor: 'var(--bg-card-app)',
        borderRadius: '14px',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(99,102,241,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}
          >
            <Settings size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff' }}>
              Configuração dos Feeds de Calendário (ICS)
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
              Cadastre suas agendas do Outlook e Google Calendar para visualização individual ou unificada.
            </p>
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
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSaveAll} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Grid with Outlook and Google Feed Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
          {/* Card 1: Microsoft Outlook */}
          <div
            style={{
              padding: '16px 18px',
              backgroundColor: 'rgba(99,102,241,0.06)',
              borderRadius: '12px',
              border: '1px solid rgba(99,102,241,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#6366f1',
                  }}
                />
                <strong style={{ fontSize: '14px', color: '#fff' }}>Microsoft Outlook (Trabalho)</strong>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onSyncFeed({ ...outlookFeed, url: outlookUrl.trim() })}
                disabled={syncingFeedId === 'outlook' || !outlookUrl.trim()}
                style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}
              >
                <RefreshCw size={12} className={syncingFeedId === 'outlook' ? 'spin-anim' : ''} />
                Sincronizar
              </button>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Link ICS ou HTML do Outlook:
              </label>
              <input
                type="text"
                className="input-field"
                value={outlookUrl}
                onChange={(e) => setOutlookUrl(e.target.value)}
                placeholder="https://outlook.office365.com/owa/calendar/.../calendar.ics"
                style={{ fontSize: '12px' }}
              />
            </div>

            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                backgroundColor: 'rgba(0,0,0,0.15)',
                padding: '8px 10px',
                borderRadius: '8px',
                lineHeight: 1.4,
              }}
            >
              <strong style={{ color: '#818cf8' }}>Como obter no Outlook:</strong> No Outlook Web &gt; Configurações ⚙️ &gt; Calendário &gt; Calendários Compartilhados &gt; Publicar um calendário &gt; Copiar link ICS (.ics ou .html).
            </div>

            {outlookFeed.lastSynced && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Última sincronização: {new Date(outlookFeed.lastSynced).toLocaleTimeString('pt-BR')} ({outlookFeed.eventCount || 0} eventos)
              </div>
            )}
          </div>

          {/* Card 2: Google Calendar */}
          <div
            style={{
              padding: '16px 18px',
              backgroundColor: 'rgba(16,185,129,0.06)',
              borderRadius: '12px',
              border: '1px solid rgba(16,185,129,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                  }}
                />
                <strong style={{ fontSize: '14px', color: '#fff' }}>Google Calendar (Pessoal)</strong>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onSyncFeed({ ...googleFeed, url: googleUrl.trim() })}
                disabled={syncingFeedId === 'google' || !googleUrl.trim()}
                style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}
              >
                <RefreshCw size={12} className={syncingFeedId === 'google' ? 'spin-anim' : ''} />
                Sincronizar
              </button>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Link iCal Secreto do Google (.ics):
              </label>
              <input
                type="text"
                className="input-field"
                value={googleUrl}
                onChange={(e) => setGoogleUrl(e.target.value)}
                placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                style={{ fontSize: '12px' }}
              />
            </div>

            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                backgroundColor: 'rgba(0,0,0,0.15)',
                padding: '8px 10px',
                borderRadius: '8px',
                lineHeight: 1.4,
              }}
            >
              <strong style={{ color: '#34d399' }}>Como obter no Google Calendar:</strong> Acesse calendar.google.com &gt; ⚙️ Configurações &gt; Selecione sua agenda pessoal &gt; Role até <strong>"Integrar agenda"</strong> &gt; Copie o <strong>"Endereço secreto no formato iCal"</strong>.
            </div>

            {googleFeed.lastSynced && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Última sincronização: {new Date(googleFeed.lastSynced).toLocaleTimeString('pt-BR')} ({googleFeed.eventCount || 0} eventos)
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          {savedSuccess && (
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={14} /> Links salvos com sucesso!
            </span>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: '13px' }}>
            Fechar
          </button>
          <button type="submit" className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 18px' }}>
            Salvar Feeds
          </button>
        </div>
      </form>
    </div>
  );
};
