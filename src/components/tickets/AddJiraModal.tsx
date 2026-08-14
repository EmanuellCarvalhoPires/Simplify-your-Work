import React, { useState, useEffect } from 'react';
import type { JiraInstance, Ticket, SavedJqlQuery } from '../../types/index';
import {
  Search,
  AlertCircle,
  Settings,
  X,
  Loader2,
  CheckCircle2,
  Link2,
  Filter,
  Key,
  Star,
  BookmarkPlus,
  Play,
  Trash2,
} from 'lucide-react';

interface AddJiraModalProps {
  jiraInstances: JiraInstance[];
  existingTickets?: Ticket[];
  onClose: () => void;
  onFetchJiraTicket: (key: string, instanceId: string) => Promise<void>;
  onOpenSettings: () => void;
  onSuccessNotice?: (msg: string) => void;
  onErrorNotice?: (msg: string) => void;
}

export const AddJiraModal: React.FC<AddJiraModalProps> = ({
  jiraInstances,
  existingTickets = [],
  onClose,
  onFetchJiraTicket,
  onOpenSettings,
  onSuccessNotice,
  onErrorNotice,
}) => {
  const [importMode, setImportMode] = useState<'KEY' | 'JQL' | 'FILTER'>('KEY');
  const [ticketKey, setTicketKey] = useState('');
  const [jqlQuery, setJqlQuery] = useState('');
  const [filterLinkOrId, setFilterLinkOrId] = useState('');

  const [selectedInstanceId, setSelectedInstanceId] = useState(
    jiraInstances.length > 0 ? jiraInstances[0].id : ''
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Saved JQL Queries State
  const [savedJqlQueries, setSavedJqlQueries] = useState<SavedJqlQuery[]>([]);
  const [saveQueryName, setSaveQueryName] = useState('');
  const [isSavingQuery, setIsSavingQuery] = useState(false);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.getSavedJqlQueries) {
      window.electronAPI.getSavedJqlQueries().then((queries) => {
        setSavedJqlQueries(queries || []);
      });
    }
  }, []);

  const handleSaveCurrentJql = async () => {
    if (!jqlQuery.trim()) {
      setErrorMsg('Digite uma consulta JQL válida antes de salvar.');
      return;
    }
    const name = saveQueryName.trim() || `Busca JQL ${new Date().toLocaleDateString('pt-BR')}`;
    try {
      if (window.electronAPI && window.electronAPI.saveJqlQuery) {
        const saved = await window.electronAPI.saveJqlQuery({
          name,
          jql: jqlQuery.trim(),
          jiraInstanceId: selectedInstanceId,
        });
        setSavedJqlQueries((prev) => [saved, ...prev.filter((q) => q.id !== saved.id)]);
        setSaveQueryName('');
        setIsSavingQuery(false);
        const text = `Consulta JQL "${name}" salva com sucesso para execuções futuras!`;
        setSuccessMsg(text);
        if (onSuccessNotice) onSuccessNotice(text);
      }
    } catch (err) {
      setErrorMsg('Erro ao salvar a consulta JQL.');
    }
  };

  const handleDeleteSavedJql = async (id: string) => {
    try {
      if (window.electronAPI && window.electronAPI.deleteJqlQuery) {
        await window.electronAPI.deleteJqlQuery(id);
        setSavedJqlQueries((prev) => prev.filter((q) => q.id !== id));
      }
    } catch (err) {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstanceId) {
      setErrorMsg('Selecione uma instância do Jira cadastrada.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      if (importMode === 'KEY') {
        const cleanKey = ticketKey.trim().toUpperCase();
        if (!cleanKey) {
          setErrorMsg('Por favor, informe a chave exata do ticket (ex: ATL-253, CSP-123).');
          setLoading(false);
          return;
        }

        // Check if ticket with this key already exists
        let currentTickets = existingTickets;
        if (window.electronAPI && window.electronAPI.getTickets) {
          try {
            const dbTickets = await window.electronAPI.getTickets();
            if (Array.isArray(dbTickets) && dbTickets.length > 0) {
              currentTickets = dbTickets;
            }
          } catch (e) {}
        }

        const alreadyExists = currentTickets.some((t) => {
          const tKey = (t.key || '').trim().toUpperCase();
          return (
            tKey === cleanKey ||
            t.id === `jira_${cleanKey}_${selectedInstanceId}` ||
            (t.id && t.id.toUpperCase().includes(`_${cleanKey}_`))
          );
        });

        if (alreadyExists) {
          const warningMsg = `O ticket com a chave "${cleanKey}" já existe no aplicativo! Não foi criado um novo ticket.`;
          setErrorMsg(warningMsg);
          if (onErrorNotice) onErrorNotice(warningMsg);
          setLoading(false);
          return;
        }

        await onFetchJiraTicket(cleanKey, selectedInstanceId);
        const successText = `Ticket ${cleanKey} puxado e criado com sucesso do Jira!`;
        setSuccessMsg(successText);
        if (onSuccessNotice) onSuccessNotice(successText);

        setTimeout(() => {
          onClose();
        }, 1500);
      } else if (importMode === 'JQL') {
        const cleanJql = jqlQuery.trim();
        if (!cleanJql) {
          setErrorMsg('Por favor, digite uma consulta JQL válida (ex: project = PROJETOTI AND status = "In Progress").');
          setLoading(false);
          return;
        }

        if (window.electronAPI && window.electronAPI.fetchJiraTicketsByJql) {
          const res = await window.electronAPI.fetchJiraTicketsByJql(cleanJql, selectedInstanceId);
          
          if (res.newCount === 0 && res.existingCount > 0) {
            const warningText = `Nenhum novo ticket criado. Os seguintes tickets retornados pela busca JQL já existem no aplicativo: ${res.existingKeys.join(', ')}.`;
            setErrorMsg(warningText);
            if (onErrorNotice) onErrorNotice(warningText);
            setLoading(false);
            return;
          } else if (res.newCount === 0 && (!res.existingCount || res.existingCount === 0)) {
            const infoText = 'Nenhum ticket foi retornado pelo Jira para a consulta JQL informada.';
            setErrorMsg(infoText);
            if (onErrorNotice) onErrorNotice(infoText);
            setLoading(false);
            return;
          } else {
            let successText = `✨ ${res.newCount} novo(s) ticket(s) importado(s) com sucesso!`;
            if (res.existingCount > 0) {
              successText += ` (Ignorado(s) ${res.existingCount} ticket(s) já existente(s): ${res.existingKeys.join(', ')})`;
            }
            setSuccessMsg(successText);
            if (onSuccessNotice) onSuccessNotice(successText);

            setTimeout(() => {
              onClose();
            }, 2000);
          }
        }
      } else if (importMode === 'FILTER') {
        const cleanFilterInput = filterLinkOrId.trim();
        if (!cleanFilterInput) {
          setErrorMsg('Por favor, insira o link do filtro ou o ID do filtro do Jira (ex: https://csptech.atlassian.net/issues/?filter=10024 ou 10024).');
          setLoading(false);
          return;
        }

        if (window.electronAPI && window.electronAPI.fetchJiraTicketsByJql) {
          const res = await window.electronAPI.fetchJiraTicketsByJql(cleanFilterInput, selectedInstanceId);
          
          if (res.newCount === 0 && res.existingCount > 0) {
            const warningText = `Nenhum novo ticket criado. Os seguintes tickets do filtro já existem no aplicativo: ${res.existingKeys.join(', ')}.`;
            setErrorMsg(warningText);
            if (onErrorNotice) onErrorNotice(warningText);
            setLoading(false);
            return;
          } else if (res.newCount === 0 && (!res.existingCount || res.existingCount === 0)) {
            const infoText = 'Nenhum ticket foi retornado pelo Jira para o filtro informado.';
            setErrorMsg(infoText);
            if (onErrorNotice) onErrorNotice(infoText);
            setLoading(false);
            return;
          } else {
            let successText = `✨ Filtro Jira importado! ${res.newCount} novo(s) ticket(s) importado(s) com sucesso!`;
            if (res.existingCount > 0) {
              successText += ` (Ignorado(s) ${res.existingCount} ticket(s) já existente(s): ${res.existingKeys.join(', ')})`;
            }
            setSuccessMsg(successText);
            if (onSuccessNotice) onSuccessNotice(successText);

            setTimeout(() => {
              onClose();
            }, 2000);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || 'Falha ao importar tickets do Jira. Verifique as credenciais ou a sintaxe da busca.';
      setErrorMsg(errMsg);
      if (onErrorNotice) onErrorNotice(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '660px' }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={styles.titleGroup}>
            <img src="./assets/jira-badge.png" alt="Jira" style={{ width: '28px', height: '28px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Importar Tickets do Atlassian Jira</h2>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {jiraInstances.length === 0 ? (
          <div style={styles.emptyWarning}>
            <AlertCircle size={36} color="#f59e0b" />
            <p style={{ marginTop: '12px', fontSize: '15px', color: 'var(--text-primary)', fontWeight: '700' }}>
              Nenhuma conta do Jira conectada.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Faça login com a sua conta Atlassian para importar seus sites Jira automaticamente ou cadastre manualmente.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '18px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {loading ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={async () => {
                    if (window.electronAPI?.cancelAtlassianOAuth) {
                      await window.electronAPI.cancelAtlassianOAuth();
                    }
                    setLoading(false);
                  }}
                  style={{ backgroundColor: '#ef4444', color: '#ffffff', borderColor: '#ef4444' }}
                >
                  🔄 Resetar / Tentar De Novo
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    if (!window.electronAPI?.startAtlassianOAuth) return;
                    try {
                      setLoading(true);
                      const result = await window.electronAPI.startAtlassianOAuth();

                      let userMsg = '';
                      if (result && result.userInfo && result.userInfo.email) {
                        const uEmail = result.userInfo.email.trim();
                        const uName = result.userInfo.name?.trim() || uEmail.split('@')[0] || 'Usuário Atlassian';
                        userMsg = ` (${uName})`;

                        const allUsers = (await window.electronAPI.getUsers()) || [];
                        const existing = allUsers.find((u) => u.email.trim().toLowerCase() === uEmail.toLowerCase());

                        let targetUser: UserProfile;
                        if (existing) {
                          targetUser = await window.electronAPI.saveUser({
                            ...existing,
                            name: existing.name || uName,
                          });
                        } else {
                          targetUser = await window.electronAPI.saveUser({
                            name: uName,
                            email: uEmail,
                            role: 'Assistente Atlassian',
                            avatarColor: '#6366f1',
                          });
                        }

                        if (targetUser && targetUser.id) {
                          await window.electronAPI.setActiveUser(targetUser.id);
                        }
                      }

                      if (result && result.sites.length > 0) {
                        if (onSuccessNotice) {
                          onSuccessNotice(`✨ ${result.sites.length} site(s) Jira conectado(s) via Atlassian OAuth${userMsg}!`);
                        }
                        onClose();
                        onOpenSettings();
                      }
                    } catch (err: any) {
                      setErrorMsg(`Falha no login Atlassian: ${err.message}`);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{ backgroundColor: '#6366f1' }}
                >
                  ⚡ Entrar com Conta Atlassian
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
              >
                <Settings size={16} /> Cadastrar Manualmente
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '16px' }}>
            {errorMsg && (
              <div style={styles.errorBox}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div style={styles.successBox}>
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Instance Selection */}
            <div>
              <label style={styles.label}>Instância Jira (Organização/Cliente):</label>
              <select
                className="input-field"
                value={selectedInstanceId}
                onChange={(e) => setSelectedInstanceId(e.target.value)}
                disabled={loading}
              >
                {jiraInstances.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    🎯 {inst.name} ({inst.domain})
                  </option>
                ))}
              </select>
            </div>

            {/* Import Mode Tabs */}
            <div>
              <label style={styles.label}>Modo de Importação:</label>
              <div style={styles.tabGroup}>
                <button
                  type="button"
                  style={{
                    ...styles.tabBtn,
                    ...(importMode === 'KEY' ? styles.activeTabBtn : {}),
                  }}
                  onClick={() => setImportMode('KEY')}
                >
                  <Key size={14} /> Chave Única
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.tabBtn,
                    ...(importMode === 'JQL' ? styles.activeTabBtn : {}),
                  }}
                  onClick={() => setImportMode('JQL')}
                >
                  <Filter size={14} /> Busca JQL
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.tabBtn,
                    ...(importMode === 'FILTER' ? styles.activeTabBtn : {}),
                  }}
                  onClick={() => setImportMode('FILTER')}
                >
                  <Link2 size={14} /> Link / ID do Filtro
                </button>
              </div>
            </div>

            {/* Mode 1: Single Ticket Key */}
            {importMode === 'KEY' && (
              <div>
                <label style={styles.label}>Chave Exata do Ticket no Jira (Exemplo: ATL-253, CSP-123):</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="DIGITE A CHAVE (EX: ATL-253, CSP-123)"
                    value={ticketKey}
                    onChange={(e) => setTicketKey(e.target.value.toUpperCase())}
                    disabled={loading}
                    autoFocus
                    style={{ paddingLeft: '42px', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}
                  />
                  <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                </div>
              </div>
            )}

            {/* Mode 2: Custom JQL Query + Saved JQL List */}
            {importMode === 'JQL' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={styles.label}>Consulta JQL do Jira:</label>
                  <textarea
                    className="input-field"
                    placeholder='Ex: project = "PROJETOTI" AND status = "In Progress" AND assignee = currentUser()'
                    value={jqlQuery}
                    onChange={(e) => setJqlQuery(e.target.value)}
                    disabled={loading}
                    rows={3}
                    autoFocus
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Ao re-executar a JQL, o aplicativo verifica deltas e atualiza os tickets existentes preservando comentários locais.
                  </span>
                </div>

                {/* Saved JQL Queries Section */}
                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ ...styles.label, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Star size={14} color="#f59e0b" /> Consultas JQL Salvas / Favoritas ({savedJqlQueries.length}):
                    </label>
                    {!isSavingQuery && jqlQuery.trim() && (
                      <button
                        type="button"
                        style={styles.saveQuerySmallBtn}
                        onClick={() => setIsSavingQuery(true)}
                      >
                        <BookmarkPlus size={13} /> Salvar JQL Atual
                      </button>
                    )}
                  </div>

                  {isSavingQuery && (
                    <div style={styles.saveQueryInputRow}>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Nome da busca salva (ex: Projetos MVNO Telecall)"
                        value={saveQueryName}
                        onChange={(e) => setSaveQueryName(e.target.value)}
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={handleSaveCurrentJql}
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => setIsSavingQuery(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}

                  <div style={styles.savedQueriesScroll}>
                    {savedJqlQueries.length === 0 ? (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                        Nenhuma consulta JQL salva ainda. Digite uma JQL acima e clique em <b>Salvar JQL Atual</b>.
                      </span>
                    ) : (
                      savedJqlQueries.map((q) => (
                        <div key={q.id} style={styles.savedQueryCard}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflow: 'hidden' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>⭐ {q.name}</span>
                            <span style={{ fontSize: '11px', color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {q.jql}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#0284c7' }}
                              onClick={() => {
                                setJqlQuery(q.jql);
                                if (q.jiraInstanceId) setSelectedInstanceId(q.jiraInstanceId);
                              }}
                              title="Carregar esta consulta JQL para execução"
                            >
                              <Play size={12} /> Carregar
                            </button>
                            <button
                              type="button"
                              style={styles.deleteQueryBtn}
                              onClick={() => handleDeleteSavedJql(q.id)}
                              title="Excluir consulta salva"
                            >
                              <Trash2 size={13} color="var(--accent-rose)" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mode 3: Filter Link or ID */}
            {importMode === 'FILTER' && (
              <div>
                <label style={styles.label}>Link do Filtro da CSP Tech / Atlassian (ou ID do Filtro):</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: https://csptech.atlassian.net/issues/?filter=10024 ou apenas 10024"
                  value={filterLinkOrId}
                  onChange={(e) => setFilterLinkOrId(e.target.value)}
                  disabled={loading}
                  autoFocus
                  style={{ fontSize: '13px' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Cole o link do filtro Jira ou ID numérico. O aplicativo verificará deltas e atualizará tickets repetidos.
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div style={styles.actions}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                {loading ? 'Executando JQL no Jira...' : importMode === 'KEY' ? 'Puxar Ticket' : 'Executar & Atualizar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  emptyWarning: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '30px 20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#10b981',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    border: '1px solid rgba(16, 185, 129, 0.3)',
  },
  tabGroup: {
    display: 'flex',
    gap: '8px',
  },
  tabBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    color: 'var(--text-muted)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  activeTabBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#60a5fa',
    border: '1px solid rgba(59, 130, 246, 0.5)',
  },
  saveQuerySmallBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    fontSize: '11px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  saveQueryInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '8px',
    borderRadius: '8px',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  savedQueriesScroll: {
    maxHeight: '160px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  savedQueryCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    gap: '12px',
  },
  deleteQueryBtn: {
    padding: '4px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-subtle)',
  },
};
