import React from 'react';
import type { Ticket } from '../../types/index';
import { TicketCard } from './TicketCard';
import { Plus } from 'lucide-react';

interface TicketColumnProps {
  title: string;
  iconSrc: string;
  tickets: Ticket[];
  onAddClick: () => void;
  onCardClick: (ticket: Ticket) => void;
  accentColor?: string;
}

export const TicketColumn: React.FC<TicketColumnProps> = ({
  title,
  iconSrc,
  tickets,
  onAddClick,
  onCardClick,
}) => {
  return (
    <div style={styles.columnContainer}>
      <div style={styles.headerBar}>
        <div style={styles.titlePill}>
          <img src={iconSrc} alt={title} style={styles.iconImage} />
          <span style={styles.columnTitle}>{title}</span>
        </div>

        <button
          onClick={onAddClick}
          style={styles.addButton}
          title={`Adicionar novo em ${title}`}
        >
          <Plus size={22} color="#ffffff" />
        </button>
      </div>

      <div style={styles.cardsList}>
        {tickets.length === 0 ? (
          <div style={styles.emptyState}>
            <p>Nenhum ticket nesta lista.</p>
            <button onClick={onAddClick} className="btn btn-secondary" style={{ marginTop: '12px' }}>
              <Plus size={16} /> Adicionar Ticket
            </button>
          </div>
        ) : (
          tickets.map((t) => <TicketCard key={t.id} ticket={t} onClick={onCardClick} />)
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  columnContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: '24px',
    border: '1px solid var(--border-subtle)',
    padding: '20px',
    gap: '16px',
    height: '100%',
    overflow: 'hidden',
  },
  headerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  titlePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '28px',
    padding: '8px 20px',
    border: '1px solid var(--border-subtle)',
    flex: 1,
  },
  iconImage: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
  },
  columnTitle: {
    fontSize: '17px',
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: '0.3px',
  },
  addButton: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  cardsList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    paddingRight: '6px',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    fontSize: '14px',
    border: '2px dashed rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '30px',
  },
};
