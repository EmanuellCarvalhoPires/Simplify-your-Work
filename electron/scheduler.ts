import { Notification, app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { dbGetReminders, dbSaveReminder, dbDeleteReminder } from './database';
import { getCachedEvents } from './calendar-service';
import { shouldSuppressNotification } from './teams-detector';
import type { Reminder } from '../src/types/index';

let checkInterval: NodeJS.Timeout | null = null;
let isChecking = false;
const loggedPausedReminders = new Set<string>();

export function startReminderScheduler(): void {
  if (checkInterval) return;

  // Run check every 10 seconds
  checkInterval = setInterval(() => {
    checkReminders();
  }, 10000);

  // Initial check after 2 seconds
  setTimeout(() => {
    checkReminders();
  }, 2000);
}

export function stopReminderScheduler(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

function parseScheduledDate(scheduledTimeStr: string): Date | null {
  if (!scheduledTimeStr) return null;
  const now = new Date();

  // If it's datetime-local or ISO format like "2026-08-12T14:00" or "2026-08-12 14:00"
  if (scheduledTimeStr.includes('T') || scheduledTimeStr.includes('-')) {
    const parsed = new Date(scheduledTimeStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // If it's a time string like "14:00" or "14:00:00"
  const timeMatch = scheduledTimeStr.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1], 10);
    const min = parseInt(timeMatch[2], 10);
    if (!isNaN(hour) && !isNaN(min)) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, min, 0, 0);
    }
  }

  return null;
}

async function checkReminders(): Promise<void> {
  if (isChecking) return;
  isChecking = true;

  try {
    const reminders = await dbGetReminders();
    const now = new Date();
    const cachedEvents = getCachedEvents();
    const activeReminderIds = new Set(reminders.map((r) => r.id));

    // Limpa registros de lembretes pausados que já não existem mais
    for (const id of loggedPausedReminders) {
      if (!activeReminderIds.has(id)) {
        loggedPausedReminders.delete(id);
      }
    }

    for (const r of reminders) {
      if (!r.enabled) {
        loggedPausedReminders.delete(r.id);
        continue;
      }

      let shouldTrigger = false;
      let notificationMsg = r.message || r.title;
      const last = r.lastTriggered ? new Date(r.lastTriggered) : null;
      const intervalMins = Number(r.intervalMinutes) || 60;

      // Handling Meeting Series Reminders (linked via eventId)
      if (r.eventId) {
        const seriesOccurrences = cachedEvents.filter(
          (e) => e.id === r.eventId || e.id.startsWith(`${r.eventId}_rec_`)
        );

        for (const occ of seriesOccurrences) {
          const occStart = new Date(occ.start);
          // Calculate 30 minutes before meeting start time
          const reminderTime = new Date(occStart.getTime() - 30 * 60 * 1000);
          // Only alert within the window: 30 minutes before start up to 5 minutes after meeting begins
          const maxTriggerTime = new Date(occStart.getTime() + 5 * 60 * 1000);

          if (now >= reminderTime && now <= maxTriggerTime) {
            const lastTrigMs = last ? last.getTime() : 0;
            // Prevent duplicate triggers for the same occurrence (within 45 min tolerance of reminderTime)
            const alreadyTriggeredForOcc = Math.abs(lastTrigMs - reminderTime.getTime()) < 45 * 60 * 1000;

            if (!alreadyTriggeredForOcc) {
              shouldTrigger = true;
              const startTimeStr = occStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              notificationMsg = `Sua reunião "${occ.title}" começa às ${startTimeStr}.`;
              break;
            }
          }
        }
      } else if (r.recurrence === 'INTERVAL') {
        const intervalMs = intervalMins * 60 * 1000;
        if (!last) {
          // Initialize lastTriggered to now so it waits for the full interval instead of firing immediately upon app start
          await dbSaveReminder({
            ...r,
            lastTriggered: now.toISOString(),
            enabled: r.enabled,
          });
        } else {
          const diffMs = now.getTime() - last.getTime();
          if (diffMs >= intervalMs) {
            shouldTrigger = true;
          }
        }
      } else if ((r.recurrence === 'DAILY' || r.recurrence === 'ONCE') && r.scheduledTime) {
        const scheduledDate = parseScheduledDate(r.scheduledTime);
        if (scheduledDate) {
          const diffMs = now.getTime() - scheduledDate.getTime();
          // Only trigger if scheduled time reached AND within a 15-minute tolerance window (avoiding firing stale past reminders on app start)
          const isWithinWindow = diffMs >= 0 && diffMs <= 15 * 60 * 1000;
          if (isWithinWindow && (!last || last < scheduledDate)) {
            shouldTrigger = true;
          } else if (r.recurrence === 'ONCE' && diffMs > 15 * 60 * 1000 && !last) {
            // Expired one-time reminder from past days/hours: clean up silently
            await dbDeleteReminder(r.id);
          }
        }
      }

      if (shouldTrigger) {
        // Verificar se deve suprimir notificações por estar em reunião do Teams ou Agenda
        const suppression = await shouldSuppressNotification();
        if (suppression.suppress) {
          // Loga apenas uma vez a mensagem de pausa para este lembrete
          if (!loggedPausedReminders.has(r.id)) {
            console.log(`[SCHEDULER] Lembrete "${r.title}" pausado temporariamente: ${suppression.reason}`);
            loggedPausedReminders.add(r.id);
          }

          if (!suppression.settings.postponeMutedReminders) {
            // Se o usuário não quiser adiar, descartar silenciosamente
            loggedPausedReminders.delete(r.id);
            if (r.recurrence === 'ONCE') {
              await dbDeleteReminder(r.id);
            } else {
              await dbSaveReminder({
                ...r,
                lastTriggered: now.toISOString(),
                enabled: r.enabled,
              });
            }
          }
          continue;
        }

        if (loggedPausedReminders.has(r.id)) {
          console.log(`[SCHEDULER] Reunião finalizada. Disparando lembrete adiado "${r.title}" em ${now.toLocaleTimeString()}`);
          loggedPausedReminders.delete(r.id);
        } else {
          console.log(`[SCHEDULER] Disparando notificação do lembrete "${r.title}" em ${now.toLocaleTimeString()}`);
        }

        triggerNotification({ ...r, message: notificationMsg });

        if (r.eventId) {
          // Check remaining future occurrences for this meeting series
          const remainingOccurrences = cachedEvents.filter(
            (e) => (e.id === r.eventId || e.id.startsWith(`${r.eventId}_rec_`)) && new Date(e.end || e.start) > now
          );

          if (remainingOccurrences.length <= 1) {
            console.log(`[SCHEDULER] Reunião finalizada. Removendo lembrete "${r.title}"`);
            await dbDeleteReminder(r.id);
          } else {
            await dbSaveReminder({
              ...r,
              lastTriggered: now.toISOString(),
              enabled: true,
            });
          }
        } else if (r.recurrence === 'ONCE') {
          // Single reminder: delete immediately after firing
          console.log(`[SCHEDULER] Lembrete pontual disparado. Removendo lembrete "${r.title}"`);
          await dbDeleteReminder(r.id);
        } else {
          await dbSaveReminder({
            ...r,
            lastTriggered: now.toISOString(),
            enabled: r.enabled,
          });
        }
      } else {
        if (loggedPausedReminders.has(r.id)) {
          loggedPausedReminders.delete(r.id);
        }
      }
    }
  } catch (err) {
    console.error('Erro no verificador de lembretes:', err);
  } finally {
    isChecking = false;
  }
}

export function triggerNotification(reminder: Partial<Reminder>): void {
  if (!Notification.isSupported()) {
    console.warn('Notificações de desktop não são suportadas neste sistema.');
    return;
  }

  const appPath = app.getAppPath();
  const iconCandidates = [
    path.join(appPath, 'public', 'assets', 'app-icon.png'),
    path.join(appPath, 'dist', 'assets', 'app-icon.png'),
    path.resolve(process.cwd(), 'public', 'assets', 'app-icon.png'),
  ];
  const iconPath = iconCandidates.find((c) => fs.existsSync(c));

  const notification = new Notification({
    title: `⏰ ${reminder.title || 'Lembrete Simplify your Work'}`,
    body: reminder.message || reminder.title || 'Lembrete agendado',
    icon: iconPath,
    silent: false,
  });

  notification.on('click', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      if (windows[0].isMinimized()) windows[0].restore();
      windows[0].show();
      windows[0].focus();
    }
  });

  notification.show();
}
