import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { Client, DailyRitual, DayOfWeek, SprintFocus, SubTask, TaskComment, TaskKind, TaskStatus, TaskType, TeamMember, UserGamification, WeeklyTask } from '../../types';
import { Reorder, useDragControls } from 'motion/react';
import { Icon } from './Icons';
import { buildRanking, clientById, SprintDayView, SprintTaskView, toSprintWeek, toTaskView } from './adapter';
import { BADGES, badgeById, COMBO_TTL_MS, DEFAULT_DAILY_GOAL, focusKeywords, fmtMinutes, levelFromXp, newlyEarnedBadges, parseTimeText, pickVoiceLine, playPing, playSound, rewardForTask, spawnXPFloater, taskMatchesFocus, todayISO, daysBetween } from './utils';
import Timer from '../../components/Timer';
import EstimatedTimePicker from '../../components/EstimatedTimePicker';
import './sprint.css';

interface SprintPlannerProps {
  user: User;
  clients: Client[];
  weeklyTasks: WeeklyTask[];
  tasksLoaded: boolean;
  teamMembers: TeamMember[];
  incompleteTasks: WeeklyTask[];
  currentWeekId: string;
  setCurrentWeekId: (weekId: string) => void;
  onUpdateTask: (task: WeeklyTask) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (task: Omit<WeeklyTask, 'id'>) => void;
  onReorderTasks: (day: DayOfWeek, tasks: WeeklyTask[]) => void;
  onReorderClients: (clients: Client[]) => void;
  gamification: UserGamification[];
  onUpdateGamification: (entry: UserGamification) => void;
  sprintFocus: SprintFocus | null;
  onUpdateSprintFocus: (focus: SprintFocus) => void;
  rituals: DailyRitual[];
  onAddRitual: (ritual: Omit<DailyRitual, 'id'>) => void;
  onUpdateRitual: (ritual: DailyRitual) => void;
  onDeleteRitual: (id: string) => void;
}

type ThemePref = 'dark' | 'light';
type DensityPref = 'compact' | 'regular' | 'cozy';

interface Prefs {
  accent: string;
  theme: ThemePref;
  density: DensityPref;
  showRightPanel: boolean;
  confetti: boolean;
  sound: boolean;
}

const DEFAULT_PREFS: Prefs = {
  accent: '#6366f1',
  theme: 'dark',
  density: 'regular',
  showRightPanel: false,
  confetti: true,
  sound: true,
};

const PREFS_KEY = 'sprint_planner_prefs';
const PREFS_VERSION = 4;

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<Prefs> & { __v?: number };
    // Migration: force ranking off and sound on for everyone on this version bump.
    if ((parsed.__v ?? 0) < PREFS_VERSION) {
      return { ...DEFAULT_PREFS, ...parsed, showRightPanel: false, sound: true };
    }
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

const DAYS_ORDER: DayOfWeek[] = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

function fmtDateBR(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function weekRangeLabel(weekId: string) {
  const [y, m, d] = weekId.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${fmtDateBR(start)} – ${fmtDateBR(end)}`;
}

function addWeeks(weekId: string, delta: number): string {
  const [y, m, d] = weekId.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  start.setDate(start.getDate() + delta * 7);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
}

// ── DockFilter ─────────────────────────────────────────────────────────────
function DockFilter({ label, value, options, onChange, icon }: {
  label: string;
  value: string;
  options: { id: string; name: string; color?: string }[];
  onChange: (id: string) => void;
  icon: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const active = value !== '__all';
  const selected = active ? options.find(o => o.id === value) : null;
  return (
    <div className="dock-filter"
      data-open={open ? 'true' : 'false'}
      data-active={active ? 'true' : 'false'}
      ref={ref}
      onClick={() => setOpen(v => !v)}
    >
      <span className="dock-filter__icon">{icon}</span>
      <span className="dock-filter__label">{label}</span>
      <span className="dock-filter__value">
        {selected?.color && <span className="dock-filter__dot" style={{ background: selected.color }} />}
        {selected ? selected.name : 'Todos'}
      </span>
      <span className="dock-filter__chev"><Icon.ChevDown size={12} /></span>
      {open && (
        <div className="dock-filter__menu" onClick={e => e.stopPropagation()}>
          <div className="dock-filter__opt" data-active={value === '__all'} onClick={() => { onChange('__all'); setOpen(false); }}>
            Todos
          </div>
          {options.map(o => (
            <div key={o.id} className="dock-filter__opt"
              data-active={value === o.id}
              onClick={() => { onChange(o.id); setOpen(false); }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {o.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: o.color }} />}
                {o.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Donut ───────────────────────────────────────────────────────────────────
function Donut({ pct = 0, size = 100, stroke = 9 }: { pct?: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="sprint-donut-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r}
          stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r}
          stroke="url(#sprint-donut-grad)" strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div className="donut__pct">{Math.round(pct)}%</div>
    </div>
  );
}

// ── TaskRow ─────────────────────────────────────────────────────────────────
function TaskRow({ task, clients, team, onToggle, ungrouped, onExpand, expanded, dragControls }: {
  task: SprintTaskView;
  clients: Client[];
  team: TeamMember[];
  onToggle: (task: SprintTaskView, ev: React.ChangeEvent<HTMLInputElement>) => void;
  ungrouped: boolean;
  onExpand: () => void;
  expanded: boolean;
  dragControls?: ReturnType<typeof useDragControls>;
}) {
  const tagClass =
    task.kind === 'recorrente' ? 'tag tag--recorrente'
    : task.kind === 'urgente' ? 'tag tag--urgente'
    : 'tag tag--pontual';
  const kindLabel =
    task.kind === 'recorrente' ? 'Recorrente'
    : task.kind === 'urgente' ? 'Urgente'
    : 'Pontual';
  const colors = task.clients.map(id => clientById(clients, id)?.color).filter(Boolean) as string[];
  const barBg = colors.length === 0 ? 'var(--text-4)'
    : colors.length === 1 ? colors[0]
    : `linear-gradient(180deg, ${colors.join(', ')})`;
  const timeLabel = task.estimatedMinutes > 0 ? fmtMinutes(task.estimatedMinutes) : '—';

  // Status efetivo: 'done' tem prioridade se `completed`, mesmo sem status setado.
  const effectiveStatus = task.completed
    ? 'done'
    : task.raw.status ?? null;

  const subTasksDone = (task.raw.subTasks || []).filter(st => st.completed).length;
  const subTasksTotal = (task.raw.subTasks || []).length;
  const isRunning = task.raw.timerStartedAt || (task.raw.subTasks || []).some(st => st.timerStartedAt);
  const derivedStatus = task.completed ? 'done' : 
    (effectiveStatus === 'blocked' ? 'blocked' : 
      (effectiveStatus === 'in_progress' || isRunning || (subTasksDone > 0 && subTasksDone < subTasksTotal) ? 'in_progress' : 'todo'));

  const mainClient = task.clients.length > 0 ? clientById(clients, task.clients[0]) : null;

  // Multi-dia: mostra um chip único "X/N" com tooltip; muito mais limpo que 3 fitas textuais.
  const rangePos = task.rangePosition;
  const isMultiDay = task.totalDays > 1 && (rangePos === 'start' || rangePos === 'middle' || rangePos === 'end');
  const rangeTitle = isMultiDay
    ? `${rangePos === 'start' ? 'Início' : rangePos === 'end' ? 'Entrega' : 'Em curso'} · dia ${task.dayIndex} de ${task.totalDays} (${task.raw.startDate} → ${task.raw.dueDate})`
    : undefined;

  return (
    <div className={
      'task' + (ungrouped ? ' task--ungrouped' : '') + (dragControls ? ' task--draggable' : '')
    }
      data-done={task.completed ? 'true' : 'false'}
      data-status={effectiveStatus ?? 'none'}
      data-range={rangePos}
    >
      {dragControls && (
        <span
          className="task__handle"
          onPointerDown={(e) => { e.stopPropagation(); dragControls.start(e); }}
          title="Arrastar para reordenar"
        >
          <Icon.Grip size={14} />
        </span>
      )}
      <input
        type="checkbox"
        className="task__check"
        checked={task.completed}
        onChange={ev => onToggle(task, ev)}
      />
      {ungrouped && <span className="task__bar" style={{ background: barBg }} />}
      <div className="task__title">
        <span className="task__title-text" onClick={onExpand} aria-expanded={expanded}>{task.title}</span>
        {task.raw.ritualId && <span className="task__ritual" title="Ritual diário"><Icon.Flame size={12} /></span>}
        {mainClient && (
          <span className="tag" style={{ background: `${mainClient.color}20`, color: mainClient.color, border: `1px solid ${mainClient.color}40` }} title={mainClient.name}>
            {mainClient.logo || '🏢'} {mainClient.name.split(' ')[0]}
          </span>
        )}
        <span className="tag" style={{
          background: derivedStatus === 'done' ? 'rgba(16,185,129,0.1)' : derivedStatus === 'in_progress' ? 'rgba(99,102,241,0.1)' : 'rgba(100,116,139,0.1)',
          color: derivedStatus === 'done' ? '#34d399' : derivedStatus === 'in_progress' ? '#818cf8' : '#94a3b8',
          border: '1px solid',
          borderColor: derivedStatus === 'done' ? 'rgba(16,185,129,0.2)' : derivedStatus === 'in_progress' ? 'rgba(99,102,241,0.2)' : 'rgba(100,116,139,0.2)'
        }}>
          {derivedStatus === 'done' ? 'Concluído' : derivedStatus === 'in_progress' ? 'Em progresso' : 'A fazer'}
        </span>
        {effectiveStatus === 'blocked' && (
          <span className="task__status-icon task__status-icon--blocked"
            title={task.raw.blockedReason ? `Impedimento: ${task.raw.blockedReason}` : 'Impedimento'}
          >
            <Icon.AlertTriangle size={12} />
          </span>
        )}
        <span className={tagClass}>{kindLabel}</span>
        {isMultiDay && (
          <span className={`task__range-chip task__range-chip--${rangePos}`} title={rangeTitle}>
            <Icon.Calendar size={11} />
            <span className="task__range-chip-num">{task.dayIndex}/{task.totalDays}</span>
          </span>
        )}
      </div>
      <span className="task__time">
        <Icon.Clock size={14} />
        {timeLabel}
      </span>
      <span className="avatars">
        {task.people.map(id => {
          const p = team.find(t => t.id === id);
          if (!p) return null;
          const initials = p.name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
          return (
            <span key={id} className="avatar" title={p.name}>
              {p.photoUrl ? <img src={p.photoUrl} alt="" /> : initials}
            </span>
          );
        })}
      </span>
    </div>
  );
}

// ── SubtaskRich (linha de subtarefa com status + datas + comentários + responsáveis) ──
function SubtaskRich({
  subtask, index, siblingsCount, team, currentUserName,
  onChange, onDelete, onMoveUp, onMoveDown,
}: {
  subtask: SubTask;
  index: number;
  siblingsCount: number;
  team: TeamMember[];
  currentUserName: string;
  onChange: (next: SubTask) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const comments = subtask.comments || [];
  const activeResponsibles = new Set(
    subtask.responsibles || (subtask.responsible ? [subtask.responsible] : [])
  );
  const effectiveStatus: TaskStatus | 'none' = subtask.completed
    ? 'done'
    : subtask.status ?? 'none';

  const setStatus = (next: TaskStatus) => {
    if (next === 'done') {
      onChange({ ...subtask, status: 'done', completed: true });
      return;
    }
    if (subtask.status === next) {
      onChange({
        ...subtask,
        status: undefined,
        blockedReason: next === 'blocked' ? undefined : subtask.blockedReason,
      });
      return;
    }
    onChange({ ...subtask, status: next });
  };

  const toggleCheck = () => {
    const wasDone = subtask.completed;
    onChange({
      ...subtask,
      completed: !wasDone,
      status: !wasDone ? 'done' : subtask.status === 'done' ? undefined : subtask.status,
    });
  };

  const toggleResponsible = (memberId: string) => {
    const cur = new Set(
      subtask.responsibles || (subtask.responsible ? [subtask.responsible] : [])
    );
    if (cur.has(memberId)) cur.delete(memberId);
    else cur.add(memberId);
    onChange({ ...subtask, responsibles: Array.from(cur), responsible: undefined });
  };

  const addComment = () => {
    const text = newComment.trim();
    if (!text) return;
    const c: TaskComment = {
      id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      authorId: currentUserName,
      text,
      createdAt: Date.now(),
    };
    onChange({ ...subtask, comments: [...comments, c] });
    setNewComment('');
  };

  const deleteComment = (id: string) =>
    onChange({ ...subtask, comments: comments.filter(c => c.id !== id) });

  const fmtShort = (iso: string) => {
    const parts = iso.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : iso;
  };

  const dateRangeInvalid = !!(
    subtask.startDate &&
    subtask.dueDate &&
    subtask.startDate > subtask.dueDate
  );
  const hasMeta =
    !!subtask.status ||
    !!subtask.startDate ||
    !!subtask.dueDate ||
    comments.length > 0 ||
    activeResponsibles.size > 0;

  return (
    <div className="subtask-rich" data-status={effectiveStatus} data-expanded={expanded ? 'true' : 'false'}>
      <div className="subtask subtask--rich" data-done={subtask.completed ? 'true' : 'false'}>
        <input
          type="checkbox"
          className="subtask__check"
          checked={subtask.completed}
          onChange={toggleCheck}
        />
        <input
          className="subtask__title"
          size={1}
          value={subtask.title}
          onChange={e => onChange({ ...subtask, title: e.target.value })}
          onBlur={e => { if (!e.target.value.trim()) onDelete(); }}
        />
        {/* Cluster direito: chips visíveis só quando há algo */}
        <span className="subtask__chips">
          {effectiveStatus === 'blocked' && (
            <span
              className="subtask__chip subtask__chip--blocked"
              title={subtask.blockedReason ? `Impedimento: ${subtask.blockedReason}` : 'Impedimento'}
            >
              <Icon.AlertTriangle size={10} />
            </span>
          )}
          {(subtask.startDate || subtask.dueDate) && (
            <span
              className="subtask__chip subtask__chip--date"
              title={`Início ${subtask.startDate || '—'} · Entrega ${subtask.dueDate || '—'}`}
            >
              <Icon.Calendar size={10} />
              {subtask.dueDate ? fmtShort(subtask.dueDate) : fmtShort(subtask.startDate!)}
            </span>
          )}
          {comments.length > 0 && (
            <span className="subtask__chip subtask__chip--comments" title={`${comments.length} comentário(s)`}>
              {comments.length}
            </span>
          )}
        </span>
        {/* Ações secundárias — só aparecem no hover */}
        <span className="subtask__actions">
          <button onClick={onMoveUp} disabled={index === 0} title="Mover para cima">
            <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
              <Icon.ChevDown size={10} />
            </span>
          </button>
          <button onClick={onMoveDown} disabled={index === siblingsCount - 1} title="Mover para baixo">
            <Icon.ChevDown size={10} />
          </button>
          <button onClick={onDelete} title="Remover" className="subtask__del-btn">
            <Icon.X size={11} />
          </button>
        </span>
        <button
          className="subtask__expand"
          data-has-meta={hasMeta ? 'true' : 'false'}
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          title={expanded ? 'Recolher detalhes' : 'Detalhes'}
        >
          <span style={{
            display: 'inline-flex',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform .15s',
          }}>
            <Icon.ChevDown size={12} />
          </span>
        </button>
      </div>

      {expanded && (
        <div className="subtask-rich__panel">
          {/* Linha primária: status + datas (idêntico ao padrão da tarefa mãe) */}
          <div className="subtask-rich__primary">
            <div className="task-detail__seg task-detail__seg--status task-detail__seg--sm" role="tablist" aria-label="Status">
              <button data-active={subtask.status === 'in_progress'} data-status="in_progress" onClick={() => setStatus('in_progress')}>Em progresso</button>
              <button data-active={subtask.status === 'blocked'} data-status="blocked" onClick={() => setStatus('blocked')}>Impedimento</button>
              <button data-active={subtask.status === 'done' || subtask.completed} data-status="done" onClick={() => setStatus('done')}>Concluída</button>
            </div>
            <div className="task-detail__daterange task-detail__daterange--sm" data-invalid={dateRangeInvalid ? 'true' : 'false'} title="Início → Entrega">
              <Icon.Calendar size={11} />
              <input
                type="date"
                className="task-detail__date"
                value={subtask.startDate || ''}
                onChange={e => onChange({ ...subtask, startDate: e.target.value || undefined })}
                title="Início"
              />
              <span className="task-detail__daterange-arrow">→</span>
              <input
                type="date"
                className="task-detail__date"
                value={subtask.dueDate || ''}
                onChange={e => onChange({ ...subtask, dueDate: e.target.value || undefined })}
                title="Entrega"
              />
              {(subtask.startDate || subtask.dueDate) && (
                <button
                  className="task-detail__daterange-clear"
                  onClick={() => onChange({ ...subtask, startDate: undefined, dueDate: undefined })}
                  title="Remover datas"
                ><Icon.X size={10} /></button>
              )}
            </div>
            <Timer item={subtask} onChange={(next) => onChange({ ...subtask, ...next })} size="xs" />
            <EstimatedTimePicker
              value={subtask.estimatedMinutes}
              onChange={(v) => onChange({ ...subtask, estimatedMinutes: v })}
              size="xs"
            />
          </div>
          {subtask.status === 'blocked' && (
            <input
              className="task-detail__blocked-reason"
              placeholder="O que está travando? (opcional)"
              value={subtask.blockedReason ?? ''}
              onChange={e => onChange({ ...subtask, blockedReason: e.target.value || undefined })}
            />
          )}
          {team.length > 0 && (
            <div className="subtask-rich__people">
              {team.map(m => {
                const active = activeResponsibles.has(m.id);
                const initials = m.name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
                return (
                  <button
                    key={m.id}
                    className="task-detail__chip task-detail__chip--sm"
                    data-active={active ? 'true' : 'false'}
                    onClick={() => toggleResponsible(m.id)}
                  >
                    <span className="avatar">
                      {m.photoUrl ? <img src={m.photoUrl} alt="" /> : <span style={{ fontSize: 9, fontWeight: 700 }}>{initials}</span>}
                    </span>
                    {m.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          )}
          <div className="subtask-rich__comments">
            {comments.map(c => {
              const author = c.authorId || 'Anônimo';
              const initials = author.slice(0, 2).toUpperCase();
              const when = new Date(c.createdAt);
              const whenLabel = `${String(when.getDate()).padStart(2, '0')}/${String(when.getMonth() + 1).padStart(2, '0')} ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
              return (
                <div key={c.id} className="comment comment--sub">
                  <span className="comment__avatar">{initials}</span>
                  <div>
                    <div className="comment__head">
                      <span className="comment__author">{author}</span>
                      <span className="comment__time">{whenLabel}</span>
                    </div>
                    <div className="comment__body">{c.text}</div>
                  </div>
                  <button className="comment__del" onClick={() => deleteComment(c.id)} title="Remover">
                    <Icon.X size={12} />
                  </button>
                </div>
              );
            })}
            <div className="subtask--add">
              <input
                placeholder="Comentário na subtarefa…"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addComment();
                  }
                }}
              />
              <button onClick={addComment}>Comentar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TaskDetail (expanded panel under a row) ─────────────────────────────────
function TaskDetail({ task, team, clients, currentUserName, onUpdate, onDelete }: {
  task: SprintTaskView;
  team: TeamMember[];
  clients: Client[];
  currentUserName: string;
  onUpdate: (next: WeeklyTask) => void;
  onDelete: () => void;
}) {
  const raw = task.raw;
  const subtasks: SubTask[] = raw.subTasks || [];
  const comments: TaskComment[] = raw.comments || [];

  const [titleDraft, setTitleDraft] = useState(raw.title);
  useEffect(() => { setTitleDraft(raw.title); }, [raw.title]);
  const [newSub, setNewSub] = useState('');
  const [newComment, setNewComment] = useState('');

  const commitTitle = () => {
    const next = titleDraft.trim();
    if (!next || next === raw.title) return;
    onUpdate({ ...raw, title: next });
  };

  const setKind = (kind: TaskKind) => onUpdate({ ...raw, kind });
  const setType = (taskType: TaskType | undefined) => onUpdate({ ...raw, taskType });
  const setDueDate = (dueDate: string | undefined) => onUpdate({ ...raw, dueDate: dueDate || undefined });
  const setStartDate = (startDate: string | undefined) => onUpdate({ ...raw, startDate: startDate || undefined });
  const setStatus = (next: TaskStatus) => {
    // Toggling 'done' deve sincronizar com `completed` para gamificação não quebrar.
    if (next === 'done') {
      onUpdate({ ...raw, status: 'done', completed: true });
      return;
    }
    if (raw.status === next) {
      // Clique no estado já ativo desfaz — volta para "não começou".
      onUpdate({
        ...raw,
        status: undefined,
        blockedReason: next === 'blocked' ? undefined : raw.blockedReason,
      });
      return;
    }
    onUpdate({ ...raw, status: next });
  };
  const setBlockedReason = (reason: string) =>
    onUpdate({ ...raw, blockedReason: reason || undefined });

  // Aviso simples se intervalo estiver invertido.
  const dateRangeInvalid = !!(raw.startDate && raw.dueDate && raw.startDate > raw.dueDate);

  const toggleResponsible = (memberId: string) => {
    const cur = new Set(raw.responsibles || (raw.responsible ? [raw.responsible] : []));
    if (cur.has(memberId)) cur.delete(memberId); else cur.add(memberId);
    onUpdate({ ...raw, responsibles: Array.from(cur), responsible: undefined });
  };

  const addSubtask = () => {
    const title = newSub.trim();
    if (!title) return;
    const next: SubTask = {
      id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title, completed: false,
    };
    onUpdate({ ...raw, subTasks: [...subtasks, next] });
    setNewSub('');
  };

  const toggleSubtask = (id: string) => {
    const updated = subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s);
    onUpdate({ ...raw, subTasks: updated });
  };

  const renameSubtask = (id: string, title: string) => {
    const updated = subtasks.map(s => s.id === id ? { ...s, title } : s);
    onUpdate({ ...raw, subTasks: updated });
  };

  const deleteSubtask = (id: string) => {
    onUpdate({ ...raw, subTasks: subtasks.filter(s => s.id !== id) });
  };

  const updateSubtask = (id: string, patch: Partial<SubTask>) => {
    const updated = subtasks.map(s => s.id === id ? { ...s, ...patch } : s);
    onUpdate({ ...raw, subTasks: updated });
  };

  const moveSubtask = (id: string, delta: -1 | 1) => {
    const idx = subtasks.findIndex(s => s.id === id);
    if (idx < 0) return;
    const target = idx + delta;
    if (target < 0 || target >= subtasks.length) return;
    const next = subtasks.slice();
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    onUpdate({ ...raw, subTasks: next });
  };

  const addComment = () => {
    const text = newComment.trim();
    if (!text) return;
    const c: TaskComment = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      authorId: currentUserName,
      text,
      createdAt: Date.now(),
    };
    onUpdate({ ...raw, comments: [...comments, c] });
    setNewComment('');
  };

  const deleteComment = (id: string) => {
    onUpdate({ ...raw, comments: comments.filter(c => c.id !== id) });
  };

  const activeResponsibles = new Set(raw.responsibles || (raw.responsible ? [raw.responsible] : []));

  return (
    <div className="task-detail">
      {/* Title */}
      <input
        className="task-detail__title-input"
        value={titleDraft}
        onChange={e => setTitleDraft(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        placeholder="Título da tarefa"
      />

      {/* Linha primária: status + datas — o "estado" da tarefa num só lugar */}
      <div className="task-detail__primary">
        <div className="task-detail__seg task-detail__seg--status" role="tablist" aria-label="Status">
          <button
            data-active={raw.status === 'in_progress'}
            data-status="in_progress"
            onClick={() => setStatus('in_progress')}
            title="Em progresso (clique de novo para desfazer)"
          >Em progresso</button>
          <button
            data-active={raw.status === 'blocked'}
            data-status="blocked"
            onClick={() => setStatus('blocked')}
            title="Impedimento (clique de novo para desfazer)"
          >Impedimento</button>
          <button
            data-active={raw.status === 'done' || raw.completed}
            data-status="done"
            onClick={() => setStatus('done')}
            title="Concluída"
          >Concluída</button>
        </div>
        <div className="task-detail__primary-spacer" />
        <div className="task-detail__daterange" data-invalid={dateRangeInvalid ? 'true' : 'false'} title="Início → Entrega">
          <Icon.Calendar size={13} />
          <input
            type="date"
            className="task-detail__date"
            value={raw.startDate || ''}
            onChange={e => setStartDate(e.target.value)}
            title="Início"
          />
          <span className="task-detail__daterange-arrow">→</span>
          <input
            type="date"
            className="task-detail__date"
            value={raw.dueDate || ''}
            onChange={e => setDueDate(e.target.value)}
            title="Entrega"
          />
          {(raw.dueDate || raw.startDate) && (
            <button
              className="task-detail__daterange-clear"
              onClick={() => { setDueDate(undefined); setStartDate(undefined); }}
              title="Remover datas"
            ><Icon.X size={11} /></button>
          )}
        </div>
        {dateRangeInvalid && (
          <span className="task-detail__warn" title="Início posterior à entrega">
            <Icon.AlertTriangle size={12} /> Intervalo inválido
          </span>
        )}
      </div>

      {raw.status === 'blocked' && (
        <input
          className="task-detail__blocked-reason"
          placeholder="O que está travando? (opcional)"
          value={raw.blockedReason ?? ''}
          onChange={e => setBlockedReason(e.target.value)}
        />
      )}

      {/* Configurações secundárias — menos peso visual */}
      <div className="task-detail__meta">
        <select
          className="task-detail__select"
          value={raw.clientId ?? ''}
          onChange={e => onUpdate({ ...raw, clientId: e.target.value || undefined, masterTaskId: undefined })}
          title="Cliente"
        >
          <option value="">Sem cliente</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select className="task-detail__select" value={task.kind} onChange={e => setKind(e.target.value as TaskKind)} title="Tipo da tarefa">
          <option value="pontual">Pontual</option>
          <option value="recorrente">Recorrente</option>
          <option value="urgente">Urgente</option>
        </select>

        <div className="task-detail__seg" role="tablist" aria-label="Escopo">
          <button data-active={raw.taskType !== 'overdelivery'} onClick={() => setType('scope')}>Escopo</button>
          <button data-active={raw.taskType === 'overdelivery'} onClick={() => setType('overdelivery')}>Overdelivery</button>
        </div>

        <Timer item={raw} onChange={onUpdate} size="sm" />
        <EstimatedTimePicker value={raw.estimatedMinutes} onChange={v => onUpdate({ ...raw, estimatedMinutes: v })} size="sm" />
      </div>

      {/* Responsibles */}
      <div>
        <div className="task-detail__section-title">Responsáveis</div>
        <div className="task-detail__row">
          {team.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Nenhum membro cadastrado.</span>}
          {team.map(m => {
            const active = activeResponsibles.has(m.id);
            const initials = m.name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
            return (
              <button key={m.id} className="task-detail__chip" data-active={active ? 'true' : 'false'} onClick={() => toggleResponsible(m.id)}>
                <span className="avatar">
                  {m.photoUrl ? <img src={m.photoUrl} alt="" /> : <span style={{ fontSize: 9, fontWeight: 700 }}>{initials}</span>}
                </span>
                {m.name.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subtasks */}
      <div>
        <div className="task-detail__section-title">
          Subtarefas
          {subtasks.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-4)', letterSpacing: 0, textTransform: 'none', marginLeft: 6 }}>
              {subtasks.filter(s => s.completed).length}/{subtasks.length}
            </span>
          )}
        </div>
        {subtasks.map((s, idx) => (
          <SubtaskRich
            key={s.id}
            subtask={s}
            index={idx}
            siblingsCount={subtasks.length}
            team={team}
            currentUserName={currentUserName}
            onChange={(next) => updateSubtask(s.id, next)}
            onDelete={() => deleteSubtask(s.id)}
            onMoveUp={() => moveSubtask(s.id, -1)}
            onMoveDown={() => moveSubtask(s.id, 1)}
          />
        ))}
        <div className="subtask--add">
          <input
            placeholder="Nova subtarefa…"
            value={newSub}
            onChange={e => setNewSub(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addSubtask(); }}
          />
          <button onClick={addSubtask}>Adicionar</button>
        </div>
      </div>

      {/* Comments */}
      <div>
        <div className="task-detail__section-title">Comentários {comments.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-4)', letterSpacing: 0, textTransform: 'none', marginLeft: 6 }}>
            {comments.length}
          </span>
        )}</div>
        {comments.map(c => {
          const author = c.authorId || 'Anônimo';
          const initials = author.slice(0, 2).toUpperCase();
          const when = new Date(c.createdAt);
          const whenLabel = `${String(when.getDate()).padStart(2, '0')}/${String(when.getMonth() + 1).padStart(2, '0')} ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
          return (
            <div key={c.id} className="comment">
              <span className="comment__avatar">{initials}</span>
              <div>
                <div className="comment__head">
                  <span className="comment__author">{author}</span>
                  <span className="comment__time">{whenLabel}</span>
                </div>
                <div className="comment__body">{c.text}</div>
              </div>
              <button className="comment__del" onClick={() => deleteComment(c.id)} title="Remover">
                <Icon.X size={14} />
              </button>
            </div>
          );
        })}
        <div className="subtask--add">
          <input
            placeholder="Escreva um comentário…"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }}
          />
          <button onClick={addComment}>Comentar</button>
        </div>
      </div>

      {/* Danger */}
      <button className="task-detail__danger" onClick={() => {
        if (confirm(`Excluir "${task.title}"?`)) onDelete();
      }}>
        <Icon.X size={14} />
        Excluir tarefa
      </button>
    </div>
  );
}

// ── ClientReorderArrows — moves a client up/down in the global order ───────
function ClientReorderArrows({ clientKey, clients, onReorderClients }: {
  clientKey: string;
  clients: Client[];
  onReorderClients: (clients: Client[]) => void;
}) {
  // Special groups like "__none" can't be reordered globally — they're synthesized per-day.
  if (clientKey === '__none' || !clients.some(c => c.id === clientKey)) return null;
  const sorted = [...clients].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
  const idx = sorted.findIndex(c => c.id === clientKey);
  const move = (e: React.MouseEvent, delta: -1 | 1) => {
    e.stopPropagation();
    const target = idx + delta;
    if (target < 0 || target >= sorted.length) return;
    const next = sorted.slice();
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    onReorderClients(next);
  };
  return (
    <span className="cgroup__arrows" onClick={e => e.stopPropagation()}>
      <button disabled={idx <= 0} onClick={e => move(e, -1)} title="Subir cliente">
        <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><Icon.ChevDown size={11} /></span>
      </button>
      <button disabled={idx >= sorted.length - 1} onClick={e => move(e, 1)} title="Descer cliente">
        <Icon.ChevDown size={11} />
      </button>
    </span>
  );
}

// ── DraggableTaskItem — each Reorder.Item owns its own drag controls ────────
interface DraggableTaskItemProps {
  task: SprintTaskView;
  children: (controls: ReturnType<typeof useDragControls>) => React.ReactNode;
}
function DraggableTaskItem({ task, children }: DraggableTaskItemProps) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  return (
    <Reorder.Item
      value={task.raw}
      dragListener={false}
      dragControls={controls}
      className="task-wrap"
      data-dragging={dragging ? 'true' : 'false'}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      layout="position"
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
    >
      {children(controls)}
    </Reorder.Item>
  );
}

// ── Group helpers ───────────────────────────────────────────────────────────
interface ClientGroup {
  key: string;
  name: string;
  color: string;
  tasks: SprintTaskView[];
}

function groupTasksByClient(tasks: SprintTaskView[], clients: Client[]): ClientGroup[] {
  const map = new Map<string, SprintTaskView[]>();
  for (const t of tasks) {
    const cid = t.clients[0] || '__none';
    if (!map.has(cid)) map.set(cid, []);
    map.get(cid)!.push(t);
  }
  const groups: ClientGroup[] = [];
  for (const c of clients) {
    if (map.has(c.id)) {
      groups.push({ key: c.id, name: c.name, color: c.color, tasks: map.get(c.id)! });
      map.delete(c.id);
    }
  }
  if (map.has('__none')) {
    groups.push({ key: '__none', name: 'Sem cliente', color: '#5d6890', tasks: map.get('__none')! });
    map.delete('__none');
  }
  for (const [k, ts] of map.entries()) {
    groups.push({ key: k, name: k, color: '#5d6890', tasks: ts });
  }
  return groups;
}

// ── Ranking ─────────────────────────────────────────────────────────────────
function RankingCard({ rows, youId, mode, onModeChange }: {
  rows: { member: TeamMember; done: number; total: number; xp: number; streak: number }[];
  youId?: string;
  mode: 'week' | 'all';
  onModeChange: (m: 'week' | 'all') => void;
}) {
  const sorted = [...rows].sort((a, b) => mode === 'week' ? (b.done - a.done) : (b.xp - a.xp));
  return (
    <section className="card glass">
      <h3 className="card__title">
        <span>Ranking do time</span>
        <span className="icon"><Icon.Trophy size={18} /></span>
      </h3>
      <div className="rank-tabs" role="tablist" aria-label="Período do ranking">
        <button role="tab" aria-selected={mode === 'week'} data-active={mode === 'week'} onClick={() => onModeChange('week')}>Esta semana</button>
        <button role="tab" aria-selected={mode === 'all'} data-active={mode === 'all'} onClick={() => onModeChange('all')}>Geral</button>
      </div>
      {sorted.map((r, i) => {
        const initials = r.member.name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
        const isYou = youId && r.member.id === youId;
        return (
          <div key={r.member.id} className={'rank' + (isYou ? ' rank--you' : '')} data-pos={i + 1}>
            <div className="rank__pos">{i === 0 ? '🏆' : `#${i + 1}`}</div>
            <div className="rank__avatar">
              {r.member.photoUrl ? <img src={r.member.photoUrl} alt="" /> : <span style={{
                display: 'grid', placeItems: 'center', width: '100%', height: '100%',
                background: 'var(--surface-2)', fontSize: 12, fontWeight: 700,
              }}>{initials}</span>}
            </div>
            <div>
              <div className="rank__name">{r.member.name.split(' ')[0]}</div>
              <div className="rank__sub">
                <span className="flame"><Icon.Flame size={11} /></span>
                {r.streak} dias · {r.done}/{r.total} tarefas
              </div>
            </div>
            <div className="rank__pts">
              {mode === 'week' ? r.done : r.xp}
              <em>{mode === 'week' ? 'feitas' : 'XP'}</em>
            </div>
          </div>
        );
      })}
      {sorted.length === 0 && (
        <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-3)' }}>
          Adicione membros da equipe para ver o ranking.
        </div>
      )}
    </section>
  );
}

// ── Badges ─────────────────────────────────────────────────────────────────
function BadgesCard({ owned }: { owned: string[] }) {
  const ownedSet = new Set(owned);
  return (
    <section className="card glass">
      <h3 className="card__title">
        <span>Conquistas</span>
        <span className="icon"><Icon.Sparkle size={18} /></span>
      </h3>
      <div className="badges-grid">
        {BADGES.map(b => {
          const has = ownedSet.has(b.id);
          return (
            <div key={b.id} className="badge" data-owned={has ? 'true' : 'false'} title={b.description}>
              <div className="badge__icon">{b.icon}</div>
              <div className="badge__name">{b.name}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Stats ──────────────────────────────────────────────────────────────────
function StatsCard({ totalCompleted, bestStreak, xp }: { totalCompleted: number; bestStreak: number; xp: number }) {
  return (
    <section className="card glass">
      <h3 className="card__title">
        <span>Estatísticas</span>
        <span className="icon"><Icon.Trophy size={18} /></span>
      </h3>
      <div className="stats-grid">
        <div className="stat"><div className="stat__num">{totalCompleted}</div><div className="stat__lbl">tarefas concluídas</div></div>
        <div className="stat"><div className="stat__num">{bestStreak}</div><div className="stat__lbl">recorde de streak</div></div>
        <div className="stat"><div className="stat__num">{xp}</div><div className="stat__lbl">XP total</div></div>
      </div>
    </section>
  );
}

// ── Missions ────────────────────────────────────────────────────────────────
interface Mission {
  id: string;
  title: string;
  progress: number;
  target: number;
  sub: string;
  xp: number;
  icon: React.ReactNode;
}

function MissionsCard({ missions, paid }: { missions: Mission[]; paid: Set<string> }) {
  return (
    <section className="card glass">
      <h3 className="card__title">
        <span>Missões da semana</span>
        <span className="icon"><Icon.Compass size={18} /></span>
      </h3>
      {missions.map(m => {
        const pct = Math.min(100, (m.progress / m.target) * 100);
        const done = m.progress >= m.target;
        const wasPaid = paid.has(m.id);
        return (
          <div key={m.id} className="mission" data-done={done ? 'true' : 'false'}>
            <div className="mission__icon">
              {done ? <Icon.Check size={18} /> : m.icon}
            </div>
            <div>
              <div className="mission__title">{m.title}</div>
              <div className="mission__sub">
                {m.progress}/{m.target} · {m.sub}
                {wasPaid && <span style={{ marginLeft: 8, color: '#34d399', fontWeight: 600 }}>· recompensa creditada</span>}
              </div>
              <div className="mission__progress"><span style={{ width: `${pct}%` }} /></div>
            </div>
            <div className="mission__pts">
              <Icon.Sparkle size={12} />
              +{m.xp}
            </div>
          </div>
        );
      })}
    </section>
  );
}

// ── ComboBanner ─────────────────────────────────────────────────────────────
function ComboBanner({ multiplier }: { multiplier: number }) {
  if (multiplier < 2) return null;
  return (
    <div className="combo" role="status">
      <span className="combo__x">×{multiplier}</span>
      <div>
        <div className="combo__lbl">Combo</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Continue assim!</div>
      </div>
    </div>
  );
}

// ── NicePopup ───────────────────────────────────────────────────────────────
function NicePopup({ xp, combo, bonus, title, onDone }: { xp: number; combo: number; bonus?: string; title?: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="nice" role="status">
      <div className="nice__icon">🎉</div>
      <div className="nice__title">{title || 'Boa!'}</div>
      {combo > 1 && (
        <div className="nice__sub">
          Combo x{combo} — você tá voando!
        </div>
      )}
      {bonus && <div className="nice__bonus">⚡ {bonus}</div>}
      <div className="nice__xp">
        <Icon.Sparkle size={14} />
        +{xp} XP
      </div>
    </div>
  );
}

// ── Confetti ────────────────────────────────────────────────────────────────
function Confetti({ seed }: { seed: number }) {
  const pieces = useMemo(() => {
    const colors = ['#6366f1', '#a855f7', '#ec4899', '#fbbf24', '#34d399', '#60a5fa'];
    return Array.from({ length: 36 }).map((_, i) => {
      const angle = (i / 36) * Math.PI * 2;
      const dist = 180 + Math.random() * 180;
      const dx = Math.cos(angle) * dist + (Math.random() - 0.5) * 60;
      const dy = Math.sin(angle) * dist + (Math.random() - 0.5) * 60 + 120;
      return {
        i,
        bg: colors[i % colors.length],
        dx: `${dx}px`,
        dy: `${dy}px`,
        rot: `${(Math.random() - 0.5) * 720}deg`,
        delay: `${Math.random() * 0.1}s`,
      };
    });
  }, [seed]);
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map(p => (
        <i key={p.i} style={{
          background: p.bg,
          ['--dx' as any]: p.dx,
          ['--dy' as any]: p.dy,
          ['--rot' as any]: p.rot,
          animationDelay: p.delay,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

// ── Theme + accent applier (scoped to wrapper element) ──────────────────────
function applyTheme(el: HTMLElement | null, prefs: Prefs) {
  if (!el) return;
  el.dataset.theme = prefs.theme;
  el.dataset.density = prefs.density;
  el.style.setProperty('--accent', prefs.accent);
  const hex = prefs.accent.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  el.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.16)`);
  el.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.4)`);
}

// ── Main view ───────────────────────────────────────────────────────────────
export default function SprintPlanner({
  user, clients, weeklyTasks, tasksLoaded, teamMembers, incompleteTasks, currentWeekId, setCurrentWeekId,
  onUpdateTask, onDeleteTask, onAddTask, onReorderTasks, onReorderClients,
  gamification, onUpdateGamification,
  sprintFocus, onUpdateSprintFocus,
  rituals, onAddRitual, onUpdateRitual, onDeleteRitual,
}: SprintPlannerProps) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);

  // Mobile detection — used to switch right panel to drawer mode.
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs, __v: PREFS_VERSION }));
    applyTheme(scopeRef.current, prefs);
  }, [prefs]);

  const setPref = <K extends keyof Prefs>(k: K, v: Prefs[K]) =>
    setPrefs(p => ({ ...p, [k]: v }));

  // Linked team member id (used for "VOCÊ" badge in ranking).
  // Stored locally to map auth user -> teamMember when one exists.
  const [linkedMemberId, setLinkedMemberId] = useState<string | undefined>(() => {
    return localStorage.getItem('sprint_linked_member_id') || undefined;
  });
  useEffect(() => {
    if (linkedMemberId) localStorage.setItem('sprint_linked_member_id', linkedMemberId);
  }, [linkedMemberId]);

  // Days open state
  const [openDays, setOpenDays] = useState<Set<DayOfWeek>>(new Set(['Segunda']));
  const toggleDay = (d: DayOfWeek) => setOpenDays(s => {
    const next = new Set(s);
    if (next.has(d)) next.delete(d); else next.add(d);
    return next;
  });

  // Filters
  const [clientFilter, setClientFilter] = useState<string>('__all');
  const [personFilter, setPersonFilter] = useState<string>('__all');
  const [grouped, setGrouped] = useState<boolean>(() => {
    return localStorage.getItem('sprint_grouped') === 'true';
  });
  useEffect(() => { localStorage.setItem('sprint_grouped', String(grouped)); }, [grouped]);

  // Task expansion (click on title)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const toggleExpand = (id: string) => setExpandedTaskId(cur => cur === id ? null : id);

  // Reorder tasks WITHIN a client group — flattens the new order back into the
  // day's full task list (preserving other groups' positions).
  const handleReorderInGroup = useCallback((day: DayOfWeek, dayTaskViews: SprintTaskView[], clientKey: string, newGroupTasks: WeeklyTask[]) => {
    const groups = groupTasksByClient(dayTaskViews, clients);
    const newGroups = groups.map(g =>
      g.key === clientKey
        ? { ...g, tasks: newGroupTasks.map(t => toTaskView(t)) }
        : g,
    );
    const flat = newGroups.flatMap(g => g.tasks.map(t => t.raw));
    onReorderTasks(day, flat);
  }, [clients, onReorderTasks]);

  // Client groups collapsed by default — toggle open/close per day+client.
  const [openClientGroups, setOpenClientGroups] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('sprint_open_cgroups');
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });
  useEffect(() => {
    localStorage.setItem('sprint_open_cgroups', JSON.stringify(Array.from(openClientGroups)));
  }, [openClientGroups]);
  const toggleClientGroup = (key: string) => setOpenClientGroups(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  // Inline "add task" form state — open per day
  const [addingForDay, setAddingForDay] = useState<DayOfWeek | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newClient, setNewClient] = useState<string>(''); // empty = "Sem cliente"
  const [newKind, setNewKind] = useState<TaskKind>('pontual');
  const [newEst, setNewEst] = useState<number | undefined>(undefined);
  const [newResp, setNewResp] = useState<string[]>([]);

  const resetAddForm = () => {
    setAddingForDay(null);
    setNewTitle('');
    setNewClient('');
    setNewKind('pontual');
    setNewEst(undefined);
    setNewResp([]);
  };

  const startAdd = (day: DayOfWeek) => {
    setAddingForDay(day);
    setOpenDays(s => { const next = new Set(s); next.add(day); return next; });
  };

  const submitAdd = () => {
    if (!addingForDay) return;
    const title = newTitle.trim();
    if (!title) return;
    const dayTasks = weeklyTasks.filter(t => t.day === addingForDay && t.weekId === currentWeekId);
    const nextOrder = dayTasks.length ? Math.max(...dayTasks.map(t => t.order ?? 0)) + 1 : 0;
    onAddTask({
      weekId: currentWeekId,
      day: addingForDay,
      title,
      completed: false,
      order: nextOrder,
      clientId: newClient || undefined,
      kind: newKind,
      estimatedMinutes: newEst,
      responsibles: newResp.length ? newResp : undefined,
    });
    resetAddForm();
  };

  // Combo + UI feedback state
  const [confettiSeed, setConfettiSeed] = useState(0);
  const [nice, setNice] = useState<{ xp: number; combo: number; bonus?: string; title?: string } | null>(null);

  // Combo derivado da gamificação persistida — sobrevive a refresh.
  const currentCombo = useMemo(() => {
    const g = gamification.find(x => x.userId === user.uid);
    if (!g || !g.comboCount || !g.comboExpiresAt) return 0;
    return g.comboExpiresAt > Date.now() ? g.comboCount : 0;
  }, [gamification, user.uid]);
  const [comboTick, setComboTick] = useState(0); // força re-render quando o TTL expira
  useEffect(() => {
    const g = gamification.find(x => x.userId === user.uid);
    if (!g?.comboExpiresAt) return;
    const ms = g.comboExpiresAt - Date.now();
    if (ms <= 0) return;
    const t = setTimeout(() => setComboTick(v => v + 1), ms + 50);
    return () => clearTimeout(t);
  }, [gamification, user.uid, comboTick]);

  // Build sprint week view. Rituals are pinned and never filtered — they always
  // appear at the top of every day, regardless of client/person filters.
  const sprintDays: SprintDayView[] = useMemo(() => {
    const all = toSprintWeek(weeklyTasks, currentWeekId);
    return all.map(d => ({
      ...d,
      tasks: d.tasks.filter(t => {
        if (clientFilter !== '__all' && !t.clients.includes(clientFilter)) return false;
        if (personFilter !== '__all' && !t.people.includes(personFilter)) return false;
        return true;
      }),
    }));
  }, [weeklyTasks, currentWeekId, clientFilter, personFilter]);

  // Auto-open today (and clear other open days) when week changes to current.
  useEffect(() => {
    const today = sprintDays.find(d => d.today);
    if (today) setOpenDays(new Set([today.day]));
  }, [currentWeekId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deduplicate any existing ritual instances — guards against duplicates left
  // over from earlier sessions where materialization could race the Firestore
  // subscription. For each (ritualId, weekId, day) group, keep the oldest doc
  // and delete the rest. Runs only after Firestore has actually responded.
  const dedupedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!tasksLoaded) return;
    const groups = new Map<string, WeeklyTask[]>();
    for (const t of weeklyTasks) {
      if (!t.ritualId || t.weekId !== currentWeekId) continue;
      const key = `${t.ritualId}|${t.weekId}|${t.day}`;
      const arr = groups.get(key) || [];
      arr.push(t);
      groups.set(key, arr);
    }
    for (const [key, tasks] of groups) {
      if (tasks.length <= 1) continue;
      if (dedupedRef.current.has(key)) continue;
      dedupedRef.current.add(key);
      const sorted = [...tasks].sort((a, b) => a.id.localeCompare(b.id));
      for (let i = 1; i < sorted.length; i++) onDeleteTask(sorted[i].id);
    }
  }, [tasksLoaded, weeklyTasks, currentWeekId, onDeleteTask]);

  // Materialize daily rituals — rituals are universal: they appear on every
  // weekday of the current week, regardless of any per-ritual daysOfWeek config.
  // Gated by tasksLoaded so we don't double-create while Firestore is still
  // delivering the initial snapshot. Idempotent.
  const ritualPendingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!tasksLoaded) return;
    if (!rituals.length) return;
    const allWeekdays: DayOfWeek[] = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
    for (const r of rituals) {
      for (const day of allWeekdays) {
        const key = `${r.id}|${currentWeekId}|${day}`;
        if (ritualPendingRef.current.has(key)) continue;
        const exists = weeklyTasks.some(t => t.ritualId === r.id && t.weekId === currentWeekId && t.day === day);
        if (exists) continue;
        ritualPendingRef.current.add(key);
        const baseOrder = r.position === 'top' ? -1000 + (r.order ?? 0) : 9000 + (r.order ?? 0);
        onAddTask({
          weekId: currentWeekId,
          day,
          title: r.title,
          completed: false,
          order: baseOrder,
          clientId: r.clientId,
          ritualId: r.id,
          kind: r.kind ?? 'recorrente',
          estimatedMinutes: r.estimatedMinutes,
          responsibles: r.responsibles?.length ? r.responsibles : undefined,
        });
      }
    }
    // Clear pending keys whose tasks have now appeared in state.
    for (const key of Array.from(ritualPendingRef.current)) {
      const [rid, wid, day] = key.split('|');
      if (weeklyTasks.some(t => t.ritualId === rid && t.weekId === wid && t.day === (day as DayOfWeek))) {
        ritualPendingRef.current.delete(key);
      }
    }
  }, [tasksLoaded, rituals, currentWeekId, weeklyTasks, onAddTask]);

  // Overdue tasks (atrasadas) — incomplete tasks from past weeks. Shown at the top
  // so the team knows what to reallocate. Sorted oldest first.
  const overdueTasks = useMemo(() => {
    return incompleteTasks
      .filter(t => t.weekId < currentWeekId)
      .map(t => toTaskView(t))
      .filter(t => {
        if (clientFilter !== '__all' && !t.clients.includes(clientFilter)) return false;
        if (personFilter !== '__all' && !t.people.includes(personFilter)) return false;
        return true;
      })
      .sort((a, b) => (a.raw.weekId).localeCompare(b.raw.weekId));
  }, [incompleteTasks, currentWeekId, clientFilter, personFilter]);

  const [overdueOpen, setOverdueOpen] = useState(true);

  const allVisibleTasks = useMemo(() => sprintDays.flatMap(d => [...d.rituals, ...d.tasks]), [sprintDays]);
  const totalCount = allVisibleTasks.length;
  const doneCount = allVisibleTasks.filter(t => t.completed).length;
  const totalMinutes = allVisibleTasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);
  const pct = totalCount ? (doneCount / totalCount) * 100 : 0;

  // Current user's gamification entry
  const myG: UserGamification = useMemo(() => {
    const found = gamification.find(g => g.userId === user.uid);
    return found || { userId: user.uid, xp: 0, level: 1, streak: 0 };
  }, [gamification, user.uid]);
  const { level, intoLevel, needed } = levelFromXp(myG.xp);

  // Keywords do foco da semana (para bônus de XP em tasks alinhadas).
  const focusKW = useMemo(() => focusKeywords(sprintFocus?.text ?? ''), [sprintFocus]);

  // Toggle task with gamification side-effects
  const handleToggleTask = useCallback((task: SprintTaskView, ev: React.ChangeEvent<HTMLInputElement>) => {
    const willComplete = !task.completed;
    // Anti-exploit: marca xpAwarded na PRIMEIRA conclusão. Desmarcar não estorna; recompletar não paga.
    const alreadyAwarded = task.raw.xpAwarded === true;
    const nextRaw: WeeklyTask = {
      ...task.raw,
      completed: willComplete,
      xpAwarded: alreadyAwarded || willComplete ? true : task.raw.xpAwarded,
    };
    onUpdateTask(nextRaw);

    if (!willComplete || alreadyAwarded) return;

    // Reward base por dificuldade
    let reward = rewardForTask(task.estimatedMinutes, task.raw.priority, task.kind);

    // Combo (persistido). Se ainda dentro do TTL, incrementa; senão começa em 1.
    const now = Date.now();
    const prevCombo = (myG.comboExpiresAt ?? 0) > now ? (myG.comboCount ?? 0) : 0;
    const newCombo = prevCombo + 1;
    const comboBonus = (newCombo - 1) * 5;
    reward += comboBonus;

    // Bônus de foco da semana
    let bonusLabel: string | undefined;
    if (taskMatchesFocus(task.title, focusKW)) {
      reward += 10;
      bonusLabel = 'foco da semana';
    }

    // Streak + meta diária. Só conta como "dia ativo" se bater a meta.
    const today = todayISO();
    const goal = myG.dailyGoal ?? DEFAULT_DAILY_GOAL;
    const sameDay = myG.dailyCountedDate === today;
    const newDailyCompleted = (sameDay ? (myG.dailyCompleted ?? 0) : 0) + 1;
    const reachedGoalNow = sameDay
      ? newDailyCompleted === goal // bateu agora
      : newDailyCompleted >= goal; // primeira do dia já bate (goal=1)

    let nextStreak = myG.streak ?? 0;
    let nextLastActive = myG.lastActiveDate;
    if (reachedGoalNow) {
      if (myG.lastActiveDate === today) {
        // já contou hoje (não deveria entrar aqui pelo guard sameDay, mas mantém safe)
        nextStreak = Math.max(1, nextStreak);
      } else if (myG.lastActiveDate) {
        const diff = daysBetween(myG.lastActiveDate, today);
        nextStreak = diff === 1 ? nextStreak + 1 : 1;
      } else {
        nextStreak = 1;
      }
      nextLastActive = today;
    }

    const newXp = (myG.xp ?? 0) + reward;
    const prevLevel = levelFromXp(myG.xp ?? 0).level;
    const newLevel = levelFromXp(newXp).level;
    const leveledUp = newLevel > prevLevel;

    // Avaliação de badges com o ESTADO NOVO (pós-update)
    const newTotal = (myG.totalCompleted ?? 0) + 1;
    const newBestStreak = Math.max(myG.bestStreak ?? 0, nextStreak);
    const earned = newlyEarnedBadges(
      { xp: newXp, level: newLevel, streak: nextStreak, totalCompleted: newTotal, bestStreak: newBestStreak, comboCount: newCombo },
      myG.badges ?? [],
    );
    const allBadges = [...(myG.badges ?? []), ...earned];

    onUpdateGamification({
      userId: user.uid,
      xp: newXp,
      level: newLevel,
      streak: nextStreak,
      lastActiveDate: nextLastActive,
      totalCompleted: newTotal,
      dailyGoal: goal,
      dailyCompleted: newDailyCompleted,
      dailyCountedDate: today,
      bestStreak: newBestStreak,
      comboCount: newCombo,
      comboExpiresAt: now + COMBO_TTL_MS,
      badges: allBadges,
      completedMissions: myG.completedMissions,
    });

    if (prefs.confetti) setConfettiSeed(Date.now());
    const voice = pickVoiceLine();
    if (prefs.sound) playSound(voice.sound);
    const rect = (ev.target as HTMLElement).getBoundingClientRect();
    spawnXPFloater(rect, reward);

    // Prioridade do "bonus label" no popup: badge > level-up > streak > foco
    let popupBonus = bonusLabel;
    if (earned.length) {
      const b = badgeById(earned[0]);
      if (b) popupBonus = `Novo badge: ${b.icon} ${b.name}`;
    } else if (leveledUp) {
      popupBonus = `Subiu para o Nv. ${newLevel}!`;
    } else if (reachedGoalNow) {
      popupBonus = `Streak ${nextStreak}🔥`;
    }

    setNice({ xp: reward, combo: newCombo, bonus: popupBonus, title: voice.title });
    if (earned.length > 1) {
      // Empilha o segundo+ badges como toasts simples (1 por vez via setNice — substitui depois de 2.2s)
      setTimeout(() => {
        const b = badgeById(earned[1]);
        if (b) setNice({ xp: 0, combo: 0, bonus: `Novo badge: ${b.icon} ${b.name}` });
      }, 2300);
    }
  }, [onUpdateTask, onUpdateGamification, myG, user.uid, prefs.confetti, prefs.sound, focusKW]);

  // Filters active?
  const filtersActive = clientFilter !== '__all' || personFilter !== '__all';
  const clearFilters = () => { setClientFilter('__all'); setPersonFilter('__all'); };

  // Ranking
  const gamificationMap = useMemo(() => {
    const map: Record<string, { xp: number; streak: number }> = {};
    for (const g of gamification) map[g.userId] = { xp: g.xp, streak: g.streak };
    // Surface current user's gamification under linkedMember if any
    if (linkedMemberId && map[user.uid]) {
      map[linkedMemberId] = map[user.uid];
    }
    return map;
  }, [gamification, linkedMemberId, user.uid]);

  const ranking = useMemo(
    () => buildRanking(teamMembers, weeklyTasks, gamificationMap),
    [teamMembers, weeklyTasks, gamificationMap],
  );

  // Missions
  const missions: Mission[] = useMemo(() => {
    const punctualDone = allVisibleTasks.filter(t => t.completed && t.kind === 'pontual').length;
    const mondayTasks = sprintDays.find(d => d.day === 'Segunda')?.tasks ?? [];
    const mondayDone = mondayTasks.filter(t => t.completed).length;
    return [
      { id: 'm1', title: 'Concluir 10 tarefas pontuais', progress: Math.min(10, punctualDone), target: 10, sub: 'tarefas pontuais', xp: 50, icon: <Icon.Zap size={18} /> },
      { id: 'm2', title: 'Zerar a segunda-feira', progress: mondayDone, target: Math.max(1, mondayTasks.length), sub: 'tarefas de segunda', xp: 80, icon: <Icon.Target size={18} /> },
      { id: 'm3', title: 'Manter streak de 14 dias', progress: myG.streak, target: 14, sub: 'dias seguidos', xp: 120, icon: <Icon.Flame size={18} /> },
      { id: 'm4', title: 'Combo x5', progress: Math.max(currentCombo, 0), target: 5, sub: 'tarefas em sequência', xp: 60, icon: <Icon.Trophy size={18} /> },
    ];
  }, [allVisibleTasks, sprintDays, myG.streak, currentCombo]);

  // Missões pagas (set rápido)
  const paidMissions = useMemo(() => {
    const s = new Set<string>();
    for (const k of myG.completedMissions ?? []) {
      const [wk, mid] = k.split(':');
      if (wk === currentWeekId && mid) s.add(mid);
    }
    return s;
  }, [myG.completedMissions, currentWeekId]);

  // Auto-credita missões completas que ainda não foram pagas (1 update por trigger).
  useEffect(() => {
    const toPay = missions.filter(m => m.progress >= m.target && !paidMissions.has(m.id));
    if (!toPay.length) return;
    const addedXp = toPay.reduce((a, m) => a + m.xp, 0);
    const newKeys = toPay.map(m => `${currentWeekId}:${m.id}`);
    const newXp = (myG.xp ?? 0) + addedXp;
    const prevLevel = levelFromXp(myG.xp ?? 0).level;
    const newLevel = levelFromXp(newXp).level;
    onUpdateGamification({
      ...myG,
      userId: user.uid,
      xp: newXp,
      level: newLevel,
      completedMissions: [...(myG.completedMissions ?? []), ...newKeys],
    });
    // Toast simples — só uma linha agregada para não spammar
    const first = toPay[0];
    setNice({
      xp: addedXp,
      combo: 0,
      bonus: toPay.length === 1
        ? `Missão concluída: ${first.title}`
        : `${toPay.length} missões concluídas`,
    });
    if (newLevel > prevLevel && prefs.sound) playPing();
  }, [missions, paidMissions, currentWeekId, myG, user.uid, onUpdateGamification, prefs.sound]);

  // Account info (header / right panel user card)
  const accountName = user.displayName || user.email?.split('@')[0] || 'Você';
  const accountEmail = user.email || '';
  const accountAvatar = user.photoURL || undefined;

  // Tweaks panel toggle
  const [tweaksOpen, setTweaksOpen] = useState(false);

  // Ranking mode (week vs all-time)
  const [rankMode, setRankMode] = useState<'week' | 'all'>(() => {
    return (localStorage.getItem('sprint_rank_mode') as 'week' | 'all') || 'week';
  });
  useEffect(() => { localStorage.setItem('sprint_rank_mode', rankMode); }, [rankMode]);

  // Daily goal — exibido no header
  const dailyGoalTarget = myG.dailyGoal ?? DEFAULT_DAILY_GOAL;
  const dailyGoalToday = myG.dailyCountedDate === todayISO() ? (myG.dailyCompleted ?? 0) : 0;

  // Foco da semana — editor inline
  const [focusEditing, setFocusEditing] = useState(false);
  const [focusDraft, setFocusDraft] = useState('');
  const [focusCollapsed, setFocusCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sprint_focus_collapsed') === 'true';
  });
  useEffect(() => {
    localStorage.setItem('sprint_focus_collapsed', String(focusCollapsed));
  }, [focusCollapsed]);
  useEffect(() => {
    setFocusDraft(sprintFocus?.text ?? '');
  }, [sprintFocus?.text, currentWeekId]);
  const saveFocus = () => {
    onUpdateSprintFocus({
      weekId: currentWeekId,
      text: focusDraft.trim(),
      updatedBy: user.uid,
    });
    setFocusEditing(false);
  };
  const focusKWCount = focusKW.length;
  const focusedTasksDone = useMemo(() => {
    if (!focusKWCount) return { done: 0, total: 0 };
    let done = 0, total = 0;
    for (const t of allVisibleTasks) {
      if (taskMatchesFocus(t.title, focusKW)) {
        total++;
        if (t.completed) done++;
      }
    }
    return { done, total };
  }, [allVisibleTasks, focusKW, focusKWCount]);

  // Ritual editor state — DailyRitual being created (id='__new__') or edited.
  type RitualDraft = Omit<DailyRitual, 'id' | 'createdAt'> & { id: string };
  const [editingRitual, setEditingRitual] = useState<RitualDraft | null>(null);
  const startNewRitual = () => setEditingRitual({
    id: '__new__',
    title: '',
    position: 'top',
    order: rituals.length,
    daysOfWeek: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
  });
  const startEditRitual = (r: DailyRitual) => setEditingRitual({
    id: r.id, title: r.title, position: r.position, clientId: r.clientId,
    responsibles: r.responsibles, estimatedMinutes: r.estimatedMinutes,
    kind: r.kind, daysOfWeek: r.daysOfWeek?.length ? r.daysOfWeek : ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
    order: r.order,
  });
  const saveRitual = () => {
    if (!editingRitual) return;
    const title = editingRitual.title.trim();
    if (!title) return;
    if (editingRitual.id === '__new__') {
      const { id: _id, ...rest } = editingRitual;
      onAddRitual({ ...rest, title, createdAt: Date.now() });
    } else {
      const original = rituals.find(r => r.id === editingRitual.id);
      if (!original) return;
      onUpdateRitual({ ...original, ...editingRitual, title });
    }
    setEditingRitual(null);
  };
  return (
    <div ref={scopeRef} className="sprint-scope">
      <div className="shell" style={isMobile ? undefined : { gridTemplateColumns: prefs.showRightPanel ? `0 1fr var(--right-w)` : `0 1fr` }}>
        {!isMobile && <div />}

        <main className="main main--focus">
          <header className="focus-head">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <h1>Foco da Tropa</h1>
                <p className="focus-meta">
                  <span className="focus-meta__dot" />
                  Meta da semana: <strong>{doneCount}/{totalCount}</strong>
                  <span className="focus-meta__sep">·</span>
                  <span className="focus-meta__pct">{Math.round(pct)}%</span>
                  <span className="focus-meta__bar"><span style={{ width: `${pct}%` }} /></span>
                </p>
              </div>
              <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="chip chip--goal" title={`Meta diária: ${dailyGoalToday}/${dailyGoalTarget} tarefas`}>
                  <span className="chip__icon"><Icon.Target size={16} /></span>
                  <span>{dailyGoalToday}/{dailyGoalTarget}</span>
                  <span className="chip__bar"><span style={{ width: `${Math.min(100, (dailyGoalToday / dailyGoalTarget) * 100)}%` }} /></span>
                  <span className="chip__lbl">hoje</span>
                </div>
                <div className="chip chip--streak" title={`Sequência de dias batendo meta (recorde: ${myG.bestStreak ?? myG.streak ?? 0})`}>
                  <span className="chip__icon"><Icon.Flame size={16} /></span>
                  <span>{myG.streak}</span>
                  <span className="chip__lbl">dias</span>
                </div>
                <div className="chip chip--xp" title={`Nível ${level} — ${intoLevel}/${needed} XP`}>
                  <span className="chip__icon"><Icon.Sparkle size={16} /></span>
                  <span>Nv. {level}</span>
                  <span className="chip__bar"><span style={{ width: `${(intoLevel / needed) * 100}%` }} /></span>
                  <span className="chip__lbl">{intoLevel}/{needed}</span>
                </div>
                <button className="chip" onClick={() => setTweaksOpen(v => !v)} title="Preferências">
                  <span className="chip__icon"><Icon.Sparkle size={16} /></span>
                  <span>Ajustes</span>
                </button>
              </div>
            </div>

            <div className="date-pill" style={{ marginTop: 18, marginBottom: 0 }}>
              <button className="date-pill__nav" onClick={() => setCurrentWeekId(addWeeks(currentWeekId, -1))} title="Semana anterior">
                <Icon.ChevLeft size={16} />
              </button>
              <span className="date-pill__range">
                <Icon.Calendar size={14} />
                {weekRangeLabel(currentWeekId)}
              </span>
              <button className="date-pill__nav" onClick={() => setCurrentWeekId(addWeeks(currentWeekId, 1))} title="Próxima semana">
                <Icon.ChevRight size={16} />
              </button>
            </div>

            <div className={`focus-band${focusCollapsed ? ' focus-band--collapsed' : ''}`}>
              <span className="focus-band__icon" title="Foco da semana">🎯</span>
              {focusEditing ? (
                <>
                  <input
                    className="focus-band__input"
                    autoFocus
                    value={focusDraft}
                    placeholder="Ex: fechar onboarding do cliente X"
                    onChange={e => setFocusDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveFocus();
                      if (e.key === 'Escape') { setFocusDraft(sprintFocus?.text ?? ''); setFocusEditing(false); }
                    }}
                    onBlur={saveFocus}
                  />
                </>
              ) : sprintFocus?.text ? (
                <>
                  <button
                    className="focus-band__text"
                    onClick={() => setFocusEditing(true)}
                    title="Clique para editar"
                  >
                    {sprintFocus.text}
                  </button>
                  {!focusCollapsed && focusedTasksDone.total > 0 && (
                    <span className="focus-band__progress">
                      {focusedTasksDone.done}/{focusedTasksDone.total} tarefas alinhadas
                    </span>
                  )}
                </>
              ) : (
                <button
                  className="focus-band__placeholder"
                  onClick={() => setFocusEditing(true)}
                >
                  Defina o foco desta semana
                </button>
              )}
              <button
                className="focus-band__toggle"
                onClick={() => setFocusCollapsed(v => !v)}
                title={focusCollapsed ? 'Expandir' : 'Recolher'}
                aria-label={focusCollapsed ? 'Expandir foco' : 'Recolher foco'}
              >
                {focusCollapsed ? '+' : '–'}
              </button>
            </div>
          </header>

          {overdueTasks.length > 0 && (
            <div className="day glass overdue" data-open={overdueOpen ? 'true' : 'false'}>
              <header className="day__head" onClick={() => setOverdueOpen(v => !v)}>
                <div className="overdue__title">
                  ATRASADAS
                  <span className="overdue__count">{overdueTasks.length}</span>
                </div>
                <span className="day__chev"><Icon.ChevDown size={18} /></span>
              </header>
              {overdueOpen && (
                <div className="day__body">
                  {overdueTasks.map(task => {
                    const expanded = expandedTaskId === task.id;
                    const taskDate = new Date(task.raw.weekId);
                    // Compute scheduled date from weekId + day for accurate "X dias atrás"
                    const days: Record<DayOfWeek, number> = {
                      'Segunda': 0, 'Terça': 1, 'Quarta': 2, 'Quinta': 3, 'Sexta': 4, 'Sábado': 5, 'Domingo': 6,
                    };
                    taskDate.setDate(taskDate.getDate() + (days[task.raw.day] ?? 0));
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const daysLate = Math.max(1, Math.floor((today.getTime() - taskDate.getTime()) / 86400000));
                    return (
                      <div key={task.id} className="task-wrap">
                        <div className="task task--ungrouped" data-done="false">
                          <input
                            type="checkbox"
                            className="task__check"
                            checked={false}
                            onChange={(ev) => handleToggleTask(task, ev)}
                          />
                          <span className="task__bar" style={{ background: 'var(--danger)' }} />
                          <div className="task__title">
                            <span className="task__title-text" onClick={() => toggleExpand(task.id)}>
                              {task.title}
                            </span>
                            <span className="tag tag--urgente" title={`${daysLate} ${daysLate === 1 ? 'dia' : 'dias'} atrasada`}>{daysLate}d atrás</span>
                          </div>
                          <span className="task__time">
                            <Icon.Clock size={14} />
                            {task.estimatedMinutes > 0 ? fmtMinutes(task.estimatedMinutes) : '—'}
                          </span>
                          <span className="avatars">
                            {task.people.map(id => {
                              const p = teamMembers.find(t => t.id === id);
                              if (!p) return null;
                              const initials = p.name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
                              return (
                                <span key={id} className="avatar" title={p.name}>
                                  {p.photoUrl ? <img src={p.photoUrl} alt="" /> : initials}
                                </span>
                              );
                            })}
                          </span>
                        </div>
                        {expanded && (
                          <TaskDetail task={task} team={teamMembers} clients={clients}
                            currentUserName={accountName}
                            onUpdate={onUpdateTask}
                            onDelete={() => { setExpandedTaskId(null); onDeleteTask(task.id); }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {sprintDays.map(d => (
            <div key={d.day} className="day glass"
              data-open={openDays.has(d.day) ? 'true' : 'false'}
              data-today={d.today ? 'true' : 'false'}>
              <header className="day__head" onClick={() => toggleDay(d.day)}>
                <div className="day__title">
                  {d.day.toUpperCase()}
                  <span className="day__count">{d.rituals.length + d.tasks.length}</span>
                </div>
                <span className="day__head-right">
                  <button className="day__add-btn"
                    onClick={(e) => { e.stopPropagation(); startAdd(d.day); }}
                    title="Adicionar tarefa">
                    <Icon.Plus size={14} />
                  </button>
                  <span className="day__chev"><Icon.ChevDown size={18} /></span>
                </span>
              </header>
              {addingForDay === d.day && (
                <div className="day-add" onClick={e => e.stopPropagation()}>
                  <input
                    autoFocus
                    className="day-add__title"
                    placeholder="Título da tarefa…"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitAdd();
                      if (e.key === 'Escape') resetAddForm();
                    }}
                  />
                  <div className="day-add__row">
                    <select className="task-detail__select" value={newClient} onChange={e => setNewClient(e.target.value)} title="Cliente">
                      <option value="">Sem cliente</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <select className="task-detail__select" value={newKind} onChange={e => setNewKind(e.target.value as TaskKind)} title="Tipo">
                      <option value="pontual">Pontual</option>
                      <option value="recorrente">Recorrente</option>
                      <option value="urgente">Urgente</option>
                    </select>
                    <EstimatedTimePicker value={newEst} onChange={(v: number | undefined) => setNewEst(v)} size="sm" />
                  </div>
                  <div className="day-add__row">
                    {teamMembers.length === 0 && (
                      <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Sem membros cadastrados.</span>
                    )}
                    {teamMembers.map(m => {
                      const active = newResp.includes(m.id);
                      const initials = m.name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
                      return (
                        <button key={m.id} className="task-detail__chip" data-active={active ? 'true' : 'false'}
                          onClick={() => setNewResp(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])}>
                          <span className="avatar">
                            {m.photoUrl ? <img src={m.photoUrl} alt="" /> : <span style={{ fontSize: 9, fontWeight: 700 }}>{initials}</span>}
                          </span>
                          {m.name.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                  <div className="day-add__actions">
                    <button className="day-add__submit" disabled={!newTitle.trim()} onClick={submitAdd}>
                      Adicionar
                    </button>
                    <button className="day-add__cancel" onClick={resetAddForm}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {openDays.has(d.day) && (
                <div className="day__body">
                  {d.rituals.length > 0 && (
                    <div className="rituals-pinned">
                      <div className="rituals-pinned__head">
                        <Icon.Flame size={13} />
                        <span>Rituais do dia</span>
                        <span className="rituals-pinned__count">{d.rituals.length}</span>
                      </div>
                      {d.rituals.map(task => {
                        const expanded = expandedTaskId === task.id;
                        // Always render the current ritual title — defends against
                        // stale instances missing a title field.
                        const ritual = rituals.find(r => r.id === task.raw.ritualId);
                        const displayTitle = ritual?.title || task.title || 'Ritual sem título';
                        const resolved = { ...task, title: displayTitle, raw: { ...task.raw, title: displayTitle } };
                        return (
                          <div key={task.id} className="ritual-task-wrap">
                            <TaskRow task={resolved} clients={clients} team={teamMembers}
                              onToggle={handleToggleTask} ungrouped={true}
                              onExpand={() => toggleExpand(task.id)} expanded={expanded} />
                            {expanded && (
                              <TaskDetail task={resolved} team={teamMembers} clients={clients}
                                currentUserName={accountName}
                                onUpdate={onUpdateTask}
                                onDelete={() => { setExpandedTaskId(null); onDeleteTask(task.id); }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {d.tasks.length === 0 ? (
                    d.rituals.length === 0 ? (
                      <div style={{ padding: '28px', color: 'var(--text-3)', fontSize: 13.5, textAlign: 'center' }}>
                        Nenhuma tarefa nesta visualização.
                      </div>
                    ) : null
                  ) : grouped ? (
                    groupTasksByClient(d.tasks, clients).map(g => {
                      const groupKey = `${d.day}_${g.key}`;
                      const groupOpen = openClientGroups.has(groupKey);
                      return (
                        <div key={g.key} className="cgroup" data-open={groupOpen ? 'true' : 'false'}>
                          <header className="cgroup__head" onClick={() => toggleClientGroup(groupKey)}>
                            <span className="cgroup__dot" style={{ ['--cgroup-color' as any]: g.color } as React.CSSProperties} />
                            <span className="cgroup__name">{g.name}</span>
                            <span className="cgroup__count">{g.tasks.length}</span>
                            <ClientReorderArrows
                              clientKey={g.key}
                              clients={clients}
                              onReorderClients={onReorderClients}
                            />
                            <span className="cgroup__time">{fmtMinutes(g.tasks.reduce((a, t) => a + t.estimatedMinutes, 0))}</span>
                            <span className="cgroup__chev"><Icon.ChevDown size={14} /></span>
                          </header>
                          {groupOpen && (
                            <Reorder.Group
                              axis="y"
                              values={g.tasks.map(t => t.raw)}
                              onReorder={(newTasks) => handleReorderInGroup(d.day, d.tasks, g.key, newTasks)}
                              as="div"
                            >
                              {g.tasks.map(task => {
                                const expanded = expandedTaskId === task.id;
                                return (
                                  <DraggableTaskItem key={task.id} task={task}>
                                    {(controls) => (
                                      <>
                                        <TaskRow task={task} clients={clients} team={teamMembers}
                                          onToggle={handleToggleTask} ungrouped={false}
                                          onExpand={() => toggleExpand(task.id)} expanded={expanded}
                                          dragControls={controls} />
                                        {expanded && (
                                          <TaskDetail task={task} team={teamMembers} clients={clients}
                                            currentUserName={accountName}
                                            onUpdate={onUpdateTask}
                                            onDelete={() => { setExpandedTaskId(null); onDeleteTask(task.id); }} />
                                        )}
                                      </>
                                    )}
                                  </DraggableTaskItem>
                                );
                              })}
                            </Reorder.Group>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <Reorder.Group
                      axis="y"
                      values={d.tasks.map(t => t.raw)}
                      onReorder={(newTasks) => onReorderTasks(d.day, newTasks)}
                      as="div"
                    >
                      {d.tasks.map(task => {
                        const expanded = expandedTaskId === task.id;
                        return (
                          <DraggableTaskItem key={task.id} task={task}>
                            {(controls) => (
                              <>
                                <TaskRow task={task} clients={clients} team={teamMembers}
                                  onToggle={handleToggleTask} ungrouped={true}
                                  onExpand={() => toggleExpand(task.id)} expanded={expanded}
                                  dragControls={controls} />
                                {expanded && (
                                  <TaskDetail task={task} team={teamMembers} clients={clients}
                                    currentUserName={accountName}
                                    onUpdate={onUpdateTask}
                                    onDelete={() => { setExpandedTaskId(null); onDeleteTask(task.id); }} />
                                )}
                              </>
                            )}
                          </DraggableTaskItem>
                        );
                      })}
                    </Reorder.Group>
                  )}
                </div>
              )}
            </div>
          ))}
        </main>

        {prefs.showRightPanel && (
          <aside className={'right' + (isMobile ? ' right--drawer' : '')}>
            {isMobile && (
              <button
                onClick={() => setPref('showRightPanel', false)}
                aria-label="Fechar"
                style={{
                  appearance: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  position: 'absolute', top: 14, right: 14, zIndex: 1,
                  background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                  color: 'var(--text)', width: 36, height: 36, borderRadius: '50%',
                  display: 'grid', placeItems: 'center',
                }}>
                <Icon.X size={16} />
              </button>
            )}
            <div className="right__user glass">
              <span className="avatar">
                {accountAvatar ? <img src={accountAvatar} alt="" /> : <span style={{
                  display: 'grid', placeItems: 'center', width: '100%', height: '100%', fontSize: 12, fontWeight: 700,
                }}>{accountName.slice(0, 2).toUpperCase()}</span>}
              </span>
              <div className="meta">
                <div className="name">{accountName}</div>
                <div className="email">{accountEmail}</div>
              </div>
              <span style={{ color: 'var(--text-3)' }}><Icon.ChevDown size={16} /></span>
            </div>

            <section className="card glass">
              <h3 className="card__title">
                <span>Progresso da semana</span>
                <span className="icon"><Icon.Target size={18} /></span>
              </h3>
              <div className="progress">
                <Donut pct={pct} />
                <div>
                  <div className="progress__num">{doneCount}/{totalCount}</div>
                  <div className="progress__lbl">tarefas concluídas</div>
                </div>
              </div>
              <div className="kv">
                <span className="kv__k">Pendentes</span>
                <span className="kv__v">{totalCount - doneCount} tarefas</span>
              </div>
              <div className="kv">
                <span className="kv__k">Tempo estimado total</span>
                <span className="kv__v">{fmtMinutes(totalMinutes)}</span>
              </div>
            </section>

            <RankingCard rows={ranking} youId={linkedMemberId} mode={rankMode} onModeChange={setRankMode} />
            <MissionsCard missions={missions} paid={paidMissions} />

            <StatsCard
              totalCompleted={myG.totalCompleted ?? 0}
              bestStreak={myG.bestStreak ?? 0}
              xp={myG.xp ?? 0}
            />

            <BadgesCard owned={myG.badges ?? []} />

            {!linkedMemberId && teamMembers.length > 0 && (
              <section className="card glass">
                <h3 className="card__title">
                  <span>Quem é você no time?</span>
                  <span className="icon"><Icon.User size={18} /></span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {teamMembers.map(m => (
                    <button key={m.id}
                      onClick={() => setLinkedMemberId(m.id)}
                      style={{
                        appearance: 'none', textAlign: 'left', cursor: 'pointer',
                        background: 'var(--surface-2)', color: 'var(--text)',
                        border: '1px solid var(--hairline)', borderRadius: 10,
                        padding: '8px 12px', fontFamily: 'inherit', fontSize: 13.5,
                      }}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </aside>
        )}
      </div>

      {/* Floating dock — filtros + visualização + toggles */}
      <div className="dock" data-shifted={prefs.showRightPanel ? 'true' : 'false'}>
        <div className="dock__inner">
          <DockFilter
            label="Cliente"
            value={clientFilter}
            options={clients.map(c => ({ id: c.id, name: c.name, color: c.color }))}
            onChange={setClientFilter}
            icon={<Icon.Folder size={14} />}
          />
          <span className="dock__div" />
          <DockFilter
            label="Responsável"
            value={personFilter}
            options={teamMembers.map(m => ({ id: m.id, name: m.name }))}
            onChange={setPersonFilter}
            icon={<Icon.User size={14} />}
          />
          {filtersActive && (
            <button className="dock__clear" onClick={clearFilters} title="Limpar filtros">
              <Icon.X size={14} />
              Limpar
            </button>
          )}

          <span className="dock__div" />

          <div className="dock-toggle" role="tablist" aria-label="Visualização">
            <button data-active={!grouped} onClick={() => setGrouped(false)} title="Lista">
              <Icon.List size={14} />
              <span>Lista</span>
            </button>
            <button data-active={grouped} onClick={() => setGrouped(true)} title="Por cliente">
              <Icon.Folder size={14} />
              <span>Por cliente</span>
            </button>
          </div>

          <span className="dock__div" />

          <button
            className="dock__icon-btn"
            data-active={prefs.showRightPanel ? 'true' : 'false'}
            onClick={() => setPref('showRightPanel', !prefs.showRightPanel)}
            title={prefs.showRightPanel ? 'Esconder progresso & ranking' : 'Mostrar progresso & ranking'}
          >
            <Icon.Trophy size={15} />
            <span>Ranking</span>
          </button>
        </div>
      </div>

      <ComboBanner multiplier={currentCombo} />

      {nice && prefs.confetti && <Confetti seed={confettiSeed} />}
      {nice && <NicePopup xp={nice.xp} combo={nice.combo} bonus={nice.bonus} title={nice.title} onDone={() => setNice(null)} />}

      {tweaksOpen && (
        <div role="dialog"
          aria-modal="true"
          onClick={() => setTweaksOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
            display: 'grid', placeItems: 'center', padding: 24,
          }}>
          <div onClick={e => e.stopPropagation()}
            className="glass"
            style={{
              maxWidth: 380, width: '100%', padding: 22,
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Preferências</h3>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, letterSpacing: '.08em', textTransform: 'uppercase' }}>Cor de destaque</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['#6366f1', '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ec4899'].map(c => (
                  <button key={c} onClick={() => setPref('accent', c)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
                      background: c, border: prefs.accent === c ? '3px solid #fff' : '1px solid var(--hairline)',
                    }} />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, letterSpacing: '.08em', textTransform: 'uppercase' }}>Tema</div>
              <div className="dock-toggle">
                {(['dark', 'light'] as const).map(t => (
                  <button key={t} data-active={prefs.theme === t} onClick={() => setPref('theme', t)}>
                    {t === 'dark' ? 'Escuro' : 'Claro'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, letterSpacing: '.08em', textTransform: 'uppercase' }}>Densidade</div>
              <div className="dock-toggle">
                {(['compact', 'regular', 'cozy'] as const).map(t => (
                  <button key={t} data-active={prefs.density === t} onClick={() => setPref('density', t)}>
                    {t === 'compact' ? 'Compacto' : t === 'cozy' ? 'Espaçoso' : 'Padrão'}
                  </button>
                ))}
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13.5 }}>
              <span>Confete ao concluir</span>
              <input type="checkbox" checked={prefs.confetti} onChange={e => setPref('confetti', e.target.checked)} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13.5 }}>
              <span>Som sutil</span>
              <input type="checkbox" checked={prefs.sound} onChange={e => setPref('sound', e.target.checked)} />
            </label>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5, marginBottom: 6 }}>
                <span>Meta diária de tarefas</span>
                <strong>{dailyGoalTarget}</strong>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={dailyGoalTarget}
                onChange={e => {
                  const v = Number(e.target.value);
                  onUpdateGamification({ ...myG, userId: user.uid, dailyGoal: v });
                }}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                Quantas tarefas você precisa concluir no dia para manter a streak.
              </div>
            </div>

            {/* Rituais diários */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, letterSpacing: '.08em', textTransform: 'uppercase' }}>Rituais diários</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rituals.map(r => (
                  <div key={r.id} className="ritual-row">
                    <div className="ritual-row__main">
                      <span className="ritual-row__title">{r.title}</span>
                      <span className="ritual-row__meta">
                        Todo dia útil
                        {r.estimatedMinutes ? ` · ${fmtMinutes(r.estimatedMinutes)}` : ''}
                      </span>
                    </div>
                    <button className="ritual-row__btn" onClick={() => startEditRitual(r)} title="Editar">
                      <Icon.Edit size={14} />
                    </button>
                    <button className="ritual-row__btn ritual-row__btn--danger"
                      onClick={() => { if (confirm(`Excluir ritual "${r.title}"? As instâncias já criadas serão mantidas.`)) onDeleteRitual(r.id); }}
                      title="Excluir">
                      <Icon.Trash size={14} />
                    </button>
                  </div>
                ))}

                {editingRitual && (
                  <div className="ritual-editor">
                    <input type="text"
                      autoFocus
                      placeholder="Ex: Revisar caixa de entrada"
                      value={editingRitual.title}
                      onChange={e => setEditingRitual({ ...editingRitual, title: e.target.value })}
                    />
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                      Aparece fixo no topo de todo dia útil, sem ser afetado por filtros.
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <EstimatedTimePicker
                        value={editingRitual.estimatedMinutes}
                        onChange={(v: number | undefined) => setEditingRitual({ ...editingRitual, estimatedMinutes: v })}
                        size="sm"
                      />
                      <select className="task-detail__select"
                        value={editingRitual.kind ?? 'recorrente'}
                        onChange={e => setEditingRitual({ ...editingRitual, kind: e.target.value as TaskKind })}>
                        <option value="pontual">Pontual</option>
                        <option value="recorrente">Recorrente</option>
                        <option value="urgente">Urgente</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={saveRitual}
                        disabled={!editingRitual.title.trim()}
                        style={{
                          appearance: 'none', cursor: 'pointer', fontFamily: 'inherit',
                          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                          border: 0, color: '#fff', borderRadius: 10, padding: '8px 14px', fontWeight: 600, fontSize: 13,
                          opacity: editingRitual.title.trim() ? 1 : 0.5,
                        }}>
                        Salvar
                      </button>
                      <button onClick={() => setEditingRitual(null)}
                        style={{
                          appearance: 'none', cursor: 'pointer', fontFamily: 'inherit',
                          background: 'transparent', border: 0, color: 'var(--text-3)', fontSize: 13, padding: '8px 10px',
                        }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {!editingRitual && (
                  <button className="ritual-add-btn" onClick={startNewRitual}>
                    <Icon.Plus size={14} />
                    Adicionar ritual
                  </button>
                )}
              </div>
            </div>

            <button onClick={() => setTweaksOpen(false)}
              style={{
                appearance: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                border: 0, color: '#fff', borderRadius: 12, padding: '10px 16px', fontWeight: 600,
              }}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
