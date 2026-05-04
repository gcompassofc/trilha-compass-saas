import React, { useState, useRef } from 'react';
import { Plus, Trash2, Building2, ChevronRight, ChevronLeft, Briefcase, Users, CheckCircle2, Circle, AlertCircle, User2, ListTodo, X, Edit2, Save, ArrowUp, ArrowDown, Upload, Calendar, Package, Gift, Download } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import { exportClientTasksToCSV } from '../utils/exportUtils';
import { motion, AnimatePresence } from 'motion/react';
import { Client, MasterTask, Priority, SubTask, TeamMember, WeeklyTask, DayOfWeek, TaskType } from '../types';
import GlassCard from '../components/GlassCard';

const getWeekIdFromDateString = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const dayOfWeekNum = d.getDay();
  const diff = d.getDate() - dayOfWeekNum + (dayOfWeekNum === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
};

const getDayOfWeekFromDateString = (dateStr: string): DayOfWeek => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const days: DayOfWeek[] = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[d.getDay()];
};

interface ClientManagementProps {
  clients: Client[];
  teamMembers: TeamMember[];
  onAddClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onUpdateClient: (client: Client) => void;
  currentWeekId?: string;
  onAddWeeklyTask?: (task: Omit<WeeklyTask, 'id'>) => void;
  onReorderClients?: (clients: Client[]) => void;
}

export default function ClientManagement({ clients, teamMembers, onAddClient, onDeleteClient, onUpdateClient, currentWeekId, onAddWeeklyTask, onReorderClients }: ClientManagementProps) {
  const [newClientName, setNewClientName] = useState('');
  const [newClientLogoUrl, setNewClientLogoUrl] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [newTaskResponsibles, setNewTaskResponsibles] = useState<string[]>([]);
  const [newTaskType, setNewTaskType] = useState<TaskType>('scope');
  const [newTaskPhase, setNewTaskPhase] = useState<string>('');
  const [newTaskDate, setNewTaskDate] = useState<string>('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [subTasks, setSubTasks] = useState<Omit<SubTask, 'id'>[]>([]);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [editSubTaskTitle, setEditSubTaskTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  
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
      phase: newTaskPhase || undefined,
      dueDate: newTaskDate || undefined,
      responsible: newTaskResponsibles[0] || undefined,
      responsibles: newTaskResponsibles,
      taskType: newTaskType,
      subTasks: subTasks.map(st => ({ ...st, id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)) }))
    };

    onUpdateClient({
      ...client,
      masterTasks: [newTask, ...client.masterTasks],
    });

    if (newTaskDate && onAddWeeklyTask) {
      onAddWeeklyTask({
        weekId: getWeekIdFromDateString(newTaskDate),
        day: getDayOfWeekFromDateString(newTaskDate),
        title: newTask.title,
        clientId: client.id,
        masterTaskId: newTask.id,
        completed: false,
        order: 999,
        subTasks: newTask.subTasks,
        responsible: newTask.responsible,
        responsibles: newTask.responsibles,
        taskType: newTask.taskType,
        phase: newTask.phase,
        dueDate: newTaskDate,
        comments: []
      });
    }// Reset fields
    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setNewTaskResponsibles([]);
    setNewTaskType('scope');
    setNewTaskDate('');
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

  const handleAddCommentToExisting = (clientId: string, task: MasterTask) => {
    if (!newCommentText.trim()) return;
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const newComment = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)),
      authorId: 'Usuário',
      text: newCommentText,
      createdAt: Date.now()
    };

    onUpdateClient({
      ...client,
      masterTasks: client.masterTasks.map(t => 
        t.id === task.id ? { ...t, comments: [...(t.comments || []), newComment] } : t
      ),
    });
    setNewCommentText('');
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

  const reorderSubTaskForExisting = (clientId: string, task: MasterTask, index: number, direction: 'up' | 'down') => {
    const client = clients.find(c => c.id === clientId);
    if (!client || !task.subTasks) return;

    const newSubTasks = [...task.subTasks];
    if (direction === 'up' && index > 0) {
      [newSubTasks[index - 1], newSubTasks[index]] = [newSubTasks[index], newSubTasks[index - 1]];
    } else if (direction === 'down' && index < newSubTasks.length - 1) {
      [newSubTasks[index + 1], newSubTasks[index]] = [newSubTasks[index], newSubTasks[index + 1]];
    } else {
      return;
    }

    onUpdateClient({
      ...client,
      masterTasks: client.masterTasks.map(t => 
        t.id === task.id ? { ...t, subTasks: newSubTasks } : t
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

  const handleMoveClient = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onReorderClients) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= clients.length) return;
    
    const newClients = [...clients];
    const temp = newClients[index];
    newClients[index] = newClients[newIndex];
    newClients[newIndex] = temp;
    
    onReorderClients(newClients);
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-4xl font-bold prisma-text">Gestão de Clientes</h1>
          <p className="text-slate-400 font-light">Organize o backlog de demandas por projeto e as prioridades de cada cliente.</p>
        </div>
        <button 
          onClick={() => exportClientTasksToCSV(clients, teamMembers)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl transition-all border border-emerald-500/20 shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-bold">Exportar Planilha</span>
        </button>
      </header>

      {!selectedClientId ? (
        <div className="space-y-6">
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
                <div className="flex-1 relative flex items-center">
                  <input
                    type="text"
                    placeholder="URL da logo (opcional)..."
                    value={newClientLogoUrl}
                    onChange={(e) => setNewClientLogoUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddClient()}
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                  <label className="absolute right-2 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors text-slate-400 hover:text-white" title="Fazer upload de imagem">
                    <Upload className="w-4 h-4" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          try {
                            const b64 = await compressImage(e.target.files[0], 200, 200);
                            setNewClientLogoUrl(b64);
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }} 
                    />
                  </label>
                </div>
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
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div 
                      onClick={(e) => handleMoveClient(clients.indexOf(client), 'up', e)}
                      className="p-1 rounded bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white transition-colors"
                      style={{ visibility: clients.indexOf(client) === 0 ? 'hidden' : 'visible' }}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </div>
                    <div 
                      onClick={(e) => handleMoveClient(clients.indexOf(client), 'down', e)}
                      className="p-1 rounded bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white transition-colors"
                      style={{ visibility: clients.indexOf(client) === clients.length - 1 ? 'hidden' : 'visible' }}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${selectedClientId === client.id ? 'translate-x-1 text-indigo-400' : 'text-slate-600'}`} />
                </div>

              </motion.button>
            ))}
            </div>
          </div>
      ) : (
        <div className="w-full">
          <AnimatePresence mode="wait">
            {selectedClient ? (
              <motion.div
                key={selectedClient.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <button 
                  onClick={() => setSelectedClientId(null)}
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group bg-white/5 px-4 py-2 rounded-xl w-fit border border-white/10 hover:bg-white/10"
                >
                  <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  <span className="font-medium text-sm">Voltar para clientes</span>
                </button>

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
                             <label className="text-[10px] text-slate-500 font-bold uppercase">Logo (URL ou Upload)</label>
                             <div className="flex gap-1 relative items-center">
                               <input type="text" value={editClientLogoUrl} onChange={e => setEditClientLogoUrl(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 pr-8 text-xs text-white" placeholder="https://..." />
                               <label className="absolute right-1 p-1 bg-white/10 hover:bg-white/20 rounded cursor-pointer transition-colors text-slate-300" title="Upload Imagem">
                                 <Upload className="w-3 h-3" />
                                 <input 
                                   type="file" 
                                   accept="image/*" 
                                   className="hidden" 
                                   onChange={async (e) => {
                                     if (e.target.files && e.target.files[0]) {
                                       try {
                                         const b64 = await compressImage(e.target.files[0], 200, 200);
                                         setEditClientLogoUrl(b64);
                                       } catch (err) {
                                         console.error(err);
                                       }
                                     }
                                   }} 
                                 />
                               </label>
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
                    <div className="glass-panel p-6 border-white/5 space-y-6">
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
                          <label className="text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                            Responsáveis
                          </label>
                          <div className="flex flex-wrap gap-1.5 p-1 bg-white/5 border border-white/5 rounded-xl min-h-[44px] items-center custom-scrollbar overflow-x-auto">
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
                                  className={`px-2 py-1 rounded-lg text-[10px] uppercase font-bold transition-all whitespace-nowrap ${isSelected ? 'bg-indigo-500 text-white shadow-md' : 'bg-transparent text-slate-400 hover:bg-white/10'}`}
                                >
                                  {m.name.split(' ')[0]}
                                </button>
                              );
                            })}
                            {teamMembers.length === 0 && <span className="text-[10px] text-slate-500 italic px-2">Nenhum membro</span>}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
                          <div className="flex bg-white/5 border border-white/5 rounded-xl p-1 h-[44px]">
                            <button
                              type="button"
                              onClick={() => setNewTaskType('scope')}
                              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${newTaskType === 'scope' || !newTaskType ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'}`}
                            >
                              <Package className="w-3 h-3" /> Escopo
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewTaskType('overdelivery')}
                              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${newTaskType === 'overdelivery' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'}`}
                            >
                              <Gift className="w-3 h-3" /> Overdelivery
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Data (Opcional)</label>
                          <input
                            type="date"
                            value={newTaskDate}
                            onChange={(e) => setNewTaskDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 appearance-none text-slate-300"
                          />
                        </div>
                      </div>

                      {/* Subtasks Creation */}
                      <div className="space-y-3 pt-2 border-t border-white/5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 pt-2">
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

                      <div className="pt-2">
                        <button 
                          onClick={() => handleAddTask(selectedClient.id)}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-bold transition-all shadow-lg shadow-indigo-600/10 active:scale-95 flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Adicionar Demanda {newTaskDate ? `ao Backlog e Planejador (${getDayOfWeekFromDateString(newTaskDate).substring(0, 3)})` : 'ao Backlog'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {(() => {
                        const openTasks = selectedClient.masterTasks.filter(t => !t.completed);
                        if (openTasks.length === 0) return (
                          <div className="text-center py-8 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-slate-500 font-light text-sm">Nenhuma demanda em aberto.</p>
                          </div>
                        );

                        const grouped = openTasks.reduce((acc, task) => {
                          if (!task.dueDate) {
                            if (!acc['Backlog / Sem Data']) acc['Backlog / Sem Data'] = [];
                            acc['Backlog / Sem Data'].push(task);
                          } else {
                            const weekId = getWeekIdFromDateString(task.dueDate);
                            const [year, month, day] = weekId.split('-');
                            const weekName = `Semana de ${day}/${month}`;
                            if (!acc[weekName]) acc[weekName] = [];
                            acc[weekName].push(task);
                          }
                          return acc;
                        }, {} as Record<string, MasterTask[]>);

                        const weekKeys = Object.keys(grouped).filter(k => k !== 'Backlog / Sem Data').sort((a, b) => {
                          const [dayA, monthA] = a.split(' ')[2].split('/');
                          const [dayB, monthB] = b.split(' ')[2].split('/');
                          return `${monthA}${dayA}`.localeCompare(`${monthB}${dayB}`);
                        });
                        
                        const sortedKeys = ['Backlog / Sem Data', ...weekKeys].filter(k => grouped[k] && grouped[k].length > 0);

                        return sortedKeys.map(groupName => {
                          const tasks = grouped[groupName];
                          return (
                            <div key={groupName} className="space-y-2 mb-6">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mb-4 flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" /> {groupName} 
                                <span className="bg-white/5 px-2 py-0.5 rounded-md text-[10px] ml-auto">{tasks.length} {tasks.length === 1 ? 'demanda' : 'demandas'}</span>
                              </h4>
                              {tasks.map((task) => {
                                const isEditing = editingTaskId === task.id;
                                const currentResponsibles = task.responsibles || (task.responsible ? [task.responsible] : []);
                                
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
                                  {isEditing ? (
                                    <input 
                                      type="text" 
                                      value={task.title}
                                      onChange={(e) => {
                                        const updated = { ...task, title: e.target.value };
                                        onUpdateClient({
                                          ...selectedClient,
                                          masterTasks: selectedClient.masterTasks.map(t => t.id === task.id ? updated : t)
                                        });
                                      }}
                                      className="bg-transparent text-slate-200 font-bold border-b border-indigo-500/50 focus:outline-none focus:border-indigo-400 w-full mb-1"
                                    />
                                  ) : (
                                    <span className="text-slate-200 font-bold cursor-pointer hover:text-white transition-colors" onClick={() => setEditingTaskId(isEditing ? null : task.id)}>{task.title}</span>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                    <span className={`text-[8px] uppercase font-black tracking-tighter px-2 py-0.5 rounded border ${
                                      task.priority === 'high' ? 'bg-rose-500/20 text-rose-500 border-rose-500/20' : 
                                      task.priority === 'medium' ? 'bg-amber-500/20 text-amber-500 border-amber-500/20' : 'bg-slate-500/20 text-slate-500 border-slate-500/20'
                                    }`}>
                                      {task.priority === 'high' ? 'URGENTE' : task.priority === 'medium' ? 'NORMAL' : 'BAIXA'}
                                    </span>
                                    {task.taskType === 'overdelivery' && (
                                      <span className="text-[8px] uppercase font-black tracking-tighter px-2 py-0.5 rounded border bg-purple-500/20 text-purple-400 border-purple-500/20 flex items-center gap-1">
                                        <Gift className="w-2 h-2" /> OVERDELIVERY
                                      </span>
                                    )}

                                    {currentResponsibles.length > 0 && (
                                      <div className="flex -space-x-1.5 items-center">
                                        {currentResponsibles.map((respId, idx) => {
                                          const member = teamMembers.find(m => m.id === respId || m.name === respId);
                                          if (!member) return null;
                                          return (
                                            <div key={idx} className="relative z-10 hover:z-20 group/avatar">
                                              {member.photoUrl ? (
                                                <img src={member.photoUrl} alt={member.name} className="w-5 h-5 rounded-full object-cover border border-indigo-900 shadow-sm" />
                                              ) : (
                                                <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center border border-indigo-900 shadow-sm text-[8px] text-white">
                                                  <User2 className="w-3 h-3" />
                                                </div>
                                              )}
                                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-black/80 text-[8px] text-white rounded opacity-0 group-hover/avatar:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                                                {member.name.split(' ')[0]}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                    {task.subTasks && task.subTasks.length > 0 && (
                                      <span className="text-[8px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                        {task.subTasks.length} subtarefas
                                      </span>
                                    )}
                                    {task.dueDate && (
                                      <span className="text-[8px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        📅 {task.dueDate.split('-').reverse().join('/')}
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
                                        <div className="flex flex-col gap-3">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Responsáveis:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {teamMembers.map(m => {
                                                const isSelected = currentResponsibles.includes(m.id);
                                                return (
                                                  <button
                                                    key={m.id}
                                                    onClick={() => {
                                                      const newResp = isSelected ? currentResponsibles.filter(id => id !== m.id) : [...currentResponsibles, m.id];
                                                      onUpdateClient({
                                                        ...selectedClient,
                                                        masterTasks: selectedClient.masterTasks.map(t => t.id === task.id ? { ...t, responsibles: newResp, responsible: newResp[0] } : t)
                                                      });
                                                    }}
                                                    className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold transition-all ${isSelected ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-500 hover:text-slate-300'}`}
                                                  >
                                                    {m.name.split(' ')[0]}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-4">
                                            <div className="flex items-center gap-2">
                                              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Tipo:</span>
                                              <div className="flex bg-white/5 rounded p-0.5">
                                                <button
                                                  onClick={() => {
                                                    onUpdateClient({
                                                      ...selectedClient,
                                                      masterTasks: selectedClient.masterTasks.map(t => t.id === task.id ? { ...t, taskType: 'scope' } : t)
                                                    });
                                                  }}
                                                  className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold transition-all ${task.taskType === 'scope' || !task.taskType ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                  Escopo
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    onUpdateClient({
                                                      ...selectedClient,
                                                      masterTasks: selectedClient.masterTasks.map(t => t.id === task.id ? { ...t, taskType: 'overdelivery' } : t)
                                                    });
                                                  }}
                                                  className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold transition-all ${task.taskType === 'overdelivery' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                  Overdelivery
                                                </button>
                                              </div>
                                            </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Data:</span>
                                            <input 
                                              type="date"
                                              value={task.dueDate || ''}
                                              onChange={(e) => {
                                                const updated = { ...task, dueDate: e.target.value };
                                                onUpdateClient({
                                                  ...selectedClient,
                                                  masterTasks: selectedClient.masterTasks.map(t => t.id === task.id ? updated : t)
                                                });
                                              }}
                                              className="bg-transparent text-[10px] text-slate-300 focus:outline-none border-none p-0 cursor-pointer hover:text-indigo-400"
                                            />
                                          </div>
                                        </div>

                                        <div className="space-y-2">
                                          <label className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                            Subtarefas
                                          </label>
                                          <div className="flex flex-col gap-1.5">
                                            {(task.subTasks || []).map((st, index) => (
                                              <div key={st.id} className="flex items-center gap-2 text-[11px] text-slate-400 bg-white/5 px-2 py-1.5 rounded-lg group/st">
                                                <div className="flex flex-col gap-0.5 opacity-0 group-hover/st:opacity-100 mr-1">
                                                  <button 
                                                    onClick={() => reorderSubTaskForExisting(selectedClient.id, task, index, 'up')}
                                                    disabled={index === 0}
                                                    className="p-0.5 hover:text-indigo-400 disabled:opacity-30 disabled:hover:text-slate-400"
                                                  >
                                                    <ArrowUp className="w-2.5 h-2.5" />
                                                  </button>
                                                  <button 
                                                    onClick={() => reorderSubTaskForExisting(selectedClient.id, task, index, 'down')}
                                                    disabled={index === (task.subTasks?.length || 0) - 1}
                                                    className="p-0.5 hover:text-indigo-400 disabled:opacity-30 disabled:hover:text-slate-400"
                                                  >
                                                    <ArrowDown className="w-2.5 h-2.5" />
                                                  </button>
                                                </div>
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

                                        {/* Comentários */}
                                        <div className="space-y-2 pt-2 border-t border-white/5 mt-2">
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
                                              placeholder="Adicionar comentário, link ou atualização..."
                                              value={newCommentText}
                                              onChange={(e) => setNewCommentText(e.target.value)}
                                              className="w-full bg-black/20 border border-white/5 rounded-lg px-2 py-2 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/30 min-h-[60px]"
                                            />
                                            <button 
                                              onClick={() => handleAddCommentToExisting(selectedClient.id, task)} 
                                              className="self-end px-3 py-1.5 bg-indigo-500 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-400 transition-colors"
                                            >
                                              Comentar
                                            </button>
                                          </div>
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
                            </div>
                          );
                        });
                      })()}
                      
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
            ) : null}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
