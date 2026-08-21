import React from 'react';
import { Sparkles, Download, RefreshCw, Zap, X, CheckCircle2, ArrowRight } from 'lucide-react';

interface UpdateModalProps {
  isOpen: boolean;
  updateStatus: {
    state: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'not-available';
    version?: string;
    releaseNotes?: string;
    progress?: number;
    errorMessage?: string;
  };
  onDownload: () => void;
  onInstall: () => void;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  updateStatus,
  onDownload,
  onInstall,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#181825',
          borderRadius: '20px',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.2)',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          color: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <X size={18} />
        </button>

        {/* Header with glowing icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
              flexShrink: 0,
            }}
          >
            <Sparkles size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                Nova Versão Disponível!
              </h2>
              <span
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.2)',
                  color: '#818cf8',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '700',
                }}
              >
                v{updateStatus.version || 'Recente'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Uma nova atualização do <strong>Simplify your Work</strong> foi lançada no GitHub.
            </p>
          </div>
        </div>

        {/* Body Content based on State */}
        {updateStatus.state === 'available' && (
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '14px',
              padding: '16px',
              border: '1px solid var(--border-subtle)',
              fontSize: '13px',
              lineHeight: '1.5',
              color: 'var(--text-primary)',
            }}
          >
            <p style={{ margin: 0 }}>
              Deseja baixar e atualizar o aplicativo agora? O download acontece em segundo plano sem interromper o seu trabalho.
            </p>
          </div>
        )}

        {updateStatus.state === 'downloading' && (
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '14px',
              padding: '16px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#ffffff', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={14} className="spin" color="#6366f1" /> Baixando atualização...
              </span>
              <span style={{ color: '#6366f1', fontWeight: '800' }}>{updateStatus.progress || 0}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${updateStatus.progress || 0}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        {updateStatus.state === 'downloaded' && (
          <div
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              borderRadius: '14px',
              padding: '16px',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <CheckCircle2 size={24} color="#10b981" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '13px' }}>
              <strong style={{ color: '#10b981', display: 'block', marginBottom: '2px' }}>
                Download Concluído com Sucesso!
              </strong>
              <span style={{ color: 'var(--text-secondary)' }}>
                Clique em reiniciar para aplicar as novidades imediatamente.
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
          {updateStatus.state === 'available' && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                style={{ padding: '10px 18px', fontSize: '13px', fontWeight: '600' }}
              >
                Lembrar Mais Tarde
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onDownload}
                style={{
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                }}
              >
                <Download size={16} /> Atualizar Agora
              </button>
            </>
          )}

          {updateStatus.state === 'downloading' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ padding: '10px 18px', fontSize: '13px', fontWeight: '600' }}
            >
              Ocultar e Continuar Trabalhando
            </button>
          )}

          {updateStatus.state === 'downloaded' && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                style={{ padding: '10px 18px', fontSize: '13px', fontWeight: '600' }}
              >
                Mais Tarde
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onInstall}
                style={{
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#10b981',
                }}
              >
                <Zap size={16} /> Reiniciar & Aplicar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
