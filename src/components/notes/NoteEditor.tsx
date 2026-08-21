import React, { useState, useEffect, useRef, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import type { NoteItem, NoteFolder, ClientAsset } from '../../types/index';
import { RichTextEditor } from './RichTextEditor';
import { FileViewerModal } from '../common/FileViewerModal';
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
  Paperclip,
  Table,
  Image as ImageIcon,
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  FolderCheck,
  FolderRoot,
  MoreVertical,
  HardDrive,
  Edit2,
  Archive,
  ArchiveRestore,
  PanelLeftClose,
  PanelLeftOpen,
  Printer,
  FileCode,
  Check,
  Briefcase,
  Building2,
  Link2,
  Search,
  ExternalLink,
  Unlink,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Eye,
  EyeOff,
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
  folders?: NoteFolder[];
  clients?: ClientAsset[];
  onCreateNote: (title: string, folderId?: string) => Promise<NoteItem>;
  onCreateRichNote?: (title: string, folderId?: string) => Promise<NoteItem>;
  onSaveFileNote?: (fileData: { title: string; fileName: string; mimeType: string; base64: string; size: number; folderId?: string }) => Promise<NoteItem>;
  onReadContent: (filePath: string) => Promise<string>;
  onSaveContent: (filePath: string, title: string, content: string) => Promise<NoteItem>;
  onDeleteNote: (id: string) => Promise<void>;
  onExportTxt: (content: string, defaultFileName: string) => Promise<boolean>;
  onReorderNotes?: (reordered: NoteItem[]) => void;
  onReorderFolders?: (reordered: NoteFolder[]) => void;
  onSaveFolder?: (folder: Partial<NoteFolder> & { name: string }) => Promise<NoteFolder>;
  onDeleteFolder?: (id: string, deleteContents?: boolean) => Promise<void>;
  onUpdateNoteMeta?: (note: Partial<NoteItem> & { id: string }) => Promise<NoteItem>;
  onSaveClient?: (client: Partial<ClientAsset> & { name: string }) => Promise<any>;
  onNavigateToClient?: (clientId: string) => void;
  targetNoteId?: string | null;
  onClearTargetNote?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const NoteEditorComponent: React.FC<NoteEditorProps> = ({
  notes,
  folders = [],
  clients = [],
  targetNoteId,
  onClearTargetNote,
  onCreateRichNote,
  onCreateNote,
  onSaveFileNote,
  onReadContent,
  onSaveContent,
  onDeleteNote,
  onExportTxt,
  onReorderNotes,
  onReorderFolders,
  onSaveFolder,
  onDeleteFolder,
  onUpdateNoteMeta,
  onSaveClient,
  onNavigateToClient,
}) => {
  const [activeNote, setActiveNote] = useState<NoteItem | null>(notes.length > 0 ? notes[0] : null);
  const [content, setContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState('Salvo');
  const [isExporting, setIsExporting] = useState(false);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const draggedFolderIdRef = useRef<string | null>(null);
  const draggedNoteIdRef = useRef<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverClientId, setDragOverClientId] = useState<string | null>(null);

  // Visible Clients Filter in Notes Sidebar
  const [visibleClientIds, setVisibleClientIds] = useState<string[] | null>(() => {
    try {
      const saved = localStorage.getItem('simplify_notes_visible_client_ids');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isManageVisibleClientsModalOpen, setIsManageVisibleClientsModalOpen] = useState(false);
  const [tempVisibleClientIds, setTempVisibleClientIds] = useState<string[]>([]);
  const [manageClientsSearch, setManageClientsSearch] = useState('');

  const displayedClients = useMemo(() => {
    if (visibleClientIds === null) {
      return clients;
    }
    return clients.filter((c) => visibleClientIds.includes(c.id));
  }, [clients, visibleClientIds]);

  const handleOpenManageVisibleClients = () => {
    const currentSelected = visibleClientIds !== null ? visibleClientIds : clients.map((c) => c.id);
    setTempVisibleClientIds(currentSelected);
    setManageClientsSearch('');
    setIsManageVisibleClientsModalOpen(true);
  };

  const handleToggleVisibleClientInModal = (clientId: string) => {
    setTempVisibleClientIds((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    );
  };

  const handleSelectAllVisibleClientsInModal = (filteredIds: string[]) => {
    setTempVisibleClientIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleClearAllVisibleClientsInModal = (filteredIds: string[]) => {
    setTempVisibleClientIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
  };

  const handleSaveVisibleClientsModal = () => {
    setVisibleClientIds(tempVisibleClientIds);
    try {
      localStorage.setItem('simplify_notes_visible_client_ids', JSON.stringify(tempVisibleClientIds));
    } catch (e) {
      console.error('Erro ao salvar simplify_notes_visible_client_ids:', e);
    }
    setIsManageVisibleClientsModalOpen(false);
  };

  const handleHideClientFromNotes = (clientId: string) => {
    const current = visibleClientIds !== null ? visibleClientIds : clients.map((c) => c.id);
    const updated = current.filter((id) => id !== clientId);
    setVisibleClientIds(updated);
    try {
      localStorage.setItem('simplify_notes_visible_client_ids', JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao salvar simplify_notes_visible_client_ids:', e);
    }
    setOpenMenuId(null);
  };

  // Client Links Modal
  const [clientToManageLinks, setClientToManageLinks] = useState<ClientAsset | null>(null);
  const [clientLinksSearchQuery, setClientLinksSearchQuery] = useState('');
  const [clientLinksActiveTab, setClientLinksActiveTab] = useState<'folders' | 'notes'>('folders');

  // Context Menu State (3-Dots dropdown)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Sidebar & Folder State (Pastas fechadas por padrão)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [noteToExport, setNoteToExport] = useState<NoteItem | null>(null);

  // Note Creation Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalTitleInput, setModalTitleInput] = useState('');
  const [modalTargetFolderId, setModalTargetFolderId] = useState<string>('');
  const [modalTargetClientId, setModalTargetClientId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Folder Creation / Editing Modal
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<NoteFolder | null>(null);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [folderColorInput, setFolderColorInput] = useState('#6366f1');
  const [folderParentIdInput, setFolderParentIdInput] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<NoteFolder | null>(null);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);

  const isFileNote = (n: NoteItem | null | undefined): boolean => {
    if (!n) return false;
    if (n.format === 'file') return true;
    const ext = ((n.filePath || n.title || '').split('.').pop() || '').toLowerCase();
    return ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
  };

  const getFormattedNoteSize = (note: NoteItem | null, noteContent: string): string => {
    if (!note) return '0 B';
    let bytes = 0;
    if (note.fileSize && note.fileSize > 0) {
      bytes = note.fileSize;
    } else if (note.format === 'file' && note.fileDataB64) {
      bytes = Math.round((note.fileDataB64.length * 3) / 4);
    } else {
      bytes = new Blob([noteContent || '']).size;
    }

    if (bytes > 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (bytes > 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  };

  // Close context menus when clicking anywhere outside
  useEffect(() => {
    const handleGlobalClick = () => {
      setOpenMenuId(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Guards against cross-note state contamination during async loading & auto-saving
  const isLoadedRef = useRef<boolean>(false);
  const isDirtyRef = useRef<boolean>(false);
  const activeNoteRef = useRef<NoteItem | null>(null);
  const contentRef = useRef<string>(content);
  const noteTitleRef = useRef<string>(noteTitle);

  contentRef.current = content;
  noteTitleRef.current = noteTitle;
  activeNoteRef.current = activeNote;

  const flushSave = async () => {
    if (!isDirtyRef.current || !activeNoteRef.current || isFileNote(activeNoteRef.current)) return;
    try {
      const noteToSave = activeNoteRef.current;
      const titleToSave = noteTitleRef.current;
      const contentToSave = contentRef.current;
      isDirtyRef.current = false;
      await onSaveContent(noteToSave.filePath, titleToSave, contentToSave);
      setSaveStatus('Salvo');
    } catch (err) {
      console.error('[NoteEditor flushSave error]:', err);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      flushSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (targetNoteId) {
      const found = notes.find((n) => n.id === targetNoteId);
      if (found) {
        setActiveNote(found);
        if (found.folderId && !expandedFolders.includes(found.folderId)) {
          setExpandedFolders((prev) => [...prev, found.folderId!]);
        }
        if (onClearTargetNote) onClearTargetNote();
        return;
      }
    }

    if (notes.length > 0 && !activeNote) {
      setActiveNote(notes[0]);
    } else if (activeNote) {
      // Sync active note reference if it was updated in parent state
      const found = notes.find((n) => n.id === activeNote.id);
      if (found && (found.folderId !== activeNote.folderId || found.title !== activeNote.title)) {
        setActiveNote(found);
      }
    }
  }, [targetNoteId, notes]);

  // Load content when active note changes (with cancellation check and pending flush)
  useEffect(() => {
    let isCancelled = false;

    // Flush any pending unsaved content from the previous note before switching
    flushSave();

    if (activeNote) {
      setNoteTitle(activeNote.title);

      if (isFileNote(activeNote)) {
        isLoadedRef.current = false;
        isDirtyRef.current = false;
        setContent('');
        setSaveStatus('Salvo');
        return;
      }

      isLoadedRef.current = false;
      isDirtyRef.current = false;
      setSaveStatus('Carregando...');

      onReadContent(activeNote.filePath).then((text) => {
        if (!isCancelled && activeNoteRef.current?.id === activeNote.id) {
          setContent(text || '');
          setSaveStatus('Salvo');
          isLoadedRef.current = true;
          isDirtyRef.current = false;
        }
      });
    } else {
      isLoadedRef.current = false;
      isDirtyRef.current = false;
      setContent('');
      setNoteTitle('');
      setSaveStatus('Salvo');
    }

    return () => {
      isCancelled = true;
      flushSave();
    };
  }, [activeNote?.id, activeNote?.filePath]);

  // Auto-save debounce (runs ONLY for text notes when isLoadedRef.current is true)
  useEffect(() => {
    if (!activeNote || !isLoadedRef.current || isFileNote(activeNote)) return;

    isDirtyRef.current = true;
    setSaveStatus('Salvando...');
    const currentNoteId = activeNote.id;
    const currentFilePath = activeNote.filePath;
    const currentTitle = noteTitle;
    const currentContent = content;

    const timer = setTimeout(async () => {
      try {
        if (activeNoteRef.current?.id !== currentNoteId) return;

        await onSaveContent(currentFilePath, currentTitle, currentContent);
        if (activeNoteRef.current?.id === currentNoteId) {
          isDirtyRef.current = false;
          setSaveStatus('Salvo');
        }
      } catch {
        setSaveStatus('Erro ao salvar');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [content, noteTitle]);

  const handleOpenCreateModal = (targetFolderId: string = '') => {
    setModalTitleInput(`Anotação ${notes.length + 1}`);
    setModalTargetFolderId(targetFolderId);
    setOpenMenuId(null);
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    const title = modalTitleInput.trim() || `Anotação ${notes.length + 1}`;
    try {
      setIsCreating(true);
      isLoadedRef.current = false;
      const targetFolder = modalTargetFolderId || undefined;
      const newNote = onCreateRichNote
        ? await onCreateRichNote(title, targetFolder)
        : await onCreateNote(title, targetFolder);

      setActiveNote(newNote);
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Erro ao criar nota:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenFolderModal = (parentId: string = '', clientId: string = '') => {
    setFolderToEdit(null);
    setFolderNameInput(`Nova Pasta ${folders.length + 1}`);
    setFolderColorInput('#6366f1');
    setFolderParentIdInput(clientId ? `client_${clientId}` : parentId);
    setOpenMenuId(null);
    setIsFolderModalOpen(true);
  };

  const handleOpenEditFolderModal = (folder: NoteFolder) => {
    setFolderToEdit(folder);
    setFolderNameInput(folder.name);
    setFolderColorInput(folder.color || '#6366f1');
    setFolderParentIdInput(folder.clientId ? `client_${folder.clientId}` : (folder.parentId || ''));
    setOpenMenuId(null);
    setIsFolderModalOpen(true);
  };

  const handleConfirmCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingFolder || !folderNameInput.trim()) return;
    try {
      setIsCreatingFolder(true);

      const isClientTarget = folderParentIdInput.startsWith('client_');
      const targetClientId = isClientTarget ? folderParentIdInput.replace('client_', '') : '';
      const targetParentId = !isClientTarget ? (folderParentIdInput || undefined) : undefined;

      const payload: Partial<NoteFolder> & { name: string } = {
        name: folderNameInput.trim(),
        color: folderColorInput,
        parentId: targetParentId,
        clientId: targetClientId || undefined,
      };

      if (folderToEdit) {
        payload.id = folderToEdit.id;
      }

      let savedFolder: NoteFolder | null = null;
      if (onSaveFolder) {
        savedFolder = await onSaveFolder(payload);
      }

      const folderId = savedFolder?.id || folderToEdit?.id;

      // Se associado a cliente, atualizar o client.linkedFolderIds
      if (targetClientId && folderId) {
        const targetClient = clients.find((c) => c.id === targetClientId);
        if (targetClient && onSaveClient) {
          const currentLinked = targetClient.linkedFolderIds || [];
          if (!currentLinked.includes(folderId)) {
            await onSaveClient({ ...targetClient, linkedFolderIds: [...currentLinked, folderId] });
          }
        }
        setExpandedFolders((prev) => ({ ...prev, [`client_${targetClientId}`]: true }));
      } else if (folderToEdit?.clientId && !targetClientId) {
        // Se foi desvinculado de um cliente anterior
        const prevClient = clients.find((c) => c.id === folderToEdit.clientId);
        if (prevClient && onSaveClient) {
          const currentLinked = prevClient.linkedFolderIds || [];
          await onSaveClient({
            ...prevClient,
            linkedFolderIds: currentLinked.filter((id) => id !== folderToEdit.id),
          });
        }
      }

      // Expand the parent folder so the new subfolder is visible
      if (targetParentId) {
        setExpandedFolders((prev) => ({ ...prev, [targetParentId]: true }));
      }

      setIsFolderModalOpen(false);
      setFolderToEdit(null);
      setFolderNameInput('');
      setFolderParentIdInput('');
    } catch (err) {
      console.error('Erro ao salvar pasta:', err);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolderAction = (e: React.MouseEvent, folder: NoteFolder) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setFolderToDelete(folder);
  };

  const handleConfirmDeleteFolder = async (deleteContents: boolean) => {
    if (!folderToDelete || isDeletingFolder) return;
    try {
      setIsDeletingFolder(true);
      if (onDeleteFolder) {
        await onDeleteFolder(folderToDelete.id, deleteContents);
      }
      setFolderToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir pasta:', err);
    } finally {
      setIsDeletingFolder(false);
    }
  };

  const getFolderStats = (folderId: string) => {
    const allChildFolderIds = new Set<string>([folderId]);
    const findChildren = (parentId: string) => {
      folders.filter((f) => f.parentId === parentId).forEach((child) => {
        allChildFolderIds.add(child.id);
        findChildren(child.id);
      });
    };
    findChildren(folderId);

    const directNotesCount = notes.filter((n) => n.folderId === folderId).length;
    const totalNotesCount = notes.filter((n) => n.folderId && allChildFolderIds.has(n.folderId)).length;
    const subFoldersCount = allChildFolderIds.size - 1;

    return { directNotesCount, totalNotesCount, subFoldersCount };
  };

  const handleDeleteNoteAction = async (e: React.MouseEvent, note: NoteItem) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (confirm(`Deseja excluir a anotação "${note.title}"?`)) {
      await onDeleteNote(note.id);
      if (activeNote?.id === note.id) {
        setActiveNote(null);
      }
    }
  };

  const handleChangeNoteFolder = async (folderId: string) => {
    if (!activeNote || !onUpdateNoteMeta) return;
    try {
      const updated = await onUpdateNoteMeta({
        id: activeNote.id,
        folderId: folderId || '',
      });
      setActiveNote(updated);
    } catch (err) {
      console.error('Erro ao mover nota de pasta:', err);
    }
  };

  const handleDelete = async () => {
    if (!activeNote) return;
    if (confirm(`Deseja excluir a anotação "${activeNote.title}"?`)) {
      await onDeleteNote(activeNote.id);
      setActiveNote(null);
    }
  };

  const handleToggleArchiveNote = async (targetNote?: NoteItem) => {
    const note = targetNote || activeNote;
    if (!note) return;
    try {
      const newArchived = !note.isArchived;
      const updated = { ...note, isArchived: newArchived };
      if (onUpdateNoteMeta) {
        await onUpdateNoteMeta(updated);
      } else if (window.electronAPI?.saveNoteMeta) {
        await window.electronAPI.saveNoteMeta(updated);
      }
      if (activeNote?.id === note.id) {
        setActiveNote(updated);
      }
    } catch (err) {
      console.error('Erro ao arquivar/desarquivar nota:', err);
    } finally {
      setOpenMenuId(null);
    }
  };

  const handleToggleArchiveFolder = async (folder: NoteFolder) => {
    try {
      const newArchived = !folder.isArchived;
      const updatedFolder = { ...folder, isArchived: newArchived };
      if (onSaveFolder) {
        await onSaveFolder(updatedFolder);
      } else if (window.electronAPI?.saveNoteFolder) {
        await window.electronAPI.saveNoteFolder(updatedFolder);
      }

      // Cascade archive/unarchive to all notes in this folder and its subfolders
      const allChildFolderIds = new Set<string>([folder.id]);
      const findChildren = (parentId: string) => {
        folders.filter((f) => f.parentId === parentId).forEach((child) => {
          allChildFolderIds.add(child.id);
          findChildren(child.id);
        });
      };
      findChildren(folder.id);

      const notesToUpdate = notes.filter(
        (n) => n.folderId && allChildFolderIds.has(n.folderId) && Boolean(n.isArchived) !== newArchived
      );
      for (const n of notesToUpdate) {
        const updated = { ...n, isArchived: newArchived };
        if (onUpdateNoteMeta) {
          await onUpdateNoteMeta(updated);
        } else if (window.electronAPI?.saveNoteMeta) {
          await window.electronAPI.saveNoteMeta(updated);
        }
      }
    } catch (err) {
      console.error('Erro ao arquivar/desarquivar pasta:', err);
    } finally {
      setOpenMenuId(null);
    }
  };

  const handleShowInFolder = async (targetNote?: NoteItem) => {
    const note = targetNote || activeNote;
    if (note?.filePath && (window as any).electronAPI?.showItemInFolder) {
      await (window as any).electronAPI.showItemInFolder(note.filePath);
    }
    setOpenMenuId(null);
  };

  const handleOpenFolderInExplorer = async (folder: NoteFolder) => {
    setOpenMenuId(null);
    if ((window as any).electronAPI?.openNoteFolder) {
      await (window as any).electronAPI.openNoteFolder(folder.id);
    }
  };

  const handleOpenExportModal = (targetNote?: NoteItem) => {
    setNoteToExport(targetNote || activeNote);
    setIsExportModalOpen(true);
    setOpenMenuId(null);
  };

  const handleExportAsHtml = async (note: NoteItem) => {
    try {
      let raw = content;
      if (note.id !== activeNote?.id && note.filePath) {
        raw = await onReadContent(note.filePath);
      }
      const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${note.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 900px; margin: 40px auto; padding: 0 24px; }
    h1 { font-size: 2rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; color: #0f172a; }
    h2 { font-size: 1.5rem; margin-top: 24px; color: #1e293b; }
    h3 { font-size: 1.2rem; color: #334155; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background-color: #f1f5f9; font-weight: 600; }
    img { max-width: 100%; height: auto; border-radius: 6px; }
    blockquote { border-left: 4px solid #6366f1; margin: 16px 0; padding: 8px 16px; background-color: #f8fafc; color: #475569; }
    ul[data-type="taskList"] { list-style: none; padding-left: 0; }
    ul[data-type="taskList"] li { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
    pre, code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: Consolas, monospace; font-size: 13px; }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  ${raw}
</body>
</html>`;
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${note.title || 'anotacao'}.html`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar HTML:', err);
    } finally {
      setIsExportModalOpen(false);
    }
  };

  const handleExportAsMarkdown = async (note: NoteItem) => {
    try {
      let raw = content;
      if (note.id !== activeNote?.id && note.filePath) {
        raw = await onReadContent(note.filePath);
      }
      let md = raw
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<li[^>]*data-checked="true"[^>]*>[\s\S]*?<p>(.*?)<\/p>[\s\S]*?<\/li>/gi, '- [x] $1\n')
        .replace(/<li[^>]*data-checked="false"[^>]*>[\s\S]*?<p>(.*?)<\/p>[\s\S]*?<\/li>/gi, '- [ ] $1\n')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${note.title || 'anotacao'}.md`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar Markdown:', err);
    } finally {
      setIsExportModalOpen(false);
    }
  };

  const convertHtmlToPlainText = (html: string, title: string): string => {
    if (!html) return title ? `${title}\n` : '';
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');

      // Convert task list checkboxes
      doc.querySelectorAll('li[data-type="taskItem"]').forEach((li) => {
        const isChecked =
          li.getAttribute('data-checked') === 'true' ||
          !!li.querySelector('input[type="checkbox"]:checked');
        const prefix = isChecked ? '[x] ' : '[ ] ';
        const p = li.querySelector('div > p') || li.querySelector('div') || li;
        p.textContent = `${prefix}${p.textContent?.trim() || ''}\n`;
      });

      // Convert bullet lists
      doc.querySelectorAll('ul:not([data-type="taskList"]) > li').forEach((li) => {
        li.textContent = `• ${li.textContent?.trim() || ''}\n`;
      });

      // Convert ordered lists
      doc.querySelectorAll('ol > li').forEach((li, idx) => {
        li.textContent = `${idx + 1}. ${li.textContent?.trim() || ''}\n`;
      });

      // Convert headings
      doc.querySelectorAll('h1').forEach((h1) => {
        h1.textContent = `\n# ${h1.textContent?.trim()}\n\n`;
      });
      doc.querySelectorAll('h2').forEach((h2) => {
        h2.textContent = `\n## ${h2.textContent?.trim()}\n\n`;
      });
      doc.querySelectorAll('h3').forEach((h3) => {
        h3.textContent = `\n### ${h3.textContent?.trim()}\n\n`;
      });

      // Linebreaks, paragraphs and blockquotes
      doc.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
      doc.querySelectorAll('p').forEach((p) => {
        p.textContent = `${p.textContent}\n`;
      });
      doc.querySelectorAll('blockquote').forEach((bq) => {
        bq.textContent = `\n> ${bq.textContent?.trim()}\n\n`;
      });

      // Tables
      doc.querySelectorAll('table').forEach((table) => {
        const rows = Array.from(table.querySelectorAll('tr'));
        const tableText = rows
          .map((r) => {
            const cells = Array.from(r.querySelectorAll('th, td')).map(
              (c) => c.textContent?.trim() || ''
            );
            return cells.join(' | ');
          })
          .join('\n');
        table.replaceWith(`\n${tableText}\n\n`);
      });

      let text = doc.body.textContent || '';
      text = text.replace(/\n{3,}/g, '\n\n').trim();
      return `${title ? `${title}\n${'='.repeat(title.length)}\n\n` : ''}${text}\n`;
    } catch {
      return `${title ? `${title}\n\n` : ''}${html.replace(/<[^>]+>/g, '\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
    }
  };

  const handleExportAsTxt = async (note: NoteItem) => {
    try {
      setIsExporting(true);
      let raw = content;
      if (note.id !== activeNote?.id && note.filePath) {
        raw = await onReadContent(note.filePath);
      }
      const plain = convertHtmlToPlainText(raw, note.title || 'Anotação');
      await onExportTxt(plain, note.title || 'anotacao');
    } catch (err) {
      console.error('Erro ao exportar .txt:', err);
    } finally {
      setIsExporting(false);
      setIsExportModalOpen(false);
    }
  };

  const handlePrintPdf = async (noteToPrint?: NoteItem) => {
    const target = noteToPrint || noteToExport || activeNote;
    if (!target) return;
    setIsExportModalOpen(false);

    try {
      let raw = content;
      if (target.id !== activeNote?.id && target.filePath) {
        raw = await onReadContent(target.filePath);
      }

      // Create an isolated hidden iframe so ONLY the note is printed/saved as PDF
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) return;

      const printHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${target.title || 'Anotação'}</title>
  <style>
    @page { margin: 15mm 20mm; size: auto; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin: 0 0 16px 0;
      color: #0f172a;
    }
    h2 { font-size: 17px; font-weight: 700; margin: 20px 0 10px; color: #1e293b; }
    h3 { font-size: 14px; font-weight: 700; margin: 16px 0 8px; color: #334155; }
    p { margin: 8px 0; }
    ul, ol { padding-left: 24px; margin: 8px 0 14px; }
    li { margin: 4px 0; }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
      font-size: 13px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: left;
    }
    th { background-color: #f1f5f9; font-weight: 700; }
    blockquote {
      border-left: 4px solid #6366f1;
      margin: 14px 0;
      padding: 8px 16px;
      background-color: #f8fafc;
      color: #475569;
      font-style: italic;
    }
    ul[data-type="taskList"] {
      list-style: none;
      padding-left: 4px;
    }
    ul[data-type="taskList"] li {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 4px 0;
    }
    ul[data-type="taskList"] li[data-checked="true"] > div {
      text-decoration: line-through;
      color: #94a3b8;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 8px 0;
    }
    pre, code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: Consolas, Monaco, monospace;
      font-size: 12px;
    }
    pre { padding: 12px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>${target.title || 'Anotação'}</h1>
  <div>${raw}</div>
</body>
</html>`;

      iframeDoc.open();
      iframeDoc.write(printHtml);
      iframeDoc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }, 300);
    } catch (err) {
      console.error('Erro ao imprimir PDF:', err);
    }
  };

  const handleAttachFile = async (targetFolderId: string = '', targetClientId: string = '') => {
    const finalClientId = targetClientId || modalTargetClientId;
    const finalFolderId = targetFolderId || modalTargetFolderId;
    try {
      let fileNote: NoteItem | null = null;
      if ((window as any).electronAPI?.pickLocalFile) {
        const picked = await (window as any).electronAPI.pickLocalFile();
        if (picked) {
          const payload = {
            title: picked.fileName,
            fileName: picked.fileName,
            mimeType: picked.mimeType,
            base64: picked.base64,
            size: picked.size,
            folderId: finalFolderId || undefined,
          };
          fileNote = onSaveFileNote
            ? await onSaveFileNote(payload)
            : window.electronAPI?.saveFileNote
            ? await window.electronAPI.saveFileNote(payload)
            : null;
          if (fileNote) {
            if (finalClientId) {
              const targetClient = clients.find((c) => c.id === finalClientId);
              if (targetClient && onSaveClient) {
                const currentLinked = targetClient.linkedNoteIds || [];
                if (!currentLinked.includes(fileNote.id)) {
                  await onSaveClient({ ...targetClient, linkedNoteIds: [...currentLinked, fileNote.id] });
                }
              }
              if (onUpdateNoteMeta) {
                fileNote = await onUpdateNoteMeta({ id: fileNote.id, clientId: finalClientId });
              }
              setExpandedFolders((prev) => ({ ...prev, [`client_${finalClientId}`]: true }));
            }
            setActiveNote(fileNote);
            setIsCreateModalOpen(false);
          }
        }
      } else {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.txt,.json,.log';
        fileInput.onchange = async (e: any) => {
          const file = e.target?.files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = async () => {
            const b64 = (reader.result as string).split(',')[1] || '';
            const payload = {
              title: file.name,
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
              base64: b64,
              size: file.size,
              folderId: finalFolderId || undefined,
            };
            fileNote = onSaveFileNote
              ? await onSaveFileNote(payload)
              : window.electronAPI?.saveFileNote
              ? await window.electronAPI.saveFileNote(payload)
              : null;
            if (fileNote) {
              if (finalClientId) {
                const targetClient = clients.find((c) => c.id === finalClientId);
                if (targetClient && onSaveClient) {
                  const currentLinked = targetClient.linkedNoteIds || [];
                  if (!currentLinked.includes(fileNote.id)) {
                    await onSaveClient({ ...targetClient, linkedNoteIds: [...currentLinked, fileNote.id] });
                  }
                }
                if (onUpdateNoteMeta) {
                  fileNote = await onUpdateNoteMeta({ id: fileNote.id, clientId: finalClientId });
                }
                setExpandedFolders((prev) => ({ ...prev, [`client_${finalClientId}`]: true }));
              }
              setActiveNote(fileNote);
              setIsCreateModalOpen(false);
            }
          };
          reader.readAsDataURL(file);
        };
        fileInput.click();
      }
    } catch (err) {
      console.error('Erro ao anexar arquivo:', err);
    }
  };

  const renderNoteIcon = (n: NoteItem, isActive: boolean) => {
    const activeColor = isActive ? 'var(--accent-primary)' : 'var(--text-secondary)';
    if (n.format === 'file') {
      const ext = (n.title.split('.').pop() || '').toLowerCase();
      if (ext === 'pdf') return <FileText size={14} color="#ef4444" style={{ flexShrink: 0 }} />;
      if (ext === 'docx' || ext === 'doc') return <FileText size={14} color="#3b82f6" style={{ flexShrink: 0 }} />;
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return <Table size={14} color="#10b981" style={{ flexShrink: 0 }} />;
      if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return <ImageIcon size={14} color="#a855f7" style={{ flexShrink: 0 }} />;
      return <Paperclip size={14} color="#cbd5e1" style={{ flexShrink: 0 }} />;
    }
    return <FileText size={14} color={activeColor} style={{ flexShrink: 0 }} />;
  };

  // Drag and drop handlers for moving notes and folders
  const dragExpandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    draggedNoteIdRef.current = noteId;
    draggedFolderIdRef.current = null;
    setDraggedNoteId(noteId);
    setDraggedFolderId(null);
    e.dataTransfer.setData('text/plain', noteId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    if (dragExpandTimeoutRef.current) {
      clearTimeout(dragExpandTimeoutRef.current);
      dragExpandTimeoutRef.current = null;
    }
    setTimeout(() => {
      draggedNoteIdRef.current = null;
      draggedFolderIdRef.current = null;
      setDraggedNoteId(null);
      setDraggedFolderId(null);
    }, 150);
    setDragOverFolderId(null);
    setDragOverClientId(null);
  };

  const handleDragStartFolder = (e: React.DragEvent, folderId: string) => {
    e.stopPropagation();
    draggedFolderIdRef.current = folderId;
    draggedNoteIdRef.current = null;
    setDraggedFolderId(folderId);
    setDraggedNoteId(null);
    e.dataTransfer.setData('text/plain', `folder:${folderId}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEndFolder = () => {
    if (dragExpandTimeoutRef.current) {
      clearTimeout(dragExpandTimeoutRef.current);
      dragExpandTimeoutRef.current = null;
    }
    setTimeout(() => {
      draggedFolderIdRef.current = null;
      draggedNoteIdRef.current = null;
      setDraggedFolderId(null);
      setDraggedNoteId(null);
    }, 150);
    setDragOverFolderId(null);
    setDragOverClientId(null);
  };

  const handleDragOverFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (dragOverFolderId !== folderId) {
      setDragOverFolderId(folderId);

      // Auto-expand folder on hover after 450ms
      if (folderId !== '__ROOT__' && !expandedFolders[folderId]) {
        if (dragExpandTimeoutRef.current) {
          clearTimeout(dragExpandTimeoutRef.current);
        }
        dragExpandTimeoutRef.current = setTimeout(() => {
          setExpandedFolders((prev) => ({ ...prev, [folderId]: true }));
        }, 450);
      }
    }
  };

  const handleDragLeaveFolder = (e: React.DragEvent, folderId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    if (dragExpandTimeoutRef.current) {
      clearTimeout(dragExpandTimeoutRef.current);
      dragExpandTimeoutRef.current = null;
    }
    if (!folderId || dragOverFolderId === folderId) {
      setDragOverFolderId(null);
    }
  };

  const isDescendantFolder = (parentId: string, childId: string): boolean => {
    const directChildren = folders.filter((f) => f.parentId === parentId);
    if (directChildren.some((c) => c.id === childId)) return true;
    return directChildren.some((c) => isDescendantFolder(c.id, childId));
  };

  const handleDropOnFolder = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragExpandTimeoutRef.current) {
      clearTimeout(dragExpandTimeoutRef.current);
      dragExpandTimeoutRef.current = null;
    }
    setDragOverFolderId(null);

    const rawData = e.dataTransfer.getData('text/plain') || '';

    // Caso 1: Movimentação de Pasta para outra Pasta ou Raiz
    if (rawData.startsWith('folder:') || draggedFolderId) {
      const folderId = rawData.startsWith('folder:') ? rawData.replace('folder:', '') : (draggedFolderId || '');
      if (!folderId || folderId === targetFolderId) {
        setDraggedFolderId(null);
        return;
      }
      if (targetFolderId !== '__ROOT__' && (isDescendantFolder(folderId, targetFolderId) || folderId === targetFolderId)) {
        setDraggedFolderId(null);
        return;
      }

      const folderToMove = folders.find((f) => f.id === folderId);
      if (!folderToMove) {
        setDraggedFolderId(null);
        return;
      }

      const isRootTarget = targetFolderId === '__ROOT__';
      const targetParentFolder = !isRootTarget ? folders.find((f) => f.id === targetFolderId) : null;
      const newClientId = targetParentFolder?.clientId || undefined;
      const newParentId = isRootTarget ? undefined : targetFolderId;

      if (onSaveFolder) {
        await onSaveFolder({
          ...folderToMove,
          parentId: newParentId,
          clientId: newClientId,
        });
      }

      // Se moveu para fora do cliente, desvincular do cliente anterior
      if (folderToMove.clientId && (!newClientId || newClientId !== folderToMove.clientId)) {
        const prevClient = clients.find((c) => c.id === folderToMove.clientId);
        if (prevClient && onSaveClient) {
          const currentLinked = prevClient.linkedFolderIds || [];
          await onSaveClient({
            ...prevClient,
            linkedFolderIds: currentLinked.filter((id) => id !== folderToMove.id),
          });
        }
      }

      if (!isRootTarget) {
        setExpandedFolders((prev) => ({ ...prev, [targetFolderId]: true }));
      }
      setDraggedFolderId(null);
      return;
    }

    // Caso 2: Movimentação de Nota
    const noteId = rawData || draggedNoteId;
    if (!noteId || !onUpdateNoteMeta) return;

    try {
      const targetParentFolder = targetFolderId !== '__ROOT__' ? folders.find((f) => f.id === targetFolderId) : null;
      const newClientId = targetParentFolder?.clientId || '';

      const updated = await onUpdateNoteMeta({
        id: noteId,
        folderId: targetFolderId === '__ROOT__' ? '' : targetFolderId,
        clientId: newClientId,
      });
      if (activeNote?.id === noteId) {
        setActiveNote(updated);
      }
    } catch (err) {
      console.error('Erro ao mover nota para pasta no drop:', err);
    } finally {
      setDraggedNoteId(null);
    }
  };

  // ─── Client Drag & Drop Handlers ───
  const handleDragOverClient = (e: React.DragEvent, clientId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';

    if (dragOverClientId !== clientId) {
      setDragOverClientId(clientId);

      if (!expandedFolders[`client_${clientId}`]) {
        if (dragExpandTimeoutRef.current) {
          clearTimeout(dragExpandTimeoutRef.current);
        }
        dragExpandTimeoutRef.current = setTimeout(() => {
          setExpandedFolders((prev) => ({ ...prev, [`client_${clientId}`]: true }));
        }, 450);
      }
    }
  };

  const handleDragLeaveClient = (e: React.DragEvent, clientId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    if (dragExpandTimeoutRef.current) {
      clearTimeout(dragExpandTimeoutRef.current);
      dragExpandTimeoutRef.current = null;
    }
    if (!clientId || dragOverClientId === clientId) {
      setDragOverClientId(null);
    }
  };

  const handleDropOnClient = async (e: React.DragEvent, clientId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragExpandTimeoutRef.current) {
      clearTimeout(dragExpandTimeoutRef.current);
      dragExpandTimeoutRef.current = null;
    }
    setDragOverClientId(null);

    const rawData = e.dataTransfer.getData('text/plain') || '';
    const potentialFolderId = rawData.startsWith('folder:')
      ? rawData.replace('folder:', '')
      : (draggedFolderIdRef.current || draggedFolderId || (folders.some((f) => f.id === rawData) ? rawData : ''));

    const isFolder = rawData.startsWith('folder:') || !!draggedFolderIdRef.current || !!draggedFolderId || folders.some((f) => f.id === potentialFolderId);

    // Caso 1: Movimentação de Pasta para dentro do Cliente
    if (isFolder && potentialFolderId) {
      const folderToMove = folders.find((f) => f.id === potentialFolderId);
      if (!folderToMove) {
        draggedFolderIdRef.current = null;
        setDraggedFolderId(null);
        return;
      }

      if (onSaveFolder) {
        await onSaveFolder({
          ...folderToMove,
          clientId,
          parentId: undefined,
        });
      }

      const targetClient = clients.find((c) => c.id === clientId);
      if (targetClient && onSaveClient) {
        const currentLinked = targetClient.linkedFolderIds || [];
        if (!currentLinked.includes(potentialFolderId)) {
          await onSaveClient({
            ...targetClient,
            linkedFolderIds: [...currentLinked, potentialFolderId],
          });
        }
      }

      setExpandedFolders((prev) => ({ ...prev, [`client_${clientId}`]: true }));
      draggedFolderIdRef.current = null;
      setDraggedFolderId(null);
      return;
    }

    // Caso 2: Movimentação de Nota para o Cliente
    const noteId = rawData || draggedNoteIdRef.current || draggedNoteId;
    if (!noteId) return;

    const targetClient = clients.find((c) => c.id === clientId);
    if (targetClient && onSaveClient) {
      const currentLinked = targetClient.linkedNoteIds || [];
      if (!currentLinked.includes(noteId)) {
        await onSaveClient({
          ...targetClient,
          linkedNoteIds: [...currentLinked, noteId],
        });
      }
    }
    if (onUpdateNoteMeta) {
      const updated = await onUpdateNoteMeta({ id: noteId, clientId, folderId: '' });
      if (activeNote?.id === noteId) {
        setActiveNote(updated);
      }
    }
    setExpandedFolders((prev) => ({ ...prev, [`client_${clientId}`]: true }));
    draggedNoteIdRef.current = null;
    setDraggedNoteId(null);
  };

  const handleToggleClientCollapse = (clientId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [`client_${clientId}`]: !prev[`client_${clientId}`],
    }));
  };

  const handleMoveFolderUp = (folder: NoteFolder) => {
    setOpenMenuId(null);
    const siblings = folders.filter(
      (f) => (f.parentId || '') === (folder.parentId || '') && (f.clientId || '') === (folder.clientId || '')
    );
    const index = siblings.findIndex((f) => f.id === folder.id);
    if (index <= 0) return;

    const prevSibling = siblings[index - 1];
    const fullPrevIdx = folders.findIndex((f) => f.id === prevSibling.id);
    const fullCurIdx = folders.findIndex((f) => f.id === folder.id);
    if (fullPrevIdx === -1 || fullCurIdx === -1) return;

    const nextFolders = [...folders];
    nextFolders[fullCurIdx] = prevSibling;
    nextFolders[fullPrevIdx] = folder;

    if (onReorderFolders) {
      onReorderFolders(nextFolders);
    }
  };

  const handleMoveFolderDown = (folder: NoteFolder) => {
    setOpenMenuId(null);
    const siblings = folders.filter(
      (f) => (f.parentId || '') === (folder.parentId || '') && (f.clientId || '') === (folder.clientId || '')
    );
    const index = siblings.findIndex((f) => f.id === folder.id);
    if (index === -1 || index >= siblings.length - 1) return;

    const nextSibling = siblings[index + 1];
    const fullNextIdx = folders.findIndex((f) => f.id === nextSibling.id);
    const fullCurIdx = folders.findIndex((f) => f.id === folder.id);
    if (fullNextIdx === -1 || fullCurIdx === -1) return;

    const nextFolders = [...folders];
    nextFolders[fullCurIdx] = nextSibling;
    nextFolders[fullNextIdx] = folder;

    if (onReorderFolders) {
      onReorderFolders(nextFolders);
    }
  };

  const handleUnlinkFolderFromClient = async (folder: NoteFolder) => {
    setOpenMenuId(null);
    if (folder.clientId) {
      const targetClient = clients.find((c) => c.id === folder.clientId);
      if (targetClient && onSaveClient) {
        const currentLinked = targetClient.linkedFolderIds || [];
        await onSaveClient({
          ...targetClient,
          linkedFolderIds: currentLinked.filter((id) => id !== folder.id),
        });
      }
    }
    if (onSaveFolder) {
      await onSaveFolder({
        ...folder,
        clientId: undefined,
        parentId: undefined,
      });
    }
  };

  const handleAssignNoteToClient = async (note: NoteItem, clientId: string) => {
    const targetClient = clients.find((c) => c.id === clientId);
    if (targetClient && onSaveClient) {
      const currentLinked = targetClient.linkedNoteIds || [];
      if (!currentLinked.includes(note.id)) {
        await onSaveClient({
          ...targetClient,
          linkedNoteIds: [...currentLinked, note.id],
        });
      }
    }
    if (onUpdateNoteMeta) {
      const updated = await onUpdateNoteMeta({ id: note.id, clientId, folderId: '' });
      if (activeNote?.id === note.id) {
        setActiveNote(updated);
      }
    }
    setExpandedFolders((prev) => ({ ...prev, [`client_${clientId}`]: true }));
  };

  const handleUnlinkNoteFromClient = async (note: NoteItem, client: ClientAsset) => {
    setOpenMenuId(null);
    const updatedLinked = (client.linkedNoteIds || []).filter((id) => id !== note.id);
    if (onSaveClient) {
      await onSaveClient({ ...client, linkedNoteIds: updatedLinked });
    }
    if (note.clientId === client.id && onUpdateNoteMeta) {
      const updated = await onUpdateNoteMeta({ id: note.id, clientId: '' });
      if (activeNote?.id === note.id) {
        setActiveNote(updated);
      }
    }
  };

  const handleOpenManageLinksModal = (client: ClientAsset) => {
    setClientToManageLinks(client);
    setClientLinksSearchQuery('');
    setClientLinksActiveTab('folders');
    setOpenMenuId(null);
  };

  const handleToggleFolderLinkInModal = (folderId: string) => {
    if (!clientToManageLinks) return;
    const currentLinked = clientToManageLinks.linkedFolderIds || [];
    const nextLinked = currentLinked.includes(folderId)
      ? currentLinked.filter((id) => id !== folderId)
      : [...currentLinked, folderId];
    setClientToManageLinks({ ...clientToManageLinks, linkedFolderIds: nextLinked });
  };

  const handleToggleNoteLinkInModal = (noteId: string) => {
    if (!clientToManageLinks) return;
    const currentLinked = clientToManageLinks.linkedNoteIds || [];
    const nextLinked = currentLinked.includes(noteId)
      ? currentLinked.filter((id) => id !== noteId)
      : [...currentLinked, noteId];
    setClientToManageLinks({ ...clientToManageLinks, linkedNoteIds: nextLinked });
  };

  const handleSelectAllLinksInModal = (filteredIds: string[]) => {
    if (!clientToManageLinks) return;
    if (clientLinksActiveTab === 'folders') {
      const currentLinked = new Set(clientToManageLinks.linkedFolderIds || []);
      filteredIds.forEach((id) => currentLinked.add(id));
      setClientToManageLinks({ ...clientToManageLinks, linkedFolderIds: Array.from(currentLinked) });
    } else {
      const currentLinked = new Set(clientToManageLinks.linkedNoteIds || []);
      filteredIds.forEach((id) => currentLinked.add(id));
      setClientToManageLinks({ ...clientToManageLinks, linkedNoteIds: Array.from(currentLinked) });
    }
  };

  const handleClearAllLinksInModal = (filteredIds: string[]) => {
    if (!clientToManageLinks) return;
    const filteredSet = new Set(filteredIds);
    if (clientLinksActiveTab === 'folders') {
      const currentLinked = clientToManageLinks.linkedFolderIds || [];
      const nextLinked = currentLinked.filter((id) => !filteredSet.has(id));
      setClientToManageLinks({ ...clientToManageLinks, linkedFolderIds: nextLinked });
    } else {
      const currentLinked = clientToManageLinks.linkedNoteIds || [];
      const nextLinked = currentLinked.filter((id) => !filteredSet.has(id));
      setClientToManageLinks({ ...clientToManageLinks, linkedNoteIds: nextLinked });
    }
  };

  const handleAssignFolderToClient = async (folder: NoteFolder, clientId: string) => {
    setOpenMenuId(null);
    const targetClient = clients.find((c) => c.id === clientId);
    if (targetClient && onSaveClient) {
      const currentLinked = targetClient.linkedFolderIds || [];
      if (!currentLinked.includes(folder.id)) {
        await onSaveClient({
          ...targetClient,
          linkedFolderIds: [...currentLinked, folder.id],
        });
      }
    }
    if (onSaveFolder) {
      await onSaveFolder({
        ...folder,
        clientId,
        parentId: undefined,
      });
    }
    setExpandedFolders((prev) => ({ ...prev, [`client_${clientId}`]: true }));
  };

  const handleSaveClientLinksModal = async () => {
    if (!clientToManageLinks || !onSaveClient) return;
    try {
      await onSaveClient(clientToManageLinks);

      // Sincroniza clientId das pastas
      const linkedFolderSet = new Set(clientToManageLinks.linkedFolderIds || []);
      for (const f of folders) {
        if (linkedFolderSet.has(f.id) && f.clientId !== clientToManageLinks.id && onSaveFolder) {
          await onSaveFolder({ ...f, clientId: clientToManageLinks.id, parentId: undefined });
        } else if (!linkedFolderSet.has(f.id) && f.clientId === clientToManageLinks.id && onSaveFolder) {
          await onSaveFolder({ ...f, clientId: undefined });
        }
      }

      // Sincroniza clientId das notas
      const linkedSet = new Set(clientToManageLinks.linkedNoteIds || []);
      for (const n of notes) {
        if (linkedSet.has(n.id) && n.clientId !== clientToManageLinks.id && onUpdateNoteMeta) {
          await onUpdateNoteMeta({ id: n.id, clientId: clientToManageLinks.id });
        } else if (!linkedSet.has(n.id) && n.clientId === clientToManageLinks.id && onUpdateNoteMeta) {
          await onUpdateNoteMeta({ id: n.id, clientId: '' });
        }
      }

      setExpandedFolders((prev) => ({ ...prev, [`client_${clientToManageLinks.id}`]: true }));
    } catch (err) {
      console.error('Erro ao salvar vínculos de pastas/notas do cliente:', err);
    } finally {
      setClientToManageLinks(null);
    }
  };

  // Group visible notes & folders (Active vs Archived)
  const activeNotesCount = notes.filter((n) => !n.isArchived).length;
  const archivedNotesCount = notes.filter((n) => Boolean(n.isArchived)).length;
  const visibleNotes = notes.filter((n) => (showArchived ? Boolean(n.isArchived) : !n.isArchived));

  // Notas soltas na raiz (sem pasta e não pertencentes a nenhum cliente)
  const unorganizedNotes = visibleNotes.filter(
    (n) => (!n.folderId || n.folderId === '') && !clients.some((c) => (c.linkedNoteIds || []).includes(n.id) || n.clientId === c.id)
  );
  const activeNoteFolder = folders.find((f) => f.id === activeNote?.folderId);
  const activeNoteClient = clients.find(
    (c) => (c.linkedNoteIds || []).includes(activeNote?.id || '') || activeNote?.clientId === c.id
  );

  // Check if a folder has any archived content (itself, its notes, or its subfolders)
  const folderHasArchivedContent = (folderId: string): boolean => {
    const directFolder = folders.find((f) => f.id === folderId);
    if (directFolder?.isArchived) return true;
    const directArchivedNotes = notes.some((n) => n.folderId === folderId && Boolean(n.isArchived));
    if (directArchivedNotes) return true;
    const childFolders = folders.filter((f) => f.parentId === folderId);
    return childFolders.some((child) => folderHasArchivedContent(child.id));
  };

  const isFolderVisible = (folder: NoteFolder): boolean => {
    if (showArchived) {
      return Boolean(folder.isArchived) || folderHasArchivedContent(folder.id);
    } else {
      return !folder.isArchived;
    }
  };

  const handleToggleFolderCollapse = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // ─── Hierarchical Folder Options Builder for Selects ───
  interface HierarchicalOption {
    id: string;
    label: string;
    depth: number;
  }

  const getHierarchicalFolderOptions = (
    parentId: string = '',
    depth: number = 0,
    excludeFolderId?: string
  ): HierarchicalOption[] => {
    const list: HierarchicalOption[] = [];
    const directChildren = folders.filter(
      (f) => (f.parentId || '') === parentId && f.id !== excludeFolderId && !f.isArchived
    );

    for (const folder of directChildren) {
      const indent = depth === 0 ? '' : `${'\u00A0\u00A0'.repeat(depth)}└─ `;
      list.push({
        id: folder.id,
        label: `${indent}📁 ${folder.name}`,
        depth,
      });
      list.push(...getHierarchicalFolderOptions(folder.id, depth + 1, excludeFolderId));
    }
    return list;
  };

  const allFolderOptions = getHierarchicalFolderOptions('', 0);
  const folderParentOptions = getHierarchicalFolderOptions('', 0);

  // Pastas raiz comuns (que não pertencem a nenhum cliente)
  const rootFolders = folders.filter(
    (f) => (!f.parentId || f.parentId === '') && !clients.some((c) => (c.linkedFolderIds || []).includes(f.id) || f.clientId === c.id) && isFolderVisible(f)
  );

  // ─── Render Note Row with 3-Dots Menu on Hover ───
  const renderNoteRow = (n: NoteItem, depth: number = 0, clientOwner?: ClientAsset) => {
    const isActive = activeNote?.id === n.id;
    const isFile = isFileNote(n);
    const fileExt = (n.title.split('.').pop() || '').toUpperCase();
    const isMenuOpen = openMenuId === `note_${n.id}`;
    const isDraggingThis = draggedNoteId === n.id;
    const noteClient = clientOwner || clients.find((c) => (c.linkedNoteIds || []).includes(n.id) || n.clientId === c.id);

    return (
      <div
        key={n.id}
        draggable
        onDragStart={(e) => handleDragStart(e, n.id)}
        onDragEnd={handleDragEnd}
        onClick={() => setActiveNote(n)}
        className="tree-hover-item"
        style={{
          ...styles.noteRow,
          ...(isActive ? styles.activeNoteRow : {}),
          paddingLeft: `${10 + depth * 14}px`,
          opacity: isDraggingThis ? 0.35 : 1,
          outline: isDraggingThis ? '1.5px dashed var(--accent-primary)' : 'none',
          position: 'relative',
        }}
        title={`Arraste para mover para uma pasta ou cliente • ${n.title}`}
      >
        <GripVertical size={12} color="var(--text-muted)" style={{ cursor: 'grab', flexShrink: 0, opacity: 0.6 }} />
        {renderNoteIcon(n, isActive)}
        <span style={styles.noteTitle} title={n.title}>
          {n.title}
        </span>
        {isFile && (
          <span style={styles.fileBadge}>
            {fileExt}
          </span>
        )}

        {/* 3-Dots Button (Only visible on hover or when open) */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button
            className={`item-more-btn ${isMenuOpen ? 'active-menu' : ''}`}
            style={styles.moreButton}
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(isMenuOpen ? null : `note_${n.id}`);
            }}
            title="Mais opções"
          >
            <MoreVertical size={13} />
          </button>

          {/* Context Dropdown Menu */}
          {isMenuOpen && (
            <div
              style={styles.contextMenu}
              onClick={(e) => e.stopPropagation()}
            >
              {n.filePath && (
                <button
                  style={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShowInFolder(n);
                  }}
                >
                  <Folder size={13} color="var(--accent-primary)" />
                  <span>Abrir na Pasta</span>
                </button>
              )}
              {!isFile && (
                <button
                  style={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenExportModal(n);
                  }}
                >
                  <Download size={13} />
                  <span>Exportar...</span>
                </button>
              )}
              {noteClient && (
                <button
                  style={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnlinkNoteFromClient(n, noteClient);
                  }}
                >
                  <Unlink size={13} color="#f59e0b" />
                  <span>Desvincular de {noteClient.name}</span>
                </button>
              )}
              <button
                style={styles.contextMenuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleArchiveNote(n);
                }}
              >
                {n.isArchived ? (
                  <>
                    <ArchiveRestore size={13} color="#34d399" />
                    <span style={{ color: '#34d399' }}>Desarquivar</span>
                  </>
                ) : (
                  <>
                    <Archive size={13} color="#f59e0b" />
                    <span>Arquivar</span>
                  </>
                )}
              </button>
              <div style={styles.contextMenuDivider} />
              <button
                style={{ ...styles.contextMenuItem, color: '#f43f5e' }}
                onClick={(e) => handleDeleteNoteAction(e, n)}
              >
                <Trash2 size={13} color="#f43f5e" />
                <span>Excluir Anotação</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Render Client Asset Folder Node (Clientes como Pastas no Editor) ───
  const renderClientFolderNode = (client: ClientAsset, depth: number = 0) => {
    const clientSubFolders = folders.filter(
      (f) => ((client.linkedFolderIds || []).includes(f.id) || f.clientId === client.id) && (!f.parentId || f.parentId === '') && isFolderVisible(f)
    );
    const clientNotes = visibleNotes.filter(
      (n) => (!n.folderId || n.folderId === '') && ((client.linkedNoteIds || []).includes(n.id) || n.clientId === client.id)
    );
    const isExpanded = !!expandedFolders[`client_${client.id}`];
    const isCollapsed = !isExpanded;
    const isDragOver = dragOverClientId === client.id;
    const isMenuOpen = openMenuId === `client_menu_${client.id}`;
    const totalItemsCount = clientNotes.length + clientSubFolders.length;
    const clientColor = client.color || '#6366f1';
    const isAnyDragging = Boolean(draggedFolderId || draggedFolderIdRef.current || draggedNoteId || draggedNoteIdRef.current);

    return (
      <div key={`client_node_${client.id}`} style={{ marginBottom: '3px' }}>
        {/* Client Folder Row Header (Drop Target) */}
        <div
          className="tree-hover-item"
          onDragOver={(e) => handleDragOverClient(e, client.id)}
          onDragLeave={(e) => handleDragLeaveClient(e, client.id)}
          onDrop={(e) => handleDropOnClient(e, client.id)}
          style={{
            ...styles.folderRow,
            paddingLeft: `${8 + depth * 14}px`,
            position: 'relative',
            backgroundColor: isDragOver ? 'rgba(99, 102, 241, 0.28)' : 'rgba(255, 255, 255, 0.02)',
            borderLeft: `3px solid ${clientColor}`,
            outline: isDragOver ? `1.5px solid ${clientColor}` : '1.5px solid transparent',
            boxShadow: isDragOver ? `0 0 10px ${clientColor}55` : 'none',
            transition: 'all 0.12s ease',
            borderRadius: '4px',
          }}
          onClick={() => handleToggleClientCollapse(client.id)}
          title={`Cliente / Asset: ${client.name} • Clique para expandir • Arraste documentos aqui para vincular`}
        >
          <button
            style={styles.chevronBtn}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleClientCollapse(client.id);
            }}
          >
            {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>

          <Briefcase size={14} color={clientColor} style={{ flexShrink: 0 }} />

          <span
            style={{
              ...styles.folderName,
              color: isDragOver ? '#ffffff' : '#f8fafc',
              fontWeight: '600',
            }}
            title={client.name}
          >
            {client.name}
          </span>

          {isDragOver ? (
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: '700',
                backgroundColor: clientColor,
                color: '#ffffff',
                padding: '1px 6px',
                borderRadius: '8px',
                letterSpacing: '0.2px',
                flexShrink: 0,
              }}
            >
              Vincular aqui
            </span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: '700',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  backgroundColor: `${clientColor}22`,
                  color: clientColor,
                  border: `1px solid ${clientColor}44`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                }}
              >
                Asset
              </span>
              <span style={styles.folderBadge}>
                {clientNotes.length + clientSubFolders.length}
              </span>
            </div>
          )}

          {/* 3-Dots Menu Button */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              className={`item-more-btn ${isMenuOpen ? 'active-menu' : ''}`}
              style={styles.moreButton}
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(isMenuOpen ? null : `client_menu_${client.id}`);
              }}
              title="Opções do Cliente"
            >
              <MoreVertical size={13} />
            </button>

            {/* Context Dropdown Menu */}
            {isMenuOpen && (
              <div
                style={styles.contextMenu}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  style={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCreateModal('', client.id);
                  }}
                >
                  <Plus size={13} color="var(--accent-primary)" />
                  <span>Nova Anotação para este Cliente</span>
                </button>
                <button
                  style={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenFolderModal('', client.id);
                  }}
                >
                  <FolderPlus size={13} color="var(--accent-primary)" />
                  <span>Nova Subpasta para este Cliente</span>
                </button>
                <button
                  style={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAttachFile('', client.id);
                  }}
                >
                  <Paperclip size={13} color="#a78bfa" />
                  <span>Anexar Arquivo para este Cliente</span>
                </button>
                <button
                  style={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenManageLinksModal(client);
                  }}
                >
                  <Link2 size={13} color="#38bdf8" />
                  <span>Gerenciar Anotações Vinculadas</span>
                </button>
                {onNavigateToClient && (
                  <button
                    style={styles.contextMenuItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      onNavigateToClient(client.id);
                    }}
                  >
                    <ExternalLink size={13} color="#10b981" />
                    <span>Abrir no Módulo de Clientes</span>
                  </button>
                )}
                <div style={styles.contextMenuDivider} />
                <button
                  style={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHideClientFromNotes(client.id);
                  }}
                >
                  <EyeOff size={13} color="#94a3b8" />
                  <span>Ocultar deste Painel</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Expanded Content: Client Subfolders & Direct Client Notes */}
        {!isCollapsed && (
          <div
            style={styles.folderNotesList}
            onDragOver={(e) => handleDragOverClient(e, client.id)}
            onDragLeave={(e) => handleDragLeaveClient(e, client.id)}
            onDrop={(e) => handleDropOnClient(e, client.id)}
          >
            {/* Subfolders of this client */}
            {clientSubFolders.map((subF) => renderFolderTreeNode(subF, depth + 1))}

            {/* Direct Notes of this client */}
            {clientNotes.map((n) => renderNoteRow(n, depth + 1, client))}

            {/* Empty Client Box */}
            {totalItemsCount === 0 && (
              <div
                onDragOver={(e) => handleDragOverClient(e, client.id)}
                onDragLeave={(e) => handleDragLeaveClient(e, client.id)}
                onDrop={(e) => handleDropOnClient(e, client.id)}
                style={{
                  ...styles.emptyFolderBox,
                  marginLeft: `${16 + depth * 14}px`,
                  backgroundColor: isDragOver ? `${clientColor}22` : 'rgba(255, 255, 255, 0.02)',
                  borderColor: isDragOver ? clientColor : 'rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    width: '100%',
                    flexWrap: 'wrap',
                    pointerEvents: isAnyDragging ? 'none' : 'auto',
                  }}
                >
                  <button
                    className="btn btn-secondary"
                    style={styles.emptyActionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCreateModal('', client.id);
                    }}
                    title="Criar anotação para este cliente"
                  >
                    <Plus size={11} color="var(--accent-primary)" />
                    <span>Nota</span>
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={styles.emptyActionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFolderModal('', client.id);
                    }}
                    title="Criar subpasta para este cliente"
                  >
                    <FolderPlus size={11} color="var(--accent-primary)" />
                    <span>Pasta</span>
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={styles.emptyActionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenManageLinksModal(client);
                    }}
                    title="Vincular anotações existentes"
                  >
                    <Link2 size={11} color="#38bdf8" />
                    <span>Vincular</span>
                  </button>
                </div>
                <span
                  style={{
                    ...styles.emptyDropHint,
                    color: isDragOver ? '#a5b4fc' : 'var(--text-muted)',
                    fontWeight: isDragOver ? '600' : 'normal',
                    pointerEvents: 'none',
                  }}
                >
                  {isDragOver ? 'Solte aqui para vincular ao cliente' : 'ou arraste pastas e arquivos aqui'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Render Recursive Folder Tree Node ───
  const renderFolderTreeNode = (folder: NoteFolder, depth: number = 0) => {
    const folderNotes = visibleNotes.filter((n) => n.folderId === folder.id);
    const subFolders = folders.filter((f) => f.parentId === folder.id && isFolderVisible(f));
    const isExpanded = !!expandedFolders[folder.id];
    const isCollapsed = !isExpanded;
    const isDragOver = dragOverFolderId === folder.id;
    const isDraggingThis = draggedFolderId === folder.id;
    const isMenuOpen = openMenuId === `folder_${folder.id}`;
    const totalItemsCount = folderNotes.length + subFolders.length;
    const folderOwnerClient = clients.find((c) => (c.linkedFolderIds || []).includes(folder.id) || folder.clientId === c.id);

    return (
      <div key={folder.id} style={{ marginBottom: '2px' }}>
        {/* Folder Row Header (Draggable & Drop Target) */}
        <div
          className="tree-hover-item"
          draggable
          onDragStart={(e) => handleDragStartFolder(e, folder.id)}
          onDragEnd={handleDragEndFolder}
          onDragOver={(e) => handleDragOverFolder(e, folder.id)}
          onDragLeave={(e) => handleDragLeaveFolder(e, folder.id)}
          onDrop={(e) => handleDropOnFolder(e, folder.id)}
          style={{
            ...styles.folderRow,
            paddingLeft: `${8 + depth * 14}px`,
            position: 'relative',
            backgroundColor: isDragOver ? 'rgba(99, 102, 241, 0.28)' : 'transparent',
            outline: isDragOver ? '1.5px solid var(--accent-primary)' : '1.5px solid transparent',
            boxShadow: isDragOver ? '0 0 10px rgba(99, 102, 241, 0.35)' : 'none',
            opacity: isDraggingThis ? 0.4 : 1,
            transition: 'all 0.12s ease',
          }}
          onClick={() => handleToggleFolderCollapse(folder.id)}
          title="Clique para expandir/recolher • Arraste para reordenar ou mover para outra pasta/cliente"
        >
          <GripVertical size={11} color="var(--text-muted)" style={{ cursor: 'grab', flexShrink: 0, opacity: 0.5 }} />

          <button
            style={styles.chevronBtn}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFolderCollapse(folder.id);
            }}
          >
            {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>

          {isCollapsed && !isDragOver ? (
            <Folder size={15} color={folder.color || 'var(--accent-primary)'} style={{ flexShrink: 0 }} />
          ) : (
            <FolderOpen size={15} color={isDragOver ? '#818cf8' : (folder.color || 'var(--accent-primary)')} style={{ flexShrink: 0 }} />
          )}

          <span
            style={{
              ...styles.folderName,
              color: isDragOver ? '#ffffff' : '#f1f5f9',
              fontWeight: isDragOver ? '700' : '600',
            }}
            title={folder.name}
          >
            {folder.name}
          </span>

          {isDragOver ? (
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: '700',
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
                padding: '1px 6px',
                borderRadius: '8px',
                letterSpacing: '0.2px',
                flexShrink: 0,
              }}
            >
              Mover aqui
            </span>
          ) : (
            <span style={styles.folderBadge}>
              {folderNotes.length}
            </span>
          )}

          {/* 3-Dots Menu Button (Visible on Hover) */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              className={`item-more-btn ${isMenuOpen ? 'active-menu' : ''}`}
              style={styles.moreButton}
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(isMenuOpen ? null : `folder_${folder.id}`);
              }}
              title="Opções da pasta"
            >
              <MoreVertical size={13} />
            </button>

            {/* Context Dropdown Menu */}
            {isMenuOpen && (
              <div
                style={styles.contextMenu}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  style={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditFolderModal(folder);
                  }}
                >
                  <Edit2 size={13} color="#38bdf8" />
                  <span>Editar Pasta (Nome, Cor & Destino)</span>
                </button>
                <button
                  style={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveFolderUp(folder);
                  }}
                >
                  <ArrowUp size={13} color="#a78bfa" />
                  <span>Subir Posição</span>
                </button>
                <button
                  style={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveFolderDown(folder);
                  }}
                >
                  <ArrowDown size={13} color="#a78bfa" />
                  <span>Descer Posição</span>
                </button>
                {folderOwnerClient && (
                  <button
                    style={styles.contextMenuItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlinkFolderFromClient(folder);
                    }}
                  >
                    <Unlink size={13} color="#f59e0b" />
                    <span>Desvincular de {folderOwnerClient.name}</span>
                  </button>
                )}
                {clients.length > 0 && !folderOwnerClient && (
                  <>
                    <div style={styles.contextMenuDivider} />
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '4px 8px 2px', fontWeight: '700', letterSpacing: '0.3px' }}>
                      🏢 VINCULAR A CLIENTE:
                    </div>
                    {clients.map((c) => (
                      <button
                        key={`assign_f_${c.id}`}
                        style={styles.contextMenuItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssignFolderToClient(folder, c.id);
                        }}
                      >
                        <Briefcase size={13} color={c.color || '#6366f1'} />
                        <span>{c.name}</span>
                      </button>
                    ))}
                    <div style={styles.contextMenuDivider} />
                  </>
                )}
                <button
                  style={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenFolderInExplorer(folder);
                  }}
                >
                  <FolderOpen size={13} color="var(--accent-primary)" />
                  <span>Abrir na Pasta do Windows</span>
                </button>
                <button
                  style={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCreateModal(folder.id);
                  }}
                >
                  <Plus size={13} color="var(--accent-primary)" />
                  <span>Nova Anotação aqui</span>
                </button>
                <button
                  style={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenFolderModal(folder.id);
                  }}
                >
                  <FolderPlus size={13} color="var(--accent-primary)" />
                  <span>Nova Subpasta</span>
                </button>
                <button
                  style={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleArchiveFolder(folder);
                  }}
                >
                  {folder.isArchived ? (
                    <>
                      <ArchiveRestore size={13} color="#34d399" />
                      <span style={{ color: '#34d399' }}>Desarquivar Pasta</span>
                    </>
                  ) : (
                    <>
                      <Archive size={13} color="#f59e0b" />
                      <span>Arquivar Pasta</span>
                    </>
                  )}
                </button>
                <div style={styles.contextMenuDivider} />
                <button
                  style={{ ...styles.contextMenuItem, color: '#f43f5e' }}
                  onClick={(e) => handleDeleteFolderAction(e, folder)}
                >
                  <Trash2 size={13} color="#f43f5e" />
                  <span>Excluir Pasta</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Expanded Folder Content: Subfolders & Direct Notes */}
        {!isCollapsed && (
          <div style={styles.folderNotesList}>
            {/* Subfolders */}
            {subFolders.map((subF) => renderFolderTreeNode(subF, depth + 1))}

            {/* Direct Notes */}
            {folderNotes.map((n) => renderNoteRow(n, depth + 1))}

            {/* Empty Folder Action Buttons */}
            {totalItemsCount === 0 && (
              <div
                onDragOver={(e) => handleDragOverFolder(e, folder.id)}
                onDragLeave={(e) => handleDragLeaveFolder(e, folder.id)}
                onDrop={(e) => handleDropOnFolder(e, folder.id)}
                style={{
                  ...styles.emptyFolderBox,
                  marginLeft: `${16 + depth * 14}px`,
                  backgroundColor: isDragOver ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                  borderColor: isDragOver ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                  <button
                    className="btn btn-secondary"
                    style={styles.emptyActionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCreateModal(folder.id);
                    }}
                    title="Criar anotação dentro desta pasta"
                  >
                    <Plus size={11} color="var(--accent-primary)" />
                    <span>Nota</span>
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={styles.emptyActionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFolderModal(folder.id);
                    }}
                    title="Criar subpasta dentro desta pasta"
                  >
                    <FolderPlus size={11} color="var(--accent-primary)" />
                    <span>Subpasta</span>
                  </button>
                </div>
                <span
                  style={{
                    ...styles.emptyDropHint,
                    color: isDragOver ? '#a5b4fc' : 'var(--text-muted)',
                    fontWeight: isDragOver ? '600' : 'normal',
                  }}
                >
                  {isDragOver ? 'Solte aqui para mover para esta pasta' : 'ou arraste arquivos aqui'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Inline styles for hover-based 3-dots appearance */}
      <style>{`
        .tree-hover-item:hover .item-more-btn {
          opacity: 1 !important;
          visibility: visible !important;
        }
        .item-more-btn {
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.15s ease;
        }
        .item-more-btn.active-menu {
          opacity: 1 !important;
          visibility: visible !important;
        }
      `}</style>

      {/* ── Sidebar ── */}
      {!isSidebarCollapsed && (
        <div style={styles.sidebar}>
          {/* Header with Title & Action Buttons */}
          <div style={styles.sidebarHeader}>
            <span style={styles.sidebarTitle}>
              <FolderCheck size={16} color="var(--accent-primary)" /> Anotações
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '5px 7px', fontSize: '11px', gap: '3px' }}
                onClick={() => handleOpenFolderModal('')}
                title="Criar nova pasta raiz"
              >
                <FolderPlus size={13} color="var(--accent-primary)" />
                <span>Pasta</span>
              </button>
              <button
                className="btn btn-primary"
                style={{ padding: '5px 9px', fontSize: '11px', gap: '3px' }}
                onClick={() => handleOpenCreateModal('')}
                title="Criar nova anotação ou anexar arquivo"
              >
                <Plus size={13} />
                <span>Nota</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                title="Recolher painel de pastas"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                }}
              >
                <PanelLeftClose size={15} />
              </button>
            </div>
          </div>

          {/* Active vs Archived Filter Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-subtle)',
              padding: '0 8px',
              backgroundColor: 'rgba(0,0,0,0.15)',
            }}
          >
            <button
              type="button"
              onClick={() => setShowArchived(false)}
              style={{
                flex: 1,
                padding: '7px 4px',
                fontSize: '11px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: !showArchived ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: !showArchived ? '#a5b4fc' : 'var(--text-muted)',
                borderBottom: !showArchived ? '2px solid var(--accent-primary)' : '2px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              Ativas ({activeNotesCount})
            </button>
            <button
              type="button"
              onClick={() => setShowArchived(true)}
              style={{
                flex: 1,
                padding: '7px 4px',
                fontSize: '11px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: showArchived ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: showArchived ? '#a5b4fc' : 'var(--text-muted)',
                borderBottom: showArchived ? '2px solid var(--accent-primary)' : '2px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              Arquivadas ({archivedNotesCount})
            </button>
          </div>

          {/* Tree / List of Folders & Notes */}
          <div style={styles.treeContainer}>
            {visibleNotes.length === 0 && folders.length === 0 && clients.length === 0 ? (
              <div style={styles.emptyList}>
                <FileText size={32} color="var(--text-muted)" />
                <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  {showArchived ? 'Nenhuma anotação arquivada.' : 'Nenhuma anotação criada.'}
                  <br />
                  {!showArchived && 'Clique em "+ Nota" ou "+ Pasta".'}
                </p>
              </div>
            ) : (
              <>
                {/* ── 🏢 Pastas de Clientes & Assets (JSM) ── */}
                {clients.length > 0 && !showArchived && (
                  <div style={{ marginBottom: '10px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px 4px',
                        marginBottom: '3px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Briefcase size={12} color="var(--accent-primary)" />
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          Clientes & Assets
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <button
                          type="button"
                          onClick={handleOpenManageVisibleClients}
                          title="Selecionar quais clientes aparecem aqui"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--text-primary)';
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-muted)';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <SlidersHorizontal size={11} />
                        </button>
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: '700',
                            color: 'var(--text-muted)',
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            padding: '1px 5px',
                            borderRadius: '10px',
                          }}
                        >
                          {displayedClients.length === clients.length ? clients.length : `${displayedClients.length}/${clients.length}`}
                        </span>
                      </div>
                    </div>
                    {displayedClients.map((client) => renderClientFolderNode(client, 0))}
                  </div>
                )}

                {/* ── Pastas Customizadas em Árvore ── */}
                {rootFolders.map((folder) => renderFolderTreeNode(folder, 0))}

                {/* ── Notas Soltas na Raiz (Sem Pasta e Sem Cliente) ── */}
                <div
                  onDragOver={(e) => handleDragOverFolder(e, '__ROOT__')}
                  onDragLeave={(e) => handleDragLeaveFolder(e, '__ROOT__')}
                  onDrop={(e) => handleDropOnFolder(e, '__ROOT__')}
                  style={{
                    marginTop: (folders.length > 0 || clients.length > 0) && unorganizedNotes.length > 0 ? '6px' : '0',
                    paddingTop: (folders.length > 0 || clients.length > 0) && unorganizedNotes.length > 0 ? '6px' : '0',
                    borderTop:
                      (folders.length > 0 || clients.length > 0) && unorganizedNotes.length > 0
                        ? '1px solid var(--border-subtle)'
                        : 'none',
                    backgroundColor: dragOverFolderId === '__ROOT__' ? 'rgba(99,102,241,0.22)' : 'transparent',
                    outline: dragOverFolderId === '__ROOT__' ? '1.5px dashed var(--accent-primary)' : 'none',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  {unorganizedNotes.map((n) => renderNoteRow(n, 0))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Main Editor Area ── */}
      {activeNote ? (
        <div style={styles.editorArea}>
          {/* Top Bar */}
          <div style={styles.topBar}>
            {isSidebarCollapsed && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsSidebarCollapsed(false)}
                title="Expandir painel de pastas"
                style={{ padding: '5px 8px', fontSize: '11px', gap: '5px' }}
              >
                <PanelLeftOpen size={14} color="var(--accent-primary)" />
                <span>Pastas</span>
              </button>
            )}

            <input
              type="text"
              className="input-field"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              style={styles.titleInput}
              placeholder="Título da Anotação..."
              disabled={isFileNote(activeNote)}
            />

            {/* Client Asset Badge & Quick Action */}
            {activeNoteClient && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  backgroundColor: `${activeNoteClient.color || '#6366f1'}1f`,
                  border: `1px solid ${activeNoteClient.color || '#6366f1'}55`,
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#f8fafc',
                  flexShrink: 0,
                }}
                title={`Vinculado ao Cliente: ${activeNoteClient.name}`}
              >
                <Briefcase size={12} color={activeNoteClient.color || '#6366f1'} />
                <span style={{ fontWeight: '600', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeNoteClient.name}
                </span>
                {onNavigateToClient && (
                  <button
                    type="button"
                    onClick={() => onNavigateToClient(activeNoteClient.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0 2px',
                      color: activeNoteClient.color || '#6366f1',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Abrir detalhes no Módulo de Clientes"
                  >
                    <ExternalLink size={12} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleUnlinkNoteFromClient(activeNote, activeNoteClient)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0 2px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Desvincular nota deste cliente"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Folder / Client Selector Dropdown */}
            <div style={styles.folderSelectorWrapper} title="Mover anotação para outra pasta ou cliente">
              <Folder size={13} color={activeNoteClient ? (activeNoteClient.color || '#6366f1') : (activeNoteFolder?.color || 'var(--text-muted)')} />
              <select
                value={activeNoteClient ? `client_${activeNoteClient.id}` : (activeNote.folderId || '')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('client_')) {
                    const cId = val.replace('client_', '');
                    handleAssignNoteToClient(activeNote, cId);
                  } else {
                    if (activeNoteClient) {
                      handleUnlinkNoteFromClient(activeNote, activeNoteClient);
                    }
                    handleChangeNoteFolder(val);
                  }
                }}
                style={styles.folderSelect}
              >
                <option value="">📁 Sem Pasta / Sem Cliente</option>
                {clients.length > 0 && (
                  <optgroup label="🏢 Clientes & Assets">
                    {clients.map((c) => (
                      <option key={`top_client_${c.id}`} value={`client_${c.id}`}>
                        🏢 {c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="📁 Pastas de Anotações">
                  {allFolderOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {!isFileNote(activeNote) && (
                <span style={styles.saveBadge}>
                  <Save size={12} /> {saveStatus}
                </span>
              )}
              {/* Badge com tamanho do arquivo/anotação */}
              <div
                style={styles.fileSizeBadge}
                title={`Tamanho em disco: ${getFormattedNoteSize(activeNote, content)}`}
              >
                <HardDrive size={12} color="var(--accent-primary)" />
                <span>{getFormattedNoteSize(activeNote, content)}</span>
              </div>

              {/* Abrir na Pasta do Windows */}
              {activeNote.filePath && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleShowInFolder(activeNote)}
                  title="Abrir local do arquivo no Windows Explorer"
                  style={{ padding: '5px 8px', fontSize: '11px', gap: '4px' }}
                >
                  <Folder size={13} />
                  <span>Pasta</span>
                </button>
              )}

              {/* Exportar Anotação */}
              {!isFileNote(activeNote) && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleOpenExportModal(activeNote)}
                  title="Exportar anotação (HTML, Markdown, TXT, PDF)"
                  style={{ padding: '5px 8px', fontSize: '11px', gap: '4px' }}
                >
                  <Download size={13} />
                  <span>Exportar</span>
                </button>
              )}

              {/* Arquivar / Desarquivar */}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleToggleArchiveNote(activeNote)}
                title={activeNote.isArchived ? 'Desarquivar anotação' : 'Arquivar anotação'}
                style={{ padding: '5px 8px', fontSize: '11px', gap: '4px' }}
              >
                {activeNote.isArchived ? (
                  <>
                    <ArchiveRestore size={13} color="#34d399" />
                    <span style={{ color: '#34d399' }}>Desarquivar</span>
                  </>
                ) : (
                  <>
                    <Archive size={13} color="#f59e0b" />
                    <span>Arquivar</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                title="Excluir anotação"
                style={{ padding: '5px 8px' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Main Content Pane: Rich Text Editor OR File Document Viewer */}
          <div style={styles.editorWrapper}>
            {isFileNote(activeNote) ? (
              <FileViewerModal
                key={activeNote.id}
                filePath={activeNote.filePath}
                onClose={() => setActiveNote(null)}
                embedded={true}
              />
            ) : (
              <RichTextEditor
                key={activeNote.id}
                content={content}
                onChange={(html) => setContent(html)}
              />
            )}
          </div>
        </div>
      ) : (
        <div style={styles.noNoteSelected}>
          <Sparkles size={56} color="var(--accent-primary)" />
          <h2 style={{ marginTop: '16px', color: '#ffffff', fontSize: '20px', fontWeight: '800' }}>
            Nenhuma Anotação Selecionada
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '13px' }}>
            Selecione uma anotação na lista lateral ou crie uma nova.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button className="btn btn-secondary" onClick={() => handleOpenFolderModal('')}>
              <FolderPlus size={15} /> Criar Pasta
            </button>
            <button className="btn btn-primary" onClick={() => handleOpenCreateModal('')}>
              <Plus size={15} /> Nova Anotação
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Criar Nova Anotação / Anexar Arquivo ── */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <Plus size={18} color="var(--accent-primary)" /> Nova Anotação ou Documento
              </h3>
              <button className="btn-icon" onClick={() => setIsCreateModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Destino (Pasta ou Cliente / Asset) */}
            <div style={{ margin: '14px 0 10px' }}>
              <label style={styles.modalLabel}>Destino (Pasta ou Cliente / Asset):</label>
              <select
                value={modalTargetClientId ? `client_${modalTargetClientId}` : (modalTargetFolderId || '')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('client_')) {
                    setModalTargetClientId(val.replace('client_', ''));
                    setModalTargetFolderId('');
                  } else {
                    setModalTargetClientId('');
                    setModalTargetFolderId(val);
                  }
                }}
                className="input-field"
                style={{ width: '100%', fontSize: '13px' }}
              >
                <option value="">📁 Sem Pasta (Raiz Geral)</option>
                {clients.length > 0 && (
                  <optgroup label="🏢 Clientes & Assets">
                    {clients.map((c) => (
                      <option key={`modal_c_${c.id}`} value={`client_${c.id}`}>
                        🏢 {c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="📁 Pastas de Anotações">
                  {allFolderOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Quick Option: Attach Local File */}
            <div
              onClick={() => handleAttachFile(modalTargetFolderId, modalTargetClientId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                border: '1px dashed var(--accent-primary)',
                cursor: 'pointer',
                marginBottom: '14px',
              }}
            >
              <Paperclip size={20} color="var(--accent-primary)" />
              <div>
                <strong style={{ fontSize: '13px', color: '#ffffff', display: 'block' }}>
                  Anexar Arquivo Local
                </strong>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                  PDF, Word, Excel, CSV ou Imagens
                </p>
              </div>
            </div>

            <div style={{ margin: '10px 0', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
              ── OU CRIE UMA ANOTAÇÃO EM TEXTO ──
            </div>

            <form onSubmit={handleConfirmCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={styles.modalLabel}>Título da Anotação de Texto:</label>
                <input
                  type="text"
                  className="input-field"
                  value={modalTitleInput}
                  onChange={(e) => setModalTitleInput(e.target.value)}
                  placeholder="Ex: Anotações da Reunião..."
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreating}>
                  <FileText size={15} />
                  {isCreating ? 'Criando...' : 'Criar Anotação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Criar Nova Pasta / Subpasta ── */}
      {isFolderModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFolderModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '420px', padding: '22px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <FolderPlus size={18} color="var(--accent-primary)" />
                <span>{folderToEdit ? 'Editar Pasta' : 'Criar Nova Pasta'}</span>
              </h3>
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  setIsFolderModalOpen(false);
                  setFolderToEdit(null);
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmCreateFolder} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={styles.modalLabel}>Nome da Pasta:</label>
                <input
                  type="text"
                  className="input-field"
                  value={folderNameInput}
                  onChange={(e) => setFolderNameInput(e.target.value)}
                  placeholder="Ex: Projetos, Ideias, Financeiro..."
                  autoFocus
                />
              </div>

              <div>
                <label style={styles.modalLabel}>Localização / Destino (Pasta Raiz, Cliente ou Subpasta):</label>
                <select
                  value={folderParentIdInput}
                  onChange={(e) => setFolderParentIdInput(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '13px' }}
                >
                  <option value="">📁 Nenhuma (Pasta Raiz Livre)</option>
                  {clients.length > 0 && (
                    <optgroup label="🏢 Clientes & Assets">
                      {clients.map((c) => (
                        <option key={`f_modal_c_${c.id}`} value={`client_${c.id}`}>
                          🏢 {c.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="📁 Pastas e Subpastas">
                    {folderParentOptions
                      .filter((opt) => !folderToEdit || opt.id !== folderToEdit.id)
                      .map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label style={styles.modalLabel}>Cor da Pasta:</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e'].map((col) => (
                    <div
                      key={col}
                      onClick={() => setFolderColorInput(col)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: col,
                        cursor: 'pointer',
                        border: folderColorInput === col ? '2px solid #ffffff' : '2px solid transparent',
                        transform: folderColorInput === col ? 'scale(1.15)' : 'none',
                        transition: 'all 0.12s ease',
                      }}
                      title={col}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsFolderModalOpen(false);
                    setFolderToEdit(null);
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreatingFolder || !folderNameInput.trim()}>
                  {folderToEdit ? <Save size={15} /> : <FolderPlus size={15} />}
                  {isCreatingFolder ? 'Salvando...' : folderToEdit ? 'Salvar Alterações' : 'Criar Pasta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Exportar Anotação Formatada (HTML, Markdown, TXT, PDF) ── */}
      {isExportModalOpen && (
        <div className="modal-overlay" onClick={() => setIsExportModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '440px', padding: '22px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <Download size={18} color="var(--accent-primary)" />
                <span>Exportar Anotação</span>
              </h3>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsExportModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: '0 0 6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Escolha o formato desejado para exportar <strong>{noteToExport?.title || activeNote?.title}</strong>:
              </p>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => (noteToExport || activeNote) && handleExportAsHtml(noteToExport || activeNote!)}
                style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '13px', gap: '12px' }}
              >
                <FileCode size={18} color="#38bdf8" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', color: '#fff' }}>HTML Formatado (.html)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Preserva cores, tabelas, imagens e estilos de texto
                  </div>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => (noteToExport || activeNote) && handleExportAsMarkdown(noteToExport || activeNote!)}
                style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '13px', gap: '12px' }}
              >
                <FileText size={18} color="#c084fc" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', color: '#fff' }}>Documento Markdown (.md)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Compatível com GitHub, Notion e editores Markdown
                  </div>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => (noteToExport || activeNote) && handleExportAsTxt(noteToExport || activeNote!)}
                style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '13px', gap: '12px' }}
              >
                <FileText size={18} color="#94a3b8" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', color: '#fff' }}>Texto Puro (.txt)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Texto limpo sem formatação</div>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handlePrintPdf(noteToExport || activeNote || undefined)}
                style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '13px', gap: '12px' }}
              >
                <Printer size={18} color="#f59e0b" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', color: '#fff' }}>Imprimir / Salvar em PDF</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Abre diálogo de impressão do sistema
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmação de Exclusão de Pasta (Com Opção de Excluir Conteúdo ou Manter) ── */}
      {folderToDelete && (
        <div className="modal-overlay" onClick={() => !isDeletingFolder && setFolderToDelete(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '460px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h3 style={{ ...styles.modalTitle, color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={20} color="#f43f5e" />
                <span>Excluir Pasta</span>
              </h3>
              <button
                type="button"
                className="btn-icon"
                disabled={isDeletingFolder}
                onClick={() => setFolderToDelete(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ marginTop: '16px', color: 'var(--text-main, #e2e8f0)', fontSize: '13.5px', lineHeight: '1.6' }}>
              <p style={{ margin: 0 }}>
                Você está prestes a excluir a pasta <strong>"{folderToDelete.name}"</strong> do aplicativo e do Windows Explorer.
              </p>
              {(() => {
                const stats = getFolderStats(folderToDelete.id);
                if (stats.totalNotesCount > 0 || stats.subFoldersCount > 0) {
                  return (
                    <div
                      style={{
                        margin: '14px 0',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(244, 63, 94, 0.1)',
                        border: '1px solid rgba(244, 63, 94, 0.25)',
                        fontSize: '12.5px',
                      }}
                    >
                      <strong style={{ color: '#fda4af', display: 'block', marginBottom: '4px' }}>
                        Conteúdo detectado nesta pasta:
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-muted, #94a3b8)' }}>
                        {stats.totalNotesCount > 0 && (
                          <li>{stats.totalNotesCount} {stats.totalNotesCount === 1 ? 'anotação/arquivo' : 'anotações/arquivos'}</li>
                        )}
                        {stats.subFoldersCount > 0 && (
                          <li>{stats.subFoldersCount} {stats.subFoldersCount === 1 ? 'subpasta' : 'subpastas'}</li>
                        )}
                      </ul>
                    </div>
                  );
                }
                return (
                  <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '12.5px', marginTop: '8px' }}>
                    Esta pasta está vazia.
                  </p>
                );
              })()}
              <p style={{ marginTop: '12px', marginBottom: '4px', fontSize: '13px', fontWeight: '600' }}>
                Como você deseja excluir?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px' }}>
              <button
                type="button"
                className="btn btn-danger"
                disabled={isDeletingFolder}
                onClick={() => handleConfirmDeleteFolder(true)}
                style={{ justifyContent: 'center', padding: '10px 14px', fontSize: '13px', fontWeight: '600' }}
              >
                <Trash2 size={15} />
                <span>{isDeletingFolder ? 'Excluindo...' : 'Excluir Pasta e Todo o Conteúdo'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={isDeletingFolder}
                onClick={() => handleConfirmDeleteFolder(false)}
                style={{ justifyContent: 'center', padding: '10px 14px', fontSize: '13px' }}
                title="Move os arquivos e subpastas para o nível acima e exclui apenas a pasta física"
              >
                <FolderOpen size={15} color="var(--accent-primary)" />
                <span>Excluir Apenas a Pasta (Manter Conteúdo)</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={isDeletingFolder}
                onClick={() => setFolderToDelete(null)}
                style={{ justifyContent: 'center', padding: '8px 14px', fontSize: '12px', opacity: 0.8 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Gerenciar Anotações Vinculadas ao Cliente ── */}
      {clientToManageLinks && (
        <div className="modal-overlay" onClick={() => setClientToManageLinks(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={18} color={clientToManageLinks.color || 'var(--accent-primary)'} />
                <h3 style={styles.modalTitle}>
                  Gerenciar Documentos do Cliente
                </h3>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setClientToManageLinks(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0 12px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: `${clientToManageLinks.color || '#6366f1'}22`,
                  color: clientToManageLinks.color || '#6366f1',
                  border: `1px solid ${clientToManageLinks.color || '#6366f1'}44`,
                }}
              >
                {clientToManageLinks.name}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Selecione as pastas e anotações que pertencem a este cliente.
              </span>
            </div>

            {/* Abas: Pastas vs Anotações */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <button
                type="button"
                className={`btn ${clientLinksActiveTab === 'folders' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setClientLinksActiveTab('folders')}
                style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
              >
                <Folder size={14} />
                <span>Pastas ({(clientToManageLinks.linkedFolderIds || []).length})</span>
              </button>
              <button
                type="button"
                className={`btn ${clientLinksActiveTab === 'notes' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setClientLinksActiveTab('notes')}
                style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
              >
                <FileText size={14} />
                <span>Anotações & Arquivos ({(clientToManageLinks.linkedNoteIds || []).length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <Search
                size={14}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                className="input-field"
                value={clientLinksSearchQuery}
                onChange={(e) => setClientLinksSearchQuery(e.target.value)}
                placeholder={clientLinksActiveTab === 'folders' ? 'Buscar pastas...' : 'Buscar anotações ou arquivos...'}
                style={{ paddingLeft: '32px', width: '100%', fontSize: '12.5px' }}
                autoFocus
              />
            </div>

            {/* Content per Tab */}
            {(() => {
              const query = clientLinksSearchQuery.toLowerCase().trim();

              if (clientLinksActiveTab === 'folders') {
                const filteredFolders = folders.filter((f) => !query || f.name.toLowerCase().includes(query));
                const filteredFolderIds = filteredFolders.map((f) => f.id);
                const linkedFolderIds = clientToManageLinks.linkedFolderIds || [];
                const selectedCount = folders.filter((f) => linkedFolderIds.includes(f.id) || f.clientId === clientToManageLinks.id).length;

                return (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 0 8px',
                        fontSize: '11.5px',
                        color: 'var(--text-muted)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      <span>
                        <strong style={{ color: '#fff' }}>{selectedCount}</strong> de {folders.length} pastas selecionadas
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleSelectAllLinksInModal(filteredFolderIds)}
                          style={{ padding: '3px 7px', fontSize: '10.5px' }}
                        >
                          Marcar Filtradas
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleClearAllLinksInModal(filteredFolderIds)}
                          style={{ padding: '3px 7px', fontSize: '10.5px' }}
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        overflowY: 'auto',
                        flex: 1,
                        maxHeight: '340px',
                        margin: '10px 0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        paddingRight: '4px',
                      }}
                    >
                      {filteredFolders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                          Nenhuma pasta encontrada.
                        </div>
                      ) : (
                        filteredFolders.map((f) => {
                          const isLinked = (clientToManageLinks.linkedFolderIds || []).includes(f.id) || f.clientId === clientToManageLinks.id;
                          const fNotesCount = notes.filter((n) => n.folderId === f.id).length;

                          return (
                            <div
                              key={f.id}
                              onClick={() => handleToggleFolderLinkInModal(f.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                backgroundColor: isLinked ? 'rgba(99, 102, 241, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                                border: isLinked ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                                cursor: 'pointer',
                                transition: 'all 0.1s ease',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isLinked}
                                onChange={() => {}}
                                style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                              />
                              <Folder size={16} color={f.color || 'var(--accent-primary)'} />
                              <span
                                style={{
                                  fontSize: '12.5px',
                                  fontWeight: isLinked ? '600' : 'normal',
                                  color: isLinked ? '#ffffff' : '#cbd5e1',
                                  flex: 1,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {f.name}
                              </span>
                              <span style={styles.folderBadge}>
                                {fNotesCount} {fNotesCount === 1 ? 'item' : 'itens'}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                );
              }

              // Aba de Anotações
              const filteredNotes = notes.filter((n) => !query || n.title.toLowerCase().includes(query));
              const filteredNoteIds = filteredNotes.map((n) => n.id);
              const linkedIds = clientToManageLinks.linkedNoteIds || [];
              const selectedCount = notes.filter((n) => linkedIds.includes(n.id) || n.clientId === clientToManageLinks.id).length;

              return (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 0 8px',
                      fontSize: '11.5px',
                      color: 'var(--text-muted)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span>
                      <strong style={{ color: '#fff' }}>{selectedCount}</strong> de {notes.length} anotações selecionadas
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleSelectAllLinksInModal(filteredNoteIds)}
                        style={{ padding: '3px 7px', fontSize: '10.5px' }}
                      >
                        Marcar Filtradas
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleClearAllLinksInModal(filteredNoteIds)}
                        style={{ padding: '3px 7px', fontSize: '10.5px' }}
                      >
                        Desmarcar
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      overflowY: 'auto',
                      flex: 1,
                      maxHeight: '340px',
                      margin: '10px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      paddingRight: '4px',
                    }}
                  >
                    {filteredNotes.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                        Nenhuma anotação encontrada para a busca.
                      </div>
                    ) : (
                      filteredNotes.map((n) => {
                        const isLinked = (clientToManageLinks.linkedNoteIds || []).includes(n.id) || n.clientId === clientToManageLinks.id;
                        const isFile = isFileNote(n);
                        const fileExt = (n.title.split('.').pop() || '').toUpperCase();

                        return (
                          <div
                            key={n.id}
                            onClick={() => handleToggleNoteLinkInModal(n.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              backgroundColor: isLinked ? 'rgba(99, 102, 241, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                              border: isLinked ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                              cursor: 'pointer',
                              transition: 'all 0.1s ease',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isLinked}
                              onChange={() => {}}
                              style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                            />
                            {renderNoteIcon(n, false)}
                            <span
                              style={{
                                fontSize: '12.5px',
                                fontWeight: isLinked ? '600' : 'normal',
                                color: isLinked ? '#ffffff' : '#cbd5e1',
                                flex: 1,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={n.title}
                            >
                              {n.title}
                            </span>
                            {isFile && (
                              <span style={styles.fileBadge}>
                                {fileExt}
                              </span>
                            )}
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
                              {new Date(n.updatedAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              );
            })()}

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setClientToManageLinks(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveClientLinksModal}
                style={{ gap: '6px' }}
              >
                <Check size={14} />
                <span>Salvar Vínculos</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Selecionar Quais Clientes Aparecem nas Anotações ── */}
      {isManageVisibleClientsModalOpen && (
        <div className="modal-overlay" onClick={() => setIsManageVisibleClientsModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '500px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={18} color="var(--accent-primary)" />
                <h3 style={styles.modalTitle}>
                  Exibir Clientes nas Anotações
                </h3>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsManageVisibleClientsModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '8px 0 12px' }}>
              Selecione quais clientes e assets corporativos devem ser exibidos como pastas no painel lateral de anotações.
            </p>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <Search
                size={14}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                className="input-field"
                value={manageClientsSearch}
                onChange={(e) => setManageClientsSearch(e.target.value)}
                placeholder="Buscar cliente..."
                style={{ paddingLeft: '32px', width: '100%', fontSize: '12.5px' }}
                autoFocus
              />
            </div>

            {(() => {
              const query = manageClientsSearch.toLowerCase().trim();
              const filteredClients = clients.filter(
                (c) => !query || c.name.toLowerCase().includes(query) || (c.description && c.description.toLowerCase().includes(query))
              );
              const filteredIds = filteredClients.map((c) => c.id);
              const selectedCount = tempVisibleClientIds.length;

              return (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 0 8px',
                      fontSize: '11.5px',
                      color: 'var(--text-muted)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span>
                      <strong style={{ color: '#fff' }}>{selectedCount}</strong> de {clients.length} clientes selecionados
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleSelectAllVisibleClientsInModal(filteredIds)}
                        style={{ padding: '3px 7px', fontSize: '10.5px' }}
                      >
                        Marcar Todos
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleClearAllVisibleClientsInModal(filteredIds)}
                        style={{ padding: '3px 7px', fontSize: '10.5px' }}
                      >
                        Desmarcar Todos
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      overflowY: 'auto',
                      flex: 1,
                      maxHeight: '340px',
                      margin: '10px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      paddingRight: '4px',
                    }}
                  >
                    {filteredClients.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                        Nenhum cliente encontrado.
                      </div>
                    ) : (
                      filteredClients.map((c) => {
                        const isSelected = tempVisibleClientIds.includes(c.id);
                        const linkedNotesCount = (c.linkedNoteIds || []).length + notes.filter((n) => n.clientId === c.id).length;
                        const clientColor = c.color || '#6366f1';

                        return (
                          <div
                            key={c.id}
                            onClick={() => handleToggleVisibleClientInModal(c.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                              border: isSelected ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                              cursor: 'pointer',
                              transition: 'all 0.1s ease',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                            />
                            <div
                              style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: clientColor,
                                flexShrink: 0,
                              }}
                            />
                            <Briefcase size={15} color={clientColor} style={{ flexShrink: 0 }} />
                            <span
                              style={{
                                fontSize: '12.5px',
                                fontWeight: isSelected ? '600' : 'normal',
                                color: isSelected ? '#ffffff' : '#cbd5e1',
                                flex: 1,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={c.name}
                            >
                              {c.name}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                backgroundColor: `${clientColor}22`,
                                color: clientColor,
                                border: `1px solid ${clientColor}44`,
                              }}
                            >
                              ASSET
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                              {linkedNotesCount} {linkedNotesCount === 1 ? 'item' : 'itens'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              );
            })()}

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsManageVisibleClientsModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveVisibleClientsModal}
                style={{ gap: '6px' }}
              >
                <Check size={14} />
                <span>Salvar Seleção</span>
              </button>
            </div>
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
    width: '270px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    padding: '14px 10px',
    gap: '10px',
    flexShrink: 0,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 4px 6px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  sidebarTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: '800',
    color: '#ffffff',
  },
  treeContainer: {
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    flex: 1,
    paddingRight: '2px',
  },
  emptyList: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '40px',
  },
  folderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 0.12s ease',
  },
  chevronBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderName: {
    flex: 1,
    fontSize: '12px',
    fontWeight: '700',
    color: '#f1f5f9',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  folderBadge: {
    fontSize: '10px',
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: 'var(--text-muted)',
    padding: '1px 6px',
    borderRadius: '10px',
  },
  moreButton: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    zIndex: 9999,
    minWidth: '150px',
    backgroundColor: '#1e1e2e',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '4px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  contextMenuItem: {
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '11.5px',
    fontWeight: '600',
    padding: '6px 8px',
    borderRadius: '5px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'background-color 0.1s ease',
  },
  contextMenuDivider: {
    height: '1px',
    backgroundColor: 'var(--border-subtle)',
    margin: '2px 0',
  },
  folderNotesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginTop: '2px',
  },
  emptyFolderBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
    padding: '4px 8px 6px',
    margin: '2px 4px 4px',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: '6px',
    border: '1px dashed rgba(255,255,255,0.08)',
  },
  emptyActionBtn: {
    flex: 1,
    padding: '3px 6px',
    fontSize: '10.5px',
    fontWeight: '600',
    gap: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
  },
  emptyDropHint: {
    fontSize: '9.5px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    textAlign: 'center',
    width: '100%',
    opacity: 0.7,
  },
  noteRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    height: '32px',
    padding: '0 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
    backgroundColor: 'transparent',
    borderLeft: '3px solid transparent',
  },
  activeNoteRow: {
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    borderLeft: '3px solid var(--accent-primary)',
    color: '#ffffff',
  },
  noteTitle: {
    flex: 1,
    fontSize: '12.5px',
    fontWeight: '500',
    color: '#f1f5f9',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  fileBadge: {
    fontSize: '9px',
    fontWeight: '800',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    color: 'var(--accent-primary)',
    padding: '1px 4px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  editorArea: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 18px',
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: 'rgba(0,0,0,0.15)',
    flexShrink: 0,
  },
  titleInput: {
    flex: 1,
    fontSize: '15px',
    fontWeight: '700',
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#ffffff',
    padding: '0',
  },
  folderSelectorWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: '4px 8px',
    borderRadius: '6px',
    border: '1px solid var(--border-subtle)',
  },
  folderSelect: {
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    maxWidth: '220px',
  },
  saveBadge: { display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' },
  fileSizeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-subtle)',
    padding: '3px 8px',
    borderRadius: '6px',
    whiteSpace: 'nowrap',
  },
  editorWrapper: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  noNoteSelected: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '800', color: '#ffffff', margin: 0 },
  modalLabel: { display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' },
};
