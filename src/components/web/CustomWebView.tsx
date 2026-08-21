import React, { useRef, useState, useEffect } from 'react';
import {
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Home,
  ExternalLink,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Globe,
} from 'lucide-react';
import type { CustomSite } from '../../types/index';
import { DynamicCustomIcon } from '../common/BrandIcons';

interface CustomWebViewProps {
  site: CustomSite;
  onOpenSettings?: () => void;
}

export const CustomWebView: React.FC<CustomWebViewProps> = ({ site }) => {
  const webviewRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [copied, setCopied] = useState(false);

  const partitionName = site.partition || `persist:custom_${site.id}`;

  const normalizeUrl = (rawUrl: string): string => {
    let clean = (rawUrl || '').trim();
    if (!clean) return 'about:blank';
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    return clean;
  };

  const initialUrl = normalizeUrl(site.url);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
      setIsInitialLoad(false);
    }, 4000);

    const handleStartLoading = () => {
      setIsLoading(true);
      setHasError(false);
    };

    const handleStopLoading = () => {
      setIsLoading(false);
      setIsInitialLoad(false);
      try {
        if (webview.canGoBack) setCanGoBack(webview.canGoBack());
        if (webview.canGoForward) setCanGoForward(webview.canGoForward());
      } catch (e) {
        // Ignora se não estiver disponível
      }
    };

    const handleFailLoad = (e: any) => {
      if (e.errorCode === -3 || e.errorDescription === 'ERR_ABORTED') return;
      setIsLoading(false);
      setIsInitialLoad(false);
      setHasError(true);
      setErrorMessage(e.errorDescription || `Falha ao conectar a ${site.title}.`);
    };

    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('did-finish-load', handleStopLoading);
    webview.addEventListener('dom-ready', handleStopLoading);
    webview.addEventListener('did-fail-load', handleFailLoad);

    return () => {
      clearTimeout(safetyTimer);
      webview.removeEventListener('did-start-loading', handleStartLoading);
      webview.removeEventListener('did-stop-loading', handleStopLoading);
      webview.removeEventListener('did-finish-load', handleStopLoading);
      webview.removeEventListener('dom-ready', handleStopLoading);
      webview.removeEventListener('did-fail-load', handleFailLoad);
    };
  }, [site.id]);

  const handleGoBack = () => {
    if (webviewRef.current && webviewRef.current.canGoBack && webviewRef.current.canGoBack()) {
      webviewRef.current.goBack();
    }
  };

  const handleGoForward = () => {
    if (webviewRef.current && webviewRef.current.canGoForward && webviewRef.current.canGoForward()) {
      webviewRef.current.goForward();
    }
  };

  const handleReload = () => {
    setHasError(false);
    setIsLoading(true);
    if (webviewRef.current) {
      webviewRef.current.reload();
    }
  };

  const handleGoHome = () => {
    setHasError(false);
    setIsLoading(true);
    if (webviewRef.current) {
      webviewRef.current.loadURL(initialUrl);
    }
  };

  const handleOpenExternal = () => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(initialUrl);
    } else {
      window.open(initialUrl, '_blank');
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(initialUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.container}>
      {/* Barra de Ferramentas Superior */}
      <div style={styles.toolbar}>
        <div style={styles.navGroup}>
          <button
            onClick={handleGoBack}
            disabled={!canGoBack}
            style={{
              ...styles.toolButton,
              opacity: canGoBack ? 1 : 0.4,
              cursor: canGoBack ? 'pointer' : 'not-allowed',
            }}
            title="Voltar"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            onClick={handleGoForward}
            disabled={!canGoForward}
            style={{
              ...styles.toolButton,
              opacity: canGoForward ? 1 : 0.4,
              cursor: canGoForward ? 'pointer' : 'not-allowed',
            }}
            title="Avançar"
          >
            <ArrowRight size={16} />
          </button>
          <button onClick={handleReload} style={styles.toolButton} title="Recarregar">
            <RotateCcw size={16} className={isLoading ? 'spin-icon' : ''} />
          </button>
          <button onClick={handleGoHome} style={styles.toolButton} title="Página Inicial do Site">
            <Home size={16} />
          </button>
        </div>

        {/* Separador */}
        <div style={styles.divider} />

        {/* Título do Site e URL */}
        <div style={styles.siteInfo}>
          <DynamicCustomIcon iconKey={site.icon || 'globe'} size={15} color={site.color || 'var(--accent-primary)'} />
          <span style={styles.siteTitle}>{site.title}</span>
          <span style={styles.siteUrlText} title={initialUrl}>
            {initialUrl}
          </span>
        </div>

        {/* Status da Sessão e Ações Externas */}
        <div style={styles.rightGroup}>
          <button
            onClick={handleCopyUrl}
            style={styles.pillButton}
            title="Copiar Link"
          >
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copied ? 'Copiado!' : 'Copiar URL'}</span>
          </button>

          <div style={styles.badge} title="Cookies, logins e dados permanecem salvos no aplicativo">
            <ShieldCheck size={14} color="#10b981" />
            <span>Sessão Persistente</span>
          </div>

          <button
            onClick={handleOpenExternal}
            style={styles.openExternalButton}
            title="Abrir no navegador externo padrão"
          >
            <ExternalLink size={14} />
            <span>Abrir no Navegador</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal: WebView */}
      <div style={styles.webviewWrapper}>
        {/* Barra de Progresso Superior */}
        {isLoading && (
          <div style={styles.progressBarContainer}>
            <div className="teams-loading-bar-inner" />
          </div>
        )}

        {/* Overlay Suave de Carregamento Inicial */}
        {isInitialLoad && !hasError && (
          <div style={styles.initialLoadingOverlay}>
            <div style={styles.initialLoadingCard}>
              <Loader2 size={36} className="spin-icon" color={site.color || '#6366f1'} />
              <span style={styles.initialLoadingText}>Carregando {site.title}...</span>
            </div>
          </div>
        )}

        {hasError && (
          <div style={styles.errorContainer}>
            <div style={styles.errorCard}>
              <AlertCircle size={44} color="#f43f5e" style={{ marginBottom: '16px' }} />
              <h3 style={styles.errorTitle}>Não foi possível carregar {site.title}</h3>
              <p style={styles.errorText}>
                {errorMessage || 'Verifique a conexão com a internet ou se a URL está correta.'}
              </p>
              <div style={styles.errorActions}>
                <button onClick={handleReload} style={styles.retryButton}>
                  <RotateCcw size={16} />
                  <span>Tentar Novamente</span>
                </button>
                <button onClick={handleOpenExternal} style={styles.secondaryButton}>
                  <ExternalLink size={16} />
                  <span>Abrir no Navegador</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <webview
          ref={webviewRef}
          src={initialUrl}
          partition={partitionName}
          allowpopups="true"
          style={{
            width: '100%',
            height: '100%',
            display: hasError ? 'none' : 'flex',
            backgroundColor: '#1b1a1f',
          }}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    backgroundColor: 'var(--bg-header, #1e1e2e)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    zIndex: 10,
    flexShrink: 0,
    gap: '12px',
  },
  navGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  toolButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    color: 'var(--text-primary, #ffffff)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  divider: {
    width: '1px',
    height: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  siteInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    minWidth: 0,
    flex: 1,
    maxWidth: '400px',
  },
  siteTitle: {
    fontWeight: 700,
    fontSize: '13px',
    color: '#ffffff',
  },
  siteUrlText: {
    fontSize: '11.5px',
    color: 'var(--text-muted, #64748b)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginLeft: 'auto',
  },
  pillButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: 'var(--text-primary, #ffffff)',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '20px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    color: '#10b981',
    fontSize: '11px',
    fontWeight: 600,
  },
  openExternalButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text-secondary, #94a3b8)',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    zIndex: 15,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  initialLoadingOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b1a1f',
    zIndex: 10,
  },
  initialLoadingCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '14px',
    padding: '24px 32px',
    borderRadius: '16px',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(8px)',
  },
  initialLoadingText: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#cbd5e1',
  },
  webviewWrapper: {
    position: 'relative',
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#1b1a1f',
    overflow: 'hidden',
  },
  errorContainer: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    zIndex: 20,
    padding: '24px',
  },
  errorCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: '420px',
    padding: '32px',
    borderRadius: '16px',
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  errorTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#ffffff',
    margin: '0 0 8px 0',
  },
  errorText: {
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: 1.5,
    margin: '0 0 24px 0',
  },
  errorActions: {
    display: 'flex',
    gap: '10px',
  },
  retryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '8px',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  secondaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 500,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
  },
};
