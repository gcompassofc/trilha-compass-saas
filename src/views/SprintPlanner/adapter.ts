import { Client, DayOfWeek, TaskKind, WeeklyTask, TeamMember } from '../../types';
import { getDateForDayOfWeek } from '../../utils/dateUtils';

export interface SprintTaskView {
  id: string;
  title: string;
  kind: TaskKind;
  estimatedMinutes: number;
  clients: string[];
  people: string[];
  completed: boolean;
  raw: WeeklyTask;
}

export interface SprintDayView {
  day: DayOfWeek;
  date: string; // YYYY-MM-DD
  today: boolean;
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

export function toTaskView(task: WeeklyTask): SprintTaskView {
  return {
    id: task.id,
    title: task.title,
    kind: inferKind(task),
    estimatedMinutes: task.estimatedMinutes ?? 0,
    clients: task.clientId ? [task.clientId] : [],
    people: uniqueResponsibles(task),
    completed: task.completed,
    raw: task,
  };
}

export function toSprintWeek(weeklyTasks: WeeklyTask[], weekId: string): SprintDayView[] {
  const today = todayISO();
  return DAYS_ORDER.map(day => {
    const date = getDateForDayOfWeek(weekId, day);
    const tasks = weeklyTasks
      .filter(t => t.day === day)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(toTaskView);
    return { day, date, today: date === today, tasks };
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
