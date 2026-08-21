import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  Download,
  Eye,
  Table as TableIcon,
  FileCode,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  Folder,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { marked } from 'marked';

// Configure marked options for Markdown rendering
marked.setOptions({
  gfm: true,
  breaks: true,
});

interface FileViewerModalProps {
  filePath?: string;
  fileData?: { mimeType: string; base64: string; text?: string; fileName: string; size: number };
  onClose: () => void;
  embedded?: boolean;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ filePath, fileData: initialData, onClose, embedded = false }) => {
  const [fileData, setFileData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  // Word docx HTML output
  const [docxHtml, setDocxHtml] = useState<string | null>(null);

  // PDF Blob URL
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  // Excel sheets state
  const [excelSheets, setExcelSheets] = useState<{ name: string; html: string }[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  // View mode for text/markdown files: 'markdown' or 'raw'
  const [viewMode, setViewMode] = useState<'markdown' | 'raw'>('markdown');
  // View mode for CSV: 'table' or 'raw'
  const [csvViewMode, setCsvViewMode] = useState<'table' | 'raw'>('table');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fileName = fileData?.fileName || (filePath ? filePath.split(/[/\\]/).pop() : '');
    const currentExt = (fileName?.split('.').pop() || '').toLowerCase();

    if (fileData?.base64 && (currentExt === 'pdf' || fileData.mimeType === 'application/pdf')) {
      try {
        const binaryString = atob(fileData.base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (e) {
        console.error('[PDF Blob Error]:', e);
      }
    }
  }, [fileData?.base64, filePath]);

  useEffect(() => {
    if (initialData) {
      processFile(initialData);
      return;
    }

    if (filePath && window.electronAPI?.readLocalFile) {
      setLoading(true);
      setError(null);
      window.electronAPI
        .readLocalFile(filePath)
        .then((data) => {
          setFileData(data);
          processFile(data);
        })
        .catch((err) => {
          console.error('[FileViewerModal Error]:', err);
          setError(err.message || 'Erro ao carregar o arquivo local.');
        })
        .finally(() => setLoading(false));
    }
  }, [filePath, initialData]);

  const processFile = async (data: { mimeType: string; base64: string; text?: string; fileName: string; size: number }) => {
    try {
      const ext = (data.fileName.split('.').pop() || '').toLowerCase();

      // Convert Base64 to ArrayBuffer
      const binaryString = atob(data.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      // Decode text if missing and file is text-based or CSV
      if (
        !data.text &&
        (data.mimeType.startsWith('text/') ||
          ext === 'csv' ||
          ['md', 'markdown', 'txt', 'json', 'log', 'html', 'js', 'ts', 'css', 'py', 'sh', 'xml', 'yaml', 'yml'].includes(ext))
      ) {
        try {
          const textDecoded = new TextDecoder('utf-8').decode(bytes);
          setFileData((prev) => (prev ? { ...prev, text: textDecoded } : { ...data, text: textDecoded }));
        } catch (tErr) {
          console.error('[FileViewerModal Text Decode Error]:', tErr);
        }
      }

      // Default view mode: Markdown for .md, .markdown, .txt or documents with markdown indicators
      if (['md', 'markdown'].includes(ext)) {
        setViewMode('markdown');
      } else {
        setViewMode('raw');
      }

      // 1. Process Word (.docx, .doc)
      if (ext === 'docx' || ext === 'doc' || data.mimeType.includes('wordprocessingml') || data.mimeType.includes('msword')) {
        try {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocxHtml(result.value || '<p>Documento Word sem conteúdo de texto visível.</p>');
        } catch (mErr) {
          console.error('[FileViewerModal Mammoth Error]:', mErr);
          setDocxHtml(
            '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Não foi possível converter a pré-visualização deste documento Word. Utilize o botão <b>Baixar</b> no topo para abri-lo localmente.</p>'
          );
        }
      }

      // 2. Process Excel / CSV (.xlsx, .xls, .csv)
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || data.mimeType.includes('spreadsheet') || data.mimeType.includes('excel')) {
        try {
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheets: { name: string; html: string }[] = [];

          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const html = XLSX.utils.sheet_to_html(worksheet, { id: 'excel-table' });
            sheets.push({ name: sheetName, html });
          });

          setExcelSheets(sheets);
          setActiveSheetIndex(0);
        } catch (xErr) {
          console.error('[FileViewerModal Excel Error]:', xErr);
        }
      }
    } catch (err: any) {
      console.warn('[FileViewerModal Process Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  const fileName = fileData?.fileName || (filePath ? filePath.split(/[/\\]/).pop() : 'Visualizador de Arquivo');
  const ext = (fileName?.split('.').pop() || '').toLowerCase();
  const isTextLike =
    fileData?.text !== undefined &&
    !['pdf', 'docx', 'doc', 'xlsx', 'xls', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);

  // Markdown parsed HTML
  const parsedMarkdownHtml = useMemo(() => {
    if (!fileData?.text) return '';
    try {
      return marked.parse(fileData.text) as string;
    } catch (e) {
      console.error('[FileViewerModal Markdown Parse Error]:', e);
      return fileData.text;
    }
  }, [fileData?.text]);

  const handleCopyContent = () => {
    if (!fileData?.text) return;
    navigator.clipboard.writeText(fileData.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!filePath && !fileData && !loading && !error) return null;

  const mainContent = (
    <div
      className={embedded ? '' : 'modal-content'}
      style={{
        width: embedded ? '100%' : '90vw',
        maxWidth: embedded ? '100%' : '1200px',
        height: embedded ? '100%' : '88vh',
        maxHeight: embedded ? '100%' : '900px',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        backgroundColor: '#181825',
        border: embedded ? 'none' : '1px solid var(--border-subtle)',
        borderRadius: embedded ? '12px' : '16px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(0,0,0,0.25)',
          flexShrink: 0,
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <FileText size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#ffffff',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {fileName}
            </h3>
            {fileData?.size && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {(fileData.size / 1024).toFixed(1)} KB · {ext.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* CSV toggle controls */}
          {ext === 'csv' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.06)',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                gap: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => setCsvViewMode('table')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: csvViewMode === 'table' ? 'var(--accent-primary)' : 'transparent',
                  color: csvViewMode === 'table' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
                title="Exibir tabela processada"
              >
                <TableIcon size={13} /> Tabela
              </button>
              <button
                type="button"
                onClick={() => setCsvViewMode('raw')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: csvViewMode === 'raw' ? 'var(--accent-primary)' : 'transparent',
                  color: csvViewMode === 'raw' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
                title="Exibir texto bruto do CSV"
              >
                <FileCode size={13} /> Texto CSV
              </button>
            </div>
          )}

          {/* Markdown / Raw toggle controls for text/markdown files */}
          {isTextLike && ext !== 'csv' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.06)',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                gap: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('markdown')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'markdown' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'markdown' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
                title="Exibir formatado em Markdown"
              >
                <Sparkles size={13} /> Markdown
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'raw' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'raw' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
                title="Exibir texto / código puro"
              >
                <FileCode size={13} /> Código / Texto
              </button>
            </div>
          )}

          {/* Reveal in Explorer Button */}
          {filePath && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => (window as any).electronAPI?.showItemInFolder?.(filePath)}
              style={{ padding: '5px 10px', fontSize: '12px', gap: '6px' }}
              title="Abrir pasta do arquivo no Windows Explorer"
            >
              <Folder size={13} /> Abrir na Pasta
            </button>
          )}

          {/* Copy Button for text files */}
          {fileData?.text && (isTextLike || ext === 'csv') && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCopyContent}
              style={{ padding: '5px 10px', fontSize: '12px', gap: '6px' }}
              title="Copiar conteúdo"
            >
              {copied ? <Check size={13} color="#4ade80" /> : <Copy size={13} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          )}

          {fileData?.base64 && (
            <a
              href={`data:${fileData.mimeType};base64,${fileData.base64}`}
              download={fileName}
              className="btn btn-secondary"
              style={{ padding: '5px 10px', fontSize: '12px', gap: '6px', textDecoration: 'none' }}
            >
              <Download size={13} /> Baixar
            </a>
          )}
          <button className="btn-icon" onClick={onClose} title="Fechar visualização">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {loading ? (
          <div style={styles.centerBox}>
            <RefreshCw size={36} color="var(--accent-primary)" className="spin-anim" />
            <p style={{ marginTop: '14px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Carregando e processando arquivo...
            </p>
          </div>
        ) : error ? (
          <div style={styles.centerBox}>
            <AlertCircle size={44} color="#ef4444" />
            <h3 style={{ marginTop: '12px', color: '#ffffff', fontSize: '16px' }}>Não foi possível carregar o arquivo</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '450px', textAlign: 'center', fontSize: '13px' }}>{error}</p>
          </div>
        ) : (
          <>
            {/* PDF Viewer */}
            {ext === 'pdf' || fileData?.mimeType === 'application/pdf' ? (
              pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  title={fileName}
                  style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#525659' }}
                />
              ) : (
                <div style={styles.centerBox}>
                  <RefreshCw size={32} color="var(--accent-primary)" className="spin-anim" />
                  <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Gerando leitor de PDF...</p>
                </div>
              )
            ) : null}

            {/* Word Viewer (.docx) */}
            {ext === 'docx' && docxHtml !== null ? (
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', backgroundColor: 'var(--bg-main)' }}>
                <div
                  className="markdown-body"
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    margin: '0 auto',
                    padding: '28px 36px',
                    backgroundColor: 'var(--bg-card-app)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    lineHeight: '1.7',
                  }}
                  dangerouslySetInnerHTML={{ __html: docxHtml }}
                />
              </div>
            ) : null}

            {/* Excel (.xlsx, .xls) / CSV Table Viewer */}
            {(ext === 'xlsx' || ext === 'xls' || (ext === 'csv' && csvViewMode === 'table')) && excelSheets.length > 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Sheet Tabs */}
                {excelSheets.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '4px',
                      padding: '8px 16px',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      borderBottom: '1px solid var(--border-subtle)',
                      overflowX: 'auto',
                      flexShrink: 0,
                    }}
                  >
                    {excelSheets.map((sheet, sIdx) => (
                      <button
                        key={sheet.name}
                        onClick={() => setActiveSheetIndex(sIdx)}
                        style={{
                          padding: '5px 14px',
                          fontSize: '12px',
                          fontWeight: '600',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: activeSheetIndex === sIdx ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                          color: activeSheetIndex === sIdx ? '#ffffff' : 'var(--text-secondary)',
                        }}
                      >
                        <TableIcon size={12} style={{ marginRight: '6px' }} />
                        {sheet.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Rendered Excel/CSV HTML Table */}
                <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
                  <div
                    className="excel-table-container"
                    dangerouslySetInnerHTML={{ __html: excelSheets[activeSheetIndex]?.html || '<p>Aba vazia.</p>' }}
                  />
                </div>
              </div>
            ) : null}

            {/* CSV Raw Text Viewer */}
            {ext === 'csv' && csvViewMode === 'raw' && fileData?.text ? (
              <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', backgroundColor: 'var(--bg-main)' }}>
                <pre
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    margin: '0 auto',
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: '13px',
                    color: '#a5b4fc',
                    backgroundColor: '#141420',
                    padding: '24px',
                    borderRadius: '10px',
                    border: '1px solid rgba(99,102,241,0.25)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {fileData.text}
                </pre>
              </div>
            ) : null}

            {/* Image Viewer */}
            {['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) || fileData?.mimeType.startsWith('image/') ? (
              <div style={{ ...styles.centerBox, padding: '20px', overflow: 'auto' }}>
                <img
                  src={`data:${fileData?.mimeType || 'image/png'};base64,${fileData?.base64}`}
                  alt={fileName}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
                />
              </div>
            ) : null}

            {/* Markdown / Text / Log / JSON Viewer */}
            {isTextLike && ext !== 'csv' ? (
              viewMode === 'markdown' ? (
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', backgroundColor: 'var(--bg-main)' }}>
                  <div
                    className="markdown-body"
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      margin: '0 auto',
                      padding: '28px 36px',
                      backgroundColor: 'var(--bg-card-app)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      lineHeight: '1.7',
                    }}
                    dangerouslySetInnerHTML={{ __html: parsedMarkdownHtml }}
                  />
                </div>
              ) : (
                <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', backgroundColor: 'var(--bg-main)' }}>
                  <pre
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      margin: '0 auto',
                      fontFamily: 'Consolas, Monaco, monospace',
                      fontSize: '13px',
                      color: '#a5b4fc',
                      backgroundColor: '#141420',
                      padding: '24px',
                      borderRadius: '10px',
                      border: '1px solid rgba(99,102,241,0.25)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {fileData?.text}
                  </pre>
                </div>
              )
            ) : null}
          </>
        )}
      </div>
    </div>
  );

  if (embedded) return mainContent;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      {mainContent}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  centerBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
  },
};
