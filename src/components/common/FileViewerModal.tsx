import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Eye, Table as TableIcon, FileCode, AlertCircle, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

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

  // Excel sheets state
  const [excelSheets, setExcelSheets] = useState<{ name: string; html: string }[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

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

      // 1. Process Word (.docx, .doc)
      if (ext === 'docx' || ext === 'doc' || data.mimeType.includes('wordprocessingml') || data.mimeType.includes('msword')) {
        try {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocxHtml(result.value || '<p>Documento Word sem conteúdo de texto visível.</p>');
        } catch (mErr) {
          console.error('[FileViewerModal Mammoth Error]:', mErr);
          setDocxHtml('<p style="color: var(--text-muted); text-align: center; padding: 20px;">Não foi possível converter a pré-visualização deste documento Word. Utilize o botão <b>Baixar</b> no topo para abri-lo localmente.</p>');
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

  if (!filePath && !fileData && !loading && !error) return null;

  const fileName = fileData?.fileName || (filePath ? filePath.split(/[/\\]/).pop() : 'Visualizador de Arquivo');
  const ext = (fileName?.split('.').pop() || '').toLowerCase();

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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText size={18} color="var(--accent-primary)" />
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              {fileName}
            </h3>
            {fileData?.size && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {(fileData.size / 1024).toFixed(1)} KB · {ext.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>{error}</p>
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
              <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', backgroundColor: 'var(--bg-main)' }}>
                <div
                  className="markdown-body"
                  style={{
                    maxWidth: '850px',
                    margin: '0 auto',
                    padding: '30px',
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

            {/* Excel / CSV Viewer (.xlsx, .xls, .csv) */}
            {(ext === 'xlsx' || ext === 'xls' || ext === 'csv') && excelSheets.length > 0 ? (
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

                {/* Rendered Excel HTML Table */}
                <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
                  <div
                    className="excel-table-container"
                    dangerouslySetInnerHTML={{ __html: excelSheets[activeSheetIndex]?.html || '<p>Aba vazia.</p>' }}
                  />
                </div>
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

            {/* Text / Log / JSON Viewer */}
            {fileData?.text !== undefined && !['pdf', 'docx', 'xlsx', 'xls', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) ? (
              <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                <pre
                  style={{
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: '13px',
                    color: '#a5b4fc',
                    backgroundColor: '#141420',
                    padding: '20px',
                    borderRadius: '10px',
                    border: '1px solid rgba(99,102,241,0.25)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    margin: 0,
                  }}
                >
                  {fileData.text}
                </pre>
              </div>
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
