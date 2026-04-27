export type DayOfWeek = 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado' | 'Domingo';
export type Priority = 'low' | 'medium' | 'high';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskComment {
  id: string;
  authorId: string;
  text: string;
  createdAt: number;
}

export interface MasterTask {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  scheduledDay?: DayOfWeek;
  subTasks?: SubTask[];
  responsible?: string;
  phase?: string;
  dueDate?: string;
  comments?: TaskComment[];
}

export interface Client {
  id: string;
  name: string;
  logo: string;
  logoUrl?: string;
  masterTasks: MasterTask[];
  color: string;
}

export interface WeeklyTask {
  id: string;
  weekId: string; // The identifier for the week, e.g., '2026-04-20' (Monday date)
  day: DayOfWeek;
  clientId?: string;
  masterTaskId?: string;
  title: string;
  completed: boolean;
  order: number;
  subTasks?: SubTask[];
  responsible?: string;
  phase?: string;
  dueDate?: string;
  comments?: TaskComment[];
  priority?: Priority;
  timeSpent?: number; // Total elapsed time in milliseconds
  timerStartedAt?: number | null; // Timestamp when timer started, null if stopped
}

export interface TeamMember {
  id: string;
  name: string;
  photoUrl?: string;
}
