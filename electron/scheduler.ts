import { Notification, app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { dbGetReminders, dbSaveReminder } from './database';
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

async function checkReminders(): Promise<void> {
  try {
    const reminders = await dbGetReminders();
    const now = new Date();

    reminders.forEach(async (r) => {
      if (!r.enabled) return;

      let shouldTrigger = false;
      const last = r.lastTriggered ? new Date(r.lastTriggered) : null;
      const intervalMins = Number(r.intervalMinutes) || 60;

      if (r.recurrence === 'INTERVAL') {
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
        const [targetHour, targetMin] = r.scheduledTime.split(':').map(Number);
        if (!isNaN(targetHour) && !isNaN(targetMin)) {
          const scheduledDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetHour, targetMin, 0, 0);
          if (now >= scheduledDate && (!last || last < scheduledDate)) {
            shouldTrigger = true;
          }
        }
      }

      if (shouldTrigger) {
        console.log(`[SCHEDULER] Disparando notificação do lembrete "${r.title}" em ${now.toLocaleTimeString()}`);
        triggerNotification(r);
        await dbSaveReminder({
          ...r,
          lastTriggered: now.toISOString(),
          enabled: r.recurrence === 'ONCE' ? false : r.enabled,
        });
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
    body: reminder.message || 'Hora de dar uma pausa e se concentrar!',
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
