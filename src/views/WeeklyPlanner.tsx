import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Circle, Trash2, Search, X, ChevronDown, ChevronRight, ChevronLeft, User2, Calendar, CheckSquare, Square, Play, Pause, LayoutList, LayoutGrid, ListTodo, MessageSquare, GripVertical } from 'lucide-react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { Client, WeeklyTask, DayOfWeek, MasterTask, SubTask, TeamMember } from '../types';

interface WeeklyPlannerProps {
  clients: Client[];
  weeklyTasks: WeeklyTask[];
  teamMembers: TeamMember[];
  currentWeekId: string;
  setCurrentWeekId: (weekId: string) => void;
  onAddTask: (task: Omit<WeeklyTask, 'id'>) => void;
  onUpdateTask: (task: WeeklyTask) => void;
  onDeleteTask: (id: string) => void;
  onReorderTasks: (day: DayOfWeek, tasks: WeeklyTask[]) => void;
}

const DAYS: DayOfWeek[] = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const getDateForDayOfWeek = (weekId: string, targetDay: DayOfWeek): string => {
  const days: DayOfWeek[] = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const [year, month, day] = weekId.split('-').map(Number);
  const monday = new Date(year, month - 1, day);
  
  const targetIndex = days.indexOf(targetDay);
  let offset = targetIndex - 1; 
  if (targetIndex === 0) offset = 6; 
  
  const targetDate = new Date(monday);
  targetDate.setDate(monday.getDate() + offset);
  
  return `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
};


const formatTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const TaskTimer = ({ task, onUpdateTask }: { task: WeeklyTask, onUpdateTask: (t: WeeklyTask) => void }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let interval: any;
    if (task.timerStartedAt && !task.completed) {
      interval = setInterval(() => setNow(Date.now()), 1000);
    }
    return () => clearInterval(interval);
  }, [task.timerStartedAt, task.completed]);

  const isRunning = !!task.timerStartedAt && !task.completed;
  const baseTime = task.timeSpent || 0;
  const elapsed = isRunning && task.timerStartedAt ? Math.floor((now - task.timerStartedAt) / 1000) : 0;
  const totalSeconds = baseTime + elapsed;

  const toggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.completed) return; // cannot start timer for completed task
    
    if (isRunning) {
      // Stop
      onUpdateTask({ ...task, timerStartedAt: null, timeSpent: totalSeconds });
    } else {
      // Start
      onUpdateTask({ ...task, timerStartedAt: Date.now() });
    }
  };

  return (
    <button 
      onClick={toggleTimer}
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono transition-all ${isRunning ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10'}`}
    >
      {isRunning ? <Pause className="w-2.5 h-2.5" fill="currentColor" /> : <Play className="w-2.5 h-2.5" fill="currentColor" />}
      <span>{formatTime(totalSeconds)}</span>
    </button>
  );
};

const DraggableWrapper = ({ task, className, style, children }: any) => {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={task}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group transition-all ${className}`}
      style={style}
    >
      <div className="flex items-start gap-1 w-full h-full">
        <div 
          className="pt-1.5 cursor-grab active:cursor-grabbing text-slate-600 hover:text-indigo-400 touch-none flex-shrink-0"
          onPointerDown={(e) => controls.start(e)}
          style={{ touchAction: 'none' }}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </Reorder.Item>
  );
};

export default function WeeklyPlanner({ 
clients, 
  weeklyTasks, 
  teamMembers,
  currentWeekId,
  setCurrentWeekId,
  onAddTask, 
  onUpdateTask, 
  onDeleteTask, 
  onReorderTasks 
}: WeeklyPlannerProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [addingTaskForDay, setAddingTaskForDay] = useState<DayOfWeek | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('standalone');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [newSubTaskTitles, setNewSubTaskTitles] = useState<Record<string, string>>({});
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});

  const navigateWeek = (direction: 'prev' | 'next') => {
    const [year, month, day] = currentWeekId.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + (direction === 'next' ? 7 : -7));
    const newWeekId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setCurrentWeekId(newWeekId);
  };

  const handleAddTask = (day: DayOfWeek, masterTask?: MasterTask) => {
    const targetDate = getDateForDayOfWeek(currentWeekId, day);
    const task: Omit<WeeklyTask, 'id'> = {
      weekId: currentWeekId,
      day,
      dueDate: masterTask?.dueDate || targetDate, // Usa a data do masterTask, ou a data preenchida
      title: masterTask ? masterTask.title : newTaskTitle,
      clientId: selectedClientId === 'standalone' ? undefined : selectedClientId,
      masterTaskId: masterTask?.id,
      completed: masterTask ? masterTask.completed : false,
      order: weeklyTasks.filter(t => t.day === day).length,
      subTasks: masterTask?.subTasks || [],
      responsible: masterTask?.responsible,
      priority: masterTask?.priority || 'medium'
    };

    onAddTask(task);
    setNewTaskTitle('');
    setAddingTaskForDay(null);
  };

  const toggleTask = (task: WeeklyTask) => {
    onUpdateTask({ ...task, completed: !task.completed });
  };

  const toggleSubTask = (task: WeeklyTask, subTaskId: string) => {
    const updatedSubTasks = (task.subTasks || []).map(st => 
      st.id === subTaskId ? { ...st, completed: !st.completed } : st
    );
    
    // Auto-complete main task if all subtasks are done
    const allDone = updatedSubTasks.length > 0 && updatedSubTasks.every(st => st.completed);
    
    onUpdateTask({ 
      ...task, 
      subTasks: updatedSubTasks,
      completed: allDone ? true : task.completed 
    });
  };

  const addSubTask = (task: WeeklyTask) => {
    const title = newSubTaskTitles[task.id];
    if (!title?.trim()) return;
    
    const newSub: SubTask = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)),
      title: title,
      completed: false
    };
    onUpdateTask({
      ...task,
      subTasks: [...(task.subTasks || []), newSub],
      completed: false // If adding new subtask, main task might not be completed anymore
    });
    setNewSubTaskTitles({ ...newSubTaskTitles, [task.id]: '' });
  };

  const handleAddComment = (task: WeeklyTask) => {
    const text = newCommentTexts[task.id];
    if (!text?.trim()) return;

    const newComment = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)),
      authorId: 'Equipe',
      text: text,
      createdAt: Date.now()
    };

    onUpdateTask({
      ...task,
      comments: [...(task.comments || []), newComment]
    });
    setNewCommentTexts({ ...newCommentTexts, [task.id]: '' });
  };

  const removeSubTask = (task: WeeklyTask, subTaskId: string) => {
    onUpdateTask({
      ...task,
      subTasks: (task.subTasks || []).filter(st => st.id !== subTaskId)
    });
  };

  const changeTaskResponsible = (task: WeeklyTask, responsible: string) => {
    onUpdateTask({ ...task, responsible });
  };

  const moveTaskToDay = (task: WeeklyTask, newDay: DayOfWeek) => {
    const newDate = getDateForDayOfWeek(currentWeekId, newDay);
    onUpdateTask({ 
      ...task, 
      day: newDay,
      dueDate: newDate,
      order: weeklyTasks.filter(t => t.day === newDay).length 
    });
  };

  const selectedClientBacklog = clients.find(c => c.id === selectedClientId)?.masterTasks.filter(t => {
    return !weeklyTasks.some(wt => wt.masterTaskId === t.id);
  }) || [];

  return (
    <div className="space-y-8 h-full flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="gap-2 flex flex-col">
          <h1 className="text-2xl md:text-4xl font-bold prisma-text tracking-tight">Sprint Semanal</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
              <button onClick={() => navigateWeek('prev')} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-slate-300 px-2 tracking-wide">
                {currentWeekId.split('-').reverse().join('/')}
              </span>
              <button onClick={() => navigateWeek('next')} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-400 font-light">Distribua as demandas nos dias da semana.</p>
          </div>
        </div>
        <div className="hidden lg:flex gap-4 items-center bg-white/5 border border-white/5 px-4 py-2 rounded-2xl">
          <div className="flex bg-black/20 rounded-lg p-1 border border-white/5 mr-4">
            <button 
              onClick={() => setViewMode('kanban')} 
              className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              title="Visão Kanban"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              title="Visão Lista"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Progresso</span>
            <span className="text-sm font-mono text-indigo-400">
              {weeklyTasks.filter(t => t.completed).length}/{weeklyTasks.length}
            </span>
          </div>
          <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${(weeklyTasks.filter(t => t.completed).length / (weeklyTasks.length || 1)) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <div className="relative flex-1 min-h-0 flex flex-col group/kanban pb-8">
        <div className={`flex-1 ${viewMode === 'kanban' ? 'overflow-x-auto overflow-y-hidden -mx-8 px-8 min-h-0 custom-scrollbar' : 'overflow-y-auto pr-4 custom-scrollbar'}`}>
          <div className={`flex ${viewMode === 'kanban' ? 'gap-6 min-w-max h-full items-start pb-4' : 'flex-col gap-6 max-w-4xl mx-auto w-full h-full'}`}>
          {DAYS.map((day) => {
            const dayTasks = weeklyTasks
              .filter(t => t.day === day)
              .sort((a, b) => a.order - b.order);

            const isToday = new Date().toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase().includes(day.toLowerCase().slice(0, 3));

            return (
              <div key={day} className={`${viewMode === 'kanban' ? 'w-[280px] shrink-0 max-h-full' : 'w-full'} flex flex-col gap-4 relative ${isToday ? 'z-10' : ''}`}>
                <div className="flex items-center justify-between px-3">
                  <div className="flex items-center gap-3">
                    <h2 className={`font-bold text-xl ${isToday ? 'text-indigo-400 underline underline-offset-8 decoration-indigo-500/30' : 'text-slate-200'}`}>{day}</h2>
                    {isToday && <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Hoje</span>}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
                    {dayTasks.length}
                  </span>
                </div>

                <div className={`glass-panel p-3 flex flex-col gap-3 transition-colors ${viewMode === 'kanban' ? 'min-h-[150px] shrink min-h-0' : 'flex-1'} ${isToday ? 'border-indigo-500/20 bg-indigo-500/[0.03]' : ''}`}>
                  <Reorder.Group 
                    axis="y" 
                    values={dayTasks} 
                    onReorder={(newTasks) => onReorderTasks(day, newTasks)}
                    className={`flex flex-col gap-2 ${viewMode === 'kanban' ? 'overflow-y-auto overflow-x-hidden custom-scrollbar pr-1 shrink min-h-0' : ''}`}
                  >
                    {dayTasks.map((task) => {
                      const client = clients.find(c => c.id === task.clientId);
                      const isExpanded = expandedTaskId === task.id;
                      const subTasksDone = (task.subTasks || []).filter(st => st.completed).length;
                      const subTasksTotal = (task.subTasks || []).length;
                      const progress = subTasksTotal > 0 ? (subTasksDone / subTasksTotal) * 100 : 0;
                      
                      return (
                        <DraggableWrapper
                          key={task.id}
                          task={task}
                          className={`${
                            viewMode === 'kanban' 
                              ? `p-2.5 rounded-xl border ${
                                  task.completed 
                                    ? 'bg-emerald-500/[0.03] border-emerald-500/10' 
                                    : client 
                                      ? 'bg-white/[0.03] border-white/5 hover:border-white/10 hover:bg-white/[0.05] shadow-sm shadow-black/10'
                                      : 'bg-amber-500/[0.02] border-amber-500/10 hover:border-amber-500/30 hover:bg-amber-500/[0.04] shadow-sm shadow-amber-500/5'
                                }`
                              : `py-1.5 px-1 border-b border-white/5 hover:bg-white/[0.02] ${isExpanded ? 'bg-white/5 rounded-xl px-3 border-transparent my-1' : ''}`
                          }`}
                          style={viewMode === 'kanban' && !task.completed && client ? { borderLeft: `3px solid ${client.color}` } : {}}
                        >
                          <div className={`flex ${viewMode === 'kanban' ? 'flex-col' : 'flex-col'}`}>
                            {viewMode === 'kanban' ? (
                              <div className="flex flex-col gap-1.5 relative">
                                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                                  {client ? (
                                    <span className="text-[8px] uppercase tracking-wider font-bold truncate max-w-[80px]" style={{ color: client.color }}>
                                      {client.name}
                                    </span>
                                  ) : (
                                    <span className="text-[8px] uppercase tracking-wider font-bold text-amber-500">
                                      PONTUAL
                                    </span>
                                  )}

                                  {task.responsible && (() => {
                                    const member = teamMembers.find(m => m.id === task.responsible || m.name === task.responsible);
                                    return (
                                      <>
                                        <span className="text-white/20 text-[8px]">•</span>
                                        <span className="text-[8px] text-slate-400 truncate max-w-[60px]">
                                          {member ? member.name.split(' ')[0] : task.responsible}
                                        </span>
                                      </>
                                    );
                                  })()}

                                  {task.priority && (
                                    <>
                                      <span className="text-white/20 text-[8px]">•</span>
                                      <span className={`text-[8px] font-bold ${
                                        task.priority === 'high' ? 'text-rose-400' :
                                        task.priority === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                                      }`}>
                                        {task.priority === 'high' ? 'Urgente' : task.priority === 'medium' ? 'Normal' : 'Baixa'}
                                      </span>
                                    </>
                                  )}
                                </div>

                                <div className="flex items-start gap-1.5">
                                  <button onClick={() => toggleTask(task)} className="mt-0.5 flex-shrink-0">
                                    {task.completed ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    ) : (
                                      <Circle className={`w-3.5 h-3.5 transition-colors ${client ? 'text-slate-600' : 'text-amber-500/40'} group-hover:text-slate-400`} />
                                    )}
                                  </button>
                                  
                                  <div className="flex-1 min-w-0" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                                    {isExpanded ? (
                                      <input
                                        type="text"
                                        value={task.title}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => onUpdateTask({ ...task, title: e.target.value })}
                                        className="w-full bg-transparent text-[11px] leading-snug font-medium text-slate-200 border-b border-indigo-500/50 focus:outline-none focus:border-indigo-400"
                                      />
                                    ) : (
                                      <p className={`text-[11px] leading-snug break-words font-medium cursor-pointer ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                        {task.title}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {subTasksTotal > 0 && !isExpanded && (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="flex-1 h-[3px] bg-white/5 rounded-full overflow-hidden">
                                      <motion.div 
                                        className="h-full bg-indigo-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="absolute top-0 right-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 rounded-bl-lg px-1 pb-1">
                                  <button onClick={() => onDeleteTask(task.id)} className="p-1 text-slate-500 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                                  <div className="relative group/move">
                                    <button className="p-1 text-slate-500 hover:text-indigo-400"><Calendar className="w-3 h-3" /></button>
                                    <div className="absolute right-0 top-0 hidden group-hover/move:flex flex-col bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 py-1 min-w-[120px]">
                                      {DAYS.filter(d => d !== day).map(d => (
                                        <button key={d} onClick={() => moveTaskToDay(task, d)} className="px-3 py-1.5 text-[10px] text-left text-slate-400 hover:bg-white/5 hover:text-white">{d}</button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 w-full">
                                <button onClick={() => toggleTask(task)} className="flex-shrink-0">
                                  {task.completed ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  ) : client ? (
                                    <div className="w-2.5 h-2.5 rounded-full mx-0.5 shadow-[0_0_8px_currentColor]" style={{ backgroundColor: client.color, color: client.color }} />
                                  ) : (
                                    <div className="w-2.5 h-2.5 rounded-full mx-0.5 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                                  )}
                                </button>

                                <div className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                                  {isExpanded ? (
                                    <input
                                      type="text"
                                      value={task.title}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => onUpdateTask({ ...task, title: e.target.value })}
                                      className="bg-transparent text-[13px] font-bold text-slate-200 border-b border-indigo-500/50 focus:outline-none focus:border-indigo-400 truncate w-full max-w-[200px]"
                                    />
                                  ) : (
                                    <span className={`text-[13px] font-bold truncate ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                      {task.title}
                                    </span>
                                  )}
                                  {client ? (
                                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/5 whitespace-nowrap" style={{ color: client.color }}>
                                      {client.name}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 whitespace-nowrap">
                                      PONTUAL
                                    </span>
                                  )}
                                  {subTasksTotal > 0 && !isExpanded && (
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                                      <ListTodo className="w-3 h-3" /> {subTasksDone}/{subTasksTotal}
                                    </span>
                                  )}
                                  {(task.comments?.length || 0) > 0 && !isExpanded && (
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                      <MessageSquare className="w-3 h-3" /> {task.comments?.length}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                                  <button onClick={() => onDeleteTask(task.id)} className="p-1 text-slate-600 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                  <div className="relative group/move">
                                    <button className="p-1 text-slate-600 hover:text-indigo-400"><Calendar className="w-3.5 h-3.5" /></button>
                                    <div className="absolute right-0 top-full mt-1 hidden group-hover/move:flex flex-col bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 py-1 min-w-[120px]">
                                      {DAYS.filter(d => d !== day).map(d => (
                                        <button key={d} onClick={() => moveTaskToDay(task, d)} className="px-3 py-1.5 text-[10px] text-left text-slate-400 hover:bg-white/5 hover:text-white">{d}</button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Progress Bar for Subtasks in List Mode or Expanded */}
                            {subTasksTotal > 0 && (viewMode === 'list' || isExpanded) && viewMode !== 'kanban' && (
                              <div className={`w-full h-1 bg-white/5 rounded-full overflow-hidden ${viewMode === 'list' ? 'mt-2' : ''}`}>
                                <motion.div 
                                  className="h-full bg-indigo-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                />
                              </div>
                            )}
                            {subTasksTotal > 0 && viewMode === 'kanban' && isExpanded && (
                               <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
                                <motion.div 
                                  className="h-full bg-indigo-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                />
                              </div>
                            )}

                            {/* Subtasks Section */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="pt-2 border-t border-white/5 space-y-3"
                                >
                                  <div className="flex flex-col gap-2">
                                    {(task.subTasks || []).map(st => (
                                      <div key={st.id} className="flex items-center gap-2 group/st">
                                        <button onClick={() => toggleSubTask(task, st.id)}>
                                          {st.completed 
                                            ? <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                                            : <Square className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400" />
                                          }
                                        </button>
                                        <span className={`text-[11px] flex-1 ${st.completed ? 'text-slate-600 line-through' : 'text-slate-400'}`}>
                                          {st.title}
                                        </span>
                                        <button onClick={() => removeSubTask(task, st.id)} className="opacity-0 group-hover/st:opacity-100 p-1 text-slate-600 hover:text-rose-500"><X className="w-3 h-3" /></button>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="flex gap-2">
                                    <input 
                                      type="text" 
                                      placeholder="Nova subtarefa..."
                                      value={newSubTaskTitles[task.id] || ''}
                                      onChange={(e) => setNewSubTaskTitles({ ...newSubTaskTitles, [task.id]: e.target.value })}
                                      onKeyDown={(e) => e.key === 'Enter' && addSubTask(task)}
                                      className="flex-1 bg-white/5 border border-white/5 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                                    />
                                    <button onClick={() => addSubTask(task)} className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30"><Plus className="w-3 h-3" /></button>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-4 pt-2 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Responsável:</span>
                                      <select 
                                        value={task.responsible || ''}
                                        onChange={(e) => changeTaskResponsible(task, e.target.value)}
                                        className="bg-transparent text-[10px] text-slate-300 focus:outline-none border-none p-0 cursor-pointer hover:text-indigo-400"
                                      >
                                        <option value="">Ninguém</option>
                                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                      </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Data:</span>
                                      <input 
                                        type="date"
                                        value={task.dueDate || ''}
                                        onChange={(e) => onUpdateTask({ ...task, dueDate: e.target.value })}
                                        className="bg-transparent text-[10px] text-slate-300 focus:outline-none border-none p-0 cursor-pointer hover:text-indigo-400"
                                      />
                                    </div>
                                  </div>

                                  {/* Comentários */}
                                  <div className="space-y-2 pt-2 border-t border-white/5">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                      Comentários / Histórico
                                    </label>
                                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                      {(task.comments || []).map(comment => (
                                        <div key={comment.id} className="bg-white/5 p-2 rounded-lg space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-bold text-indigo-400">{comment.authorId}</span>
                                            <span className="text-[8px] text-slate-500">{new Date(comment.createdAt).toLocaleString()}</span>
                                          </div>
                                          <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap break-words">{comment.text}</p>
                                        </div>
                                      ))}
                                      {(!task.comments || task.comments.length === 0) && (
                                        <p className="text-[10px] text-slate-500 italic text-center py-2">Nenhum comentário ainda.</p>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-2 pt-1">
                                      <textarea 
                                        placeholder="Adicionar comentário ou atualização..."
                                        value={newCommentTexts[task.id] || ''}
                                        onChange={(e) => setNewCommentTexts({ ...newCommentTexts, [task.id]: e.target.value })}
                                        className="w-full bg-black/20 border border-white/5 rounded-lg px-2 py-2 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/30 min-h-[60px]"
                                      />
                                      <button 
                                        onClick={() => handleAddComment(task)} 
                                        className="self-end px-3 py-1.5 bg-indigo-500 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-400 transition-colors"
                                      >
                                        Comentar
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </DraggableWrapper>
                      );
                    })}
                  </Reorder.Group>

                  <AnimatePresence>
                    {addingTaskForDay === day ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Nova Demanda</span>
                          <button onClick={() => setAddingTaskForDay(null)}><X className="w-4 h-4 text-slate-500" /></button>
                        </div>

                        <select
                          value={selectedClientId}
                          onChange={(e) => setSelectedClientId(e.target.value)}
                          className={`w-full border rounded-xl px-3 py-2 text-xs font-bold transition-all focus:outline-none focus:ring-2 appearance-none ${
                            selectedClientId === 'standalone' 
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 focus:ring-amber-500/20' 
                              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 focus:ring-indigo-500/20'
                          }`}
                        >
                          <option value="standalone">⚡ Demanda Pontual (Extra)</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>📁 Cliente: {c.name}</option>
                          ))}
                        </select>


                        {selectedClientId !== 'standalone' ? (
                          <div className="space-y-2">
                             <div className="flex items-center gap-2 mb-1">
                                <Search className="w-3 h-3 text-slate-500" />
                                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Backlog Pendente</span>
                             </div>
                             <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                               {selectedClientBacklog.map(t => (
                                 <button
                                   key={t.id}
                                   onClick={() => handleAddTask(day, t)}
                                   className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-xs text-slate-400 hover:text-white transition-all transition-colors border border-transparent hover:border-indigo-500/30 flex justify-between items-center group/btn"
                                 >
                                   <div className="flex flex-col">
                                     <span className="truncate pr-2 font-medium">{t.title}</span>
                                     {t.responsible && <span className="text-[8px] text-slate-500">Resp: {teamMembers.find(m => m.id === t.responsible || m.name === t.responsible)?.name || t.responsible}</span>}
                                   </div>
                                   <Plus className="w-3 h-3 opacity-0 group-hover/btn:opacity-100" />
                                 </button>
                               ))}
                               {selectedClientBacklog.length === 0 && (
                                 <p className="text-[10px] text-slate-600 text-center py-2 italic">Backlog vazio ou já planejado.</p>
                               )}
                             </div>
                          </div>
                        ) : (
                          <textarea
                            autoFocus
                            placeholder="Descreva a demanda..."
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddTask(day)}
                            className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 min-h-[60px]"
                          />
                        )}

                        {selectedClientId === 'standalone' && (
                          <button 
                            onClick={() => handleAddTask(day)}
                            disabled={!newTaskTitle.trim()}
                            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:hover:bg-amber-600 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-600/20"
                          >
                            Agendar Demanda Pontual
                          </button>
                        )}

                      </motion.div>
                    ) : (
                      <button
                        onClick={() => setAddingTaskForDay(day)}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-white/5 text-slate-600 hover:bg-white/[0.02] hover:border-indigo-500/20 hover:text-indigo-400/60 transition-all group"
                      >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] ml-1">Distribuir Demanda</span>
                      </button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}
