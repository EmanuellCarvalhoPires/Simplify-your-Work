import React, { useState, useEffect } from 'react';
import type { JiraInstance, ThemeConfig, UserProfile, DatabaseStats, CalendarFeed, NotificationSettings, MeetingStatus, AiAssistantConfig, AiProvider, SidebarConfig, SidebarEntry, SidebarGroupEntry, SidebarItemEntry, NavTab, CustomSite } from '../../types/index';
import { DEFAULT_THEME, AI_PROVIDERS, DEFAULT_AI_CONFIG } from '../../types/index';
import { ALL_NAV_ITEMS, DEFAULT_SIDEBAR_CONFIG, loadStoredSidebarConfig, normalizeSidebarConfig, getNavItemDef, loadStoredCustomSites, SITE_ICONS } from '../layout/Sidebar';
import { Key, Palette, Plus, Trash2, Globe, Mail, ShieldCheck, Sparkles, Database, CheckCircle2, AlertCircle, RefreshCw, Calendar, Users, UserCheck, Edit3, FolderOpen, Download, HardDrive, FileSpreadsheet, Check, Bell, VolumeX, Video, Radio, Shield, Bot, ExternalLink, LayoutList, FolderPlus, ArrowUp, ArrowDown, Move, ChevronDown, Layers, RotateCcw, Folder, PlusCircle, X, Cloud, Code, Layout, CheckSquare, Zap, BookmarkPlus } from 'lucide-react';

interface SettingsViewProps {
  jiraInstances: JiraInstance[];
  themeConfig: ThemeConfig;
  aiConfig?: AiAssistantConfig;
  sidebarConfig?: SidebarConfig;
  customSites?: CustomSite[];
  activeUser?: UserProfile | null;
  users?: UserProfile[];
  onSaveJiraInstance: (instance: Omit<JiraInstance, 'id'> & { id?: string }) => Promise<void>;
  onDeleteJiraInstance: (id: string) => Promise<void>;
  onSaveThemeSettings: (theme: ThemeConfig) => Promise<void>;
  onSaveAiConfig?: (config: AiAssistantConfig) => Promise<void>;
  onSaveSidebarConfig?: (config: SidebarConfig) => Promise<void> | void;
  onSaveCustomSite?: (site: CustomSite) => Promise<void> | void;
  onDeleteCustomSite?: (id: string) => Promise<void> | void;
  onSelectActiveUser?: (id: string) => Promise<void>;
  onSaveUser?: (user: Partial<UserProfile>) => Promise<void>;
  onDeleteUser?: (id: string) => Promise<void>;
  onOpenCreateUserModal?: () => void;
  onOpenEditUserModal?: (user: UserProfile) => void;
}

const themePresets: ThemeConfig[] = [
  {
    presetName: 'Dark Slate (Padrão)',
    bgMain: '#181825',
    bgSidebar: '#1e1e2e',
    bgHeader: '#1e1e2e',
    bgCardJira: '#1e293b',
    bgCardApp: '#27273a',
    accentPrimary: '#6366f1',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
  },
  {
    presetName: 'Cyber Ocean (Ciano & Azul)',
    bgMain: '#0b192c',
    bgSidebar: '#1e3e62',
    bgHeader: '#1e3e62',
    bgCardJira: '#153448',
    bgCardApp: '#3c5b6f',
    accentPrimary: '#00d8f6',
    textPrimary: '#ffffff',
    textSecondary: '#94a3b8',
  },
  {
    presetName: 'Midnight Violet (Roxo Neon)',
    bgMain: '#13005a',
    bgSidebar: '#1c005a',
    bgHeader: '#1c005a',
    bgCardJira: '#00337c',
    bgCardApp: '#1f1d36',
    accentPrimary: '#c084fc',
    textPrimary: '#f8fafc',
    textSecondary: '#a5b4fc',
  },
  {
    presetName: 'Forest Emerald (Verde Escuro)',
    bgMain: '#051911',
    bgSidebar: '#0a291c',
    bgHeader: '#0a291c',
    bgCardJira: '#113f2a',
    bgCardApp: '#164e34',
    accentPrimary: '#10b981',
    textPrimary: '#f0fdf4',
    textSecondary: '#86efac',
  },
];

const COLOR_PRESETS = [
  '#0ea5e9', // Azul Ciano (Outlook)
  '#38bdf8', // Azul Claro (Tickets)
  '#6366f1', // Índigo / Roxo (Tema)
  '#818cf8', // Lilás (Teams)
  '#10b981', // Verde Esmeralda
  '#10a37f', // Verde OpenAI
  '#f59e0b', // Laranja Calendário
  '#d97706', // Âmbar Claude
  '#eab308', // Amarelo Ouro
  '#f43f5e', // Rosa Alerta
  '#ec4899', // Pink Neon
  '#a855f7', // Violeta
];

import {
  DynamicCustomIcon,
  BRAND_ICON_PRESETS,
  SYSTEM_ICON_PRESETS,
  EMOJI_KEYBOARD_PRESETS,
} from '../common/BrandIcons';

export const SettingsView: React.FC<SettingsViewProps> = ({
  jiraInstances,
  themeConfig,
  aiConfig,
  sidebarConfig,
  customSites = [],
  activeUser,
  users = [],
  onSaveJiraInstance,
  onDeleteJiraInstance,
  onSaveThemeSettings,
  onSaveAiConfig,
  onSaveSidebarConfig,
  onSaveCustomSite,
  onDeleteCustomSite,
  onSelectActiveUser,
  onSaveUser,
  onDeleteUser,
  onOpenCreateUserModal,
  onOpenEditUserModal,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'calendar' | 'notifications' | 'database' | 'jira' | 'ai' | 'sidebar' | 'theme' | 'legal' | 'updates'>('users');
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy'>('terms');
  const [legalDocs, setLegalDocs] = useState<{ termsContent: string; privacyContent: string }>({ termsContent: '', privacyContent: '' });

  // Auto Updater State
  const [updateStatus, setUpdateStatus] = useState<any>({ state: 'idle' });
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  useEffect(() => {
    if (window.electronAPI?.getUpdateStatus) {
      window.electronAPI.getUpdateStatus().then((status) => {
        if (status) setUpdateStatus(status);
      }).catch(() => {});
    }

    if (window.electronAPI?.onUpdateStatus) {
      const unsubscribe = window.electronAPI.onUpdateStatus((status) => {
        if (status) setUpdateStatus(status);
      });
      return () => unsubscribe();
    }
  }, []);

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI?.checkForUpdates) return;
    try {
      setIsCheckingUpdate(true);
      await window.electronAPI.checkForUpdates();
    } catch (err: any) {
      console.warn('Erro ao verificar atualizações:', err);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!window.electronAPI?.downloadUpdate) return;
    try {
      await window.electronAPI.downloadUpdate();
    } catch (err: any) {
      alert(`Falha ao iniciar download da atualização: ${err.message}`);
    }
  };

  const handleQuitAndInstall = () => {
    if (!window.electronAPI?.quitAndInstallUpdate) return;
    window.electronAPI.quitAndInstallUpdate();
  };

  // Custom Sites State
  const [localCustomSites, setLocalCustomSites] = useState<CustomSite[]>(() => {
    return (customSites && customSites.length > 0) ? customSites : loadStoredCustomSites();
  });
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<CustomSite | null>(null);
  const [siteTitle, setSiteTitle] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [siteIcon, setSiteIcon] = useState('globe');
  const [siteColor, setSiteColor] = useState('#0ea5e9');
  const [siteTargetGroup, setSiteTargetGroup] = useState('root');
  const [siteIconCategory, setSiteIconCategory] = useState<'brands' | 'system' | 'emoji'>('brands');
  const [siteEmojiInput, setSiteEmojiInput] = useState('');
  const [siteIconSearch, setSiteIconSearch] = useState('');

  useEffect(() => {
    if (customSites && customSites.length > 0) {
      setLocalCustomSites(customSites);
    }
  }, [customSites]);

  // Sidebar Configuration State
  const [localSidebarConfig, setLocalSidebarConfig] = useState<SidebarConfig>(() => {
    return normalizeSidebarConfig(sidebarConfig || loadStoredSidebarConfig(localCustomSites, aiConfig), localCustomSites, aiConfig);
  });
  const [newTopicName, setNewTopicName] = useState('');
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicName, setEditingTopicName] = useState('');
  const [sidebarNotice, setSidebarNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (sidebarConfig) {
      setLocalSidebarConfig(normalizeSidebarConfig(sidebarConfig, localCustomSites, aiConfig));
    } else {
      setLocalSidebarConfig(loadStoredSidebarConfig(localCustomSites, aiConfig));
    }
  }, [sidebarConfig, localCustomSites, aiConfig]);

  const saveSidebarConfigHelper = (config: SidebarConfig, msg?: string) => {
    const normalized = normalizeSidebarConfig(config, localCustomSites, aiConfig);
    setLocalSidebarConfig(normalized);
    try {
      localStorage.setItem('simplify_sidebar_config', JSON.stringify(normalized));
      if (onSaveSidebarConfig) {
        onSaveSidebarConfig(normalized);
      }
      setSidebarNotice({
        type: 'success',
        message: msg || 'Estrutura da barra lateral salva com sucesso!',
      });
      setTimeout(() => setSidebarNotice(null), 3500);
    } catch (e: any) {
      console.error(e);
      setSidebarNotice({
        type: 'error',
        message: e?.message || 'Erro ao salvar configuração da barra lateral.',
      });
    }
  };

  const handleCreateTopic = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = newTopicName.trim();
    if (!title) return;

    const newGroup: SidebarGroupEntry = {
      type: 'group',
      id: `group_${Date.now()}`,
      title,
      itemIds: [],
    };

    const updated: SidebarConfig = {
      entries: [...localSidebarConfig.entries, newGroup],
    };

    setNewTopicName('');
    saveSidebarConfigHelper(updated, `Tópico "${title}" criado com sucesso!`);
  };

  const handleDeleteTopic = (groupId: string) => {
    const group = localSidebarConfig.entries.find(
      (e) => e.type === 'group' && e.id === groupId
    ) as SidebarGroupEntry | undefined;
    if (!group) return;

    const newEntries: SidebarEntry[] = [];
    localSidebarConfig.entries.forEach((entry) => {
      if (entry.type === 'group' && entry.id === groupId) {
        (entry.itemIds || []).forEach((itemId) => {
          newEntries.push({ type: 'item', id: itemId });
        });
      } else {
        newEntries.push(entry);
      }
    });

    const updated: SidebarConfig = { entries: newEntries };
    saveSidebarConfigHelper(updated, `Tópico "${group.title}" removido e itens desagrupados.`);
  };

  const handleRenameTopic = (groupId: string, newTitle: string) => {
    const clean = newTitle.trim();
    if (!clean) return;

    const updated: SidebarConfig = {
      entries: localSidebarConfig.entries.map((entry) => {
        if (entry.type === 'group' && entry.id === groupId) {
          return { ...entry, title: clean };
        }
        return entry;
      }),
    };

    setEditingTopicId(null);
    setEditingTopicName('');
    saveSidebarConfigHelper(updated, `Tópico renomeado para "${clean}".`);
  };

  const handleMoveEntry = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= localSidebarConfig.entries.length) return;

    const entries = [...localSidebarConfig.entries];
    const [moved] = entries.splice(index, 1);
    entries.splice(targetIndex, 0, moved);

    saveSidebarConfigHelper({ entries });
  };

  const handleMoveItemInGroup = (groupId: string, itemIndex: number, direction: 'up' | 'down') => {
    const targetGroup = localSidebarConfig.entries.find(
      (e) => e.type === 'group' && e.id === groupId
    ) as SidebarGroupEntry | undefined;
    if (!targetGroup) return;

    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    if (targetIndex < 0 || targetIndex >= targetGroup.itemIds.length) return;

    const newItemIds = [...targetGroup.itemIds];
    const [moved] = newItemIds.splice(itemIndex, 1);
    newItemIds.splice(targetIndex, 0, moved);

    const updated: SidebarConfig = {
      entries: localSidebarConfig.entries.map((entry) => {
        if (entry.type === 'group' && entry.id === groupId) {
          return { ...entry, itemIds: newItemIds };
        }
        return entry;
      }),
    };

    saveSidebarConfigHelper(updated);
  };

  const handleMoveItemToGroup = (itemId: NavTab, targetGroupId: string | 'root') => {
    const cleanedEntries: SidebarEntry[] = [];
    localSidebarConfig.entries.forEach((entry) => {
      if (entry.type === 'item') {
        if (entry.id !== itemId) {
          cleanedEntries.push(entry);
        }
      } else if (entry.type === 'group') {
        cleanedEntries.push({
          ...entry,
          itemIds: (entry.itemIds || []).filter((id) => id !== itemId),
        });
      }
    });

    if (targetGroupId === 'root') {
      cleanedEntries.push({ type: 'item', id: itemId });
    } else {
      const gIndex = cleanedEntries.findIndex((e) => e.type === 'group' && e.id === targetGroupId);
      if (gIndex !== -1) {
        const targetG = cleanedEntries[gIndex] as SidebarGroupEntry;
        cleanedEntries[gIndex] = {
          ...targetG,
          itemIds: [...targetG.itemIds, itemId],
        };
      } else {
        cleanedEntries.push({ type: 'item', id: itemId });
      }
    }

    const itemLabel = ALL_NAV_ITEMS[itemId]?.label || itemId;
    saveSidebarConfigHelper({ entries: cleanedEntries }, `Botão "${itemLabel}" reposicionado!`);
  };

  const handleResetSidebarDefault = () => {
    if (window.confirm('Deseja realmente restaurar a organização e agrupamentos padrão da barra lateral?')) {
      saveSidebarConfigHelper(DEFAULT_SIDEBAR_CONFIG, 'Barra lateral restaurada para o padrão!');
    }
  };

  const handleOpenAddSiteModal = (targetGroupId?: string) => {
    setEditingSite(null);
    setSiteTitle('');
    setSiteUrl('');
    setSiteIcon('globe');
    setSiteColor('#0ea5e9');
    setSiteTargetGroup(targetGroupId || 'root');
    setSiteIconCategory('brands');
    setSiteEmojiInput('');
    setSiteIconSearch('');
    setIsSiteModalOpen(true);
  };

  const handleOpenEditSiteModal = (site: CustomSite) => {
    setEditingSite(site);
    setSiteTitle(site.title);
    setSiteUrl(site.url);
    const iconVal = site.icon || 'globe';
    setSiteIcon(iconVal);
    setSiteColor(site.color || '#0ea5e9');
    setSiteIconSearch('');

    if (iconVal.startsWith('emoji:') || /\p{Extended_Pictographic}/u.test(iconVal)) {
      setSiteIconCategory('emoji');
      setSiteEmojiInput(iconVal.replace('emoji:', ''));
    } else if (BRAND_ICON_PRESETS.some((b) => b.id === iconVal)) {
      setSiteIconCategory('brands');
      setSiteEmojiInput('');
    } else {
      setSiteIconCategory('system');
      setSiteEmojiInput('');
    }

    let currentGroup = 'root';
    for (const entry of localSidebarConfig.entries) {
      if (entry.type === 'group' && (entry.itemIds || []).includes(site.id)) {
        currentGroup = entry.id;
        break;
      }
    }
    setSiteTargetGroup(currentGroup);
    setIsSiteModalOpen(true);
  };

  const handleSaveCustomSiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = siteTitle.trim();
    let url = siteUrl.trim();
    if (!title || !url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    if (editingSite) {
      const updatedSite: CustomSite = {
        ...editingSite,
        title,
        url,
        icon: siteIcon,
        color: siteColor,
      };

      const updatedSites = localCustomSites.map((s) => (s.id === editingSite.id ? updatedSite : s));
      setLocalCustomSites(updatedSites);
      try {
        localStorage.setItem('simplify_custom_sites', JSON.stringify(updatedSites));
      } catch (err) {
        console.error(err);
      }
      if (onSaveCustomSite) {
        await onSaveCustomSite(updatedSite);
      }

      handleMoveItemToGroup(editingSite.id, siteTargetGroup);
      setIsSiteModalOpen(false);
      setSidebarNotice({
        type: 'success',
        message: `Site "${title}" atualizado com sucesso!`,
      });
      setTimeout(() => setSidebarNotice(null), 3500);
    } else {
      const newId = `site_${Date.now()}`;
      const newSite: CustomSite = {
        id: newId,
        title,
        url,
        icon: siteIcon,
        color: siteColor,
        createdAt: new Date().toISOString(),
      };

      const updatedSites = [...localCustomSites, newSite];
      setLocalCustomSites(updatedSites);
      try {
        localStorage.setItem('simplify_custom_sites', JSON.stringify(updatedSites));
      } catch (err) {
        console.error(err);
      }
      if (onSaveCustomSite) {
        await onSaveCustomSite(newSite);
      }

      const newEntries = [...localSidebarConfig.entries];
      if (siteTargetGroup === 'root') {
        newEntries.push({ type: 'item', id: newId });
      } else {
        const gIdx = newEntries.findIndex((e) => e.type === 'group' && e.id === siteTargetGroup);
        if (gIdx !== -1) {
          const g = newEntries[gIdx] as SidebarGroupEntry;
          newEntries[gIdx] = {
            ...g,
            itemIds: [...(g.itemIds || []), newId],
          };
        } else {
          newEntries.push({ type: 'item', id: newId });
        }
      }

      saveSidebarConfigHelper({ entries: newEntries }, `Site "${title}" adicionado à barra lateral!`);
      setIsSiteModalOpen(false);
    }
  };

  const handleDeleteCustomSiteAction = async (siteId: string) => {
    const siteObj = localCustomSites.find((s) => s.id === siteId);
    const siteName = siteObj?.title || 'Site';
    if (!window.confirm(`Deseja realmente excluir o site "${siteName}" da barra lateral?`)) {
      return;
    }

    const updatedSites = localCustomSites.filter((s) => s.id !== siteId);
    setLocalCustomSites(updatedSites);
    try {
      localStorage.setItem('simplify_custom_sites', JSON.stringify(updatedSites));
    } catch (err) {
      console.error(err);
    }
    if (onDeleteCustomSite) {
      await onDeleteCustomSite(siteId);
    }

    const cleanedEntries: SidebarEntry[] = [];
    localSidebarConfig.entries.forEach((entry) => {
      if (entry.type === 'item') {
        if (entry.id !== siteId) {
          cleanedEntries.push(entry);
        }
      } else if (entry.type === 'group') {
        cleanedEntries.push({
          ...entry,
          itemIds: (entry.itemIds || []).filter((id) => id !== siteId),
        });
      }
    });

    saveSidebarConfigHelper({ entries: cleanedEntries }, `Site "${siteName}" removido.`);
  };

  // AI Assistant State
  const [localAiConfig, setLocalAiConfig] = useState<AiAssistantConfig>(() => {
    if (aiConfig) {
      const enabled = aiConfig.enabledProviders || [];
      const updatedList = [...enabled];
      if (aiConfig.provider && aiConfig.provider !== 'none' && !updatedList.includes(aiConfig.provider)) {
        updatedList.push(aiConfig.provider);
      }
      return { ...aiConfig, enabledProviders: updatedList };
    }
    return DEFAULT_AI_CONFIG;
  });
  const [aiNotice, setAiNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSavingAi, setIsSavingAi] = useState(false);

  useEffect(() => {
    if (aiConfig) {
      const enabled = Array.isArray(aiConfig.enabledProviders) ? aiConfig.enabledProviders : [];
      setLocalAiConfig({
        enabledProviders: enabled,
      });
    }
  }, [aiConfig]);

  const handleToggleAiProvider = async (provider: ActiveAiProvider) => {
    const currentList = localAiConfig.enabledProviders || [];
    const isCurrentlyEnabled = currentList.includes(provider);
    const updatedProviders = isCurrentlyEnabled
      ? currentList.filter((p) => p !== provider)
      : [...currentList, provider];

    const updated: AiAssistantConfig = {
      enabledProviders: updatedProviders,
    };
    setLocalAiConfig(updated);
    setAiNotice(null);

    if (onSaveAiConfig) {
      try {
        setIsSavingAi(true);
        await onSaveAiConfig(updated);
        setAiNotice({
          type: 'success',
          message: isCurrentlyEnabled
            ? `Assistente ${AI_PROVIDERS[provider]?.name || ''} desativado da barra lateral.`
            : `Assistente ${AI_PROVIDERS[provider]?.name || ''} ativado na barra lateral!`,
        });
      } catch (err: any) {
        setAiNotice({
          type: 'error',
          message: err.message || 'Erro ao salvar configuração de IA.',
        });
      } finally {
        setIsSavingAi(false);
      }
    }
  };

  const handleToggleAllAi = async (enableAll: boolean) => {
    const allProviders: ActiveAiProvider[] = ['chatgpt', 'claude', 'gemini'];
    const updatedProviders = enableAll ? allProviders : [];
    const updated: AiAssistantConfig = {
      ...localAiConfig,
      enabledProviders: updatedProviders,
    };
    setLocalAiConfig(updated);
    setAiNotice(null);

    if (onSaveAiConfig) {
      try {
        setIsSavingAi(true);
        await onSaveAiConfig(updated);
        setAiNotice({
          type: 'success',
          message: enableAll
            ? 'Todos os assistentes de IA foram ativados na barra lateral!'
            : 'Todos os assistentes de IA foram desativados da barra lateral.',
        });
      } catch (err: any) {
        setAiNotice({
          type: 'error',
          message: err.message || 'Erro ao atualizar configurações de IA.',
        });
      } finally {
        setIsSavingAi(false);
      }
    }
  };

  // Notifications & Meeting Mute State
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    muteInTeamsMeetings: true,
    muteInCalendarMeetings: false,
    postponeMutedReminders: true,
  });
  const [meetingStatus, setMeetingStatus] = useState<MeetingStatus | null>(null);
  const [isCheckingMeeting, setIsCheckingMeeting] = useState(false);
  const [notificationNotice, setNotificationNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Jira State
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [isSavingJira, setIsSavingJira] = useState(false);
  const [atlassianClientId, setAtlassianClientId] = useState('');
  const [atlassianClientSecret, setAtlassianClientSecret] = useState('');
  const [atlassianProxyUrl, setAtlassianProxyUrl] = useState('');
  const [isSavingClientId, setIsSavingClientId] = useState(false);
  const [showOAuthGuide, setShowOAuthGuide] = useState(false);
  const [clientIdNotice, setClientIdNotice] = useState<string | null>(null);

  // Database (SQLite) State
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [isLoadingDbStats, setIsLoadingDbStats] = useState(false);
  const [dbNotice, setDbNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isExportingDb, setIsExportingDb] = useState(false);

  // Calendar Multi-Feeds State
  const [calendarFeeds, setCalendarFeeds] = useState<CalendarFeed[]>([]);
  const [outlookUrlInput, setOutlookUrlInput] = useState('');
  const [googleUrlInput, setGoogleUrlInput] = useState('');
  const [isSavingCalendar, setIsSavingCalendar] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [syncingFeedId, setSyncingFeedId] = useState<string | null>(null);
  const [calendarNotice, setCalendarNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Theme State
  const [customTheme, setCustomTheme] = useState<ThemeConfig>(themeConfig || DEFAULT_THEME);

  useEffect(() => {
    if (themeConfig && themeConfig.bgMain) {
      setCustomTheme(themeConfig);
    }
  }, [themeConfig]);

  useEffect(() => {
    if (window.electronAPI?.getAtlassianClientId) {
      window.electronAPI.getAtlassianClientId().then((cid) => {
        if (cid) setAtlassianClientId(cid);
      });
    }
    if (window.electronAPI?.getAtlassianClientSecret) {
      window.electronAPI.getAtlassianClientSecret().then((cs) => {
        if (cs) setAtlassianClientSecret(cs);
      });
    }
    if (window.electronAPI?.getAtlassianProxyUrl) {
      window.electronAPI.getAtlassianProxyUrl().then((purl) => {
        if (purl) setAtlassianProxyUrl(purl);
      });
    }
  }, []);

  const loadNotificationSettings = async () => {
    try {
      if (window.electronAPI?.getNotificationSettings) {
        const settings = await window.electronAPI.getNotificationSettings();
        if (settings) setNotificationSettings(settings);
      }
      if (window.electronAPI?.checkMeetingStatus) {
        const status = await window.electronAPI.checkMeetingStatus();
        setMeetingStatus(status);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações de notificação:', err);
    }
  };

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') {
      loadNotificationSettings();
    }
  }, [activeTab]);

  const handleToggleNotificationSetting = async (key: keyof NotificationSettings) => {
    const updated = {
      ...notificationSettings,
      [key]: !notificationSettings[key],
    };
    setNotificationSettings(updated);
    try {
      if (window.electronAPI?.saveNotificationSettings) {
        await window.electronAPI.saveNotificationSettings(updated);
        setNotificationNotice({
          type: 'success',
          message: 'Preferências de notificações salvas com sucesso!',
        });
        setTimeout(() => setNotificationNotice(null), 3000);
      }
    } catch (err: any) {
      setNotificationNotice({
        type: 'error',
        message: err?.message || 'Falha ao salvar configurações.',
      });
    }
  };

  const handleRefreshMeetingStatus = async () => {
    try {
      setIsCheckingMeeting(true);
      if (window.electronAPI?.checkMeetingStatus) {
        const status = await window.electronAPI.checkMeetingStatus(true);
        setMeetingStatus(status);
      }
    } catch (err: any) {
      console.error('Erro ao verificar status de reuniões:', err);
    } finally {
      setIsCheckingMeeting(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'legal' && window.electronAPI?.getLegalDocs) {
      window.electronAPI.getLegalDocs().then((docs) => {
        setLegalDocs(docs);
      }).catch((err) => console.error(err));
    }
  }, [activeTab]);

  const handleSaveAtlassianCredentials = async () => {
    try {
      setIsSavingClientId(true);
      if (window.electronAPI?.saveAtlassianClientId) {
        await window.electronAPI.saveAtlassianClientId(atlassianClientId);
      }
      if (window.electronAPI?.saveAtlassianClientSecret) {
        await window.electronAPI.saveAtlassianClientSecret(atlassianClientSecret);
      }
      if (window.electronAPI?.saveAtlassianProxyUrl) {
        await window.electronAPI.saveAtlassianProxyUrl(atlassianProxyUrl);
      }
      setClientIdNotice('✨ Credenciais e URL do Proxy salvas com sucesso!');
      setTimeout(() => setClientIdNotice(null), 4000);
    } catch (e: any) {
      alert(`Erro ao salvar credenciais: ${e.message}`);
    } finally {
      setIsSavingClientId(false);
    }
  };

  const handleAtlassianOAuth = async () => {
    if (!window.electronAPI?.startAtlassianOAuth) return;
    try {
      setIsSavingJira(true);
      const result = await window.electronAPI.startAtlassianOAuth(
        atlassianClientId.trim() || undefined,
        atlassianClientSecret.trim() || undefined,
        atlassianProxyUrl.trim() || undefined
      );

      let activatedUserEmail = '';
      let activatedUserName = '';

      // 1. Process authenticated user profile from Atlassian
      if (result && result.userInfo && result.userInfo.email) {
        const uEmail = result.userInfo.email.trim();
        const uName = result.userInfo.name?.trim() || uEmail.split('@')[0] || 'Usuário Atlassian';
        activatedUserEmail = uEmail;
        activatedUserName = uName;

        // Retrieve latest user profiles in app
        const allUsers = (await window.electronAPI.getUsers()) || users || [];
        const existing = allUsers.find((u) => u.email.trim().toLowerCase() === uEmail.toLowerCase());

        let targetUser: UserProfile;
        if (existing) {
          targetUser = await window.electronAPI.saveUser({
            ...existing,
            name: existing.name || uName,
          });
        } else {
          targetUser = await window.electronAPI.saveUser({
            name: uName,
            email: uEmail,
            role: 'Assistente Atlassian',
            avatarColor: '#6366f1',
          });
        }

        if (targetUser && targetUser.id) {
          await window.electronAPI.setActiveUser(targetUser.id);
          if (onSelectActiveUser) {
            await onSelectActiveUser(targetUser.id);
          } else if (onSaveUser) {
            await onSaveUser(targetUser);
          }
        }
      }

      // 2. Add/connect Jira sites returned from Atlassian OAuth
      if (result && result.sites && result.sites.length > 0) {
        let added = 0;
        const currentInstances = (await window.electronAPI.getJiraInstances()) || jiraInstances || [];

        for (const site of result.sites) {
          const siteCleanUrl = (site.url || '').toLowerCase().replace(/\/+$/, '');
          const existingInst = currentInstances.find((i) => {
            const instCleanUrl = (i.domain || '').toLowerCase().replace(/\/+$/, '');
            return (
              (instCleanUrl && siteCleanUrl && (instCleanUrl === siteCleanUrl || instCleanUrl.includes(siteCleanUrl) || siteCleanUrl.includes(instCleanUrl))) ||
              (i.cloudId && i.cloudId === site.id)
            );
          });

          await onSaveJiraInstance({
            id: existingInst ? existingInst.id : undefined,
            name: site.name || existingInst?.name || 'Jira Cloud',
            domain: site.url,
            email: activatedUserEmail || existingInst?.email || 'atlassian@empresa.com',
            apiToken: result.accessToken,
            authType: 'OAUTH',
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            cloudId: site.id,
            avatarUrl: site.avatarUrl,
          });
          added++;
        }
        alert(
          `⚡ Login Atlassian realizado com sucesso!\n\n` +
            (activatedUserEmail ? `👤 Perfil de Usuário: ${activatedUserName} (${activatedUserEmail})\n` : '') +
            `🌐 ${added} site(s) Jira conectado(s) e cadastrado(s) como Clientes (Assets) no Simplify your Work!`
        );
      } else if (activatedUserEmail) {
        alert(
          `⚡ Autenticado na Atlassian com sucesso!\n\n👤 Perfil do Usuário: ${activatedUserName} (${activatedUserEmail}) criado e ativado no aplicativo.`
        );
      } else {
        alert('Nenhum site Jira ou perfil foi retornado pela conta Atlassian.');
      }
    } catch (err: any) {
      alert(`Falha no login Atlassian: ${err.message}`);
    } finally {
      setIsSavingJira(false);
    }
  };

  useEffect(() => {
    refreshDbStats();
    loadCalendarUrlSettings();
  }, []);

  const loadCalendarUrlSettings = async () => {
    try {
      if (window.electronAPI?.getCalendarFeeds) {
        const feeds = await window.electronAPI.getCalendarFeeds();
        if (Array.isArray(feeds)) {
          setCalendarFeeds(feeds);
          const outFeed = feeds.find((f) => f.id === 'outlook');
          const googFeed = feeds.find((f) => f.id === 'google');
          if (outFeed) setOutlookUrlInput(outFeed.url || '');
          if (googFeed) setGoogleUrlInput(googFeed.url || '');
        }
      } else if (window.electronAPI?.getCalendarUrl) {
        const url = await window.electronAPI.getCalendarUrl();
        if (url) setOutlookUrlInput(url);
      }
    } catch (err) {
      console.error('Erro ao carregar feeds de calendário:', err);
    }
  };

  const handleSaveCalendarUrlSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingCalendar(true);
      setCalendarNotice(null);

      if (window.electronAPI?.saveCalendarFeed && window.electronAPI?.syncCalendar) {
        await window.electronAPI.saveCalendarFeed({
          id: 'outlook',
          url: outlookUrlInput.trim(),
          enabled: Boolean(outlookUrlInput.trim()),
        });
        await window.electronAPI.saveCalendarFeed({
          id: 'google',
          url: googleUrlInput.trim(),
          enabled: Boolean(googleUrlInput.trim()),
        });

        const res = await window.electronAPI.syncCalendar();
        if (window.electronAPI.getCalendarFeeds) {
          const feeds = await window.electronAPI.getCalendarFeeds();
          if (Array.isArray(feeds)) setCalendarFeeds(feeds);
        }

        setCalendarNotice({
          type: 'success',
          message: `🟢 Agendas salvas e sincronizadas! ${res.events.length} reuniões carregadas (${res.remindersCreated || 0} novos lembretes de 30 min criados).`,
        });
      }
    } catch (err: any) {
      setCalendarNotice({
        type: 'error',
        message: err.message || 'Erro ao salvar configurações de agenda.',
      });
    } finally {
      setIsSavingCalendar(false);
    }
  };

  const handleSyncCalendarSettings = async () => {
    try {
      setIsSyncingCalendar(true);
      setCalendarNotice(null);
      if (window.electronAPI?.syncCalendar) {
        const res = await window.electronAPI.syncCalendar();
        if (window.electronAPI.getCalendarFeeds) {
          const feeds = await window.electronAPI.getCalendarFeeds();
          if (Array.isArray(feeds)) setCalendarFeeds(feeds);
        }
        setCalendarNotice({
          type: 'success',
          message: `🟢 Sincronização concluída! ${res.events.length} reuniões encontradas.`,
        });
      }
    } catch (err: any) {
      setCalendarNotice({
        type: 'error',
        message: err.message || 'Falha ao sincronizar agenda.',
      });
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const handleSyncSingleFeedSettings = async (feedId: string, url: string) => {
    if (!url.trim()) {
      setCalendarNotice({
        type: 'error',
        message: 'Preencha o link da agenda antes de sincronizar.',
      });
      return;
    }

    try {
      setSyncingFeedId(feedId);
      setCalendarNotice(null);
      if (window.electronAPI?.saveCalendarFeed && window.electronAPI?.syncCalendar) {
        await window.electronAPI.saveCalendarFeed({ id: feedId, url: url.trim(), enabled: true });
        const res = await window.electronAPI.syncCalendar(url.trim(), feedId);
        if (window.electronAPI.getCalendarFeeds) {
          const feeds = await window.electronAPI.getCalendarFeeds();
          if (Array.isArray(feeds)) setCalendarFeeds(feeds);
        }
        setCalendarNotice({
          type: 'success',
          message: `🟢 Agenda ${feedId === 'google' ? 'Google' : 'Outlook'} sincronizada com sucesso!`,
        });
      }
    } catch (err: any) {
      setCalendarNotice({
        type: 'error',
        message: err?.message || 'Falha ao sincronizar feed.',
      });
    } finally {
      setSyncingFeedId(null);
    }
  };

  const refreshDbStats = async () => {
    try {
      setIsLoadingDbStats(true);
      if (window.electronAPI && window.electronAPI.getDatabaseStats) {
        const stats = await window.electronAPI.getDatabaseStats();
        setDbStats(stats);
      }
    } catch (err: any) {
      console.error('Erro ao carregar métricas do SQLite:', err);
    } finally {
      setIsLoadingDbStats(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'database') {
      refreshDbStats();
    }
  }, [activeTab]);

  const handleOpenDbFolder = async () => {
    try {
      if (window.electronAPI && window.electronAPI.openDatabaseFolder) {
        await window.electronAPI.openDatabaseFolder();
      }
    } catch (err: any) {
      setDbNotice({
        type: 'error',
        message: err.message || 'Falha ao abrir a pasta do banco de dados.',
      });
    }
  };

  const handleExportDbBackup = async () => {
    try {
      setIsExportingDb(true);
      setDbNotice(null);
      if (window.electronAPI && window.electronAPI.exportDatabaseBackup) {
        const success = await window.electronAPI.exportDatabaseBackup();
        if (success) {
          setDbNotice({
            type: 'success',
            message: '🟢 Cópia de backup do banco SQLite exportada com sucesso!',
          });
        }
      }
    } catch (err: any) {
      setDbNotice({
        type: 'error',
        message: err.message || 'Falha ao exportar cópia de segurança do banco.',
      });
    } finally {
      setIsExportingDb(false);
    }
  };

  const handleAddJira = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !domain.trim() || !email.trim() || !apiToken.trim()) return;

    let cleanDomain = domain.trim();
    if (!cleanDomain.startsWith('http://') && !cleanDomain.startsWith('https://')) {
      cleanDomain = 'https://' + cleanDomain;
    }

    try {
      setIsSavingJira(true);
      await onSaveJiraInstance({
        name: name.trim(),
        domain: cleanDomain,
        email: email.trim(),
        apiToken: apiToken.trim(),
      });
      setName('');
      setDomain('');
      setEmail('');
      setApiToken('');
      alert('Instância Jira salva com sucesso!');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingJira(false);
    }
  };

  const handleApplyPreset = (preset: ThemeConfig) => {
    setCustomTheme(preset);
    if (typeof onSaveThemeSettings === 'function') {
      onSaveThemeSettings(preset);
    }
  };

  const handleColorChange = (key: keyof ThemeConfig, val: string) => {
    const baseTheme = customTheme || DEFAULT_THEME;
    const updated: ThemeConfig = { ...baseTheme, [key]: val, presetName: 'Personalizado' };
    setCustomTheme(updated);
    if (typeof onSaveThemeSettings === 'function') {
      onSaveThemeSettings(updated);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerBar}>
        <h1 style={styles.title}>Configurações do Aplicativo</h1>

        <div style={styles.tabNav}>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'users' ? styles.activeTabBtn : {}) }}
            onClick={() => setActiveTab('users')}
          >
            <Users size={16} /> Perfis de Usuários ({users.length})
          </button>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'calendar' ? styles.activeTabBtn : {}) }}
            onClick={() => setActiveTab('calendar')}
          >
            <Calendar size={16} /> Agenda Microsoft / ICS
          </button>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'notifications' ? styles.activeTabBtn : {}) }}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={16} /> Notificações & Reuniões
          </button>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'database' ? styles.activeTabBtn : {}) }}
            onClick={() => setActiveTab('database')}
          >
            <Database size={16} /> Banco de Dados SQL
          </button>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'jira' ? styles.activeTabBtn : {}) }}
            onClick={() => setActiveTab('jira')}
          >
            <Key size={16} /> APIs do Jira ({jiraInstances.length})
          </button>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'ai' ? styles.activeTabBtn : {}) }}
            onClick={() => setActiveTab('ai')}
          >
            <Bot size={16} /> Assistente de IA ({localAiConfig.enabledProviders?.length || 0} ativas)
          </button>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'sidebar' ? styles.activeTabBtn : {}) }}
            onClick={() => setActiveTab('sidebar')}
          >
            <LayoutList size={16} /> Barra Lateral & Tópicos
          </button>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'theme' ? styles.activeTabBtn : {}) }}
            onClick={() => setActiveTab('theme')}
          >
            <Palette size={16} /> Cores da Interface
          </button>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'legal' ? styles.activeTabBtn : {}) }}
            onClick={() => setActiveTab('legal')}
          >
            <ShieldCheck size={16} /> Sobre & Termos
          </button>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'updates' ? styles.activeTabBtn : {}) }}
            onClick={() => setActiveTab('updates')}
          >
            <RefreshCw size={16} /> Atualizações
          </button>
        </div>
      </div>

      {/* === USERS TAB === */}
      {activeTab === 'users' && (
        <div style={styles.section}>
          <div style={styles.formCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={styles.cardTitle}>
                  <Users size={18} color="var(--accent-primary)" /> Cadastro & Perfis de Usuários
                </h2>
                <p style={styles.cardSub}>
                  Cadastre novos usuários e alterne o usuário ativo. O tema de cores escolhido fica vinculado a cada usuário.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (onOpenCreateUserModal) onOpenCreateUserModal();
                }}
              >
                <Plus size={16} /> Cadastrar Novo Usuário
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
              {users.map((u) => {
                const isActive = activeUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: '16px',
                      padding: '20px',
                      border: isActive ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          backgroundColor: u.avatarColor || '#6366f1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          color: '#ffffff',
                          fontSize: '16px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        }}
                      >
                        {u.name.trim().split(' ').length >= 2
                          ? (u.name.trim().split(' ')[0][0] + u.name.trim().split(' ').slice(-1)[0][0]).toUpperCase()
                          : u.name[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.name}
                        </h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.email}
                        </p>
                        {u.role && (
                          <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '600' }}>
                            {u.role}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Associated Theme Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '10px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Tema Atrelado:</span>
                      <span style={{ fontWeight: '700', color: '#ffffff', marginLeft: 'auto' }}>
                        {u.themeConfig?.presetName || 'Dark Slate'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      {!isActive ? (
                        <button
                          className="btn btn-secondary"
                          style={{ flex: 1, fontSize: '12px', padding: '8px 12px' }}
                          onClick={() => onSelectActiveUser && onSelectActiveUser(u.id)}
                        >
                          <UserCheck size={14} /> Definir Como Ativo
                        </button>
                      ) : (
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                            color: 'var(--accent-primary)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            padding: '8px',
                          }}
                        >
                          <UserCheck size={14} /> Usuário Ativo Atual
                        </div>
                      )}

                      <button
                        className="btn-icon"
                        onClick={() => onOpenEditUserModal && onOpenEditUserModal(u)}
                        title="Editar Perfil"
                      >
                        <Edit3 size={16} color="var(--accent-primary)" />
                      </button>

                      {users.length > 1 && (
                        <button
                          className="btn-icon"
                          onClick={() => onDeleteUser && onDeleteUser(u.id)}
                          title="Excluir Usuário"
                        >
                          <Trash2 size={16} color="#f43f5e" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div style={styles.section}>
          <div style={styles.formCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={styles.cardTitle}>
                  <Calendar size={20} color="var(--accent-primary)" /> Agendas & Feeds de Calendário (ICS)
                </h2>
                <p style={styles.cardSub}>
                  Conecte sua <strong>Agenda Microsoft Outlook</strong> (Trabalho) e sua <strong>Agenda Google Calendar</strong> (Pessoal). O aplicativo sincroniza os eventos, permite alternar a visualização e agenda alarmes no Windows <strong>30 minutos antes</strong> de cada reunião.
                </p>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '12px', gap: '6px' }}
                onClick={handleSyncCalendarSettings}
                disabled={isSyncingCalendar}
              >
                <RefreshCw size={14} className={isSyncingCalendar ? 'spin-anim' : ''} /> Sincronizar Todas as Agendas
              </button>
            </div>

            {calendarNotice && (
              <div
                style={{
                  ...styles.mongoNoticeBox,
                  backgroundColor: calendarNotice.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                }}
              >
                {calendarNotice.type === 'success' ? (
                  <CheckCircle2 size={18} color="#10b981" />
                ) : (
                  <AlertCircle size={18} color="#ef4444" />
                )}
                <span
                  style={{
                    fontSize: '13px',
                    color: calendarNotice.type === 'success' ? '#10b981' : '#f87171',
                  }}
                >
                  {calendarNotice.message}
                </span>
              </div>
            )}

            <form onSubmit={handleSaveCalendarUrlSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
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
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#6366f1' }} />
                    <strong style={{ fontSize: '14px', color: '#fff' }}>1. Microsoft Outlook (Trabalho / Office 365)</strong>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleSyncSingleFeedSettings('outlook', outlookUrlInput)}
                    disabled={syncingFeedId === 'outlook' || !outlookUrlInput.trim()}
                    style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}
                  >
                    <RefreshCw size={12} className={syncingFeedId === 'outlook' ? 'spin-anim' : ''} />
                    Sincronizar Outlook
                  </button>
                </div>

                <div>
                  <label style={styles.label}>Link ICS ou HTML do Outlook:</label>
                  <input
                    type="text"
                    className="input-field"
                    value={outlookUrlInput}
                    onChange={(e) => setOutlookUrlInput(e.target.value)}
                    placeholder="https://outlook.office365.com/owa/calendar/.../calendar.ics"
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                    💡 <strong>Como obter:</strong> No Outlook Web &gt; Configurações ⚙️ &gt; Calendário &gt; Calendários Compartilhados &gt; Publicar um calendário &gt; Copiar link ICS.
                  </span>
                </div>
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
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                    <strong style={{ fontSize: '14px', color: '#fff' }}>2. Google Calendar (Pessoal)</strong>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleSyncSingleFeedSettings('google', googleUrlInput)}
                    disabled={syncingFeedId === 'google' || !googleUrlInput.trim()}
                    style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}
                  >
                    <RefreshCw size={12} className={syncingFeedId === 'google' ? 'spin-anim' : ''} />
                    Sincronizar Google
                  </button>
                </div>

                <div>
                  <label style={styles.label}>Link iCal Secreto do Google (.ics):</label>
                  <input
                    type="text"
                    className="input-field"
                    value={googleUrlInput}
                    onChange={(e) => setGoogleUrlInput(e.target.value)}
                    placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                    💡 <strong>Como obter:</strong> Acesse calendar.google.com &gt; ⚙️ Configurações &gt; Selecione sua agenda pessoal &gt; Role até <strong>"Integrar agenda"</strong> &gt; Copie o <strong>"Endereço secreto no formato iCal"</strong>.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" disabled={isSavingCalendar}>
                  <CheckCircle2 size={16} /> {isSavingCalendar ? 'Salvando...' : 'Salvar e Sincronizar Agendas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === NOTIFICATIONS & TEAMS MEETINGS TAB === */}
      {activeTab === 'notifications' && (
        <div style={styles.section}>
          {/* Status Alert Banner */}
          {notificationNotice && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 18px',
                borderRadius: '12px',
                marginBottom: '20px',
                backgroundColor: notificationNotice.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${notificationNotice.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: notificationNotice.type === 'success' ? '#34d399' : '#f87171',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              <CheckCircle2 size={16} />
              {notificationNotice.message}
            </div>
          )}

          {/* Real-time Meeting Status Card */}
          <div style={styles.formCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h2 style={styles.cardTitle}>
                  <Radio size={18} color="var(--accent-primary)" /> Detector de Reuniões em Tempo Real
                </h2>
                <p style={styles.cardSub}>
                  Monitora chamadas ativas do Microsoft Teams e reuniões agendadas para silenciar lembretes automaticamente.
                </p>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '12px' }}
                onClick={handleRefreshMeetingStatus}
                disabled={isCheckingMeeting}
              >
                <RefreshCw size={14} className={isCheckingMeeting ? 'spin' : ''} /> Verificar Status Agora
              </button>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                borderRadius: '14px',
                padding: '20px',
                border: `1px solid ${meetingStatus?.inMeeting ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: meetingStatus?.inMeeting ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: meetingStatus?.inMeeting ? '#fbbf24' : '#34d399',
                  }}
                >
                  {meetingStatus?.inMeeting ? <VolumeX size={22} /> : <Bell size={22} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: meetingStatus?.inMeeting ? '#fbbf24' : '#34d399',
                        boxShadow: `0 0 8px ${meetingStatus?.inMeeting ? '#fbbf24' : '#34d399'}`,
                      }}
                    />
                    <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                      {meetingStatus?.inMeeting ? 'Modo Reunião Ativo (Lembretes Silenciados)' : 'Livre (Lembretes Ativos)'}
                    </strong>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {meetingStatus?.inMeeting
                      ? meetingStatus.reason || 'Uma reunião ou chamada está em andamento.'
                      : 'Nenhuma reunião do Teams ou chamada em andamento no momento.'}
                  </p>
                </div>
              </div>

              {meetingStatus?.inMeeting && (
                <div
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}
                >
                  🔇 Não Perturbe Ativo
                </div>
              )}
            </div>
          </div>

          {/* Preferences Form Card */}
          <div style={styles.formCard}>
            <h2 style={styles.cardTitle}>
              <VolumeX size={18} color="var(--accent-primary)" /> Regras de Supressão de Notificações
            </h2>
            <p style={styles.cardSub}>
              Personalize o comportamento dos lembretes durante chamadas, reuniões e apresentações.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
              {/* Option 1: Teams Mute */}
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onClick={() => handleToggleNotificationSetting('muteInTeamsMeetings')}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-primary)',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <Video size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                        Silenciar lembretes durante reuniões do Microsoft Teams
                      </strong>
                      <span
                        style={{
                          backgroundColor: 'rgba(99, 102, 241, 0.2)',
                          color: '#a5b4fc',
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontWeight: '700',
                        }}
                      >
                        Recomendado
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      Detecta automaticamente chamadas ativas no aplicativo Microsoft Teams (Windows) e reuniões do Teams abertas no navegador para suprimir pop-ups e sons.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    width: '46px',
                    height: '26px',
                    borderRadius: '13px',
                    backgroundColor: notificationSettings.muteInTeamsMeetings ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.15)',
                    position: 'relative',
                    transition: 'background-color 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      position: 'absolute',
                      top: '3px',
                      left: notificationSettings.muteInTeamsMeetings ? '23px' : '3px',
                      transition: 'left 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  />
                </div>
              </div>

              {/* Option 2: Calendar Mute */}
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onClick={() => handleToggleNotificationSetting('muteInCalendarMeetings')}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10b981',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <Calendar size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                      Silenciar durante quaisquer eventos da Agenda (Outlook / Google)
                    </strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      Pausa os lembretes durante o horário agendado de qualquer compromisso ou reunião presente nos seus feeds da Agenda.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    width: '46px',
                    height: '26px',
                    borderRadius: '13px',
                    backgroundColor: notificationSettings.muteInCalendarMeetings ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.15)',
                    position: 'relative',
                    transition: 'background-color 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      position: 'absolute',
                      top: '3px',
                      left: notificationSettings.muteInCalendarMeetings ? '23px' : '3px',
                      transition: 'left 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  />
                </div>
              </div>

              {/* Option 3: Postpone after meeting */}
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onClick={() => handleToggleNotificationSetting('postponeMutedReminders')}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fbbf24',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                        Adiar lembretes para logo após o término da reunião
                      </strong>
                      <span
                        style={{
                          backgroundColor: 'rgba(245, 158, 11, 0.2)',
                          color: '#fbbf24',
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontWeight: '700',
                        }}
                      >
                        Recomendado
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      Em vez de descartar os lembretes que venceram durante sua reunião, o sistema irá exibi-los assim que você sair da chamada.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    width: '46px',
                    height: '26px',
                    borderRadius: '13px',
                    backgroundColor: notificationSettings.postponeMutedReminders ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.15)',
                    position: 'relative',
                    transition: 'background-color 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      position: 'absolute',
                      top: '3px',
                      left: notificationSettings.postponeMutedReminders ? '23px' : '3px',
                      transition: 'left 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === DATABASE TAB === */}
      {activeTab === 'database' && (
        <div style={styles.section}>
          <div style={styles.formCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={styles.cardTitle}>
                <Database size={20} color="#10b981" /> Banco de Dados SQL Local (SQLite)
              </h2>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '12px' }}
                onClick={refreshDbStats}
                disabled={isLoadingDbStats}
              >
                <RefreshCw size={14} className={isLoadingDbStats ? 'spin' : ''} /> Atualizar Métricas
              </button>
            </div>
            <p style={styles.cardSub}>
              Armazenamento relacional 100% nativo, seguro e embutido no aplicativo via <strong>SQLite (better-sqlite3)</strong> com alta performance e modo WAL (Write-Ahead Logging).
            </p>

            {/* Health / Status Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px 20px',
                borderRadius: '14px',
                marginTop: '16px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <CheckCircle2 size={28} color="#10b981" />
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>
                  Banco de Dados SQLite Operacional & Integrado
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Engine: <strong>{dbStats?.engine || 'SQLite (better-sqlite3)'}</strong> &bull; Modo WAL Ativo &bull; Tamanho em Disco: <strong>{dbStats?.fileSize || 'Calculando...'}</strong>
                </p>
              </div>
            </div>

            {/* Notification alert */}
            {dbNotice && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  marginTop: '14px',
                  backgroundColor: dbNotice.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                  border: dbNotice.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
                  color: dbNotice.type === 'success' ? '#10b981' : '#f43f5e',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                <span>{dbNotice.message}</span>
              </div>
            )}

            {/* Database File Location */}
            <div style={{ marginTop: '20px' }}>
              <label style={styles.label}>Localização do Arquivo de Dados (.sqlite):</label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  wordBreak: 'break-all',
                }}
              >
                <HardDrive size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '12.5px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)', flex: 1 }}>
                  {dbStats?.filePath || 'Carregando caminho do banco...'}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', flexShrink: 0 }}
                  onClick={handleOpenDbFolder}
                >
                  <FolderOpen size={14} /> Abrir Pasta
                </button>
              </div>
            </div>

            {/* Table Records Grid */}
            <div style={{ marginTop: '22px' }}>
              <label style={{ ...styles.label, marginBottom: '10px' }}>Registros Armazenados nas Tabelas SQL:</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tarefas / Chamados</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#60a5fa', marginTop: '4px' }}>
                    {dbStats?.tableCounts.tickets ?? 0}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Notas & Anexos</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#a78bfa', marginTop: '4px' }}>
                    {dbStats?.tableCounts.notes ?? 0}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Lembretes</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>
                    {dbStats?.tableCounts.reminders ?? 0}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Instâncias Jira</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#34d399', marginTop: '4px' }}>
                    {dbStats?.tableCounts.jiraInstances ?? 0}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Consultas JQL</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#f43f5e', marginTop: '4px' }}>
                    {dbStats?.tableCounts.savedJqlQueries ?? 0}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Perfis de Usuário</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#38bdf8', marginTop: '4px' }}>
                    {dbStats?.tableCounts.users ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px',
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleOpenDbFolder}
              >
                <FolderOpen size={15} /> Abrir Diretório do Banco
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExportDbBackup}
                disabled={isExportingDb}
              >
                <Download size={15} /> {isExportingDb ? 'Exportando...' : 'Exportar Cópia de Backup (.sqlite)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'jira' && (
        <div style={styles.section}>
          <div style={styles.formCard}>
            <h2 style={styles.cardTitle}>
              <Plus size={18} color="var(--accent-blue)" /> Cadastrar Nova Instância Jira (Cliente)
            </h2>
            <p style={styles.cardSub}>
              Conecte seus domínios Jira fazendo login com a sua conta Atlassian (detecção automática) ou informe o API Token manualmente.
            </p>

            {/* OAuth 2.0 Quick Login Banner */}
            <div
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="#818cf8" /> Entrar com Conta Atlassian (Automático)
                  </h4>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '650px' }}>
                    Faz o login oficial na Atlassian pelo seu navegador, detecta seus sites Jira e <strong>cria/conecta o seu Perfil de Usuário no aplicativo</strong> automaticamente após o sucesso da autenticação.
                  </p>
                </div>

                {isSavingJira ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled
                      style={{ whiteSpace: 'nowrap', padding: '10px 14px', backgroundColor: '#4f46e5', opacity: 0.85, fontSize: '12.5px' }}
                    >
                      Aguardando Navegador...
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={async () => {
                        if (window.electronAPI?.cancelAtlassianOAuth) {
                          await window.electronAPI.cancelAtlassianOAuth();
                        }
                        setIsSavingJira(false);
                      }}
                      title="Cancela o servidor local e reseta o botão instantaneamente"
                      style={{ whiteSpace: 'nowrap', padding: '10px 14px', backgroundColor: '#ef4444', color: '#ffffff', borderColor: '#ef4444', fontWeight: '700', fontSize: '12.5px' }}
                    >
                      🔄 Resetar / Tentar De Novo
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAtlassianOAuth}
                    style={{ whiteSpace: 'nowrap', padding: '10px 20px', backgroundColor: '#6366f1', fontSize: '13.5px', fontWeight: '700' }}
                  >
                    ⚡ Entrar com Atlassian
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleAddJira} style={styles.jiraForm}>
              <div>
                <label style={styles.label}>Ou cadastrar manualmente (Nome Identificador):</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Jira Cliente Acme"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={styles.label}>Domínio da Instância Jira (URL):</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="https://empresa.atlassian.net"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>E-mail da Conta Atlassian:</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="seu.email@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={styles.label}>API Token do Jira:</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Cole seu API Token gerado no Atlassian..."
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" disabled={isSavingJira}>
                  <ShieldCheck size={18} />
                  {isSavingJira ? 'Salvando...' : 'Salvar Instância Jira'}
                </button>
              </div>
            </form>
          </div>

          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '14px' }}>
              Instâncias Jira Cadastradas
            </h3>

            {jiraInstances.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                Nenhuma API de cliente cadastrada ainda.
              </p>
            ) : (
              <div style={styles.jiraList}>
                {jiraInstances.map((inst) => (
                  <div key={inst.id} style={styles.jiraItem}>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff' }}>{inst.name}</h4>
                      <div style={styles.instMeta}>
                        <span><Globe size={13} /> {inst.domain}</span>
                        <span><Mail size={13} /> {inst.email}</span>
                      </div>
                    </div>

                    <button
                      className="btn-icon"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Tem certeza que deseja remover a instância "${inst.name || inst.domain}"?\n\n⚠️ Todos os tickets importados desta instância também serão excluídos do aplicativo.`
                          )
                        ) {
                          onDeleteJiraInstance(inst.id);
                        }
                      }}
                      title="Remover Instância e seus Tickets"
                    >
                      <Trash2 size={16} color="#f43f5e" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === AI ASSISTANT TAB === */}
      {activeTab === 'ai' && (
        <div style={styles.section}>
          <div style={styles.formCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={styles.cardTitle}>
                  <Bot size={18} color="var(--accent-primary)" /> Assistentes de Inteligência Artificial
                </h2>
                <p style={styles.cardSub}>
                  Selecione as IAs que deseja integrar ao aplicativo. Você pode ativar uma ou várias simultaneamente — cada IA selecionada terá sua própria aba dedicada na barra lateral.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleToggleAllAi(true)}
                  disabled={isSavingAi}
                  style={{
                    ...styles.secondaryBtn,
                    padding: '8px 14px',
                    fontSize: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                >
                  <Check size={14} color="#10b981" /> Ativar Todas
                </button>
                <button
                  onClick={() => handleToggleAllAi(false)}
                  disabled={isSavingAi}
                  style={{
                    ...styles.secondaryBtn,
                    padding: '8px 14px',
                    fontSize: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                >
                  <VolumeX size={14} color="#94a3b8" /> Desativar Todas
                </button>
              </div>
            </div>

            {aiNotice && (
              <div
                style={{
                  ...styles.notice,
                  backgroundColor: aiNotice.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                  borderColor: aiNotice.type === 'success' ? '#10b981' : '#f43f5e',
                  color: aiNotice.type === 'success' ? '#10b981' : '#f43f5e',
                  marginBottom: '20px',
                }}
              >
                {aiNotice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{aiNotice.message}</span>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <label style={styles.label}>
                IAs Disponíveis (Clique no card para ativar/desativar):
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px', marginTop: '10px' }}>
                {/* ChatGPT Card */}
                {(() => {
                  const isEnabled = (localAiConfig.enabledProviders || []).includes('chatgpt');
                  return (
                    <div
                      onClick={() => handleToggleAiProvider('chatgpt')}
                      style={{
                        ...styles.aiProviderCard,
                        borderColor: isEnabled ? '#10a37f' : 'rgba(255, 255, 255, 0.1)',
                        backgroundColor: isEnabled ? 'rgba(16, 163, 127, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        boxShadow: isEnabled ? '0 0 12px rgba(16, 163, 127, 0.2)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(16, 163, 127, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Bot size={20} color="#10a37f" />
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>ChatGPT</h4>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>OpenAI</span>
                          </div>
                        </div>
                        <span
                          style={{
                            ...styles.selectedBadge,
                            backgroundColor: isEnabled ? 'rgba(16, 163, 127, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                            color: isEnabled ? '#34d399' : '#94a3b8',
                            borderColor: isEnabled ? '#10a37f' : 'rgba(255, 255, 255, 0.15)',
                          }}
                        >
                          {isEnabled ? '✓ Ativa' : '+ Ativar'}
                        </span>
                      </div>
                      <p style={styles.aiCardDesc}>
                        {AI_PROVIDERS.chatgpt.description}
                      </p>
                      <div style={styles.aiCardFooter}>
                        <span style={styles.urlPill}>{AI_PROVIDERS.chatgpt.url}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Claude Card */}
                {(() => {
                  const isEnabled = (localAiConfig.enabledProviders || []).includes('claude');
                  return (
                    <div
                      onClick={() => handleToggleAiProvider('claude')}
                      style={{
                        ...styles.aiProviderCard,
                        borderColor: isEnabled ? '#d97706' : 'rgba(255, 255, 255, 0.1)',
                        backgroundColor: isEnabled ? 'rgba(217, 119, 6, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        boxShadow: isEnabled ? '0 0 12px rgba(217, 119, 6, 0.2)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(217, 119, 6, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sparkles size={20} color="#d97706" />
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>Claude</h4>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Anthropic</span>
                          </div>
                        </div>
                        <span
                          style={{
                            ...styles.selectedBadge,
                            backgroundColor: isEnabled ? 'rgba(217, 119, 6, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                            color: isEnabled ? '#fbbf24' : '#94a3b8',
                            borderColor: isEnabled ? '#d97706' : 'rgba(255, 255, 255, 0.15)',
                          }}
                        >
                          {isEnabled ? '✓ Ativa' : '+ Ativar'}
                        </span>
                      </div>
                      <p style={styles.aiCardDesc}>
                        {AI_PROVIDERS.claude.description}
                      </p>
                      <div style={styles.aiCardFooter}>
                        <span style={styles.urlPill}>{AI_PROVIDERS.claude.url}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Gemini Card */}
                {(() => {
                  const isEnabled = (localAiConfig.enabledProviders || []).includes('gemini');
                  return (
                    <div
                      onClick={() => handleToggleAiProvider('gemini')}
                      style={{
                        ...styles.aiProviderCard,
                        borderColor: isEnabled ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                        backgroundColor: isEnabled ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        boxShadow: isEnabled ? '0 0 12px rgba(59, 130, 246, 0.2)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sparkles size={20} color="#3b82f6" />
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>Gemini</h4>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Google</span>
                          </div>
                        </div>
                        <span
                          style={{
                            ...styles.selectedBadge,
                            backgroundColor: isEnabled ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                            color: isEnabled ? '#60a5fa' : '#94a3b8',
                            borderColor: isEnabled ? '#3b82f6' : 'rgba(255, 255, 255, 0.15)',
                          }}
                        >
                          {isEnabled ? '✓ Ativa' : '+ Ativar'}
                        </span>
                      </div>
                      <p style={styles.aiCardDesc}>
                        {AI_PROVIDERS.gemini.description}
                      </p>
                      <div style={styles.aiCardFooter}>
                        <span style={styles.urlPill}>{AI_PROVIDERS.gemini.url}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Informações sobre Sessão e Login */}
            <div style={{ ...styles.statusCard, marginTop: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <ShieldCheck size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#ffffff', display: 'block', marginBottom: '4px', fontSize: '13px' }}>
                  Sessões Persistentes & Autenticação Segura
                </strong>
                <span style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.5 }}>
                  Cada assistente de IA opera em sua própria partição isolada (<code>persist:ai_chatgpt</code>, <code>persist:ai_claude</code>, <code>persist:ai_gemini</code>). Suas credenciais e conversas ficam salvas individualmente no aplicativo.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === SIDEBAR & TOPICS TAB === */}
      {activeTab === 'sidebar' && (
        <div style={styles.section}>
          <div style={styles.formCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div>
                <h2 style={styles.cardTitle}>
                  <LayoutList size={18} color="var(--accent-primary)" /> Organização da Barra Lateral & Tópicos
                </h2>
                <p style={styles.cardSub}>
                  Reordene botões, agrupe itens em tópicos fixos e adicione qualquer site web (como OneDrive, WhatsApp, GitHub, etc.) na barra lateral.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleOpenAddSiteModal()}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    padding: '8px 14px',
                    backgroundColor: 'var(--accent-primary)',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                  }}
                  title="Adicionar um novo site ou aplicativo web na barra lateral"
                >
                  <PlusCircle size={15} /> Adicionar Site Web
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleResetSidebarDefault}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                  title="Voltar à ordem e agrupamentos padrão"
                >
                  <RotateCcw size={14} /> Restaurar Padrão
                </button>
              </div>
            </div>

            {sidebarNotice && (
              <div
                style={{
                  ...styles.statusCard,
                  borderColor: sidebarNotice.type === 'success' ? '#10b981' : '#f43f5e',
                  backgroundColor: sidebarNotice.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                  color: sidebarNotice.type === 'success' ? '#34d399' : '#fb7185',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                {sidebarNotice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{sidebarNotice.message}</span>
              </div>
            )}

            {/* Form to Create New Topic */}
            <form
              onSubmit={handleCreateTopic}
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '24px',
              }}
            >
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  placeholder="Nome do novo tópico (ex: Microsoft, Agentes de IA, Workspaces, Ferramentas...)"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!newTopicName.trim()}
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  opacity: newTopicName.trim() ? 1 : 0.6,
                  cursor: newTopicName.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                <FolderPlus size={16} /> Criar Tópico
              </button>
            </form>

            {/* Layout com 2 Colunas: Gerenciador à Esquerda + Live Preview à Direita */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(260px, 0.8fr)', gap: '24px', alignItems: 'flex-start' }}>
              {/* Coluna 1: Lista de Entradas (Tópicos e Botões Avulsos) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Estrutura Atual dos Menus ({localSidebarConfig.entries.length} blocos)
                  </span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Use as setas ⬆️ ⬇️ para ordenar
                  </span>
                </div>

                {localSidebarConfig.entries.map((entry, index) => {
                  const isFirst = index === 0;
                  const isLast = index === localSidebarConfig.entries.length - 1;
                  const availableGroups = localSidebarConfig.entries.filter(
                    (e): e is SidebarGroupEntry => e.type === 'group'
                  );

                  // 1. RENDERIZAÇÃO DE TÓPICO / GRUPO
                  if (entry.type === 'group') {
                    const isEditing = editingTopicId === entry.id;
                    const childItems = entry.itemIds || [];

                    return (
                      <div
                        key={entry.id}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(99, 102, 241, 0.35)',
                          borderRadius: '12px',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Cabeçalho do Tópico */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            backgroundColor: 'rgba(99, 102, 241, 0.12)',
                            borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                            gap: '10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                            <ChevronDown size={14} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                            <Folder size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />

                            {isEditing ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                                <input
                                  type="text"
                                  value={editingTopicName}
                                  onChange={(e) => setEditingTopicName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameTopic(entry.id, editingTopicName);
                                    if (e.key === 'Escape') setEditingTopicId(null);
                                  }}
                                  autoFocus
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--accent-primary)',
                                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                    color: '#ffffff',
                                    fontSize: '13px',
                                    flex: 1,
                                    outline: 'none',
                                  }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={() => handleRenameTopic(entry.id, editingTopicName)}
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                >
                                  Salvar
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => setEditingTopicId(null)}
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: '13px',
                                  color: '#ffffff',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {entry.title}
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '6px' }}>
                                  ({childItems.length} {childItems.length === 1 ? 'botão' : 'botões'})
                                </span>
                              </span>
                            )}
                          </div>

                          {/* Ações do Tópico */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenAddSiteModal(entry.id)}
                              style={{
                                backgroundColor: 'rgba(99, 102, 241, 0.18)',
                                border: '1px solid rgba(99, 102, 241, 0.4)',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                color: '#a5b4fc',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title={`Adicionar site diretamente dentro do tópico "${entry.title}"`}
                            >
                              <Plus size={12} /> Add Site
                            </button>
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => handleMoveEntry(index, 'up')}
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '4px 6px',
                                color: isFirst ? 'rgba(255,255,255,0.2)' : '#ffffff',
                                cursor: isFirst ? 'not-allowed' : 'pointer',
                              }}
                              title="Mover tópico para cima"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => handleMoveEntry(index, 'down')}
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '4px 6px',
                                color: isLast ? 'rgba(255,255,255,0.2)' : '#ffffff',
                                cursor: isLast ? 'not-allowed' : 'pointer',
                              }}
                              title="Mover tópico para baixo"
                            >
                              <ArrowDown size={13} />
                            </button>
                            {!isEditing && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTopicId(entry.id);
                                  setEditingTopicName(entry.title);
                                }}
                                style={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '4px 6px',
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer',
                                }}
                                title="Renomear tópico"
                              >
                                <Edit3 size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteTopic(entry.id)}
                              style={{
                                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '4px 6px',
                                color: '#fb7185',
                                cursor: 'pointer',
                              }}
                              title="Excluir tópico (desagrupa os itens para a raiz)"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Lista de Filhos dentro do Tópico */}
                        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {childItems.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                              Nenhum botão agrupado neste tópico. Mova itens para cá ou clique em "+ Add Site".
                            </div>
                          ) : (
                            childItems.map((childId, childIdx) => {
                              const itemDef = getNavItemDef(childId, localCustomSites);
                              if (!itemDef) return null;
                              const ItemIcon = itemDef.icon;
                              const isChildFirst = childIdx === 0;
                              const isChildLast = childIdx === childItems.length - 1;
                              const customSiteObj = localCustomSites.find((s) => s.id === childId);

                              return (
                                <div
                                  key={childId}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '7px 10px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    gap: '10px',
                                  }}
                                >
                                  {/* Info do Item */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div
                                      style={{
                                        width: '4px',
                                        height: '4px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--accent-primary)',
                                      }}
                                    />
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '6px',
                                        backgroundColor: `${itemDef.color}22`,
                                      }}
                                    >
                                      <ItemIcon size={13} color={itemDef.color} />
                                    </div>
                                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                      {itemDef.label}
                                    </span>
                                    {customSiteObj && (
                                      <span
                                        style={{
                                          fontSize: '10.5px',
                                          backgroundColor: `${customSiteObj.color || '#0ea5e9'}22`,
                                          color: customSiteObj.color || '#38bdf8',
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                          border: `1px solid ${customSiteObj.color || '#0ea5e9'}44`,
                                          fontWeight: 600,
                                        }}
                                        title={`Site Web: ${customSiteObj.url}`}
                                      >
                                        Site Web
                                      </span>
                                    )}
                                  </div>

                                  {/* Ações do Item */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {customSiteObj && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditSiteModal(customSiteObj)}
                                          style={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                            border: 'none',
                                            borderRadius: '5px',
                                            padding: '3px 6px',
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                          }}
                                          title="Editar URL e nome do site"
                                        >
                                          <Edit3 size={11} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteCustomSiteAction(customSiteObj.id)}
                                          style={{
                                            backgroundColor: 'rgba(244, 63, 94, 0.15)',
                                            border: 'none',
                                            borderRadius: '5px',
                                            padding: '3px 6px',
                                            color: '#fb7185',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                          }}
                                          title="Excluir site personalizado"
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </>
                                    )}

                                    <button
                                      type="button"
                                      disabled={isChildFirst}
                                      onClick={() => handleMoveItemInGroup(entry.id, childIdx, 'up')}
                                      style={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                        border: 'none',
                                        borderRadius: '5px',
                                        padding: '3px 5px',
                                        color: isChildFirst ? 'rgba(255,255,255,0.2)' : '#ffffff',
                                        cursor: isChildFirst ? 'not-allowed' : 'pointer',
                                      }}
                                      title="Subir posição no tópico"
                                    >
                                      <ArrowUp size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isChildLast}
                                      onClick={() => handleMoveItemInGroup(entry.id, childIdx, 'down')}
                                      style={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                        border: 'none',
                                        borderRadius: '5px',
                                        padding: '3px 5px',
                                        color: isChildLast ? 'rgba(255,255,255,0.2)' : '#ffffff',
                                        cursor: isChildLast ? 'not-allowed' : 'pointer',
                                      }}
                                      title="Descer posição no tópico"
                                    >
                                      <ArrowDown size={11} />
                                    </button>

                                    {/* Dropdown Mover Item */}
                                    <select
                                      value={entry.id}
                                      onChange={(e) => handleMoveItemToGroup(childId, e.target.value)}
                                      style={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                        color: 'var(--text-secondary)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        padding: '3px 6px',
                                        cursor: 'pointer',
                                        outline: 'none',
                                      }}
                                      title="Mover para outro tópico ou desagrupar"
                                    >
                                      <option value={entry.id}>📌 No tópico: {entry.title}</option>
                                      <option value="root">📂 Desagrupar (Nível Raiz)</option>
                                      {availableGroups
                                        .filter((g) => g.id !== entry.id)
                                        .map((g) => (
                                          <option key={g.id} value={g.id}>
                                            Mover para: {g.title}
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  }

                  // 2. RENDERIZAÇÃO DE BOTÃO AVULSO (NÍVEL RAIZ)
                  if (entry.type === 'item') {
                    const itemDef = getNavItemDef(entry.id, localCustomSites);
                    if (!itemDef) return null;
                    const ItemIcon = itemDef.icon;
                    const customSiteObj = localCustomSites.find((s) => s.id === entry.id);

                    return (
                      <div
                        key={entry.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          backgroundColor: 'rgba(0, 0, 0, 0.25)',
                          borderRadius: '10px',
                          border: '1px solid var(--border-subtle)',
                          gap: '12px',
                        }}
                      >
                        {/* Info do Botão Avulso */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '26px',
                              height: '26px',
                              borderRadius: '7px',
                              backgroundColor: `${itemDef.color}22`,
                            }}
                          >
                            <ItemIcon size={15} color={itemDef.color} />
                          </div>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {itemDef.label}
                            </span>
                            {customSiteObj ? (
                              <span
                                style={{
                                  marginLeft: '8px',
                                  fontSize: '10.5px',
                                  backgroundColor: `${customSiteObj.color || '#0ea5e9'}22`,
                                  color: customSiteObj.color || '#38bdf8',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  border: `1px solid ${customSiteObj.color || '#0ea5e9'}44`,
                                  fontWeight: 600,
                                }}
                                title={`Site Web: ${customSiteObj.url}`}
                              >
                                Site Web
                              </span>
                            ) : (
                              <span
                                style={{
                                  marginLeft: '8px',
                                  fontSize: '10.5px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                Botão Avulso
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Ações do Botão Avulso */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {customSiteObj && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditSiteModal(customSiteObj)}
                                style={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '4px 6px',
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer',
                                }}
                                title="Editar site personalizado"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomSiteAction(customSiteObj.id)}
                                style={{
                                  backgroundColor: 'rgba(244, 63, 94, 0.15)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '4px 6px',
                                  color: '#fb7185',
                                  cursor: 'pointer',
                                }}
                                title="Excluir site personalizado"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMoveEntry(index, 'up')}
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 6px',
                              color: isFirst ? 'rgba(255,255,255,0.2)' : '#ffffff',
                              cursor: isFirst ? 'not-allowed' : 'pointer',
                            }}
                            title="Subir posição na barra lateral"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMoveEntry(index, 'down')}
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 6px',
                              color: isLast ? 'rgba(255,255,255,0.2)' : '#ffffff',
                              cursor: isLast ? 'not-allowed' : 'pointer',
                            }}
                            title="Descer posição na barra lateral"
                          >
                            <ArrowDown size={13} />
                          </button>

                          {/* Seletor para agrupar em algum tópico */}
                          <select
                            value="root"
                            onChange={(e) => {
                              if (e.target.value !== 'root') {
                                handleMoveItemToGroup(entry.id, e.target.value);
                              }
                            }}
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              fontSize: '11px',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                            title="Agrupar em um tópico existente"
                          >
                            <option value="root">📂 Agrupar em Tópico...</option>
                            {availableGroups.map((g) => (
                              <option key={g.id} value={g.id}>
                                📁 {g.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>

              {/* Coluna 2: Live Preview da Barra Lateral */}
              <div
                style={{
                  backgroundColor: 'var(--bg-sidebar)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  padding: '16px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  position: 'sticky',
                  top: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    👁️ Prévia em Tempo Real
                  </span>
                  <span style={{ fontSize: '10.5px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    Visual na Barra Lateral
                  </span>
                </div>

                {/* Container da Barra Lateral Simulada */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {localSidebarConfig.entries.map((entry) => {
                    if (entry.type === 'item') {
                      const itemDef = getNavItemDef(entry.id, localCustomSites);
                      if (!itemDef) return null;
                      const Icon = itemDef.icon;
                      const isActive = entry.id === 'tickets';

                      return (
                        <div
                          key={entry.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '7px 10px',
                            borderRadius: '8px',
                            backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                            color: isActive ? '#ffffff' : 'var(--text-secondary)',
                            fontSize: '12.5px',
                            fontWeight: isActive ? 700 : 600,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '24px',
                              height: '24px',
                              borderRadius: '7px',
                              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : `${itemDef.color}22`,
                            }}
                          >
                            <Icon size={14} color={isActive ? '#ffffff' : itemDef.color} />
                          </div>
                          <span>{itemDef.label}</span>
                        </div>
                      );
                    }

                    if (entry.type === 'group') {
                      const childs = entry.itemIds || [];
                      if (childs.length === 0) return null;

                      return (
                        <div key={entry.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 6px' }}>
                            <ChevronDown size={11} color="var(--text-muted)" />
                            <Folder size={12} color="var(--accent-primary)" />
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', opacity: 0.85 }}>
                              {entry.title}
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginLeft: '6px', borderLeft: '1px solid rgba(255, 255, 255, 0.08)', paddingLeft: '4px' }}>
                            {childs.map((childId) => {
                              const childDef = getNavItemDef(childId, localCustomSites);
                              if (!childDef) return null;
                              const ChildIcon = childDef.icon;
                              const isActive = false;

                              return (
                                <div
                                  key={childId}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '5px 8px 5px 12px',
                                    borderRadius: '7px',
                                    backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                                    fontSize: '12px',
                                    fontWeight: isActive ? 700 : 500,
                                    position: 'relative',
                                  }}
                                >
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: '4px',
                                      top: '50%',
                                      width: '3px',
                                      height: '3px',
                                      borderRadius: '50%',
                                      backgroundColor: isActive ? '#ffffff' : 'rgba(255,255,255,0.3)',
                                      transform: 'translateY(-50%)',
                                    }}
                                  />
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '22px',
                                      height: '22px',
                                      borderRadius: '6px',
                                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : `${childDef.color}22`,
                                    }}
                                  >
                                    <ChildIcon size={13} color={isActive ? '#ffffff' : childDef.color} />
                                  </div>
                                  <span>{childDef.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Modal de Adição / Edição de Site Personalizado */}
          {isSiteModalOpen && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '16px',
              }}
            >
              <div
                style={{
                  backgroundColor: 'var(--bg-card-jira, #1e293b)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  width: '100%',
                  maxWidth: '520px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '90vh',
                }}
              >
                {/* Cabeçalho do Modal */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: `${siteColor}22`,
                      }}
                    >
                      <Globe size={18} color={siteColor} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                        {editingSite ? 'Editar Site Personalizado' : 'Adicionar Site na Barra Lateral'}
                      </h3>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0 }}>
                        Visualização integrada com login e sessão persistentes (estilo Teams/Outlook).
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSiteModalOpen(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Corpo do Formulário */}
                <form
                  onSubmit={handleSaveCustomSiteSubmit}
                  style={{
                    padding: '20px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  {/* Nome do Site */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
                      Nome do Site / Sistema *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: OneDrive, SharePoint, WhatsApp, GitHub, Trello..."
                      value={siteTitle}
                      onChange={(e) => setSiteTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        color: '#ffffff',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* URL do Site */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
                      URL / Link do Site *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: https://onedrive.live.com ou github.com"
                      value={siteUrl}
                      onChange={(e) => setSiteUrl(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        color: '#ffffff',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Seletor de Ícones Rico & Categorizado */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                        Ícone do Botão
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Selecionado:</span>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            backgroundColor: `${siteColor}22`,
                            border: `1px solid ${siteColor}44`,
                          }}
                        >
                          <DynamicCustomIcon iconKey={siteIcon} size={14} color={siteColor} />
                        </div>
                      </div>
                    </div>

                    {/* Abas de Categorias de Ícones */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '6px',
                        marginBottom: '10px',
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        padding: '4px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSiteIconCategory('brands');
                          setSiteIconSearch('');
                        }}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: siteIconCategory === 'brands' ? 'var(--accent-primary)' : 'transparent',
                          color: siteIconCategory === 'brands' ? '#ffffff' : 'var(--text-secondary)',
                          fontSize: '11.5px',
                          fontWeight: siteIconCategory === 'brands' ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        🌟 Marcas & Apps ({BRAND_ICON_PRESETS.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSiteIconCategory('system');
                          setSiteIconSearch('');
                        }}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: siteIconCategory === 'system' ? 'var(--accent-primary)' : 'transparent',
                          color: siteIconCategory === 'system' ? '#ffffff' : 'var(--text-secondary)',
                          fontSize: '11.5px',
                          fontWeight: siteIconCategory === 'system' ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        ⌨️ Sistema & Lucide ({SYSTEM_ICON_PRESETS.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSiteIconCategory('emoji');
                          setSiteIconSearch('');
                        }}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: siteIconCategory === 'emoji' ? 'var(--accent-primary)' : 'transparent',
                          color: siteIconCategory === 'emoji' ? '#ffffff' : 'var(--text-secondary)',
                          fontSize: '11.5px',
                          fontWeight: siteIconCategory === 'emoji' ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        😀 Emojis Livres
                      </button>
                    </div>

                    {/* Barra de Pesquisa Rápida (para abas de Marcas e Sistema) */}
                    {siteIconCategory !== 'emoji' && (
                      <div style={{ marginBottom: '8px' }}>
                        <input
                          type="text"
                          placeholder="Filtrar ícones..."
                          value={siteIconSearch}
                          onChange={(e) => setSiteIconSearch(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            color: '#ffffff',
                            fontSize: '11.5px',
                            outline: 'none',
                          }}
                        />
                      </div>
                    )}

                    {/* 1. Grade de Marcas Famosas */}
                    {siteIconCategory === 'brands' && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
                          gap: '8px',
                          maxHeight: '140px',
                          overflowY: 'auto',
                          padding: '8px',
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {BRAND_ICON_PRESETS.filter((item) =>
                          item.label.toLowerCase().includes(siteIconSearch.toLowerCase()) ||
                          item.id.toLowerCase().includes(siteIconSearch.toLowerCase())
                        ).map((iconOpt) => {
                          const IconComp = iconOpt.icon;
                          const isSelected = siteIcon === iconOpt.id;

                          return (
                            <button
                              type="button"
                              key={iconOpt.id}
                              onClick={() => setSiteIcon(iconOpt.id)}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '8px 4px',
                                borderRadius: '6px',
                                border: isSelected ? `2px solid ${siteColor}` : '1px solid rgba(255, 255, 255, 0.06)',
                                backgroundColor: isSelected ? `${siteColor}22` : 'rgba(255, 255, 255, 0.02)',
                                color: isSelected ? '#ffffff' : 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              title={iconOpt.label}
                            >
                              <IconComp size={18} color={isSelected ? siteColor : '#ffffff'} />
                              <span style={{ fontSize: '10px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', whiteSpace: 'nowrap' }}>
                                {iconOpt.label.split('/')[0].trim()}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* 2. Grade de Ícones do Sistema & Teclado */}
                    {siteIconCategory === 'system' && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
                          gap: '8px',
                          maxHeight: '140px',
                          overflowY: 'auto',
                          padding: '8px',
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {SYSTEM_ICON_PRESETS.filter((item) =>
                          item.label.toLowerCase().includes(siteIconSearch.toLowerCase()) ||
                          item.id.toLowerCase().includes(siteIconSearch.toLowerCase())
                        ).map((iconOpt) => {
                          const IconComp = iconOpt.icon;
                          const isSelected = siteIcon === iconOpt.id;

                          return (
                            <button
                              type="button"
                              key={iconOpt.id}
                              onClick={() => setSiteIcon(iconOpt.id)}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '8px 4px',
                                borderRadius: '6px',
                                border: isSelected ? `2px solid ${siteColor}` : '1px solid rgba(255, 255, 255, 0.06)',
                                backgroundColor: isSelected ? `${siteColor}22` : 'rgba(255, 255, 255, 0.02)',
                                color: isSelected ? '#ffffff' : 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              title={iconOpt.label}
                            >
                              <IconComp size={17} color={isSelected ? siteColor : 'currentColor'} />
                              <span style={{ fontSize: '10px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', whiteSpace: 'nowrap' }}>
                                {iconOpt.label.split('/')[0].trim()}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* 3. Grade de Emojis do Teclado + Digitação Livre */}
                    {siteIconCategory === 'emoji' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Campo para colar ou digitar qualquer emoji */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="Cole ou digite qualquer emoji (ex: 🦄, ⚡, 🚀)..."
                            value={siteEmojiInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSiteEmojiInput(val);
                              if (val.trim()) {
                                setSiteIcon(`emoji:${val.trim()}`);
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-subtle)',
                              backgroundColor: 'rgba(0, 0, 0, 0.3)',
                              color: '#ffffff',
                              fontSize: '13px',
                              outline: 'none',
                            }}
                          />
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            Atalho: <kbd style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: '4px' }}>Win + .</kbd>
                          </span>
                        </div>

                        {/* Grade de Emojis Rápidos */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))',
                            gap: '6px',
                            maxHeight: '110px',
                            overflowY: 'auto',
                            padding: '8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {EMOJI_KEYBOARD_PRESETS.map((em) => {
                            const isSelected = siteIcon === `emoji:${em}` || siteIcon === em;
                            return (
                              <button
                                type="button"
                                key={em}
                                onClick={() => {
                                  setSiteIcon(`emoji:${em}`);
                                  setSiteEmojiInput(em);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  height: '34px',
                                  borderRadius: '6px',
                                  fontSize: '18px',
                                  border: isSelected ? `2px solid ${siteColor}` : '1px solid rgba(255, 255, 255, 0.06)',
                                  backgroundColor: isSelected ? `${siteColor}33` : 'rgba(255, 255, 255, 0.02)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {em}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Seletor de Cores */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
                      Cor do Badge
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {COLOR_PRESETS.map((c) => (
                        <div
                          key={c}
                          onClick={() => setSiteColor(c)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: c,
                            cursor: 'pointer',
                            border: siteColor === c ? '2px solid #ffffff' : '2px solid transparent',
                            boxShadow: siteColor === c ? `0 0 8px ${c}` : 'none',
                            transform: siteColor === c ? 'scale(1.15)' : 'scale(1)',
                            transition: 'all 0.15s ease',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Tópico de Destino */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
                      Tópico de Destino na Barra Lateral
                    </label>
                    <select
                      value={siteTargetGroup}
                      onChange={(e) => setSiteTargetGroup(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        color: '#ffffff',
                        fontSize: '13px',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="root">📂 Botão Avulso (Nível Raiz)</option>
                      {localSidebarConfig.entries
                        .filter((e): e is SidebarGroupEntry => e.type === 'group')
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            📁 Agrupar em: {g.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Ações do Modal */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      type="button"
                      onClick={() => setIsSiteModalOpen(false)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{
                        padding: '8px 18px',
                        fontSize: '13px',
                        fontWeight: 600,
                        backgroundColor: siteColor || 'var(--accent-primary)',
                      }}
                    >
                      {editingSite ? 'Salvar Alterações' : 'Salvar e Adicionar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'theme' && (
        <div style={styles.section}>
          <div style={styles.formCard}>
            <h2 style={styles.cardTitle}>
              <Sparkles size={18} color="var(--accent-primary)" /> Personalização de Cores do App
            </h2>
            <p style={styles.cardSub}>
              Escolha um tema pré-definido ou edite individualmente as cores da interface em tempo real.
            </p>

            <div style={{ margin: '20px 0' }}>
              <label style={styles.label}>Temas Pré-configurados:</label>
              <div style={styles.presetsGrid}>
                {themePresets.map((p) => (
                  <div
                    key={p.presetName}
                    onClick={() => handleApplyPreset(p)}
                    style={{
                      ...styles.presetCard,
                      border: (customTheme || DEFAULT_THEME).presetName === p.presetName ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>{p.presetName}</span>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: p.bgMain }} />
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: p.bgSidebar }} />
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: p.accentPrimary }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.pickerGrid}>
              <div style={styles.pickerItem}>
                <label style={styles.label}>Fundo Principal:</label>
                <input
                  type="color"
                  value={(customTheme || DEFAULT_THEME).bgMain || DEFAULT_THEME.bgMain}
                  onChange={(e) => handleColorChange('bgMain', e.target.value)}
                  style={styles.colorInput}
                />
              </div>

              <div style={styles.pickerItem}>
                <label style={styles.label}>Fundo da Sidebar:</label>
                <input
                  type="color"
                  value={(customTheme || DEFAULT_THEME).bgSidebar || DEFAULT_THEME.bgSidebar}
                  onChange={(e) => handleColorChange('bgSidebar', e.target.value)}
                  style={styles.colorInput}
                />
              </div>

              <div style={styles.pickerItem}>
                <label style={styles.label}>Cor de Destaque Principal:</label>
                <input
                  type="color"
                  value={(customTheme || DEFAULT_THEME).accentPrimary || DEFAULT_THEME.accentPrimary}
                  onChange={(e) => handleColorChange('accentPrimary', e.target.value)}
                  style={styles.colorInput}
                />
              </div>

              <div style={styles.pickerItem}>
                <label style={styles.label}>Cards Atlassian:</label>
                <input
                  type="color"
                  value={(customTheme || DEFAULT_THEME).bgCardJira || DEFAULT_THEME.bgCardJira}
                  onChange={(e) => handleColorChange('bgCardJira', e.target.value)}
                  style={styles.colorInput}
                />
              </div>

              <div style={styles.pickerItem}>
                <label style={styles.label}>Cards do App:</label>
                <input
                  type="color"
                  value={(customTheme || DEFAULT_THEME).bgCardApp || DEFAULT_THEME.bgCardApp}
                  onChange={(e) => handleColorChange('bgCardApp', e.target.value)}
                  style={styles.colorInput}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === LEGAL & ABOUT TAB === */}
      {activeTab === 'legal' && (
        <div style={styles.section}>
          <div style={styles.formCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={styles.cardTitle}>
                  <ShieldCheck size={20} color="var(--accent-primary)" /> Sobre & Conformidade Legal
                </h3>
                <p style={styles.cardSub}>
                  Simplify your Work v1.0.0 — Documentos legais e termos de distribuição.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: legalTab === 'terms' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                  onClick={() => setLegalTab('terms')}
                >
                  Termos de Uso
                </button>
                <button
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: legalTab === 'privacy' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                  onClick={() => setLegalTab('privacy')}
                >
                  Política de Privacidade
                </button>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '12px',
                padding: '20px',
                maxHeight: '480px',
                overflowY: 'auto',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
              }}
            >
              {legalTab === 'terms'
                ? legalDocs.termsContent || 'Carregando Termos de Uso...'
                : legalDocs.privacyContent || 'Carregando Política de Privacidade...'}
            </div>
          </div>
        </div>
      )}

      {/* === UPDATES TAB === */}
      {activeTab === 'updates' && (
        <div style={styles.section}>
          <div style={styles.formCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={styles.cardTitle}>
                  <RefreshCw size={20} color="var(--accent-primary)" /> Atualizações do Aplicativo
                </h3>
                <p style={styles.cardSub}>
                  Verifique e instale as versões mais recentes do Simplify your Work diretamente dos lançamentos oficiais sem precisar reinstalar manualmente.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCheckForUpdates}
                disabled={isCheckingUpdate || updateStatus.state === 'checking' || updateStatus.state === 'downloading'}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <RefreshCw size={16} className={isCheckingUpdate || updateStatus.state === 'checking' ? 'spin' : ''} />
                {isCheckingUpdate || updateStatus.state === 'checking' ? 'Verificando...' : 'Verificar Atualizações'}
              </button>
            </div>

            {/* Versão Atual Card */}
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                  }}
                >
                  <Sparkles size={24} color="#6366f1" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                    Versão Instalada
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>
                    Simplify your Work v1.0.0
                  </div>
                </div>
              </div>

              <div>
                {updateStatus.state === 'idle' && (
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Última verificação concluída.
                  </span>
                )}
                {updateStatus.state === 'checking' && (
                  <span style={{ fontSize: '13px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RefreshCw size={14} className="spin" /> Buscando novidades no GitHub...
                  </span>
                )}
                {updateStatus.state === 'not-available' && (
                  <span style={{ fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} /> Você já está usando a versão mais recente!
                  </span>
                )}
                {updateStatus.state === 'available' && (
                  <span style={{ fontSize: '13px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} /> Nova versão <strong>v{updateStatus.version}</strong> disponível!
                  </span>
                )}
                {updateStatus.state === 'downloading' && (
                  <span style={{ fontSize: '13px', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Download size={16} /> Baixando atualização ({updateStatus.progress || 0}%)...
                  </span>
                )}
                {updateStatus.state === 'downloaded' && (
                  <span style={{ fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} /> Atualização v{updateStatus.version} pronta para instalar!
                  </span>
                )}
                {updateStatus.state === 'error' && (
                  <span style={{ fontSize: '13px', color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={16} /> Verificação concluída com aviso
                  </span>
                )}
              </div>
            </div>

            {/* Banner de Erro/Aviso Limpo */}
            {updateStatus.state === 'error' && (
              <div
                style={{
                  backgroundColor: 'rgba(244, 63, 94, 0.08)',
                  border: '1px solid rgba(244, 63, 94, 0.25)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <AlertCircle size={22} color="#f43f5e" style={{ flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff', marginBottom: '2px' }}>
                    Nenhuma Release Encontrada no Repositório
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                    {updateStatus.errorMessage || 'O repositório ainda não possui Releases publicadas ou está configurado como privado. Quando uma nova versão for publicada no GitHub, ela aparecerá aqui automaticamente.'}
                  </p>
                </div>
              </div>
            )}

            {/* Ações e Progresso de Download */}
            {updateStatus.state === 'available' && (
              <div
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>
                    🚀 Nova versão v{updateStatus.version} pronta para download
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                    Clique abaixo para baixar a versão mais recente em segundo plano.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDownloadUpdate}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#6366f1' }}
                >
                  <Download size={16} /> Baixar Atualização
                </button>
              </div>
            )}

            {updateStatus.state === 'downloading' && (
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#ffffff', fontWeight: '600' }}>Baixando nova versão...</span>
                  <span style={{ color: '#6366f1', fontWeight: '800' }}>{updateStatus.progress || 0}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${updateStatus.progress || 0}%`,
                      height: '100%',
                      backgroundColor: '#6366f1',
                      transition: 'width 0.2s ease',
                    }}
                  />
                </div>
              </div>
            )}

            {updateStatus.state === 'downloaded' && (
              <div
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>
                    ✨ Atualização baixada com sucesso!
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                    A nova versão v{updateStatus.version} está pronta para ser aplicada. O app será reiniciado rapidamente.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleQuitAndInstall}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#10b981' }}
                >
                  <Zap size={16} /> Reiniciar & Aplicar Agora
                </button>
              </div>
            )}

            {/* Explicação informativa */}
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 6px 0' }}>
                💡 <strong>Como funcionam as atualizações automáticas:</strong>
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>O aplicativo verifica periodicamente se há novas versões publicadas no repositório GitHub.</li>
                <li>Quando você aprovar ou ao reiniciar, as novas funcionalidades e correções são instaladas silenciosamente sem passar por telas de setup.</li>
              </ul>
            </div>
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
  headerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#ffffff',
  },
  tabNav: {
    display: 'flex',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: '12px',
    padding: '4px',
    border: '1px solid var(--border-subtle)',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  activeTabBtn: {
    backgroundColor: 'var(--accent-primary)',
    color: '#ffffff',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
  },
  formCard: {
    backgroundColor: 'var(--bg-sidebar)',
    borderRadius: '20px',
    padding: '24px',
    border: '1px solid var(--border-subtle)',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardSub: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  jiraForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '700',
    marginBottom: '6px',
    color: 'var(--text-secondary)',
  },
  jiraList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  jiraItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--bg-sidebar)',
    borderRadius: '14px',
    padding: '16px 20px',
    border: '1px solid var(--border-subtle)',
  },
  instMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '6px',
  },
  presetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '14px',
    marginTop: '8px',
  },
  presetCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: '14px',
    padding: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  pickerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    marginTop: '24px',
  },
  pickerItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
  },
  colorInput: {
    width: '100%',
    height: '40px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
  },
  aiProviderCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '16px',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '160px',
  },
  selectedBadge: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: '12px',
    border: '1px solid #10a37f',
    backgroundColor: 'rgba(16, 163, 127, 0.2)',
    color: '#34d399',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  aiCardDesc: {
    fontSize: '12px',
    color: 'var(--text-secondary, #94a3b8)',
    lineHeight: 1.5,
    margin: '12px 0',
  },
  aiCardFooter: {
    display: 'flex',
    alignItems: 'center',
    marginTop: 'auto',
  },
  urlPill: {
    fontSize: '11px',
    color: '#64748b',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: '3px 8px',
    borderRadius: '6px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
};
