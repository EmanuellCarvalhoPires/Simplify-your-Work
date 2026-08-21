import React from 'react';
import type { Ticket } from '../../types/index';
import { TicketCard } from './TicketCard';
import { Plus } from 'lucide-react';

interface TicketColumnProps {
  title: string;
  iconSrc?: string;
  accentColor?: string;
  tickets: Ticket[];
  selectedTicketIds?: Set<string>;
  onAddClick: () => void;
  onCardClick: (ticket: Ticket) => void;
  onToggleSelectTicket?: (ticketId: string, e: React.MouseEvent) => void;
}

export const TicketColumn: React.FC<TicketColumnProps> = ({
  title,
  iconSrc,
  accentColor = '#6366f1',
  tickets,
  selectedTicketIds = new Set(),
  onAddClick,
  onCardClick,
  onToggleSelectTicket,
}) => {
  return (
    <div style={styles.columnContainer}>
      <div style={styles.headerBar}>
        <div style={{ ...styles.titlePill, borderColor: `${accentColor}40` }}>
          {iconSrc ? (
            <img src={iconSrc} alt={title} style={styles.iconImage} />
          ) : (
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: accentColor,
                display: 'inline-block',
                flexShrink: 0,
                boxShadow: `0 0 10px ${accentColor}80`,
              }}
            />
          )}
          <span style={styles.columnTitle}>{title}</span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '12px',
              fontWeight: '700',
              backgroundColor: `${accentColor}25`,
              color: accentColor,
              padding: '2px 8px',
              borderRadius: '12px',
              border: `1px solid ${accentColor}40`,
            }}
          >
            {tickets.length}
          </span>
        </div>

        <button
          onClick={onAddClick}
          style={styles.addButton}
          title={`Adicionar novo em ${title}`}
        >
          <Plus size={18} color="#ffffff" />
        </button>
      </div>

      <div style={styles.cardsList}>
        {tickets.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhum ticket nesta coluna.</p>
            <button onClick={onAddClick} className="btn btn-secondary" style={{ marginTop: '10px', padding: '5px 10px', fontSize: '12px' }}>
              <Plus size={14} /> Adicionar
            </button>
          </div>
        ) : (
          tickets.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              isSelected={selectedTicketIds.has(t.id)}
              selectionMode={selectedTicketIds.size > 0}
              onClick={onCardClick}
              onToggleSelect={onToggleSelectTicket}
            />
          ))
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  columnContainer: {
    width: '300px',
    minWidth: '300px',
    flex: '0 0 300px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: '20px',
    border: '1px solid var(--border-subtle)',
    padding: '16px',
    gap: '14px',
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
