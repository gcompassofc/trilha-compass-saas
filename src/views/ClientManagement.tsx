import { useState, useRef } from 'react';
import { Plus, Trash2, Building2, ChevronRight, Briefcase, Users, CheckCircle2, Circle, AlertCircle, User2, ListTodo, X, Edit2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, MasterTask, Priority, SubTask, TeamMember } from '../types';
import GlassCard from '../components/GlassCard';

interface ClientManagementProps {
  clients: Client[];
  teamMembers: TeamMember[];
  onAddClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onUpdateClient: (client: Client) => void;
}

export default function ClientManagement({ clients, teamMembers, onAddClient, onDeleteClient, onUpdateClient }: ClientManagementProps) {
  const [newClientName, setNewClientName] = useState('');
  const [newClientLogoUrl, setNewClientLogoUrl] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [newTaskResponsible, setNewTaskResponsible] = useState<string>('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [subTasks, setSubTasks] = useState<Omit<SubTask, 'id'>[]>([]);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [editSubTaskTitle, setEditSubTaskTitle] = useState('');
  
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editClientName, setEditClientName] = useState('');
  const [editClientColor, setEditClientColor] = useState('');
  const [editClientLogoUrl, setEditClientLogoUrl] = useState('');

  const handleEditClientToggle = (client: Client) => {
    if (isEditingClient && selectedClientId === client.id) {
      setIsEditingClient(false);
    } else {
      setEditClientName(client.name);
      setEditClientColor(client.color);
      setEditClientLogoUrl(client.logoUrl || (client.logo !== '🏢' ? client.logo : '') || '');
      setIsEditingClient(true);
    }
  };

  const handleSaveClient = async (client: Client) => {
    if (!editClientName.trim()) return;
    try {
      onUpdateClient({
        ...client,
        name: editClientName,
        color: editClientColor,
        logoUrl: editClientLogoUrl,
        logo: editClientLogoUrl ? '' : '🏢'
      });
      setIsEditingClient(false);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar cliente.");
    }
  };

    const handleAddClient = () => {
    if (!newClientName.trim()) return;
    const client: Client = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)),
      name: newClientName,
      logo: newClientLogoUrl ? '' : '🏢',
      logoUrl: newClientLogoUrl || undefined,
      masterTasks: [],
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
    };
    onAddClient(client);
    setNewClientName('');
    setNewClientLogoUrl('');
  };

  const handleAddTask = (clientId: string) => {
    if (!newTaskTitle.trim()) return;
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const newTask: MasterTask = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)),
      title: newTaskTitle,
      completed: false,
      priority: newTaskPriority,
      responsible: newTaskResponsible || undefined,
      subTasks: subTasks.map(st => ({ ...st, id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)) }))
    };

    onUpdateClient({
      ...client,
      masterTasks: [newTask, ...client.masterTasks],
    });
    
    // Reset fields
    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setNewTaskResponsible('');
    setSubTasks([]);
  };

  const addSubTaskToNew = () => {
    if (!newSubTaskTitle.trim()) return;
    setSubTasks([...subTasks, { title: newSubTaskTitle, completed: false }]);
    setNewSubTaskTitle('');
  };

  const removeSubTaskFromNew = (index: number) => {
    setSubTasks(subTasks.filter((_, i) => i !== index));
  };

  const addSubTaskToExisting = (clientId: string, task: MasterTask) => {
    if (!editSubTaskTitle.trim()) return;
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const newSub: SubTask = { id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)), title: editSubTaskTitle, completed: false };
    
    onUpdateClient({
      ...client,
      masterTasks: client.masterTasks.map(t => 
        t.id === task.id ? { ...t, subTasks: [...(t.subTasks || []), newSub] } : t
      ),
    });
    setEditSubTaskTitle('');
  };

  const removeSubTaskFromExisting = (clientId: string, task: MasterTask, subTaskId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    onUpdateClient({
      ...client,
      masterTasks: client.masterTasks.map(t => 
        t.id === task.id ? { ...t, subTasks: (t.subTasks || []).filter(st => st.id !== subTaskId) } : t
      ),
    });
  };

  const changeExistingTaskResponsible = (clientId: string, task: MasterTask, responsible: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    onUpdateClient({
      ...client,
      masterTasks: client.masterTasks.map(t => 
        t.id === task.id ? { ...t, responsible: responsible || undefined } : t
      ),
    });
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
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Nome do cliente..."
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="URL da logo (opcional)..."
                  value={newClientLogoUrl}
                  onChange={(e) => setNewClientLogoUrl(e.target.value)}
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
          </div>

          <div className="space-y-2">
            {clients.map((client) => (
              <motion.button
                key={client.id}
                layout
                onClick={() => { setSelectedClientId(client.id); setIsEditingClient(false); }}
                className={`w-full group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                  selectedClientId === client.id 
                    ? 'bg-indigo-600/10 border-indigo-500/50 shadow-[0_0_20px_rgba(79,70,229,0.15)]' 
                    : 'bg-white/5 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner border border-white/5 transition-all group-hover:scale-110 overflow-hidden"
                    style={{ backgroundColor: `${client.color}20`, color: client.color, boxShadow: selectedClientId === client.id ? `0 0 15px ${client.color}40` : 'none' }}
                  >
                    {client.logoUrl ? <img src={client.logoUrl} className="w-full h-full object-cover" /> : client.logo}
                  </div>
                  <div className="text-left">
                    <h3 className={`font-bold transition-colors ${selectedClientId === client.id ? 'text-white' : 'text-slate-300'}`}>
                      {client.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${selectedClientId === client.id ? 'text-indigo-400' : 'text-slate-500'}`}>
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
                    <div className="flex items-center gap-6 w-full">
                      <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-2xl border border-white/10 overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: `${selectedClient.color}10`, color: selectedClient.color }}
                      >
                        {selectedClient.logoUrl ? <img src={selectedClient.logoUrl} className="w-full h-full object-cover" /> : selectedClient.logo}
                      </div>
                      
                      {isEditingClient ? (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                             <label className="text-[10px] text-slate-500 font-bold uppercase">Nome</label>
                             <input type="text" value={editClientName} onChange={e => setEditClientName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-indigo-500" />
                          </div>
                          <div>
                             <label className="text-[10px] text-slate-500 font-bold uppercase">Logo (URL da Imagem)</label>
                             <div className="flex gap-1">
                               <input type="text" value={editClientLogoUrl} onChange={e => setEditClientLogoUrl(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white" placeholder="https://..." />
                             </div>
                          </div>
                          <div>
                             <label className="text-[10px] text-slate-500 font-bold uppercase">Cor (Hex ou HSL)</label>
                             <input type="text" value={editClientColor} onChange={e => setEditClientColor(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-indigo-500" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <h2 className="text-3xl font-bold text-white tracking-tight">{selectedClient.name}</h2>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-slate-400 text-sm flex items-center gap-1.5 font-light">
                              <Briefcase className="w-4 h-4 text-indigo-400" />
                              Backlog do Projeto
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isEditingClient ? (
                        <button 
                          onClick={() => handleSaveClient(selectedClient)}
                          className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                        >
                          <Save className="w-5 h-5" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleEditClientToggle(selectedClient)}
                          className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
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
                  </div>

                  <div className="space-y-6">
                    <div className="glass-panel p-6 border-white/5 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Título da Demanda</label>
                          <input
                            type="text"
                            placeholder="Ex: Tráfego Pago"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Prioridade</label>
                          <select
                            value={newTaskPriority}
                            onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 appearance-none text-slate-300"
                          >
                            <option value="high">Urgente</option>
                            <option value="medium">Normal</option>
                            <option value="low">Baixa</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Responsável</label>
                          <select
                            value={newTaskResponsible}
                            onChange={(e) => setNewTaskResponsible(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 appearance-none text-slate-300"
                          >
                            <option value="">Ninguém</option>
                            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-slate-500 uppercase">Ação</label>
                           <button 
                            onClick={() => handleAddTask(selectedClient.id)}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 font-bold transition-all shadow-lg shadow-indigo-600/10 active:scale-95"
                          >
                            Adicionar ao Backlog
                          </button>
                        </div>
                      </div>

                      {/* Subtasks Creation */}
                      <div className="space-y-3 pt-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                          <ListTodo className="w-3 h-3" /> Subtarefas ({subTasks.length})
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Ex: Pegar acessos..."
                            value={newSubTaskTitle}
                            onChange={(e) => setNewSubTaskTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addSubTaskToNew()}
                            className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                          />
                          <button onClick={addSubTaskToNew} className="p-2 bg-white/10 rounded-xl hover:bg-white/20"><Plus className="w-4 h-4 text-white" /></button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {subTasks.map((st, i) => (
                            <span key={i} className="text-[10px] bg-white/5 text-slate-300 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                              {st.title}
                              <button onClick={() => removeSubTaskFromNew(i)}><X className="w-3 h-3 text-rose-500" /></button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mb-4">Demandas em Aberto</h4>
                      {selectedClient.masterTasks.filter(t => !t.completed).map((task) => {
                        const isEditing = editingTaskId === task.id;
                        const responsibleMember = teamMembers.find(m => m.id === task.responsible || m.name === task.responsible);

                        return (
                          <motion.div 
                            key={task.id}
                            layout
                            className={`flex flex-col p-4 rounded-xl border transition-all group ${
                              isEditing ? 'bg-indigo-500/[0.03] border-indigo-500/20' : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                            }`}
                            style={!task.completed ? { borderLeft: `3px solid ${selectedClient.color}` } : {}}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4 flex-1">
                                <button onClick={() => handleToggleMasterTask(selectedClient.id, task.id)} className="mt-0.5">
                                  <Circle className="w-5 h-5 text-slate-600 hover:text-indigo-400 transition-colors" />
                                </button>
                                <div className="flex flex-col flex-1">
                                  <span className="text-slate-200 font-bold cursor-pointer hover:text-white transition-colors" onClick={() => setEditingTaskId(isEditing ? null : task.id)}>{task.title}</span>
                                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                    <span className={`text-[8px] uppercase font-black tracking-tighter px-2 py-0.5 rounded border ${
                                      task.priority === 'high' ? 'bg-rose-500/20 text-rose-500 border-rose-500/20' : 
                                      task.priority === 'medium' ? 'bg-amber-500/20 text-amber-500 border-amber-500/20' : 'bg-slate-500/20 text-slate-500 border-slate-500/20'
                                    }`}>
                                      {task.priority === 'high' ? 'URGENTE' : task.priority === 'medium' ? 'NORMAL' : 'BAIXA'}
                                    </span>

                                    {task.responsible && (
                                      <span className="text-[8px] text-slate-500 flex items-center gap-1">
                                        {responsibleMember?.photoUrl ? (
                                          <img src={responsibleMember.photoUrl} alt={responsibleMember.name} className="w-3 h-3 rounded-full object-cover" />
                                        ) : (
                                          <User2 className="w-2 h-2" /> 
                                        )}
                                        {responsibleMember ? responsibleMember.name : task.responsible}
                                      </span>
                                    )}
                                    {task.subTasks && task.subTasks.length > 0 && (
                                      <span className="text-[8px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                        {task.subTasks.length} subtarefas
                                      </span>
                                    )}
                                  </div>

                                  <AnimatePresence>
                                    {isEditing && (
                                      <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="pt-4 mt-3 border-t border-white/5 space-y-3 overflow-hidden"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Responsável:</span>
                                          <select 
                                            value={task.responsible || ''}
                                            onChange={(e) => changeExistingTaskResponsible(selectedClient.id, task, e.target.value)}
                                            className="bg-transparent text-[10px] text-slate-300 focus:outline-none border-none p-0 cursor-pointer hover:text-indigo-400"
                                          >
                                            <option value="">Ninguém</option>
                                            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                          </select>
                                        </div>

                                        <div className="space-y-2">
                                          <label className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                            Subtarefas
                                          </label>
                                          <div className="flex flex-col gap-1.5">
                                            {(task.subTasks || []).map(st => (
                                              <div key={st.id} className="flex items-center gap-2 text-[11px] text-slate-400 bg-white/5 px-2 py-1.5 rounded-lg group/st">
                                                <span className="flex-1">{st.title}</span>
                                                <button onClick={() => removeSubTaskFromExisting(selectedClient.id, task, st.id)} className="opacity-0 group-hover/st:opacity-100 p-0.5 text-slate-600 hover:text-rose-500"><X className="w-3 h-3" /></button>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="flex gap-2 pt-1">
                                            <input 
                                              type="text" 
                                              placeholder="Nova subtarefa..."
                                              value={editSubTaskTitle}
                                              onChange={(e) => setEditSubTaskTitle(e.target.value)}
                                              onKeyDown={(e) => e.key === 'Enter' && addSubTaskToExisting(selectedClient.id, task)}
                                              className="flex-1 bg-black/20 border border-white/5 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                                            />
                                            <button onClick={() => addSubTaskToExisting(selectedClient.id, task)} className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30"><Plus className="w-3 h-3" /></button>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={() => setEditingTaskId(isEditing ? null : task.id)}
                                  className="p-1.5 text-slate-500 hover:text-indigo-400 transition-all bg-white/5 rounded-lg"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleRemoveTask(selectedClient.id, task.id)}
                                  className="p-1.5 text-slate-500 hover:text-rose-500 transition-all bg-white/5 rounded-lg"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                      
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
