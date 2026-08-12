import React from 'react';
import { User } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  presetName?: string;
}

export const Header: React.FC<HeaderProps> = ({ searchQuery, onSearchChange, presetName }) => {
  return (
    <header style={styles.header}>
      {/* Brand Logo & Title */}
      <div style={styles.brandBox}>
        <img
          src="./assets/logo-full.png"
          alt="Simplify your Work"
          style={styles.logoImage}
          onError={(e) => {
            // Fallback to text if image loading fails in dev
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div style={styles.titleFallback}>
          <span style={styles.titleText}>Simplify your Work</span>
        </div>
      </div>

      {/* Global Quick Search Bar */}
      <div style={styles.searchBox}>
        <input
          type="text"
          placeholder="Pesquisar tickets, anotações ou lembretes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input-field"
          style={styles.searchInput}
        />
      </div>

      {/* Right Controls (Theme & User Profile Icon) */}
      <div style={styles.rightSection}>
        {presetName && (
          <div style={styles.themePill}>
            <span style={styles.themeDot} />
            <span style={styles.themeLabel}>{presetName}</span>
          </div>
        )}

        {/* User Profile Avatar matching user wireframe */}
        <div style={styles.profileAvatar} title="Perfil do Usuário (Emanuell Carvalho)">
          <User size={24} color="#ffffff" />
        </div>
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    height: '74px',
    backgroundColor: 'var(--bg-header)',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    gap: '24px',
    flexShrink: 0,
  },
  brandBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoImage: {
    height: '42px',
    objectFit: 'contain',
  },
  titleFallback: {
    display: 'none',
  },
  titleText: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#ffffff',
  },
  searchBox: {
    flex: 1,
    maxWidth: '540px',
  },
  searchInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '24px',
    padding: '10px 20px',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  themePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    borderRadius: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid var(--border-subtle)',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  themeDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-primary)',
    boxShadow: '0 0 8px var(--accent-primary)',
  },
  themeLabel: {
    whiteSpace: 'nowrap',
  },
  profileAvatar: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid rgba(255, 255, 255, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    transition: 'transform 0.2s ease',
  },
};
