import { Client, DayOfWeek, TaskKind, WeeklyTask, TeamMember } from '../../types';
import { getDateForDayOfWeek } from '../../utils/dateUtils';

export type RangePosition = 'start' | 'middle' | 'end' | 'single' | 'none';

export interface SprintTaskView {
  id: string;
  title: string;
  kind: TaskKind;
  estimatedMinutes: number;
  clients: string[];
  people: string[];
  completed: boolean;
  raw: WeeklyTask;
  /**
   * Posição da tarefa neste dia em relação ao intervalo (startDate→dueDate).
   * 'single' = intervalo de 1 dia ou sem startDate. 'none' = sem intervalo.
   */
  rangePosition: RangePosition;
  /** Posição 1-indexed do dia atual dentro do intervalo. 0 quando não há intervalo. */
  dayIndex: number;
  /** Total de dias do intervalo. 0 quando não há intervalo. */
  totalDays: number;
}

export interface SprintDayView {
  day: DayOfWeek;
  date: string; // YYYY-MM-DD
  today: boolean;
  rituals: SprintTaskView[]; // Pinned at the top of each day, never filtered.
  tasks: SprintTaskView[];
}

const DAYS_ORDER: DayOfWeek[] = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function inferKind(task: WeeklyTask): TaskKind {
  if (task.kind) return task.kind;
  if (task.priority === 'high') return 'urgente';
  if (task.taskType === 'overdelivery') return 'recorrente';
  return 'pontual';
}

function uniqueResponsibles(t: WeeklyTask): string[] {
  const list: string[] = [];
  if (t.responsible) list.push(t.responsible);
  for (const r of t.responsibles || []) {
    if (!list.includes(r)) list.push(r);
  }
  return list;
}

export function toTaskView(
  task: WeeklyTask,
  rangePosition: RangePosition = 'none',
  dayIndex = 0,
  totalDays = 0,
): SprintTaskView {
  return {
    id: task.id,
    title: task.title,
    kind: inferKind(task),
    estimatedMinutes: task.estimatedMinutes ?? 0,
    clients: task.clientId ? [task.clientId] : [],
    people: uniqueResponsibles(task),
    completed: task.completed,
    raw: task,
    rangePosition,
    dayIndex,
    totalDays,
  };
}

/** Conta dias inclusivos entre duas datas ISO (YYYY-MM-DD). */
function daysInclusive(startISO: string, endISO: string): number {
  const [sy, sm, sd] = startISO.split('-').map(Number);
  const [ey, em, ed] = endISO.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / 86400000) + 1;
}

/**
 * Decide se uma tarefa aparece num determinado dia D do sprint, e qual a sua
 * posição relativa ao intervalo (start/middle/end/single).
 *
 * Regras:
 *  - Se `startDate` e `dueDate` estão setados: tarefa aparece em todos os dias entre eles
 *    (inclusive). Posição = 'start' | 'middle' | 'end' | 'single' (quando start==due).
 *  - Caso contrário (legacy): tarefa aparece se `t.day === D`. Posição = 'none' (sem fita).
 */
function computeRangePosition(task: WeeklyTask, dayDate: string, dayName: DayOfWeek): RangePosition | null {
  const { startDate, dueDate } = task;
  if (startDate && dueDate && startDate <= dueDate) {
    if (dayDate < startDate || dayDate > dueDate) return null;
    if (startDate === dueDate) return 'single';
    if (dayDate === startDate) return 'start';
    if (dayDate === dueDate) return 'end';
    return 'middle';
  }
  // Legacy / sem intervalo: usa o `day` field.
  if (task.day === dayName) return 'none';
  return null;
}

export function toSprintWeek(weeklyTasks: WeeklyTask[], weekId: string): SprintDayView[] {
  const today = todayISO();
  return DAYS_ORDER.map(day => {
    const date = getDateForDayOfWeek(weekId, day);
    const dayEntries: { task: WeeklyTask; position: RangePosition; dayIndex: number; totalDays: number }[] = [];
    for (const t of weeklyTasks) {
      const pos = computeRangePosition(t, date, day);
      if (pos === null) continue;
      let dayIndex = 0;
      let totalDays = 0;
      if (t.startDate && t.dueDate && t.startDate <= t.dueDate) {
        totalDays = daysInclusive(t.startDate, t.dueDate);
        dayIndex = daysInclusive(t.startDate, date);
      }
      dayEntries.push({ task: t, position: pos, dayIndex, totalDays });
    }
    dayEntries.sort((a, b) => (a.task.order ?? 0) - (b.task.order ?? 0));
    const rituals = dayEntries
      .filter(e => e.task.ritualId)
      .map(e => toTaskView(e.task, e.position, e.dayIndex, e.totalDays));
    const tasks = dayEntries
      .filter(e => !e.task.ritualId)
      .map(e => toTaskView(e.task, e.position, e.dayIndex, e.totalDays));
    return { day, date, today: date === today, rituals, tasks };
  });
}

export interface RankingRow {
  member: TeamMember;
  done: number;
  total: number;
  xp: number;
  streak: number;
}

export function buildRanking(
  team: TeamMember[],
  tasks: WeeklyTask[],
  gamification: Record<string, { xp: number; streak: number }>,
): RankingRow[] {
  return team.map(member => {
    const memberTasks = tasks.filter(t => uniqueResponsibles(t).includes(member.id));
    const done = memberTasks.filter(t => t.completed).length;
    const total = memberTasks.length;
    const g = gamification[member.id] || { xp: 0, streak: 0 };
    return { member, done, total, xp: g.xp, streak: g.streak };
  }).sort((a, b) => b.xp - a.xp);
}

export function clientById(clients: Client[], id: string): Client | undefined {
  return clients.find(c => c.id === id);
}
