import React from 'react';
import type { Ticket } from '../../types/index';
import { MessageSquare, Tag, AlertCircle, Check } from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  isSelected?: boolean;
  selectionMode?: boolean;
  onClick: (ticket: Ticket) => void;
  onToggleSelect?: (ticketId: string, e: React.MouseEvent) => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  isSelected = false,
  selectionMode = false,
  onClick,
  onToggleSelect,
}) => {
  const isJira = ticket.source === 'JIRA';

  const getStatusBadge = () => {
    switch (ticket.status) {
      case 'DONE':
        return <span className="badge badge-done">{ticket.statusLabel || 'Concluído'}</span>;
      case 'IN_PROGRESS':
        return <span className="badge badge-in-progress">{ticket.statusLabel || 'Em Progresso'}</span>;
      case 'BLOCKED':
        return <span className="badge badge-blocked">{ticket.statusLabel || 'Bloqueado'}</span>;
      default:
        return <span className="badge badge-todo">{ticket.statusLabel || 'A Fazer'}</span>;
    }
  };

  const cardBgColor = isSelected
    ? 'rgba(56, 189, 248, 0.12)'
    : ticket.color || (isJira ? 'var(--bg-card-jira)' : 'var(--bg-card-app)');

  return (
    <div
      onClick={() => onClick(ticket)}
      style={{
        ...styles.card,
        backgroundColor: cardBgColor,
        borderLeft: `6px solid ${isSelected ? '#38bdf8' : (ticket.color || (isJira ? '#38bdf8' : '#8b5cf6'))}`,
        borderColor: isSelected ? '#38bdf8' : 'var(--border-subtle)',
        boxShadow: isSelected
          ? '0 0 0 1px #38bdf8, 0 8px 24px rgba(56, 189, 248, 0.25)'
          : '0 4px 12px rgba(0, 0, 0, 0.25)',
      }}
      className="ticket-card-hover"
    >
      <div style={styles.cardHeader}>
        <div style={styles.titleBox}>
          {onToggleSelect && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(ticket.id, e);
              }}
              style={{
                ...styles.checkboxBtn,
                backgroundColor: isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                borderColor: isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.3)',
                opacity: isSelected || selectionMode ? 1 : 0.6,
              }}
              title={isSelected ? 'Desmarcar ticket' : 'Selecionar ticket'}
            >
              {isSelected && <Check size={12} color="#0f172a" strokeWidth={3.5} />}
            </button>
          )}

          {isJira && (
            <img src="./assets/jira-badge.png" alt="Jira" style={styles.badgeIcon} />
          )}
          {!isJira && (
            <img src="./assets/app-badge.png" alt="App" style={styles.badgeIcon} />
          )}
          <span style={styles.cardTitle}>{ticket.title}</span>
        </div>
        {getStatusBadge()}
      </div>

      <div style={styles.descBox}>
        <p style={styles.descText}>
          {ticket.description
            ? ticket.description.slice(0, 140) + (ticket.description.length > 140 ? '...' : '')
            : 'Sem descrição fornecida.'}
        </p>
      </div>

      <div style={styles.cardFooter}>
        <div style={styles.metaLeft}>
          {ticket.key && <span style={styles.keyTag}>{ticket.key}</span>}
          {ticket.labels && ticket.labels.length > 0 && (
            <span style={styles.labelTag}>
              <Tag size={12} /> {ticket.labels[0]} {ticket.labels.length > 1 ? `+${ticket.labels.length - 1}` : ''}
            </span>
          )}
        </div>

        <div style={styles.metaRight}>
          {ticket.comments && ticket.comments.length > 0 && (
            <span style={styles.metaItem}>
              <MessageSquare size={13} /> {ticket.comments.length}
            </span>
          )}
          {ticket.priority && (
            <span style={styles.metaItem}>
              <AlertCircle size={13} /> {ticket.priority}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    cursor: 'pointer',
    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
    border: '1px solid var(--border-subtle)',
    position: 'relative',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  titleBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    overflow: 'hidden',
  },
  badgeIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  descBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '10px',
    padding: '10px 14px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  descText: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: '1.45',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: 'var(--text-muted)',
    paddingTop: '4px',
  },
  metaLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  keyTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    color: '#ffffff',
    padding: '3px 8px',
    borderRadius: '6px',
    fontWeight: '700',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '11px',
  },
  labelTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: 'var(--text-secondary)',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  metaRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: 'var(--text-secondary)',
  },
  checkboxBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '5px',
    border: '1.5px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
    transition: 'all 0.15s ease',
  },
};
