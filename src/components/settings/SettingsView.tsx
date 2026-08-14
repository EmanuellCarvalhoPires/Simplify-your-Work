import React, { useState, useEffect } from 'react';
import type { JiraInstance, ThemeConfig, UserProfile } from '../../types/index';
import { DEFAULT_THEME } from '../../types/index';
import { Key, Palette, Plus, Trash2, Globe, Mail, ShieldCheck, Sparkles, Database, CheckCircle2, AlertCircle, RefreshCw, Calendar, Users, UserCheck, Edit3 } from 'lucide-react';

interface SettingsViewProps {
  jiraInstances: JiraInstance[];
  themeConfig: ThemeConfig;
  activeUser?: UserProfile | null;
  users?: UserProfile[];
  onSaveJiraInstance: (instance: Omit<JiraInstance, 'id'> & { id?: string }) => Promise<void>;
  onDeleteJiraInstance: (id: string) => Promise<void>;
  onSaveThemeSettings: (theme: ThemeConfig) => Promise<void>;
  onSelectActiveUser?: (id: string) => Promise<void>;
  onSaveUser?: (user: Partial<UserProfile>) => Promise<void>;
  onDeleteUser?: (id: string) => Promise<void>;
  onOpenCreateUserModal?: () => void;
  onOpenEditUserModal?: (user: UserProfile) => void;
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
  activeUser,
  users = [],
  onSaveJiraInstance,
  onDeleteJiraInstance,
  onSaveThemeSettings,
  onSelectActiveUser,
  onSaveUser,
  onDeleteUser,
  onOpenCreateUserModal,
  onOpenEditUserModal,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'calendar' | 'mongo' | 'jira' | 'theme' | 'legal'>('users');
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy'>('terms');
  const [legalDocs, setLegalDocs] = useState<{ termsContent: string; privacyContent: string }>({ termsContent: '', privacyContent: '' });

  // Jira State
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [isSavingJira, setIsSavingJira] = useState(false);
  const [atlassianClientId, setAtlassianClientId] = useState('');
  const [atlassianClientSecret, setAtlassianClientSecret] = useState('');
  const [atlassianProxyUrl, setAtlassianProxyUrl] = useState('');
  const [isSavingClientId, setIsSavingClientId] = useState(false);
  const [showOAuthGuide, setShowOAuthGuide] = useState(false);
  const [clientIdNotice, setClientIdNotice] = useState<string | null>(null);

  // Mongo State
  const [mongoStatus, setMongoStatus] = useState<{ connected: boolean; uri: string }>({
    connected: false,
    uri: 'mongodb://127.0.0.1:27017/simplify_work',
  });
  const [mongoUriInput, setMongoUriInput] = useState('mongodb://127.0.0.1:27017/simplify_work');
  const [isTestingMongo, setIsTestingMongo] = useState(false);
  const [mongoNotice, setMongoNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Calendar State
  const [calendarUrlInput, setCalendarUrlInput] = useState(
    'https://outlook.office365.com/owa/calendar/99084e2e8fbe435a8e2061e3b88ce721@csptech.com.br/c3e18d3ecba5429482a4efe82e36385d15319005524808242401/calendar.html'
  );
  const [isSavingCalendar, setIsSavingCalendar] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [calendarNotice, setCalendarNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Theme State
  const [customTheme, setCustomTheme] = useState<ThemeConfig>(themeConfig || DEFAULT_THEME);

  useEffect(() => {
    if (themeConfig && themeConfig.bgMain) {
      setCustomTheme(themeConfig);
    }
  }, [themeConfig]);

  useEffect(() => {
    if (window.electronAPI?.getAtlassianClientId) {
      window.electronAPI.getAtlassianClientId().then((cid) => {
        if (cid) setAtlassianClientId(cid);
      });
    }
    if (window.electronAPI?.getAtlassianClientSecret) {
      window.electronAPI.getAtlassianClientSecret().then((cs) => {
        if (cs) setAtlassianClientSecret(cs);
      });
    }
    if (window.electronAPI?.getAtlassianProxyUrl) {
      window.electronAPI.getAtlassianProxyUrl().then((purl) => {
        if (purl) setAtlassianProxyUrl(purl);
      });
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'legal' && window.electronAPI?.getLegalDocs) {
      window.electronAPI.getLegalDocs().then((docs) => {
        setLegalDocs(docs);
      }).catch((err) => console.error(err));
    }
  }, [activeTab]);

  const handleSaveAtlassianCredentials = async () => {
    try {
      setIsSavingClientId(true);
      if (window.electronAPI?.saveAtlassianClientId) {
        await window.electronAPI.saveAtlassianClientId(atlassianClientId);
      }
      if (window.electronAPI?.saveAtlassianClientSecret) {
        await window.electronAPI.saveAtlassianClientSecret(atlassianClientSecret);
      }
      if (window.electronAPI?.saveAtlassianProxyUrl) {
        await window.electronAPI.saveAtlassianProxyUrl(atlassianProxyUrl);
      }
      setClientIdNotice('✨ Credenciais e URL do Proxy salvas com sucesso!');
      setTimeout(() => setClientIdNotice(null), 4000);
    } catch (e: any) {
      alert(`Erro ao salvar credenciais: ${e.message}`);
    } finally {
      setIsSavingClientId(false);
    }
  };

  const handleAtlassianOAuth = async () => {
    if (!window.electronAPI?.startAtlassianOAuth) return;
    try {
      setIsSavingJira(true);
      const result = await window.electronAPI.startAtlassianOAuth(
        atlassianClientId.trim() || undefined,
        atlassianClientSecret.trim() || undefined,
        atlassianProxyUrl.trim() || undefined
      );

      let activatedUserEmail = '';
      let activatedUserName = '';

      // 1. Process authenticated user profile from Atlassian
      if (result && result.userInfo && result.userInfo.email) {
        const uEmail = result.userInfo.email.trim();
        const uName = result.userInfo.name?.trim() || uEmail.split('@')[0] || 'Usuário Atlassian';
        activatedUserEmail = uEmail;
        activatedUserName = uName;

        // Retrieve latest user profiles in app
        const allUsers = (await window.electronAPI.getUsers()) || users || [];
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
          if (onSelectActiveUser) {
            await onSelectActiveUser(targetUser.id);
          } else if (onSaveUser) {
            await onSaveUser(targetUser);
          }
        }
      }

      // 2. Add/connect Jira sites returned from Atlassian OAuth
      if (result && result.sites && result.sites.length > 0) {
        let added = 0;
        const currentInstances = (await window.electronAPI.getJiraInstances()) || jiraInstances || [];

        for (const site of result.sites) {
          const siteCleanUrl = (site.url || '').toLowerCase().replace(/\/+$/, '');
          const existingInst = currentInstances.find((i) => {
            const instCleanUrl = (i.domain || '').toLowerCase().replace(/\/+$/, '');
            return (
              (instCleanUrl && siteCleanUrl && (instCleanUrl === siteCleanUrl || instCleanUrl.includes(siteCleanUrl) || siteCleanUrl.includes(instCleanUrl))) ||
              (i.cloudId && i.cloudId === site.id)
            );
          });

          await onSaveJiraInstance({
            id: existingInst ? existingInst.id : undefined,
            name: site.name || existingInst?.name || 'Jira Cloud',
            domain: site.url,
            email: activatedUserEmail || existingInst?.email || 'atlassian@empresa.com',
            apiToken: result.accessToken,
            authType: 'OAUTH',
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            cloudId: site.id,
            avatarUrl: site.avatarUrl,
          });
          added++;
        }
        alert(
          `⚡ Login Atlassian realizado com sucesso!\n\n` +
            (activatedUserEmail ? `👤 Perfil de Usuário: ${activatedUserName} (${activatedUserEmail})\n` : '') +
            `🌐 ${added} site(s) Jira conectado(s) ao Simplify your Work!`
        );
      } else if (activatedUserEmail) {
        alert(
          `⚡ Autenticado na Atlassian com sucesso!\n\n👤 Perfil do Usuário: ${activatedUserName} (${activatedUserEmail}) criado e ativado no aplicativo.`
        );
      } else {
        alert('Nenhum site Jira ou perfil foi retornado pela conta Atlassian.');
      }
    } catch (err: any) {
      alert(`Falha no login Atlassian: ${err.message}`);
    } finally {
      setIsSavingJira(false);
    }
  };

  useEffect(() => {
    checkMongo();
    loadCalendarUrlSettings();
  }, []);

  const loadCalendarUrlSettings = async () => {
    if (window.electronAPI?.getCalendarUrl) {
      const url = await window.electronAPI.getCalendarUrl();
      if (url) setCalendarUrlInput(url);
    }
  };

  const handleSaveCalendarUrlSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calendarUrlInput.trim()) return;

    try {
      setIsSavingCalendar(true);
      setCalendarNotice(null);

      if (window.electronAPI?.setCalendarUrl && window.electronAPI?.syncCalendar) {
        await window.electronAPI.setCalendarUrl(calendarUrlInput.trim());
        const res = await window.electronAPI.syncCalendar(calendarUrlInput.trim());
        setCalendarNotice({
          type: 'success',
          message: `🟢 Agenda salva e sincronizada! ${res.events.length} reuniões carregadas (${res.remindersCreated} novos lembretes de 30 min criados).`,
        });
      }
    } catch (err: any) {
      setCalendarNotice({
        type: 'error',
        message: err.message || 'Erro ao salvar a URL da agenda.',
      });
    } finally {
      setIsSavingCalendar(false);
    }
  };

  const handleSyncCalendarSettings = async () => {
    try {
      setIsSyncingCalendar(true);
      setCalendarNotice(null);
      if (window.electronAPI?.syncCalendar) {
        const res = await window.electronAPI.syncCalendar(calendarUrlInput.trim());
        setCalendarNotice({
          type: 'success',
          message: `🟢 Sincronização concluída! ${res.events.length} reuniões encontradas.`,
        });
      }
    } catch (err: any) {
      setCalendarNotice({
        type: 'error',
        message: err.message || 'Falha ao sincronizar agenda.',
      });
    } finally {
      setIsSyncingCalendar(false);
    }
  };

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
    if (typeof onSaveThemeSettings === 'function') {
      onSaveThemeSettings(preset);
    }
  };

  const handleColorChange = (key: keyof ThemeConfig, val: string) => {
    const baseTheme = customTheme || DEFAULT_THEME;
    const updated: ThemeConfig = { ...baseTheme, [key]: val, presetName: 'Personalizado' };
    setCustomTheme(updated);
    if (typeof onSaveThemeSettings === 'function') {
      onSaveThemeSettings(updated);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerBar}>
        <h1 style={styles.title}>Configurações do Aplicativo</h1>

        <div style={styles.tabNav}>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'users' ? styles.activeTabBtn : {}) }}
            onClick={() => setActiveTab('users')}
          >
            <Users size={16} /> Perfis de Usuários ({users.length})
          </button>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'calendar' ? styles.activeTabBtn : {}) }}
            onClick={() => setActiveTab('calendar')}
          >
            <Calendar size={16} /> Agenda Microsoft / ICS
          </button>
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
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'legal' ? styles.activeTabBtn : {}) }}
            onClick={() => setActiveTab('legal')}
          >
            <ShieldCheck size={16} /> Sobre & Termos
          </button>
        </div>
      </div>

      {/* === USERS TAB === */}
      {activeTab === 'users' && (
        <div style={styles.section}>
          <div style={styles.formCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={styles.cardTitle}>
                  <Users size={18} color="var(--accent-primary)" /> Cadastro & Perfis de Usuários
                </h2>
                <p style={styles.cardSub}>
                  Cadastre novos usuários e alterne o usuário ativo. O tema de cores escolhido fica vinculado a cada usuário.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (onOpenCreateUserModal) onOpenCreateUserModal();
                }}
              >
                <Plus size={16} /> Cadastrar Novo Usuário
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
              {users.map((u) => {
                const isActive = activeUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: '16px',
                      padding: '20px',
                      border: isActive ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          backgroundColor: u.avatarColor || '#6366f1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          color: '#ffffff',
                          fontSize: '16px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        }}
                      >
                        {u.name.trim().split(' ').length >= 2
                          ? (u.name.trim().split(' ')[0][0] + u.name.trim().split(' ').slice(-1)[0][0]).toUpperCase()
                          : u.name[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.name}
                        </h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.email}
                        </p>
                        {u.role && (
                          <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '600' }}>
                            {u.role}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Associated Theme Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '10px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Tema Atrelado:</span>
                      <span style={{ fontWeight: '700', color: '#ffffff', marginLeft: 'auto' }}>
                        {u.themeConfig?.presetName || 'Dark Slate'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      {!isActive ? (
                        <button
                          className="btn btn-secondary"
                          style={{ flex: 1, fontSize: '12px', padding: '8px 12px' }}
                          onClick={() => onSelectActiveUser && onSelectActiveUser(u.id)}
                        >
                          <UserCheck size={14} /> Definir Como Ativo
                        </button>
                      ) : (
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                            color: 'var(--accent-primary)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            padding: '8px',
                          }}
                        >
                          <UserCheck size={14} /> Usuário Ativo Atual
                        </div>
                      )}

                      <button
                        className="btn-icon"
                        onClick={() => onOpenEditUserModal && onOpenEditUserModal(u)}
                        title="Editar Perfil"
                      >
                        <Edit3 size={16} color="var(--accent-primary)" />
                      </button>

                      {users.length > 1 && (
                        <button
                          className="btn-icon"
                          onClick={() => onDeleteUser && onDeleteUser(u.id)}
                          title="Excluir Usuário"
                        >
                          <Trash2 size={16} color="#f43f5e" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div style={styles.section}>
          <div style={styles.formCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={styles.cardTitle}>
                <Calendar size={20} color="var(--accent-primary)" /> Configurar Agenda Microsoft / Feed ICS
              </h2>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
                onClick={handleSyncCalendarSettings}
                disabled={isSyncingCalendar}
              >
                <RefreshCw size={14} className={isSyncingCalendar ? 'spin-anim' : ''} /> Sincronizar Agora
              </button>
            </div>
            <p style={styles.cardSub}>
              Insira o link da sua agenda pública da Microsoft (Outlook / Office 365 / iCalendar). O aplicativo irá mapear automaticamente todas as suas reuniões e programar um alarme no Windows <strong>30 minutos antes</strong> do início de cada compromisso.
            </p>

            {calendarNotice && (
              <div
                style={{
                  ...styles.mongoNoticeBox,
                  backgroundColor: calendarNotice.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                }}
              >
                {calendarNotice.type === 'success' ? (
                  <CheckCircle2 size={18} color="#10b981" />
                ) : (
                  <AlertCircle size={18} color="#ef4444" />
                )}
                <span
                  style={{
                    fontSize: '13px',
                    color: calendarNotice.type === 'success' ? '#10b981' : '#f87171',
                  }}
                >
                  {calendarNotice.message}
                </span>
              </div>
            )}

            <form onSubmit={handleSaveCalendarUrlSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={styles.label}>Link da Agenda Microsoft (.html ou .ics):</label>
                <input
                  type="text"
                  className="input-field"
                  value={calendarUrlInput}
                  onChange={(e) => setCalendarUrlInput(e.target.value)}
                  placeholder="https://outlook.office365.com/owa/calendar/.../calendar.html"
                  required
                />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                  Exemplo de link publicado: https://outlook.office365.com/owa/calendar/99084e2e8fbe.../calendar.html
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" disabled={isSavingCalendar}>
                  <CheckCircle2 size={16} /> {isSavingCalendar ? 'Salvando...' : 'Salvar e Sincronizar Agenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              Conecte seus domínios Jira fazendo login com a sua conta Atlassian (detecção automática) ou informe o API Token manualmente.
            </p>

            {/* OAuth 2.0 Quick Login Banner */}
            <div
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="#818cf8" /> Entrar com Conta Atlassian (Automático)
                  </h4>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '650px' }}>
                    Faz o login oficial na Atlassian pelo seu navegador, detecta seus sites Jira e <strong>cria/conecta o seu Perfil de Usuário no aplicativo</strong> automaticamente após o sucesso da autenticação.
                  </p>
                </div>

                {isSavingJira ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled
                      style={{ whiteSpace: 'nowrap', padding: '10px 14px', backgroundColor: '#4f46e5', opacity: 0.85, fontSize: '12.5px' }}
                    >
                      Aguardando Navegador...
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={async () => {
                        if (window.electronAPI?.cancelAtlassianOAuth) {
                          await window.electronAPI.cancelAtlassianOAuth();
                        }
                        setIsSavingJira(false);
                      }}
                      title="Cancela o servidor local e reseta o botão instantaneamente"
                      style={{ whiteSpace: 'nowrap', padding: '10px 14px', backgroundColor: '#ef4444', color: '#ffffff', borderColor: '#ef4444', fontWeight: '700', fontSize: '12.5px' }}
                    >
                      🔄 Resetar / Tentar De Novo
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAtlassianOAuth}
                    style={{ whiteSpace: 'nowrap', padding: '10px 20px', backgroundColor: '#6366f1', fontSize: '13.5px', fontWeight: '700' }}
                  >
                    ⚡ Entrar com Atlassian
                  </button>
                )}
              </div>

              {/* Client ID, Secret & Proxy Configuration Fields */}
              <div
                style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Key size={14} color="#818cf8" /> Credenciais Atlassian OAuth 2.0 & Proxy Serverless:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowOAuthGuide(!showOAuthGuide)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#a5b4fc',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                  >
                    <AlertCircle size={13} /> {showOAuthGuide ? 'Ocultar ajuda de configuração' : 'Como usar o Proxy Vercel para 0 Secrets? (Clique aqui)'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <label style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                      Client ID:
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Cole seu Client ID (ex: 7f95363a-924a...)"
                      value={atlassianClientId}
                      onChange={(e) => setAtlassianClientId(e.target.value)}
                      style={{ fontSize: '12.5px', backgroundColor: 'rgba(0,0,0,0.25)', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <label style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                      Client Secret (Local):
                    </label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Opcional se usar o Proxy"
                      value={atlassianClientSecret}
                      onChange={(e) => setAtlassianClientSecret(e.target.value)}
                      style={{ fontSize: '12.5px', backgroundColor: 'rgba(0,0,0,0.25)', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                    />
                  </div>

                  <div style={{ flex: 1.4, minWidth: '240px' }}>
                    <label style={{ fontSize: '11.5px', color: '#34d399', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                      ☁️ URL Proxy Vercel (Recomendado):
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="https://seu-proxy.vercel.app/api/token"
                      value={atlassianProxyUrl}
                      onChange={(e) => setAtlassianProxyUrl(e.target.value)}
                      style={{ fontSize: '12.5px', backgroundColor: 'rgba(0,0,0,0.25)', borderColor: 'rgba(52, 211, 153, 0.4)' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleSaveAtlassianCredentials}
                      disabled={isSavingClientId}
                      style={{ padding: '8px 16px', fontSize: '12.5px', whiteSpace: 'nowrap', height: '38px' }}
                    >
                      {isSavingClientId ? 'Salvar...' : 'Salvar Dados'}
                    </button>
                  </div>
                </div>

                {clientIdNotice && (
                  <p style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', margin: 0 }}>{clientIdNotice}</p>
                )}

                {/* Collapsible Explanatory Guide */}
                {showOAuthGuide && (
                  <div
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      fontSize: '12px',
                      color: '#cbd5e1',
                      marginTop: '4px',
                      lineHeight: '1.6',
                    }}
                  >
                    <h5 style={{ color: '#818cf8', fontWeight: '700', fontSize: '13px', marginBottom: '6px' }}>
                      💡 Entenda o erro "failed to retrieve client" e como solucionar:
                    </h5>
                    <p style={{ marginBottom: '8px' }}>
                      O servidor OAuth 2.0 da Atlassian exige um <strong>Client ID</strong> registrado e ativo no portal oficial de desenvolvedores. Se o login for iniciado sem um Client ID válido, a Atlassian recusa o pedido exibindo <em>failed to retrieve client</em>.
                    </p>
                    <h6 style={{ color: '#ffffff', fontWeight: '700', marginTop: '8px', marginBottom: '4px' }}>
                      Como obter um Client ID Atlassian em 1 minuto:
                    </h6>
                    <ol style={{ paddingLeft: '18px', margin: 0 }}>
                      <li>
                        Acesse o <a href="https://developer.atlassian.com/console/myapps/" target="_blank" rel="noreferrer" style={{ color: '#818cf8' }}>Atlassian Developer Console</a> e faça login.
                      </li>
                      <li>Clique em <strong>Create</strong> &rarr; escolha <strong>OAuth 2.0 (3LO) integration</strong>.</li>
                      <li>Em <strong>Authorization</strong>, configure a Callback URL para: <code style={{ color: '#38bdf8', backgroundColor: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: '4px' }}>http://localhost:3000/callback</code></li>
                      <li>Em <strong>Permissions</strong>, adicione <em>Jira platform REST API</em> (<code style={{ color: '#e2e8f0' }}>read:jira-work</code>, <code style={{ color: '#e2e8f0' }}>read:jira-user</code>) e <em>User Identity API</em> (<code style={{ color: '#e2e8f0' }}>read:me</code>).</li>
                      <li>Copie o <strong>Client ID</strong> em <em>Settings</em> e cole no campo de texto acima.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleAddJira} style={styles.jiraForm}>
              <div>
                <label style={styles.label}>Ou cadastrar manualmente (Nome Identificador):</label>
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
                      border: (customTheme || DEFAULT_THEME).presetName === p.presetName ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
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
                  value={(customTheme || DEFAULT_THEME).bgMain || DEFAULT_THEME.bgMain}
                  onChange={(e) => handleColorChange('bgMain', e.target.value)}
                  style={styles.colorInput}
                />
              </div>

              <div style={styles.pickerItem}>
                <label style={styles.label}>Fundo da Sidebar:</label>
                <input
                  type="color"
                  value={(customTheme || DEFAULT_THEME).bgSidebar || DEFAULT_THEME.bgSidebar}
                  onChange={(e) => handleColorChange('bgSidebar', e.target.value)}
                  style={styles.colorInput}
                />
              </div>

              <div style={styles.pickerItem}>
                <label style={styles.label}>Cor de Destaque Principal:</label>
                <input
                  type="color"
                  value={(customTheme || DEFAULT_THEME).accentPrimary || DEFAULT_THEME.accentPrimary}
                  onChange={(e) => handleColorChange('accentPrimary', e.target.value)}
                  style={styles.colorInput}
                />
              </div>

              <div style={styles.pickerItem}>
                <label style={styles.label}>Cards Atlassian:</label>
                <input
                  type="color"
                  value={(customTheme || DEFAULT_THEME).bgCardJira || DEFAULT_THEME.bgCardJira}
                  onChange={(e) => handleColorChange('bgCardJira', e.target.value)}
                  style={styles.colorInput}
                />
              </div>

              <div style={styles.pickerItem}>
                <label style={styles.label}>Cards do App:</label>
                <input
                  type="color"
                  value={(customTheme || DEFAULT_THEME).bgCardApp || DEFAULT_THEME.bgCardApp}
                  onChange={(e) => handleColorChange('bgCardApp', e.target.value)}
                  style={styles.colorInput}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === LEGAL & ABOUT TAB === */}
      {activeTab === 'legal' && (
        <div style={styles.section}>
          <div style={styles.formCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={styles.cardTitle}>
                  <ShieldCheck size={20} color="var(--accent-primary)" /> Sobre & Conformidade Legal
                </h3>
                <p style={styles.cardSub}>
                  Simplify your Work v1.0.0 — Documentos legais e termos de distribuição.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: legalTab === 'terms' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                  onClick={() => setLegalTab('terms')}
                >
                  Termos de Uso
                </button>
                <button
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: legalTab === 'privacy' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                  onClick={() => setLegalTab('privacy')}
                >
                  Política de Privacidade
                </button>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '12px',
                padding: '20px',
                maxHeight: '480px',
                overflowY: 'auto',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
              }}
            >
              {legalTab === 'terms'
                ? legalDocs.termsContent || 'Carregando Termos de Uso...'
                : legalDocs.privacyContent || 'Carregando Política de Privacidade...'}
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
