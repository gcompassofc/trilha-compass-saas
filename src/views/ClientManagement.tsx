import { useState } from 'react';
import { Plus, Trash2, Building2, ChevronRight, Briefcase, Users, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, MasterTask, Priority } from '../types';
import GlassCard from '../components/GlassCard';

interface ClientManagementProps {
  clients: Client[];
  onAddClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onUpdateClient: (client: Client) => void;
}

export default function ClientManagement({ clients, onAddClient, onDeleteClient, onUpdateClient }: ClientManagementProps) {
  const [newClientName, setNewClientName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');

  const handleAddClient = () => {
    if (!newClientName.trim()) return;
    const client: Client = {
      id: crypto.randomUUID(),
      name: newClientName,
      logo: '🏢',
      masterTasks: [],
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
    };
    onAddClient(client);
    setNewClientName('');
  };

  const handleAddTask = (clientId: string) => {
    if (!newTaskTitle.trim()) return;
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const newTask: MasterTask = {
      id: crypto.randomUUID(),
      title: newTaskTitle,
      completed: false,
      priority: newTaskPriority,
    };

    onUpdateClient({
      ...client,
      masterTasks: [newTask, ...client.masterTasks],
    });
    setNewTaskTitle('');
    setNewTaskPriority('medium');
  };

  const handleToggleMasterTask = (clientId: string, taskId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    onUpdateClient({
      ...client,
      masterTasks: client.masterTasks.map(t => 
        t.id === taskId ? { ...t, completed: !t.completed } : t
      ),
    });
  };

  const handleRemoveTask = (clientId: string, taskId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    onUpdateClient({
      ...client,
      masterTasks: client.masterTasks.filter(t => t.id !== taskId),
    });
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold prisma-text">Gestão de Clientes</h1>
        <p className="text-slate-400 font-light">Organize o backlog de demandas por projeto e as prioridades de cada cliente.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Client List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel p-4 border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Novo cliente..."
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddClient()}
                className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
              <button 
                onClick={handleAddClient}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {clients.map((client) => (
              <motion.button
                key={client.id}
                layout
                onClick={() => setSelectedClientId(client.id)}
                className={`w-full group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                  selectedClientId === client.id 
                    ? 'bg-indigo-600/10 border-indigo-500/50 shadow-[0_0_20px_rgba(79,70,229,0.15)]' 
                    : 'bg-white/5 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner border border-white/5"
                    style={{ backgroundColor: `${client.color}15`, color: client.color }}
                  >
                    {client.logo}
                  </div>
                  <div className="text-left">
                    <h3 className={`font-semibold transition-colors ${selectedClientId === client.id ? 'text-indigo-300' : 'text-slate-200'}`}>
                      {client.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500 font-mono uppercase">
                        {client.masterTasks.filter(t => !t.completed).length} pendentes
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${selectedClientId === client.id ? 'translate-x-1 text-indigo-400' : 'text-slate-600'}`} />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Client Details & Backlog */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedClient ? (
              <motion.div
                key={selectedClient.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <GlassCard className="p-8">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-6">
                      <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-2xl border border-white/10"
                        style={{ backgroundColor: `${selectedClient.color}10`, color: selectedClient.color }}
                      >
                        {selectedClient.logo}
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">{selectedClient.name}</h2>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-slate-400 text-sm flex items-center gap-1.5 font-light">
                            <Briefcase className="w-4 h-4 text-indigo-400" />
                            Backlog do Projeto
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        onDeleteClient(selectedClient.id);
                        setSelectedClientId(null);
                      }}
                      className="p-3 rounded-xl bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-rose-500/10"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-7">
                        <input
                          type="text"
                          placeholder="Adicionar tarefa ao backlog..."
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTask(selectedClient.id)}
                          className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <select
                          value={newTaskPriority}
                          onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                          className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 appearance-none text-slate-300"
                        >
                          <option value="high">Urgente</option>
                          <option value="medium">Normal</option>
                          <option value="low">Baixa</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <button 
                          onClick={() => handleAddTask(selectedClient.id)}
                          className="w-full h-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/10 active:scale-95"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mb-4">Demandas em Aberto</h4>
                      {selectedClient.masterTasks.filter(t => !t.completed).map((task) => (
                        <motion.div 
                          key={task.id}
                          layout
                          className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 group hover:border-white/10 transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <button onClick={() => handleToggleMasterTask(selectedClient.id, task.id)}>
                              <Circle className="w-5 h-5 text-slate-600 hover:text-indigo-400 transition-colors" />
                            </button>
                            <span className="text-slate-300 font-medium">{task.title}</span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                              task.priority === 'high' ? 'priority-high' : 
                              task.priority === 'medium' ? 'priority-medium' : 'priority-low'
                            }`}>
                              {task.priority === 'high' ? 'Urgente' : task.priority === 'medium' ? 'Normal' : 'Baixa'}
                            </span>
                          </div>
                          <button 
                            onClick={() => handleRemoveTask(selectedClient.id, task.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-500 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}
                      
                      {selectedClient.masterTasks.some(t => t.completed) && (
                        <>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mt-8 mb-4">Concluídas</h4>
                          {selectedClient.masterTasks.filter(t => t.completed).map((task) => (
                            <motion.div 
                              key={task.id}
                              layout
                              className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/[0.02] border border-emerald-500/5 group"
                            >
                              <div className="flex items-center gap-4 opacity-50">
                                <button onClick={() => handleToggleMasterTask(selectedClient.id, task.id)}>
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                </button>
                                <span className="text-slate-400 font-medium line-through">{task.title}</span>
                              </div>
                              <button 
                                onClick={() => handleRemoveTask(selectedClient.id, task.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-rose-500 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </motion.div>
                          ))}
                        </>
                      )}
                    </div>

                    {selectedClient.masterTasks.length === 0 && (
                      <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                        <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-20" />
                        <p className="text-slate-500 font-light">Nenhuma demanda registrada no backlog.</p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 py-32 px-8 border-2 border-dashed border-white/5 rounded-[3rem]">
                <Users className="w-16 h-16 mb-4 opacity-5" />
                <p className="text-lg font-light opacity-30">Selecione um cliente para gerenciar o backlog</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
