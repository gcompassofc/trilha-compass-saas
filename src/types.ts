export type DayOfWeek = 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado' | 'Domingo';
export type Priority = 'low' | 'medium' | 'high';

export interface MasterTask {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  scheduledDay?: DayOfWeek; // If it's already in the sprint
}

export interface Client {
  id: string;
  name: string;
  logo: string;
  masterTasks: MasterTask[];
  color: string;
}

export interface WeeklyTask {
  id: string;
  day: DayOfWeek;
  clientId?: string;
  masterTaskId?: string; // Link to the original task in the client backlog
  title: string;
  completed: boolean;
  order: number;
}
