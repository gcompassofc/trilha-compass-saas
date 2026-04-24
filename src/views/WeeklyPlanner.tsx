import { useState } from 'react';
import { Plus, CheckCircle2, Circle, Trash2, Search, X } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Client, WeeklyTask, DayOfWeek, MasterTask } from '../types';

interface WeeklyPlannerProps {
  clients: Client[];
  weeklyTasks: WeeklyTask[];
  onAddTask: (task: WeeklyTask) => void;
  onUpdateTask: (task: WeeklyTask) => void;
  onDeleteTask: (id: string) => void;
  onReorderTasks: (day: DayOfWeek, tasks: WeeklyTask[]) => void;
}

const DAYS: DayOfWeek[] = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export default function WeeklyPlanner({ clients, weeklyTasks, onAddTask, onUpdateTask, onDeleteTask, onReorderTasks }: WeeklyPlannerProps) {
  const [addingTaskForDay, setAddingTaskForDay] = useState<DayOfWeek | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('standalone');

  const handleAddTask = (day: DayOfWeek, masterTask?: MasterTask) => {
    const task: WeeklyTask = {
      id: crypto.randomUUID(),
      day,
      title: masterTask ? masterTask.title : newTaskTitle,
      clientId: selectedClientId === 'standalone' ? undefined : selectedClientId,
      masterTaskId: masterTask?.id,
      completed: masterTask ? masterTask.completed : false,
      order: weeklyTasks.filter(t => t.day === day).length,
    };

    onAddTask(task);
    setNewTaskTitle('');
    setAddingTaskForDay(null);
  };

  const toggleTask = (task: WeeklyTask) => {
    onUpdateTask({ ...task, completed: !task.completed });
  };

  const selectedClientBacklog = clients.find(c => c.id === selectedClientId)?.masterTasks.filter(t => {
    // Only show tasks that are NOT already in the weekly planner OR show all? 
    // User said: "puxar as demandas que eu organizei ali nos clientes"
    // Usually we don't want to add the same task twice to the week.
    return !weeklyTasks.some(wt => wt.masterTaskId === t.id);
  }) || [];

  return (
    <div className="space-y-8 h-full flex flex-col">
      <header className="flex justify-between items-end">
        <div className="gap-2 flex flex-col">
          <h1 className="text-4xl font-bold prisma-text tracking-tight">Sprint Semanal</h1>
          <p className="text-slate-400 font-light">Distribua as demandas do backlog nos dias da semana.</p>
        </div>
        <div className="hidden lg:flex gap-4 items-center bg-white/5 border border-white/5 px-4 py-2 rounded-2xl">
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

      <div className="flex-1 overflow-x-auto pb-8 -mx-8 px-8">
        <div className="flex gap-6 min-w-max h-full">
          {DAYS.map((day, idx) => {
            const dayTasks = weeklyTasks
              .filter(t => t.day === day)
              .sort((a, b) => a.order - b.order);

            const isToday = new Date().toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase().includes(day.toLowerCase().slice(0, 3));

            return (
              <div key={day} className={`w-[340px] flex flex-col gap-4 relative ${isToday ? 'scale-105 z-10' : ''}`}>
                <div className="flex items-center justify-between px-3">
                  <div className="flex items-center gap-3">
                    <h2 className={`font-bold text-xl ${isToday ? 'text-indigo-400' : 'text-slate-200'}`}>{day}</h2>
                    {isToday && <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Hoje</span>}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
                    {dayTasks.length}
                  </span>
                </div>

                <div className={`flex-1 glass-panel p-3 min-h-[550px] flex flex-col gap-3 transition-colors ${isToday ? 'border-indigo-500/20 bg-indigo-500/[0.03]' : ''}`}>
                  <Reorder.Group 
                    axis="y" 
                    values={dayTasks} 
                    onReorder={(newTasks) => onReorderTasks(day, newTasks)}
                    className="flex flex-col gap-2"
                  >
                    {dayTasks.map((task) => {
                      const client = clients.find(c => c.id === task.clientId);
                      const masterTask = client?.masterTasks.find(mt => mt.id === task.masterTaskId);
                      
                      return (
                        <Reorder.Item
                          key={task.id}
                          value={task}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`group p-4 rounded-2xl border transition-all cursor-grab active:cursor-grabbing ${
                            task.completed 
                              ? 'bg-emerald-500/[0.03] border-emerald-500/10' 
                              : 'bg-white/[0.03] border-white/5 hover:border-white/10 hover:bg-white/[0.05] shadow-lg shadow-black/20'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button 
                              onClick={() => toggleTask(task)}
                              className="mt-0.5 flex-shrink-0"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-700 group-hover:text-slate-400 transition-colors" />
                              )}
                            </button>
                            
                            <div className="flex-1 min-w-0">
                              <p className={`text-[13px] leading-relaxed break-words font-medium ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                {task.title}
                              </p>
                              {client && (
                                <div className="mt-3 flex items-center gap-2">
                                  <span className="text-[9px] uppercase font-bold tracking-[0.1em] px-2 py-0.5 rounded bg-white/5" style={{ color: client.color }}>
                                    {client.name}
                                  </span>
                                  {masterTask?.priority === 'high' && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse" title="Prioridade Alta" />
                                  )}
                                </div>
                              )}
                            </div>

                            <button 
                              onClick={() => onDeleteTask(task.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-rose-500 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </Reorder.Item>
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
                          className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 appearance-none"
                        >
                          <option value="standalone">Demanda Pontual (Extra)</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
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
                                   <span className="truncate pr-2">{t.title}</span>
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
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/10"
                          >
                            Agendar Demanda
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
  );
}
