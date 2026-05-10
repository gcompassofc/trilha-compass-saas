import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Circle, Trash2, Search, X, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, User2, Calendar, CheckSquare, Square, LayoutList, LayoutGrid, ListTodo, MessageSquare, GripVertical, ArrowUp, ArrowDown, Package, Gift, Download, Clock } from 'lucide-react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { Client, WeeklyTask, DayOfWeek, MasterTask, SubTask, TeamMember, TaskType } from '../types';
import { exportPlannerTasksToCSV } from '../utils/exportUtils';
import Timer from '../components/Timer';
import EstimatedTimePicker, { formatEstimated } from '../components/EstimatedTimePicker';

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
  onUpdateClient: (client: Client) => void;
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
  onReorderTasks,
  onUpdateClient,
}: WeeklyPlannerProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>(() => {
    const saved = localStorage.getItem('planner_view_mode');
    return saved === 'kanban' || saved === 'list' ? saved : 'list';
  });
  const [addingTaskForDay, setAddingTaskForDay] = useState<DayOfWeek | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('standalone');
  const [addTab, setAddTab] = useState<'backlog' | 'new'>('backlog');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [newSubTaskTitles, setNewSubTaskTitles] = useState<Record<string, string>>({});
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});
  const [newTaskResponsibles, setNewTaskResponsibles] = useState<string[]>([]);
  const [newTaskType, setNewTaskType] = useState<TaskType>('scope');
  const [expandedCommentsTaskId, setExpandedCommentsTaskId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('planner_view_mode', viewMode);
  }, [viewMode]);

  const [selectedUserFilter, setSelectedUserFilter] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('planner_user_filter') || '[]');
    } catch {
      return [];
    }
  });

  const [selectedClientFilter, setSelectedClientFilter] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('planner_client_filter') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('planner_user_filter', JSON.stringify(selectedUserFilter));
  }, [selectedUserFilter]);

  useEffect(() => {
    localStorage.setItem('planner_client_filter', JSON.stringify(selectedClientFilter));
  }, [selectedClientFilter]);

  const filteredTasks = weeklyTasks.filter(task => {
    if (selectedClientFilter.length > 0) {
      const matchesClient = task.clientId
        ? selectedClientFilter.includes(task.clientId)
        : selectedClientFilter.includes('standalone');
      if (!matchesClient) return false;
    }

    if (selectedUserFilter.length === 0) return true;
    const taskResponsibles = [
      ...(task.responsibles || []),
      ...(task.responsible && !(task.responsibles || []).includes(task.responsible) ? [task.responsible] : [])
    ];
    if (taskResponsibles.length === 0) return true;
    return taskResponsibles.some(r => selectedUserFilter.includes(r));
  });

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
      responsible: masterTask ? masterTask.responsible : newTaskResponsibles[0],
      responsibles: masterTask ? (masterTask.responsibles || (masterTask.responsible ? [masterTask.responsible] : [])) : newTaskResponsibles,
      taskType: masterTask ? (masterTask.taskType || 'scope') : newTaskType,
      priority: masterTask?.priority || 'medium'
    };

    onAddTask(task);
    setNewTaskTitle('');
    setNewTaskResponsibles([]);
    setNewTaskType('scope');
    setSelectedClientId('standalone');
    setAddingTaskForDay(null);
    setAddTab('backlog');
  };

  const generateId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);

  const handleAddNewTaskForClient = (day: DayOfWeek) => {
    if (!newTaskTitle.trim() || selectedClientId === 'standalone') return;
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    const masterTaskId = generateId();
    const newMasterTask: MasterTask = {
      id: masterTaskId,
      title: newTaskTitle.trim(),
      completed: false,
      priority: 'medium',
      taskType: newTaskType,
      responsible: newTaskResponsibles[0],
      responsibles: newTaskResponsibles,
      subTasks: [],
    };
    onUpdateClient({
      ...client,
      masterTasks: [...(client.masterTasks || []), newMasterTask],
    });

    const targetDate = getDateForDayOfWeek(currentWeekId, day);
    onAddTask({
      weekId: currentWeekId,
      day,
      dueDate: targetDate,
      title: newTaskTitle.trim(),
      clientId: selectedClientId,
      masterTaskId,
      completed: false,
      order: weeklyTasks.filter(t => t.day === day).length,
      subTasks: [],
      responsible: newTaskResponsibles[0],
      responsibles: newTaskResponsibles,
      taskType: newTaskType,
      priority: 'medium',
    });

    setNewTaskTitle('');
    setNewTaskResponsibles([]);
    setNewTaskType('scope');
    setSelectedClientId('standalone');
    setAddingTaskForDay(null);
    setAddTab('backlog');
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

  const reorderSubTask = (task: WeeklyTask, index: number, direction: 'up' | 'down') => {
    if (!task.subTasks) return;
    const newSubTasks = [...task.subTasks];
    if (direction === 'up' && index > 0) {
      [newSubTasks[index - 1], newSubTasks[index]] = [newSubTasks[index], newSubTasks[index - 1]];
    } else if (direction === 'down' && index < newSubTasks.length - 1) {
      [newSubTasks[index + 1], newSubTasks[index]] = [newSubTasks[index], newSubTasks[index + 1]];
    } else {
      return;
    }
    onUpdateTask({ ...task, subTasks: newSubTasks });
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
        <div className="flex items-center gap-4">
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
          <button
            onClick={() => exportPlannerTasksToCSV(weeklyTasks, clients, teamMembers, currentWeekId)}
            className="hidden md:flex ml-4 items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl transition-all border border-emerald-500/20 shadow-sm self-start mt-2"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-bold">Exportar Planilha</span>
          </button>
        </div>
        <div className="flex gap-3 items-center bg-white/5 border border-white/5 px-3 py-2 rounded-2xl">
          <div className="flex bg-black/20 rounded-lg p-1 border border-white/5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              title="Visão Lista"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              title="Visão Kanban"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Progresso</span>
            <span className="text-sm font-mono text-indigo-400">
              {filteredTasks.filter(t => t.completed).length}/{filteredTasks.length}
            </span>
          </div>
          <div className="hidden lg:block w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${(filteredTasks.filter(t => t.completed).length / (filteredTasks.length || 1)) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-3 md:items-center -mt-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Cliente</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setSelectedClientFilter([])}
              className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md transition-all whitespace-nowrap ${selectedClientFilter.length === 0 ? 'bg-white/10 text-white' : 'bg-white/[0.03] text-slate-500 hover:text-slate-300'}`}
            >
              Todos
            </button>
            {clients.map(client => {
              const isSelected = selectedClientFilter.includes(client.id);
              return (
                <button
                  key={client.id}
                  onClick={() => {
                    setSelectedClientFilter(prev =>
                      isSelected ? prev.filter(id => id !== client.id) : [...prev, client.id]
                    );
                  }}
                  className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md transition-all whitespace-nowrap border ${isSelected ? 'border-transparent text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                  style={isSelected ? { backgroundColor: `${client.color}25`, color: client.color, borderColor: `${client.color}40` } : undefined}
                >
                  {client.name}
                </button>
              );
            })}
            <button
              onClick={() => {
                const isSelected = selectedClientFilter.includes('standalone');
                setSelectedClientFilter(prev =>
                  isSelected ? prev.filter(id => id !== 'standalone') : [...prev, 'standalone']
                );
              }}
              className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md transition-all whitespace-nowrap ${selectedClientFilter.includes('standalone') ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/[0.03] text-slate-500 hover:text-slate-300 border border-transparent'}`}
            >
              Pontuais
            </button>
          </div>
        </div>

        <div className="hidden md:block w-px h-5 bg-white/10" />

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Responsável</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setSelectedUserFilter([])}
              className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md transition-all whitespace-nowrap ${selectedUserFilter.length === 0 ? 'bg-white/10 text-white' : 'bg-white/[0.03] text-slate-500 hover:text-slate-300'}`}
            >
              Todos
            </button>
            {teamMembers.map(member => {
              const isSelected = selectedUserFilter.includes(member.id);
              return (
                <button
                  key={member.id}
                  onClick={() => {
                    setSelectedUserFilter(prev =>
                      isSelected ? prev.filter(id => id !== member.id) : [...prev, member.id]
                    );
                  }}
                  className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md transition-all whitespace-nowrap ${isSelected ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/[0.03] text-slate-500 hover:text-slate-300 border border-transparent'}`}
                >
                  {member.name.split(' ')[0]}
                </button>
              );
            })}
            <button
              onClick={() => {
                const isSelected = selectedUserFilter.includes('unassigned');
                setSelectedUserFilter(prev =>
                  isSelected ? prev.filter(id => id !== 'unassigned') : [...prev, 'unassigned']
                );
              }}
              className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md transition-all whitespace-nowrap ${selectedUserFilter.includes('unassigned') ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/[0.03] text-slate-500 hover:text-slate-300 border border-transparent'}`}
            >
              Sem Resp.
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 flex flex-col group/kanban pb-8">
        <div className={`flex-1 ${viewMode === 'kanban' ? 'overflow-x-auto overflow-y-hidden -mx-8 px-8 min-h-0 custom-scrollbar' : 'overflow-y-auto pr-4 custom-scrollbar'}`}>
          <div className={`flex ${viewMode === 'kanban' ? 'gap-4 h-full items-start pb-4' : 'flex-col gap-6 max-w-4xl mx-auto w-full h-full'}`}>
          {DAYS.map((day) => {
            const dayTasks = filteredTasks
              .filter(t => t.day === day)
              .sort((a, b) => a.order - b.order);

            const isToday = getDateForDayOfWeek(currentWeekId, day) === new Date().toISOString().split('T')[0];

            return (
              <div key={day} className={`${viewMode === 'kanban' ? 'min-w-[240px] flex-1 max-h-full' : 'w-full'} flex flex-col ${viewMode === 'list' ? 'gap-2' : 'gap-4'} relative ${isToday ? 'z-10' : ''}`}>
                <div className={`flex items-center justify-between ${viewMode === 'list' ? 'px-1' : 'px-3'}`}>
                  <div className="flex items-center gap-3">
                    <h2 className={`font-bold ${viewMode === 'list' ? 'text-sm uppercase tracking-widest' : 'text-xl'} ${isToday ? 'text-indigo-400' : 'text-slate-300'}`}>
                      {day}
                      {viewMode === 'list' && <span className="ml-2 text-slate-600 font-mono text-[11px] normal-case tracking-normal">· {dayTasks.length}</span>}
                    </h2>
                    {isToday && viewMode !== 'list' && <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Hoje</span>}
                    {isToday && viewMode === 'list' && <span className="text-indigo-400 text-[9px] font-bold uppercase tracking-widest">· Hoje</span>}
                  </div>
                  {viewMode === 'kanban' && (
                    <span className="text-[11px] font-mono text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                <div className={`flex flex-col transition-colors ${viewMode === 'kanban' ? 'glass-panel p-3 gap-3 flex-1 min-h-[150px] min-h-0 overflow-hidden' : 'gap-0.5'} ${viewMode === 'kanban' && isToday ? 'border-indigo-500/20 bg-indigo-500/[0.03]' : ''} ${viewMode === 'list' && isToday ? 'border-l-2 border-indigo-500/40 pl-3 -ml-3' : ''}`}>
                  <Reorder.Group
                    axis="y"
                    values={dayTasks}
                    onReorder={(newTasks) => onReorderTasks(day, newTasks)}
                    className={`flex flex-col ${viewMode === 'kanban' ? 'gap-2 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1 flex-1 min-h-0' : 'gap-0.5'}`}
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
                              : `${isExpanded ? 'bg-white/[0.04] rounded-xl px-3 py-3 my-1' : 'px-2 py-2 rounded-lg hover:bg-white/[0.025]'}`
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

                                  {(() => {
                                    const currentResps = task.responsibles || (task.responsible ? [task.responsible] : []);
                                    if (currentResps.length === 0) return null;
                                    return (
                                      <div className="flex items-center">
                                        <span className="text-white/20 text-[8px] mx-1">•</span>
                                        <div className="flex -space-x-1.5">
                                          {currentResps.map((respId, idx) => {
                                            const member = teamMembers.find(m => m.id === respId || m.name === respId);
                                            if (!member) return null;
                                            return (
                                              <div key={idx} className="relative z-10 hover:z-20 group/avatar">
                                                {member.photoUrl ? (
                                                  <img src={member.photoUrl} alt={member.name} className="w-3.5 h-3.5 rounded-full object-cover border border-slate-900" />
                                                ) : (
                                                  <div className="w-3.5 h-3.5 rounded-full bg-slate-700 flex items-center justify-center border border-slate-900 text-[6px] text-white">
                                                    <User2 className="w-2 h-2" />
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {task.taskType === 'overdelivery' && (
                                    <>
                                      <span className="text-white/20 text-[8px]">•</span>
                                      <span className="text-[8px] font-bold text-purple-400 flex items-center gap-0.5">
                                        <Gift className="w-2 h-2" /> Extra
                                      </span>
                                    </>
                                  )}

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

                                  {!!task.estimatedMinutes && (
                                    <>
                                      <span className="text-white/20 text-[8px]">•</span>
                                      <span className="text-[8px] font-bold text-indigo-300 flex items-center gap-0.5" title={`Estimado: ${formatEstimated(task.estimatedMinutes)}`}>
                                        <Clock className="w-2 h-2" /> {formatEstimated(task.estimatedMinutes)}
                                      </span>
                                    </>
                                  )}

                                  <button
                                    onClick={(e) => { e.stopPropagation(); setExpandedTaskId(isExpanded ? null : task.id); }}
                                    className="ml-auto p-0.5 text-slate-500 hover:text-indigo-400 transition-colors"
                                    title={isExpanded ? 'Recolher' : 'Expandir detalhes'}
                                  >
                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>
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
                              <div className="flex items-center gap-3 w-full min-h-[28px]">
                                <button onClick={() => toggleTask(task)} className="flex-shrink-0 flex items-center justify-center w-4 h-4">
                                  {task.completed ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-slate-700 hover:text-slate-500 transition-colors" />
                                  )}
                                </button>

                                {client ? (
                                  <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: client.color }} />
                                ) : (
                                  <div className="w-1 h-4 rounded-full flex-shrink-0 bg-amber-500/60" />
                                )}

                                <div className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                                  {isExpanded ? (
                                    <input
                                      type="text"
                                      value={task.title}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => onUpdateTask({ ...task, title: e.target.value })}
                                      className="bg-transparent text-[13px] font-medium text-slate-100 border-b border-indigo-500/50 focus:outline-none focus:border-indigo-400 flex-1"
                                    />
                                  ) : (
                                    <span className={`text-[13px] font-medium truncate ${task.completed ? 'text-slate-600 line-through' : 'text-slate-200'}`}>
                                      {task.title}
                                    </span>
                                  )}

                                  <span className="text-[10px] font-medium tracking-wide whitespace-nowrap text-slate-500">
                                    {client ? client.name : 'Pontual'}
                                  </span>

                                  {task.taskType === 'overdelivery' && (
                                    <Gift className="w-3 h-3 text-purple-400 flex-shrink-0" />
                                  )}
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {subTasksTotal > 0 && !isExpanded && (
                                    <span className={`text-[10px] flex items-center gap-1 font-mono ${subTasksDone === subTasksTotal ? 'text-emerald-500/70' : 'text-slate-500'}`}>
                                      <ListTodo className="w-3 h-3" /> {subTasksDone}/{subTasksTotal}
                                    </span>
                                  )}
                                  {(task.comments?.length || 0) > 0 && !isExpanded && (
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                      <MessageSquare className="w-3 h-3" /> {task.comments?.length}
                                    </span>
                                  )}
                                  {!!task.estimatedMinutes && !isExpanded && (
                                    <span className="text-[10px] text-indigo-300/80 flex items-center gap-1 font-mono" title={`Estimado: ${formatEstimated(task.estimatedMinutes)}`}>
                                      <Clock className="w-3 h-3" /> {formatEstimated(task.estimatedMinutes)}
                                    </span>
                                  )}

                                  {(() => {
                                    const currentResps = task.responsibles || (task.responsible ? [task.responsible] : []);
                                    if (currentResps.length === 0) return null;
                                    return (
                                      <div className="flex -space-x-1.5 items-center">
                                        {currentResps.map((respId, idx) => {
                                          const member = teamMembers.find(m => m.id === respId || m.name === respId);
                                          if (!member) return null;
                                          return (
                                            <div key={idx} className="relative z-10 hover:z-20 group/avatar" title={member.name}>
                                              {member.photoUrl ? (
                                                <img src={member.photoUrl} alt={member.name} className="w-5 h-5 rounded-full object-cover border border-slate-900" />
                                              ) : (
                                                <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center border border-slate-900 text-[8px] text-white">
                                                  <User2 className="w-2.5 h-2.5" />
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}

                                  <button
                                    onClick={(e) => { e.stopPropagation(); setExpandedTaskId(isExpanded ? null : task.id); }}
                                    className="p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                                    title={isExpanded ? 'Recolher' : 'Expandir detalhes'}
                                  >
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>

                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="relative group/move">
                                      <button className="p-1 text-slate-600 hover:text-indigo-400"><Calendar className="w-3.5 h-3.5" /></button>
                                      <div className="absolute right-0 top-full mt-1 hidden group-hover/move:flex flex-col bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 py-1 min-w-[120px]">
                                        {DAYS.filter(d => d !== day).map(d => (
                                          <button key={d} onClick={() => moveTaskToDay(task, d)} className="px-3 py-1.5 text-[10px] text-left text-slate-400 hover:bg-white/5 hover:text-white">{d}</button>
                                        ))}
                                      </div>
                                    </div>
                                    <button onClick={() => onDeleteTask(task.id)} className="p-1 text-slate-600 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Progress Bar (kanban only, when not expanded uses inline thinner bar) */}
                            {subTasksTotal > 0 && viewMode === 'kanban' && isExpanded && (
                               <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
                                <motion.div
                                  className="h-full bg-indigo-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                />
                              </div>
                            )}

                            {/* Expanded Detail Section */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className={`mt-3 ${viewMode === 'list' ? 'pl-8' : ''} space-y-4`}>
                                    {/* Metadata pills row */}
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="flex items-center gap-1.5 bg-white/[0.04] rounded-md px-2 py-1">
                                        <Calendar className="w-3 h-3 text-slate-500" />
                                        <input
                                          type="date"
                                          value={task.dueDate || ''}
                                          onChange={(e) => onUpdateTask({ ...task, dueDate: e.target.value })}
                                          className="bg-transparent text-[10px] text-slate-300 focus:outline-none border-none p-0 cursor-pointer hover:text-indigo-400"
                                        />
                                      </div>

                                      <div className="flex bg-white/[0.04] rounded-md p-0.5">
                                        <button
                                          onClick={() => onUpdateTask({ ...task, taskType: 'scope' })}
                                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] uppercase font-bold transition-all ${task.taskType === 'scope' || !task.taskType ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                          <Package className="w-2.5 h-2.5" /> Escopo
                                        </button>
                                        <button
                                          onClick={() => onUpdateTask({ ...task, taskType: 'overdelivery' })}
                                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] uppercase font-bold transition-all ${task.taskType === 'overdelivery' ? 'bg-purple-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                          <Gift className="w-2.5 h-2.5" /> Overdelivery
                                        </button>
                                      </div>

                                      <div className="flex bg-white/[0.04] rounded-md p-0.5">
                                        {(['high', 'medium', 'low'] as const).map(p => {
                                          const labels = { high: 'Urgente', medium: 'Normal', low: 'Baixa' };
                                          const colors = {
                                            high: 'bg-rose-500 text-white',
                                            medium: 'bg-amber-500 text-white',
                                            low: 'bg-emerald-500 text-white'
                                          };
                                          const isActive = (task.priority || 'medium') === p;
                                          return (
                                            <button
                                              key={p}
                                              onClick={() => onUpdateTask({ ...task, priority: p })}
                                              className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold transition-all ${isActive ? colors[p] : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                              {labels[p]}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      <Timer item={task} onChange={onUpdateTask} size="sm" />
                                      <EstimatedTimePicker
                                        value={task.estimatedMinutes}
                                        onChange={(v) => onUpdateTask({ ...task, estimatedMinutes: v })}
                                        size="sm"
                                      />
                                    </div>

                                    {/* Responsáveis */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Responsáveis</span>
                                      <div className="flex flex-wrap gap-1">
                                        {teamMembers.map(m => {
                                          const isSelected = (task.responsibles || (task.responsible ? [task.responsible] : [])).includes(m.id);
                                          return (
                                            <button
                                              key={m.id}
                                              onClick={() => {
                                                const currentResps = task.responsibles || (task.responsible ? [task.responsible] : []);
                                                const newResps = isSelected ? currentResps.filter(id => id !== m.id) : [...currentResps, m.id];
                                                onUpdateTask({ ...task, responsibles: newResps, responsible: newResps[0] || undefined });
                                              }}
                                              className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold transition-all ${isSelected ? 'bg-indigo-500 text-white' : 'bg-white/[0.04] text-slate-500 hover:text-slate-300'}`}
                                            >
                                              {m.name.split(' ')[0]}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Subtarefas */}
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Subtarefas</span>
                                          {subTasksTotal > 0 && (
                                            <span className="text-[10px] font-mono text-slate-500">{subTasksDone}/{subTasksTotal}</span>
                                          )}
                                        </div>
                                      </div>

                                      {subTasksTotal > 0 && (
                                        <div className="w-full h-[3px] bg-white/5 rounded-full overflow-hidden">
                                          <motion.div
                                            className="h-full bg-indigo-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                          />
                                        </div>
                                      )}

                                      {subTasksTotal > 0 && (
                                        <div className="flex flex-col gap-0.5">
                                          {(task.subTasks || []).map((st, index) => (
                                            <div key={st.id} className="flex items-center gap-2 group/st py-1 px-1 rounded hover:bg-white/[0.02]">
                                              <div className="flex flex-col gap-0 opacity-0 group-hover/st:opacity-100">
                                                <button
                                                  onClick={() => reorderSubTask(task, index, 'up')}
                                                  disabled={index === 0}
                                                  className="p-0 hover:text-indigo-400 disabled:opacity-30 text-slate-600"
                                                >
                                                  <ArrowUp className="w-2.5 h-2.5" />
                                                </button>
                                                <button
                                                  onClick={() => reorderSubTask(task, index, 'down')}
                                                  disabled={index === (task.subTasks?.length || 0) - 1}
                                                  className="p-0 hover:text-indigo-400 disabled:opacity-30 text-slate-600"
                                                >
                                                  <ArrowDown className="w-2.5 h-2.5" />
                                                </button>
                                              </div>
                                              <button onClick={() => toggleSubTask(task, st.id)} className="flex-shrink-0">
                                                {st.completed
                                                  ? <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                                                  : <Square className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400" />
                                                }
                                              </button>
                                              <span className={`text-[12px] flex-1 ${st.completed ? 'text-slate-600 line-through' : 'text-slate-300'}`}>
                                                {st.title}
                                              </span>
                                              <Timer
                                                item={st}
                                                onChange={(updated) => {
                                                  const newSubs = (task.subTasks || []).map(s => s.id === st.id ? updated : s);
                                                  onUpdateTask({ ...task, subTasks: newSubs });
                                                }}
                                              />
                                              <EstimatedTimePicker
                                                value={st.estimatedMinutes}
                                                onChange={(v) => {
                                                  const newSubs = (task.subTasks || []).map(s => s.id === st.id ? { ...s, estimatedMinutes: v } : s);
                                                  onUpdateTask({ ...task, subTasks: newSubs });
                                                }}
                                              />
                                              <button onClick={() => removeSubTask(task, st.id)} className="opacity-0 group-hover/st:opacity-100 p-1 text-slate-600 hover:text-rose-500"><X className="w-3 h-3" /></button>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      <div className="flex gap-2 pt-1">
                                        <input
                                          type="text"
                                          placeholder="Adicionar subtarefa…"
                                          value={newSubTaskTitles[task.id] || ''}
                                          onChange={(e) => setNewSubTaskTitles({ ...newSubTaskTitles, [task.id]: e.target.value })}
                                          onKeyDown={(e) => e.key === 'Enter' && addSubTask(task)}
                                          className="flex-1 bg-white/[0.03] border border-white/5 rounded-md px-2.5 py-1.5 text-[12px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/30"
                                        />
                                        <button onClick={() => addSubTask(task)} disabled={!(newSubTaskTitles[task.id] || '').trim()} className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded-md hover:bg-indigo-500/30 disabled:opacity-40 disabled:hover:bg-indigo-500/20"><Plus className="w-3.5 h-3.5" /></button>
                                      </div>
                                    </div>

                                    {/* Comentários (collapsible) */}
                                    {(() => {
                                      const commentsCount = task.comments?.length || 0;
                                      const commentsOpen = expandedCommentsTaskId === task.id || commentsCount === 0;
                                      return (
                                        <div className="space-y-2">
                                          <button
                                            onClick={() => setExpandedCommentsTaskId(commentsOpen && commentsCount > 0 ? null : task.id)}
                                            className="flex items-center gap-2 text-[9px] text-slate-500 uppercase font-bold tracking-widest hover:text-slate-300 transition-colors"
                                          >
                                            <MessageSquare className="w-3 h-3" />
                                            Comentários
                                            {commentsCount > 0 && <span className="text-slate-500 font-mono normal-case">· {commentsCount}</span>}
                                            {commentsCount > 0 && (commentsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
                                          </button>

                                          {commentsOpen && (
                                            <>
                                              {commentsCount > 0 && (
                                                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                                  {(task.comments || []).map(comment => (
                                                    <div key={comment.id} className="bg-white/[0.03] p-2 rounded-md space-y-1 border-l-2 border-indigo-500/30">
                                                      <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-bold text-indigo-400">{comment.authorId}</span>
                                                        <span className="text-[9px] text-slate-600">{new Date(comment.createdAt).toLocaleString()}</span>
                                                      </div>
                                                      <p className="text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap break-words">{comment.text}</p>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                              <div className="flex flex-col gap-2">
                                                <textarea
                                                  placeholder="Adicionar comentário ou atualização…"
                                                  value={newCommentTexts[task.id] || ''}
                                                  onChange={(e) => setNewCommentTexts({ ...newCommentTexts, [task.id]: e.target.value })}
                                                  className="w-full bg-black/20 border border-white/5 rounded-md px-2.5 py-2 text-[12px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/30 min-h-[56px]"
                                                />
                                                <button
                                                  onClick={() => handleAddComment(task)}
                                                  disabled={!(newCommentTexts[task.id] || '').trim()}
                                                  className="self-end px-3 py-1.5 bg-indigo-500 text-white text-[10px] font-bold rounded-md hover:bg-indigo-400 transition-colors disabled:opacity-40 disabled:hover:bg-indigo-500"
                                                >
                                                  Comentar
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Inline progress bar for list mode (collapsed) */}
                            {subTasksTotal > 0 && viewMode === 'list' && !isExpanded && (
                              <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden mt-1.5 ml-8">
                                <motion.div
                                  className="h-full bg-indigo-500/60"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                />
                              </div>
                            )}
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
                          <button onClick={() => { setAddingTaskForDay(null); setSelectedClientId('standalone'); setNewTaskTitle(''); setAddTab('backlog'); }}><X className="w-4 h-4 text-slate-500" /></button>
                        </div>

                        <select
                          value={selectedClientId}
                          onChange={(e) => { setSelectedClientId(e.target.value); setAddTab('backlog'); }}
                          className={`w-full border rounded-xl px-3 py-2 text-xs font-bold transition-all focus:outline-none focus:ring-2 appearance-none ${
                            selectedClientId === 'standalone'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 focus:ring-amber-500/20'
                              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 focus:ring-indigo-500/20'
                          }`}
                        >
                          <option value="standalone">⚡ Demanda Pontual (Sem Cliente)</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>📁 Cliente: {c.name}</option>
                          ))}
                        </select>

                        {selectedClientId !== 'standalone' && (
                          <div className="flex bg-black/20 rounded-lg p-0.5 border border-white/5">
                            <button
                              type="button"
                              onClick={() => setAddTab('backlog')}
                              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1 text-[9px] uppercase font-bold transition-all ${addTab === 'backlog' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                              <Search className="w-3 h-3" /> Do Backlog
                            </button>
                            <button
                              type="button"
                              onClick={() => setAddTab('new')}
                              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1 text-[9px] uppercase font-bold transition-all ${addTab === 'new' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                              <Plus className="w-3 h-3" /> Nova Demanda
                            </button>
                          </div>
                        )}

                        {selectedClientId !== 'standalone' && addTab === 'backlog' && (
                          <div className="space-y-2">
                            <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                              {selectedClientBacklog.map(t => (
                                <button
                                  key={t.id}
                                  onClick={() => handleAddTask(day, t)}
                                  className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-xs text-slate-400 hover:text-white transition-all border border-transparent hover:border-indigo-500/30 flex justify-between items-center group/btn"
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
                        )}

                        {(selectedClientId === 'standalone' || addTab === 'new') && (
                          <div className="space-y-4">
                            <textarea
                              autoFocus
                              placeholder="Descreva a demanda..."
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  if (selectedClientId === 'standalone') handleAddTask(day);
                                  else handleAddNewTaskForClient(day);
                                }
                              }}
                              className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 min-h-[60px]"
                            />

                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Responsáveis</label>
                              <div className="flex flex-wrap gap-1 p-1 bg-black/20 rounded-lg border border-white/5">
                                {teamMembers.map(m => {
                                  const isSelected = newTaskResponsibles.includes(m.id);
                                  return (
                                    <button
                                      key={m.id}
                                      type="button"
                                      onClick={() => {
                                        setNewTaskResponsibles(prev =>
                                          isSelected ? prev.filter(id => id !== m.id) : [...prev, m.id]
                                        );
                                      }}
                                      className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold transition-all ${isSelected ? 'bg-indigo-500 text-white shadow-md' : 'bg-transparent text-slate-400 hover:bg-white/10'}`}
                                    >
                                      {m.name.split(' ')[0]}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Tipo</label>
                              <div className="flex bg-black/20 rounded-lg p-0.5 border border-white/5">
                                <button
                                  type="button"
                                  onClick={() => setNewTaskType('scope')}
                                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1 text-[9px] uppercase font-bold transition-all ${newTaskType === 'scope' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                  <Package className="w-3 h-3" /> Escopo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNewTaskType('overdelivery')}
                                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1 text-[9px] uppercase font-bold transition-all ${newTaskType === 'overdelivery' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                  <Gift className="w-3 h-3" /> Overdelivery
                                </button>
                              </div>
                            </div>

                            {selectedClientId === 'standalone' ? (
                              <button
                                onClick={() => handleAddTask(day)}
                                disabled={!newTaskTitle.trim()}
                                className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:hover:bg-amber-600 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-600/20"
                              >
                                Agendar Demanda Pontual
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAddNewTaskForClient(day)}
                                disabled={!newTaskTitle.trim()}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
                              >
                                Criar e Agendar no Backlog
                              </button>
                            )}
                          </div>
                        )}

                      </motion.div>
                    ) : (
                      <button
                        onClick={() => setAddingTaskForDay(day)}
                        className={`w-full flex items-center justify-center gap-2 transition-all group ${
                          viewMode === 'list'
                            ? 'py-1.5 px-2 rounded-md text-slate-700 hover:text-indigo-400 hover:bg-white/[0.02] mt-1'
                            : 'py-4 rounded-2xl border-2 border-dashed border-white/5 text-slate-600 hover:bg-white/[0.02] hover:border-indigo-500/20 hover:text-indigo-400/60'
                        }`}
                      >
                        <Plus className={`${viewMode === 'list' ? 'w-3 h-3' : 'w-4 h-4'} group-hover:rotate-90 transition-transform duration-300`} />
                        <span className={`font-bold uppercase tracking-[0.2em] ml-1 ${viewMode === 'list' ? 'text-[9px]' : 'text-[10px]'}`}>
                          {viewMode === 'list' ? 'Adicionar' : 'Distribuir Demanda'}
                        </span>
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
