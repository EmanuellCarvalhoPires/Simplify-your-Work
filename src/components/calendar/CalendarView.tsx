import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, RefreshCw, Bell, MapPin, Settings, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}

interface CalendarViewProps {
  onRefreshReminders?: () => void;
}

type ViewMode = 'day' | 'week' | 'month';

// ─── Helpers ────────────────────────────────────────────────
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const WEEKDAYS_FULL  = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

function sameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function startOfWeek(d: Date): Date {
  const s = new Date(d); s.setDate(s.getDate() - s.getDay()); s.setHours(0,0,0,0); return s;
}

function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); } catch { return '--:--'; }
}

function fmtDateShort(d: Date) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

function getDuration(s: string, e: string) {
  try { const m = Math.round((new Date(e).getTime()-new Date(s).getTime())/60000); return m > 0 ? `${m}min` : ''; } catch { return ''; }
}

// ─── Component ──────────────────────────────────────────────
export const CalendarView: React.FC<CalendarViewProps> = ({ onRefreshReminders }) => {
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [calendarUrl, setCalendarUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  // ── Init ──
  useEffect(() => { initCalendar(); }, []);

  const initCalendar = async () => {
    setLoading(true); setErrorMsg('');
    try {
      const api = (window as any).electronAPI;
      if (!api) { setErrorMsg('ElectronAPI não disponível.'); setLoading(false); return; }

      if (api.getCalendarUrl) {
        try { const url = await api.getCalendarUrl(); if (url) { setCalendarUrl(url); setUrlInput(url); } } catch {}
      }
      if (api.getCalendarEvents) {
        try { const c = await api.getCalendarEvents(); if (Array.isArray(c)) setAllEvents(c); } catch {}
      }
      if (api.syncCalendar) {
        try {
          const res = await api.syncCalendar();
          if (res && Array.isArray(res.events)) {
            setAllEvents(res.events);
            setSyncMsg(`Sincronizado! ${res.events.length} eventos encontrados.`);
            if (onRefreshReminders) onRefreshReminders();
          }
        } catch {}
      }
    } catch (err: any) { setErrorMsg(err?.message || 'Erro.'); }
    finally { setLoading(false); }
  };

  const handleSync = async () => {
    setLoading(true); setSyncMsg(''); setErrorMsg('');
    try {
      const api = (window as any).electronAPI;
      if (!api?.syncCalendar) { setErrorMsg('API indisponível.'); setLoading(false); return; }
      const res = await api.syncCalendar(calendarUrl || undefined);
      if (res && Array.isArray(res.events)) {
        setAllEvents(res.events);
        setSyncMsg(`Sincronizado! ${res.events.length} eventos, ${res.remindersCreated||0} lembretes criados.`);
        if (onRefreshReminders) onRefreshReminders();
      }
    } catch (err: any) { setErrorMsg('Erro: '+(err?.message||'desconhecido')); }
    finally { setLoading(false); setTimeout(()=>setSyncMsg(''),6000); }
  };

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault(); if (!urlInput.trim()) return;
    try {
      const api = (window as any).electronAPI;
      if (api?.setCalendarUrl) { await api.setCalendarUrl(urlInput.trim()); setCalendarUrl(urlInput.trim()); setShowSettings(false); handleSync(); }
    } catch (err: any) { setErrorMsg('Erro ao salvar: '+(err?.message||'')); }
  };

  // ── Filter: last 6 months → next 6 months ──
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    const sixMonthsAhead = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
    return (Array.isArray(allEvents) ? allEvents : [])
      .filter(e => {
        if (!e || !e.start || !e.title) return false;
        try {
          const d = new Date(e.start);
          return !isNaN(d.getTime()) && d >= sixMonthsAgo && d <= sixMonthsAhead;
        } catch { return false; }
      })
      .sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [allEvents]);

  // ── Navigation ──
  const navigate = (dir: -1|1) => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + dir);
    else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  // ── Navigation label ──
  const navLabel = useMemo(() => {
    if (viewMode === 'day') {
      return `${WEEKDAYS_FULL[currentDate.getDay()]}, ${currentDate.getDate()} de ${MONTHS_PT[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
    } else if (viewMode === 'week') {
      const ws = startOfWeek(currentDate);
      const we = new Date(ws); we.setDate(we.getDate()+6);
      return `${fmtDateShort(ws)} – ${fmtDateShort(we)} ${MONTHS_PT[ws.getMonth()]} ${ws.getFullYear()}`;
    } else {
      return `${MONTHS_PT[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  }, [viewMode, currentDate]);

  // ── Events for current view ──
  const viewEvents = useMemo(() => {
    if (viewMode === 'day') {
      return filteredEvents.filter(e => { try { return sameDay(new Date(e.start), currentDate); } catch { return false; } });
    } else if (viewMode === 'week') {
      const ws = startOfWeek(currentDate);
      const we = new Date(ws); we.setDate(we.getDate()+7);
      return filteredEvents.filter(e => { try { const d = new Date(e.start); return d >= ws && d < we; } catch { return false; } });
    } else {
      const ms = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const me = new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 0, 23,59,59);
      return filteredEvents.filter(e => { try { const d = new Date(e.start); return d >= ms && d <= me; } catch { return false; } });
    }
  }, [filteredEvents, viewMode, currentDate]);

  const today = new Date();
  const isToday = (d: Date) => sameDay(d, today);

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, height:'100%', backgroundColor:'var(--bg-main)', padding:'24px 28px', overflowY:'auto', gap:'16px' }}>
      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
          <div style={{ width:'44px',height:'44px',borderRadius:'12px', backgroundColor:'var(--accent-primary)', display:'flex',alignItems:'center',justifyContent:'center', boxShadow:'0 4px 16px rgba(99,102,241,0.35)' }}>
            <CalendarIcon size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize:'20px', fontWeight:800, color:'#fff', margin:0 }}>Agenda Microsoft Outlook</h1>
            <p style={{ fontSize:'12px', color:'var(--text-secondary)', margin:'2px 0 0 0' }}>
              {filteredEvents.length} eventos (últimos 6 meses – próximos 6 meses)
            </p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <button className="btn btn-secondary" onClick={()=>setShowSettings(!showSettings)} style={{ padding:'7px 12px', fontSize:'12px', gap:'5px' }}>
            <Settings size={14}/> Feed ICS
          </button>
          <button className="btn btn-primary" onClick={handleSync} disabled={loading} style={{ padding:'7px 14px', fontSize:'12px', gap:'5px' }}>
            <RefreshCw size={14} className={loading?'spin-anim':''}/> Sincronizar
          </button>
        </div>
      </div>

      {/* Messages */}
      {syncMsg && <div style={{ display:'flex',alignItems:'center',gap:'8px',padding:'10px 16px', backgroundColor:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.25)', borderRadius:'10px',color:'#10b981',fontSize:'13px',fontWeight:600 }}><CheckCircle2 size={15}/>{syncMsg}</div>}
      {errorMsg && <div style={{ display:'flex',alignItems:'center',gap:'8px',padding:'10px 16px', backgroundColor:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)', borderRadius:'10px',color:'#f87171',fontSize:'13px',fontWeight:600 }}><AlertCircle size={15}/>{errorMsg}</div>}

      {/* Settings */}
      {showSettings && (
        <div style={{ padding:'16px 20px', backgroundColor:'var(--bg-card-app)', borderRadius:'12px', border:'1px solid var(--border-subtle)' }}>
          <form onSubmit={handleSaveUrl} style={{ display:'flex', gap:'10px', alignItems:'center' }}>
            <input type="text" className="input-field" value={urlInput} onChange={e=>setUrlInput(e.target.value)} placeholder="https://outlook.office365.com/.../calendar.html" style={{ flex:1 }}/>
            <button type="submit" className="btn btn-primary" style={{ whiteSpace:'nowrap', fontSize:'13px' }}>Salvar e Sincronizar</button>
          </form>
        </div>
      )}

      {/* ── View Controls ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
        {/* Mode Switcher */}
        <div style={{ display:'flex', borderRadius:'10px', overflow:'hidden', border:'1px solid var(--border-subtle)' }}>
          {(['day','week','month'] as ViewMode[]).map(m => (
            <button key={m} onClick={()=>setViewMode(m)} style={{
              padding:'8px 18px', fontSize:'13px', fontWeight:700, cursor:'pointer', border:'none',
              backgroundColor: viewMode===m ? 'var(--accent-primary)' : 'var(--bg-card-app)',
              color: viewMode===m ? '#fff' : 'var(--text-secondary)',
              transition:'all .15s ease',
            }}>
              {m==='day'?'Dia':m==='week'?'Semana':'Mês'}
            </button>
          ))}
        </div>

        {/* Date Navigation */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <button onClick={()=>navigate(-1)} style={navBtnStyle}><ChevronLeft size={18}/></button>
          <button onClick={goToday} style={{ ...navBtnStyle, padding:'6px 14px', fontSize:'12px', fontWeight:700 }}>Hoje</button>
          <button onClick={()=>navigate(1)} style={navBtnStyle}><ChevronRight size={18}/></button>
          <span style={{ fontSize:'15px', fontWeight:700, color:'#fff', marginLeft:'8px', whiteSpace:'nowrap' }}>{navLabel}</span>
        </div>
      </div>

      {/* ── View Content ── */}
      {viewMode === 'day' && <DayView events={viewEvents} date={currentDate} />}
      {viewMode === 'week' && <WeekView events={viewEvents} currentDate={currentDate} onSelectDay={(d)=>{setCurrentDate(d);setViewMode('day');}} />}
      {viewMode === 'month' && <MonthView events={viewEvents} currentDate={currentDate} allFiltered={filteredEvents} onSelectDay={(d)=>{setCurrentDate(d);setViewMode('day');}} />}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  TIMELINE GRID VIEW (Used by WeekView & DayView)
// ═══════════════════════════════════════════════════════════
const HOUR_HEIGHT = 60; // 60px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const TimelineView: React.FC<{
  days: Date[];
  events: CalendarEvent[];
  onSelectDay: (d: Date) => void;
}> = ({ days, events, onSelectDay }) => {
  const [now, setNow] = useState(new Date());
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll to current hour or ~8 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      const scrollHour = Math.max(0, now.getHours() - 1);
      scrollRef.current.scrollTop = scrollHour * HOUR_HEIGHT;
    }
  }, []);

  const isCurrentWeek = days.some(d => sameDay(d, now));
  const todayIndex = days.findIndex(d => sameDay(d, now));
  const currentHourFloat = now.getHours() + now.getMinutes() / 60;
  const nowTopPx = currentHourFloat * HOUR_HEIGHT;
  const numColumns = days.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', borderRadius: '12px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-card-app)', overflow: 'hidden' }}>
      
      {/* ── Sticky Header: Weekdays ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
        {/* Hours Column Header Space */}
        <div style={{ width: '55px', flexShrink: 0, borderRight: '1px solid var(--border-subtle)', padding: '12px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }} />

        {/* Days Header Columns */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))` }}>
          {days.map((day, di) => {
            const isTdy = sameDay(day, now);
            return (
              <div
                key={di}
                onClick={() => onSelectDay(day)}
                style={{
                  padding: '10px 6px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderRight: di < numColumns - 1 ? '1px solid var(--border-subtle)' : 'none',
                  backgroundColor: isTdy ? 'rgba(99,102,241,0.08)' : 'transparent',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: isTdy ? 'var(--accent-primary)' : 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {WEEKDAYS_FULL[day.getDay()]}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px' }}>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: isTdy ? '#fff' : 'var(--text-main)',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isTdy ? 'var(--accent-primary)' : 'transparent',
                  }}>
                    {day.getDate()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable Timeline Grid Container ── */}
      <div ref={scrollRef} style={{ height: '620px', overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
        <div style={{ display: 'flex', position: 'relative', height: `${24 * HOUR_HEIGHT}px` }}>

          {/* ── Left Column: Hours Labels ── */}
          <div style={{ width: '55px', flexShrink: 0, position: 'relative', borderRight: '1px solid var(--border-subtle)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
            {HOURS.map(h => (
              <div
                key={h}
                style={{
                  position: 'absolute',
                  top: `${h * HOUR_HEIGHT - 8}px`,
                  right: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  userSelect: 'none',
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* ── Timeline Grid (Columns + Events + Gridlines) ── */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))`, position: 'relative', height: '100%' }}>
            
            {/* Horizontal Gridlines (Hour & Half-Hour) */}
            {HOURS.map(h => (
              <React.Fragment key={h}>
                {/* Full Hour Solid Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: `${h * HOUR_HEIGHT}px`,
                    left: 0,
                    right: 0,
                    height: '1px',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    pointerEvents: 'none',
                  }}
                />
                {/* Half-Hour Dashed Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: `${h * HOUR_HEIGHT + 30}px`,
                    left: 0,
                    right: 0,
                    height: '1px',
                    borderTop: '1px dashed rgba(255,255,255,0.035)',
                    pointerEvents: 'none',
                  }}
                />
              </React.Fragment>
            ))}

            {/* Current Time Horizontal Line Across Grid */}
            {isCurrentWeek && (
              <div
                style={{
                  position: 'absolute',
                  top: `${nowTopPx}px`,
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {/* Bullet circle indicator at today column */}
                <div
                  style={{
                    position: 'absolute',
                    left: todayIndex !== -1 ? `calc(${(todayIndex / numColumns) * 100}% - 5px)` : '-5px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#818cf8',
                    boxShadow: '0 0 8px #818cf8, 0 0 14px #818cf8',
                    zIndex: 21,
                  }}
                />
                {/* Line cutting across */}
                <div
                  style={{
                    width: '100%',
                    height: '2px',
                    backgroundColor: '#818cf8',
                    boxShadow: '0 0 8px rgba(129, 140, 248, 0.8)',
                  }}
                />
              </div>
            )}

            {/* ── Day Columns ── */}
            {days.map((day, di) => {
              const dayEvts = events.filter(e => { try { return sameDay(new Date(e.start), day); } catch { return false; } });
              const isTdy = sameDay(day, now);

              return (
                <div
                  key={di}
                  style={{
                    position: 'relative',
                    height: '100%',
                    borderRight: di < numColumns - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    backgroundColor: isTdy ? 'rgba(99,102,241,0.03)' : 'transparent',
                    minWidth: 0,
                  }}
                >
                  {/* Positioned Events in Timeline Slots */}
                  {dayEvts.map((evt, i) => {
                    const startDate = new Date(evt.start);
                    const endDate = new Date(evt.end);
                    const startH = startDate.getHours() + startDate.getMinutes() / 60;
                    const endH = endDate.getHours() + endDate.getMinutes() / 60;
                    const durH = Math.max(endH - startH, 0.4); // Min duration ~24 mins height

                    const topPx = startH * HOUR_HEIGHT;
                    const heightPx = durH * HOUR_HEIGHT;

                    const isOngoing = (() => {
                      try {
                        const n = now.getTime();
                        return isTdy && n >= startDate.getTime() && n <= endDate.getTime();
                      } catch { return false; }
                    })();

                    // Color palette for cards
                    const isGreen = evt.title.toLowerCase().includes('daily') || evt.title.toLowerCase().includes('workshop') || evt.title.toLowerCase().includes('phishing');
                    const bgColor = isOngoing
                      ? 'rgba(239, 68, 68, 0.25)'
                      : (isGreen ? 'rgba(16, 185, 129, 0.22)' : 'rgba(99, 102, 241, 0.22)');
                    const borderLeftColor = isOngoing
                      ? '#ef4444'
                      : (isGreen ? '#10b981' : '#6366f1');

                    return (
                      <div
                        key={`${evt.id}-${i}`}
                        title={`${fmtTime(evt.start)} - ${fmtTime(evt.end)}: ${evt.title}${evt.location ? ` • ${evt.location}` : ''}`}
                        style={{
                          position: 'absolute',
                          top: `${topPx}px`,
                          height: `${Math.max(heightPx - 2, 24)}px`,
                          left: '3px',
                          right: '3px',
                          backgroundColor: bgColor,
                          borderLeft: `4px solid ${borderLeftColor}`,
                          borderRadius: '6px',
                          padding: '4px 8px',
                          overflow: 'hidden',
                          boxSizing: 'border-box',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#ffffff',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                          transition: 'transform 0.1s ease',
                          zIndex: 5,
                        }}
                      >
                        <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px', color: '#fff' }}>
                          {evt.title}
                        </div>
                        {heightPx >= 36 && (
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                            {fmtTime(evt.start)} - {fmtTime(evt.end)} {evt.location ? `• ${evt.location}` : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  DAY VIEW
// ═══════════════════════════════════════════════════════════
const DayView: React.FC<{events: CalendarEvent[]; date: Date}> = ({events, date}) => {
  return <TimelineView days={[date]} events={events} onSelectDay={() => {}} />;
};

// ═══════════════════════════════════════════════════════════
//  WEEK VIEW
// ═══════════════════════════════════════════════════════════
const WeekView: React.FC<{events: CalendarEvent[]; currentDate: Date; onSelectDay:(d:Date)=>void}> = ({events, currentDate, onSelectDay}) => {
  const ws = startOfWeek(currentDate);
  const days = Array.from({length:7},(_,i)=>{ const d=new Date(ws); d.setDate(d.getDate()+i); return d; });

  return <TimelineView days={days} events={events} onSelectDay={onSelectDay} />;
};


// ═══════════════════════════════════════════════════════════
//  MONTH VIEW
// ═══════════════════════════════════════════════════════════
const MonthView: React.FC<{events: CalendarEvent[]; currentDate: Date; allFiltered: CalendarEvent[]; onSelectDay:(d:Date)=>void}> = ({currentDate, allFiltered, onSelectDay}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month+1, 0);
  const startPad = firstDay.getDay(); // 0=Sun
  const totalDays = lastDay.getDate();
  const today = new Date();

  const cells: (Date|null)[] = [];
  for (let i=0;i<startPad;i++) cells.push(null);
  for (let d=1;d<=totalDays;d++) cells.push(new Date(year,month,d));
  while (cells.length%7!==0) cells.push(null);

  const eventsForDay = (day: Date) =>
    allFiltered.filter(e=>{ try{return sameDay(new Date(e.start),day);}catch{return false;} });

  return (
    <div style={{ width:'100%' }}>
      {/* Weekday headers with equal widths */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, minmax(0, 1fr))', gap:'4px', marginBottom:'4px', width:'100%' }}>
        {WEEKDAYS_SHORT.map(w=>(
          <div key={w} style={{ textAlign:'center',fontSize:'11px',fontWeight:700,color:'var(--text-muted)',padding:'6px 0',textTransform:'uppercase' }}>{w}</div>
        ))}
      </div>
      {/* Day cells with equal widths */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, minmax(0, 1fr))', gap:'4px', width:'100%' }}>
        {cells.map((day,i) => {
          if (!day) return <div key={`empty-${i}`} style={{ minHeight:'80px', backgroundColor:'rgba(255,255,255,0.02)', borderRadius:'8px' }}/>;
          const isTdy = sameDay(day,today);
          const dayEvts = eventsForDay(day);
          return (
            <div key={i} onClick={()=>onSelectDay(day)} style={{
              minHeight:'80px', padding:'6px', cursor:'pointer', borderRadius:'8px',
              backgroundColor: isTdy ? 'rgba(99,102,241,0.1)' : 'var(--bg-card-app)',
              border: isTdy ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
              display:'flex', flexDirection:'column', gap:'2px', transition:'all .12s ease',
              minWidth:0, overflow:'hidden'
            }}>
              <span style={{
                fontSize:'13px', fontWeight: isTdy?800:600,
                color: isTdy?'var(--accent-primary)':'var(--text-secondary)',
                textAlign:'right',
              }}>{day.getDate()}</span>
              {dayEvts.slice(0,3).map((evt,j) => (
                <div key={`${evt.id}-${j}`} title={`${fmtTime(evt.start)} - ${evt.title}`} style={{
                  fontSize:'10px', fontWeight:600, color:'#fff',
                  backgroundColor:'var(--accent-primary)', borderRadius:'4px',
                  padding:'1px 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  width:'100%', boxSizing:'border-box', minWidth:0
                }}>
                  {fmtTime(evt.start)} {evt.title}
                </div>
              ))}
              {dayEvts.length>3 && <span style={{ fontSize:'9px',color:'var(--text-muted)',textAlign:'center',fontWeight:700 }}>+{dayEvts.length-3}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  EVENT CARD (used in Day view)
// ═══════════════════════════════════════════════════════════
const EventCard: React.FC<{evt: CalendarEvent; isToday: boolean; now?: Date}> = ({evt, isToday, now = new Date()}) => {
  const dur = getDuration(evt.start, evt.end);
  const isOngoing = (() => {
    try {
      const s = new Date(evt.start).getTime();
      const e = new Date(evt.end).getTime();
      const n = now.getTime();
      return isToday && n >= s && n <= e;
    } catch { return false; }
  })();

  return (
    <div style={{
      display:'flex', gap:'16px', padding:'14px 18px',
      backgroundColor: isOngoing ? 'rgba(239,68,68,0.08)' : (isToday ? 'rgba(99,102,241,0.08)' : 'var(--bg-card-app)'),
      borderRadius:'12px',
      border: isOngoing ? '1px solid #ef4444' : (isToday ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)'),
    }}>
      <div style={{ display:'flex',flexDirection:'column',width:'80px',flexShrink:0 }}>
        <span style={{ fontSize:'15px',fontWeight:800,color:'#fff' }}>{fmtTime(evt.start)}</span>
        <span style={{ fontSize:'11px',color:'var(--text-muted)',marginTop:'2px' }}>até {fmtTime(evt.end)}</span>
        {dur && <span style={{ fontSize:'10px',fontWeight:700,color:'var(--accent-primary)', backgroundColor:'rgba(99,102,241,0.15)',padding:'2px 6px',borderRadius:'5px',marginTop:'6px',display:'inline-block' }}>{dur}</span>}
      </div>
      <div style={{ flex:1,overflow:'hidden' }}>
        <div style={{ display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap' }}>
          <span style={{ fontSize:'14px',fontWeight:700,color:'#fff', wordBreak:'break-word' }}>{evt.title}</span>
          {isOngoing && <span style={{ fontSize:'10px',fontWeight:700,color:'#fff',backgroundColor:'#ef4444',padding:'1px 7px',borderRadius:'5px' }}>Em Andamento</span>}
          {isToday && !isOngoing && <span style={{ fontSize:'10px',fontWeight:700,color:'#fff',backgroundColor:'#10b981',padding:'1px 7px',borderRadius:'5px' }}>Hoje</span>}
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:'12px',marginTop:'5px',flexWrap:'wrap' }}>
          {evt.location && <span style={{ display:'flex',alignItems:'center',gap:'3px',fontSize:'11px',color:'#3b82f6' }}><MapPin size={11}/>{evt.location.length>35?evt.location.substring(0,35)+'...':evt.location}</span>}
          <span style={{ display:'flex',alignItems:'center',gap:'3px',fontSize:'11px',fontWeight:600,color:'#f59e0b' }}><Bell size={11}/>Lembrete 30 min</span>
        </div>
        {evt.description && <p style={{ fontSize:'12px',color:'var(--text-muted)',margin:'6px 0 0 0', wordBreak:'break-word' }}>{evt.description.length>100?evt.description.substring(0,100)+'...':evt.description}</p>}
      </div>
    </div>
  );
};

const navBtnStyle: React.CSSProperties = {
  padding:'6px 8px', borderRadius:'8px', border:'1px solid var(--border-subtle)',
  backgroundColor:'var(--bg-card-app)', color:'var(--text-secondary)',
  cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center',
  transition:'all .12s ease',
};

