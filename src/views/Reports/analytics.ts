// Relatórios — agregações puras das tarefas reais (Firestore).
// Substitui o mock `window.DASH` do protótipo: recebe WeeklyTask[] reais +
// clients + team e produz as séries que os componentes do dashboard consomem.

import { WeeklyTask, Client, TeamMember, TaskKind } from '../../types';
import { inferKind, uniqueResponsibles } from '../SprintPlanner/adapter';
import { getWeekId, getWeekIdFromDateString } from '../../utils/dateUtils';

export type TypeLabel = 'Pontual' | 'Recorrente' | 'Urgente';

const KIND_TO_LABEL: Record<TaskKind, TypeLabel> = {
  pontual: 'Pontual',
  recorrente: 'Recorrente',
  urgente: 'Urgente',
};

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export interface WeekBucket {
  key: string;
  weekId: string;       // segunda da semana (YYYY-MM-DD)
  start: Date;
  end: Date;
  label: string;        // "12 mai"
  rangeLabel: string;   // "12 mai – 18 mai"
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  minutes: number;
  byPerson: Record<string, number>;  // concluídas por pessoa
  byClient: Record<string, number>;  // minutos estimados por cliente
  byType: Record<TypeLabel, number>;
}

export interface OverdueItem {
  id: string;
  title: string;
  clientId?: string;
  personId?: string;
  daysLate: number;
  dueLabel: string; // "12 mai" — semana em que vencia
}

// ── Helpers de data (sem libs externas, alinhado ao resto do app) ───────────
function weekIdToDate(weekId: string): Date {
  const [y, m, d] = weekId.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtDay(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function diffWeeks(fromWeekId: string, toWeekId: string): number {
  const a = weekIdToDate(fromWeekId).getTime();
  const b = weekIdToDate(toWeekId).getTime();
  return Math.round((b - a) / (7 * 86400000));
}

/**
 * Em que semana uma tarefa concluída "conta" no histórico:
 *  - prioriza `completedAt` (timestamp real da conclusão);
 *  - senão (tarefas antigas), estima pela `dueDate`;
 *  - fallback final: a própria `weekId` da tarefa.
 * Migração leve em memória — não reescreve nada no Firestore.
 */
export function completionWeekId(t: WeeklyTask): string {
  if (t.completedAt) {
    return getWeekId(new Date(t.completedAt));
  }
  if (t.dueDate) {
    return getWeekIdFromDateString(t.dueDate);
  }
  return t.weekId;
}

function rateMinutesPerClient(t: WeeklyTask): { clientId: string; minutes: number }[] {
  const minutes = t.estimatedMinutes ?? 0;
  if (!minutes) return [];
  const ids = t.clientId ? [t.clientId] : [];
  if (ids.length === 0) return [];
  const share = minutes / ids.length;
  return ids.map(id => ({ clientId: id, minutes: share }));
}

/**
 * Constrói os buckets semanais entre `sinceWeekId` e a semana atual (inclusive),
 * a partir das tarefas reais. `completedTasks` alimenta concluídas/produtividade;
 * `incompleteTasks` alimenta pendentes/atrasadas.
 */
export function buildWeeks(
  completedTasks: WeeklyTask[],
  incompleteTasks: WeeklyTask[],
  sinceWeekId: string,
  currentWeekId: string,
): WeekBucket[] {
  const numWeeks = Math.max(1, diffWeeks(sinceWeekId, currentWeekId) + 1);
  const buckets = new Map<string, WeekBucket>();
  const order: string[] = [];

  const startDate = weekIdToDate(sinceWeekId);
  for (let i = 0; i < numWeeks; i++) {
    const start = addDays(startDate, i * 7);
    const weekId = getWeekId(start);
    const end = addDays(start, 6);
    const bucket: WeekBucket = {
      key: `w${i}`,
      weekId,
      start,
      end,
      label: fmtDay(start),
      rangeLabel: `${fmtDay(start)} – ${fmtDay(end)}`,
      total: 0,
      completed: 0,
      pending: 0,
      overdue: 0,
      minutes: 0,
      byPerson: {},
      byClient: {},
      byType: { Pontual: 0, Recorrente: 0, Urgente: 0 },
    };
    buckets.set(weekId, bucket);
    order.push(weekId);
  }

  const addToBucket = (weekId: string, t: WeeklyTask, completed: boolean) => {
    const b = buckets.get(weekId);
    if (!b) return; // fora da janela do dashboard
    b.total += 1;
    b.byType[KIND_TO_LABEL[inferKind(t)]] += 1;
    const mins = t.estimatedMinutes ?? 0;
    b.minutes += mins;
    rateMinutesPerClient(t).forEach(({ clientId, minutes }) => {
      b.byClient[clientId] = (b.byClient[clientId] || 0) + minutes;
    });
    if (completed) {
      b.completed += 1;
      uniqueResponsibles(t).forEach(pid => {
        b.byPerson[pid] = (b.byPerson[pid] || 0) + 1;
      });
    } else {
      b.pending += 1;
    }
  };

  completedTasks.forEach(t => addToBucket(completionWeekId(t), t, true));
  // Pendentes contam na sua própria semana; as de semanas passadas viram "atrasadas".
  incompleteTasks.forEach(t => {
    addToBucket(t.weekId, t, false);
    if (t.weekId < currentWeekId) {
      const b = buckets.get(t.weekId);
      if (b) b.overdue += 1;
    }
  });

  return order.map(id => buckets.get(id)!);
}

export interface Aggregate {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  minutes: number;
  byPerson: Record<string, number>;
  byClient: Record<string, number>;
  byType: Record<TypeLabel, number>;
}

export function aggregateWeeks(weeks: WeekBucket[]): Aggregate {
  const a: Aggregate = {
    total: 0, completed: 0, pending: 0, overdue: 0, minutes: 0,
    byPerson: {}, byClient: {}, byType: { Pontual: 0, Recorrente: 0, Urgente: 0 },
  };
  weeks.forEach(w => {
    a.total += w.total;
    a.completed += w.completed;
    a.pending += w.pending;
    a.overdue += w.overdue;
    a.minutes += w.minutes;
    Object.entries(w.byPerson).forEach(([k, v]) => (a.byPerson[k] = (a.byPerson[k] || 0) + v));
    Object.entries(w.byClient).forEach(([k, v]) => (a.byClient[k] = (a.byClient[k] || 0) + v));
    (Object.keys(w.byType) as TypeLabel[]).forEach(k => (a.byType[k] += w.byType[k]));
  });
  return a;
}

// Ranking de pessoas por nº de tarefas concluídas no período.
export interface RankingRow { member: TeamMember; count: number; }
export function buildRanking(team: TeamMember[], agg: Aggregate): RankingRow[] {
  return team
    .map(member => ({ member, count: agg.byPerson[member.id] || 0 }))
    .sort((a, b) => b.count - a.count);
}

// Carga por cliente (minutos estimados), só os com volume no período.
export interface ClientLoadRow { client: Client; minutes: number; }
export function buildClientLoad(clients: Client[], agg: Aggregate): ClientLoadRow[] {
  return clients
    .map(client => ({ client, minutes: Math.round(agg.byClient[client.id] || 0) }))
    .filter(r => r.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}

/**
 * Atrasadas no período: incompletas com weekId < semana atual (mesma regra do
 * Planejador), cuja semana de vencimento cai dentro do range selecionado.
 */
export function buildOverdueList(
  incompleteTasks: WeeklyTask[],
  currentWeekId: string,
  rangeStartWeekId: string,
): OverdueItem[] {
  return incompleteTasks
    .filter(t => t.weekId < currentWeekId && t.weekId >= rangeStartWeekId)
    .map(t => {
      const daysLate = diffWeeks(t.weekId, currentWeekId) * 7;
      return {
        id: t.id,
        title: t.title,
        clientId: t.clientId,
        personId: uniqueResponsibles(t)[0],
        daysLate,
        dueLabel: fmtDay(weekIdToDate(t.weekId)),
      };
    })
    .sort((a, b) => b.daysLate - a.daysLate);
}

export { fmtDay };
