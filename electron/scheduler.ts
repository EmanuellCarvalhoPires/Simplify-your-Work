import { Notification, app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { dbGetReminders, dbSaveReminder, dbDeleteReminder } from './database';
import { getCachedEvents } from './calendar-service';
import type { Reminder } from '../src/types/index';

let checkInterval: NodeJS.Timeout | null = null;

export function startReminderScheduler(): void {
  if (checkInterval) return;

  // Run check every 5 seconds for immediate precision
  checkInterval = setInterval(() => {
    checkReminders();
  }, 5000);

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
  try {
    const reminders = await dbGetReminders();
    const now = new Date();
    const cachedEvents = getCachedEvents();

    reminders.forEach(async (r) => {
      if (!r.enabled) return;

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
          const occEnd = new Date(occ.end);
          // Calculate 30 minutes before meeting start time
          const reminderTime = new Date(occStart.getTime() - 30 * 60 * 1000);

          // Check if now is within the 30-min window before start (up to end of meeting)
          if (now >= reminderTime && now < occEnd) {
            const lastTrigMs = last ? last.getTime() : 0;
            // Prevent duplicate triggers for the same 30-min window (45 min tolerance)
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
          shouldTrigger = true;
        } else {
          const diffMs = now.getTime() - last.getTime();
          if (diffMs >= intervalMs) {
            shouldTrigger = true;
          }
        }
      } else if ((r.recurrence === 'DAILY' || r.recurrence === 'ONCE') && r.scheduledTime) {
        const scheduledDate = parseScheduledDate(r.scheduledTime);
        if (scheduledDate) {
          if (now >= scheduledDate && (!last || last < scheduledDate)) {
            shouldTrigger = true;
          }
        }
      }

      if (shouldTrigger) {
        console.log(`[SCHEDULER] Disparando notificação do lembrete "${r.title}" em ${now.toLocaleTimeString()}`);
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
      }
    });
  } catch (err) {
    console.error('Erro no verificador de lembretes:', err);
  }
}

export function triggerNotification(reminder: Partial<Reminder>): void {
  if (!Notification.isSupported()) {
    console.warn('Notificações de desktop não são suportadas neste sistema.');
    return;
  }

  const iconPath = path.join(app.getAppPath(), 'public', 'assets', 'app-icon.png');

  const notification = new Notification({
    title: `⏰ ${reminder.title || 'Lembrete Simplify your Work'}`,
    body: reminder.message || reminder.title || 'Lembrete agendado',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
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
