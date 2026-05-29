export type DayOfWeek = 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado' | 'Domingo';
export type Priority = 'low' | 'medium' | 'high';
export type TaskType = 'scope' | 'overdelivery';
export type TaskKind = 'pontual' | 'recorrente' | 'urgente';
export type TaskStatus = 'in_progress' | 'blocked' | 'done';

export interface TaskComment {
  id: string;
  authorId: string;
  text: string;
  createdAt: number;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  timeSpent?: number;
  timerStartedAt?: number | null;
  estimatedMinutes?: number;
  // Paridade com a tarefa mãe (campos opcionais para retrocompat):
  status?: TaskStatus;
  blockedReason?: string;
  startDate?: string;
  dueDate?: string;
  comments?: TaskComment[];
  responsible?: string;
  responsibles?: string[];
  priority?: Priority;
  taskType?: TaskType;
  kind?: TaskKind;
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
  startDate?: string;
  dueDate?: string;
  comments?: TaskComment[];
  taskType?: TaskType;
  responsibles?: string[];
  timeSpent?: number;
  timerStartedAt?: number | null;
  estimatedMinutes?: number;
  status?: TaskStatus;
  blockedReason?: string;
  kind?: TaskKind;
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
  ritualId?: string; // Source DailyRitual id when this task was auto-materialized.
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
  startDate?: string; // ISO YYYY-MM-DD. Se setado junto com dueDate, a tarefa ocupa todos os dias do intervalo no sprint.
  status?: TaskStatus; // 'in_progress' | 'blocked' | 'done'. Ausência = "não começou".
  blockedReason?: string; // motivo do impedimento (opcional, só faz sentido com status='blocked').
  completedAt?: number; // timestamp ms da conclusão (gravado quando completed passa a true). Alimenta o histórico dos Relatórios.
}

export interface DailyRitual {
  id: string;
  title: string;
  position: 'top' | 'bottom';
  clientId?: string;
  responsibles?: string[];
  estimatedMinutes?: number;
  kind?: TaskKind;
  daysOfWeek?: DayOfWeek[]; // empty/undefined = every weekday Mon–Fri
  order: number;
  createdAt: number;
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
