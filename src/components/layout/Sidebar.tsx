import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Briefcase,
  Bell,
  Settings,
  MessagesSquare,
  Mail,
  Bot,
  Sparkles,
  ChevronDown,
  Folder,
  Globe,
  Cloud,
  Code,
  Layout,
  ExternalLink,
  Zap,
  CheckSquare,
  Layers,
  Shield,
  Radio,
} from 'lucide-react';
import type {
  AiAssistantConfig,
  NavTab,
  SidebarConfig,
  SidebarEntry,
  CustomSite,
} from '../../types/index';

import { DynamicCustomIcon, ALL_BRAND_AND_LUCIDE_ICONS } from '../common/BrandIcons';

export type { NavTab };

export interface NavItemDef {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ size?: number | string; color?: string; className?: string }>;
  color: string;
}

export const SITE_ICONS = ALL_BRAND_AND_LUCIDE_ICONS;

const SETTINGS_COLOR = '#a855f7';

export const ALL_NAV_ITEMS: Record<string, NavItemDef> = {
  tickets: { id: 'tickets', label: 'Tickets', icon: LayoutDashboard, color: '#38bdf8' },
  calendar: { id: 'calendar', label: 'Agenda', icon: Calendar, color: '#f59e0b' },
  notes: { id: 'notes', label: 'Anotações', icon: FileText, color: '#eab308' },
  clients: { id: 'clients', label: 'Clientes', icon: Briefcase, color: '#10b981' },
  reminders: { id: 'reminders', label: 'Lembretes', icon: Bell, color: '#f43f5e' },
  teams: { id: 'teams', label: 'Teams', icon: MessagesSquare, color: '#818cf8' },
  outlook: { id: 'outlook', label: 'Outlook', icon: Mail, color: '#0ea5e9' },
  ai_chatgpt: { id: 'ai_chatgpt', label: 'Chat GPT', icon: Bot, color: '#10a37f' },
  ai_claude: { id: 'ai_claude', label: 'Claude', icon: Sparkles, color: '#d97706' },
  ai_gemini: { id: 'ai_gemini', label: 'Gemini', icon: Sparkles, color: '#3b82f6' },
  settings: { id: 'settings', label: 'Configurações', icon: Settings, color: SETTINGS_COLOR },
};

export const getNavItemDef = (tabId: NavTab, customSites?: CustomSite[]): NavItemDef | null => {
  if (!tabId) return null;
  if (ALL_NAV_ITEMS[tabId]) {
    return ALL_NAV_ITEMS[tabId];
  }
  const sites = customSites && customSites.length > 0 ? customSites : loadStoredCustomSites();
  const custom = sites.find((s) => s && s.id === tabId);
  if (custom) {
    const CustomIconComp: React.FC<{ size?: number | string; color?: string; className?: string }> = ({ size, color, className }) => (
      <DynamicCustomIcon iconKey={custom.icon || 'globe'} size={size} color={color} className={className} />
    );

    return {
      id: custom.id,
      label: custom.title || 'Site Web',
      icon: CustomIconComp,
      color: custom.color || '#0ea5e9',
    };
  }
  return null;
};

export const DEFAULT_CUSTOM_SITES: CustomSite[] = [
  {
    id: 'site_onedrive',
    title: 'OneDrive',
    url: 'https://onedrive.live.com',
    icon: 'onedrive',
    color: '#0078d4',
    partition: 'persist:custom_site_onedrive',
    createdAt: '2026-08-20T00:00:00.000Z',
  },
];

export const loadStoredCustomSites = (): CustomSite[] => {
  try {
    const saved = localStorage.getItem('simplify_custom_sites');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Erro ao ler simplify_custom_sites:', e);
  }
  return DEFAULT_CUSTOM_SITES;
};

export const DEFAULT_SIDEBAR_CONFIG: SidebarConfig = {
  entries: [
    {
      type: 'group',
      id: 'group_microsoft',
      title: 'MICROSOFT',
      itemIds: ['outlook', 'teams', 'site_onedrive'],
    },
    {
      type: 'group',
      id: 'group_ai',
      title: 'AGENTES DE IA',
      itemIds: ['ai_gemini', 'ai_claude', 'ai_chatgpt'],
    },
    { type: 'item', id: 'calendar' },
    { type: 'item', id: 'notes' },
    { type: 'item', id: 'clients' },
    { type: 'item', id: 'reminders' },
    { type: 'item', id: 'tickets' },
  ],
};

export const normalizeSidebarConfig = (
  rawConfig: SidebarConfig,
  customSites: CustomSite[] = [],
  aiConfig?: AiAssistantConfig
): SidebarConfig => {
  const safeEntries: SidebarEntry[] = Array.isArray(rawConfig?.entries)
    ? JSON.parse(JSON.stringify(rawConfig.entries))
    : JSON.parse(JSON.stringify(DEFAULT_SIDEBAR_CONFIG.entries));

  // 1. Encontra ou assegura grupo Microsoft
  let groupMs = safeEntries.find(
    (e) => e.type === 'group' && (e.id === 'group_microsoft' || e.title?.toLowerCase().includes('microsoft'))
  ) as SidebarGroupEntry | undefined;

  if (!groupMs) {
    groupMs = {
      type: 'group',
      id: 'group_microsoft',
      title: 'MICROSOFT',
      itemIds: ['outlook', 'teams', 'site_onedrive'],
    };
    safeEntries.unshift(groupMs);
  }

  // 2. Encontra ou assegura grupo Agentes de IA
  let groupAi = safeEntries.find(
    (e) => e.type === 'group' && (e.id === 'group_ai' || e.title?.toLowerCase().includes('ia') || e.title?.toLowerCase().includes('ai'))
  ) as SidebarGroupEntry | undefined;

  if (!groupAi) {
    groupAi = {
      type: 'group',
      id: 'group_ai',
      title: 'AGENTES DE IA',
      itemIds: ['ai_gemini', 'ai_claude', 'ai_chatgpt'],
    };
    const msIdx = safeEntries.indexOf(groupMs);
    safeEntries.splice(msIdx + 1, 0, groupAi);
  }

  // Conjunto de todos os IDs já presentes
  const existingIds = new Set<string>();
  safeEntries.forEach((entry) => {
    if (entry.type === 'item' && entry.id) {
      existingIds.add(entry.id);
    } else if (entry.type === 'group' && Array.isArray(entry.itemIds)) {
      entry.itemIds.forEach((id) => {
        if (id) existingIds.add(id);
      });
    }
  });

  // Se site_onedrive não estiver presente em lugar nenhum, adiciona no grupo Microsoft
  if (!existingIds.has('site_onedrive')) {
    if (!groupMs.itemIds) groupMs.itemIds = [];
    groupMs.itemIds.push('site_onedrive');
    existingIds.add('site_onedrive');
  }

  // Se qualquer provedor de IA habilitado (ex: Claude, Gemini, ChatGPT) não estiver presente, adiciona no grupo Agentes de IA
  const enabledAi = aiConfig?.enabledProviders || ['gemini'];
  enabledAi.forEach((prov) => {
    const aiTabId = `ai_${prov}` as NavTab;
    if (!existingIds.has(aiTabId)) {
      if (!groupAi.itemIds) groupAi.itemIds = [];
      groupAi.itemIds.push(aiTabId);
      existingIds.add(aiTabId);
    }
  });

  // Garante que os módulos principais existam
  const baseItems: NavTab[] = ['calendar', 'notes', 'clients', 'reminders', 'tickets'];
  baseItems.forEach((tabId) => {
    if (!existingIds.has(tabId)) {
      safeEntries.push({ type: 'item', id: tabId });
      existingIds.add(tabId);
    }
  });

  return { entries: safeEntries };
};

export const loadStoredSidebarConfig = (customSites?: CustomSite[], aiConfig?: AiAssistantConfig): SidebarConfig => {
  try {
    const saved = localStorage.getItem('simplify_sidebar_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.entries)) {
        return normalizeSidebarConfig(parsed, customSites, aiConfig);
      }
    }

    // Migração de ordem legada se existir
    const legacySaved = localStorage.getItem('simplify_sidebar_order');
    if (legacySaved) {
      const ids: string[] = JSON.parse(legacySaved);
      if (Array.isArray(ids) && ids.length > 0) {
        const entries: SidebarEntry[] = [];
        ids.forEach((id) => {
          if (id !== 'settings') {
            entries.push({ type: 'item', id: id as NavTab });
          }
        });
        return normalizeSidebarConfig({ entries }, customSites, aiConfig);
      }
    }
  } catch (e) {
    console.error('Erro ao ler simplify_sidebar_config:', e);
  }
  return normalizeSidebarConfig(DEFAULT_SIDEBAR_CONFIG, customSites, aiConfig);
};

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  aiConfig?: AiAssistantConfig;
  sidebarConfig?: SidebarConfig;
  customSites?: CustomSite[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  aiConfig,
  sidebarConfig: propSidebarConfig,
  customSites: propCustomSites,
}) => {
  const customSites = propCustomSites && propCustomSites.length > 0 ? propCustomSites : loadStoredCustomSites();
  const [currentConfig, setCurrentConfig] = useState<SidebarConfig>(() => {
    const raw = propSidebarConfig || loadStoredSidebarConfig(customSites, aiConfig);
    return normalizeSidebarConfig(raw, customSites, aiConfig);
  });

  useEffect(() => {
    if (propSidebarConfig) {
      setCurrentConfig(normalizeSidebarConfig(propSidebarConfig, customSites, aiConfig));
    } else {
      setCurrentConfig(loadStoredSidebarConfig(customSites, aiConfig));
    }
  }, [propSidebarConfig, customSites, aiConfig]);

  // Listener para atualização quando salvo em outra aba ou componente
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'simplify_sidebar_config' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && Array.isArray(parsed.entries)) {
            setCurrentConfig(parsed);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const enabledAi = aiConfig?.enabledProviders || [];

  const isTabAvailable = (tabId: NavTab): boolean => {
    if (!tabId || typeof tabId !== 'string') return false;
    if (tabId === 'settings') return false;
    if (tabId.startsWith('ai_')) {
      const prov = tabId.replace('ai_', '') as any;
      return enabledAi.includes(prov);
    }
    return true;
  };

  // Helper para renderizar um botão de navegação
  const renderNavButton = (tabId: NavTab, isGroupChild: boolean = false) => {
    if (!tabId) return null;
    const item = getNavItemDef(tabId, customSites);
    if (!item) return null;
    if (!isTabAvailable(tabId)) return null;

    const Icon = item.icon || LayoutDashboard;
    const isActive = activeTab === tabId;

    return (
      <div key={tabId} style={{ position: 'relative', width: '100%' }}>
        {isGroupChild && (
          <div
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: isActive ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.25)',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
        )}
        <button
          onClick={() => onSelectTab(tabId)}
          style={{
            ...styles.navButton,
            ...(isGroupChild ? styles.groupChildButton : {}),
            ...(isActive ? styles.activeNavButton : {}),
          }}
          title={item.label}
        >
          {isActive && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: '20%',
                bottom: '20%',
                width: '3px',
                backgroundColor: '#ffffff',
                borderRadius: '0 4px 4px 0',
              }}
            />
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isGroupChild ? '24px' : '26px',
              height: isGroupChild ? '24px' : '26px',
              borderRadius: '7px',
              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : `${item.color || '#38bdf8'}22`,
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            <Icon size={isGroupChild ? 15 : 16} color={isActive ? '#ffffff' : (item.color || '#38bdf8')} />
          </div>
          <span
            style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: isGroupChild ? '12.5px' : '13px',
            }}
          >
            {item.label}
          </span>
        </button>
      </div>
    );
  };

  // Coleta todos os itens presentes na configuração
  const renderedItemIds = new Set<NavTab>();
  const safeEntries = Array.isArray(currentConfig?.entries) ? currentConfig.entries : DEFAULT_SIDEBAR_CONFIG.entries;
  safeEntries.forEach((entry) => {
    if (!entry) return;
    if (entry.type === 'item' && entry.id) {
      renderedItemIds.add(entry.id);
    } else if (entry.type === 'group' && Array.isArray(entry.itemIds)) {
      entry.itemIds.forEach((id) => {
        if (id) renderedItemIds.add(id);
      });
    }
  });

  // Identifica itens padrão e sites personalizados que não estão explicitamente na configuração para adicioná-los como fallback
  const safeCustomSites = Array.isArray(customSites) ? customSites : [];
  const allBaseAndCustomKeys: NavTab[] = [
    ...(Object.keys(ALL_NAV_ITEMS) as NavTab[]),
    ...safeCustomSites.map((s) => s.id as NavTab),
  ];

  const missingAvailableItems: NavTab[] = allBaseAndCustomKeys.filter(
    (id) => id && id !== 'settings' && isTabAvailable(id) && !renderedItemIds.has(id)
  );

  return (
    <aside style={styles.sidebar}>
      {/* Sidebar Top Title Pill */}
      <div style={styles.headerBox}>
        <span style={styles.headerTitle}>Painel</span>
      </div>

      {/* Main Navigation Links com Tópicos Agrupadores */}
      <nav style={styles.navContainer}>
        {safeEntries.map((entry) => {
          if (!entry) return null;
          if (entry.type === 'item') {
            return renderNavButton(entry.id, false);
          }

          if (entry.type === 'group') {
            const visibleChildIds = (entry.itemIds || []).filter((id) => id && isTabAvailable(id));
            // Se o grupo não tiver nenhum item visível/disponível, não renderiza
            if (visibleChildIds.length === 0) return null;

            return (
              <div key={entry.id || Math.random().toString()} style={styles.groupContainer}>
                {/* Cabeçalho do Tópico (Sempre visível/não colapsável) */}
                <div style={styles.groupHeader} title={`Tópico: ${entry.title}`}>
                  <ChevronDown size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <Folder size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                  <span style={styles.groupTitleText}>{entry.title}</span>
                </div>

                {/* Sub-itens do Tópico */}
                <div style={styles.groupItemsContainer}>
                  {visibleChildIds.map((childId) => renderNavButton(childId, true))}
                </div>
              </div>
            );
          }

          return null;
        })}

        {/* Renderiza itens habilitados que eventualmente faltaram na configuração */}
        {missingAvailableItems.map((missingId) => renderNavButton(missingId, false))}
      </nav>

      {/* Footer Settings Link */}
      <div style={styles.footer}>
        <button
          onClick={() => onSelectTab('settings')}
          style={{
            ...styles.navButton,
            ...(activeTab === 'settings' ? styles.activeNavButton : {}),
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              backgroundColor: activeTab === 'settings' ? 'rgba(255, 255, 255, 0.2)' : `${SETTINGS_COLOR}22`,
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            <Settings size={16} color={activeTab === 'settings' ? '#ffffff' : SETTINGS_COLOR} />
          </div>
          <span style={{ fontSize: '13px' }}>Configurações</span>
        </button>
      </div>
    </aside>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '190px',
    backgroundColor: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    padding: '14px 10px',
    gap: '12px',
    flexShrink: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  headerBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    padding: '8px 12px',
    textAlign: 'center',
    border: '1px solid var(--border-subtle)',
  },
  headerTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '0.4px',
  },
  navContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  groupContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginTop: '6px',
    marginBottom: '4px',
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 8px 3px 6px',
    userSelect: 'none',
  },
  groupTitleText: {
    fontSize: '11.5px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    letterSpacing: '0.3px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  groupItemsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    position: 'relative',
    marginLeft: '6px',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    paddingLeft: '4px',
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    width: '100%',
    whiteSpace: 'nowrap',
    position: 'relative',
  },
  groupChildButton: {
    padding: '6px 8px 6px 14px',
    fontSize: '12.5px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  },
  activeNavButton: {
    backgroundColor: 'var(--accent-primary)',
    color: '#ffffff',
    fontWeight: '700',
    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)',
  },
  footer: {
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: '10px',
    marginTop: 'auto',
  },
};
