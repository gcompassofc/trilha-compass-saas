export type DayOfWeek = 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado' | 'Domingo';
export type Priority = 'low' | 'medium' | 'high';
export type TaskType = 'scope' | 'overdelivery';
export type TaskKind = 'pontual' | 'recorrente' | 'urgente';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  timeSpent?: number;
  timerStartedAt?: number | null;
  estimatedMinutes?: number;
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
  taskType?: TaskType;
  responsibles?: string[];
  timeSpent?: number;
  timerStartedAt?: number | null;
  estimatedMinutes?: number;
}

export interface Client {
  id: string;
  name: string;
  logo: string;
  logoUrl?: string;
  masterTasks: MasterTask[];
  color: string;
  order?: number;
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
  taskType?: TaskType;
  responsibles?: string[];
  estimatedMinutes?: number;
  kind?: TaskKind;
  xpAwarded?: boolean; // anti-exploit: true após creditar XP na primeira conclusão
}

export interface UserGamification {
  userId: string;
  xp: number;
  level: number;
  streak: number;
  lastActiveDate?: string; // YYYY-MM-DD — para calcular streak
  totalCompleted?: number;
  updatedAt?: number;
  dailyGoal?: number; // meta diária de tarefas (default 3)
  dailyCompleted?: number; // contador de tarefas concluídas hoje
  dailyCountedDate?: string; // YYYY-MM-DD ao qual dailyCompleted se refere
  bestStreak?: number;
  comboCount?: number;
  comboExpiresAt?: number; // timestamp ms
  badges?: string[]; // ids dos badges conquistados
  completedMissions?: string[]; // chave "weekId:missionId" para evitar pagamento duplo
}

export interface SprintFocus {
  weekId: string; // doc id — segunda da semana, ex: '2026-05-11'
  text: string;
  updatedBy?: string;
  updatedAt?: number;
}

export interface TeamMember {
  id: string;
  name: string;
  photoUrl?: string;
}

export type TransactionCategory = 
  | 'income_fixed' 
  | 'income_recurring' 
  | 'cost_infra' 
  | 'cost_tools' 
  | 'investment_ads' 
  | 'investment_consulting' 
  | 'withdrawal_kallyl' 
  | 'withdrawal_allyson' 
  | 'other';

export type TransactionType = 'income' | 'cost' | 'investment' | 'withdrawal';
export type TransactionStatus = 'pending' | 'paid';

export interface FinancialTransaction {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO date YYYY-MM-DD
  type: TransactionType;
  category: TransactionCategory;
  status: TransactionStatus;
  clientId?: string; 
  createdAt: number;
}
