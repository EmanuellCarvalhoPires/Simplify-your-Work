import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  X,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react';
import type { CustomSite, SidebarGroupEntry } from '../../types/index';
import {
  DynamicCustomIcon,
  BRAND_ICON_PRESETS,
  SYSTEM_ICON_PRESETS,
  EMOJI_KEYBOARD_PRESETS,
} from './BrandIcons';

export const COLOR_PRESETS = [
  '#0ea5e9', // Azul Ciano
  '#3b82f6', // Azul Royal
  '#6366f1', // Indigo
  '#8b5cf6', // Roxo Violeta
  '#a855f7', // Púrpura
  '#ec4899', // Rosa
  '#f43f5e', // Vermelho Coral
  '#f59e0b', // Laranja Âmbar
  '#10b981', // Verde Esmeralda
  '#14b8a6', // Teal
  '#64748b', // Cinza Ardósia
  '#eab308', // Dourado
];

export interface CustomSiteModalProps {
  isOpen: boolean;
  siteToEdit?: CustomSite | null;
  targetGroupId?: string;
  availableGroups?: SidebarGroupEntry[];
  onSave: (
    siteData: {
      id?: string;
      title: string;
      url: string;
      icon: string;
      color: string;
    },
    targetGroupId: string
  ) => Promise<void> | void;
  onClose: () => void;
  onDelete?: (siteId: string) => Promise<void> | void;
}

export const CustomSiteModal: React.FC<CustomSiteModalProps> = ({
  isOpen,
  siteToEdit,
  targetGroupId,
  availableGroups = [],
  onSave,
  onClose,
  onDelete,
}) => {
  const [siteTitle, setSiteTitle] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [siteIcon, setSiteIcon] = useState('globe');
  const [siteColor, setSiteColor] = useState('#0ea5e9');
  const [siteIconCategory, setSiteIconCategory] = useState<'brands' | 'system' | 'emoji' | 'upload'>('brands');
  const [siteEmojiInput, setSiteEmojiInput] = useState('');
  const [siteIconSearch, setSiteIconSearch] = useState('');
  const [siteTargetGroup, setSiteTargetGroup] = useState<string>('root');
  const [customImageUrlInput, setCustomImageUrlInput] = useState('');
  const [isFetchingFavicon, setIsFetchingFavicon] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [customUploadedIcons, setCustomUploadedIcons] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('simplify_custom_uploaded_icons');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Erro ao ler simplify_custom_uploaded_icons:', e);
    }
    return [];
  });

  const siteFileInputRef = useRef<HTMLInputElement>(null);

  // Inicializa os campos sempre que o modal abre ou o site de edição muda
  useEffect(() => {
    if (!isOpen) return;

    if (siteToEdit) {
      setSiteTitle(siteToEdit.title || '');
      setSiteUrl(siteToEdit.url || '');
      const iconVal = siteToEdit.icon || 'globe';
      setSiteIcon(iconVal);
      setSiteColor(siteToEdit.color || '#0ea5e9');
      setSiteIconSearch('');
      setCustomImageUrlInput('');

      // Determina categoria do ícone
      if (
        iconVal.startsWith('data:image/') ||
        iconVal.startsWith('http://') ||
        iconVal.startsWith('https://') ||
        iconVal.startsWith('blob:') ||
        iconVal.startsWith('file://')
      ) {
        setSiteIconCategory('upload');
        setSiteEmojiInput('');
        if (iconVal.startsWith('http')) {
          setCustomImageUrlInput(iconVal);
        }
      } else if (iconVal.startsWith('emoji:') || /\p{Extended_Pictographic}/u.test(iconVal)) {
        setSiteIconCategory('emoji');
        setSiteEmojiInput(iconVal.replace('emoji:', ''));
      } else if (BRAND_ICON_PRESETS.some((b) => b.id === iconVal)) {
        setSiteIconCategory('brands');
        setSiteEmojiInput('');
      } else {
        setSiteIconCategory('system');
        setSiteEmojiInput('');
      }

      // Encontra o grupo atual do site
      if (targetGroupId) {
        setSiteTargetGroup(targetGroupId);
      } else {
        let currentGroup = 'root';
        for (const g of availableGroups) {
          if (Array.isArray(g.itemIds) && g.itemIds.includes(siteToEdit.id as any)) {
            currentGroup = g.id;
            break;
          }
        }
        setSiteTargetGroup(currentGroup);
      }
    } else {
      setSiteTitle('');
      setSiteUrl('');
      setSiteIcon('globe');
      setSiteColor('#0ea5e9');
      setSiteTargetGroup(targetGroupId || 'root');
      setSiteIconCategory('brands');
      setSiteEmojiInput('');
      setSiteIconSearch('');
      setCustomImageUrlInput('');
    }
  }, [isOpen, siteToEdit, targetGroupId, availableGroups]);

  // Fecha com a tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const saveCustomUploadedIcon = (iconData: string) => {
    if (!iconData) return;
    setCustomUploadedIcons((prev) => {
      const filtered = prev.filter((i) => i !== iconData);
      const updated = [iconData, ...filtered].slice(0, 30);
      try {
        localStorage.setItem('simplify_custom_uploaded_icons', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  const handleDeleteCustomUploadedIcon = (iconData: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomUploadedIcons((prev) => {
      const updated = prev.filter((i) => i !== iconData);
      try {
        localStorage.setItem('simplify_custom_uploaded_icons', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
    if (siteIcon === iconData) {
      setSiteIcon('globe');
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 128;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png', 0.92);
          setSiteIcon(dataUrl);
          saveCustomUploadedIcon(dataUrl);
        } else {
          const raw = e.target?.result as string;
          setSiteIcon(raw);
          saveCustomUploadedIcon(raw);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFetchFavicon = async (targetUrl?: string) => {
    const urlToUse = (targetUrl || siteUrl).trim();
    if (!urlToUse) {
      alert('Por favor, informe a URL do site primeiro.');
      return;
    }

    try {
      setIsFetchingFavicon(true);
      let hostname = urlToUse;
      try {
        const parsed = new URL(urlToUse.startsWith('http') ? urlToUse : `https://${urlToUse}`);
        hostname = parsed.hostname;
      } catch {
        hostname = urlToUse.replace(/^https?:\/\//, '').split('/')[0];
      }

      if (!hostname) {
        alert('URL inválida.');
        setIsFetchingFavicon(false);
        return;
      }

      const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;

      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 64;
          canvas.height = img.naturalHeight || 64;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            setSiteIcon(dataUrl);
            saveCustomUploadedIcon(dataUrl);
            setSiteIconCategory('upload');
            setIsFetchingFavicon(false);
            return;
          }
        } catch {
          // Fallback para CORS
        }
        setSiteIcon(faviconUrl);
        saveCustomUploadedIcon(faviconUrl);
        setSiteIconCategory('upload');
        setIsFetchingFavicon(false);
      };
      img.onerror = () => {
        setSiteIcon(faviconUrl);
        saveCustomUploadedIcon(faviconUrl);
        setSiteIconCategory('upload');
        setIsFetchingFavicon(false);
      };
      img.src = faviconUrl;
    } catch (err) {
      console.error(err);
      setIsFetchingFavicon(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = siteTitle.trim();
    let url = siteUrl.trim();
    if (!title || !url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      setIsSaving(true);
      await onSave(
        {
          id: siteToEdit?.id,
          title,
          url,
          icon: siteIcon,
          color: siteColor,
        },
        siteTargetGroup
      );
      onClose();
    } catch (err) {
      console.error('Erro ao salvar site:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card-jira, #1e293b)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
      >
        {/* Cabeçalho do Modal */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: `${siteColor}22`,
                border: `1px solid ${siteColor}44`,
              }}
            >
              <Globe size={18} color={siteColor} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                {siteToEdit ? 'Editar Site Personalizado' : 'Adicionar Site na Barra Lateral'}
              </h3>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0 }}>
                Visualização integrada com login e sessão persistentes (estilo Teams/Outlook).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Fechar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Formulário */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Nome do Site */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
              Nome do Site / Sistema *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ex: OneDrive, SharePoint, WhatsApp, GitHub, Trello..."
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* URL do Site */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                URL / Link do Site *
              </label>
              <button
                type="button"
                onClick={() => handleFetchFavicon()}
                disabled={!siteUrl.trim() || isFetchingFavicon}
                title="Buscar e definir automaticamente o Favicon oficial deste site"
                style={{
                  background: 'none',
                  border: 'none',
                  color: siteUrl.trim() ? '#38bdf8' : 'var(--text-muted)',
                  fontSize: '11px',
                  cursor: siteUrl.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0,
                  transition: 'opacity 0.2s',
                  opacity: siteUrl.trim() ? 1 : 0.6,
                }}
              >
                {isFetchingFavicon ? (
                  <>
                    <Loader2 size={12} className="spin-icon" />
                    <span>Buscando favicon...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    <span>⚡ Buscar Favicon do Site</span>
                  </>
                )}
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="Ex: https://onedrive.live.com ou github.com"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Seletor de Ícones Rico & Categorizado */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                Ícone do Botão
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Selecionado:</span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    backgroundColor: `${siteColor}22`,
                    border: `1px solid ${siteColor}44`,
                    overflow: 'hidden',
                  }}
                >
                  <DynamicCustomIcon iconKey={siteIcon} size={15} color={siteColor} />
                </div>
              </div>
            </div>

            {/* Abas de Categorias de Ícones */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                marginBottom: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                padding: '4px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setSiteIconCategory('brands');
                  setSiteIconSearch('');
                }}
                style={{
                  flex: 1,
                  minWidth: '100px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: siteIconCategory === 'brands' ? 'var(--accent-primary)' : 'transparent',
                  color: siteIconCategory === 'brands' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '11.5px',
                  fontWeight: siteIconCategory === 'brands' ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                🌟 Marcas ({BRAND_ICON_PRESETS.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setSiteIconCategory('system');
                  setSiteIconSearch('');
                }}
                style={{
                  flex: 1,
                  minWidth: '100px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: siteIconCategory === 'system' ? 'var(--accent-primary)' : 'transparent',
                  color: siteIconCategory === 'system' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '11.5px',
                  fontWeight: siteIconCategory === 'system' ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                ⌨️ Sistema ({SYSTEM_ICON_PRESETS.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setSiteIconCategory('emoji');
                  setSiteIconSearch('');
                }}
                style={{
                  flex: 1,
                  minWidth: '80px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: siteIconCategory === 'emoji' ? 'var(--accent-primary)' : 'transparent',
                  color: siteIconCategory === 'emoji' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '11.5px',
                  fontWeight: siteIconCategory === 'emoji' ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                😀 Emojis
              </button>

              <button
                type="button"
                onClick={() => {
                  setSiteIconCategory('upload');
                  setSiteIconSearch('');
                }}
                style={{
                  flex: 1,
                  minWidth: '110px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: siteIconCategory === 'upload' ? 'var(--accent-primary)' : 'transparent',
                  color: siteIconCategory === 'upload' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '11.5px',
                  fontWeight: siteIconCategory === 'upload' ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                🖼️ Upload / URL {customUploadedIcons.length > 0 ? `(${customUploadedIcons.length})` : ''}
              </button>
            </div>

            {/* Barra de Pesquisa Rápida (para abas de Marcas e Sistema) */}
            {(siteIconCategory === 'brands' || siteIconCategory === 'system') && (
              <div style={{ marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="Filtrar ícones..."
                  value={siteIconSearch}
                  onChange={(e) => setSiteIconSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            {/* 1. Grade de Marcas Famosas */}
            {siteIconCategory === 'brands' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
                  gap: '8px',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  padding: '8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {BRAND_ICON_PRESETS.filter((item) =>
                  item.label.toLowerCase().includes(siteIconSearch.toLowerCase()) ||
                  item.id.toLowerCase().includes(siteIconSearch.toLowerCase())
                ).map((iconOpt) => {
                  const IconComp = iconOpt.icon;
                  const isSelected = siteIcon === iconOpt.id;

                  return (
                    <button
                      type="button"
                      key={iconOpt.id}
                      onClick={() => setSiteIcon(iconOpt.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '8px 4px',
                        borderRadius: '6px',
                        border: isSelected ? `2px solid ${siteColor}` : '1px solid rgba(255, 255, 255, 0.06)',
                        backgroundColor: isSelected ? `${siteColor}22` : 'rgba(255, 255, 255, 0.02)',
                        color: isSelected ? '#ffffff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title={iconOpt.label}
                    >
                      <IconComp size={18} color={isSelected ? siteColor : '#ffffff'} />
                      <span style={{ fontSize: '10px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', whiteSpace: 'nowrap' }}>
                        {iconOpt.label.split('/')[0].trim()}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. Grade de Ícones do Sistema & Teclado */}
            {siteIconCategory === 'system' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
                  gap: '8px',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  padding: '8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {SYSTEM_ICON_PRESETS.filter((item) =>
                  item.label.toLowerCase().includes(siteIconSearch.toLowerCase()) ||
                  item.id.toLowerCase().includes(siteIconSearch.toLowerCase())
                ).map((iconOpt) => {
                  const IconComp = iconOpt.icon;
                  const isSelected = siteIcon === iconOpt.id;

                  return (
                    <button
                      type="button"
                      key={iconOpt.id}
                      onClick={() => setSiteIcon(iconOpt.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '8px 4px',
                        borderRadius: '6px',
                        border: isSelected ? `2px solid ${siteColor}` : '1px solid rgba(255, 255, 255, 0.06)',
                        backgroundColor: isSelected ? `${siteColor}22` : 'rgba(255, 255, 255, 0.02)',
                        color: isSelected ? '#ffffff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title={iconOpt.label}
                    >
                      <IconComp size={17} color={isSelected ? siteColor : 'currentColor'} />
                      <span style={{ fontSize: '10px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', whiteSpace: 'nowrap' }}>
                        {iconOpt.label.split('/')[0].trim()}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. Grade de Emojis do Teclado + Digitação Livre */}
            {siteIconCategory === 'emoji' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Cole ou digite qualquer emoji (ex: 🦄, ⚡, 🚀)..."
                    value={siteEmojiInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSiteEmojiInput(val);
                      if (val.trim()) {
                        setSiteIcon(`emoji:${val.trim()}`);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    Atalho: <kbd style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: '4px' }}>Win + .</kbd>
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))',
                    gap: '6px',
                    maxHeight: '110px',
                    overflowY: 'auto',
                    padding: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {EMOJI_KEYBOARD_PRESETS.map((em) => {
                    const isSelected = siteIcon === `emoji:${em}` || siteIcon === em;
                    return (
                      <button
                        type="button"
                        key={em}
                        onClick={() => {
                          setSiteIcon(`emoji:${em}`);
                          setSiteEmojiInput(em);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '34px',
                          borderRadius: '6px',
                          fontSize: '18px',
                          border: isSelected ? `2px solid ${siteColor}` : '1px solid rgba(255, 255, 255, 0.06)',
                          backgroundColor: isSelected ? `${siteColor}33` : 'rgba(255, 255, 255, 0.02)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {em}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Aba de Upload de Imagem, URL e Biblioteca Salva */}
            {siteIconCategory === 'upload' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="file"
                  ref={siteFileInputRef}
                  accept="image/*,.svg,.ico,.png,.jpg,.jpeg,.webp"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                      e.target.value = '';
                    }
                  }}
                />

                {/* Dropzone de Upload */}
                <div
                  onClick={() => siteFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                  style={{
                    border: '1.5px dashed rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '12px 10px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: `${siteColor}22`,
                      color: siteColor,
                      flexShrink: 0,
                    }}
                  >
                    <Upload size={16} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
                      Escolher imagem do computador (PNG, SVG, JPG, WebP)
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      Redimensionamento automático inteligente (128x128px max)
                    </div>
                  </div>
                </div>

                {/* Inserir URL Direta de Imagem */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="Ou cole a URL direta de uma imagem (https://.../logo.png)..."
                    value={customImageUrlInput}
                    onChange={(e) => setCustomImageUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customImageUrlInput.trim()) {
                          setSiteIcon(customImageUrlInput.trim());
                          saveCustomUploadedIcon(customImageUrlInput.trim());
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      color: '#ffffff',
                      fontSize: '11.5px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customImageUrlInput.trim()) {
                        setSiteIcon(customImageUrlInput.trim());
                        saveCustomUploadedIcon(customImageUrlInput.trim());
                      }
                    }}
                    disabled={!customImageUrlInput.trim()}
                    style={{
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: customImageUrlInput.trim() ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                      color: customImageUrlInput.trim() ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: customImageUrlInput.trim() ? 'pointer' : 'not-allowed',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Aplicar
                  </button>
                </div>

                {/* Galeria de Ícones Personalizados Salvos */}
                {customUploadedIcons.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Ícones salvos na sua biblioteca ({customUploadedIcons.length}):
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Clique para usar
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                        gap: '6px',
                        maxHeight: '96px',
                        overflowY: 'auto',
                        padding: '6px',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {customUploadedIcons.map((iconItem, idx) => {
                        const isSelected = siteIcon === iconItem;
                        return (
                          <div
                            key={idx}
                            style={{
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: '38px',
                              borderRadius: '6px',
                              border: isSelected ? `2px solid ${siteColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                              backgroundColor: isSelected ? `${siteColor}22` : 'rgba(255, 255, 255, 0.03)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              padding: '2px',
                            }}
                            onClick={() => setSiteIcon(iconItem)}
                          >
                            <DynamicCustomIcon iconKey={iconItem} size={20} color={isSelected ? siteColor : '#ffffff'} />
                            <button
                              type="button"
                              title="Remover da biblioteca"
                              onClick={(e) => handleDeleteCustomUploadedIcon(iconItem, e)}
                              style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                backgroundColor: '#f43f5e',
                                border: 'none',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                              }}
                            >
                              <X size={9} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seletor de Cores */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
              Cor do Badge
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLOR_PRESETS.map((c) => (
                <div
                  key={c}
                  onClick={() => setSiteColor(c)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: siteColor === c ? '2px solid #ffffff' : '2px solid transparent',
                    boxShadow: siteColor === c ? `0 0 8px ${c}` : 'none',
                    transform: siteColor === c ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tópico de Destino */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
              Tópico de Destino na Barra Lateral
            </label>
            <select
              value={siteTargetGroup}
              onChange={(e) => setSiteTargetGroup(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="root">📂 Botão Avulso (Nível Raiz)</option>
              {availableGroups
                .filter((g) => g && g.id)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    📁 Agrupar em: {g.title}
                  </option>
                ))}
            </select>
          </div>

          {/* Ações do Modal */}
          <div
            style={{
              display: 'flex',
              justifyContent: siteToEdit && onDelete ? 'space-between' : 'flex-end',
              alignItems: 'center',
              gap: '10px',
              marginTop: '8px',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            {siteToEdit && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Deseja realmente excluir o site "${siteToEdit.title}"?`)) {
                    onDelete(siteToEdit.id);
                    onClose();
                  }
                }}
                className="btn btn-danger"
                style={{
                  backgroundColor: 'rgba(244, 63, 94, 0.15)',
                  color: '#fb7185',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  padding: '8px 14px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Excluir Site
              </button>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving || !siteTitle.trim() || !siteUrl.trim()}
                className="btn btn-primary"
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: siteColor || 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: isSaving || !siteTitle.trim() || !siteUrl.trim() ? 0.6 : 1,
                  cursor: isSaving || !siteTitle.trim() || !siteUrl.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {isSaving && <Loader2 size={14} className="spin-icon" />}
                <span>{siteToEdit ? 'Salvar Alterações' : 'Salvar e Adicionar'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
