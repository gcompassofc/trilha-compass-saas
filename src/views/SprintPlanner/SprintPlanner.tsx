import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { Client, DayOfWeek, SubTask, TaskComment, TaskKind, TaskType, TeamMember, UserGamification, WeeklyTask } from '../../types';
import { Icon } from './Icons';
import { buildRanking, clientById, SprintDayView, SprintTaskView, toSprintWeek, toTaskView } from './adapter';
import { fmtMinutes, levelFromXp, parseTimeText, playPing, spawnXPFloater, todayISO, daysBetween } from './utils';
import Timer from '../../components/Timer';
import EstimatedTimePicker from '../../components/EstimatedTimePicker';
import './sprint.css';

interface SprintPlannerProps {
  user: User;
  clients: Client[];
  weeklyTasks: WeeklyTask[];
  teamMembers: TeamMember[];
  incompleteTasks: WeeklyTask[];
  currentWeekId: string;
  setCurrentWeekId: (weekId: string) => void;
  onUpdateTask: (task: WeeklyTask) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (task: Omit<WeeklyTask, 'id'>) => void;
  gamification: UserGamification[];
  onUpdateGamification: (entry: UserGamification) => void;
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
  sound: false,
};

const PREFS_KEY = 'sprint_planner_prefs';
const PREFS_VERSION = 2;

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<Prefs> & { __v?: number };
    // Migration: force ranking off by default; users opt-in by clicking the dock toggle.
    if ((parsed.__v ?? 0) < PREFS_VERSION) {
      return { ...DEFAULT_PREFS, ...parsed, showRightPanel: false };
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
function TaskRow({ task, clients, team, onToggle, ungrouped, onExpand, expanded }: {
  task: SprintTaskView;
  clients: Client[];
  team: TeamMember[];
  onToggle: (task: SprintTaskView, ev: React.ChangeEvent<HTMLInputElement>) => void;
  ungrouped: boolean;
  onExpand: () => void;
  expanded: boolean;
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
  return (
    <div className={'task' + (ungrouped ? ' task--ungrouped' : '')} data-done={task.completed ? 'true' : 'false'}>
      <input
        type="checkbox"
        className="task__check"
        checked={task.completed}
        onChange={ev => onToggle(task, ev)}
      />
      {ungrouped && <span className="task__bar" style={{ background: barBg }} />}
      <div className="task__title">
        <span className="task__title-text" onClick={onExpand} aria-expanded={expanded}>{task.title}</span>
        <span className={tagClass}>{kindLabel}</span>
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

// ── TaskDetail (expanded panel under a row) ─────────────────────────────────
function TaskDetail({ task, team, currentUserName, onUpdate, onDelete }: {
  task: SprintTaskView;
  team: TeamMember[];
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

      {/* Properties row */}
      <div>
        <div className="task-detail__section-title">Propriedades</div>
        <div className="task-detail__row">
          <select className="task-detail__select" value={task.kind} onChange={e => setKind(e.target.value as TaskKind)} title="Tipo da tarefa">
            <option value="pontual">Pontual</option>
            <option value="recorrente">Recorrente</option>
            <option value="urgente">Urgente</option>
          </select>

          <div className="task-detail__seg" role="tablist" aria-label="Escopo">
            <button data-active={raw.taskType !== 'overdelivery'} onClick={() => setType('scope')}>Escopo</button>
            <button data-active={raw.taskType === 'overdelivery'} onClick={() => setType('overdelivery')}>Overdelivery</button>
          </div>

          <input
            type="date"
            className="task-detail__date"
            value={raw.dueDate || ''}
            onChange={e => setDueDate(e.target.value)}
            title="Data de entrega"
          />
          {raw.dueDate && (
            <button className="task-detail__chip" onClick={() => setDueDate(undefined)} title="Remover data">
              <Icon.X size={12} /> Sem data
            </button>
          )}

          <Timer item={raw} onChange={onUpdate} size="sm" />
          <EstimatedTimePicker value={raw.estimatedMinutes} onChange={v => onUpdate({ ...raw, estimatedMinutes: v })} size="sm" />
        </div>
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
          <div key={s.id} className="subtask" data-done={s.completed ? 'true' : 'false'}>
            <input type="checkbox" className="subtask__check" checked={s.completed} onChange={() => toggleSubtask(s.id)} />
            <span className="subtask__reorder">
              <button onClick={() => moveSubtask(s.id, -1)} disabled={idx === 0} title="Mover para cima">
                <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><Icon.ChevDown size={10} /></span>
              </button>
              <button onClick={() => moveSubtask(s.id, 1)} disabled={idx === subtasks.length - 1} title="Mover para baixo">
                <Icon.ChevDown size={10} />
              </button>
            </span>
            <input className="subtask__title" value={s.title}
              onChange={e => renameSubtask(s.id, e.target.value)}
              onBlur={e => { if (!e.target.value.trim()) deleteSubtask(s.id); }}
            />
            <Timer item={s} onChange={(next) => updateSubtask(s.id, next)} size="xs" />
            <EstimatedTimePicker value={s.estimatedMinutes} onChange={(v) => updateSubtask(s.id, { estimatedMinutes: v })} size="xs" />
            <button className="subtask__del" onClick={() => deleteSubtask(s.id)} title="Remover">
              <Icon.X size={14} />
            </button>
          </div>
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
function RankingCard({ rows, youId }: {
  rows: { member: TeamMember; done: number; total: number; xp: number; streak: number }[];
  youId?: string;
}) {
  return (
    <section className="card glass">
      <h3 className="card__title">
        <span>Ranking do time</span>
        <span className="icon"><Icon.Trophy size={18} /></span>
      </h3>
      {rows.map((r, i) => {
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
              {r.xp}
              <em>XP</em>
            </div>
          </div>
        );
      })}
      {rows.length === 0 && (
        <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-3)' }}>
          Adicione membros da equipe para ver o ranking.
        </div>
      )}
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

function MissionsCard({ missions }: { missions: Mission[] }) {
  return (
    <section className="card glass">
      <h3 className="card__title">
        <span>Missões da semana</span>
        <span className="icon"><Icon.Compass size={18} /></span>
      </h3>
      {missions.map(m => {
        const pct = Math.min(100, (m.progress / m.target) * 100);
        const done = m.progress >= m.target;
        return (
          <div key={m.id} className="mission" data-done={done ? 'true' : 'false'}>
            <div className="mission__icon">
              {done ? <Icon.Check size={18} /> : m.icon}
            </div>
            <div>
              <div className="mission__title">{m.title}</div>
              <div className="mission__sub">{m.progress}/{m.target} · {m.sub}</div>
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
function NicePopup({ xp, combo, onDone }: { xp: number; combo: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1900);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="nice" role="status">
      <div className="nice__icon">🎉</div>
      <div className="nice__title">Boa!</div>
      <div className="nice__sub">
        {combo > 1 ? `Combo x${combo} — você tá voando!` : 'Mais uma tarefa fora da lista.'}
      </div>
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
  user, clients, weeklyTasks, teamMembers, incompleteTasks, currentWeekId, setCurrentWeekId,
  onUpdateTask, onDeleteTask, onAddTask, gamification, onUpdateGamification,
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
  const [combo, setCombo] = useState(0);
  const [confettiSeed, setConfettiSeed] = useState(0);
  const [nice, setNice] = useState<{ xp: number; combo: number } | null>(null);
  const comboTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build sprint week view
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

  const allVisibleTasks = useMemo(() => sprintDays.flatMap(d => d.tasks), [sprintDays]);
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

  // Toggle task with gamification side-effects
  const handleToggleTask = useCallback((task: SprintTaskView, ev: React.ChangeEvent<HTMLInputElement>) => {
    const willComplete = !task.completed;
    onUpdateTask({ ...task.raw, completed: willComplete });
    if (!willComplete) return;

    setCombo(c => {
      const newC = c + 1;
      const reward = 10 + (newC - 1) * 5;

      // Streak math
      const today = todayISO();
      let nextStreak = myG.streak;
      if (myG.lastActiveDate !== today) {
        if (myG.lastActiveDate) {
          const diff = daysBetween(myG.lastActiveDate, today);
          nextStreak = diff === 1 ? myG.streak + 1 : 1;
        } else {
          nextStreak = 1;
        }
      }

      onUpdateGamification({
        userId: user.uid,
        xp: myG.xp + reward,
        level: levelFromXp(myG.xp + reward).level,
        streak: nextStreak,
        lastActiveDate: today,
        totalCompleted: (myG.totalCompleted ?? 0) + 1,
      });

      if (prefs.confetti) setConfettiSeed(Date.now());
      if (prefs.sound) playPing(660 + Math.min(newC, 8) * 60);
      const rect = (ev.target as HTMLElement).getBoundingClientRect();
      spawnXPFloater(rect, reward);
      setNice({ xp: reward, combo: newC });

      if (comboTimer.current) clearTimeout(comboTimer.current);
      comboTimer.current = setTimeout(() => setCombo(0), 3500);
      return newC;
    });
  }, [onUpdateTask, onUpdateGamification, myG, user.uid, prefs.confetti, prefs.sound]);

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
      { id: 'm4', title: 'Combo x5', progress: Math.max(combo, 0), target: 5, sub: 'tarefas em sequência', xp: 60, icon: <Icon.Trophy size={18} /> },
    ];
  }, [allVisibleTasks, sprintDays, myG.streak, combo]);

  // Account info (header / right panel user card)
  const accountName = user.displayName || user.email?.split('@')[0] || 'Você';
  const accountEmail = user.email || '';
  const accountAvatar = user.photoURL || undefined;

  // Tweaks panel toggle
  const [tweaksOpen, setTweaksOpen] = useState(false);

  return (
    <div ref={scopeRef} className="sprint-scope">
      <div className="bg-orbs"><span /></div>

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
                <div className="chip chip--streak" title="Sequência de dias batendo meta">
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
                          <TaskDetail task={task} team={teamMembers}
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
                  <span className="day__count">{d.tasks.length}</span>
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
                  {d.tasks.length === 0 ? (
                    <div style={{ padding: '28px', color: 'var(--text-3)', fontSize: 13.5, textAlign: 'center' }}>
                      Nenhuma tarefa nesta visualização.
                    </div>
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
                            <span className="cgroup__time">{fmtMinutes(g.tasks.reduce((a, t) => a + t.estimatedMinutes, 0))}</span>
                            <span className="cgroup__chev"><Icon.ChevDown size={14} /></span>
                          </header>
                          {groupOpen && g.tasks.map(task => {
                            const expanded = expandedTaskId === task.id;
                            return (
                              <div key={task.id} className="task-wrap">
                                <TaskRow task={task} clients={clients} team={teamMembers}
                                  onToggle={handleToggleTask} ungrouped={false}
                                  onExpand={() => toggleExpand(task.id)} expanded={expanded} />
                                {expanded && (
                                  <TaskDetail task={task} team={teamMembers}
                                    currentUserName={accountName}
                                    onUpdate={onUpdateTask}
                                    onDelete={() => { setExpandedTaskId(null); onDeleteTask(task.id); }} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  ) : (
                    d.tasks.map(task => {
                      const expanded = expandedTaskId === task.id;
                      return (
                        <div key={task.id} className="task-wrap">
                          <TaskRow task={task} clients={clients} team={teamMembers}
                            onToggle={handleToggleTask} ungrouped={true}
                            onExpand={() => toggleExpand(task.id)} expanded={expanded} />
                          {expanded && (
                            <TaskDetail task={task} team={teamMembers}
                              currentUserName={accountName}
                              onUpdate={onUpdateTask}
                              onDelete={() => { setExpandedTaskId(null); onDeleteTask(task.id); }} />
                          )}
                        </div>
                      );
                    })
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

            <RankingCard rows={ranking} youId={linkedMemberId} />
            <MissionsCard missions={missions} />

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

      <ComboBanner multiplier={combo} />

      {nice && prefs.confetti && <Confetti seed={confettiSeed} />}
      {nice && <NicePopup xp={nice.xp} combo={nice.combo} onDone={() => setNice(null)} />}

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
