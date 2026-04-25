const fs = require('fs');

// Patch App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(
  /<ClientManagement\s+clients={clients}\s+teamMembers={teamMembers}\s+onAddClient={handleAddClient}\s+onDeleteClient={handleDeleteClient}\s+onUpdateClient={handleUpdateClient}\s+\/>/g,
  `<ClientManagement 
                clients={clients}
                teamMembers={teamMembers}
                onAddClient={handleAddClient}
                onDeleteClient={handleDeleteClient}
                onUpdateClient={handleUpdateClient}
                currentWeekId={currentWeekId}
                onAddWeeklyTask={handleAddTask}
              />`
);
fs.writeFileSync('src/App.tsx', appContent, 'utf8');

// Patch ClientManagement.tsx
let cmContent = fs.readFileSync('src/ClientManagement.tsx', 'utf8').catch(() => fs.readFileSync('src/views/ClientManagement.tsx', 'utf8'));

// Add imports
cmContent = cmContent.replace(
  /import { Client, MasterTask, Priority, SubTask, TeamMember } from '\.\.\/types';/,
  "import { Client, MasterTask, Priority, SubTask, TeamMember, WeeklyTask, DayOfWeek } from '../types';"
);

// Add props
cmContent = cmContent.replace(
  /onUpdateClient: \(client: Client\) => void;\r?\n}/,
  "onUpdateClient: (client: Client) => void;\n  currentWeekId?: string;\n  onAddWeeklyTask?: (task: Omit<WeeklyTask, 'id'>) => void;\n}"
);

cmContent = cmContent.replace(
  /export default function ClientManagement\(\{ clients, teamMembers, onAddClient, onDeleteClient, onUpdateClient \}: ClientManagementProps\) {/,
  "export default function ClientManagement({ clients, teamMembers, onAddClient, onDeleteClient, onUpdateClient, currentWeekId, onAddWeeklyTask }: ClientManagementProps) {"
);

// Add new state
cmContent = cmContent.replace(
  /const \[newTaskResponsible, setNewTaskResponsible\] = useState<string>\(''\);/,
  "const [newTaskResponsible, setNewTaskResponsible] = useState<string>('');\n  const [newTaskDay, setNewTaskDay] = useState<string>('');"
);

// Update handleAddTask
const handleAddTaskOld = `  const handleAddTask = (clientId: string) => {
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
  };`;

const handleAddTaskNew = `  const handleAddTask = (clientId: string) => {
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

    if (newTaskDay && onAddWeeklyTask && currentWeekId) {
      onAddWeeklyTask({
        weekId: currentWeekId,
        day: newTaskDay as DayOfWeek,
        title: newTask.title,
        clientId: client.id,
        masterTaskId: newTask.id,
        completed: false,
        order: 999,
        subTasks: newTask.subTasks,
        responsible: newTask.responsible
      });
    }
    
    // Reset fields
    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setNewTaskResponsible('');
    setNewTaskDay('');
    setSubTasks([]);
  };`;

cmContent = cmContent.replace(handleAddTaskOld, handleAddTaskNew);
// If it fails to match exact strings, try regex:
if(!cmContent.includes("if (newTaskDay && onAddWeeklyTask && currentWeekId)")) {
  cmContent = cmContent.replace(
    /const handleAddTask = \(clientId: string\) => {[\s\S]*?setSubTasks\(\[\]\);\r?\n  };/,
    handleAddTaskNew
  );
}

// UI Reordering
const oldUISection = `<div className="glass-panel p-6 border-white/5 space-y-4">
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
                    </div>`;

const newUISection = `<div className="glass-panel p-6 border-white/5 space-y-6">
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
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Planejar para (Opcional)</label>
                          <select
                            value={newTaskDay}
                            onChange={(e) => setNewTaskDay(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 appearance-none text-slate-300"
                          >
                            <option value="">Apenas no Backlog</option>
                            <option value="Segunda">Segunda</option>
                            <option value="Terça">Terça</option>
                            <option value="Quarta">Quarta</option>
                            <option value="Quinta">Quinta</option>
                            <option value="Sexta">Sexta</option>
                            <option value="Sábado">Sábado</option>
                            <option value="Domingo">Domingo</option>
                          </select>
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
                          Adicionar Demanda {newTaskDay ? \`ao Backlog e Planejador (\${newTaskDay})\` : 'ao Backlog'}
                        </button>
                      </div>
                    </div>`;

cmContent = cmContent.replace(oldUISection, newUISection);

if (!cmContent.includes("Planejar para (Opcional)")) {
  // Try regex replace
  cmContent = cmContent.replace(
    /<div className="glass-panel p-6 border-white\/5 space-y-4">[\s\S]*?<\/div>\r?\n\s*<\/div>\r?\n\s*<\/div>/,
    newUISection
  );
}

fs.writeFileSync('src/views/ClientManagement.tsx', cmContent, 'utf8');
