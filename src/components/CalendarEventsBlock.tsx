import { Calendar, ExternalLink } from 'lucide-react';
import { CalendarEvent } from '../services/googleCalendar';

interface Props {
  events: CalendarEvent[];
  viewMode: 'list' | 'kanban';
}

const formatTimeRange = (e: CalendarEvent): string => {
  if (e.allDay) return 'Dia inteiro';
  const start = new Date(e.start);
  const end = new Date(e.end);
  const fmt = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${fmt(start)} – ${fmt(end)}`;
};

export default function CalendarEventsBlock({ events, viewMode }: Props) {
  if (events.length === 0) return null;

  if (viewMode === 'list') {
    return (
      <div className="flex flex-col gap-1 mb-1">
        {events.map(e => (
          <a
            key={e.id}
            href={e.htmlLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-2 py-1 rounded-md bg-sky-500/[0.04] border border-sky-500/10 hover:bg-sky-500/10 hover:border-sky-500/20 transition-all group/event"
          >
            <Calendar className="w-3 h-3 text-sky-400 flex-shrink-0" />
            <span className="text-[10px] font-mono text-sky-300/80 whitespace-nowrap">{formatTimeRange(e)}</span>
            <span className="text-[12px] text-slate-300 truncate flex-1">{e.summary}</span>
            <ExternalLink className="w-3 h-3 text-slate-600 opacity-0 group-hover/event:opacity-100" />
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 mb-2 pb-2 border-b border-white/5">
      <span className="text-[8px] uppercase tracking-widest font-bold text-sky-400/70 px-1">Eventos</span>
      {events.map(e => (
        <a
          key={e.id}
          href={e.htmlLink}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col gap-0.5 px-2 py-1.5 rounded-lg bg-sky-500/[0.04] border border-sky-500/10 hover:bg-sky-500/10 hover:border-sky-500/20 transition-all"
          style={{ borderLeft: '3px solid rgb(56 189 248 / 0.6)' }}
        >
          <span className="text-[9px] font-mono text-sky-300/80">{formatTimeRange(e)}</span>
          <span className="text-[11px] text-slate-200 leading-snug break-words">{e.summary}</span>
        </a>
      ))}
    </div>
  );
}
