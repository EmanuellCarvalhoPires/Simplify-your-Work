import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AlertTriangle, RefreshCw, Trash2, Terminal, Copy, Check } from 'lucide-react';

interface RootErrorBoundaryProps {
  children: React.ReactNode;
}

interface RootErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  copied: boolean;
}

class RootErrorBoundary extends React.Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<RootErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[RootErrorBoundary] Erro crítico capturado:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCacheAndReload = () => {
    if (window.confirm('Isso limpará os dados salvos em cache local no seu navegador/app e reiniciará. Deseja continuar?')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error(e);
      }
      window.location.reload();
    }
  };

  handleOpenDevTools = () => {
    if ((window as any).electronAPI && (window as any).electronAPI.openDevTools) {
      (window as any).electronAPI.openDevTools();
    } else {
      alert('Pressione F12 ou Ctrl+Shift+I no seu teclado para abrir as Ferramentas de Desenvolvedor.');
    }
  };

  handleCopyError = () => {
    const text = `=== SIMPLIFY YOUR WORK - ERRO DIAGNÓSTICO ===\nData: ${new Date().toISOString()}\nErro: ${this.state.error?.name}: ${this.state.error?.message}\nStack:\n${this.state.error?.stack || ''}\nComponentStack:\n${this.state.errorInfo?.componentStack || ''}`;
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 3000);
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            boxSizing: 'border-box',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '680px',
              width: '100%',
              backgroundColor: '#1e293b',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={26} color="#f43f5e" />
              </div>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                  Simplify your Work encontrou uma falha
                </h1>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  O aplicativo capturou um erro durante a inicialização ou renderização.
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '14px 16px',
                maxHeight: '180px',
                overflowY: 'auto',
                fontFamily: 'Consolas, monospace',
                fontSize: '12.5px',
                color: '#fda4af',
                lineHeight: '1.5',
              }}
            >
              <strong>{this.state.error?.name || 'Error'}:</strong> {this.state.error?.message || 'Erro desconhecido'}
              {this.state.error?.stack && (
                <div style={{ marginTop: '8px', color: '#94a3b8', fontSize: '11px', whiteSpace: 'pre-wrap' }}>
                  {this.state.error.stack}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button
                onClick={this.handleReload}
                className="btn btn-primary"
                style={{ flex: '1 1 auto', minWidth: '140px', padding: '10px 16px', gap: '8px' }}
              >
                <RefreshCw size={16} /> Recarregar Aplicativo
              </button>

              <button
                onClick={this.handleCopyError}
                className="btn btn-secondary"
                style={{ flex: '1 1 auto', minWidth: '140px', padding: '10px 16px', gap: '8px' }}
              >
                {this.state.copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                {this.state.copied ? 'Copiado!' : 'Copiar Diagnóstico'}
              </button>

              <button
                onClick={this.handleOpenDevTools}
                className="btn btn-secondary"
                style={{ flex: '1 1 auto', minWidth: '140px', padding: '10px 16px', gap: '8px' }}
              >
                <Terminal size={16} /> Abrir DevTools (F12)
              </button>

              <button
                onClick={this.handleClearCacheAndReload}
                className="btn btn-danger"
                style={{ flex: '1 1 auto', minWidth: '160px', padding: '10px 16px', gap: '8px' }}
              >
                <Trash2 size={16} /> Limpar Cache e Reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
