import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import type { NoteItem } from '../../types/index';
import { RichTextEditor } from './RichTextEditor';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  X,
  Sparkles,
  GripVertical,
  RefreshCw,
  Download,
} from 'lucide-react';

// ─── Error Boundary ──────────────────────────────────────────────────────────

class NoteErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  public state = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[NoteErrorBoundary Caught Error]:', error, info);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ flex: 1, padding: '40px', textAlign: 'center', color: '#ffffff', overflowY: 'auto' }}>
          <Sparkles size={48} color="var(--accent-primary)" />
          <h2 style={{ marginTop: '16px', fontSize: '20px' }}>Ocorreu uma instabilidade no Editor</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '12px 0 16px', fontSize: '14px' }}>
            Clique abaixo para restaurar o editor com segurança.
          </p>

          {this.state.error && (
            <div style={{
              maxWidth: '600px',
              margin: '0 auto 20px',
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              textAlign: 'left',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#fca5a5',
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap'
            }}>
              <strong>Detalhes do Erro:</strong>
              <br />
              {String(this.state.error?.message || this.state.error)}
              {this.state.error?.stack && (
                <div style={{ marginTop: '8px', opacity: 0.8, fontSize: '11px' }}>
                  {String(this.state.error.stack).slice(0, 300)}
                </div>
              )}
            </div>
          )}

          <button className="btn btn-primary" onClick={() => this.setState({ hasError: false, error: null })}>
            <RefreshCw size={16} /> Recarregar Editor
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface NoteEditorProps {
  notes: NoteItem[];
  onCreateNote: (title: string) => Promise<NoteItem>;
  onCreateRichNote?: (title: string) => Promise<NoteItem>;
  onReadContent: (filePath: string) => Promise<string>;
  onSaveContent: (filePath: string, title: string, content: string) => Promise<NoteItem>;
  onDeleteNote: (id: string) => Promise<void>;
  onExportTxt: (content: string, defaultFileName: string) => Promise<boolean>;
  onReorderNotes?: (reordered: NoteItem[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const NoteEditorComponent: React.FC<NoteEditorProps> = ({
  notes,
  onCreateRichNote,
  onCreateNote,
  onReadContent,
  onSaveContent,
  onDeleteNote,
  onExportTxt,
  onReorderNotes,
}) => {
  const [activeNote, setActiveNote] = useState<NoteItem | null>(notes.length > 0 ? notes[0] : null);
  const [content, setContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState('Salvo');
  const [isExporting, setIsExporting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalTitleInput, setModalTitleInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Guards against cross-note state contamination during async loading & auto-saving
  const isLoadedRef = useRef<boolean>(false);
  const activeNoteRef = useRef<NoteItem | null>(null);
  activeNoteRef.current = activeNote;

  useEffect(() => {
    if (notes.length > 0 && !activeNote) setActiveNote(notes[0]);
  }, [notes]);

  // Load content when active note changes (with cancellation check)
  useEffect(() => {
    let isCancelled = false;

    if (activeNote) {
      isLoadedRef.current = false;
      setNoteTitle(activeNote.title);
      setSaveStatus('Carregando...');

      onReadContent(activeNote.filePath).then((text) => {
        if (!isCancelled && activeNoteRef.current?.id === activeNote.id) {
          setContent(text || '');
          setSaveStatus('Salvo');
          isLoadedRef.current = true;
        }
      });
    } else {
      isLoadedRef.current = false;
      setContent('');
      setNoteTitle('');
      setSaveStatus('Salvo');
    }

    return () => {
      isCancelled = true;
    };
  }, [activeNote?.id, activeNote?.filePath]);

  // Auto-save debounce (runs ONLY when isLoadedRef.current is true for current active note)
  useEffect(() => {
    if (!activeNote || !isLoadedRef.current) return;

    setSaveStatus('Salvando...');
    const currentNoteId = activeNote.id;
    const currentFilePath = activeNote.filePath;
    const currentTitle = noteTitle;
    const currentContent = content;

    const timer = setTimeout(async () => {
      try {
        // Double check we are still on the exact same note
        if (activeNoteRef.current?.id !== currentNoteId) return;

        await onSaveContent(currentFilePath, currentTitle, currentContent);
        if (activeNoteRef.current?.id === currentNoteId) {
          setSaveStatus('Salvo');
        }
      } catch {
        setSaveStatus('Erro ao salvar');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [content, noteTitle]);

  const handleOpenCreateModal = () => {
    setModalTitleInput(`Anotação ${notes.length + 1}`);
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    const title = modalTitleInput.trim() || `Anotação ${notes.length + 1}`;
    try {
      setIsCreating(true);
      isLoadedRef.current = false;
      const newNote = onCreateRichNote ? await onCreateRichNote(title) : await onCreateNote(title);
      setActiveNote(newNote);
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Erro ao criar nota:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!activeNote) return;
    if (confirm(`Deseja excluir a anotação "${activeNote.title}"?`)) {
      await onDeleteNote(activeNote.id);
      setActiveNote(null);
    }
  };

  const handleExport = async () => {
    if (!content) return;
    try {
      setIsExporting(true);
      const plain = content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      await onExportTxt(plain, noteTitle || 'anotacao');
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    const reordered = [...notes];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    if (onReorderNotes) onReorderNotes(reordered);
    setDraggedIndex(null);
  };

  return (
    <div style={styles.container}>
      {/* ── Sidebar ── */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={styles.sidebarTitle}>
            <FileText size={16} color="var(--accent-primary)" /> Anotações
          </span>
          <button
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
            onClick={handleOpenCreateModal}
            title="Nova anotação"
          >
            <Plus size={14} /> Nova
          </button>
        </div>

        <div style={styles.noteList}>
          {notes.length === 0 ? (
            <div style={styles.emptyList}>
              <FileText size={32} color="var(--text-muted)" />
              <p style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                Nenhuma anotação ainda.<br />Clique em "Nova" para começar.
              </p>
            </div>
          ) : (
            notes.map((n, idx) => (
              <div
                key={n.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, idx)}
                onClick={() => setActiveNote(n)}
                style={{
                  ...styles.noteCard,
                  ...(activeNote?.id === n.id ? styles.activeNoteCard : {}),
                  ...(draggedIndex === idx ? { opacity: 0.4 } : {}),
                }}
                title="Clique e arraste para reordenar"
              >
                <GripVertical size={14} color="var(--text-muted)" style={{ cursor: 'grab', flexShrink: 0 }} />
                <FileText size={15} color={activeNote?.id === n.id ? '#ffffff' : 'var(--text-secondary)'} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={styles.noteTitle}>{n.title}</div>
                  <div style={styles.noteDate}>{new Date(n.updatedAt).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Main area ── */}
      {activeNote ? (
        <div style={styles.editorArea}>
          {/* Top bar */}
          <div style={styles.topBar}>
            <input
              type="text"
              className="input-field"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              style={styles.titleInput}
              placeholder="Título da Anotação..."
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <span style={styles.saveBadge}>
                <Save size={12} /> {saveStatus}
              </span>
              <button
                className="btn btn-secondary"
                onClick={handleExport}
                disabled={isExporting}
                title="Exportar como .txt"
                style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
              >
                <Download size={14} /> Exportar .txt
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                title="Excluir anotação"
                style={{ padding: '6px 10px' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Rich Text Editor */}
          <div style={styles.editorWrapper}>
            <RichTextEditor
              key={activeNote.id}
              content={content}
              onChange={(html) => setContent(html)}
            />
          </div>
        </div>
      ) : (
        <div style={styles.noNoteSelected}>
          <Sparkles size={56} color="var(--accent-primary)" />
          <h2 style={{ marginTop: '16px', color: '#ffffff', fontSize: '20px', fontWeight: '800' }}>
            Nenhuma Anotação Selecionada
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '14px' }}>
            Selecione uma anotação na barra lateral ou crie uma nova.
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '24px', gap: '8px' }}
            onClick={handleOpenCreateModal}
          >
            <Plus size={16} /> Criar Nova Anotação
          </button>
        </div>
      )}

      {/* ── Create modal ── */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <FileText size={18} color="var(--accent-primary)" /> Nova Anotação
              </h3>
              <button className="btn-icon" onClick={() => setIsCreateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={styles.modalLabel}>Título:</label>
                <input
                  type="text"
                  className="input-field"
                  value={modalTitleInput}
                  onChange={(e) => setModalTitleInput(e.target.value)}
                  placeholder="Ex: Anotações da Reunião, Documentação..."
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreating}>
                  <Plus size={16} />
                  {isCreating ? 'Criando...' : 'Criar Anotação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Export with ErrorBoundary ────────────────────────────────────────────────

export const NoteEditor: React.FC<NoteEditorProps> = (props) => (
  <NoteErrorBoundary>
    <NoteEditorComponent {...props} />
  </NoteErrorBoundary>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flex: 1, height: '100%', overflow: 'hidden' },
  sidebar: {
    width: '260px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    gap: '14px',
    flexShrink: 0,
  },
  sidebarHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  sidebarTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '700', color: '#ffffff' },
  noteList: { display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1 },
  emptyList: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '40px' },
  noteCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'all 0.15s ease',
    backgroundColor: 'transparent',
  },
  activeNoteCard: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    border: '1px solid rgba(99,102,241,0.35)',
  },
  noteTitle: { fontSize: '13px', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  noteDate: { fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' },
  editorArea: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: 'rgba(0,0,0,0.15)',
    flexShrink: 0,
  },
  titleInput: {
    flex: 1,
    fontSize: '16px',
    fontWeight: '700',
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#ffffff',
    padding: '0',
  },
  saveBadge: { display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' },
  editorWrapper: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  noNoteSelected: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '700', color: '#ffffff', margin: 0 },
  modalLabel: { display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' },
};
