import React, { useCallback, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table';
import { TableHeader } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Undo,
  Redo,
  Highlighter,
  Type,
  RowsIcon,
  Columns2,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  XSquare,
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

// ─── Shared sub-components ─────────────────────────────────────────────────

const ToolbarDivider = () => (
  <div
    style={{
      width: '1px',
      height: '20px',
      backgroundColor: 'rgba(255,255,255,0.12)',
      margin: '0 4px',
      flexShrink: 0,
    }}
  />
);

const Btn = ({
  onClick,
  active,
  danger,
  title,
  children,
  disabled,
  size = 30,
}: {
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  title?: string;
  children: React.ReactNode;
  disabled?: boolean;
  size?: number;
}) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: '6px',
      border: 'none',
      cursor: disabled ? 'default' : 'pointer',
      backgroundColor: danger
        ? 'rgba(239,68,68,0.15)'
        : active
        ? 'rgba(99,102,241,0.3)'
        : 'transparent',
      color: danger ? '#f87171' : active ? '#a5b4fc' : disabled ? '#4a5568' : '#cbd5e1',
      transition: 'all 0.15s ease',
      flexShrink: 0,
    }}
    onMouseEnter={(e) => {
      if (disabled) return;
      (e.currentTarget as HTMLButtonElement).style.backgroundColor = danger
        ? 'rgba(239,68,68,0.25)'
        : active
        ? 'rgba(99,102,241,0.4)'
        : 'rgba(255,255,255,0.08)';
    }}
    onMouseLeave={(e) => {
      if (disabled) return;
      (e.currentTarget as HTMLButtonElement).style.backgroundColor = danger
        ? 'rgba(239,68,68,0.15)'
        : active
        ? 'rgba(99,102,241,0.3)'
        : 'transparent';
    }}
  >
    {children}
  </button>
);

// ─── Table context toolbar ─────────────────────────────────────────────────

const TableToolbar = ({ editor }: { editor: any }) => {
  if (!editor || editor.isDestroyed) return null;
  let inTable = false;
  try {
    inTable = editor.isActive('table');
  } catch {
    inTable = false;
  }
  if (!inTable) return null;

  return (
    <div style={tableToolbarStyles.bar}>
      <span style={tableToolbarStyles.label}>
        <TableIcon size={13} /> Tabela
      </span>

      <div style={tableToolbarStyles.group}>
        <Btn
          onClick={() => editor.chain().focus().addRowBefore().run()}
          title="Inserir linha acima"
          size={28}
        >
          <ChevronUp size={13} />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().addRowAfter().run()}
          title="Inserir linha abaixo"
          size={28}
        >
          <ChevronDown size={13} />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().deleteRow().run()}
          title="Remover linha atual"
          danger
          size={28}
        >
          <RowsIcon size={13} />
        </Btn>
      </div>

      <div style={tableToolbarStyles.sep} />

      <div style={tableToolbarStyles.group}>
        <Btn
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          title="Inserir coluna à esquerda"
          size={28}
        >
          <Plus size={13} />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          title="Inserir coluna à direita"
          size={28}
        >
          <Columns2 size={13} />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().deleteColumn().run()}
          title="Remover coluna atual"
          danger
          size={28}
        >
          <XSquare size={13} />
        </Btn>
      </div>

      <div style={tableToolbarStyles.sep} />

      <Btn
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Deletar tabela inteira"
        danger
        size={28}
      >
        <Trash2 size={13} />
      </Btn>
      <span style={{ fontSize: '11px', color: '#f87171', fontWeight: '600', marginLeft: '2px' }}>
        Deletar tabela
      </span>
    </div>
  );
};

const tableToolbarStyles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 14px',
    backgroundColor: 'rgba(56,189,248,0.06)',
    borderBottom: '1px solid rgba(56,189,248,0.18)',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  label: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#38bdf8',
    marginRight: '6px',
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  sep: {
    width: '1px',
    height: '18px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    margin: '0 4px',
  },
};

// ─── Main component ────────────────────────────────────────────────────────

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange }) => {
  // Track editor state to re-render context toolbars
  const [editorState, setEditorState] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { languageClassPrefix: 'language-' },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: 'Escreva suas anotações aqui...' }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      setEditorState((s) => s + 1);
    },
    onSelectionUpdate: () => {
      setEditorState((s) => s + 1);
    },
    editorProps: {
      attributes: {
        class: 'rich-editor-area',
        spellcheck: 'true',
      },
    },
  });

  // Sync external content prop with Tiptap instance if changed externally
  useEffect(() => {
    if (editor && !editor.isDestroyed && content !== undefined) {
      const currentHtml = editor.getHTML();
      if (currentHtml !== content) {
        editor.commands.setContent(content || '');
      }
    }
  }, [content, editor]);

  const handleImageUpload = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editor) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        if (!base64) return;

        // Optionally save a physical backup copy on disk if IPC is available
        if (window.electronAPI?.saveNoteImage) {
          try {
            const ext = file.name.split('.').pop() || 'png';
            await window.electronAPI.saveNoteImage(base64, ext);
          } catch (err) {
            console.warn('[RichTextEditor] Physical image backup save failed:', err);
          }
        }

        // Always insert as Data URL (base64) into editor DOM so Chromium never blocks rendering with file:// errors
        editor.chain().focus().setImage({ src: base64 }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [editor]);

  const handleSetLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL do link:', prev || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkToNextWord().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkToNextWord().setLink({ href: url }).run();
  }, [editor]);

  const handleInsertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  // Delete current list item (lifts it out of the list, then deletes the empty paragraph)
  const handleDeleteListItem = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().liftListItem('listItem').deleteNode('paragraph').run();
  }, [editor]);

  if (!editor) return null;

  let inList = false;
  try {
    inList = !editor.isDestroyed && (editor.isActive('bulletList') || editor.isActive('orderedList'));
  } catch {
    inList = false;
  }

  return (
    <div style={styles.wrapper}>
      {/* ── Main Toolbar ── */}
      <div style={styles.toolbar}>
        <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Desfazer (Ctrl+Z)">
          <Undo size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Refazer (Ctrl+Y)">
          <Redo size={14} />
        </Btn>

        <ToolbarDivider />

        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Título 1">
          <Heading1 size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título 2">
          <Heading2 size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Título 3">
          <Heading3 size={14} />
        </Btn>

        <ToolbarDivider />

        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito (Ctrl+B)">
          <Bold size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico (Ctrl+I)">
          <Italic size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Sublinhado (Ctrl+U)">
          <UnderlineIcon size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Tachado">
          <Strikethrough size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Código inline">
          <Code size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHighlight({ color: '#7c3aed33' }).run()} active={editor.isActive('highlight')} title="Destacar texto">
          <Highlighter size={14} />
        </Btn>

        <ToolbarDivider />

        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista com marcadores">
          <List size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
          <ListOrdered size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Citação">
          <Quote size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Bloco de código">
          <Type size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha horizontal">
          <Minus size={14} />
        </Btn>

        <ToolbarDivider />

        <Btn onClick={handleSetLink} active={editor.isActive('link')} title="Inserir link">
          <LinkIcon size={14} />
        </Btn>
        <Btn onClick={handleImageUpload} title="Inserir imagem (upload do disco)">
          <ImageIcon size={14} />
        </Btn>
        <Btn onClick={handleInsertTable} title="Inserir tabela (3×3)">
          <TableIcon size={14} />
        </Btn>
      </div>

      {/* ── Table Context Toolbar (shows when cursor is inside a table) ── */}
      <TableToolbar editor={editor} key={`table-${editorState}`} />

      {/* ── Bubble Menu on selection ── */}
      {editor && !editor.isDestroyed && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div style={styles.bubbleMenu}>
            <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito">
              <Bold size={13} />
            </Btn>
            <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico">
              <Italic size={13} />
            </Btn>
            <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Sublinhado">
              <UnderlineIcon size={13} />
            </Btn>
            <Btn onClick={() => editor.chain().focus().toggleHighlight({ color: '#7c3aed33' }).run()} active={editor.isActive('highlight')} title="Destacar">
              <Highlighter size={13} />
            </Btn>
            <Btn onClick={handleSetLink} active={editor.isActive('link')} title="Link">
              <LinkIcon size={13} />
            </Btn>

            {/* Delete selected content */}
            <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(255,255,255,0.12)', margin: '0 3px' }} />
            <Btn
              onClick={() => editor.chain().focus().deleteSelection().run()}
              danger
              title="Deletar seleção"
            >
              <Trash2 size={13} />
            </Btn>
          </div>
        </BubbleMenu>
      )}

      {/* ── List item context pill (shows when cursor is in a list) ── */}
      {inList && (
        <div style={styles.listContextBar}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Cursor em lista
          </span>
          <button
            type="button"
            style={styles.deleteItemBtn}
            onClick={handleDeleteListItem}
            title="Remover item atual da lista"
          >
            <Trash2 size={12} /> Remover item
          </button>
        </div>
      )}

      {/* ── Editor Content ── */}
      <div style={styles.editorContainer}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};



const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '2px',
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    flexShrink: 0,
  },
  bubbleMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '4px 6px',
    backgroundColor: '#1e1e2e',
    border: '1px solid rgba(99,102,241,0.4)',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  },
  listContextBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '5px 14px',
    backgroundColor: 'rgba(99,102,241,0.06)',
    borderBottom: '1px solid rgba(99,102,241,0.15)',
    flexShrink: 0,
  },
  deleteItemBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 10px',
    borderRadius: '5px',
    border: '1px solid rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  editorContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 28px',
  },
};
