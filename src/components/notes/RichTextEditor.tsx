import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { ResizableImage } from './ResizableImageExtension';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table';
import { TableHeader } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table';
import { Extension } from '@tiptap/core';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import ListItem from '@tiptap/extension-list-item';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

// ─── Indent Extension & Custom TaskItem ────────────────────────────────────

export const IndentExtension = Extension.create({
  name: 'indent',
  addGlobalAttributes() {
    return [
      {
        types: ['taskItem', 'listItem', 'paragraph', 'heading'],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element: HTMLElement) => {
              const attr = element.getAttribute('data-indent');
              if (attr) return parseInt(attr, 10) || 0;
              const ml = element.style.marginLeft;
              if (ml) {
                const match = ml.match(/([\d.]+)em/);
                if (match) return Math.round(parseFloat(match[1]) / 1.8) || 0;
              }
              return 0;
            },
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.indent || attributes.indent <= 0) {
                return {};
              }
              return {
                'data-indent': attributes.indent,
                style: `margin-left: ${attributes.indent * 1.8}em;`,
              };
            },
          },
        },
      },
    ];
  },
});

const CustomTaskItem = TaskItem.extend({
  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const listItem = document.createElement('li');
      const checkboxWrapper = document.createElement('label');
      const checkboxStyler = document.createElement('span');
      const checkbox = document.createElement('input');
      const content = document.createElement('div');

      checkboxStyler.style.cssText =
        'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';

      const updateIndent = (currentNode: any) => {
        const ind = (currentNode.attrs.indent as number) || 0;
        if (ind > 0) {
          listItem.setAttribute('data-indent', String(ind));
          listItem.style.marginLeft = `${ind * 1.8}em`;
        } else {
          listItem.removeAttribute('data-indent');
          listItem.style.marginLeft = '';
        }
      };

      checkboxWrapper.contentEditable = 'false';
      checkbox.type = 'checkbox';
      checkbox.addEventListener('mousedown', (e) => e.preventDefault());
      checkbox.addEventListener('change', (e: any) => {
        const checked = e.target.checked;
        if (editor.isEditable && typeof getPos === 'function') {
          const pos = getPos();
          if (typeof pos === 'number') {
            editor
              .chain()
              .focus(undefined, { scrollIntoView: false })
              .command(({ tr }) => {
                const cur = tr.doc.nodeAt(pos);
                tr.setNodeMarkup(pos, undefined, { ...cur?.attrs, checked });
                return true;
              })
              .run();
          }
        }
      });

      listItem.dataset.checked = String(node.attrs.checked);
      checkbox.checked = !!node.attrs.checked;

      checkboxWrapper.append(checkbox, checkboxStyler);
      listItem.append(checkboxWrapper, content);

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (key !== 'style') {
          listItem.setAttribute(key, value as string);
        }
      });

      updateIndent(node);

      return {
        dom: listItem,
        contentDOM: content,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'taskItem') return false;
          listItem.dataset.checked = String(updatedNode.attrs.checked);
          checkbox.checked = !!updatedNode.attrs.checked;
          updateIndent(updatedNode);
          return true;
        },
      };
    };
  },
});

const CustomListItem = ListItem.extend({});
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
  ListTodo,
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
    tabIndex={-1}
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

// ─── Table context toolbar controls (rendered at right side of toolbar) ───

const TableToolbarControls = ({ editor }: { editor: any }) => {
  if (!editor || editor.isDestroyed) return null;
  let inTable = false;
  try {
    inTable = editor.isActive('table');
  } catch {
    inTable = false;
  }
  if (!inTable) return null;

  return (
    <div style={styles.contextGroup}>
      <ToolbarDivider />
      <span style={styles.tableContextLabel}>
        <TableIcon size={13} /> Tabela
      </span>

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

      <div style={styles.miniDivider} />

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

      <div style={styles.miniDivider} />

      <button
        type="button"
        style={styles.deleteTableBtn}
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Deletar tabela inteira"
      >
        <Trash2 size={12} /> Excluir Tabela
      </button>
    </div>
  );
};

// Helper to directly adjust list item indent via ProseMirror transaction
const adjustListItemIndent = (view: any, delta: number): boolean => {
  if (!view || !view.state || !view.dispatch) return false;
  const { state, dispatch } = view;
  const { $from } = state.selection;
  let itemDepth = -1;

  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === 'taskItem' || node.type.name === 'listItem') {
      itemDepth = d;
      break;
    }
  }

  if (itemDepth < 0) return false;

  const node = $from.node(itemDepth);
  const pos = $from.before(itemDepth);
  const currentIndent = (node.attrs.indent as number) || 0;
  const newIndent = Math.max(0, Math.min(8, currentIndent + delta));

  if (newIndent !== currentIndent) {
    const tr = state.tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      indent: newIndent,
    });
    dispatch(tr);
    return true;
  }

  return false;
};

// ─── Main component ────────────────────────────────────────────────────────

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange }) => {
  const [editorState, setEditorState] = useState(0);
  const lastEmittedHtmlRef = useRef<string>(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { languageClassPrefix: 'language-' },
        listItem: false,
      }),
      CustomListItem,
      IndentExtension,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      ResizableImage.configure({ inline: true, allowBase64: true }),
      Table.configure({
        resizable: true,
        handleWidth: 6,
        cellMinWidth: 40,
        lastColumnResizable: true,
        allowTableNodeSelection: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      CustomTaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Escreva suas anotações aqui...' }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmittedHtmlRef.current = html;
      onChange(html);
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
      handleKeyDown: (view, event) => {
        if (event.key === 'Tab') {
          event.preventDefault();
          const { state } = view;
          const { $from } = state.selection;
          let listDepth = -1;
          let listType = '';

          for (let d = $from.depth; d > 0; d--) {
            const n = $from.node(d);
            if (n.type.name === 'taskItem' || n.type.name === 'listItem') {
              listDepth = d;
              listType = n.type.name;
              break;
            }
          }

          if (event.shiftKey) {
            // Shift + Tab: diminuir recuo / desanihar / desindentar
            if (listDepth > 0) {
              const node = $from.node(listDepth);
              const curIndent = (node.attrs.indent as number) || 0;
              if (curIndent > 0) {
                adjustListItemIndent(view, -1);
                return true;
              }
              if (editor) {
                if (listType === 'taskItem' && editor.can().liftListItem('taskItem')) {
                  editor.commands.liftListItem('taskItem');
                  return true;
                }
                if (listType === 'listItem' && editor.can().liftListItem('listItem')) {
                  editor.commands.liftListItem('listItem');
                  return true;
                }
                if (editor.can().lift('listItem')) {
                  editor.commands.lift('listItem');
                  return true;
                }
              }
              return true;
            }

            if (editor) {
              if (editor.isActive('taskList') && editor.can().lift('taskList')) {
                editor.commands.lift('taskList');
                return true;
              }
              if (editor.isActive('bulletList') && editor.can().lift('bulletList')) {
                editor.commands.lift('bulletList');
                return true;
              }
              if (editor.isActive('orderedList') && editor.can().lift('orderedList')) {
                editor.commands.lift('orderedList');
                return true;
              }
            }
            return true;
          } else {
            // Tab normal: indentar marcador inteiro para a direita
            if (listDepth > 0) {
              const node = $from.node(listDepth);
              const curIndent = (node.attrs.indent as number) || 0;
              if (curIndent < 8) {
                adjustListItemIndent(view, 1);
                return true;
              }
            }

            if (editor) {
              if (listType === 'taskItem' && editor.can().sinkListItem('taskItem')) {
                editor.commands.sinkListItem('taskItem');
                return true;
              }
              if (listType === 'listItem' && editor.can().sinkListItem('listItem')) {
                editor.commands.sinkListItem('listItem');
                return true;
              }
              if (listType === 'taskItem' && editor.can().wrapInList('taskList')) {
                editor.commands.wrapInList('taskList');
                return true;
              }
              if (listType === 'listItem' && editor.can().wrapInList('bulletList')) {
                editor.commands.wrapInList('bulletList');
                return true;
              }
              return true;
            }
          }
        }
        return false;
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement;
        const anchor = target.closest('a');
        if (anchor && anchor.href) {
          event.preventDefault();
          if (window.electronAPI?.openExternal) {
            window.electronAPI.openExternal(anchor.href);
          } else {
            window.open(anchor.href, '_blank');
          }
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.indexOf('image') !== -1) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              if (base64 && editor && !editor.isDestroyed) {
                editor.chain().focus().setImage({ src: base64 }).run();
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              if (base64 && editor && !editor.isDestroyed) {
                const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                if (coordinates) {
                  editor.chain().focus().setTextSelection(coordinates.pos).setImage({ src: base64 }).run();
                } else {
                  editor.chain().focus().setImage({ src: base64 }).run();
                }
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  // Sync external content prop ONLY when it changed externally (e.g. switched active note or file load), NOT on local typing/undo/redo
  useEffect(() => {
    if (editor && !editor.isDestroyed && content !== undefined) {
      if (content !== lastEmittedHtmlRef.current) {
        lastEmittedHtmlRef.current = content;
        editor.commands.setContent(content || '', { emitUpdate: false });
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
        // Always insert as Data URL (base64) into editor DOM
        if (editor && !editor.isDestroyed) {
          editor.chain().focus().setImage({ src: base64 }).run();
        }
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
  let inTable = false;
  try {
    inList = !editor.isDestroyed && (editor.isActive('bulletList') || editor.isActive('orderedList') || editor.isActive('taskList'));
    inTable = !editor.isDestroyed && editor.isActive('table');
  } catch {
    inList = false;
    inTable = false;
  }

  return (
    <div style={styles.wrapper}>
      {/* ── Main Toolbar ── */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
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
          <Btn
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Inserir Bloco de Código (Estilo Confluence)"
          >
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
          <Btn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Lista de Tarefas com Checkbox">
            <ListTodo size={14} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Citação">
            <Quote size={14} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Código inline">
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

        {/* ── Contextual Controls (positioned on the right side of toolbar) ── */}
        <div style={styles.toolbarRight}>
          {inTable && <TableToolbarControls editor={editor} key={`table-${editorState}`} />}
          {inList && (
            <div style={styles.contextGroup}>
              <ToolbarDivider />
              <span style={styles.listContextLabel}>
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
        </div>
      </div>

      {/* ── Bubble Menu on selection (only for text selections, suppressed on images and tables) ── */}
      {editor && !editor.isDestroyed && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          shouldShow={({ editor, state }) => {
            // Do not show if selection is collapsed / empty
            if (state.selection.empty) return false;
            // Do not show if an image is selected (image has its own floating toolbar)
            if (editor.isActive('image')) return false;
            // Do not show if a table is selected (table has its own contextual toolbar)
            if (editor.isActive('table')) return false;
            // Only show for genuine text selection
            return true;
          }}
        >
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
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '6px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    flexShrink: 0,
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '2px',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: 'auto',
    flexShrink: 0,
  },
  contextGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  tableContextLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#38bdf8',
    marginRight: '2px',
  },
  deleteTableBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '6px',
    border: '1px solid rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  miniDivider: {
    width: '1px',
    height: '16px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    margin: '0 3px',
  },
  listContextLabel: {
    fontSize: '12px',
    color: 'var(--text-muted, #94a3b8)',
    fontWeight: '500',
    marginRight: '2px',
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
