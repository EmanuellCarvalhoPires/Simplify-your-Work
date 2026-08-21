import https from 'https';
import http from 'http';
import Store from 'electron-store';
import { dbSaveReminder, dbGetReminders, dbDeleteReminder } from './database';
import { CalendarEvent, CalendarFeed } from '../src/types/index';

const store = new Store();

export const DEFAULT_ICS_URL =
  'https://outlook.office365.com/owa/calendar/99084e2e8fbe435a8e2061e3b88ce721@csptech.com.br/c3e18d3ecba5429482a4efe82e36385d15319005524808242401/calendar.ics';

export const DEFAULT_FEEDS: CalendarFeed[] = [
  {
    id: 'outlook',
    name: 'Microsoft Outlook (Trabalho)',
    url: DEFAULT_ICS_URL,
    type: 'outlook',
    color: '#6366f1',
    enabled: true,
  },
  {
    id: 'google',
    name: 'Google Calendar (Pessoal)',
    url: '',
    type: 'google',
    color: '#10b981',
    enabled: true,
  },
];

export interface ParsedRawEvent {
  id?: string;
  title?: string;
  start?: Date;
  end?: Date;
  location?: string;
  description?: string;
  rrule?: string;
  recurrenceId?: Date;
  sequence?: number;
  lastModified?: Date;
  exdates?: Date[];
  isCancelled?: boolean;
  allDay?: boolean;
  calendarId?: string;
  calendarName?: string;
  color?: string;
}

// ─── Feed Management ─────────────────────────────────────────

export function getCalendarFeeds(): CalendarFeed[] {
  let feeds = store.get('ics_calendar_feeds') as CalendarFeed[] | undefined;

  if (!feeds || !Array.isArray(feeds) || feeds.length === 0) {
    const legacyUrl = (store.get('ics_calendar_url') as string) || DEFAULT_ICS_URL;
    feeds = [
      {
        id: 'outlook',
        name: 'Microsoft Outlook (Trabalho)',
        url: legacyUrl,
        type: 'outlook',
        color: '#6366f1',
        enabled: true,
      },
      {
        id: 'google',
        name: 'Google Calendar (Pessoal)',
        url: '',
        type: 'google',
        color: '#10b981',
        enabled: true,
      },
    ];
    store.set('ics_calendar_feeds', feeds);
    return feeds;
  }

  // Ensure default feeds exist in list
  let modified = false;
  for (const defFeed of DEFAULT_FEEDS) {
    if (!feeds.some((f) => f.id === defFeed.id)) {
      feeds.push({ ...defFeed });
      modified = true;
    }
  }

  if (modified) {
    store.set('ics_calendar_feeds', feeds);
  }

  return feeds;
}

export function saveCalendarFeed(feedData: Partial<CalendarFeed> & { id: string }): CalendarFeed[] {
  const feeds = getCalendarFeeds();
  const index = feeds.findIndex((f) => f.id === feedData.id);

  if (index >= 0) {
    feeds[index] = {
      ...feeds[index],
      ...feedData,
    };
  } else {
    feeds.push({
      id: feedData.id,
      name: feedData.name || 'Nova Agenda',
      url: feedData.url || '',
      type: feedData.type || 'custom',
      color: feedData.color || '#3b82f6',
      enabled: feedData.enabled !== undefined ? feedData.enabled : true,
      lastSynced: feedData.lastSynced,
      eventCount: feedData.eventCount,
    });
  }

  store.set('ics_calendar_feeds', feeds);

  // Sync legacy key if outlook
  if (feedData.id === 'outlook' && feedData.url) {
    store.set('ics_calendar_url', feedData.url);
  }

  return feeds;
}

export function deleteCalendarFeed(id: string): CalendarFeed[] {
  let feeds = getCalendarFeeds();

  if (id === 'outlook' || id === 'google') {
    // For default feeds, just clear url and disable
    feeds = feeds.map((f) => (f.id === id ? { ...f, url: '', enabled: false, eventCount: 0 } : f));
  } else {
    feeds = feeds.filter((f) => f.id !== id);
  }

  store.set('ics_calendar_feeds', feeds);
  return feeds;
}

// ─── Fetch URL (WebCal, HTTPS, HTTP, Redirects) ─────────────

export function fetchUrlText(urlStr: string, maxRedirects = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error('Muitos redirecionamentos ao buscar o calendário.'));
    }

    let targetUrl = urlStr.trim();
    if (targetUrl.startsWith('webcal://')) {
      targetUrl = 'https://' + targetUrl.substring(9);
    }
    targetUrl = targetUrl.replace(/\/calendar\.html$/i, '/calendar.ics');

    try {
      const parsedUrl = new URL(targetUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/calendar, text/plain, */*',
        },
      };

      const client = isHttps ? https : http;
      const req = client.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let nextUrl = res.headers.location;
          if (!nextUrl.startsWith('http')) {
            nextUrl = new URL(nextUrl, targetUrl).toString();
          }
          return fetchUrlText(nextUrl, maxRedirects - 1).then(resolve).catch(reject);
        }

        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          return reject(new Error(`Servidor de calendário retornou status HTTP ${res.statusCode}`));
        }

        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      });

      req.on('error', (err) => reject(err));
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Tempo limite de conexão excedido ao baixar o calendário.'));
      });
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

// ─── Parse Raw ICS Events ───────────────────────────────────

export function parseRawIcsEvents(
  icsContent: string,
  feedInfo?: { id: string; name: string; color: string }
): ParsedRawEvent[] {
  if (!icsContent) return [];
  const unfolded = icsContent.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  const rawList: ParsedRawEvent[] = [];
  let currentEvent: ParsedRawEvent | null = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {
        exdates: [],
        isCancelled: false,
        calendarId: feedInfo?.id || 'outlook',
        calendarName: feedInfo?.name || 'Outlook',
        color: feedInfo?.color || '#6366f1',
      };
      continue;
    }

    if (line.startsWith('END:VEVENT')) {
      if (currentEvent && currentEvent.start && currentEvent.title) {
        const isCancelledTitle =
          currentEvent.title.toLowerCase().startsWith('cancelado') ||
          currentEvent.title.toLowerCase().startsWith('canceled');
        if (!currentEvent.isCancelled && !isCancelledTitle) {
          if (!currentEvent.id) {
            const hashStr = `${currentEvent.title}_${currentEvent.start.getTime()}`.replace(/[^a-zA-Z0-9]/g, '');
            currentEvent.id = `evt_${hashStr}`;
          }
          // If no end date, set default duration 30 min or 1 day for all-day
          if (!currentEvent.end) {
            if (currentEvent.allDay) {
              const endD = new Date(currentEvent.start);
              endD.setDate(endD.getDate() + 1);
              currentEvent.end = endD;
            } else {
              currentEvent.end = new Date(currentEvent.start.getTime() + 30 * 60 * 1000);
            }
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
    } else if (line.startsWith('UID:') || line.startsWith('UID;')) {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        currentEvent.id = line.substring(idx + 1).trim();
      }
    } else if (line.startsWith('RECURRENCE-ID') || line.startsWith('RECURRENCE-ID;')) {
      const parts = line.split(':');
      const val = parts[parts.length - 1].trim();
      const isDateOnly = line.includes('VALUE=DATE') || val.replace(/[^0-9]/g, '').length === 8;
      const parsedDate = parseIcsDate(val, isDateOnly);
      if (parsedDate) currentEvent.recurrenceId = parsedDate;
    } else if (line.startsWith('SEQUENCE:')) {
      const seq = parseInt(line.substring(9).trim(), 10);
      if (!isNaN(seq)) currentEvent.sequence = seq;
    } else if (line.startsWith('LAST-MODIFIED:') || line.startsWith('LAST-MODIFIED;')) {
      const parts = line.split(':');
      const val = parts[parts.length - 1].trim();
      const parsedDate = parseIcsDate(val);
      if (parsedDate) currentEvent.lastModified = parsedDate;
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
      const isDateOnly = line.includes('VALUE=DATE') || val.replace(/[^0-9]/g, '').length === 8;
      const parsedDate = parseIcsDate(val, isDateOnly);
      if (parsedDate) {
        currentEvent.start = parsedDate;
        if (isDateOnly) currentEvent.allDay = true;
      }
    } else if (line.startsWith('DTEND')) {
      const parts = line.split(':');
      const val = parts[parts.length - 1].trim();
      const isDateOnly = line.includes('VALUE=DATE') || val.replace(/[^0-9]/g, '').length === 8;
      const parsedDate = parseIcsDate(val, isDateOnly);
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

// ─── Parse & Expand ICS Content ─────────────────────────────

export function parseIcsContent(
  icsContent: string,
  feedInfo?: { id: string; name: string; color: string }
): CalendarEvent[] {
  const rawEvents = parseRawIcsEvents(icsContent, feedInfo);
  if (rawEvents.length === 0) return [];

  // 1. Process Recurrence Exceptions (RFC 5545)
  // Quando uma ocorrência de evento recorrente é editada no Google/Outlook,
  // ela vem com o mesmo UID e um campo RECURRENCE-ID.
  // Excluímos essa data da série principal para evitar a ocorrência com título antigo duplicada.
  const masterEvents = rawEvents.filter((r) => r.rrule && r.id);
  const exceptionEvents = rawEvents.filter((r) => r.recurrenceId && r.id);

  for (const exc of exceptionEvents) {
    const master = masterEvents.find((m) => m.id === exc.id);
    if (master) {
      if (!master.exdates) master.exdates = [];
      master.exdates.push(exc.recurrenceId!);
      if (exc.start) {
        master.exdates.push(exc.start);
      }
    }
  }

  // 6 months past to 7 months future horizon
  const now = new Date();
  const startHorizon = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const endHorizon = new Date(now.getFullYear(), now.getMonth() + 7, 1);

  const rawExpanded: CalendarEvent[] = [];
  for (const raw of rawEvents) {
    if (raw.isCancelled) continue;
    const expanded = expandEventRecurrences(raw, startHorizon, endHorizon);
    rawExpanded.push(...expanded);
  }

  // 2. Intelligent Deduplication & Event Override Layer
  // Evita duplicatas quando o nome/data do evento é atualizado no Google Calendar ou Outlook
  const deduplicatedMap = new Map<string, CalendarEvent>();

  for (const evt of rawExpanded) {
    const baseUid = evt.id.includes('_rec_') ? evt.id.split('_rec_')[0] : evt.id;
    // Chave com UID
    const uidSlotKey = `${evt.calendarId || 'cal'}__${evt.start}__${evt.end}__${baseUid}`;
    // Chave genérica de horário
    const genericSlotKey = `${evt.calendarId || 'cal'}__${evt.start}__${evt.end}`;

    if (deduplicatedMap.has(uidSlotKey)) {
      const existing = deduplicatedMap.get(uidSlotKey)!;
      const isExistingGenerated = existing.id.includes('_rec_');
      const isCurrentGenerated = evt.id.includes('_rec_');

      if (isExistingGenerated && !isCurrentGenerated) {
        deduplicatedMap.set(uidSlotKey, evt);
      } else {
        deduplicatedMap.set(uidSlotKey, evt);
      }
    } else if (deduplicatedMap.has(genericSlotKey)) {
      const existing = deduplicatedMap.get(genericSlotKey)!;
      const isExistingGenerated = existing.id.includes('_rec_');
      const isCurrentGenerated = evt.id.includes('_rec_');

      if (isExistingGenerated && !isCurrentGenerated) {
        deduplicatedMap.delete(genericSlotKey);
        deduplicatedMap.set(uidSlotKey, evt);
      } else {
        deduplicatedMap.set(uidSlotKey, evt);
      }
    } else {
      deduplicatedMap.set(uidSlotKey, evt);
    }
  }

  const events = Array.from(deduplicatedMap.values());
  events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return events;
}

// ─── Expand Recurrences ─────────────────────────────────────

function expandEventRecurrences(raw: ParsedRawEvent, startHorizon: Date, endHorizon: Date): CalendarEvent[] {
  if (!raw.start || !raw.title) return [];
  const baseStart = raw.start;
  const baseEnd = raw.end || baseStart;
  const durationMs = Math.max(baseEnd.getTime() - baseStart.getTime(), 0);
  const baseId = raw.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const createEventObj = (id: string, s: Date, e: Date): CalendarEvent => ({
    id,
    title: raw.title!,
    start: s.toISOString(),
    end: e.toISOString(),
    location: raw.location || '',
    description: raw.description || '',
    calendarId: raw.calendarId || 'outlook',
    calendarName: raw.calendarName || 'Outlook',
    color: raw.color || '#6366f1',
    allDay: raw.allDay || false,
  });

  // Single non-recurring event or modified exception instance
  if (!raw.rrule) {
    const eventId = raw.recurrenceId ? `${baseId}_rec_${baseStart.getTime()}` : baseId;
    if (baseStart >= startHorizon && baseStart <= endHorizon) {
      return [createEventObj(eventId, baseStart, baseEnd)];
    }
    return [createEventObj(eventId, baseStart, baseEnd)];
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
    const dTime = d.getTime();
    return raw.exdates.some((ex) => {
      if (Math.abs(ex.getTime() - dTime) < 45 * 60 * 1000) return true;
      const sameLocal =
        ex.getFullYear() === d.getFullYear() &&
        ex.getMonth() === d.getMonth() &&
        ex.getDate() === d.getDate();
      const sameUtc =
        ex.getUTCFullYear() === d.getUTCFullYear() &&
        ex.getUTCMonth() === d.getUTCMonth() &&
        ex.getUTCDate() === d.getUTCDate();
      return sameLocal || sameUtc;
    });
  };

  if (freq === 'DAILY') {
    let curr = new Date(baseStart);
    while (curr <= maxLimitDate) {
      if (count !== null && generatedCount >= count) break;
      if (generatedCount >= 500) break;

      if (curr >= startHorizon && !isExdate(curr)) {
        const instEnd = new Date(curr.getTime() + durationMs);
        resultEvents.push(createEventObj(`${baseId}_rec_${curr.getTime()}`, curr, instEnd));
      }
      generatedCount++;
      curr.setDate(curr.getDate() + interval);
    }
  } else if (freq === 'WEEKLY') {
    if (byDays.length > 0) {
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
          candidate.setHours(
            baseStart.getHours(),
            baseStart.getMinutes(),
            baseStart.getSeconds(),
            baseStart.getMilliseconds()
          );

          const candidateDay = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
          if (candidateDay < baseStartDay) continue;

          if (candidate > maxLimitDate) break;
          if (count !== null && generatedCount >= count) break;

          if (candidate >= startHorizon && !isExdate(candidate)) {
            const instEnd = new Date(candidate.getTime() + durationMs);
            resultEvents.push(createEventObj(`${baseId}_rec_${candidate.getTime()}`, candidate, instEnd));
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
          resultEvents.push(createEventObj(`${baseId}_rec_${curr.getTime()}`, curr, instEnd));
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
        resultEvents.push(createEventObj(`${baseId}_rec_${curr.getTime()}`, curr, instEnd));
      }
      generatedCount++;
      curr.setMonth(curr.getMonth() + interval);
    }
  } else {
    resultEvents.push(createEventObj(baseId, baseStart, baseEnd));
  }

  return resultEvents;
}

// ─── Parse ICS Date ─────────────────────────────────────────

function parseIcsDate(dateStr: string, isDateOnly = false): Date | null {
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
    if (isDateOnly) {
      return new Date(year, month, day, 0, 0, 0);
    }
    return new Date(year, month, day, 9, 0, 0);
  }
  return null;
}

// ─── Unified Multi-Feed Sync ────────────────────────────────

export async function syncIcsCalendar(
  customUrl?: string,
  targetFeedId?: string
): Promise<{
  events: CalendarEvent[];
  remindersCreated: number;
  feedResults: Array<{ id: string; success: boolean; count: number; error?: string }>;
}> {
  let feeds = getCalendarFeeds();

  // If custom URL passed, update the target feed or deduce feed
  if (customUrl && customUrl.trim()) {
    const url = customUrl.trim();
    let feedId = targetFeedId;
    if (!feedId) {
      if (url.includes('google.com/calendar')) {
        feedId = 'google';
      } else {
        feedId = 'outlook';
      }
    }
    saveCalendarFeed({ id: feedId, url, enabled: true });
    feeds = getCalendarFeeds();
  }

  const allRawEvents: ParsedRawEvent[] = [];
  const allExpandedEvents: CalendarEvent[] = [];
  const feedResults: Array<{ id: string; success: boolean; count: number; error?: string }> = [];

  const activeFeeds = feeds.filter((f) => f.enabled && f.url && f.url.trim().length > 0);

  for (const feed of activeFeeds) {
    try {
      console.log(`[Calendar Sync] Sincronizando feed "${feed.name}" (${feed.url})`);
      const rawText = await fetchUrlText(feed.url);
      const rawEvents = parseRawIcsEvents(rawText, { id: feed.id, name: feed.name, color: feed.color });
      const expandedEvents = parseIcsContent(rawText, { id: feed.id, name: feed.name, color: feed.color });

      allRawEvents.push(...rawEvents);
      allExpandedEvents.push(...expandedEvents);

      saveCalendarFeed({
        id: feed.id,
        lastSynced: new Date().toISOString(),
        eventCount: expandedEvents.length,
      });

      feedResults.push({ id: feed.id, success: true, count: expandedEvents.length });
    } catch (err: any) {
      console.error(`[Calendar Sync Error] Feed ${feed.name}:`, err);
      feedResults.push({ id: feed.id, success: false, count: 0, error: err?.message || 'Erro ao sincronizar' });
    }
  }

  // Global deduplication and caching across active feeds
  const finalDedupMap = new Map<string, CalendarEvent>();
  const sourceEvents = allExpandedEvents.length > 0 ? allExpandedEvents : ((store.get('calendar_events_cache') as CalendarEvent[]) || []);

  for (const evt of sourceEvents) {
    const baseUid = evt.id.includes('_rec_') ? evt.id.split('_rec_')[0] : evt.id;
    const key = `${evt.calendarId || 'cal'}__${evt.start}__${evt.end}__${baseUid}`;
    const genericKey = `${evt.calendarId || 'cal'}__${evt.start}__${evt.end}`;

    if (finalDedupMap.has(key)) {
      finalDedupMap.set(key, evt);
    } else if (finalDedupMap.has(genericKey)) {
      const existing = finalDedupMap.get(genericKey)!;
      if (existing.id.includes('_rec_') && !evt.id.includes('_rec_')) {
        finalDedupMap.delete(genericKey);
        finalDedupMap.set(key, evt);
      } else {
        finalDedupMap.set(key, evt);
      }
    } else {
      finalDedupMap.set(key, evt);
    }
  }

  const effectiveEvents = Array.from(finalDedupMap.values());
  effectiveEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  store.set('calendar_events_cache', effectiveEvents);

  // ── Sync Reminders for All Calendars ──
  const now = new Date();
  const futureSeriesIds = new Set<string>();
  for (const rawEvt of allRawEvents) {
    if (!rawEvt.id) continue;
    const occurrences = effectiveEvents.filter(
      (e) => e.id === rawEvt.id || e.id.startsWith(`${rawEvt.id}_rec_`) || e.title === rawEvt.title
    );
    const hasFuture = occurrences.some((occ) => new Date(occ.end || occ.start) > now);
    if (hasFuture) {
      futureSeriesIds.add(rawEvt.id);
    }
  }

  // Purge obsolete meeting reminders
  try {
    const existingReminders = await dbGetReminders();
    for (const r of existingReminders) {
      const isMeetingReminder = Boolean(r.eventId) || r.title.startsWith('⏰ Reunião em 30 min:');
      const isCancelledTitle =
        r.title.toLowerCase().includes('cancelado') || r.title.toLowerCase().includes('canceled');
      if (isMeetingReminder) {
        let isPastMeeting = false;
        if (r.scheduledTime) {
          const schedTime = new Date(r.scheduledTime);
          if (!isNaN(schedTime.getTime()) && schedTime < now) {
            isPastMeeting = true;
          }
        }
        if (
          isCancelledTitle ||
          isPastMeeting ||
          !r.eventId ||
          !futureSeriesIds.has(r.eventId) ||
          r.id !== `rem_series_${r.eventId}`
        ) {
          console.log(`[Calendar Sync] Removendo lembrete de reunião obsoleta/passada: ${r.id} (${r.title})`);
          await dbDeleteReminder(r.id);
        }
      } else if (r.recurrence === 'ONCE' && r.scheduledTime) {
        const sched = new Date(r.scheduledTime);
        if (!isNaN(sched.getTime()) && sched < now) {
          await dbDeleteReminder(r.id);
        }
      }
    }
  } catch (err) {
    console.error('[Calendar Sync] Erro ao limpar lembretes:', err);
  }

  let remindersCreated = 0;
  try {
    const currentReminders = await dbGetReminders();
    for (const rawEvt of allRawEvents) {
      if (!rawEvt.id || !rawEvt.title) continue;
      if (!futureSeriesIds.has(rawEvt.id)) continue;

      const seriesId = rawEvt.id;
      const reminderId = `rem_series_${seriesId}`;
      const existingRem = currentReminders.find((r) => r.id === reminderId);

      const seriesOccurrences = effectiveEvents.filter(
        (e) => e.id === seriesId || e.id.startsWith(`${seriesId}_rec_`) || e.title === rawEvt.title
      );
      const nextOcc = seriesOccurrences.find((occ) => new Date(occ.end || occ.start) > now);
      const nextScheduledTime = nextOcc ? nextOcc.start : rawEvt.start ? rawEvt.start.toISOString() : '';

      const calendarTag = rawEvt.calendarName ? `[${rawEvt.calendarName}] ` : '';

      if (!existingRem) {
        await dbSaveReminder({
          id: reminderId,
          eventId: seriesId,
          title: `⏰ Reunião em 30 min: ${rawEvt.title}`,
          message: `${calendarTag}Sua reunião "${rawEvt.title}" começará em 30 minutos.`,
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
  } catch (err) {
    console.error('[Calendar Sync] Erro ao criar lembretes:', err);
  }

  return {
    events: effectiveEvents,
    remindersCreated,
    feedResults,
  };
}

export interface EventMetadata {
  linkedNoteIds?: string[];
  clientId?: string;
}

export function getEventMetadataMap(): Record<string, EventMetadata> {
  return (store.get('calendar_event_metadata_map') as Record<string, EventMetadata>) || {};
}

export function saveEventMetadata(eventId: string, meta: Partial<EventMetadata>): EventMetadata {
  const map = getEventMetadataMap();
  const current = map[eventId] || {};
  const updated: EventMetadata = {
    ...current,
    ...meta,
  };
  map[eventId] = updated;
  store.set('calendar_event_metadata_map', map);

  // Atualiza também no cache de eventos
  const cachedEvents = (store.get('calendar_events_cache') as CalendarEvent[]) || [];
  const updatedEvents = cachedEvents.map((evt) => {
    if (evt.id === eventId || evt.id.startsWith(`${eventId}_rec_`)) {
      return {
        ...evt,
        linkedNoteIds: updated.linkedNoteIds,
        clientId: updated.clientId !== undefined ? updated.clientId : evt.clientId,
      };
    }
    return evt;
  });
  store.set('calendar_events_cache', updatedEvents);

  return updated;
}

export function toggleLinkNoteToEvent(eventId: string, noteId: string): string[] {
  const map = getEventMetadataMap();
  const baseId = eventId.includes('_rec_') ? eventId.split('_rec_')[0] : eventId;
  const current = map[eventId] || map[baseId] || {};
  let linkedNoteIds = [...(current.linkedNoteIds || [])];

  if (linkedNoteIds.includes(noteId)) {
    linkedNoteIds = linkedNoteIds.filter((id) => id !== noteId);
  } else {
    linkedNoteIds.push(noteId);
  }

  saveEventMetadata(eventId, { linkedNoteIds });
  if (baseId !== eventId) {
    saveEventMetadata(baseId, { linkedNoteIds });
  }
  return linkedNoteIds;
}

export function getCachedEvents(): CalendarEvent[] {
  const events = (store.get('calendar_events_cache') as CalendarEvent[]) || [];
  const metaMap = getEventMetadataMap();
  return (Array.isArray(events) ? events : []).map((e) => {
    if (!e || typeof e !== 'object') return e;
    const eventId = e.id ? String(e.id) : '';
    const baseId = eventId.includes('_rec_') ? eventId.split('_rec_')[0] : eventId;
    const meta = (eventId && metaMap[eventId]) || (baseId && metaMap[baseId]);
    if (!meta) return e;
    return {
      ...e,
      linkedNoteIds: meta.linkedNoteIds || e.linkedNoteIds,
      clientId: meta.clientId !== undefined ? meta.clientId : e.clientId,
    };
  });
}

export function getCalendarUrl(): string {
  const feeds = getCalendarFeeds();
  const outlookFeed = feeds.find((f) => f.id === 'outlook');
  return (outlookFeed && outlookFeed.url) || (store.get('ics_calendar_url') as string) || DEFAULT_ICS_URL;
}

export function setCalendarUrl(url: string): boolean {
  saveCalendarFeed({ id: 'outlook', url, enabled: true });
  return true;
}
