import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  LayoutDashboard,
  FileText,
  FileCode,
  Paperclip,
  Calendar,
  Briefcase,
  Bell,
  ArrowRight,
  Clock,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
} from 'lucide-react';
import type {
  Ticket,
  NoteItem,
  CalendarEvent,
  ClientAsset,
  Reminder,
  NoteFolder,
} from '../../types/index';

export type SearchCategory = 'ALL' | 'TICKETS' | 'NOTES' | 'FILES' | 'CALENDAR' | 'CLIENTS' | 'REMINDERS';

export interface GlobalSearchResult {
  id: string;
  type: 'ticket' | 'note' | 'file' | 'calendar' | 'client' | 'reminder';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  iconColor: string;
  rawItem: any;
  updatedAt?: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: Ticket[];
  notes: NoteItem[];
  folders: NoteFolder[];
  calendarEvents: CalendarEvent[];
  clients: ClientAsset[];
  reminders: Reminder[];
  onSelectResult: (result: GlobalSearchResult) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  tickets,
  notes,
  folders,
  calendarEvents,
  clients,
  reminders,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 1. Process All Search Results & Filter in Real-Time (declared before useEffects)
  const searchResults = useMemo<GlobalSearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    const results: GlobalSearchResult[] = [];

    // Helper folder map
    const folderMap = new Map<string, string>();
    folders.forEach((f) => folderMap.set(f.id, f.name));

    // A. TICKETS
    if (activeCategory === 'ALL' || activeCategory === 'TICKETS') {
      tickets.forEach((t) => {
        const matches =
          !q ||
          t.title.toLowerCase().includes(q) ||
          (t.key && t.key.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.assignee && t.assignee.toLowerCase().includes(q)) ||
          (t.labels && t.labels.some((l) => l.toLowerCase().includes(q)));

        if (matches) {
          results.push({
            id: `ticket_${t.id}`,
            type: 'ticket',
            title: t.title,
            subtitle: `${t.key || 'LOCAL'} • ${t.statusLabel || t.status} • Resp: ${t.assignee || 'Eu'}`,
            badge: t.key || 'TICKET',
            badgeColor: t.source === 'JIRA' ? '#60a5fa' : '#a5b4fc',
            badgeBg: t.source === 'JIRA' ? 'rgba(0, 82, 204, 0.25)' : 'rgba(99, 102, 241, 0.25)',
            icon: LayoutDashboard,
            iconColor: t.source === 'JIRA' ? '#3b82f6' : '#6366f1',
            rawItem: t,
            updatedAt: t.updatedAt,
          });
        }
      });
    }

    // B. NOTES & ANOTAÇÕES (Text / Markdown / RichText)
    if (activeCategory === 'ALL' || activeCategory === 'NOTES') {
      notes
        .filter((n) => n.format !== 'file')
        .forEach((n) => {
          const folderName = n.folderId ? folderMap.get(n.folderId) : undefined;
          const matches = !q || n.title.toLowerCase().includes(q);

          if (matches) {
            results.push({
              id: `note_${n.id}`,
              type: 'note',
              title: n.title,
              subtitle: folderName
                ? `Pasta: ${folderName} • Atualizado em ${new Date(n.updatedAt).toLocaleDateString('pt-BR')}`
                : `Anotação • Atualizado em ${new Date(n.updatedAt).toLocaleDateString('pt-BR')}`,
              badge: n.format === 'markdown' ? 'MARKDOWN' : 'NOTA',
              badgeColor: '#c084fc',
              badgeBg: 'rgba(192, 132, 252, 0.2)',
              icon: FileText,
              iconColor: '#a855f7',
              rawItem: n,
              updatedAt: n.updatedAt,
            });
          }
        });
    }

    // C. ATTACHED FILES (PDFs, Excel, Word, Docs, Imagens)
    if (activeCategory === 'ALL' || activeCategory === 'FILES') {
      notes
        .filter((n) => n.format === 'file' || n.originalFileName)
        .forEach((n) => {
          const folderName = n.folderId ? folderMap.get(n.folderId) : undefined;
          const fileName = n.originalFileName || n.title || '';
          const matches = !q || fileName.toLowerCase().includes(q) || n.title.toLowerCase().includes(q);

          if (matches) {
            results.push({
              id: `file_${n.id}`,
              type: 'file',
              title: n.title || fileName,
              subtitle: folderName
                ? `Arquivo Anexo • Pasta: ${folderName}`
                : `Arquivo Anexo (${n.fileType || 'Doc'})`,
              badge: (n.fileType || 'ARQUIVO').toUpperCase(),
              badgeColor: '#38bdf8',
              badgeBg: 'rgba(56, 189, 248, 0.2)',
              icon: Paperclip,
              iconColor: '#06b6d4',
              rawItem: n,
              updatedAt: n.updatedAt,
            });
          }
        });
    }

    // D. CALENDAR EVENTS & REUNIÕES
    if (activeCategory === 'ALL' || activeCategory === 'CALENDAR') {
      calendarEvents.forEach((e) => {
        const matches =
          !q ||
          e.title.toLowerCase().includes(q) ||
          (e.location && e.location.toLowerCase().includes(q)) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.calendarName && e.calendarName.toLowerCase().includes(q));

        if (matches) {
          const startDate = new Date(e.start);
          const dateStr = !isNaN(startDate.getTime())
            ? `${startDate.toLocaleDateString('pt-BR')} às ${startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
            : e.start;

          results.push({
            id: `event_${e.id}`,
            type: 'calendar',
            title: e.title,
            subtitle: `${dateStr} • ${e.calendarName || 'Agenda'}`,
            badge: 'REUNIÃO',
            badgeColor: '#4ade80',
            badgeBg: 'rgba(74, 222, 128, 0.2)',
            icon: Calendar,
            iconColor: '#10b981',
            rawItem: e,
            updatedAt: e.start,
          });
        }
      });
    }

    // E. CLIENTS & ASSETS (JSM)
    if (activeCategory === 'ALL' || activeCategory === 'CLIENTS') {
      clients.forEach((c) => {
        const matches =
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          (c.contactEmail && c.contactEmail.toLowerCase().includes(q));

        if (matches) {
          results.push({
            id: `client_${c.id}`,
            type: 'client',
            title: c.name,
            subtitle: c.description
              ? `${c.description.slice(0, 75)}...`
              : `Cliente / Asset • Status: ${c.status || 'Ativo'}`,
            badge: 'CLIENTE',
            badgeColor: c.color || '#6366f1',
            badgeBg: `${c.color || '#6366f1'}25`,
            icon: Briefcase,
            iconColor: c.color || '#6366f1',
            rawItem: c,
            updatedAt: c.updatedAt,
          });
        }
      });
    }

    // F. REMINDERS & ALARMES
    if (activeCategory === 'ALL' || activeCategory === 'REMINDERS') {
      reminders.forEach((r) => {
        const matches =
          !q ||
          r.title.toLowerCase().includes(q) ||
          (r.message && r.message.toLowerCase().includes(q));

        if (matches) {
          results.push({
            id: `reminder_${r.id}`,
            type: 'reminder',
            title: r.title,
            subtitle: r.message
              ? `${r.message} (${r.recurrence === 'DAILY' ? 'Diário' : r.recurrence === 'INTERVAL' ? `${r.intervalMinutes}m` : 'Único'})`
              : `Lembrete (${r.recurrence})`,
            badge: 'ALARME',
            badgeColor: '#fbbf24',
            badgeBg: 'rgba(251, 191, 36, 0.2)',
            icon: Bell,
            iconColor: '#f59e0b',
            rawItem: r,
            updatedAt: r.createdAt,
          });
        }
      });
    }

    // Sort by recent updatedAt when empty search
    if (!q) {
      return results.slice(0, 30);
    }

    return results.slice(0, 40);
  }, [query, activeCategory, tickets, notes, folders, calendarEvents, clients, reminders]);

  // Auto focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveCategory('ALL');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keyboard navigation inside modal (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
        return;
      }

      if (e.key === 'Enter' && searchResults.length > 0) {
        e.preventDefault();
        const selected = searchResults[selectedIndex];
        if (selected) {
          onSelectResult(selected);
          onClose();
        }
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        const categories: SearchCategory[] = ['ALL', 'TICKETS', 'NOTES', 'FILES', 'CALENDAR', 'CLIENTS', 'REMINDERS'];
        const nextIdx = (categories.indexOf(activeCategory) + 1) % categories.length;
        setActiveCategory(categories[nextIdx]);
        setSelectedIndex(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, activeCategory, onClose, onSelectResult]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Highlight matched search text
  const renderHighlighted = (text: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.trim()})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.trim().toLowerCase() ? (
        <mark
          key={i}
          style={{
            backgroundColor: 'rgba(99, 102, 241, 0.4)',
            color: '#ffffff',
            borderRadius: '2px',
            padding: '0 2px',
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const categoriesConfig: Array<{ id: SearchCategory; label: string; count?: number }> = [
    { id: 'ALL', label: 'Tudo' },
    { id: 'TICKETS', label: 'Tickets' },
    { id: 'NOTES', label: 'Anotações' },
    { id: 'FILES', label: 'Arquivos' },
    { id: 'CALENDAR', label: 'Agenda' },
    { id: 'CLIENTS', label: 'Clientes' },
    { id: 'REMINDERS', label: 'Alarmes' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
        paddingBottom: '40px',
        paddingLeft: '20px',
        paddingRight: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '700px',
          backgroundColor: 'var(--bg-card-app)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Search Header Input ── */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <Search size={20} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Pesquisar em todo o app (tickets, anotações, arquivos, reuniões, clientes)..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 500,
            }}
          />

          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={16} />
            </button>
          )}

          <div
            style={{
              padding: '3px 7px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-subtle)',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              flexShrink: 0,
            }}
          >
            ESC
          </div>
        </div>

        {/* ── Filter Pills Row (Jira Search Style) ── */}
        <div
          style={{
            padding: '10px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            backgroundColor: 'rgba(0, 0, 0, 0.08)',
          }}
        >
          {categoriesConfig.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSelectedIndex(0);
                  inputRef.current?.focus();
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  backgroundColor: isSelected ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.03)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ── Results List / Recents ── */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {/* Section Header */}
          <div
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{!query.trim() ? '✨ Visualizados Recentemente' : `Resultados Encontrados (${searchResults.length})`}</span>
            {!query.trim() && <span style={{ textTransform: 'none', fontSize: '10px' }}>Digite para filtrar em tempo real</span>}
          </div>

          {searchResults.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Search size={32} style={{ opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: '14px', color: '#fff', fontWeight: 600 }}>
                Nenhum resultado para "{query}"
              </p>
              <p style={{ margin: 0, fontSize: '12px' }}>
                Tente buscar por chave de ticket, título de documento, nome de cliente ou compromisso.
              </p>
            </div>
          ) : (
            searchResults.map((result, index) => {
              const isSelected = selectedIndex === index;
              const Icon = result.icon;

              return (
                <div
                  key={result.id}
                  data-index={index}
                  onClick={() => {
                    onSelectResult(result);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.16)' : 'transparent',
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'background-color 0.12s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                    {/* Item Icon */}
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        backgroundColor: `${result.iconColor}20`,
                        border: `1px solid ${result.iconColor}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: result.iconColor,
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} />
                    </div>

                    {/* Title and Context */}
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: isSelected ? '#ffffff' : 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {renderHighlighted(result.title)}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: '2px',
                        }}
                      >
                        {result.subtitle}
                      </div>
                    </div>
                  </div>

                  {/* Right Badge & Arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {result.badge && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: result.badgeBg || 'rgba(255, 255, 255, 0.08)',
                          color: result.badgeColor || '#fff',
                        }}
                      >
                        {result.badge}
                      </span>
                    )}

                    {isSelected && (
                      <ChevronRight size={15} color="var(--accent-primary)" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Modal Footer Shortcuts ── */}
        <div
          style={{
            padding: '10px 20px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span>
              <kbd style={kbdStyle}>↑</kbd> <kbd style={kbdStyle}>↓</kbd> Navegar
            </span>
            <span>
              <kbd style={kbdStyle}>↵</kbd> Abrir item
            </span>
            <span>
              <kbd style={kbdStyle}>Tab</kbd> Filtrar categorias
            </span>
          </div>

          <div>
            <kbd style={kbdStyle}>Esc</kbd> Fechar
          </div>
        </div>
      </div>
    </div>
  );
};

const kbdStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '4px',
  padding: '2px 5px',
  fontSize: '10px',
  fontWeight: 700,
  color: 'var(--text-secondary)',
};
