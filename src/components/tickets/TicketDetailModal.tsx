import React, { useState, useEffect, useMemo } from 'react';
import { marked } from 'marked';
import type { Ticket, TicketStatus, JiraInstance, NoteItem } from '../../types/index';
import {
  Trash2,
  X,
  User,
  Send,
  ChevronDown,
  ChevronRight,
  Settings,
  CheckSquare,
  Plus,
  RefreshCw,
  Edit2,
  Check,
  Calendar,
  Tag as TagIcon,
  AlertCircle,
  Copy,
  Link2,
  Unlink,
  ExternalLink,
  Search,
  FileText,
  FileCode,
  Eye,
  BookOpen,
} from 'lucide-react';

interface TicketDetailModalProps {
  ticket: Ticket;
  allTickets?: Ticket[];
  notes?: NoteItem[];
  jiraInstances?: JiraInstance[];
  onClose: () => void;
  onUpdateStatus: (ticketId: string, newStatus: TicketStatus) => Promise<void>;
  onDeleteTicket: (ticketId: string) => Promise<void>;
  onSaveTicket?: (ticket: Partial<Ticket>) => Promise<void>;
  onSyncJiraTicket?: (ticketKey: string, instanceId: string) => Promise<void>;
  onAddComment?: (ticketId: string, author: string, body: string) => Promise<void>;
  onOpenLinkedTicket?: (ticket: Ticket) => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  allTickets = [],
  notes = [],
  jiraInstances = [],
  onClose,
  onUpdateStatus,
  onDeleteTicket,
  onSaveTicket,
  onSyncJiraTicket,
  onAddComment,
  onOpenLinkedTicket,
}) => {
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>(ticket.status);
  const [newCommentText, setNewCommentText] = useState('');
  const [isCommentFocused, setIsCommentFocused] = useState(false);
  const [copiedCommentId, setCopiedCommentId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const isJira = ticket.source === 'JIRA';

  // Description Edit State
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(ticket.description || '');

  // Local Editable Fields State
  const [isEditingAssignee, setIsEditingAssignee] = useState(false);
  const [assigneeDraft, setAssigneeDraft] = useState(ticket.assignee || 'Eu');

  const [isEditingReporter, setIsEditingReporter] = useState(false);
  const [reporterDraft, setReporterDraft] = useState(ticket.reporter || 'Eu');

  const [newLabelText, setNewLabelText] = useState('');
  const [isAddingLabel, setIsAddingLabel] = useState(false);

  // Link Ticket Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');

  // Link Markdown Note Modal State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');

  // Note Content Viewer Modal State
  const [previewNote, setPreviewNote] = useState<NoteItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [loadingNote, setLoadingNote] = useState(false);

  // Resolve Linked Tickets Objects
  const linkedTickets = (ticket.linkedTicketIds || [])
    .map((id) => allTickets.find((t) => t.id === id))
    .filter((t): t is Ticket => t !== undefined);

  // Candidate tickets available to link (exclude current ticket & already linked tickets)
  const candidateTickets = allTickets
    .filter((t) => t.id !== ticket.id && !(ticket.linkedTicketIds || []).includes(t.id))
    .filter((t) => {
      if (!linkSearchQuery.trim()) return true;
      const q = linkSearchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.key && t.key.toLowerCase().includes(q))
      );
    });

  // Resolve Linked Notes Objects
  const linkedNotes = (ticket.linkedNoteIds || [])
    .map((id) => notes.find((n) => n.id === id))
    .filter((n): n is NoteItem => n !== undefined);

  // Candidate notes available to link
  const candidateNotes = notes
    .filter((n) => !(ticket.linkedNoteIds || []).includes(n.id))
    .filter((n) => {
      if (!noteSearchQuery.trim()) return true;
      return n.title.toLowerCase().includes(noteSearchQuery.toLowerCase());
    });

  // Sort comments so newest comments appear FIRST at the top
  const sortedComments = ticket.comments
    ? [...ticket.comments].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
    : [];

  const handleStatusChange = async (newStatus: TicketStatus) => {
    setCurrentStatus(newStatus);
    try {
      await onUpdateStatus(ticket.id, newStatus);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja remover este ticket da sua fila?')) {
      try {
        setLoading(true);
        await onDeleteTicket(ticket.id);
        onClose();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSync = async () => {
    if (isJira && ticket.key && ticket.jiraInstanceId && onSyncJiraTicket) {
      try {
        setLoading(true);
        await onSyncJiraTicket(ticket.key, ticket.jiraInstanceId);
      } catch (err) {
        console.error('Erro ao recarregar ticket da API do Jira:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveField = async (fieldUpdates: Partial<Ticket>) => {
    if (!onSaveTicket) return;
    try {
      await onSaveTicket({
        ...ticket,
        ...fieldUpdates,
      });
    } catch (err) {
      console.error('Erro ao salvar alteração no ticket:', err);
    }
  };

  const handleSaveDescription = async () => {
    await handleSaveField({ description: descDraft.trim() });
    setIsEditingDesc(false);
  };

  const handleAddCommentSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCommentText.trim() || !onAddComment) return;

    try {
      await onAddComment(ticket.id, 'Eu (Você)', newCommentText.trim());
      setNewCommentText('');
      setIsCommentFocused(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAddCommentSubmit();
    }
  };

  const insertQuickChipText = (text: string) => {
    setNewCommentText((prev) => (prev ? `${prev} ${text}` : text));
  };

  const handleCopyComment = (commentId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommentId(commentId);
    setTimeout(() => {
      setCopiedCommentId((prev) => (prev === commentId ? null : prev));
    }, 2000);
  };

  const handleAddLabelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelText.trim()) return;
    const updatedLabels = [...(ticket.labels || []), newLabelText.trim().toUpperCase()];
    await handleSaveField({ labels: updatedLabels });
    setNewLabelText('');
    setIsAddingLabel(false);
  };

  const handleRemoveLabel = async (labelToRemove: string) => {
    const updatedLabels = (ticket.labels || []).filter((l) => l !== labelToRemove);
    await handleSaveField({ labels: updatedLabels });
  };

  // Bi-directional Ticket Link Handler
  const handleLinkTicket = async (targetTicketId: string) => {
    if (!onSaveTicket) return;
    const targetTicket = allTickets.find((t) => t.id === targetTicketId);
    if (!targetTicket) return;

    const updatedCurrentIds = Array.from(new Set([...(ticket.linkedTicketIds || []), targetTicketId]));
    const updatedTargetIds = Array.from(new Set([...(targetTicket.linkedTicketIds || []), ticket.id]));

    // 1. Update target ticket bi-directionally first
    await onSaveTicket({
      ...targetTicket,
      linkedTicketIds: updatedTargetIds,
    });

    // 2. Update current ticket second
    await onSaveTicket({
      ...ticket,
      linkedTicketIds: updatedCurrentIds,
    });

    setIsLinkModalOpen(false);
    setLinkSearchQuery('');
  };

  // Bi-directional Ticket Unlink Handler
  const handleUnlinkTicket = async (targetTicketId: string) => {
    if (!onSaveTicket) return;
    const targetTicket = allTickets.find((t) => t.id === targetTicketId);

    const updatedCurrentIds = (ticket.linkedTicketIds || []).filter((id) => id !== targetTicketId);

    // 1. Update target ticket bi-directionally first
    if (targetTicket) {
      const updatedTargetIds = (targetTicket.linkedTicketIds || []).filter((id) => id !== ticket.id);
      await onSaveTicket({
        ...targetTicket,
        linkedTicketIds: updatedTargetIds,
      });
    }

    // 2. Update current ticket second
    await onSaveTicket({
      ...ticket,
      linkedTicketIds: updatedCurrentIds,
    });
  };

  // Link Markdown Note Handler
  const handleLinkNote = async (noteId: string) => {
    if (!onSaveTicket) return;
    const updatedNoteIds = Array.from(new Set([...(ticket.linkedNoteIds || []), noteId]));
    await onSaveTicket({
      ...ticket,
      linkedNoteIds: updatedNoteIds,
    });
    setIsNoteModalOpen(false);
    setNoteSearchQuery('');
  };

  // Unlink Markdown Note Handler
  const handleUnlinkNote = async (noteId: string) => {
    if (!onSaveTicket) return;
    const updatedNoteIds = (ticket.linkedNoteIds || []).filter((id) => id !== noteId);
    await onSaveTicket({
      ...ticket,
      linkedNoteIds: updatedNoteIds,
    });
  };

  const checkIsFileNote = (n: NoteItem): boolean => {
    if (!n) return false;
    if (n.format === 'file') return true;
    const ext = ((n.filePath || n.title || '').split('.').pop() || '').toLowerCase();
    return ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
  };

  // Read & Preview Markdown Note Content or open File Viewer for attachments
  const handleOpenNotePreview = async (note: NoteItem) => {
    if (checkIsFileNote(note)) {
      if ((window as any).openFileViewer) {
        (window as any).openFileViewer(note.filePath);
        return;
      }
    }

    setPreviewNote(note);
    setLoadingNote(true);
    try {
      if (window.electronAPI && window.electronAPI.readNoteContent) {
        const text = await window.electronAPI.readNoteContent(note.filePath);
        setPreviewContent(text);
      } else {
        setPreviewContent('# Conteúdo da Anotação\n\nModo de demonstração web.');
      }
    } catch (err) {
      setPreviewContent('Não foi possível carregar o arquivo da anotação.');
    } finally {
      setLoadingNote(false);
    }
  };

  const getTicketJiraUrl = (): string | null => {
    if (ticket.source !== 'JIRA' || !ticket.key) return null;
    const instances = jiraInstances || [];
    const instance = instances.find((i) => i.id === ticket.jiraInstanceId);
    if (!instance || !instance.domain) return null;
    let domain = instance.domain.trim();
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = 'https://' + domain;
    }
    domain = domain.replace(/\/+$/, '');
    return `${domain}/browse/${ticket.key}`;
  };

  const jiraUrl = getTicketJiraUrl();

  const handleOpenBrowser = (url: string) => {
    if (window.electronAPI && window.electronAPI.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const formatJiraDate = (isoString?: string) => {
    if (!isoString) return 'August 11, 2026 at 09:00 AM';
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) +
        ' at ' +
        d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      );
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={styles.overlay}>
      <div className="modal-content" style={styles.jiraModalContainer} onClick={(e) => e.stopPropagation()}>
        {/* Top Header Bar */}
        <div style={styles.topHeader}>
          <div style={styles.breadcrumbRow}>
            <div style={styles.ticketKeyBadge}>
              <CheckSquare size={14} color="#3b82f6" />
              <span>{ticket.key || 'TASK-1'}</span>
            </div>

            {jiraUrl && (
              <button
                type="button"
                style={styles.openInBrowserBtn}
                onClick={() => handleOpenBrowser(jiraUrl)}
                title="Abrir este ticket no navegador (Jira Cloud)"
              >
                <Link2 size={13} color="#38bdf8" />
                <span>Abrir no Navegador</span>
                <ExternalLink size={12} color="#38bdf8" />
              </button>
            )}

            {isJira ? <span style={styles.jiraSourceTag}>JIRA</span> : <span style={styles.localSourceTag}>LOCAL</span>}
          </div>

          <div style={styles.topHeaderActions}>
            {/* Reload / Sync Button with Jira API */}
            {isJira && (
              <button
                style={styles.headerIconButton}
                onClick={handleSync}
                disabled={loading}
                title="Recarregar dados atualizados via API do Jira"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} color="var(--accent-blue)" />
              </button>
            )}

            <button style={styles.headerIconButton} onClick={handleDelete} disabled={loading} title="Remover Ticket">
              <Trash2 size={16} color="var(--accent-rose)" />
            </button>
            <button style={styles.closeModalButton} onClick={onClose} title="Close (Esc)">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Split Content Area */}
        <div style={styles.mainSplitBody}>
          {/* Left Column (Main Content Area) */}
          <div style={styles.leftColumn}>
            {/* Ticket Title */}
            <h1 style={styles.issueTitle}>{ticket.title}</h1>

            {/* Description Section */}
            <div style={styles.contentSection}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={styles.sectionHeaderTitle}>Description</h3>
                {!isEditingDesc && (
                  <button
                    style={styles.inlineEditBtn}
                    onClick={() => {
                      setDescDraft(ticket.description || '');
                      setIsEditingDesc(true);
                    }}
                    title="Editar descrição"
                  >
                    <Edit2 size={12} /> Editar
                  </button>
                )}
              </div>

              <div style={styles.descriptionContainer}>
                {isEditingDesc ? (
                  <div style={styles.editDescBox}>
                    <textarea
                      style={styles.descTextarea}
                      value={descDraft}
                      onChange={(e) => setDescDraft(e.target.value)}
                      placeholder="Adicione uma descrição detalhada..."
                      rows={5}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => setIsEditingDesc(false)}
                      >
                        Cancelar
                      </button>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={handleSaveDescription}
                      >
                        <Check size={13} /> Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setDescDraft(ticket.description || '');
                      setIsEditingDesc(true);
                    }}
                    style={styles.clickableDescArea}
                    title="Clique para editar a descrição"
                  >
                    {ticket.description ? (
                      <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '14px', color: '#e2e8f0', margin: 0, userSelect: 'text', WebkitUserSelect: 'text' }}>
                        {ticket.description}
                      </p>
                    ) : (
                      <span style={styles.placeholderText}>Add a description...</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Linked Tickets Section */}
            <div style={styles.contentSection}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link2 size={16} color="var(--accent-blue)" />
                  <h3 style={styles.sectionHeaderTitle}>Linked Tickets ({linkedTickets.length})</h3>
                </div>
                <button
                  style={styles.inlineEditBtn}
                  onClick={() => setIsLinkModalOpen(true)}
                  title="Linkar ticket de outra instância ou local"
                >
                  <Plus size={13} /> Linkar Ticket
                </button>
              </div>

              <div style={styles.linkedTicketsContainer}>
                {linkedTickets.length > 0 ? (
                  linkedTickets.map((lt) => (
                    <div key={lt.id} style={styles.linkedTicketCard}>
                      <div
                        style={styles.linkedTicketClickableArea}
                        onClick={() => onOpenLinkedTicket && onOpenLinkedTicket(lt)}
                        title="Clique para abrir e visualizar este ticket linkado"
                      >
                        {lt.source === 'JIRA' ? (
                          <span style={styles.jiraSourceTag}>JIRA</span>
                        ) : (
                          <span style={styles.localSourceTag}>LOCAL</span>
                        )}
                        {lt.key && <span style={styles.tableKeyLink}>{lt.key}</span>}
                        <span style={styles.linkedTicketTitleText}>{lt.title}</span>
                        <span style={styles.statusPill}>{lt.statusLabel || lt.status}</span>
                      </div>

                      <button
                        style={styles.unlinkBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlinkTicket(lt.id);
                        }}
                        title="Desfazer vínculo com este ticket"
                      >
                        <Unlink size={13} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={styles.emptyLinkedBox}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Nenhum ticket linkado. Clique em <b>+ Linkar Ticket</b> para conectar tarefas de outros clientes ou projetos.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Attachments & Linked Notes Section */}
            <div style={styles.contentSection}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} color="#c084fc" />
                  <h3 style={styles.sectionHeaderTitle}>Anotações & Anexos ({linkedNotes.length})</h3>
                </div>
                <button
                  style={styles.inlineEditBtn}
                  onClick={() => setIsNoteModalOpen(true)}
                  title="Vincular anotação a este ticket"
                >
                  <Plus size={13} /> Vincular Nota
                </button>
              </div>

              <div
                style={styles.attachmentsCardBox}
                onClick={() => {
                  if (linkedNotes.length === 0) setIsNoteModalOpen(true);
                }}
              >
                {linkedNotes.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    {linkedNotes.map((note) => (
                      <div key={note.id} style={styles.linkedNoteCard}>
                        <div
                          style={styles.linkedTicketClickableArea}
                          onClick={() => handleOpenNotePreview(note)}
                          title="Clique para visualizar o conteúdo desta anotação"
                        >
                          <FileText size={15} color="#c084fc" />
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>
                            {note.title}
                          </span>
                        </div>
                        <button
                          style={styles.unlinkBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnlinkNote(note.id);
                          }}
                          title="Remover referência desta anotação"
                        >
                          <Unlink size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.attachmentsCardContent}>
                    <div style={styles.attachmentPlusIcon}>
                      <Plus size={14} color="#ffffff" />
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                      Clique para vincular suas <b>Anotações</b> a este ticket
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Comments Section */}
            <div style={styles.activitySection}>
              <div style={styles.activityHeaderRow}>
                <h3 style={styles.sectionHeaderTitle}>Comments ({sortedComments.length})</h3>
              </div>

              {/* Comment Input Box */}
              {onAddComment && (
                <form onSubmit={handleAddCommentSubmit} style={styles.commentFormBox}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={styles.userAvatarBox}>
                      <User size={16} color="#ffffff" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <textarea
                        style={{
                          ...styles.commentTextarea,
                          height: isCommentFocused ? '100px' : '44px',
                        }}
                        placeholder="Add a comment... (Pressione Ctrl + Enter para enviar)"
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        onFocus={() => setIsCommentFocused(true)}
                        onKeyDown={handleCommentKeyDown}
                        rows={isCommentFocused ? 4 : 2}
                      />

                      {/* Quick Comment Response Chips */}
                      {!isCommentFocused && (
                        <div style={styles.quickChipsRow}>
                          <button
                            type="button"
                            style={styles.chipBtn}
                            onClick={() => insertQuickChipText('Can I get more info...?')}
                          >
                            Can I get more info...?
                          </button>
                          <button
                            type="button"
                            style={styles.chipBtn}
                            onClick={() => insertQuickChipText('Status update...')}
                          >
                            Status update...
                          </button>
                          <button
                            type="button"
                            style={styles.chipBtn}
                            onClick={() => insertQuickChipText('Thanks...')}
                          >
                            Thanks...
                          </button>
                        </div>
                      )}

                      {/* Send Button & Shortcut Hint */}
                      <div style={styles.commentActionRow}>
                        <span style={styles.proTipText}>Pro tip: press <b>Ctrl + Enter</b> to comment</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {isCommentFocused && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                              onClick={() => {
                                setIsCommentFocused(false);
                              }}
                            >
                              Minimizar
                            </button>
                          )}
                          <button
                            type="submit"
                            className="btn btn-primary"
                            style={styles.sendCommentBtn}
                            disabled={!newCommentText.trim()}
                          >
                            <Send size={13} /> Comment
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}

              {/* Rendered Comments List */}
              <div style={styles.commentsListContainer}>
                {sortedComments.length > 0 ? (
                  sortedComments.map((c) => (
                    <div key={c.id} style={styles.jiraCommentCard}>
                      <div style={styles.jiraCommentHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={styles.commentAvatarMini}>
                            {c.author ? c.author.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span style={styles.jiraCommentAuthor}>{c.author}</span>
                          {c.isLocal || (c.id && String(c.id).startsWith('comm_')) ? (
                            <span style={styles.localCommentBadge} title="Comentário feito localmente no App">LOCAL</span>
                          ) : (
                            <span style={styles.jiraCommentBadge} title="Comentário sincronizado da API do Jira Cloud">JIRA</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={styles.jiraCommentTime}>
                            {new Date(c.created).toLocaleString('pt-BR')}
                          </span>
                          <button
                            type="button"
                            style={styles.copyCommentBtn}
                            onClick={() => handleCopyComment(c.id, c.body)}
                            title="Copiar texto do comentário"
                          >
                            {copiedCommentId === c.id ? (
                              <>
                                <Check size={12} color="#10b981" />
                                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '600' }}>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span style={{ fontSize: '11px' }}>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <p style={styles.jiraCommentBody}>{c.body}</p>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '8px 0' }}>
                    No comments recorded yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Vertical Separator Bar */}
          <div style={styles.verticalDivider} />

          {/* Right Column (Sidebar Details Metadata) */}
          <div style={styles.rightSidebarColumn}>
            {/* Status Dropdown */}
            <div style={styles.sidebarTopRow}>
              <select
                className="input-field"
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                style={styles.statusDropdownSelect}
              >
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="NEXT">Fazer em Seguida</option>
                <option value="TO_DO">A Fazer</option>
                <option value="WAITING_CLIENT">Aguardando Cliente</option>
                <option value="BACKLOG">Backlog</option>
                <option value="DONE">Concluído</option>
              </select>
            </div>

            {/* Details Accordion Card */}
            <div style={styles.sidebarAccordionCard}>
              <div style={styles.accordionHeader} onClick={() => setIsDetailsOpen(!isDetailsOpen)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isDetailsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span style={styles.accordionTitle}>Details</span>
                </div>
                <Settings size={13} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
              </div>

              {isDetailsOpen && (
                <div style={styles.detailsContentGrid}>
                  {/* Assignee Field */}
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Assignee</span>
                    {isEditingAssignee ? (
                      <input
                        type="text"
                        className="input-field"
                        value={assigneeDraft}
                        onChange={(e) => setAssigneeDraft(e.target.value)}
                        onBlur={() => {
                          handleSaveField({ assignee: assigneeDraft.trim() || 'Eu' });
                          setIsEditingAssignee(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveField({ assignee: assigneeDraft.trim() || 'Eu' });
                            setIsEditingAssignee(false);
                          }
                        }}
                        style={{ padding: '2px 6px', fontSize: '12px', width: '140px' }}
                        autoFocus
                      />
                    ) : (
                      <div
                        style={{ ...styles.detailValueUser, cursor: 'pointer' }}
                        onClick={() => {
                          setAssigneeDraft(ticket.assignee || 'Eu');
                          setIsEditingAssignee(true);
                        }}
                        title="Clique para editar o Responsável"
                      >
                        <div style={styles.userAvatarCircle}>
                          {ticket.assignee ? ticket.assignee.charAt(0).toUpperCase() : 'E'}
                        </div>
                        <span>{ticket.assignee || 'Eu'}</span>
                      </div>
                    )}
                  </div>

                  {/* Priority Field */}
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Priority</span>
                    <select
                      className="input-field"
                      value={ticket.priority || 'Normal'}
                      onChange={(e) => handleSaveField({ priority: e.target.value })}
                      style={{ padding: '2px 6px', fontSize: '12px', width: 'auto' }}
                    >
                      <option value="Baixa">Baixa</option>
                      <option value="Normal">Normal</option>
                      <option value="Alta">Alta</option>
                      <option value="Urgente">Urgente</option>
                    </select>
                  </div>

                  {/* Start Date Field */}
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Start date</span>
                    <input
                      type="date"
                      className="input-field"
                      value={ticket.startDate || ''}
                      onChange={(e) => handleSaveField({ startDate: e.target.value })}
                      style={{ padding: '2px 6px', fontSize: '12px', width: '135px' }}
                    />
                  </div>

                  {/* Due Date Field */}
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Due date</span>
                    <input
                      type="date"
                      className="input-field"
                      value={ticket.dueDate || ''}
                      onChange={(e) => handleSaveField({ dueDate: e.target.value })}
                      style={{ padding: '2px 6px', fontSize: '12px', width: '135px' }}
                    />
                  </div>

                  {/* Labels Field */}
                  <div style={{ ...styles.detailRow, alignItems: 'flex-start' }}>
                    <span style={styles.detailLabel}>Labels</span>
                    <div style={{ flex: 1, display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {ticket.labels && ticket.labels.length > 0
                        ? ticket.labels.map((l) => (
                            <span key={l} style={styles.jiraLabelChip}>
                              {l}
                              <button
                                style={styles.removeLabelBtn}
                                onClick={() => handleRemoveLabel(l)}
                                title="Remover label"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        : !isAddingLabel && <span style={styles.detailValueNone}>None</span>}

                      {isAddingLabel ? (
                        <form onSubmit={handleAddLabelSubmit} style={{ display: 'inline-flex' }}>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Nova Label"
                            value={newLabelText}
                            onChange={(e) => setNewLabelText(e.target.value)}
                            onBlur={() => setIsAddingLabel(false)}
                            style={{ padding: '2px 6px', fontSize: '11px', width: '80px' }}
                            autoFocus
                          />
                        </form>
                      ) : (
                        <button
                          style={styles.addLabelBtn}
                          onClick={() => setIsAddingLabel(true)}
                          title="Adicionar Label"
                        >
                          + Label
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Reporter Field */}
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Reporter</span>
                    {isEditingReporter ? (
                      <input
                        type="text"
                        className="input-field"
                        value={reporterDraft}
                        onChange={(e) => setReporterDraft(e.target.value)}
                        onBlur={() => {
                          handleSaveField({ reporter: reporterDraft.trim() || 'Eu' });
                          setIsEditingReporter(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveField({ reporter: reporterDraft.trim() || 'Eu' });
                            setIsEditingReporter(false);
                          }
                        }}
                        style={{ padding: '2px 6px', fontSize: '12px', width: '140px' }}
                        autoFocus
                      />
                    ) : (
                      <div
                        style={{ ...styles.detailValueUser, cursor: 'pointer' }}
                        onClick={() => {
                          setReporterDraft(ticket.reporter || 'Eu');
                          setIsEditingReporter(true);
                        }}
                        title="Clique para editar o Relator"
                      >
                        <div style={styles.userAvatarCircle}>
                          {ticket.reporter ? ticket.reporter.charAt(0).toUpperCase() : 'E'}
                        </div>
                        <span>{ticket.reporter || 'Eu'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Timestamps Info */}
            <div style={styles.sidebarFooterTimestamps}>
              <div>
                <span>Created {formatJiraDate(ticket.createdAt)}</span>
                <br />
                <span>Updated {formatJiraDate(ticket.updatedAt)}</span>
              </div>
              <button style={styles.configureFooterBtn}>
                <Settings size={12} /> Configure
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Link Ticket Picker Modal Dialog */}
      {isLinkModalOpen && (
        <div style={styles.pickerOverlay} onClick={() => setIsLinkModalOpen(false)}>
          <div style={styles.pickerModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.pickerHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link2 size={18} color="#3b82f6" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                  Linkar Ticket de Outra Instância ou Local
                </h3>
              </div>
              <button className="btn-icon" onClick={() => setIsLinkModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Pesquisar ticket por chave (ex: PROJETOTI-395) ou título..."
                  value={linkSearchQuery}
                  onChange={(e) => setLinkSearchQuery(e.target.value)}
                  autoFocus
                  style={{ paddingLeft: '38px', fontSize: '13px' }}
                />
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              </div>

              <div style={styles.pickerListScroll}>
                {candidateTickets.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Nenhum ticket disponível para vínculo com essa busca.
                  </div>
                ) : (
                  candidateTickets.map((cand) => (
                    <div
                      key={cand.id}
                      style={styles.pickerItemRow}
                      onClick={() => handleLinkTicket(cand.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {cand.source === 'JIRA' ? (
                          <span style={styles.jiraSourceTag}>JIRA</span>
                        ) : (
                          <span style={styles.localSourceTag}>LOCAL</span>
                        )}
                        {cand.key && <span style={styles.tableKeyLink}>{cand.key}</span>}
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>{cand.title}</span>
                      </div>
                      <button className="btn btn-primary" style={{ padding: '3px 10px', fontSize: '11px' }}>
                        Linkar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Markdown Note Picker Modal Dialog */}
      {isNoteModalOpen && (
        <div style={styles.pickerOverlay} onClick={() => setIsNoteModalOpen(false)}>
          <div style={styles.pickerModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.pickerHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCode size={18} color="#c084fc" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                  Vincular Anotação ao Ticket
                </h3>
              </div>
              <button className="btn-icon" onClick={() => setIsNoteModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Pesquisar anotação por título..."
                  value={noteSearchQuery}
                  onChange={(e) => setNoteSearchQuery(e.target.value)}
                  autoFocus
                  style={{ paddingLeft: '38px', fontSize: '13px' }}
                />
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              </div>

              <div style={styles.pickerListScroll}>
                {candidateNotes.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Nenhuma anotação Markdown encontrada no seu Bloco de Notas.
                  </div>
                ) : (
                  candidateNotes.map((note) => (
                    <div
                      key={note.id}
                      style={styles.pickerItemRow}
                      onClick={() => handleLinkNote(note.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={16} color="#c084fc" />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>{note.title}</span>
                      </div>
                      <button className="btn btn-primary" style={{ padding: '3px 10px', fontSize: '11px', backgroundColor: '#8b5cf6' }}>
                        Vincular
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note Content Reader Modal Popup */}
      {previewNote && (
        <div style={styles.pickerOverlay} onClick={() => setPreviewNote(null)}>
          <div style={{ ...styles.pickerModal, width: '860px', height: '80vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.pickerHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={18} color="#c084fc" />
                <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                  {previewNote.title}
                </h3>
              </div>
              <button className="btn-icon" onClick={() => setPreviewNote(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>
              {loadingNote ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                  Carregando arquivo da anotação...
                </div>
              ) : (
                <div
                  className="markdown-body"
                  style={styles.markdownRenderer}
                  dangerouslySetInnerHTML={{ __html: marked.parse(previewContent || '') as string }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(6px)',
  },
  jiraModalContainer: {
    width: '1280px',
    maxWidth: '96vw',
    height: '860px',
    maxHeight: '95vh',
    backgroundColor: '#1b1b22',
    color: '#e2e8f0',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  topHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  breadcrumbRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
  },
  ticketKeyBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: '700',
    color: '#38bdf8',
  },
  openInBrowserBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '6px',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    marginLeft: '4px',
    marginRight: '4px',
  },
  jiraSourceTag: {
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    color: '#38bdf8',
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid rgba(56, 189, 248, 0.3)',
  },
  localSourceTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    color: '#c084fc',
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid rgba(192, 132, 252, 0.3)',
  },
  topHeaderActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerIconButton: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalButton: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainSplitBody: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  leftColumn: {
    flex: 1,
    padding: '24px 28px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '22px',
  },
  verticalDivider: {
    width: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    flexShrink: 0,
  },
  rightSidebarColumn: {
    width: '360px',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    padding: '20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
  },
  issueTitle: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: '1.3',
    margin: 0,
  },
  contentSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionHeaderTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
  },
  inlineEditBtn: {
    fontSize: '12px',
    color: 'var(--accent-blue)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontWeight: '600',
  },
  descriptionContainer: {
    minHeight: '40px',
    userSelect: 'text',
    WebkitUserSelect: 'text',
  },
  clickableDescArea: {
    padding: '8px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'text',
    WebkitUserSelect: 'text',
  },
  editDescBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  descTextarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(59, 130, 246, 0.4)',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: '1.5',
  },
  placeholderText: {
    color: 'var(--text-muted)',
    fontSize: '14px',
    cursor: 'pointer',
  },
  linkedTicketsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  linkedTicketCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    transition: 'all 0.15s ease',
  },
  linkedNoteCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    transition: 'all 0.15s ease',
  },
  linkedTicketClickableArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    cursor: 'pointer',
  },
  linkedTicketTitleText: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#ffffff',
  },
  tableKeyLink: {
    color: '#38bdf8',
    fontWeight: '700',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '13px',
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    padding: '3px 10px',
    borderRadius: '6px',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '90px',
    textAlign: 'center',
  },
  statusPill: {
    fontSize: '11px',
    fontWeight: '700',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  unlinkBtn: {
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  emptyLinkedBox: {
    padding: '12px 14px',
    borderRadius: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    border: '1px dashed rgba(255, 255, 255, 0.1)',
  },
  pickerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerModal: {
    width: '540px',
    maxWidth: '90vw',
    backgroundColor: '#1b1b22',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
    overflow: 'hidden',
  },
  pickerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  pickerListScroll: {
    maxHeight: '300px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  pickerItemRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    cursor: 'pointer',
  },
  attachmentsCardBox: {
    border: '1px dashed rgba(255, 255, 255, 0.18)',
    borderRadius: '12px',
    padding: '16px',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  attachmentsCardContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  attachmentPlusIcon: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    backgroundColor: '#8b5cf6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activitySection: {
    marginTop: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  activityHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '8px',
  },
  commentFormBox: {
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '12px',
    padding: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  userAvatarBox: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  commentTextarea: {
    width: '100%',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#ffffff',
    outline: 'none',
    fontSize: '13px',
    resize: 'none',
    fontFamily: 'inherit',
    transition: 'height 0.2s ease',
  },
  quickChipsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '10px',
    flexWrap: 'wrap',
  },
  chipBtn: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    color: 'var(--text-secondary)',
    fontSize: '11px',
    cursor: 'pointer',
  },
  commentActionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '10px',
  },
  sendCommentBtn: {
    padding: '4px 12px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  proTipText: {
    display: 'block',
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  commentsListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '8px',
    userSelect: 'text',
    WebkitUserSelect: 'text',
  },
  jiraCommentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '10px',
    padding: '12px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    userSelect: 'text',
    WebkitUserSelect: 'text',
  },
  jiraCommentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  commentAvatarMini: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jiraCommentAuthor: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#ffffff',
  },
  localCommentBadge: {
    fontSize: '10px',
    fontWeight: '800',
    color: '#c084fc',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    border: '1px solid rgba(192, 132, 252, 0.35)',
    padding: '1px 6px',
    borderRadius: '4px',
    letterSpacing: '0.04em',
  },
  jiraCommentBadge: {
    fontSize: '10px',
    fontWeight: '800',
    color: '#38bdf8',
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    border: '1px solid rgba(56, 189, 248, 0.35)',
    padding: '1px 6px',
    borderRadius: '4px',
    letterSpacing: '0.04em',
  },
  jiraCommentTime: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  copyCommentBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  jiraCommentBody: {
    fontSize: '13px',
    color: '#cbd5e1',
    lineHeight: '1.5',
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    userSelect: 'text',
    WebkitUserSelect: 'text',
  },
  sidebarTopRow: {
    display: 'flex',
    alignItems: 'center',
  },
  statusDropdownSelect: {
    width: '100%',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    color: '#60a5fa',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    cursor: 'pointer',
  },
  sidebarAccordionCard: {
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  accordionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  accordionTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#ffffff',
  },
  detailsContentGrid: {
    padding: '0 14px 14px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13px',
  },
  detailLabel: {
    color: 'var(--text-muted)',
    width: '90px',
    flexShrink: 0,
  },
  detailValueUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
    color: '#ffffff',
  },
  userAvatarCircle: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: '#0284c7',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailValueNone: {
    color: 'var(--text-muted)',
  },
  jiraLabelChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#e2e8f0',
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  removeLabelBtn: {
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '12px',
    padding: 0,
    lineHeight: 1,
  },
  addLabelBtn: {
    border: '1px dashed rgba(255, 255, 255, 0.2)',
    backgroundColor: 'transparent',
    color: 'var(--accent-blue)',
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  sidebarFooterTimestamps: {
    marginTop: 'auto',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  configureFooterBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '11px',
    cursor: 'pointer',
  },
  markdownRenderer: {
    fontSize: '14px',
    lineHeight: '1.75',
    color: '#e2e8f0',
    userSelect: 'text',
    WebkitUserSelect: 'text',
  } as React.CSSProperties,
};
