import React, { useState } from 'react';
import type { Ticket, TicketStatus } from '../../types/index';
import { Plus, X } from 'lucide-react';

interface AddLocalTicketModalProps {
  onClose: () => void;
  onSaveTicket: (ticket: Partial<Ticket>) => Promise<void>;
}

const colorPresets = [
  { name: 'Verde Neon', hex: '#22c55e' },
  { name: 'Vermelho Vibrante', hex: '#ef4444' },
  { name: 'Amarelo Bege', hex: '#eab308' },
  { name: 'Ciano Azul', hex: '#06b6d4' },
  { name: 'Rosa Magenta', hex: '#ec4899' },
  { name: 'Laranja Quente', hex: '#f97316' },
  { name: 'Roxo Violeta', hex: '#8b5cf6' },
];

export const AddLocalTicketModal: React.FC<AddLocalTicketModalProps> = ({ onClose, onSaveTicket }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TicketStatus>('TO_DO');
  const [selectedColor, setSelectedColor] = useState('#eab308');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let statusLabel = 'A Fazer';
    if (status === 'IN_PROGRESS') statusLabel = 'Em Andamento';
    if (status === 'NEXT') statusLabel = 'Fazer em Seguida';
    if (status === 'TO_DO') statusLabel = 'A Fazer';
    if (status === 'WAITING_CLIENT') statusLabel = 'Aguardando Cliente';
    if (status === 'BACKLOG') statusLabel = 'Backlog';
    if (status === 'DONE') statusLabel = 'Concluído';

    try {
      setLoading(true);
      await onSaveTicket({
        source: 'LOCAL',
        title: title.trim(),
        description: description.trim(),
        status,
        statusLabel,
        color: selectedColor,
        labels: [],
        comments: [],
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={styles.titleGroup}>
            <img src="./assets/app-badge.png" alt="App" style={{ width: '28px', height: '28px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Criar Novo Ticket Local</h2>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '16px' }}>
          <div>
            <label style={styles.label}>Título da Tarefa:</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: Fazer relatório semanal, Beber água, Ajustar código..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label style={styles.label}>Descrição Detalhada:</label>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Adicione observações, passos ou notas da tarefa..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Status Inicial:</label>
              <select
                className="input-field"
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
              >
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="NEXT">Fazer em Seguida</option>
                <option value="TO_DO">A Fazer</option>
                <option value="WAITING_CLIENT">Aguardando Cliente</option>
                <option value="BACKLOG">Backlog</option>
                <option value="DONE">Concluído</option>
              </select>
            </div>
          </div>

          <div>
            <label style={styles.label}>Cor de Destaque do Card:</label>
            <div style={styles.colorPalette}>
              {colorPresets.map((c) => (
                <button
                  type="button"
                  key={c.hex}
                  onClick={() => setSelectedColor(c.hex)}
                  title={c.name}
                  style={{
                    ...styles.colorCircle,
                    backgroundColor: c.hex,
                    border: selectedColor === c.hex ? '3px solid #ffffff' : '2px solid transparent',
                    transform: selectedColor === c.hex ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={styles.actions}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Plus size={18} />
              {loading ? 'Salvando...' : 'Criar Ticket Local'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '700',
    marginBottom: '8px',
    color: 'var(--text-secondary)',
  },
  colorPalette: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    padding: '8px 0',
  },
  colorCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '12px',
  },
};
