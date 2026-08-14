import React, { useState, useEffect } from 'react';
import { User, Mail, ShieldCheck, Palette, X, Save } from 'lucide-react';
import type { UserProfile } from '../../types/index';

interface UserModalProps {
  userToEdit?: UserProfile | null;
  onSave: (user: Partial<UserProfile>) => Promise<void>;
  onClose: () => void;
}

const PRESET_AVATAR_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#8b5cf6', // Purple
  '#ec4899', // Pink
];

export const UserModal: React.FC<UserModalProps> = ({ userToEdit, onSave, onClose }) => {
  const [name, setName] = useState(userToEdit?.name || '');
  const [email, setEmail] = useState(userToEdit?.email || '');
  const [role, setRole] = useState(userToEdit?.role || 'Desenvolvedor');
  const [avatarColor, setAvatarColor] = useState(userToEdit?.avatarColor || '#6366f1');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name);
      setEmail(userToEdit.email);
      setRole(userToEdit.role || 'Desenvolvedor');
      setAvatarColor(userToEdit.avatarColor || '#6366f1');
    }
  }, [userToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    try {
      setIsSaving(true);
      await onSave({
        id: userToEdit?.id,
        name: name.trim(),
        email: email.trim(),
        role: role.trim(),
        avatarColor,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (n: string) => {
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (n[0] || 'U').toUpperCase();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2200 }}>
      <div
        className="modal-content"
        style={{ maxWidth: '460px', width: '100%', backgroundColor: 'var(--bg-modal)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: avatarColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                color: '#ffffff',
                fontSize: '14px',
              }}
            >
              {name ? getInitials(name) : <User size={18} />}
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                {userToEdit ? 'Editar Perfil de Usuário' : 'Cadastrar Novo Usuário'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                As preferências e cores serão vinculadas a este usuário.
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={styles.label}>
              <User size={14} color="var(--accent-primary)" /> Nome Completo:
            </label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Maria Silva"
              required
              autoFocus
            />
          </div>

          <div>
            <label style={styles.label}>
              <Mail size={14} color="var(--accent-primary)" /> E-mail:
            </label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: maria.silva@empresa.com"
              required
            />
          </div>

          <div>
            <label style={styles.label}>
              <ShieldCheck size={14} color="var(--accent-primary)" /> Cargo / Função:
            </label>
            <input
              type="text"
              className="input-field"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ex: Gerente de Projetos, Dev Backend..."
            />
          </div>

          <div>
            <label style={styles.label}>
              <Palette size={14} color="var(--accent-primary)" /> Cor do Avatar do Perfil:
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
              {PRESET_AVATAR_COLORS.map((c) => (
                <div
                  key={c}
                  onClick={() => setAvatarColor(c)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: avatarColor === c ? '2px solid #ffffff' : '2px solid transparent',
                    boxShadow: avatarColor === c ? '0 0 0 2px var(--accent-primary)' : 'none',
                  }}
                />
              ))}
              <input
                type="color"
                value={avatarColor}
                onChange={(e) => setAvatarColor(e.target.value)}
                style={{ width: '32px', height: '32px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                title="Escolher cor personalizada"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              <Save size={16} /> {isSaving ? 'Salvando...' : 'Salvar Perfil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '6px',
  },
};
