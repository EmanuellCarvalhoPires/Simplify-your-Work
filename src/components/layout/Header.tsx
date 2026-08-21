import React, { useState, useRef, useEffect } from 'react';
import { User, ChevronDown, UserPlus, Check, Trash2, Search, Command } from 'lucide-react';
import type { UserProfile } from '../../types/index';

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onOpenGlobalSearch?: () => void;
  presetName?: string;
  activeUser?: UserProfile | null;
  users?: UserProfile[];
  onSelectActiveUser?: (id: string) => Promise<void>;
  onDeleteUser?: (id: string) => Promise<void>;
  onOpenCreateUserModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery = '',
  onSearchChange,
  onOpenGlobalSearch,
  presetName,
  activeUser,
  users = [],
  onSelectActiveUser,
  onDeleteUser,
  onOpenCreateUserModal,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (n?: string) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return n[0].toUpperCase();
  };

  const userAvatarColor = activeUser?.avatarColor || '#6366f1';

  return (
    <header style={styles.header}>
      {/* Brand Logo & Title */}
      <div style={styles.brandBox}>
        <img
          src="./assets/logo-full.png"
          alt="Simplify your Work"
          style={styles.logoImage}
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div style={styles.titleFallback}>
          <span style={styles.titleText}>Simplify your Work</span>
        </div>
      </div>

      {/* Global Quick Search Bar (Interactive Trigger for Jira-Style Omnisearch) */}
      <div
        style={styles.searchBox}
        onClick={() => onOpenGlobalSearch && onOpenGlobalSearch()}
        title="Buscar tickets, anotações, arquivos, agenda, clientes... (Ctrl + K)"
      >
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
            <Search size={16} color="var(--accent-primary)" />
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Pesquisar em todo o app (tickets, notas, arquivos, agenda, clientes)...
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 7px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-subtle)',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-muted)',
            }}
          >
            <span>Ctrl</span>
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Right Controls (Theme & User Profile Dropdown) */}
      <div style={styles.rightSection}>
        {presetName && (
          <div style={styles.themePill}>
            <span style={styles.themeDot} />
            <span style={styles.themeLabel}>{presetName}</span>
          </div>
        )}

        {/* User Profile Pill & Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 10px 4px 6px',
              borderRadius: '24px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title={activeUser ? `${activeUser.name} (${activeUser.email})` : 'Perfil do Usuário'}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: userAvatarColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                color: '#ffffff',
                fontSize: '13px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {activeUser?.name ? getInitials(activeUser.name) : <User size={18} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff', lineHeight: '1.2' }}>
                {activeUser?.name || 'Usuário'}
              </span>
              {activeUser?.role && (
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{activeUser.role}</span>
              )}
            </div>
            <ChevronDown size={14} color="var(--text-secondary)" style={{ marginLeft: '4px' }} />
          </div>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '50px',
                right: 0,
                width: '260px',
                backgroundColor: 'var(--bg-modal)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                padding: '8px',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Alternar Usuário Ativo
              </div>

              {Array.isArray(users) && users.filter((u) => u && u.id).map((u) => {
                const isActive = activeUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={async () => {
                      if (onSelectActiveUser && !isActive) {
                        await onSelectActiveUser(u.id);
                      }
                      setIsMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    className="hover-bright"
                  >
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        backgroundColor: u.avatarColor || '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        color: '#ffffff',
                        fontSize: '12px',
                      }}
                    >
                      {getInitials(u.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.name || 'Usuário'}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.email || ''}
                      </p>
                    </div>
                    {isActive && <Check size={16} color="var(--accent-primary)" />}
                  </div>
                );
              })}

              <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  if (onOpenCreateUserModal) onOpenCreateUserModal();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--accent-primary)',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                className="hover-bright"
              >
                <UserPlus size={16} /> Cadastrar Novo Usuário
              </button>

              {activeUser && (
                <button
                  onClick={async () => {
                    setIsMenuOpen(false);
                    if (window.confirm(`Tem certeza que deseja excluir/sair do perfil "${activeUser.name}"?`)) {
                      if (onDeleteUser) {
                        await onDeleteUser(activeUser.id);
                      }
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginTop: '2px',
                  }}
                  className="hover-bright"
                >
                  <Trash2 size={15} /> Sair / Excluir Perfil Atual
                </button>
              )}
            </div>
          )}
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
