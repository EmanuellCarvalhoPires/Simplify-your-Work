import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import type { NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { UnifiedHub } from './components/hub/UnifiedHub';
import { TicketBoard } from './components/tickets/TicketBoard';
import { ReminderManager } from './components/reminders/ReminderManager';
import { NoteEditor } from './components/notes/NoteEditor';
import { CalendarView } from './components/calendar/CalendarView';
import { SettingsView } from './components/settings/SettingsView';
import { FileViewerModal } from './components/common/FileViewerModal';
import { UserModal } from './components/common/UserModal';
import type { Ticket, JiraInstance, Reminder, NoteItem, ThemeConfig, TicketStatus, UserProfile } from './types/index';
import { DEFAULT_THEME } from './types/index';

class ViewErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ViewErrorBoundary] Erro ao carregar aba:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: '#ffffff', textAlign: 'center', backgroundColor: '#181820', borderRadius: '16px', margin: '24px' }}>
          <h2 style={{ fontSize: '20px', color: '#f43f5e', fontWeight: '800' }}>Ocorreu um erro ao carregar a tela</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '13px' }}>
            {this.state.error?.message || 'Falha ao renderizar os componentes da aba.'}
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '20px' }}
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Recarregar Aplicação
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Initial State loaded from localStorage (Instant local persistence layer)
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    try {
      const saved = localStorage.getItem('simplify_tickets');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  });

  const [jiraInstances, setJiraInstances] = useState<JiraInstance[]>(() => {
    try {
      const saved = localStorage.getItem('simplify_jira_instances');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  });

  const [reminders, setReminders] = useState<Reminder[]>(() => {
    try {
      const saved = localStorage.getItem('simplify_reminders');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  });

  const [notes, setNotes] = useState<NoteItem[]>(() => {
    try {
      const saved = localStorage.getItem('simplify_notes');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  });

  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => {
    try {
      const saved = localStorage.getItem('simplify_theme');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.bgMain) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_THEME;
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [userModalState, setUserModalState] = useState<{ isOpen: boolean; userToEdit?: UserProfile | null }>({
    isOpen: false,
    userToEdit: null,
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeViewerFile, setActiveViewerFile] = useState<string | null>(null);

  useEffect(() => {
    applyThemeToCss(themeConfig);
  }, []);

  useEffect(() => {
    (window as any).openFileViewer = (filePath: string) => {
      setActiveViewerFile(filePath);
    };
  }, []);

  // Load from MongoDB/Backend when available
  useEffect(() => {
    const loadBackendData = async () => {
      if (window.electronAPI) {
        try {
          const [tList, jInst, rList, nList, theme] = await Promise.all([
            window.electronAPI.getTickets(),
            window.electronAPI.getJiraInstances(),
            window.electronAPI.getReminders(),
            window.electronAPI.getNotes(),
            window.electronAPI.getThemeSettings(),
          ]);

          // Reminders sync
          if (rList && Array.isArray(rList) && rList.length > 0) {
            const safeR = rList.filter(Boolean);
            setReminders(safeR);
            localStorage.setItem('simplify_reminders', JSON.stringify(safeR));
          }

          // Tickets sync
          if (tList && Array.isArray(tList) && tList.length > 0) {
            const safeT = tList.filter(Boolean);
            setTickets(safeT);
            localStorage.setItem('simplify_tickets', JSON.stringify(safeT));
          }

          // Jira Instances sync
          if (jInst && Array.isArray(jInst) && jInst.length > 0) {
            const safeJ = jInst.filter(Boolean);
            setJiraInstances(safeJ);
            localStorage.setItem('simplify_jira_instances', JSON.stringify(safeJ));
          }

          // Notes sync
          if (nList && Array.isArray(nList) && nList.length > 0) {
            const safeN = nList.filter(Boolean);
            setNotes(safeN);
            localStorage.setItem('simplify_notes', JSON.stringify(safeN));
          }

          // Users sync
          if (window.electronAPI.getUsers && window.electronAPI.getActiveUser) {
            const [uList, actU] = await Promise.all([
              window.electronAPI.getUsers(),
              window.electronAPI.getActiveUser(),
            ]);
            if (uList && uList.length > 0) setUsers(uList);
            if (actU) {
              setActiveUser(actU);
              if (actU.themeConfig && actU.themeConfig.bgMain) {
                setThemeConfig(actU.themeConfig);
                localStorage.setItem('simplify_theme', JSON.stringify(actU.themeConfig));
                applyThemeToCss(actU.themeConfig);
              }
            }
          } else if (theme && theme.bgMain) {
            setThemeConfig(theme);
            localStorage.setItem('simplify_theme', JSON.stringify(theme));
            applyThemeToCss(theme);
          } else {
            applyThemeToCss(themeConfig);
          }
        } catch (err) {
          console.error('Erro ao sincronizar com backend MongoDB:', err);
        }
      }
      setIsInitializing(false);
    };

    loadBackendData();
  }, []);

  const loadTickets = async () => {
    if (window.electronAPI) {
      try {
        const allTickets = await window.electronAPI.getTickets();
        const safe = Array.isArray(allTickets) ? allTickets.filter(Boolean) : [];
        setTickets(safe);
        localStorage.setItem('simplify_tickets', JSON.stringify(safe));
      } catch (e) {
        console.error('Erro ao recarregar tickets:', e);
      }
    }
  };

  // Reminders scheduler check loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (!reminders || reminders.length === 0) return;
      const now = new Date();

      reminders.forEach(async (r) => {
        if (!r || !r.enabled) return;
        const last = r.lastTriggered ? new Date(r.lastTriggered) : null;
        let due = false;

        if (r.recurrence === 'INTERVAL') {
          const intervalMs = (Number(r.intervalMinutes) || 60) * 60 * 1000;
          if (!last || now.getTime() - last.getTime() >= intervalMs) {
            due = true;
          }
        } else if ((r.recurrence === 'DAILY' || r.recurrence === 'ONCE') && r.scheduledTime) {
          let scheduledDate: Date | null = null;
          if (r.scheduledTime.includes('T') || r.scheduledTime.includes('-')) {
            const parsed = new Date(r.scheduledTime);
            if (!isNaN(parsed.getTime())) scheduledDate = parsed;
          }
          if (!scheduledDate) {
            const timeMatch = r.scheduledTime.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
              const th = parseInt(timeMatch[1], 10);
              const tm = parseInt(timeMatch[2], 10);
              if (!isNaN(th) && !isNaN(tm)) {
                scheduledDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), th, tm, 0, 0);
              }
            }
          }

          if (scheduledDate && now >= scheduledDate && (!last || last < scheduledDate)) {
            due = true;
          }
        }

        if (due) {
          console.log(`[CLIENT-SCHEDULER] Lembrete devido: ${r.title}`);
          if (window.electronAPI && window.electronAPI.testReminder) {
            await window.electronAPI.testReminder(r);
          } else if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`⏰ ${r.title}`, { body: r.message || r.title || 'Lembrete agendado', icon: './assets/app-icon.png' });
          }
          await handleSaveReminder({
            ...r,
            lastTriggered: now.toISOString(),
            enabled: r.recurrence === 'ONCE' ? false : r.enabled,
          });
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [reminders]);

  const applyThemeToCss = (theme: ThemeConfig) => {
    const root = document.documentElement;
    if (theme.bgMain) root.style.setProperty('--bg-main', theme.bgMain);
    if (theme.bgSidebar) root.style.setProperty('--bg-sidebar', theme.bgSidebar);
    if (theme.bgHeader) root.style.setProperty('--bg-header', theme.bgHeader || theme.bgSidebar);
    if (theme.bgCardJira) root.style.setProperty('--bg-card-jira', theme.bgCardJira);
    if (theme.bgCardApp) root.style.setProperty('--bg-card-app', theme.bgCardApp);
    if (theme.accentPrimary) root.style.setProperty('--accent-primary', theme.accentPrimary);
    if (theme.textPrimary) root.style.setProperty('--text-primary', theme.textPrimary);
    if (theme.textSecondary) root.style.setProperty('--text-secondary', theme.textSecondary);
  };

  // Handlers for Tickets
  const handleFetchJiraTicket = async (ticketKey: string, instanceId: string) => {
    if (window.electronAPI) {
      const fetchedTicket = await window.electronAPI.fetchJiraTicket(ticketKey, instanceId);
      if (!fetchedTicket) {
        throw new Error(`O Jira respondeu mas o ticket "${ticketKey}" não pôde ser gerado.`);
      }
      setTickets((prev) => {
        const safePrev = Array.isArray(prev) ? prev.filter(Boolean) : [];
        const exists = safePrev.some((t) => t.id === fetchedTicket.id);
        const updatedList = exists
          ? safePrev.map((t) => (t.id === fetchedTicket.id ? fetchedTicket : t))
          : [fetchedTicket, ...safePrev];
        localStorage.setItem('simplify_tickets', JSON.stringify(updatedList));
        return updatedList;
      });
      return;
    }

    // Web Browser Fallback Mode:
    const inst = jiraInstances.find((i) => i.id === instanceId);
    if (!inst) {
      throw new Error('Instância do Jira não encontrada. Cadastre o domínio e API Key nas Configurações.');
    }
    const cleanDomain = inst.domain.startsWith('http') ? inst.domain : `https://${inst.domain}`;
    const cleanKey = ticketKey.trim().toUpperCase();
    const authString = `${inst.email.trim()}:${inst.apiToken.trim()}`;
    const base64Auth = btoa(authString);

    try {
      const res = await fetch(`${cleanDomain}/rest/api/3/issue/${cleanKey}`, {
        headers: {
          'Authorization': `Basic ${base64Auth}`,
          'Accept': 'application/json',
        },
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error(`Ticket "${cleanKey}" não foi encontrado no Jira (${cleanDomain}).`);
        if (res.status === 401 || res.status === 403) throw new Error(`Autenticação recusada (${res.status}). Verifique seu E-mail e API Token.`);
        throw new Error(`Erro na API do Jira (${res.status})`);
      }
      const issue = await res.json();
      const newTicket: Ticket = {
        id: `jira_${issue.key}_${inst.id}`,
        key: issue.key,
        source: 'JIRA',
        title: issue.fields?.summary || `Ticket ${issue.key}`,
        description: issue.fields?.description ? String(issue.fields.description) : '',
        status: 'TO_DO',
        statusLabel: issue.fields?.status?.name || 'A Fazer',
        color: '#0284c7',
        labels: issue.fields?.labels || [],
        comments: [],
        priority: issue.fields?.priority?.name || 'Normal',
        assignee: issue.fields?.assignee?.displayName || 'Não atribuído',
        jiraInstanceId: inst.id,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      setTickets((prev) => {
        const safePrev = Array.isArray(prev) ? prev.filter(Boolean) : [];
        const exists = safePrev.some((t) => t.id === newTicket.id);
        const updatedList = exists
          ? safePrev.map((t) => (t.id === newTicket.id ? newTicket : t))
          : [newTicket, ...safePrev];
        localStorage.setItem('simplify_tickets', JSON.stringify(updatedList));
        return updatedList;
      });
    } catch (e: any) {
      throw new Error(e.message || 'Erro de conexão ao buscar ticket do Jira.');
    }
  };

  const handleSaveTicket = async (ticketData: Partial<Ticket>) => {
    let saved: Ticket;
    if (window.electronAPI) {
      saved = await window.electronAPI.saveTicket(ticketData);
    } else {
      const isNew = !ticketData.id;
      let localKey = ticketData.key || '';
      if ((ticketData.source === 'LOCAL' || !ticketData.source) && !localKey) {
        const safePrev = Array.isArray(tickets) ? tickets.filter(Boolean) : [];
        let maxN = 0;
        safePrev.forEach((t) => {
          if (t.source === 'LOCAL' && t.key) {
            const m = String(t.key).match(/^TASK-(\d+)$/i);
            if (m && m[1]) {
              const num = parseInt(m[1], 10);
              if (!isNaN(num) && num > maxN) maxN = num;
            }
          }
        });
        localKey = `TASK-${maxN + 1}`;
      }

      saved = {
        id: ticketData.id || `local_${Date.now()}`,
        key: localKey,
        source: ticketData.source || 'LOCAL',
        title: ticketData.title || 'Novo Ticket',
        description: ticketData.description || '',
        status: ticketData.status || 'TO_DO',
        statusLabel: ticketData.statusLabel || 'A Fazer',
        color: ticketData.color || '#8b5cf6',
        labels: ticketData.labels || [],
        comments: ticketData.comments || [],
        priority: ticketData.priority || 'Normal',
        assignee: ticketData.assignee || 'Eu',
        updatedAt: new Date().toISOString(),
        createdAt: ticketData.createdAt || new Date().toISOString(),
        ...ticketData,
      } as Ticket;
    }

    setTickets((prev) => {
      const safePrev = Array.isArray(prev) ? prev.filter(Boolean) : [];
      const exists = safePrev.some((t) => t.id === saved.id);
      const updatedList = exists
        ? safePrev.map((t) => (t.id === saved.id ? saved : t))
        : [saved, ...safePrev];
      localStorage.setItem('simplify_tickets', JSON.stringify(updatedList));
      return updatedList;
    });
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: TicketStatus) => {
    const target = tickets.find((t) => t && t.id === ticketId);
    if (!target) return;

    let statusLabel = 'A Fazer';
    if (newStatus === 'IN_PROGRESS') statusLabel = 'Em Progresso';
    if (newStatus === 'DONE') statusLabel = 'Concluído';
    if (newStatus === 'BLOCKED') statusLabel = 'Bloqueado';

    const updated = {
      ...target,
      status: newStatus,
      statusLabel,
      updatedAt: new Date().toISOString(),
    };

    await handleSaveTicket(updated);
  };

  const handleDeleteTicket = async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.deleteTicket(id);
    }
    setTickets((prev) => {
      const safePrev = Array.isArray(prev) ? prev.filter(Boolean) : [];
      const updatedList = safePrev.filter((t) => t.id !== id);
      localStorage.setItem('simplify_tickets', JSON.stringify(updatedList));
      return updatedList;
    });
  };

  // Handlers for Jira Instances
  const handleSaveJiraInstance = async (inst: Partial<JiraInstance>) => {
    let saved: JiraInstance;
    if (window.electronAPI) {
      saved = await window.electronAPI.saveJiraInstance(inst);
    } else {
      saved = {
        id: inst.id || `jira_inst_${Date.now()}`,
        name: inst.name || 'Minha Instância Jira',
        domain: inst.domain || '',
        email: inst.email || '',
        apiToken: inst.apiToken || '',
        createdAt: inst.createdAt || new Date().toISOString(),
      };
    }

    setJiraInstances((prev) => {
      const safePrev = Array.isArray(prev) ? prev.filter(Boolean) : [];
      const exists = safePrev.some((i) => i.id === saved.id);
      const updatedList = exists
        ? safePrev.map((i) => (i.id === saved.id ? saved : i))
        : [...safePrev, saved];
      localStorage.setItem('simplify_jira_instances', JSON.stringify(updatedList));
      return updatedList;
    });
  };

  const handleDeleteJiraInstance = async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.deleteJiraInstance(id);
    }
    setJiraInstances((prev) => {
      const safePrev = Array.isArray(prev) ? prev.filter(Boolean) : [];
      const updatedList = safePrev.filter((i) => i.id !== id);
      localStorage.setItem('simplify_jira_instances', JSON.stringify(updatedList));
      return updatedList;
    });
  };

  // Handlers for Reminders
  const handleSaveReminder = async (rem: Partial<Reminder>) => {
    let saved: Reminder;
    if (window.electronAPI) {
      saved = await window.electronAPI.saveReminder(rem);
    } else {
      saved = {
        id: rem.id || `rem_${Date.now()}`,
        title: rem.title || 'Novo Lembrete',
        message: rem.message || '',
        recurrence: rem.recurrence || 'INTERVAL',
        intervalMinutes: rem.intervalMinutes || 45,
        scheduledTime: rem.scheduledTime || '14:00',
        enabled: rem.enabled !== undefined ? rem.enabled : true,
        lastTriggered: rem.lastTriggered || '',
        createdAt: rem.createdAt || new Date().toISOString(),
      };
    }

    setReminders((prev) => {
      const safePrev = Array.isArray(prev) ? prev.filter(Boolean) : [];
      const exists = safePrev.some((r) => r.id === saved.id);
      const updatedList = exists
        ? safePrev.map((r) => (r.id === saved.id ? saved : r))
        : [...safePrev, saved];
      localStorage.setItem('simplify_reminders', JSON.stringify(updatedList));
      return updatedList;
    });
  };

  const handleDeleteReminder = async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.deleteReminder(id);
    }
    setReminders((prev) => {
      const safePrev = Array.isArray(prev) ? prev.filter(Boolean) : [];
      const updatedList = safePrev.filter((r) => r.id !== id);
      localStorage.setItem('simplify_reminders', JSON.stringify(updatedList));
      return updatedList;
    });
  };

  const handleTestReminderFromHub = async (rem: Reminder) => {
    if (window.electronAPI && window.electronAPI.testReminder) {
      await window.electronAPI.testReminder(rem);
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`⏰ ${rem.title}`, { body: rem.message, icon: './assets/app-icon.png' });
    }
  };

  // Handlers for Notes
  const handleCreateNote = async (title: string) => {
    if (window.electronAPI) {
      const created = await window.electronAPI.createNote(title);
      setNotes((prev) => [created, ...prev]);
      return created;
    }
    const created: NoteItem = {
      id: `note_${Date.now()}`,
      title,
      filePath: `scratch/${title.toLowerCase().replace(/\s+/g, '_')}.md`,
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [created, ...prev]);
    return created;
  };

  const handleCreateRichNote = async (title: string) => {
    if (window.electronAPI?.createRichNote) {
      const created = await window.electronAPI.createRichNote(title);
      setNotes((prev) => [created, ...prev]);
      return created;
    }
    // Fallback for non-electron environments
    return handleCreateNote(title);
  };

  const handleSaveFileNote = async (fileData: { title: string; fileName: string; mimeType: string; base64: string; size: number }) => {
    if (window.electronAPI?.saveFileNote) {
      const created = await window.electronAPI.saveFileNote(fileData);
      setNotes((prev) => [created, ...prev.filter((n) => n.id !== created.id)]);
      return created;
    }
    const created: NoteItem = {
      id: `file_${Date.now()}`,
      title: fileData.title || fileData.fileName,
      filePath: fileData.fileName,
      format: 'file',
      fileType: 'other',
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [created, ...prev]);
    return created;
  };

  const handleReadNoteContent = async (filePath: string) => {
    if (window.electronAPI) {
      return await window.electronAPI.readNoteContent(filePath);
    }
    return `# Nova Anotação\n\nDigite seu conteúdo markdown aqui...`;
  };

  const handleSaveNoteContent = async (filePath: string, title: string, content: string) => {
    if (window.electronAPI) {
      const updated = await window.electronAPI.saveNoteContent(filePath, title, content);
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      return updated;
    }
    const updated: NoteItem = {
      id: notes.find((n) => n.filePath === filePath)?.id || `note_${Date.now()}`,
      title,
      filePath,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => prev.map((n) => (n.filePath === filePath ? updated : n)));
    return updated;
  };

  const handleDeleteNote = async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.deleteNote(id);
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleReorderNotes = (reordered: NoteItem[]) => {
    setNotes(reordered);
    try {
      localStorage.setItem('simplify_notes', JSON.stringify(reordered));
    } catch (e) {
      console.error('Erro ao salvar ordem das anotações no localStorage:', e);
    }
  };

  const handleExportTxt = async (content: string, defaultFileName: string) => {
    if (window.electronAPI) {
      return await window.electronAPI.exportNoteAsTxt(content, defaultFileName);
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${defaultFileName}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  };

  // User Profile Handlers
  const handleSelectActiveUser = async (id: string) => {
    if (window.electronAPI?.setActiveUser) {
      const updatedActive = await window.electronAPI.setActiveUser(id);
      if (updatedActive) {
        setActiveUser(updatedActive);
        if (updatedActive.themeConfig && updatedActive.themeConfig.bgMain) {
          setThemeConfig(updatedActive.themeConfig);
          localStorage.setItem('simplify_theme', JSON.stringify(updatedActive.themeConfig));
          applyThemeToCss(updatedActive.themeConfig);
        }
      }
    }
  };

  const handleSaveUser = async (userPartial: Partial<UserProfile>) => {
    if (window.electronAPI?.saveUser) {
      const saved = await window.electronAPI.saveUser(userPartial);
      const allUsers = await window.electronAPI.getUsers();
      setUsers(allUsers);
      if (!activeUser || activeUser.id === saved.id) {
        setActiveUser(saved);
        if (saved.themeConfig && saved.themeConfig.bgMain) {
          setThemeConfig(saved.themeConfig);
          localStorage.setItem('simplify_theme', JSON.stringify(saved.themeConfig));
          applyThemeToCss(saved.themeConfig);
        }
      }
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.electronAPI?.deleteUser) {
      await window.electronAPI.deleteUser(id);
      const [allUsers, actU] = await Promise.all([
        window.electronAPI.getUsers(),
        window.electronAPI.getActiveUser(),
      ]);
      setUsers(allUsers);
      if (actU) {
        setActiveUser(actU);
        if (actU.themeConfig && actU.themeConfig.bgMain) {
          setThemeConfig(actU.themeConfig);
          localStorage.setItem('simplify_theme', JSON.stringify(actU.themeConfig));
          applyThemeToCss(actU.themeConfig);
        }
      }
    }
  };

  // Handler for Theme Settings
  const handleSaveThemeSettings = async (theme: ThemeConfig) => {
    setThemeConfig(theme);
    localStorage.setItem('simplify_theme', JSON.stringify(theme));
    applyThemeToCss(theme);
    if (activeUser) {
      setActiveUser({ ...activeUser, themeConfig: theme });
    }
    if (window.electronAPI?.saveThemeSettings) {
      await window.electronAPI.saveThemeSettings(theme);
    }
  };

  if (isInitializing) {
    return (
      <div style={styles.loadingScreen}>
        <img src="./assets/app-icon.png" alt="Simplify your Work" style={{ width: '80px', height: '80px' }} />
        <h2 style={{ color: '#ffffff', marginTop: '16px' }}>Iniciando Simplify your Work...</h2>
      </div>
    );
  }

  return (
    <div style={styles.appWrapper}>
      <Sidebar activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />

      <div style={styles.mainContainer}>
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          presetName={themeConfig?.presetName}
          activeUser={activeUser}
          users={users}
          onSelectActiveUser={handleSelectActiveUser}
          onDeleteUser={handleDeleteUser}
          onOpenCreateUserModal={() => setUserModalState({ isOpen: true, userToEdit: null })}
        />

        <main style={styles.viewContent}>
          <ViewErrorBoundary>
            {activeTab === 'overview' && (
              <UnifiedHub
                tickets={tickets}
                reminders={reminders}
                notes={notes}
                onSelectTab={(tab) => setActiveTab(tab)}
                onCardClickTicket={(ticket) => {
                  setActiveTab('tickets');
                }}
                onTestReminder={handleTestReminderFromHub}
                onCardClickNote={(note) => {
                  setActiveTab('notes');
                }}
              />
            )}

            {activeTab === 'tickets' && (
              <TicketBoard
                tickets={tickets}
                notes={notes}
                jiraInstances={jiraInstances}
                searchQuery={searchQuery}
                onFetchJiraTicket={handleFetchJiraTicket}
                onRefreshTickets={loadTickets}
                onSaveTicket={handleSaveTicket}
                onUpdateStatus={handleUpdateTicketStatus}
                onDeleteTicket={handleDeleteTicket}
                onOpenSettings={() => setActiveTab('settings')}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarView />
            )}

            {activeTab === 'notes' && (
              <NoteEditor
                notes={notes}
                onCreateNote={handleCreateNote}
                onCreateRichNote={handleCreateRichNote}
                onSaveFileNote={handleSaveFileNote}
                onReadContent={handleReadNoteContent}
                onSaveContent={handleSaveNoteContent}
                onDeleteNote={handleDeleteNote}
                onExportTxt={handleExportTxt}
                onReorderNotes={handleReorderNotes}
              />
            )}

            {activeTab === 'reminders' && (
              <ReminderManager
                reminders={reminders}
                onSaveReminder={handleSaveReminder}
                onDeleteReminder={handleDeleteReminder}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                jiraInstances={jiraInstances}
                onSaveJiraInstance={handleSaveJiraInstance}
                onDeleteJiraInstance={handleDeleteJiraInstance}
                themeConfig={themeConfig}
                onSaveThemeSettings={handleSaveThemeSettings}
                activeUser={activeUser}
                users={users}
                onSelectActiveUser={handleSelectActiveUser}
                onSaveUser={handleSaveUser}
                onDeleteUser={handleDeleteUser}
                onOpenCreateUserModal={() => setUserModalState({ isOpen: true, userToEdit: null })}
                onOpenEditUserModal={(u) => setUserModalState({ isOpen: true, userToEdit: u })}
              />
            )}
          </ViewErrorBoundary>
        </main>
      </div>

      {activeViewerFile && (
        <FileViewerModal
          filePath={activeViewerFile}
          onClose={() => setActiveViewerFile(null)}
        />
      )}

      {userModalState.isOpen && (
        <UserModal
          userToEdit={userModalState.userToEdit}
          onSave={handleSaveUser}
          onClose={() => setUserModalState({ isOpen: false, userToEdit: null })}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appWrapper: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-main)',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-main)',
  },
  viewContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  loadingScreen: {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
