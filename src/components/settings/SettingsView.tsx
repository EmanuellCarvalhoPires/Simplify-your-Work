import React, { useState, useEffect } from 'react';
import type { JiraInstance, ThemeConfig } from '../../types/index';
import { Key, Palette, Plus, Trash2, Globe, Mail, ShieldCheck, Sparkles, Database, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface SettingsViewProps {
  jiraInstances: JiraInstance[];
  themeConfig: ThemeConfig;
  onSaveJiraInstance: (instance: Omit<JiraInstance, 'id'> & { id?: string }) => Promise<void>;
  onDeleteJiraInstance: (id: string) => Promise<void>;
  onSaveThemeSettings: (theme: ThemeConfig) => Promise<void>;
}

const themePresets: ThemeConfig[] = [
  {
    presetName: 'Dark Slate (Padrão)',
    bgMain: '#181825',
    bgSidebar: '#1e1e2e',
    bgHeader: '#1e1e2e',
    bgCardJira: '#1e293b',
    bgCardApp: '#27273a',
    accentPrimary: '#6366f1',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
  },
  {
    presetName: 'Cyber Ocean (Ciano & Azul)',
    bgMain: '#0b192c',
    bgSidebar: '#1e3e62',
    bgHeader: '#1e3e62',
    bgCardJira: '#153448',
    bgCardApp: '#3c5b6f',
    accentPrimary: '#00d8f6',
    textPrimary: '#ffffff',
    textSecondary: '#94a3b8',
  },
  {
    presetName: 'Midnight Violet (Roxo Neon)',
    bgMain: '#13005a',
    bgSidebar: '#1c005a',
    bgHeader: '#1c005a',
    bgCardJira: '#00337c',
    bgCardApp: '#1f1d36',
    accentPrimary: '#c084fc',
    textPrimary: '#f8fafc',
    textSecondary: '#a5b4fc',
  },
  {
    presetName: 'Forest Emerald (Verde Escuro)',
    bgMain: '#051911',
    bgSidebar: '#0a291c',
    bgHeader: '#0a291c',
    bgCardJira: '#113f2a',
    bgCardApp: '#164e34',
    accentPrimary: '#10b981',
    textPrimary: '#f0fdf4',
    textSecondary: '#86efac',
  },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  jiraInstances,
  themeConfig,
  onSaveJiraInstance,
  onDeleteJiraInstance,
  onSaveThemeSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'jira' | 'mongo' | 'theme'>('mongo');

  // Jira State
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [isSavingJira, setIsSavingJira] = useState(false);

  // Mongo State
  const [mongoStatus, setMongoStatus] = useState<{ connected: boolean; uri: string }>({
    connected: false,
    uri: 'mongodb://127.0.0.1:27017/simplify_work',
  });
  const [mongoUriInput, setMongoUriInput] = useState('mongodb://127.0.0.1:27017/simplify_work');
  const [isTestingMongo, setIsTestingMongo] = useState(false);
  const [mongoNotice, setMongoNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Theme State
  const [customTheme, setCustomTheme] = useState<ThemeConfig>(themeConfig);

  useEffect(() => {
    checkMongo();
  }, []);

  const checkMongo = async () => {
    if (window.electronAPI && window.electronAPI.getMongoStatus) {
      const status = await window.electronAPI.getMongoStatus();
      setMongoStatus(status);
      setMongoUriInput(status.uri || 'mongodb://127.0.0.1:27017/simplify_work');
    }
  };

  const handleTestAndSaveMongo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mongoUriInput.trim()) return;

    try {
      setIsTestingMongo(true);
      setMongoNotice(null);
      if (window.electronAPI && window.electronAPI.setMongoUri) {
        const success = await window.electronAPI.setMongoUri(mongoUriInput.trim());
        const updatedStatus = await window.electronAPI.getMongoStatus();
        setMongoStatus(updatedStatus);

        if (success && updatedStatus.connected) {
          setMongoNotice({
            type: 'success',
            message: '🟢 Conexão com o MongoDB local/nuvem estabelecida com sucesso!',
          });
        } else {
          setMongoNotice({
            type: 'error',
            message: '🔴 Não foi possível conectar a esta URI do MongoDB. Verifique se o servidor local na porta 27017 está rodando.',
          });
        }
      }
    } catch (err: any) {
      setMongoNotice({
        type: 'error',
        message: err.message || 'Falha ao conectar ao MongoDB.',
      });
    } finally {
      setIsTestingMongo(false);
    }
  };

  const handleAddJira = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !domain.trim() || !email.trim() || !apiToken.trim()) return;

    let cleanDomain = domain.trim();
    if (!cleanDomain.startsWith('http://') && !cleanDomain.startsWith('https://')) {
      cleanDomain = 'https://' + cleanDomain;
    }

    try {
      setIsSavingJira(true);
      await onSaveJiraInstance({
        name: name.trim(),
        domain: cleanDomain,
        email: email.trim(),
        apiToken: apiToken.trim(),
      });
      setName('');
      setDomain('');
      setEmail('');
      setApiToken('');
      alert('Instância Jira salva com sucesso!');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingJira(false);
    }
  };

  const handleApplyPreset = (preset: ThemeConfig) => {
    setCustomTheme(preset);
    onSaveThemeSettings(preset);
  };

  const handleColorChange = (key: keyof ThemeConfig, val: string) => {
    const updated = { ...customTheme, [key]: val, presetName: 'Personalizado' };
    setCustomTheme(updated);
    onSaveThemeSettings(updated);
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerBar}>
        <h1 style={styles.title}>Configurações do Aplicativo</h1>

        <div style={styles.tabNav}>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'mongo' ? styles.activeTabBtn : {}) }}
            onClick={() => setActiveTab('mongo')}
          >
            <Database size={16} /> Banco de Dados MongoDB
          </button>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'jira' ? styles.activeTabBtn : {}) }}
            onClick={() => setActiveTab('jira')}
          >
            <Key size={16} /> APIs do Jira ({jiraInstances.length})
          </button>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'theme' ? styles.activeTabBtn : {}) }}
            onClick={() => setActiveTab('theme')}
          >
            <Palette size={16} /> Cores da Interface
          </button>
        </div>
      </div>

      {activeTab === 'mongo' && (
        <div style={styles.section}>
          <div style={styles.formCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={styles.cardTitle}>
                <Database size={20} color="#10b981" /> Conexão MongoDB Local (Community Server)
              </h2>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={checkMongo}>
                <RefreshCw size={14} /> Atualizar Status
              </button>
            </div>
            <p style={styles.cardSub}>
              Conectado ao seu servidor de banco de dados MongoDB local rodando na porta 27017 (localhost / Standalone).
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 20px',
                borderRadius: '14px',
                marginTop: '16px',
                backgroundColor: mongoStatus.connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                border: mongoStatus.connected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              {mongoStatus.connected ? (
                <CheckCircle2 size={24} color="#10b981" />
              ) : (
                <AlertCircle size={24} color="#f59e0b" />
              )}
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>
                  {mongoStatus.connected ? 'MongoDB Conectado e Operacional!' : 'Operando em Modo Híbrido (Cache + Local)'}
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {mongoStatus.connected
                    ? `Host: localhost:27017 | Versão: 8.3.7 Community Standalone | Database: simplify_work`
                    : `Tentando conectar a ${mongoStatus.uri || 'mongodb://127.0.0.1:27017/simplify_work'}`}
                </p>
              </div>
            </div>

            {mongoNotice && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  marginTop: '14px',
                  backgroundColor: mongoNotice.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                  border: mongoNotice.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
                  color: mongoNotice.type === 'success' ? '#10b981' : '#f43f5e',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                <span>{mongoNotice.message}</span>
              </div>
            )}

            <form onSubmit={handleTestAndSaveMongo} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
              <div>
                <label style={styles.label}>URI de Conexão MongoDB (Local ou Cloud Atlas):</label>
                <input
                  type="text"
                  className="input-field"
                  value={mongoUriInput}
                  onChange={(e) => setMongoUriInput(e.target.value)}
                  placeholder="mongodb://127.0.0.1:27017/simplify_work"
                  required
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="submit" className="btn btn-primary" disabled={isTestingMongo}>
                  {isTestingMongo ? 'Conectando...' : 'Reconectar & Testar MongoDB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'jira' && (
        <div style={styles.section}>
          <div style={styles.formCard}>
            <h2 style={styles.cardTitle}>
              <Plus size={18} color="var(--accent-blue)" /> Cadastrar Nova Instância Jira (Cliente)
            </h2>
            <p style={styles.cardSub}>
              Adicione credenciais para buscar tickets de múltiplos domínios do Jira (ex: cliente.atlassian.net).
            </p>

            <form onSubmit={handleAddJira} style={styles.jiraForm}>
              <div>
                <label style={styles.label}>Nome Identificador (ex: Cliente ACME, Projeto Interno):</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Jira Cliente Acme"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={styles.label}>Domínio da Instância Jira (URL):</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="https://empresa.atlassian.net"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>E-mail da Conta Atlassian:</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="seu.email@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={styles.label}>API Token do Jira:</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Cole seu API Token gerado no Atlassian..."
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" disabled={isSavingJira}>
                  <ShieldCheck size={18} />
                  {isSavingJira ? 'Salvando...' : 'Salvar Instância Jira'}
                </button>
              </div>
            </form>
          </div>

          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '14px' }}>
              Instâncias Jira Cadastradas
            </h3>

            {jiraInstances.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                Nenhuma API de cliente cadastrada ainda.
              </p>
            ) : (
              <div style={styles.jiraList}>
                {jiraInstances.map((inst) => (
                  <div key={inst.id} style={styles.jiraItem}>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff' }}>{inst.name}</h4>
                      <div style={styles.instMeta}>
                        <span><Globe size={13} /> {inst.domain}</span>
                        <span><Mail size={13} /> {inst.email}</span>
                      </div>
                    </div>

                    <button className="btn-icon" onClick={() => onDeleteJiraInstance(inst.id)} title="Remover Instância">
                      <Trash2 size={16} color="#f43f5e" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'theme' && (
        <div style={styles.section}>
          <div style={styles.formCard}>
            <h2 style={styles.cardTitle}>
              <Sparkles size={18} color="var(--accent-primary)" /> Personalização de Cores do App
            </h2>
            <p style={styles.cardSub}>
              Escolha um tema pré-definido ou edite individualmente as cores da interface em tempo real.
            </p>

            <div style={{ margin: '20px 0' }}>
              <label style={styles.label}>Temas Pré-configurados:</label>
              <div style={styles.presetsGrid}>
                {themePresets.map((p) => (
                  <div
                    key={p.presetName}
                    onClick={() => handleApplyPreset(p)}
                    style={{
                      ...styles.presetCard,
                      border: customTheme.presetName === p.presetName ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>{p.presetName}</span>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: p.bgMain }} />
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: p.bgSidebar }} />
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: p.accentPrimary }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.pickerGrid}>
              <div style={styles.pickerItem}>
                <label style={styles.label}>Fundo Principal:</label>
                <input
                  type="color"
                  value={customTheme.bgMain}
                  onChange={(e) => handleColorChange('bgMain', e.target.value)}
                  style={styles.colorInput}
                />
              </div>

              <div style={styles.pickerItem}>
                <label style={styles.label}>Fundo da Sidebar:</label>
                <input
                  type="color"
                  value={customTheme.bgSidebar}
                  onChange={(e) => handleColorChange('bgSidebar', e.target.value)}
                  style={styles.colorInput}
                />
              </div>

              <div style={styles.pickerItem}>
                <label style={styles.label}>Cor de Destaque Principal:</label>
                <input
                  type="color"
                  value={customTheme.accentPrimary}
                  onChange={(e) => handleColorChange('accentPrimary', e.target.value)}
                  style={styles.colorInput}
                />
              </div>

              <div style={styles.pickerItem}>
                <label style={styles.label}>Cards Atlassian:</label>
                <input
                  type="color"
                  value={customTheme.bgCardJira}
                  onChange={(e) => handleColorChange('bgCardJira', e.target.value)}
                  style={styles.colorInput}
                />
              </div>

              <div style={styles.pickerItem}>
                <label style={styles.label}>Cards do App:</label>
                <input
                  type="color"
                  value={customTheme.bgCardApp}
                  onChange={(e) => handleColorChange('bgCardApp', e.target.value)}
                  style={styles.colorInput}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '28px',
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  headerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#ffffff',
  },
  tabNav: {
    display: 'flex',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: '12px',
    padding: '4px',
    border: '1px solid var(--border-subtle)',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  activeTabBtn: {
    backgroundColor: 'var(--accent-primary)',
    color: '#ffffff',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
  },
  formCard: {
    backgroundColor: 'var(--bg-sidebar)',
    borderRadius: '20px',
    padding: '24px',
    border: '1px solid var(--border-subtle)',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardSub: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  jiraForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '700',
    marginBottom: '6px',
    color: 'var(--text-secondary)',
  },
  jiraList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  jiraItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--bg-sidebar)',
    borderRadius: '14px',
    padding: '16px 20px',
    border: '1px solid var(--border-subtle)',
  },
  instMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '6px',
  },
  presetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '14px',
    marginTop: '8px',
  },
  presetCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: '14px',
    padding: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  pickerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    marginTop: '24px',
  },
  pickerItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
  },
  colorInput: {
    width: '100%',
    height: '40px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
  },
};
