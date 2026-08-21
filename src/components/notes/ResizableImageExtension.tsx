import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Image as ImageIcon,
  FileImage,
  Eye,
  Copy,
  Check,
  Download,
  CreditCard,
  Minus,
} from 'lucide-react';

export type ImageDisplayMode = 'image' | 'card' | 'inline';

export interface ResizableImageAttributes {
  src: string;
  alt?: string;
  title?: string;
  width?: string;
  alignment?: 'left' | 'center' | 'right';
  displayMode?: ImageDisplayMode | 'icon'; // 'icon' supported for backward-compat
}

/**
 * Utilitário para copiar imagem binária para o clipboard do sistema
 */
const copyImageToClipboard = async (imgSrc: string): Promise<boolean> => {
  try {
    if ((window as any).electronAPI?.clipboardWriteImage) {
      await (window as any).electronAPI.clipboardWriteImage(imgSrc);
      return true;
    }

    // Se for base64 ou blob
    let blob: Blob;
    if (imgSrc.startsWith('data:')) {
      const response = await fetch(imgSrc);
      blob = await response.blob();
    } else {
      // Cria imagem em canvas para extrair PNG puro compatível com ClipboardItem
      blob = await new Promise<Blob>((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Canvas blob generation failed'));
          }, 'image/png');
        };
        img.onerror = (e) => reject(e);
        img.src = imgSrc;
      });
    }

    // Escreve o blob binário na área de transferência
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ]);
    return true;
  } catch (err) {
    console.error('[CopyImage Error]:', err);
    try {
      await navigator.clipboard.writeText(imgSrc);
      return true;
    } catch {
      return false;
    }
  }
};

// ─── Fullscreen Lightbox Component ─────────────────────────────────────────

interface ImageLightboxProps {
  src: string;
  alt?: string;
  title?: string;
  onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, alt, title, onClose }) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [copied, setCopied] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close context menu on click anywhere
  useEffect(() => {
    const handleClick = () => setContextMenuPos(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(Number((z + 0.25).toFixed(2)), 3.5));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(Number((z - 0.25).toFixed(2)), 0.4));
  const handleResetZoom = () => setZoomLevel(1);

  const handleCopy = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setContextMenuPos(null);
    const success = await copyImageToClipboard(src);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setContextMenuPos(null);
    const a = document.createElement('a');
    a.href = src;
    a.download = (alt || title || 'imagem').replace(/\s+/g, '_') + '.png';
    a.click();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  return createPortal(
    <div
      style={lightboxStyles.overlay}
      onClick={onClose}
      onContextMenu={handleContextMenu}
      onWheel={(e) => {
        if (e.deltaY < 0) handleZoomIn();
        else handleZoomOut();
      }}
    >
      {/* Top Controls Bar */}
      <div style={lightboxStyles.topBar} onClick={(e) => e.stopPropagation()}>
        <div style={lightboxStyles.titleBox}>
          <span style={lightboxStyles.imageTitle}>{alt || title || 'Visualização da Imagem'}</span>
          <span style={lightboxStyles.zoomBadge}>{Math.round(zoomLevel * 100)}%</span>
        </div>

        <div style={lightboxStyles.controlsGroup}>
          {/* Botão Copiar Imagem */}
          <button
            type="button"
            tabIndex={-1}
            style={{
              ...lightboxStyles.controlBtn,
              backgroundColor: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              color: copied ? '#10b981' : '#cbd5e1',
              padding: '6px 12px',
              gap: '6px',
              width: 'auto',
            }}
            onClick={handleCopy}
            title="Copiar imagem para a área de transferência"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{copied ? 'Copiada!' : 'Copiar'}</span>
          </button>

          {/* Botão Baixar Imagem */}
          <button
            type="button"
            tabIndex={-1}
            style={lightboxStyles.controlBtn}
            onClick={handleDownload}
            title="Baixar imagem"
          >
            <Download size={16} />
          </button>

          <div style={lightboxStyles.divider} />

          <button
            type="button"
            tabIndex={-1}
            style={lightboxStyles.controlBtn}
            onClick={handleZoomOut}
            title="Diminuir Zoom (-)"
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            style={lightboxStyles.controlBtn}
            onClick={handleResetZoom}
            title="Resetar Zoom (100%)"
          >
            <RotateCcw size={15} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            style={lightboxStyles.controlBtn}
            onClick={handleZoomIn}
            title="Aumentar Zoom (+)"
          >
            <ZoomIn size={16} />
          </button>
          <div style={lightboxStyles.divider} />
          <button
            type="button"
            tabIndex={-1}
            style={lightboxStyles.closeBtn}
            onClick={onClose}
            title="Fechar Visualização (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Image Center Stage */}
      <div style={lightboxStyles.imageStage} onClick={(e) => e.stopPropagation()} onContextMenu={handleContextMenu}>
        <img
          src={src}
          alt={alt || ''}
          title={title || ''}
          style={{
            ...lightboxStyles.lightboxImage,
            transform: `scale(${zoomLevel})`,
          }}
          draggable={false}
        />
      </div>

      {/* Context Menu flutuante ao clicar com botão direito */}
      {contextMenuPos && (
        <div
          style={{
            position: 'fixed',
            top: contextMenuPos.y,
            left: contextMenuPos.x,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            padding: '6px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
            zIndex: 1000000,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: '170px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            tabIndex={-1}
            style={lightboxStyles.contextMenuItem}
            onClick={handleCopy}
          >
            <Copy size={14} color="#38bdf8" />
            <span>Copiar Imagem</span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            style={lightboxStyles.contextMenuItem}
            onClick={handleDownload}
          >
            <Download size={14} color="#a5b4fc" />
            <span>Baixar Imagem</span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            style={lightboxStyles.contextMenuItem}
            onClick={handleResetZoom}
          >
            <RotateCcw size={14} color="#94a3b8" />
            <span>Resetar Zoom</span>
          </button>
        </div>
      )}
    </div>,
    document.body
  );
};

// ─── Resizable Image NodeView Component ────────────────────────────────────

const ResizableImageComponent: React.FC<any> = ({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
  getPos,
}) => {
  const {
    src,
    alt,
    title,
    width = '100%',
    alignment = 'center',
    displayMode = 'image',
  } = node.attrs as ResizableImageAttributes;

  // Normaliza o displayMode ('icon' -> 'card')
  const activeDisplayMode: ImageDisplayMode =
    displayMode === 'icon' ? 'card' : (displayMode as ImageDisplayMode) || 'image';

  const [isResizing, setIsResizing] = useState(false);
  const [resizingWidth, setResizingWidth] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [editorContextMenuPos, setEditorContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLSpanElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<HTMLSpanElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Only show handles and toolbar when the image is actively selected, focused or resizing (and not actively being dragged)
  const isActive = Boolean(selected || isFocused || isResizing);
  const isToolbarVisible = Boolean(isActive && !isDragging && !isResizing);

  // Deselect when clicking outside the image container
  useEffect(() => {
    const handleDocumentMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
        setIsHovered(false);
        setEditorContextMenuPos(null);
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
    };
  }, []);

  // Keyboard navigation when image is selected/active (e.g. ArrowRight goes to the right of the image, Enter creates new bullet/line)
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLightboxOpen) return;

      const pos = typeof getPos === 'function' ? getPos() : null;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setIsFocused(false);
        if (editor && typeof pos === 'number') {
          const afterPos = pos + node.nodeSize;
          editor.chain().focus().setTextSelection(afterPos).run();
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setIsFocused(false);
        if (editor && typeof pos === 'number') {
          editor.chain().focus().setTextSelection(pos).run();
        }
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        setIsFocused(false);
        if (editor && typeof pos === 'number') {
          const afterPos = pos + node.nodeSize;
          editor.chain().focus().setTextSelection(afterPos).run();
          if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
            editor.chain().splitListItem('listItem').run();
          } else {
            editor.chain().createParagraphNear().run();
          }
        }
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        e.stopPropagation();
        setIsFocused(false);
        deleteNode();
        editor?.commands.focus();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsFocused(false);
        if (editor && typeof pos === 'number') {
          editor.chain().focus().setTextSelection(pos + node.nodeSize).run();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isActive, isLightboxOpen, editor, getPos, node.nodeSize, deleteNode]);

  // Handle Drag Start to ensure ProseMirror node selection is active before dragging
  const handleDragStart = (e: React.DragEvent) => {
    if (isResizing) {
      e.preventDefault();
      return;
    }
    setIsDragging(true);

    const dragTarget = pillRef.current || cardRef.current || frameRef.current || (e.currentTarget as HTMLElement);
    if (e.dataTransfer && dragTarget) {
      const rect = dragTarget.getBoundingClientRect();
      const offsetX = Math.max(5, Math.min(e.clientX - rect.left, rect.width / 2));
      const offsetY = Math.max(5, Math.min(e.clientY - rect.top, rect.height / 2));
      try {
        e.dataTransfer.setDragImage(dragTarget, offsetX, offsetY);
      } catch (err) {
        // Fallback
      }
    }

    if (editor && typeof getPos === 'function') {
      try {
        const pos = getPos();
        if (typeof pos === 'number') {
          editor.commands.setNodeSelection(pos);
        }
      } catch (err) {
        // Fallback
      }
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);

  // Position floating toolbar above the active image/pill/card in fixed coordinates
  useEffect(() => {
    if (!isToolbarVisible) {
      setToolbarPos(null);
      return;
    }

    const updateToolbarPosition = () => {
      const targetEl = pillRef.current || cardRef.current || frameRef.current || containerRef.current;
      if (!targetEl) {
        setToolbarPos(null);
        return;
      }
      const rect = targetEl.getBoundingClientRect();
      // Ensure it stays within viewport
      const top = Math.max(12, rect.top - 46);
      const left = Math.max(80, Math.min(window.innerWidth - 80, rect.left + rect.width / 2));
      setToolbarPos({ top, left });
    };

    updateToolbarPosition();
    window.addEventListener('scroll', updateToolbarPosition, true);
    window.addEventListener('resize', updateToolbarPosition);
    return () => {
      window.removeEventListener('scroll', updateToolbarPosition, true);
      window.removeEventListener('resize', updateToolbarPosition);
    };
  }, [isToolbarVisible, width, activeDisplayMode, alignment]);

  // Determine current display width (real-time during drag, or saved attribute)
  const currentWidth = resizingWidth || width || '100%';

  const handleResizeStart = (
    e: React.MouseEvent,
    direction: 'left' | 'right' | 'corner-right' | 'corner-left'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!imgRef.current) return;

    const startX = e.clientX;
    const initialWidth = imgRef.current.getBoundingClientRect().width;
    const parentWidth =
      containerRef.current?.parentElement?.getBoundingClientRect().width || window.innerWidth;

    setIsResizing(true);
    setIsFocused(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      let newWidthPx: number;

      if (direction === 'right' || direction === 'corner-right') {
        newWidthPx = initialWidth + deltaX;
      } else {
        newWidthPx = initialWidth - deltaX;
      }

      newWidthPx = Math.max(100, Math.min(newWidthPx, parentWidth));
      setResizingWidth(`${Math.round(newWidthPx)}px`);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      upEvent.preventDefault();
      setIsResizing(false);

      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (imgRef.current) {
        const finalPx = imgRef.current.getBoundingClientRect().width;
        if (finalPx >= parentWidth * 0.96) {
          updateAttributes({ width: '100%' });
        } else {
          updateAttributes({ width: `${Math.round(finalPx)}px` });
        }
      }
      setResizingWidth(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleSetPresetWidth = (preset: string) => {
    setResizingWidth(null);
    updateAttributes({ width: preset, displayMode: 'image' });
  };

  const handleSetAlignment = (newAlign: 'left' | 'center' | 'right') => {
    updateAttributes({ alignment: newAlign });
  };

  const handleSetDisplayMode = (newMode: ImageDisplayMode, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    updateAttributes({ displayMode: newMode });
  };

  const handleSelectNode = () => {
    setIsFocused(true);
    if (editor && typeof getPos === 'function') {
      try {
        const pos = getPos();
        if (typeof pos === 'number') {
          editor.commands.setNodeSelection(pos);
        }
      } catch (err) {
        // Fallback
      }
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelectNode();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLightboxOpen(true);
  };

  const handleContextMenuOnImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleSelectNode();
    setEditorContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleCopyImage = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditorContextMenuPos(null);
    const success = await copyImageToClipboard(src);
    if (success) {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  const getContainerAlignmentStyle = (): React.CSSProperties => {
    if (activeDisplayMode === 'inline') {
      return { display: 'inline-flex', verticalAlign: 'middle', margin: '0 4px' };
    }
    if (activeDisplayMode === 'card') {
      return { display: 'inline-flex', verticalAlign: 'middle', margin: '0 6px' };
    }
    switch (alignment) {
      case 'left':
        return { display: 'inline-flex', verticalAlign: 'middle', margin: '4px 8px 4px 0' };
      case 'right':
        return { display: 'inline-flex', verticalAlign: 'middle', margin: '4px 0 4px 8px' };
      case 'center':
      default:
        return { display: 'inline-flex', verticalAlign: 'middle', margin: '4px 6px' };
    }
  };

  return (
    <NodeViewWrapper
      as="span"
      ref={containerRef}
      style={{
        ...styles.wrapper,
        ...getContainerAlignmentStyle(),
      }}
      className={`resizable-image-wrapper mode-${activeDisplayMode}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── MODE 1: INLINE (LINHA) ────────────────────────────────────────── */}
      {activeDisplayMode === 'inline' && (
        <span
          ref={pillRef}
          data-drag-handle=""
          draggable={true}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          style={{
            ...styles.inlinePill,
            outline: isActive ? '2px solid #38bdf8' : isHovered ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: isActive ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.8)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleSelectNode();
          }}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenuOnImage}
          title="Clique para selecionar, arraste para mover, duplo clique para expandir ou botão direito para copiar"
        >
          <ImageIcon size={13} color="#38bdf8" style={{ flexShrink: 0, pointerEvents: 'none' }} />
          <span style={styles.inlineText} draggable={false}>
            {alt || title || 'imagem.png'}
          </span>
          <button
            type="button"
            tabIndex={-1}
            draggable={false}
            style={styles.inlineExpandBtn}
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            title="Expandir imagem"
          >
            <Maximize2 size={11} />
          </button>
        </span>
      )}

      {/* ── MODE 2: CARD (CARTÃO) ─────────────────────────────────────────── */}
      {activeDisplayMode === 'card' && (
        <span
          ref={cardRef}
          data-drag-handle=""
          draggable={true}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          style={{
            ...styles.iconChipContainer,
            outline: isActive ? '2px solid #a855f7' : isHovered ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: isActive ? '0 0 16px rgba(168, 85, 247, 0.35)' : '0 3px 10px rgba(0, 0, 0, 0.3)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleSelectNode();
          }}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenuOnImage}
          title="Clique para selecionar, arraste para mover, duplo clique para expandir ou botão direito para copiar"
        >
          {/* Mini Thumbnail Preview */}
          <span style={{ ...styles.thumbnailWrapper, pointerEvents: 'none' }}>
            <img src={src} alt="" style={styles.thumbnailImg} draggable={false} />
            <span style={styles.thumbnailOverlay}>
              <Eye size={12} color="#fff" />
            </span>
          </span>

          {/* Text Info */}
          <span style={{ ...styles.iconInfoBox, pointerEvents: 'none' }}>
            <span style={styles.iconTitleText}>
              {alt || title || 'Imagem Anexada'}
            </span>
            <span style={styles.iconSubText}>
              Clique para expandir em tela cheia
            </span>
          </span>

          {/* Action Quick Buttons */}
          <span style={styles.iconActionsGroup}>
            <button
              type="button"
              tabIndex={-1}
              draggable={false}
              style={{ ...styles.iconActionBtn, backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onDragStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              title="Abrir em tela cheia"
            >
              <Maximize2 size={13} />
            </button>
          </span>
        </span>
      )}

      {/* ── MODE 3: IMAGE (IMAGEM EXPANDIDA NORMAL) ───────────────────────── */}
      {activeDisplayMode === 'image' && (
        <span
          style={{
            ...styles.imageContainer,
            width: currentWidth,
            maxWidth: '100%',
          }}
        >
          {/* The Image itself */}
          <span
            ref={frameRef}
            data-drag-handle=""
            draggable={true}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={styles.imageFrame}
            onClick={handleImageClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenuOnImage}
          >
            <img
              ref={imgRef}
              src={src}
              alt={alt || ''}
              title={title || 'Clique para selecionar, arraste para mover, duplo clique para expandir ou botão direito para copiar'}
              style={{
                ...styles.image,
                outline: isActive
                  ? '2px solid #38bdf8'
                  : isHovered
                  ? '1px solid rgba(56, 189, 248, 0.4)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: isActive ? '0 0 15px rgba(56, 189, 248, 0.35)' : '0 4px 12px rgba(0,0,0,0.25)',
                cursor: 'grab',
                pointerEvents: 'none',
              }}
              draggable={false}
            />

            {/* Interactive Drag Handles for resizing (only visible when actively selected) */}
            {isActive && (
              <>
                {/* Corner Handles */}
                <div
                  draggable={false}
                  style={{ ...styles.resizeHandle, ...styles.handleNW }}
                  onMouseDown={(e) => handleResizeStart(e, 'corner-left')}
                  onDragStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  title="Arrastar para redimensionar"
                />
                <div
                  draggable={false}
                  style={{ ...styles.resizeHandle, ...styles.handleNE }}
                  onMouseDown={(e) => handleResizeStart(e, 'corner-right')}
                  onDragStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  title="Arrastar para redimensionar"
                />
                <div
                  draggable={false}
                  style={{ ...styles.resizeHandle, ...styles.handleSW }}
                  onMouseDown={(e) => handleResizeStart(e, 'corner-left')}
                  onDragStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  title="Arrastar para redimensionar"
                />
                <div
                  draggable={false}
                  style={{ ...styles.resizeHandle, ...styles.handleSE }}
                  onMouseDown={(e) => handleResizeStart(e, 'corner-right')}
                  onDragStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  title="Arrastar para redimensionar"
                />

                {/* Side Handles */}
                <div
                  draggable={false}
                  style={{ ...styles.sideHandle, ...styles.handleLeft }}
                  onMouseDown={(e) => handleResizeStart(e, 'left')}
                  onDragStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  title="Arrastar para redimensionar largura"
                >
                  <div style={styles.sideHandleBar} />
                </div>
                <div
                  draggable={false}
                  style={{ ...styles.sideHandle, ...styles.handleRight }}
                  onMouseDown={(e) => handleResizeStart(e, 'right')}
                  onDragStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  title="Arrastar para redimensionar largura"
                >
                  <div style={styles.sideHandleBar} />
                </div>

                {/* Current size indicator badge when resizing */}
                {isResizing && (
                  <div style={styles.sizeTooltip}>
                    {currentWidth}
                  </div>
                )}
              </>
            )}
          </span>
        </span>
      )}

      {/* Floating Toolbar Global (Portal no document.body - ZERO impacto no drag ghost ou layout) */}
      {isToolbarVisible && toolbarPos && createPortal(
        <div
          style={{
            ...styles.floatingToolbar,
            position: 'fixed',
            top: toolbarPos.top,
            left: toolbarPos.left,
            transform: 'translateX(-50%)',
          }}
          contentEditable={false}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* Expand Button */}
          <button
            type="button"
            tabIndex={-1}
            style={styles.expandBtn}
            onClick={() => setIsLightboxOpen(true)}
            title="Expandir imagem em tela cheia"
          >
            <Maximize2 size={13} />
            <span>Expandir</span>
          </button>

          <div style={styles.toolbarDivider} />

          {/* 3 Display Mode Buttons */}
          <div style={styles.toolbarGroup}>
            <button
              type="button"
              tabIndex={-1}
              style={{
                ...styles.modeSelectBtn,
                backgroundColor: activeDisplayMode === 'image' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                color: activeDisplayMode === 'image' ? '#38bdf8' : '#cbd5e1',
              }}
              onClick={(e) => handleSetDisplayMode('image', e)}
              title="Modo Imagem normal"
            >
              <ImageIcon size={12} />
              <span>Imagem</span>
            </button>
            <button
              type="button"
              tabIndex={-1}
              style={{
                ...styles.modeSelectBtn,
                backgroundColor: activeDisplayMode === 'card' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                color: activeDisplayMode === 'card' ? '#c084fc' : '#cbd5e1',
              }}
              onClick={(e) => handleSetDisplayMode('card', e)}
              title="Modo Cartão com miniatura"
            >
              <CreditCard size={12} />
              <span>Cartão</span>
            </button>
            <button
              type="button"
              tabIndex={-1}
              style={{
                ...styles.modeSelectBtn,
                backgroundColor: activeDisplayMode === 'inline' ? 'rgba(52, 211, 153, 0.25)' : 'transparent',
                color: activeDisplayMode === 'inline' ? '#34d399' : '#cbd5e1',
              }}
              onClick={(e) => handleSetDisplayMode('inline', e)}
              title="Modo Linha compacto no texto"
            >
              <Minus size={12} />
              <span>Linha</span>
            </button>
          </div>

          {/* Preset size buttons for Image mode */}
          {activeDisplayMode === 'image' && (
            <>
              <div style={styles.toolbarDivider} />
              <div style={styles.toolbarGroup}>
                {['25%', '50%', '75%', '100%'].map((p) => {
                  const isCurrentPreset = width === p && !resizingWidth;
                  return (
                    <button
                      key={p}
                      type="button"
                      tabIndex={-1}
                      style={{
                        ...styles.presetBtn,
                        backgroundColor: isCurrentPreset ? 'rgba(56, 189, 248, 0.3)' : 'transparent',
                        color: isCurrentPreset ? '#38bdf8' : '#cbd5e1',
                        fontWeight: isCurrentPreset ? '700' : '500',
                      }}
                      onClick={() => handleSetPresetWidth(p)}
                      title={`Redimensionar para ${p}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Alignment controls for Image and Card mode */}
          {activeDisplayMode !== 'inline' && (
            <>
              <div style={styles.toolbarDivider} />
              <div style={styles.toolbarGroup}>
                <button
                  type="button"
                  tabIndex={-1}
                  style={{
                    ...styles.toolBtn,
                    backgroundColor: alignment === 'left' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                    color: alignment === 'left' ? '#a5b4fc' : '#cbd5e1',
                  }}
                  onClick={() => handleSetAlignment('left')}
                  title="Alinhar à esquerda"
                >
                  <AlignLeft size={13} />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  style={{
                    ...styles.toolBtn,
                    backgroundColor: alignment === 'center' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                    color: alignment === 'center' ? '#a5b4fc' : '#cbd5e1',
                  }}
                  onClick={() => handleSetAlignment('center')}
                  title="Centralizar"
                >
                  <AlignCenter size={13} />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  style={{
                    ...styles.toolBtn,
                    backgroundColor: alignment === 'right' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                    color: alignment === 'right' ? '#a5b4fc' : '#cbd5e1',
                  }}
                  onClick={() => handleSetAlignment('right')}
                  title="Alinhar à direita"
                >
                  <AlignRight size={13} />
                </button>
              </div>
            </>
          )}

          <div style={styles.toolbarDivider} />

          {/* Copiar Imagem */}
          <button
            type="button"
            tabIndex={-1}
            style={styles.toolBtn}
            onClick={handleCopyImage}
            title="Copiar imagem"
          >
            {copiedToast ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
          </button>

          {/* Remover Imagem */}
          <button
            type="button"
            tabIndex={-1}
            style={styles.deleteBtn}
            onClick={() => deleteNode()}
            title="Remover imagem"
          >
            <Trash2 size={13} />
          </button>
        </div>,
        document.body
      )}

      {/* Editor Context Menu (Right Click on Image in Note) */}
      {editorContextMenuPos && (
        <div
          style={{
            position: 'fixed',
            top: editorContextMenuPos.y,
            left: editorContextMenuPos.x,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            padding: '6px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
            zIndex: 100000,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: '170px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            tabIndex={-1}
            style={lightboxStyles.contextMenuItem}
            onClick={handleCopyImage}
          >
            <Copy size={14} color="#38bdf8" />
            <span>Copiar Imagem</span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            style={lightboxStyles.contextMenuItem}
            onClick={() => {
              setEditorContextMenuPos(null);
              setIsLightboxOpen(true);
            }}
          >
            <Maximize2 size={14} color="#c084fc" />
            <span>Expandir Tela Cheia</span>
          </button>
        </div>
      )}

      {/* Toast Feedback de Imagem Copiada */}
      {copiedToast && (
        <div
          style={{
            position: 'absolute',
            bottom: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(16, 185, 129, 0.95)',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '700',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 100,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <Check size={12} /> Imagem copiada!
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <ImageLightbox
          src={src}
          alt={alt}
          title={title}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </NodeViewWrapper>
  );
};

export const ResizableImage = Image.extend({
  name: 'image',
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      ...this.parent?.(),
      inline: true,
      allowBase64: true,
    };
  },

  inline() {
    return true;
  },

  group() {
    return 'inline';
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return {
            width: attributes.width,
            style: `width: ${attributes.width}; max-width: 100%; height: auto;`,
          };
        },
        parseHTML: (element) => {
          return element.style.width || element.getAttribute('width') || '100%';
        },
      },
      alignment: {
        default: 'center',
        renderHTML: (attributes) => {
          if (!attributes.alignment) return {};
          return {
            'data-align': attributes.alignment,
          };
        },
        parseHTML: (element) => {
          return element.getAttribute('data-align') || 'center';
        },
      },
      displayMode: {
        default: 'image',
        renderHTML: (attributes) => {
          if (!attributes.displayMode) return {};
          return {
            'data-display': attributes.displayMode,
          };
        },
        parseHTML: (element) => {
          return element.getAttribute('data-display') || 'image';
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },

  addKeyboardShortcuts() {
    return {
      ArrowRight: ({ editor }) => {
        const { selection } = editor.state;
        if ((selection as any).node?.type.name === this.name) {
          const afterPos = selection.from + (selection as any).node.nodeSize;
          return editor.chain().focus().setTextSelection(afterPos).run();
        }
        return false;
      },
      ArrowDown: ({ editor }) => {
        const { selection } = editor.state;
        if ((selection as any).node?.type.name === this.name) {
          const afterPos = selection.from + (selection as any).node.nodeSize;
          return editor.chain().focus().setTextSelection(afterPos).run();
        }
        return false;
      },
      ArrowLeft: ({ editor }) => {
        const { selection } = editor.state;
        if ((selection as any).node?.type.name === this.name) {
          return editor.chain().focus().setTextSelection(selection.from).run();
        }
        return false;
      },
      ArrowUp: ({ editor }) => {
        const { selection } = editor.state;
        if ((selection as any).node?.type.name === this.name) {
          return editor.chain().focus().setTextSelection(selection.from).run();
        }
        return false;
      },
      Enter: ({ editor }) => {
        const { selection } = editor.state;
        if ((selection as any).node?.type.name === this.name) {
          const afterPos = selection.from + (selection as any).node.nodeSize;
          editor.chain().focus().setTextSelection(afterPos).run();
          if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
            return editor.chain().splitListItem('listItem').run();
          }
          return editor.chain().createParagraphNear().run();
        }
        return false;
      },
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        if ((selection as any).node?.type.name === this.name) {
          return editor.chain().focus().deleteSelection().run();
        }
        return false;
      },
      Delete: ({ editor }) => {
        const { selection } = editor.state;
        if ((selection as any).node?.type.name === this.name) {
          return editor.chain().focus().deleteSelection().run();
        }
        return false;
      },
    };
  },
});

// ─── Inline Styles ─────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'inline-flex',
    verticalAlign: 'middle',
    position: 'relative',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    lineHeight: 1,
  },
  imageContainer: {
    position: 'relative',
    display: 'inline-flex',
    verticalAlign: 'middle',
    transition: 'width 0.05s ease-out',
    maxWidth: '100%',
  },
  imageFrame: {
    position: 'relative',
    display: 'inline-flex',
    verticalAlign: 'middle',
    width: '100%',
  },
  image: {
    display: 'block',
    width: '100%',
    height: 'auto',
    borderRadius: '10px',
    transition: 'outline 0.15s ease, box-shadow 0.15s ease',
  },
  iconChipContainer: {
    display: 'inline-flex',
    verticalAlign: 'middle',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 12px',
    borderRadius: '12px',
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    cursor: 'grab',
    position: 'relative',
    transition: 'all 0.15s ease',
    maxWidth: '100%',
  },
  thumbnailWrapper: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbnailOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  iconInfoBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    overflow: 'hidden',
  },
  iconTitleText: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '220px',
  },
  iconSubText: {
    fontSize: '10px',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  },
  iconActionsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: '6px',
  },
  iconActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#cbd5e1',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  floatingToolbar: {
    position: 'absolute',
    top: '-42px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: 'rgba(22, 22, 34, 0.95)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(56, 189, 248, 0.35)',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px rgba(56, 189, 248, 0.2)',
    whiteSpace: 'nowrap',
    pointerEvents: 'auto',
  },
  expandBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  modeToggleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid rgba(168, 85, 247, 0.35)',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    color: '#c084fc',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  toolbarGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  presetBtn: {
    background: 'transparent',
    border: 'none',
    borderRadius: '5px',
    padding: '3px 7px',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  toolBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '5px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  deleteBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '5px',
    border: 'none',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  toolbarDivider: {
    width: '1px',
    height: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    margin: '0 3px',
  },
  resizeHandle: {
    position: 'absolute',
    width: '12px',
    height: '12px',
    backgroundColor: '#38bdf8',
    border: '2px solid #0f172a',
    borderRadius: '50%',
    boxShadow: '0 0 8px rgba(56, 189, 248, 0.8)',
    zIndex: 40,
    cursor: 'pointer',
  },
  handleNW: {
    top: '-6px',
    left: '-6px',
    cursor: 'nwse-resize',
  },
  handleNE: {
    top: '-6px',
    right: '-6px',
    cursor: 'nesw-resize',
  },
  handleSW: {
    bottom: '-6px',
    left: '-6px',
    cursor: 'nesw-resize',
  },
  handleSE: {
    bottom: '-6px',
    right: '-6px',
    cursor: 'nwse-resize',
  },
  sideHandle: {
    position: 'absolute',
    top: '0',
    bottom: '0',
    width: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
    cursor: 'ew-resize',
  },
  handleLeft: {
    left: '-7px',
  },
  handleRight: {
    right: '-7px',
  },
  sideHandleBar: {
    width: '4px',
    height: '32px',
    backgroundColor: '#38bdf8',
    borderRadius: '2px',
    boxShadow: '0 0 6px rgba(56, 189, 248, 0.8)',
  },
  sizeTooltip: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.4)',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
    zIndex: 50,
  },
  inlinePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 8px',
    borderRadius: '6px',
    cursor: 'grab',
    verticalAlign: 'middle',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    transition: 'all 0.15s ease',
    maxWidth: '300px',
    margin: '0 3px',
  },
  inlineText: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#e2e8f0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    pointerEvents: 'none',
  },
  inlineExpandBtn: {
    background: 'transparent',
    border: 'none',
    color: '#38bdf8',
    padding: '1px 2px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  modeSelectBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 7px',
    borderRadius: '5px',
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};

const lightboxStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(5, 7, 15, 0.92)',
    backdropFilter: 'blur(16px)',
    zIndex: 99999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    animation: 'fadeIn 0.2s ease-out',
  },
  topBar: {
    position: 'absolute',
    top: '20px',
    left: '24px',
    right: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100000,
    backgroundColor: 'rgba(20, 22, 34, 0.85)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '8px 16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  titleBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    maxWidth: '50%',
    overflow: 'hidden',
  },
  imageTitle: {
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '700',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  zoomBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    border: '1px solid rgba(56, 189, 248, 0.3)',
  },
  controlsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  controlBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#cbd5e1',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  closeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#f87171',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  divider: {
    width: '1px',
    height: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    margin: '0 4px',
  },
  imageStage: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '92vw',
    maxHeight: '82vh',
    overflow: 'auto',
    marginTop: '50px',
  },
  lightboxImage: {
    maxWidth: '88vw',
    maxHeight: '78vh',
    objectFit: 'contain',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.2)',
    transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  contextMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#f8fafc',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'background 0.15s ease',
  },
};
