import React, { useRef, useState, useEffect } from 'react';
import {
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Home,
  ExternalLink,
  Loader2,
  ShieldCheck,
  MessageSquare,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export const TeamsView: React.FC = () => {
  const webviewRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const TEAMS_URL = 'https://teams.microsoft.com';
  const CHROME_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

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
        // Ignora caso webview ainda não tenha o método disponível
      }
    };

    const handleFailLoad = (e: any) => {
      // Ignora cancelamentos de requisições internas normais
      if (e.errorCode === -3 || e.errorDescription === 'ERR_ABORTED') return;
      setIsLoading(false);
      setIsInitialLoad(false);
      setHasError(true);
      setErrorMessage(e.errorDescription || 'Falha ao conectar aos servidores do Microsoft Teams.');
    };

    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('did-fail-load', handleFailLoad);

    return () => {
      webview.removeEventListener('did-start-loading', handleStartLoading);
      webview.removeEventListener('did-stop-loading', handleStopLoading);
      webview.removeEventListener('did-fail-load', handleFailLoad);
    };
  }, []);

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

  const handleNavigate = (url: string) => {
    setHasError(false);
    setIsLoading(true);
    if (webviewRef.current) {
      webviewRef.current.loadURL(url);
    }
  };

  const handleOpenExternal = () => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(TEAMS_URL);
    } else {
      window.open(TEAMS_URL, '_blank');
    }
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
          <button onClick={handleReload} style={styles.toolButton} title="Recarregar Teams">
            <RotateCcw size={16} className={isLoading ? 'spin-icon' : ''} />
          </button>
          <button onClick={() => handleNavigate(TEAMS_URL)} style={styles.toolButton} title="Página Inicial do Teams">
            <Home size={16} />
          </button>
        </div>

        {/* Separador */}
        <div style={styles.divider} />

        {/* Atalhos Rápidos */}
        <div style={styles.shortcutsGroup}>
          <button
            onClick={() => handleNavigate('https://teams.microsoft.com/_#/conversations/')}
            style={styles.pillButton}
            title="Ir para Conversas e Chats"
          >
            <MessageSquare size={14} color="#6366f1" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => handleNavigate('https://teams.microsoft.com/_#/calendarv2')}
            style={styles.pillButton}
            title="Ir para Calendário"
          >
            <Calendar size={14} color="#10b981" />
            <span>Calendário</span>
          </button>
        </div>

        {/* Status da Sessão e Ações Externas */}
        <div style={styles.rightGroup}>
          <div style={styles.badge} title="Sessão e login são salvos automaticamente no aplicativo">
            <ShieldCheck size={14} color="#10b981" />
            <span>Sessão Persistente</span>
          </div>

          <button
            onClick={handleOpenExternal}
            style={styles.openExternalButton}
            title="Abrir Microsoft Teams no navegador externo"
          >
            <ExternalLink size={14} />
            <span>Abrir no Navegador</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal: WebView */}
      <div style={styles.webviewWrapper}>
        {/* Barra de Progresso Superior (Posição Absoluta: zero Layout Shift / sem tremores) */}
        {isLoading && (
          <div style={styles.progressBarContainer}>
            <div className="teams-loading-bar-inner" />
          </div>
        )}

        {/* Overlay Suave de Carregamento Inicial */}
        {isInitialLoad && !hasError && (
          <div style={styles.initialLoadingOverlay}>
            <div style={styles.initialLoadingCard}>
              <Loader2 size={36} className="spin-icon" color="#6366f1" />
              <span style={styles.initialLoadingText}>Carregando Microsoft Teams...</span>
            </div>
          </div>
        )}

        {hasError ? (
          <div style={styles.errorContainer}>
            <div style={styles.errorCard}>
              <AlertCircle size={44} color="#f43f5e" style={{ marginBottom: '16px' }} />
              <h3 style={styles.errorTitle}>Não foi possível carregar o Teams</h3>
              <p style={styles.errorText}>
                {errorMessage || 'Verifique sua conexão com a internet ou as permissões de acesso.'}
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
        ) : null}

        <webview
          ref={webviewRef}
          src={TEAMS_URL}
          partition="persist:teams"
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
  shortcutsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginLeft: 'auto',
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
    animation: 'fadeIn 0.2s ease',
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
