import https from 'https';
import http from 'http';
import Store from 'electron-store';
import { dbSaveReminder, dbGetReminders, dbDeleteReminder } from './database';
import { CalendarEvent } from '../src/types/index';

const store = new Store();

export const DEFAULT_ICS_URL =
  'https://outlook.office365.com/owa/calendar/99084e2e8fbe435a8e2061e3b88ce721@csptech.com.br/c3e18d3ecba5429482a4efe82e36385d15319005524808242401/calendar.ics';

// Fetch raw string from HTTP / HTTPS URL
export function fetchUrlText(urlStr: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const targetUrl = urlStr.replace(/\/calendar\.html$/i, '/calendar.ics');
    try {
      const parsedUrl = new URL(targetUrl);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/calendar, text/plain, */*',
        },
      };

      const client = parsedUrl.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrlText(res.headers.location).then(resolve).catch(reject);
        }

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      });

      req.on('error', (err) => reject(err));
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

// Parse raw VEVENT objects from ICS string
export function parseRawIcsEvents(icsContent: string): ParsedRawEvent[] {
  if (!icsContent) return [];
  const unfolded = icsContent.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  const rawList: ParsedRawEvent[] = [];
  let currentEvent: (ParsedRawEvent & { isCancelled?: boolean }) | null = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = { exdates: [], isCancelled: false };
      continue;
    }

    if (line.startsWith('END:VEVENT')) {
      if (currentEvent && currentEvent.start && currentEvent.title) {
        const isCancelledTitle = currentEvent.title.toLowerCase().startsWith('cancelado') || currentEvent.title.toLowerCase().startsWith('canceled');
        if (!currentEvent.isCancelled && !isCancelledTitle) {
          if (!currentEvent.id) {
            const hashStr = `${currentEvent.title}_${currentEvent.start.getTime()}`.replace(/[^a-zA-Z0-9]/g, '');
            currentEvent.id = `evt_${hashStr}`;
          }
          rawList.push(currentEvent);
        }
      }
      currentEvent = null;
      continue;
    }

    if (!currentEvent) continue;

    if (line.startsWith('STATUS:CANCELLED') || line.startsWith('METHOD:CANCEL')) {
      currentEvent.isCancelled = true;
    } else if (line.startsWith('UID:')) {
      currentEvent.id = line.substring(4).trim();
    } else if (line.startsWith('SUMMARY:')) {
      const titleVal = line.substring(8).trim().replace(/\\,/g, ',').replace(/\\;/g, ';');
      currentEvent.title = titleVal;
      if (titleVal.toLowerCase().startsWith('cancelado') || titleVal.toLowerCase().startsWith('canceled')) {
        currentEvent.isCancelled = true;
      }
    } else if (line.startsWith('LOCATION:')) {
      currentEvent.location = line.substring(9).trim().replace(/\\,/g, ',').replace(/\\;/g, ';');
    } else if (line.startsWith('DESCRIPTION:')) {
      currentEvent.description = line.substring(12).trim().replace(/\\n/g, '\n').replace(/\\,/g, ',');
    } else if (line.startsWith('DTSTART')) {
      const parts = line.split(':');
      const val = parts[parts.length - 1].trim();
      const parsedDate = parseIcsDate(val);
      if (parsedDate) currentEvent.start = parsedDate;
    } else if (line.startsWith('DTEND')) {
      const parts = line.split(':');
      const val = parts[parts.length - 1].trim();
      const parsedDate = parseIcsDate(val);
      if (parsedDate) currentEvent.end = parsedDate;
    } else if (line.startsWith('RRULE:') || line.startsWith('RRULE;')) {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        currentEvent.rrule = line.substring(idx + 1).trim();
      }
    } else if (line.startsWith('EXDATE')) {
      const parts = line.split(':');
      const val = parts[parts.length - 1].trim();
      const parsedDate = parseIcsDate(val);
      if (parsedDate && currentEvent.exdates) {
        currentEvent.exdates.push(parsedDate);
      }
    }
  }

  return rawList;
}

// Lightweight, robust iCalendar (.ics) VEVENT parser with RRULE recurrence expansion
export function parseIcsContent(icsContent: string): CalendarEvent[] {
  const rawEvents = parseRawIcsEvents(icsContent);
  if (rawEvents.length === 0) return [];

  // Define 6 months past to 7 months future horizon
  const now = new Date();
  const startHorizon = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const endHorizon = new Date(now.getFullYear(), now.getMonth() + 7, 1);

  const events: CalendarEvent[] = [];
  for (const raw of rawEvents) {
    const expanded = expandEventRecurrences(raw, startHorizon, endHorizon);
    events.push(...expanded);
  }

  // Sort events by start date ascending
  events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return events;
}

// Expand RRULE recurrence rules across specified time horizon
function expandEventRecurrences(raw: ParsedRawEvent, startHorizon: Date, endHorizon: Date): CalendarEvent[] {
  if (!raw.start || !raw.title) return [];
  const baseStart = raw.start;
  const baseEnd = raw.end || baseStart;
  const durationMs = Math.max(baseEnd.getTime() - baseStart.getTime(), 0);
  const baseId = raw.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Single non-recurring event
  if (!raw.rrule) {
    if (baseStart >= startHorizon && baseStart <= endHorizon) {
      return [{
        id: baseId,
        title: raw.title,
        start: baseStart.toISOString(),
        end: baseEnd.toISOString(),
        location: raw.location || '',
        description: raw.description || '',
      }];
    }
    return [{
      id: baseId,
      title: raw.title,
      start: baseStart.toISOString(),
      end: baseEnd.toISOString(),
      location: raw.location || '',
      description: raw.description || '',
    }];
  }

  // Parse RRULE key=value parameters
  const rruleParams: Record<string, string> = {};
  const parts = raw.rrule.split(';');
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx !== -1) {
      const k = p.substring(0, idx).trim().toUpperCase();
      const v = p.substring(idx + 1).trim().toUpperCase();
      rruleParams[k] = v;
    }
  }

  const freq = rruleParams['FREQ'];
  const interval = parseInt(rruleParams['INTERVAL'] || '1', 10) || 1;
  const count = rruleParams['COUNT'] ? parseInt(rruleParams['COUNT'], 10) : null;
  const untilDate = rruleParams['UNTIL'] ? parseIcsDate(rruleParams['UNTIL']) : null;
  const byDayStr = rruleParams['BYDAY'];

  const DAY_MAP: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  const byDays: number[] = [];
  if (byDayStr) {
    for (const tok of byDayStr.split(',')) {
      const cleanDay = tok.replace(/[^A-Z]/g, '');
      if (DAY_MAP[cleanDay] !== undefined) {
        byDays.push(DAY_MAP[cleanDay]);
      }
    }
  }

  let maxLimitDate = endHorizon;
  if (untilDate && untilDate < maxLimitDate) maxLimitDate = untilDate;

  const resultEvents: CalendarEvent[] = [];
  let generatedCount = 0;

  const isExdate = (d: Date) => {
    if (!raw.exdates || raw.exdates.length === 0) return false;
    return raw.exdates.some(ex =>
      ex.getFullYear() === d.getFullYear() &&
      ex.getMonth() === d.getMonth() &&
      ex.getDate() === d.getDate()
    );
  };

  if (freq === 'DAILY') {
    let curr = new Date(baseStart);
    while (curr <= maxLimitDate) {
      if (count !== null && generatedCount >= count) break;
      if (generatedCount >= 500) break;

      if (curr >= startHorizon && !isExdate(curr)) {
        const instEnd = new Date(curr.getTime() + durationMs);
        resultEvents.push({
          id: `${baseId}_rec_${curr.getTime()}`,
          title: raw.title,
          start: curr.toISOString(),
          end: instEnd.toISOString(),
          location: raw.location || '',
          description: raw.description || '',
        });
      }
      generatedCount++;
      curr.setDate(curr.getDate() + interval);
    }
  } else if (freq === 'WEEKLY') {
    if (byDays.length > 0) {
      // Start from Sunday of initial start week
      let weekStart = new Date(baseStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const baseStartDay = new Date(baseStart.getFullYear(), baseStart.getMonth(), baseStart.getDate());

      while (weekStart <= maxLimitDate) {
        if (count !== null && generatedCount >= count) break;
        if (generatedCount >= 500) break;

        for (const dayNum of byDays) {
          const candidate = new Date(weekStart);
          candidate.setDate(candidate.getDate() + dayNum);
          candidate.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), baseStart.getMilliseconds());

          const candidateDay = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
          if (candidateDay < baseStartDay) continue;

          if (candidate > maxLimitDate) break;
          if (count !== null && generatedCount >= count) break;

          if (candidate >= startHorizon && !isExdate(candidate)) {
            const instEnd = new Date(candidate.getTime() + durationMs);
            resultEvents.push({
              id: `${baseId}_rec_${candidate.getTime()}`,
              title: raw.title,
              start: candidate.toISOString(),
              end: instEnd.toISOString(),
              location: raw.location || '',
              description: raw.description || '',
            });
          }
          generatedCount++;
        }

        weekStart.setDate(weekStart.getDate() + 7 * interval);
      }
    } else {
      let curr = new Date(baseStart);
      while (curr <= maxLimitDate) {
        if (count !== null && generatedCount >= count) break;
        if (generatedCount >= 500) break;

        if (curr >= startHorizon && !isExdate(curr)) {
          const instEnd = new Date(curr.getTime() + durationMs);
          resultEvents.push({
            id: `${baseId}_rec_${curr.getTime()}`,
            title: raw.title,
            start: curr.toISOString(),
            end: instEnd.toISOString(),
            location: raw.location || '',
            description: raw.description || '',
          });
        }
        generatedCount++;
        curr.setDate(curr.getDate() + 7 * interval);
      }
    }
  } else if (freq === 'MONTHLY') {
    let curr = new Date(baseStart);
    while (curr <= maxLimitDate) {
      if (count !== null && generatedCount >= count) break;
      if (generatedCount >= 500) break;

      if (curr >= startHorizon && !isExdate(curr)) {
        const instEnd = new Date(curr.getTime() + durationMs);
        resultEvents.push({
          id: `${baseId}_rec_${curr.getTime()}`,
          title: raw.title,
          start: curr.toISOString(),
          end: instEnd.toISOString(),
          location: raw.location || '',
          description: raw.description || '',
        });
      }
      generatedCount++;
      curr.setMonth(curr.getMonth() + interval);
    }
  } else {
    resultEvents.push({
      id: baseId,
      title: raw.title,
      start: baseStart.toISOString(),
      end: baseEnd.toISOString(),
      location: raw.location || '',
      description: raw.description || '',
    });
  }

  return resultEvents;
}

// Parse ICS date string formats e.g. "20260813T140000Z" or "20260813T110000" or "20260813"
function parseIcsDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.replace(/[^0-9TZ]/g, '');

  if (clean.length >= 15) {
    const year = parseInt(clean.substring(0, 4), 10);
    const month = parseInt(clean.substring(4, 6), 10) - 1;
    const day = parseInt(clean.substring(6, 8), 10);
    const hour = parseInt(clean.substring(9, 11), 10);
    const minute = parseInt(clean.substring(11, 13), 10);
    const second = parseInt(clean.substring(13, 15), 10);

    if (clean.endsWith('Z')) {
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }
    return new Date(year, month, day, hour, minute, second);
  } else if (clean.length >= 8) {
    const year = parseInt(clean.substring(0, 4), 10);
    const month = parseInt(clean.substring(4, 6), 10) - 1;
    const day = parseInt(clean.substring(6, 8), 10);
    return new Date(year, month, day, 9, 0, 0);
  }
  return null;
}

// Sync ICS feed and automatically create ONE local App Reminder per meeting series
export async function syncIcsCalendar(customUrl?: string): Promise<{ events: CalendarEvent[]; remindersCreated: number }> {
  const icsUrl = customUrl || (store.get('ics_calendar_url') as string) || DEFAULT_ICS_URL;
  store.set('ics_calendar_url', icsUrl);

  try {
    const rawText = await fetchUrlText(icsUrl);
    const rawEvents = parseRawIcsEvents(rawText);
    const expandedEvents = parseIcsContent(rawText);
    store.set('calendar_events_cache', expandedEvents);

    const now = new Date();

    // Determine which raw event series UIDs have at least one FUTURE occurrence
    const futureSeriesIds = new Set<string>();
    for (const rawEvt of rawEvents) {
      if (!rawEvt.id) continue;
      const occurrences = expandedEvents.filter(e => e.id === rawEvt.id || e.id.startsWith(`${rawEvt.id}_rec_`) || e.title === rawEvt.title);
      const hasFuture = occurrences.some(occ => new Date(occ.end || occ.start) > now);
      if (hasFuture) {
        futureSeriesIds.add(rawEvt.id);
      }
    }

    // Fetch existing reminders
    const existingReminders = await dbGetReminders();

    // Purge obsolete/duplicate/past/canceled meeting reminders and expired one-time reminders
    for (const r of existingReminders) {
      const isMeetingReminder = Boolean(r.eventId) || r.title.startsWith('⏰ Reunião em 30 min:');
      const isCancelledTitle = r.title.toLowerCase().includes('cancelado') || r.title.toLowerCase().includes('canceled');
      if (isMeetingReminder) {
        if (isCancelledTitle || !r.eventId || !futureSeriesIds.has(r.eventId) || r.id !== `rem_series_${r.eventId}`) {
          console.log(`[Calendar Sync] Removendo lembrete de reunião cancelada/passada/obsoleta: ${r.id} (${r.title})`);
          await dbDeleteReminder(r.id);
        }
      } else if (r.recurrence === 'ONCE' && r.scheduledTime) {
        const sched = new Date(r.scheduledTime);
        if (!isNaN(sched.getTime()) && sched < now) {
          console.log(`[Calendar Sync] Removendo lembrete pontual já expirado: ${r.id}`);
          await dbDeleteReminder(r.id);
        }
      }
    }

    // Re-fetch current reminders list after purge
    const currentReminders = await dbGetReminders();
    let remindersCreated = 0;

    // Create or update EXACTLY ONE reminder per raw event series with FUTURE occurrences
    for (const rawEvt of rawEvents) {
      if (!rawEvt.id || !rawEvt.title) continue;
      if (!futureSeriesIds.has(rawEvt.id)) continue; // Skip meetings that already ended in the past or are canceled!

      const seriesId = rawEvt.id;
      const reminderId = `rem_series_${seriesId}`;
      const existingRem = currentReminders.find((r) => r.id === reminderId);

      // Find the next upcoming occurrence start time for this series
      const seriesOccurrences = expandedEvents.filter((e) => e.id === seriesId || e.id.startsWith(`${seriesId}_rec_`) || e.title === rawEvt.title);
      const nextOcc = seriesOccurrences.find((occ) => new Date(occ.end || occ.start) > now);
      const nextScheduledTime = nextOcc ? nextOcc.start : (rawEvt.start ? rawEvt.start.toISOString() : '');

      if (!existingRem) {
        await dbSaveReminder({
          id: reminderId,
          eventId: seriesId,
          title: `⏰ Reunião em 30 min: ${rawEvt.title}`,
          message: `Sua reunião "${rawEvt.title}" começará em 30 minutos.`,
          recurrence: 'ONCE',
          intervalMinutes: 0,
          scheduledTime: nextScheduledTime,
          enabled: true,
        });
        remindersCreated++;
      } else if (nextScheduledTime && existingRem.scheduledTime !== nextScheduledTime) {
        await dbSaveReminder({
          ...existingRem,
          scheduledTime: nextScheduledTime,
        });
      }
    }

    return { events: expandedEvents, remindersCreated };
  } catch (err) {
    console.error('[syncIcsCalendar Error]:', err);
    const cached = (store.get('calendar_events_cache') as CalendarEvent[]) || [];
    return { events: cached, remindersCreated: 0 };
  }
}

export function getCachedEvents(): CalendarEvent[] {
  return (store.get('calendar_events_cache') as CalendarEvent[]) || [];
}

export function getCalendarUrl(): string {
  return (store.get('ics_calendar_url') as string) || DEFAULT_ICS_URL;
}

export function setCalendarUrl(url: string): boolean {
  store.set('ics_calendar_url', url);
  return true;
}
