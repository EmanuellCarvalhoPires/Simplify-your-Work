import { execFile } from 'child_process';
import { promisify } from 'util';
import Store from 'electron-store';
import { getCachedEvents } from './calendar-service';
import { dbGetSetting, dbSetSetting } from './database';

const execFileAsync = promisify(execFile);
const store = new Store();

export interface NotificationSettings {
  muteInTeamsMeetings: boolean;
  muteInCalendarMeetings: boolean;
  postponeMutedReminders: boolean;
}

export interface MeetingStatus {
  inMeeting: boolean;
  reason?: string;
  source?: 'windows_process' | 'calendar_event' | 'none';
  meetingTitle?: string;
  detectedAt: string;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  muteInTeamsMeetings: true,
  muteInCalendarMeetings: false,
  postponeMutedReminders: true,
};

// Micro-cache to prevent spawning powershell processes constantly
let cachedStatus: { status: MeetingStatus; expiresAt: number } | null = null;
const CACHE_TTL_MS = 4000;

/**
 * Retorna as configurações atuais de notificação/supressão
 */
export function getNotificationSettings(): NotificationSettings {
  try {
    const raw = dbGetSetting('notification_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed };
    }
  } catch (e) {
    // Fallback to store
  }

  const fromStore = store.get('notification_settings') as NotificationSettings | undefined;
  if (fromStore) {
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...fromStore };
  }

  return DEFAULT_NOTIFICATION_SETTINGS;
}

/**
 * Salva as configurações de notificação/supressão
 */
export function saveNotificationSettings(settings: Partial<NotificationSettings>): NotificationSettings {
  const current = getNotificationSettings();
  const updated: NotificationSettings = {
    ...current,
    ...settings,
  };

  const json = JSON.stringify(updated);
  dbSetSetting('notification_settings', json);
  store.set('notification_settings', updated);
  return updated;
}

/**
 * Checa o sistema operacional Windows para verificar se há janela de reunião do Teams ativa
 */
async function checkWindowsTeamsMeeting(): Promise<{ inMeeting: boolean; title?: string }> {
  if (process.platform !== 'win32') {
    return { inMeeting: false };
  }

  // PowerShell script that inspects window titles of Teams and browser meeting windows
  const psScript = `
    $meetingKeywords = @('reunião', 'meeting', 'chamada', 'call', '| microsoft teams', 'teams.microsoft.com')
    $teamsProcesses = @('ms-teams', 'Teams', 'msedge', 'chrome', 'brave')
    
    $meetingFound = $null
    Get-Process | Where-Object { 
      $procName = $_.ProcessName
      $title = $_.MainWindowTitle
      if ($title -and ($procName -in $teamsProcesses -or $procName -like '*teams*')) {
        $lowerTitle = $title.ToLower()
        foreach ($kw in $meetingKeywords) {
          if ($lowerTitle.Contains($kw)) {
            $meetingFound = $title
            break
          }
        }
      }
      if ($meetingFound) { return $true }
    }
    
    if ($meetingFound) {
      [PSCustomObject]@{ InMeeting = $true; Title = $meetingFound } | ConvertTo-Json
    }
  `;

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
      { timeout: 3500 }
    );

    const trimmed = stdout.trim();
    if (trimmed) {
      const parsed = JSON.parse(trimmed);
      if (parsed && parsed.InMeeting) {
        return { inMeeting: true, title: parsed.Title || 'Reunião do Microsoft Teams' };
      }
    }
  } catch (err) {
    // Silently ignore timeout or command failure
  }

  return { inMeeting: false };
}

/**
 * Checa os eventos sincronizados na Agenda (Outlook/Google) ocorrendo neste exato momento
 */
function checkCalendarMeeting(checkAnyMeeting: boolean): { inMeeting: boolean; title?: string; isTeams: boolean } {
  try {
    const events = getCachedEvents();
    if (!events || events.length === 0) {
      return { inMeeting: false, isTeams: false };
    }

    const now = new Date();
    for (const evt of events) {
      if (!evt.start || !evt.end) continue;
      const start = new Date(evt.start);
      const end = new Date(evt.end);

      if (now >= start && now <= end) {
        const fullText = `${evt.title || ''} ${evt.location || ''} ${evt.description || ''}`.toLowerCase();
        const isTeamsMeeting =
          fullText.includes('teams.microsoft.com') ||
          fullText.includes('microsoft teams') ||
          fullText.includes('reunião do teams') ||
          fullText.includes('teams meeting') ||
          (evt.location && evt.location.toLowerCase().includes('teams'));

        if (isTeamsMeeting) {
          return { inMeeting: true, title: evt.title, isTeams: true };
        }

        if (checkAnyMeeting) {
          return { inMeeting: true, title: evt.title, isTeams: false };
        }
      }
    }
  } catch (err) {
    console.error('[TEAMS-DETECTOR] Erro ao verificar agenda:', err);
  }

  return { inMeeting: false, isTeams: false };
}

/**
 * Verifica de forma unificada se o usuário está em reunião do Microsoft Teams ou Agenda
 */
export async function checkMeetingStatus(forceRefresh = false): Promise<MeetingStatus> {
  const nowMs = Date.now();
  if (!forceRefresh && cachedStatus && cachedStatus.expiresAt > nowMs) {
    return cachedStatus.status;
  }

  const settings = getNotificationSettings();

  // 1. Checa eventos da Agenda
  const calCheck = checkCalendarMeeting(settings.muteInCalendarMeetings);
  if (calCheck.inMeeting) {
    if (calCheck.isTeams && settings.muteInTeamsMeetings) {
      const status: MeetingStatus = {
        inMeeting: true,
        source: 'calendar_event',
        meetingTitle: calCheck.title,
        reason: `Reunião do Teams em andamento na Agenda: "${calCheck.title}"`,
        detectedAt: new Date().toISOString(),
      };
      cachedStatus = { status, expiresAt: nowMs + CACHE_TTL_MS };
      return status;
    }

    if (settings.muteInCalendarMeetings) {
      const status: MeetingStatus = {
        inMeeting: true,
        source: 'calendar_event',
        meetingTitle: calCheck.title,
        reason: `Reunião em andamento na Agenda: "${calCheck.title}"`,
        detectedAt: new Date().toISOString(),
      };
      cachedStatus = { status, expiresAt: nowMs + CACHE_TTL_MS };
      return status;
    }
  }

  // 2. Checa janelas e processos ativos no Windows se o mute no Teams estiver ligado
  if (settings.muteInTeamsMeetings) {
    const winCheck = await checkWindowsTeamsMeeting();
    if (winCheck.inMeeting) {
      const status: MeetingStatus = {
        inMeeting: true,
        source: 'windows_process',
        meetingTitle: winCheck.title,
        reason: `Chamada ou Reunião ativa no aplicativo Teams: "${winCheck.title}"`,
        detectedAt: new Date().toISOString(),
      };
      cachedStatus = { status, expiresAt: nowMs + CACHE_TTL_MS };
      return status;
    }
  }

  const status: MeetingStatus = {
    inMeeting: false,
    source: 'none',
    detectedAt: new Date().toISOString(),
  };
  cachedStatus = { status, expiresAt: nowMs + CACHE_TTL_MS };
  return status;
}

/**
 * Função utilitária para verificar se uma notificação deve ser silenciada neste momento
 */
export async function shouldSuppressNotification(): Promise<{ suppress: boolean; reason?: string; settings: NotificationSettings }> {
  const settings = getNotificationSettings();
  if (!settings.muteInTeamsMeetings && !settings.muteInCalendarMeetings) {
    return { suppress: false, settings };
  }

  const status = await checkMeetingStatus();
  if (status.inMeeting) {
    return {
      suppress: true,
      reason: status.reason,
      settings,
    };
  }

  return { suppress: false, settings };
}
