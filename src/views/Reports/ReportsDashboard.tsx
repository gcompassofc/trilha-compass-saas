// Relatórios — dashboard de métricas das tarefas.
// Portado do protótipo (dashboard.html) para dados reais do Firestore.
// Dois layouts (Painel / Operacional), seletor de período com calendário,
// e KPIs com tendência vs. o período anterior comparável.

import { useState, useMemo, useRef, useEffect, ReactNode, CSSProperties } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Target,
  Users,
  BarChart3,
  Trophy,
  Clock,
  PieChart as PieIcon,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  TrendingUp,
  LayoutGrid,
  Layers,
} from 'lucide-react';
import { Client, TeamMember, WeeklyTask } from '../../types';
import { fmtMinutes } from '../SprintPlanner/utils';
import { getWeekId } from '../../utils/dateUtils';
import {
  buildWeeks,
  aggregateWeeks,
  buildRanking,
  buildClientLoad,
  buildOverdueList,
  fmtDay,
  WeekBucket,
  TypeLabel,
} from './analytics';
import './reports.css';

interface ReportsDashboardProps {
  clients: Client[];
  teamMembers: TeamMember[];
  incompleteTasks: WeeklyTask[];
  completedTasks: WeeklyTask[];
}

const MONTHS_FULL = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const WEEKDAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

const TYPE_META: Record<TypeLabel, { color: string; label: string }> = {
  Pontual: { color: '#818cf8', label: 'Pontual' },
  Recorrente: { color: '#34d399', label: 'Recorrente' },
  Urgente: { color: '#fb7185', label: 'Urgente' },
};

// Paleta estável para cor de cada membro (o cliente já traz sua própria cor).
const PERSON_PALETTE = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#f472b6', '#22d3ee', '#facc15'];
function personColor(team: TeamMember[], id: string): string {
  const idx = team.findIndex(m => m.id === id);
  return PERSON_PALETTE[(idx < 0 ? 0 : idx) % PERSON_PALETTE.length];
}
function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
}

// ── Date helpers (locais, sem libs) ─────────────────────────────────────────
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameDay(a: Date | null, b: Date | null): boolean {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function dayInRange(d: Date | null, start: Date | null, end: Date | null): boolean {
  if (!d || !start) return false;
  const t = d.getTime();
  if (!end) return sameDay(d, start);
  return t >= start.getTime() && t <= end.getTime();
}
function monthMatrix(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface Range { start: Date; end: Date; }

// ── Period picker (presets + calendar range) ────────────────────────────────
function PeriodPicker({
  range, presetKey, today, curStart, onChange,
}: {
  range: Range;
  presetKey: string | null;
  today: Date;
  curStart: Date;
  onChange: (r: Range, key: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => ({ year: range.end.getFullYear(), month: range.end.getMonth() }));
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const presets = [
    { key: '1w', label: 'Esta semana', weeks: 1 },
    { key: '1m', label: '1 mês', weeks: 4 },
    { key: '2m', label: '2 meses', weeks: 8 },
    { key: '3m', label: '3 meses', weeks: 12 },
  ];

  const applyPreset = (p: { key: string; weeks: number }) => {
    const end = addDays(curStart, 6);
    const start = addDays(curStart, -(p.weeks - 1) * 7);
    onChange({ start, end }, p.key);
    setDraftStart(null);
    setOpen(false);
  };

  const onDayClick = (d: Date | null) => {
    if (!d) return;
    if (!draftStart) { setDraftStart(d); onChange({ start: d, end: d }, null); return; }
    if (d.getTime() < draftStart.getTime()) { setDraftStart(d); onChange({ start: d, end: d }, null); return; }
    onChange({ start: draftStart, end: d }, null);
    setDraftStart(null);
    setOpen(false);
  };

  const cells = monthMatrix(view.year, view.month);
  const shiftMonth = (n: number) => setView((v) => {
    let m = v.month + n, y = v.year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    return { year: y, month: m };
  });

  const label = presetKey
    ? presets.find((p) => p.key === presetKey)?.label
    : `${fmtDay(range.start)} – ${fmtDay(range.end)}`;
  const effStart = draftStart || range.start;
  const effEnd = draftStart ? null : range.end;

  return (
    <div className="period" ref={ref}>
      <button className="period__btn" data-open={open ? 'true' : 'false'} onClick={() => setOpen((v) => !v)}>
        <Calendar size={16} />
        <span className="period__label">{label}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="period__pop">
          <div className="period__presets">
            {presets.map((p) => (
              <button key={p.key} className="period__chip" data-active={presetKey === p.key}
                      onClick={() => applyPreset(p)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="period__cal">
            <div className="period__cal-head">
              <button onClick={() => shiftMonth(-1)} title="Mês anterior"><ChevronLeft size={16} /></button>
              <span>{MONTHS_FULL[view.month]} {view.year}</span>
              <button onClick={() => shiftMonth(1)} title="Próximo mês"><ChevronRight size={16} /></button>
            </div>
            <div className="period__weekdays">
              {WEEKDAYS.map((w, i) => <span key={i}>{w}</span>)}
            </div>
            <div className="period__grid">
              {cells.map((d, i) => {
                if (!d) return <span key={i} className="period__day period__day--empty" />;
                const inR = dayInRange(d, effStart, effEnd);
                const isStart = sameDay(d, effStart);
                const isEnd = effEnd && sameDay(d, effEnd);
                const isToday = sameDay(d, today);
                return (
                  <button key={i} className="period__day"
                          data-inrange={inR ? 'true' : 'false'}
                          data-edge={isStart || isEnd ? 'true' : 'false'}
                          data-today={isToday ? 'true' : 'false'}
                          onClick={() => onDayClick(d)}>
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="period__hint">Clique no início e no fim para um intervalo personalizado.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────
type KpiDef = {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  sub?: string;
  tone?: 'accent' | 'danger';
  trend?: number | null;
  bar?: number | null;
};
function Kpi({ icon, value, label, sub, tone, trend, bar }: KpiDef) {
  return (
    <div className={'kpi glass' + (tone ? ' kpi--' + tone : '')}>
      <div className="kpi__top">
        <span className="kpi__icon">{icon}</span>
        {trend != null && (
          <span className="kpi__trend" data-dir={trend >= 0 ? 'up' : 'down'}>
            <TrendingUp size={13} />
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="kpi__value">{value}</div>
      <div className="kpi__label">{label}</div>
      {sub && <div className="kpi__sub">{sub}</div>}
      {bar != null && (
        <div className="kpi__bar"><span style={{ width: `${bar}%` }} /></div>
      )}
    </div>
  );
}

// ── Weekly work chart ────────────────────────────────────────────────────────
function WeeklyChart({ weeks }: { weeks: WeekBucket[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.total));
  const compact = weeks.length > 8;
  return (
    <div className="wchart">
      <div className="wchart__bars" style={{ '--cols': weeks.length } as CSSProperties}>
        {weeks.map((w, idx) => {
          const h = (w.total / max) * 100;
          const fill = w.total ? (w.completed / w.total) * 100 : 0;
          return (
            <div key={w.key} className="wbar-wrap">
              <div className="wbar" style={{ height: `${h}%` }}>
                <div className="wbar__fill" style={{ height: `${fill}%` }} />
                {w.overdue > 0 && <span className="wbar__od" title={`${w.overdue} atrasadas`} />}
                <div className="wbar__tip">
                  <strong>{w.rangeLabel}</strong>
                  <span>{w.completed}/{w.total} concluídas</span>
                  {w.overdue > 0 && <span className="wbar__tip-od">{w.overdue} atrasadas</span>}
                </div>
              </div>
              {(!compact || idx % 2 === 0) && (
                <span className="wbar__lbl">{w.label}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Ranking ───────────────────────────────────────────────────────────────────
function RankingSimple({ rows, team }: { rows: { member: TeamMember; count: number }[]; team: TeamMember[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (rows.length === 0) return <div className="empty-mini">Sem responsáveis com tarefas no período.</div>;
  return (
    <div className="rank-list">
      {rows.map((row, i) => (
        <div key={row.member.id} className="rrow" data-pos={i + 1}>
          <span className="rrow__pos">{i === 0 && row.count > 0 ? <Crown size={16} /> : i + 1}</span>
          <span className="rrow__avatar">
            {row.member.photoUrl ? <img src={row.member.photoUrl} alt="" /> : initials(row.member.name)}
          </span>
          <div className="rrow__main">
            <div className="rrow__name">{row.member.name}</div>
            <div className="rrow__bar">
              <span style={{ width: `${(row.count / max) * 100}%`, background: personColor(team, row.member.id) }} />
            </div>
          </div>
          <span className="rrow__count">{row.count}<em>tarefas</em></span>
        </div>
      ))}
    </div>
  );
}

// ── Carga por cliente ──────────────────────────────────────────────────────────
function ClientLoad({ rows }: { rows: { client: Client; minutes: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.minutes));
  if (rows.length === 0) return <div className="empty-mini">Sem tempo estimado por cliente no período.</div>;
  return (
    <div className="cload">
      {rows.map((row) => (
        <div key={row.client.id} className="cload__row">
          <div className="cload__head">
            <span className="cload__dot" style={{ background: row.client.color }} />
            <span className="cload__name">{row.client.name}</span>
            <span className="cload__val">{fmtMinutes(row.minutes)}</span>
          </div>
          <div className="cload__track">
            <span style={{ width: `${(row.minutes / max) * 100}%`, background: row.client.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Distribuição por tipo (donut) ───────────────────────────────────────────────
function TypeBreakdown({ byType }: { byType: Record<TypeLabel, number> }) {
  const segs = (Object.keys(TYPE_META) as TypeLabel[]).map((k) => ({ key: k, value: byType[k] || 0, ...TYPE_META[k] }));
  const total = segs.reduce((a, s) => a + s.value, 0) || 1;
  let acc = 0;
  const stops = segs.map((s) => {
    const from = (acc / total) * 360;
    acc += s.value;
    const to = (acc / total) * 360;
    return `${s.color} ${from}deg ${to}deg`;
  }).join(', ');
  return (
    <div className="tbreak">
      <div className="tbreak__donut" style={{ background: `conic-gradient(${stops})` }}>
        <div className="tbreak__hole">
          <span className="tbreak__total">{segs.reduce((a, s) => a + s.value, 0)}</span>
          <span className="tbreak__total-lbl">tarefas</span>
        </div>
      </div>
      <div className="tbreak__legend">
        {segs.map((s) => (
          <div key={s.key} className="tbreak__item">
            <span className="tbreak__chip" style={{ background: s.color }} />
            <span className="tbreak__lbl">{s.label}</span>
            <span className="tbreak__pct">{Math.round((s.value / total) * 100)}%</span>
            <span className="tbreak__n">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Lista de atrasadas ───────────────────────────────────────────────────────
function OverdueList({
  items, clients, team,
}: {
  items: ReturnType<typeof buildOverdueList>;
  clients: Client[];
  team: TeamMember[];
}) {
  if (!items.length) {
    return <div className="empty-mini"><CheckCircle2 size={20} /> Nenhuma tarefa atrasada no período 🎉</div>;
  }
  return (
    <div className="odlist">
      {items.map((it) => {
        const client = clients.find((c) => c.id === it.clientId);
        const person = team.find((p) => p.id === it.personId);
        return (
          <div key={it.id} className="odrow">
            <span className="odrow__late" data-sev={it.daysLate >= 5 ? 'high' : 'mid'}>
              {it.daysLate}d
            </span>
            <div className="odrow__main">
              <div className="odrow__title">{it.title}</div>
              <div className="odrow__meta">
                {client && <><span className="odrow__dot" style={{ background: client.color }} />{client.name}</>}
                {client && <span className="odrow__sep">·</span>}
                vencia {it.dueLabel}
              </div>
            </div>
            {person && (
              <span className="odrow__avatar" title={person.name}>
                {person.photoUrl ? <img src={person.photoUrl} alt="" /> : initials(person.name)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Card shell com título
function Panel({
  title, icon, action, children, className,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={'panel glass' + (className ? ' ' + className : '')}>
      <header className="panel__head">
        <h3>{icon && <span className="panel__icon">{icon}</span>}{title}</h3>
        {action}
      </header>
      <div className="panel__body">{children}</div>
    </section>
  );
}

function LegendInline() {
  return (
    <div className="legend-inline">
      <span><span className="legend-inline__dot legend-inline__dot--fill" /> Concluídas</span>
      <span><span className="legend-inline__dot legend-inline__dot--pend" /> Pendentes</span>
    </div>
  );
}

// ── Dashboard ───────────────────────────────────────────────────────────────
export default function ReportsDashboard({
  clients, teamMembers, incompleteTasks, completedTasks,
}: ReportsDashboardProps) {
  const today = useMemo(() => new Date(), []);
  const curStart = useMemo(() => startOfWeek(today), [today]);
  const currentWeekId = useMemo(() => getWeekId(today), [today]);
  // Corte do histórico: 12 semanas atrás (cobre o maior preset, "3 meses").
  const sinceWeekId = useMemo(() => getWeekId(addDays(curStart, -11 * 7)), [curStart]);

  const [range, setRange] = useState<Range>(() => ({
    start: addDays(curStart, -3 * 7),
    end: addDays(curStart, 6),
  }));
  const [presetKey, setPresetKey] = useState<string | null>('1m');
  const [layout, setLayout] = useState<'painel' | 'foco'>('painel');

  const onPeriodChange = (r: Range, key: string | null) => { setRange(r); setPresetKey(key); };

  // Todas as semanas do histórico, depois recortadas pelo range selecionado.
  const allWeeks = useMemo(
    () => buildWeeks(completedTasks, incompleteTasks, sinceWeekId, currentWeekId),
    [completedTasks, incompleteTasks, sinceWeekId, currentWeekId],
  );

  const selected = useMemo(() => {
    const inR = allWeeks.filter(w => w.end.getTime() >= range.start.getTime() && w.start.getTime() <= range.end.getTime());
    return inR.length ? inR : (allWeeks.length ? [allWeeks[allWeeks.length - 1]] : []);
  }, [allWeeks, range]);

  const agg = useMemo(() => aggregateWeeks(selected), [selected]);

  // Bloco anterior comparável (mesmo nº de semanas, imediatamente antes) p/ tendência.
  const prevAgg = useMemo(() => {
    if (!selected.length) return { completed: 0, total: 0 };
    const firstIdx = allWeeks.indexOf(selected[0]);
    const n = selected.length;
    const prev = allWeeks.slice(Math.max(0, firstIdx - n), firstIdx);
    return aggregateWeeks(prev);
  }, [allWeeks, selected]);

  const pct = agg.total ? Math.round((agg.completed / agg.total) * 100) : 0;
  const prevPct = prevAgg.total ? (prevAgg.completed / prevAgg.total) * 100 : 0;
  const completedTrend = prevAgg.completed ? Math.round(((agg.completed - prevAgg.completed) / prevAgg.completed) * 100) : null;
  const pctTrend = prevPct ? Math.round(pct - prevPct) : null;
  const activeClients = clients.filter((c) => (agg.byClient[c.id] || 0) > 0).length;
  const periodWord = selected.length === 1 ? 'nesta semana' : 'no período';

  const ranking = useMemo(() => buildRanking(teamMembers, agg), [teamMembers, agg]);
  const clientLoad = useMemo(() => buildClientLoad(clients, agg), [clients, agg]);
  const rangeStartWeekId = useMemo(() => getWeekId(range.start), [range]);
  const overdueItems = useMemo(
    () => buildOverdueList(incompleteTasks, currentWeekId, rangeStartWeekId),
    [incompleteTasks, currentWeekId, rangeStartWeekId],
  );

  const kpis: KpiDef[] = [
    { icon: <CheckCircle2 size={20} />, value: agg.completed, label: 'Tarefas concluídas', sub: periodWord, trend: completedTrend },
    { icon: <AlertTriangle size={20} />, value: agg.overdue, label: 'Tarefas atrasadas', sub: agg.overdue === 1 ? 'tarefa' : 'tarefas', tone: 'danger' },
    { icon: <Target size={20} />, value: pct + '%', label: 'Taxa de conclusão', sub: `${agg.completed} de ${agg.total}`, bar: pct, trend: pctTrend, tone: 'accent' },
    { icon: <Users size={20} />, value: activeClients, label: 'Clientes ativos', sub: 'com demandas' },
  ];

  const hasData = agg.total > 0;

  return (
    <div className="reports-scope">
      <main className="dash">
        <header className="dash-head">
          <div>
            <h1>Relatórios</h1>
            <p>Visão geral das demandas da tropa {periodWord}.</p>
          </div>
          <div className="dash-head__controls">
            <PeriodPicker range={range} presetKey={presetKey} today={today} curStart={curStart} onChange={onPeriodChange} />
            <div className="layout-toggle" role="tablist" aria-label="Layout">
              <button data-active={layout === 'painel'} onClick={() => setLayout('painel')} title="Layout painel">
                <LayoutGrid size={15} /> Painel
              </button>
              <button data-active={layout === 'foco'} onClick={() => setLayout('foco')} title="Layout operacional">
                <Layers size={15} /> Operacional
              </button>
            </div>
          </div>
        </header>

        {!hasData ? (
          <div className="glass dash-empty">
            <span className="dash-empty__icon"><BarChart3 size={26} /></span>
            <h3>Sem dados no período</h3>
            <p>Não há tarefas no intervalo selecionado. Ajuste o período ou conclua tarefas no Planejador para ver as métricas aqui.</p>
          </div>
        ) : layout === 'painel' ? (
          <>
            <section className="kpi-row">
              {kpis.map((k, i) => (
                <Kpi key={i} icon={k.icon} value={k.value} label={k.label} sub={k.sub} tone={k.tone} trend={k.trend} bar={k.bar} />
              ))}
            </section>

            <div className="dash-grid dash-grid--2">
              <Panel title="Trabalho por semana" icon={<BarChart3 size={18} />} action={<LegendInline />}>
                <WeeklyChart weeks={selected} />
              </Panel>
              <Panel title="Ranking do time" icon={<Trophy size={18} />}>
                <RankingSimple rows={ranking} team={teamMembers} />
              </Panel>
            </div>

            <div className="dash-grid dash-grid--3">
              <Panel title="Carga por cliente" icon={<Clock size={18} />}>
                <ClientLoad rows={clientLoad} />
              </Panel>
              <Panel title="Distribuição por tipo" icon={<PieIcon size={18} />}>
                <TypeBreakdown byType={agg.byType} />
              </Panel>
              <Panel title="Atrasadas" icon={<AlertTriangle size={18} />}
                     action={<span className="panel__badge" data-on={overdueItems.length > 0}>{overdueItems.length}</span>}>
                <OverdueList items={overdueItems} clients={clients} team={teamMembers} />
              </Panel>
            </div>
          </>
        ) : (
          <>
            <Panel title="Trabalho por semana" icon={<BarChart3 size={18} />} className="hero-panel" action={<LegendInline />}>
              <div className="hero-kpis">
                {kpis.map((k, i) => (
                  <div key={i} className={'hero-kpi' + (k.tone ? ' hero-kpi--' + k.tone : '')}>
                    <span className="hero-kpi__icon">{k.icon}</span>
                    <div>
                      <div className="hero-kpi__value">{k.value}</div>
                      <div className="hero-kpi__label">{k.label}</div>
                    </div>
                  </div>
                ))}
              </div>
              <WeeklyChart weeks={selected} />
            </Panel>

            <div className="dash-grid dash-grid--ops">
              <Panel title="Tarefas atrasadas" icon={<AlertTriangle size={18} />}
                     action={<span className="panel__badge" data-on={overdueItems.length > 0}>{overdueItems.length}</span>}>
                <OverdueList items={overdueItems} clients={clients} team={teamMembers} />
              </Panel>
              <Panel title="Ranking do time" icon={<Trophy size={18} />}>
                <RankingSimple rows={ranking} team={teamMembers} />
              </Panel>
            </div>

            <div className="dash-grid dash-grid--2b">
              <Panel title="Carga por cliente" icon={<Clock size={18} />}>
                <ClientLoad rows={clientLoad} />
              </Panel>
              <Panel title="Distribuição por tipo" icon={<PieIcon size={18} />}>
                <TypeBreakdown byType={agg.byType} />
              </Panel>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
