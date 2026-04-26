import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, CheckCircle2, Circle, Briefcase, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, WeeklyTask, MasterTask, TeamMember } from '../types';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  weeklyTasks: WeeklyTask[];
  teamMembers: TeamMember[];
}

export default function GlobalSearch({ isOpen, onClose, clients, weeklyTasks, teamMembers }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return { backlog: [], planner: [] };
    const lowerQuery = debouncedQuery.toLowerCase();

    const backlogResults: Array<{ task: MasterTask, client: Client }> = [];
    clients.forEach(client => {
      client.masterTasks.forEach(task => {
        if (task.title.toLowerCase().includes(lowerQuery) || client.name.toLowerCase().includes(lowerQuery)) {
          backlogResults.push({ task, client });
        }
      });
    });

    const plannerResults: Array<{ task: WeeklyTask, client?: Client }> = [];
    weeklyTasks.forEach(task => {
      const client = clients.find(c => c.id === task.clientId);
      if (task.title.toLowerCase().includes(lowerQuery) || (client && client.name.toLowerCase().includes(lowerQuery))) {
        plannerResults.push({ task, client });
      }
    });

    return {
      backlog: backlogResults.slice(0, 15),
      planner: plannerResults.slice(0, 15)
    };
  }, [debouncedQuery, clients, weeklyTasks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-white/[0.02]">
              <Search className="w-5 h-5 text-indigo-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Pesquisar demandas, clientes ou responsáveis..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 placeholder-slate-500 text-lg"
              />
              <button onClick={onClose} className="p-1 text-slate-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 custom-scrollbar flex-1 min-h-[300px]">
              {!debouncedQuery.trim() ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <Search className="w-12 h-12 text-slate-600 opacity-20 mb-4" />
                  <p className="text-slate-500 font-light">Digite algo para buscar no Backlog e no Planejador.</p>
                </div>
              ) : results.backlog.length === 0 && results.planner.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <p className="text-slate-500 font-light">Nenhum resultado encontrado para "<span className="text-white">{debouncedQuery}</span>"</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {results.planner.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> Planejador (Esta Semana)
                      </h3>
                      <div className="flex flex-col gap-2">
                        {results.planner.map(({ task, client }) => (
                          <div key={task.id} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-colors flex items-start gap-3">
                            {task.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> : <Circle className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />}
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className={`text-[13px] truncate ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{task.title}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] text-slate-400 font-mono bg-black/20 px-1.5 py-0.5 rounded border border-white/5">{task.day}</span>
                                {client && <span className="text-[9px] uppercase font-bold tracking-wider" style={{ color: client.color }}>{client.name}</span>}
                                {task.responsible && <span className="text-[9px] text-slate-500">Resp: {teamMembers.find(m => m.id === task.responsible || m.name === task.responsible)?.name || task.responsible}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.backlog.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                        <Briefcase className="w-3 h-3" /> Backlog de Clientes
                      </h3>
                      <div className="flex flex-col gap-2">
                        {results.backlog.map(({ task, client }) => (
                          <div key={task.id} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-amber-500/30 transition-colors flex items-start gap-3">
                            {task.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> : <Circle className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />}
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className={`text-[13px] truncate ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{task.title}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] uppercase font-bold tracking-wider" style={{ color: client.color }}>{client.name}</span>
                                {task.responsible && <span className="text-[9px] text-slate-500">Resp: {teamMembers.find(m => m.id === task.responsible || m.name === task.responsible)?.name || task.responsible}</span>}
                                {task.priority === 'high' && <span className="text-[9px] text-rose-500 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">URGENTE</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-white/5 bg-black/20 flex justify-between items-center text-[10px] text-slate-500 font-mono">
              <span>Resultados limitados a 15 itens por categoria</span>
              <span className="flex items-center gap-2">Pressione <kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/10">ESC</kbd> para fechar</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
