import React, { useState, useEffect } from 'react';
import { Sidebar, loadStoredSidebarConfig, loadStoredCustomSites } from './components/layout/Sidebar';
import type { NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { TicketBoard } from './components/tickets/TicketBoard';
import { ReminderManager } from './components/reminders/ReminderManager';
import { NoteEditor } from './components/notes/NoteEditor';
import { CalendarView } from './components/calendar/CalendarView';
import { ClientsView } from './components/clients/ClientsView';
import { SettingsView } from './components/settings/SettingsView';
import { TeamsView } from './components/teams/TeamsView';
import { OutlookView } from './components/outlook/OutlookView';
import { AiAssistantView } from './components/ai/AiAssistantView';
import { CustomWebView } from './components/web/CustomWebView';
import { FileViewerModal } from './components/common/FileViewerModal';
import { UserModal } from './components/common/UserModal';
import { GlobalSearchModal } from './components/search/GlobalSearchModal';
import { UpdateModal } from './components/common/UpdateModal';
import type { GlobalSearchResult } from './components/search/GlobalSearchModal';
import type { Ticket, JiraInstance, Reminder, NoteItem, ThemeConfig, TicketStatus, UserProfile, NoteFolder, ClientAsset, CalendarEvent, AiAssistantConfig, SidebarConfig, CustomSite } from './types/index';
import { DEFAULT_THEME, DEFAULT_AI_CONFIG } from './types/index';

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
  const [activeTab, setActiveTab] = useState<NavTab>('tickets');
  const [hasOpenedTeams, setHasOpenedTeams] = useState(true);
  const [hasOpenedOutlook, setHasOpenedOutlook] = useState(true);
  const [hasOpenedAi, setHasOpenedAi] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [aiConfig, setAiConfig] = useState<AiAssistantConfig>(() => {
    try {
      const saved = localStorage.getItem('simplify_ai_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed.enabledProviders)) {
          if (parsed.provider && parsed.provider !== 'none' && parsed.provider !== 'rovo') {
            parsed.enabledProviders = [parsed.provider];
          } else {
            parsed.enabledProviders = [];
          }
        }
        parsed.enabledProviders = (parsed.enabledProviders || []).filter((p: string) => p !== 'rovo');
        delete parsed.provider;
        delete parsed.customUrl;
        delete parsed.rovoCustomUrl;
        return parsed;
      }
    } catch (e) {
      console.error('Erro ao ler simplify_ai_config:', e);
    }
    return DEFAULT_AI_CONFIG;
  });

  useEffect(() => {
    if (activeTab === 'teams' && !hasOpenedTeams) {
      setHasOpenedTeams(true);
    }
    if (activeTab === 'outlook' && !hasOpenedOutlook) {
      setHasOpenedOutlook(true);
    }
  }, [activeTab, hasOpenedTeams, hasOpenedOutlook]);

  const handleSaveAiConfig = async (config: AiAssistantConfig) => {
    const cleanConfig: AiAssistantConfig = {
      enabledProviders: Array.isArray(config.enabledProviders)
        ? config.enabledProviders.filter((p) => p !== ('rovo' as any))
        : [],
    };
    setAiConfig(cleanConfig);
    try {
      localStorage.setItem('simplify_ai_config', JSON.stringify(cleanConfig));
    } catch (e) {
      console.error('Erro ao salvar simplify_ai_config:', e);
    }
  };

  const [sidebarConfig, setSidebarConfig] = useState<SidebarConfig>(() => {
    return loadStoredSidebarConfig();
  });

  const handleSaveSidebarConfig = (config: SidebarConfig) => {
    setSidebarConfig(config);
    try {
      localStorage.setItem('simplify_sidebar_config', JSON.stringify(config));
    } catch (e) {
      console.error('Erro ao salvar simplify_sidebar_config:', e);
    }
  };

  const [customSites, setCustomSites] = useState<CustomSite[]>(() => {
    return loadStoredCustomSites();
  });

  const handleSaveCustomSite = (site: CustomSite) => {
    setCustomSites((prev) => {
      const exists = prev.some((s) => s.id === site.id);
      const updated = exists ? prev.map((s) => (s.id === site.id ? site : s)) : [...prev, site];
      try {
        localStorage.setItem('simplify_custom_sites', JSON.stringify(updated));
      } catch (e) {
        console.error('Erro ao salvar simplify_custom_sites:', e);
      }
      return updated;
    });
  };

  const handleDeleteCustomSite = (id: string) => {
    setCustomSites((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem('simplify_custom_sites', JSON.stringify(updated));
      } catch (e) {
        console.error('Erro ao salvar simplify_custom_sites:', e);
      }
      return updated;
    });
  };

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

  const [noteFolders, setNoteFolders] = useState<NoteFolder[]>(() => {
    try {
      const saved = localStorage.getItem('simplify_note_folders');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  });

  const [clients, setClients] = useState<ClientAsset[]>(() => {
    try {
      const saved = localStorage.getItem('simplify_clients');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  });
  const [targetClientIdForClientsView, setTargetClientIdForClientsView] = useState<string | null>(null);
  const [targetNoteIdForNotesView, setTargetNoteIdForNotesView] = useState<string | null>(null);

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

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
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Auto-Update State & Prompt
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<any>({ state: 'idle' });

  useEffect(() => {
    if (window.electronAPI?.onUpdateStatus) {
      const unsubscribe = window.electronAPI.onUpdateStatus((status) => {
        if (status) {
          setUpdateStatus(status);
          if (status.state === 'available' || status.state === 'downloaded') {
            setUpdateModalOpen(true);
          }
        }
      });
      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    // Verificação automática não-bloqueante no GitHub Releases 2.5s após inicializar o app
    const checkTimer = setTimeout(async () => {
      if (window.electronAPI?.checkForUpdates) {
        try {
          await window.electronAPI.checkForUpdates();
        } catch (e) {
          // Silencioso em caso de falha na verificação de fundo
        }
      }
    }, 2500);

    return () => clearTimeout(checkTimer);
  }, []);

  const handleDownloadUpdate = async () => {
    if (window.electronAPI?.downloadUpdate) {
      try {
        await window.electronAPI.downloadUpdate();
      } catch (err: any) {
        alert(`Falha ao baixar atualização: ${err.message}`);
      }
    }
  };

  const handleInstallUpdate = () => {
    if (window.electronAPI?.quitAndInstallUpdate) {
      window.electronAPI.quitAndInstallUpdate();
    }
  };

  useEffect(() => {
    applyThemeToCss(themeConfig);
  }, []);

  useEffect(() => {
    (window as any).openFileViewer = (filePath: string) => {
      setActiveViewerFile(filePath);
    };
  }, []);

  // Global Keyboard Shortcut: Ctrl + K (or Cmd + K) opens the Jira-Style Omnisearch
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Load from Database/Backend when available
  useEffect(() => {
    let isDone = false;
    // Timeout de segurança: garante que a tela de loading nunca trave indefinidamente
    const fallbackTimeout = setTimeout(() => {
      if (!isDone) {
        console.warn('[App] Sincronização inicial com o backend excedeu o tempo limite. Liberando interface...');
        setIsInitializing(false);
      }
    }, 2500);

    const loadBackendData = async () => {
      if (window.electronAPI) {
        try {
          const [tList, jInst, rList, nList, theme, fList, cList, eList] = await Promise.all([
            window.electronAPI.getTickets().catch(() => []),
            window.electronAPI.getJiraInstances().catch(() => []),
            window.electronAPI.getReminders().catch(() => []),
            window.electronAPI.getNotes().catch(() => []),
            window.electronAPI.getThemeSettings().catch(() => null),
            window.electronAPI.getNoteFolders ? window.electronAPI.getNoteFolders().catch(() => []) : Promise.resolve([]),
            window.electronAPI.getClients ? window.electronAPI.getClients().catch(() => []) : Promise.resolve([]),
            window.electronAPI.getCalendarEvents ? window.electronAPI.getCalendarEvents().catch(() => []) : Promise.resolve([]),
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

          // Note Folders sync
          if (fList && Array.isArray(fList)) {
            setNoteFolders(fList);
            localStorage.setItem('simplify_note_folders', JSON.stringify(fList));
          }

          // Clients sync
          if (cList && Array.isArray(cList)) {
            setClients(cList);
            localStorage.setItem('simplify_clients', JSON.stringify(cList));
          }

          // Calendar events sync
          if (eList && Array.isArray(eList)) {
            setCalendarEvents(eList);
          }

          // Users sync
          if (window.electronAPI.getUsers && window.electronAPI.getActiveUser) {
            const [uList, actU] = await Promise.all([
              window.electronAPI.getUsers().catch(() => []),
              window.electronAPI.getActiveUser().catch(() => null),
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
          console.error('Erro ao sincronizar com backend:', err);
        }
      }
      isDone = true;
      clearTimeout(fallbackTimeout);
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
        jiraStatus: issue.fields?.status?.name || 'A Fazer',
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

  const handleDeleteTickets = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    if (window.electronAPI && window.electronAPI.deleteTickets) {
      await window.electronAPI.deleteTickets(ids);
    } else if (window.electronAPI && window.electronAPI.deleteTicket) {
      await Promise.all(ids.map((id) => window.electronAPI.deleteTicket(id)));
    }
    const idsSet = new Set(ids);
    setTickets((prev) => {
      const safePrev = Array.isArray(prev) ? prev.filter(Boolean) : [];
      const updatedList = safePrev.filter((t) => !idsSet.has(t.id));
      localStorage.setItem('simplify_tickets', JSON.stringify(updatedList));
      return updatedList;
    });
  };

  const handleBatchUpdateTicketStatus = async (ids: string[], newStatus: TicketStatus) => {
    if (!ids || ids.length === 0) return;
    let statusLabel = 'A Fazer';
    if (newStatus === 'IN_PROGRESS') statusLabel = 'Em Progresso';
    if (newStatus === 'DONE') statusLabel = 'Concluído';
    if (newStatus === 'BLOCKED') statusLabel = 'Bloqueado';
    if (newStatus === 'NEXT') statusLabel = 'Fazer em Seguida';
    if (newStatus === 'WAITING_CLIENT') statusLabel = 'Aguardando Cliente';
    if (newStatus === 'BACKLOG') statusLabel = 'Backlog';
    if (newStatus === 'PRIORITIZED') statusLabel = 'Priorizado';

    if (window.electronAPI && window.electronAPI.updateTicketStatuses) {
      await window.electronAPI.updateTicketStatuses(ids, newStatus, statusLabel);
    }

    const idsSet = new Set(ids);
    const now = new Date().toISOString();
    setTickets((prev) => {
      const safePrev = Array.isArray(prev) ? prev.filter(Boolean) : [];
      const updatedList = safePrev.map((t) => {
        if (idsSet.has(t.id)) {
          return {
            ...t,
            status: newStatus,
            statusLabel,
            updatedAt: now,
          };
        }
        return t;
      });
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
      const updatedTickets = await window.electronAPI.getTickets();
      setTickets(Array.isArray(updatedTickets) ? updatedTickets : []);
    } else {
      setTickets((prev) => (Array.isArray(prev) ? prev.filter((t) => t.source === 'LOCAL' || (t.jiraInstanceId && t.jiraInstanceId !== id)) : []));
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
  const handleCreateNote = async (title: string, folderId?: string) => {
    if (window.electronAPI) {
      const created = await window.electronAPI.createNote(title, folderId);
      setNotes((prev) => [created, ...prev]);
      return created;
    }
    const created: NoteItem = {
      id: `note_${Date.now()}`,
      title,
      filePath: `scratch/${title.toLowerCase().replace(/\s+/g, '_')}.md`,
      folderId,
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [created, ...prev]);
    return created;
  };

  const handleCreateRichNote = async (title: string, folderId?: string) => {
    if (window.electronAPI?.createRichNote) {
      const created = await window.electronAPI.createRichNote(title, folderId);
      setNotes((prev) => [created, ...prev]);
      return created;
    }
    // Fallback for non-electron environments
    return handleCreateNote(title, folderId);
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

  const handleUpdateNoteMeta = async (noteMeta: Partial<NoteItem> & { id: string }) => {
    if (window.electronAPI?.updateNoteMeta) {
      const updated = await window.electronAPI.updateNoteMeta(noteMeta);
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)));
      return updated;
    }
    setNotes((prev) => prev.map((n) => (n.id === noteMeta.id ? { ...n, ...noteMeta } : n)));
    return noteMeta as NoteItem;
  };

  const handleSaveFolder = async (folder: Partial<NoteFolder> & { name: string }) => {
    if (window.electronAPI?.saveNoteFolder) {
      const saved = await window.electronAPI.saveNoteFolder(folder);
      setNoteFolders((prev) => {
        const exists = prev.some((f) => f.id === saved.id);
        const updated = exists ? prev.map((f) => (f.id === saved.id ? saved : f)) : [...prev, saved];
        localStorage.setItem('simplify_note_folders', JSON.stringify(updated));
        return updated;
      });
      return saved;
    }
    const saved: NoteFolder = {
      id: folder.id || `folder_${Date.now()}`,
      name: folder.name,
      color: folder.color || '#6366f1',
      parentId: folder.parentId || undefined,
      clientId: folder.clientId || undefined,
      isArchived: folder.isArchived || false,
      createdAt: folder.createdAt || new Date().toISOString(),
    };
    setNoteFolders((prev) => {
      const exists = prev.some((f) => f.id === saved.id);
      const updated = exists ? prev.map((f) => (f.id === saved.id ? saved : f)) : [...prev, saved];
      localStorage.setItem('simplify_note_folders', JSON.stringify(updated));
      return updated;
    });
    return saved;
  };

  const handleDeleteFolder = async (id: string, deleteContents: boolean = false) => {
    if (window.electronAPI?.deleteNoteFolder) {
      await window.electronAPI.deleteNoteFolder(id, deleteContents);
    }
    setNoteFolders((prev) => {
      if (deleteContents) {
        const idsToDelete = new Set<string>([id]);
        let added = true;
        while (added) {
          added = false;
          for (const f of prev) {
            if (f.parentId && idsToDelete.has(f.parentId) && !idsToDelete.has(f.id)) {
              idsToDelete.add(f.id);
              added = true;
            }
          }
        }
        const updated = prev.filter((f) => !idsToDelete.has(f.id));
        localStorage.setItem('simplify_note_folders', JSON.stringify(updated));
        return updated;
      } else {
        const targetFolder = prev.find((f) => f.id === id);
        const targetParent = targetFolder?.parentId || undefined;
        const updated = prev
          .filter((f) => f.id !== id)
          .map((f) => (f.parentId === id ? { ...f, parentId: targetParent } : f));
        localStorage.setItem('simplify_note_folders', JSON.stringify(updated));
        return updated;
      }
    });

    if (deleteContents) {
      const idsToDelete = new Set<string>([id]);
      let added = true;
      while (added) {
        added = false;
        for (const f of noteFolders) {
          if (f.parentId && idsToDelete.has(f.parentId) && !idsToDelete.has(f.id)) {
            idsToDelete.add(f.id);
            added = true;
          }
        }
      }
      setNotes((prev) => prev.filter((n) => !n.folderId || !idsToDelete.has(n.folderId)));
    } else {
      const targetFolder = noteFolders.find((f) => f.id === id);
      const targetParent = targetFolder?.parentId || undefined;
      setNotes((prev) => prev.map((n) => (n.folderId === id ? { ...n, folderId: targetParent } : n)));
    }
  };

  const handleReorderNotes = (reordered: NoteItem[]) => {
    setNotes(reordered);
    try {
      localStorage.setItem('simplify_notes', JSON.stringify(reordered));
    } catch (e) {
      console.error('Erro ao salvar ordem das anotações no localStorage:', e);
    }
  };

  const handleReorderFolders = (reordered: NoteFolder[]) => {
    setNoteFolders(reordered);
    try {
      localStorage.setItem('simplify_note_folders', JSON.stringify(reordered));
    } catch (e) {
      console.error('Erro ao salvar ordem das pastas no localStorage:', e);
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

  const handleOpenFileViewer = (fileOrPath: NoteItem | string) => {
    if (typeof fileOrPath === 'string') {
      setActiveViewerFile(fileOrPath);
    } else if (fileOrPath && fileOrPath.filePath) {
      setActiveViewerFile(fileOrPath.filePath);
    }
  };

  // Client Handlers (JSM Style Assets)
  const handleSaveClient = async (clientData: Partial<ClientAsset> & { name: string }) => {
    if (window.electronAPI?.saveClient) {
      const saved = await window.electronAPI.saveClient(clientData);
      setClients((prev) => {
        const exists = prev.some((c) => c.id === saved.id);
        const updated = exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved];
        localStorage.setItem('simplify_clients', JSON.stringify(updated));
        return updated;
      });
      return;
    }

    const saved: ClientAsset = {
      id: clientData.id || `client_${Date.now()}`,
      name: clientData.name,
      description: clientData.description || '',
      status: clientData.status || 'ACTIVE',
      color: clientData.color || '#0052cc',
      icon: clientData.icon || 'building',
      instanceIds: clientData.instanceIds || [],
      linkedTicketIds: clientData.linkedTicketIds || [],
      linkedNoteIds: clientData.linkedNoteIds || [],
      linkedFolderIds: clientData.linkedFolderIds || [],
      linkedEventIds: clientData.linkedEventIds || [],
      linkedReminderIds: clientData.linkedReminderIds || [],
      contactEmail: clientData.contactEmail || '',
      contactPhone: clientData.contactPhone || '',
      createdAt: clientData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setClients((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      const updated = exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved];
      localStorage.setItem('simplify_clients', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteClient = async (id: string) => {
    if (window.electronAPI?.deleteClient) {
      await window.electronAPI.deleteClient(id);
    }
    setClients((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      localStorage.setItem('simplify_clients', JSON.stringify(updated));
      return updated;
    });
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

  // Handler for Global Search Selection (Omnisearch Jira Style)
  const handleGlobalSearchResultSelect = (result: GlobalSearchResult) => {
    setIsGlobalSearchOpen(false);

    switch (result.type) {
      case 'ticket':
        setActiveTab('tickets');
        break;
      case 'note':
        setActiveTab('notes');
        break;
      case 'file':
        if (result.rawItem && result.rawItem.filePath) {
          setActiveViewerFile(result.rawItem.filePath);
        } else {
          setActiveTab('notes');
        }
        break;
      case 'calendar':
        setActiveTab('calendar');
        break;
      case 'client':
        setActiveTab('clients');
        break;
      case 'reminder':
        setActiveTab('reminders');
        break;
      default:
        break;
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

  const isCustomSiteActive = customSites.some((s) => s.id === activeTab);
  const isFullBleedActive = activeTab === 'teams' || activeTab === 'outlook' || activeTab.startsWith('ai_') || isCustomSiteActive;

  return (
    <div style={styles.appWrapper}>
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        aiConfig={aiConfig}
        sidebarConfig={sidebarConfig}
        customSites={customSites}
      />

      <div style={styles.mainContainer}>
        {!isFullBleedActive && (
          <Header
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
            presetName={themeConfig?.presetName}
            activeUser={activeUser}
            users={users}
            onSelectActiveUser={handleSelectActiveUser}
            onDeleteUser={handleDeleteUser}
            onOpenCreateUserModal={() => setUserModalState({ isOpen: true, userToEdit: null })}
          />
        )}

        <main style={styles.viewContent}>
          <ViewErrorBoundary>
            {activeTab === 'tickets' && (
              <TicketBoard
                tickets={tickets}
                notes={notes}
                jiraInstances={jiraInstances}
                searchQuery={searchQuery}
                activeUser={activeUser}
                onFetchJiraTicket={handleFetchJiraTicket}
                onRefreshTickets={loadTickets}
                onSaveTicket={handleSaveTicket}
                onUpdateStatus={handleUpdateTicketStatus}
                onDeleteTicket={handleDeleteTicket}
                onDeleteTickets={handleDeleteTickets}
                onBatchUpdateStatus={handleBatchUpdateTicketStatus}
                onOpenSettings={() => setActiveTab('settings')}
                onNavigateToNote={(noteId) => {
                  setTargetNoteIdForNotesView(noteId);
                  setActiveTab('notes');
                }}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarView
                notes={notes}
                onOpenFileViewer={handleOpenFileViewer}
                onCreateNote={handleCreateRichNote}
              />
            )}

            {activeTab === 'notes' && (
              <NoteEditor
                notes={notes}
                folders={noteFolders}
                clients={clients}
                targetNoteId={targetNoteIdForNotesView}
                onClearTargetNote={() => setTargetNoteIdForNotesView(null)}
                onSaveClient={handleSaveClient}
                onNavigateToClient={(clientId) => {
                  setTargetClientIdForClientsView(clientId);
                  setActiveTab('clients');
                }}
                onCreateNote={handleCreateNote}
                onCreateRichNote={handleCreateRichNote}
                onSaveFileNote={handleSaveFileNote}
                onReadContent={handleReadNoteContent}
                onSaveContent={handleSaveNoteContent}
                onDeleteNote={handleDeleteNote}
                onExportTxt={handleExportTxt}
                onReorderNotes={handleReorderNotes}
                onReorderFolders={handleReorderFolders}
                onSaveFolder={handleSaveFolder}
                onDeleteFolder={handleDeleteFolder}
                onUpdateNoteMeta={handleUpdateNoteMeta}
              />
            )}

            {activeTab === 'clients' && (
              <ClientsView
                clients={clients}
                tickets={tickets}
                notes={notes}
                folders={noteFolders}
                calendarEvents={calendarEvents}
                reminders={reminders}
                jiraInstances={jiraInstances}
                onSaveClient={handleSaveClient}
                onDeleteClient={handleDeleteClient}
                onSaveTicket={handleSaveTicket}
                onUpdateTicketStatus={handleUpdateTicketStatus}
                onDeleteTicket={handleDeleteTicket}
                onReadNoteContent={handleReadNoteContent}
                onNavigateToNote={(noteId) => {
                  setTargetNoteIdForNotesView(noteId);
                  setActiveTab('notes');
                }}
              />
            )}

            {activeTab === 'reminders' && (
              <ReminderManager
                reminders={reminders}
                onSaveReminder={handleSaveReminder}
                onDeleteReminder={handleDeleteReminder}
              />
            )}

            {/* Microsoft Teams View (WebView Isolado e Persistente em Segundo Plano) */}
            <div
              style={{
                display: activeTab === 'teams' ? 'flex' : 'none',
                flex: 1,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
              }}
            >
              <TeamsView />
            </div>

            {/* Microsoft Outlook View (WebView Isolado e Persistente em Segundo Plano) */}
            <div
              style={{
                display: activeTab === 'outlook' ? 'flex' : 'none',
                flex: 1,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
              }}
            >
              <OutlookView />
            </div>

            {/* AI Assistants Persistent Webviews (ChatGPT, Claude, Gemini) */}
            {(aiConfig.enabledProviders || (aiConfig.provider && aiConfig.provider !== 'none' ? [aiConfig.provider] : []))
              .filter((p) => p !== ('rovo' as any))
              .map((provider) => (
                <div
                  key={provider}
                  style={{
                    display: activeTab === `ai_${provider}` ? 'flex' : 'none',
                    flex: 1,
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                  }}
                >
                  <AiAssistantView
                    provider={provider}
                    onOpenSettings={() => setActiveTab('settings')}
                  />
                </div>
              ))}

            {/* Custom Sites Persistent Webviews (OneDrive, SharePoint, WhatsApp, GitHub, etc.) */}
            {customSites.map((site) => (
              <div
                key={site.id}
                style={{
                  display: activeTab === site.id ? 'flex' : 'none',
                  flex: 1,
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                }}
              >
                <CustomWebView
                  site={site}
                  onOpenSettings={() => setActiveTab('settings')}
                />
              </div>
            ))}

            {activeTab === 'settings' && (
              <SettingsView
                jiraInstances={jiraInstances}
                onSaveJiraInstance={handleSaveJiraInstance}
                onDeleteJiraInstance={handleDeleteJiraInstance}
                themeConfig={themeConfig}
                onSaveThemeSettings={handleSaveThemeSettings}
                aiConfig={aiConfig}
                onSaveAiConfig={handleSaveAiConfig}
                sidebarConfig={sidebarConfig}
                onSaveSidebarConfig={handleSaveSidebarConfig}
                customSites={customSites}
                onSaveCustomSite={handleSaveCustomSite}
                onDeleteCustomSite={handleDeleteCustomSite}
                activeUser={activeUser}
                users={users}
                onSelectActiveUser={handleSelectActiveUser}
                onSaveUser={handleSaveUser}
                onDeleteUser={handleDeleteUser}
                onOpenCreateUserModal={() => setUserModalState({ isOpen: true, userToEdit: null })}
                onOpenEditUserModal={(u) => setUserModalState({ isOpen: true, userToEdit: u })}
              />
            )}

            {/* Fallback de Segurança: Garante que a tela NUNCA fique vazia caso a aba ativa não seja encontrada */}
            {!['tickets', 'calendar', 'notes', 'clients', 'reminders', 'teams', 'outlook', 'settings'].includes(activeTab) &&
              !activeTab.startsWith('ai_') &&
              !customSites.some((s) => s.id === activeTab) && (
                <TicketBoard
                  tickets={tickets}
                  notes={notes}
                  jiraInstances={jiraInstances}
                  searchQuery={searchQuery}
                  activeUser={activeUser}
                  onFetchJiraTicket={handleFetchJiraTicket}
                  onRefreshTickets={loadTickets}
                  onSaveTicket={handleSaveTicket}
                  onUpdateStatus={handleUpdateTicketStatus}
                  onDeleteTicket={handleDeleteTicket}
                  onDeleteTickets={handleDeleteTickets}
                  onBatchUpdateStatus={handleBatchUpdateTicketStatus}
                  onOpenSettings={() => setActiveTab('settings')}
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

      {/* Jira-Style Omnisearch / Global Command Palette Modal */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        tickets={tickets}
        notes={notes}
        folders={noteFolders}
        calendarEvents={calendarEvents}
        clients={clients}
        reminders={reminders}
        onSelectResult={handleGlobalSearchResultSelect}
      />

      {/* Modal / Prompt Interativo de Atualização */}
      <UpdateModal
        isOpen={updateModalOpen}
        updateStatus={updateStatus}
        onDownload={handleDownloadUpdate}
        onInstall={handleInstallUpdate}
        onClose={() => setUpdateModalOpen(false)}
      />
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
