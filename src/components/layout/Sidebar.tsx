import React from 'react';
import { LayoutGrid, LayoutDashboard, FileText, Bell, Settings } from 'lucide-react';

export type NavTab = 'overview' | 'tickets' | 'notes' | 'reminders' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Meu Hub', icon: LayoutGrid },
    { id: 'tickets' as NavTab, label: 'Tickets', icon: LayoutDashboard },
    { id: 'notes' as NavTab, label: 'Anotações', icon: FileText },
    { id: 'reminders' as NavTab, label: 'Lembretes', icon: Bell },
  ];

  return (
    <aside style={styles.sidebar}>
      {/* Sidebar Top Title Pill */}
      <div style={styles.headerBox}>
        <span style={styles.headerTitle}>Painel</span>
      </div>

      {/* Main Navigation Links */}
      <nav style={styles.navContainer}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                ...styles.navButton,
                ...(isActive ? styles.activeNavButton : {}),
              }}
            >
              <Icon size={20} color={isActive ? '#ffffff' : 'var(--text-secondary)'} />
              <span>{item.label}</span>
            </button>
          );
        })}
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
          <Settings size={20} color={activeTab === 'settings' ? '#ffffff' : 'var(--text-secondary)'} />
          <span>Configurações</span>
        </button>
      </div>
    </aside>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '240px',
    backgroundColor: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 16px',
    gap: '24px',
    flexShrink: 0,
  },
  headerBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '12px 20px',
    textAlign: 'center',
    border: '1px solid var(--border-subtle)',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '0.5px',
  },
  navContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '12px 18px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    width: '100%',
  },
  activeNavButton: {
    backgroundColor: 'var(--accent-primary)',
    color: '#ffffff',
    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
  },
  footer: {
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: '16px',
  },
};
