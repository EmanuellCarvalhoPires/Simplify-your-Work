import React, { useState, useEffect } from 'react';
import {
  X,
  Briefcase,
  Building2,
  Tag,
  Mail,
  Phone,
  FileText,
  Layers,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { ClientAsset, ClientStatus, JiraInstance } from '../../types/index';

interface ClientModalProps {
  isOpen: boolean;
  clientToEdit?: ClientAsset | null;
  jiraInstances: JiraInstance[];
  onClose: () => void;
  onSave: (client: Partial<ClientAsset> & { name: string }) => Promise<void>;
}

const COLOR_PRESETS = [
  { label: 'Azul Atlassian', color: '#0052cc' },
  { label: 'Índigo Primário', color: '#6366f1' },
  { label: 'Esmeralda', color: '#10b981' },
  { label: 'Ciano', color: '#06b6d4' },
  { label: 'Âmbar', color: '#f59e0b' },
  { label: 'Rosa / Magenta', color: '#ec4899' },
  { label: 'Púrpura', color: '#8b5cf6' },
  { label: 'Vermelho', color: '#ef4444' },
];

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  clientToEdit,
  jiraInstances,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ClientStatus>('ACTIVE');
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>([]);
  const [color, setColor] = useState('#0052cc');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (clientToEdit) {
      setName(clientToEdit.name || '');
      setDescription(clientToEdit.description || '');
      setStatus(clientToEdit.status || 'ACTIVE');
      setSelectedInstanceIds(clientToEdit.instanceIds || []);
      setColor(clientToEdit.color || '#0052cc');
      setContactEmail(clientToEdit.contactEmail || '');
      setContactPhone(clientToEdit.contactPhone || '');
    } else {
      setName('');
      setDescription('');
      setStatus('ACTIVE');
      setSelectedInstanceIds([]);
      setColor('#0052cc');
      setContactEmail('');
      setContactPhone('');
    }
    setErrorMsg('');
  }, [clientToEdit, isOpen]);

  if (!isOpen) return null;

  const handleToggleInstance = (instanceId: string) => {
    setSelectedInstanceIds((prev) =>
      prev.includes(instanceId) ? prev.filter((id) => id !== instanceId) : [...prev, instanceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('O nome do cliente é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onSave({
        id: clientToEdit?.id,
        name: cleanName,
        description: description.trim(),
        status,
        color,
        instanceIds: selectedInstanceIds,
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        linkedTicketIds: clientToEdit?.linkedTicketIds || [],
        linkedNoteIds: clientToEdit?.linkedNoteIds || [],
        linkedFolderIds: clientToEdit?.linkedFolderIds || [],
        linkedEventIds: clientToEdit?.linkedEventIds || [],
        linkedReminderIds: clientToEdit?.linkedReminderIds || [],
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--bg-card-app)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(0, 0, 0, 0.18)',
            borderTop: `4px solid ${color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: `${color}25`,
                border: `1px solid ${color}60`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color,
              }}
            >
              <Briefcase size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#fff' }}>
                {clientToEdit ? 'Editar Cliente / Asset' : 'Novo Cliente / Asset'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Cadastre e atribua instâncias, tickets, anotações e reuniões.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              overflowY: 'auto',
              maxHeight: 'calc(90vh - 140px)',
            }}
          >
            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={16} /> {errorMsg}
              </div>
            )}

            {/* Field: Nome (Obrigatório) */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Nome do Cliente / Organização <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Acerto, Minha Empresa, Grupo Alpha..."
                required
                autoFocus
                style={{ fontSize: '13px' }}
              />
            </div>

            {/* Field: Descrição (Opcional) */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Descrição / Escopo (Opcional)
              </label>
              <textarea
                className="input-field"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes, escopo do contrato, serviços prestados, notas gerais..."
                rows={3}
                style={{ fontSize: '13px', resize: 'vertical' }}
              />
            </div>

            {/* Field: Instâncias Jira Vinculadas */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                <Layers size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                Instâncias Atlassian / Jira Cadastradas
              </label>
              {jiraInstances.length === 0 ? (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px dashed var(--border-subtle)',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                  }}
                >
                  Nenhuma instância Jira cadastrada no app ainda. Você pode vincular após cadastrar nas Configurações.
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    maxHeight: '140px',
                    overflowY: 'auto',
                    padding: '6px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.15)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {jiraInstances.map((inst) => {
                    const isSelected = selectedInstanceIds.includes(inst.id);
                    return (
                      <div
                        key={inst.id}
                        onClick={() => handleToggleInstance(inst.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          backgroundColor: isSelected ? 'rgba(0, 82, 204, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid #0052cc' : '1px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <img
                            src="./assets/jira-badge.png"
                            alt="Jira"
                            style={{ width: '16px', height: '16px', flexShrink: 0 }}
                          />
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {inst.name}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {inst.domain}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: isSelected ? '1px solid #0052cc' : '1px solid var(--border-subtle)',
                            backgroundColor: isSelected ? '#0052cc' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && <Check size={12} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Field: Status & Cor */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Status do Cliente
                </label>
                <select
                  className="input-field"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ClientStatus)}
                  style={{ fontSize: '13px' }}
                >
                  <option value="ACTIVE">🟢 Ativo (Contrato Vigente)</option>
                  <option value="PROSPECT">🟡 Prospect (Negociação / Lead)</option>
                  <option value="INACTIVE">⚪ Inativo</option>
                  <option value="ARCHIVED">📦 Arquivado</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Cor Temática do Card
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.color}
                      type="button"
                      onClick={() => setColor(p.color)}
                      title={p.label}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: p.color,
                        border: color === p.color ? '2px solid #ffffff' : '2px solid transparent',
                        boxShadow: color === p.color ? `0 0 8px ${p.color}` : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Field: Contato (E-mail e Telefone Opcionais) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  <Mail size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                  E-mail de Contato
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contato@cliente.com"
                  style={{ fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  <Phone size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                  Telefone / Ramal
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'rgba(0, 0, 0, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ padding: '8px 20px', fontSize: '13px', backgroundColor: color }}
            >
              {isSubmitting ? 'Salvando...' : clientToEdit ? 'Atualizar Cliente' : 'Criar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
