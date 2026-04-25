const fs = require('fs');
const path = 'src/views/ClientManagement.tsx';

let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { useState } from 'react';",
  "import { useState, useRef } from 'react';"
);

content = content.replace(
  "import { Plus, Trash2, Building2, ChevronRight, Briefcase, Users, CheckCircle2, Circle, AlertCircle, User2, ListTodo, X, Edit2 } from 'lucide-react';",
  "import { Plus, Trash2, Building2, ChevronRight, Briefcase, Users, CheckCircle2, Circle, AlertCircle, User2, ListTodo, X, Edit2, Upload, Save } from 'lucide-react';\nimport { storageService } from '../services/storage';"
);

content = content.replace(
  "  const [editSubTaskTitle, setEditSubTaskTitle] = useState('');",
  `  const [editSubTaskTitle, setEditSubTaskTitle] = useState('');
  
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editClientName, setEditClientName] = useState('');
  const [editClientColor, setEditClientColor] = useState('');
  const [editClientLogoUrl, setEditClientLogoUrl] = useState('');
  const [selectedClientFile, setSelectedClientFile] = useState<File | null>(null);
  const [isUploadingClient, setIsUploadingClient] = useState(false);
  const clientFileInputRef = useRef<HTMLInputElement>(null);

  const handleEditClientToggle = (client: Client) => {
    if (isEditingClient && selectedClientId === client.id) {
      setIsEditingClient(false);
    } else {
      setEditClientName(client.name);
      setEditClientColor(client.color);
      setEditClientLogoUrl(client.logoUrl || client.logo || '');
      setSelectedClientFile(null);
      setIsEditingClient(true);
    }
  };

  const handleSaveClient = async (client: Client) => {
    if (!editClientName.trim()) return;
    setIsUploadingClient(true);
    try {
      let finalLogoUrl = editClientLogoUrl;
      if (selectedClientFile) {
        finalLogoUrl = await storageService.uploadImage(selectedClientFile, 'clients');
      }
      onUpdateClient({
        ...client,
        name: editClientName,
        color: editClientColor,
        logoUrl: finalLogoUrl,
        logo: finalLogoUrl ? '' : '🏢'
      });
      setIsEditingClient(false);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar cliente.");
    } finally {
      setIsUploadingClient(false);
    }
  };

  const handleClientFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedClientFile(e.target.files[0]);
    }
  };`
);

content = content.replace(
  "onClick={() => setSelectedClientId(client.id)}",
  "onClick={() => { setSelectedClientId(client.id); setIsEditingClient(false); }}"
);

content = content.replace(
  `                  <div \n                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner border border-white/5 transition-all group-hover:scale-110"\n                    style={{ backgroundColor: \`\${client.color}20\`, color: client.color, boxShadow: selectedClientId === client.id ? \`0 0 15px \${client.color}40\` : 'none' }}\n                  >\n                    {client.logo}\n                  </div>`,
  `                  <div \n                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner border border-white/5 transition-all group-hover:scale-110 overflow-hidden"\n                    style={{ backgroundColor: \`\${client.color}20\`, color: client.color, boxShadow: selectedClientId === client.id ? \`0 0 15px \${client.color}40\` : 'none' }}\n                  >\n                    {client.logoUrl ? <img src={client.logoUrl} className="w-full h-full object-cover" /> : client.logo}\n                  </div>`
);

const headerReplacement = `                    <div className="flex items-center gap-6 w-full">
                      <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-2xl border border-white/10 overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: \`\${selectedClient.color}10\`, color: selectedClient.color }}
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
                             <label className="text-[10px] text-slate-500 font-bold uppercase">Logo (Upload ou URL)</label>
                             <div className="flex gap-1">
                               <input type="text" value={selectedClientFile ? selectedClientFile.name : editClientLogoUrl} onChange={e => {setEditClientLogoUrl(e.target.value); setSelectedClientFile(null);}} className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white" placeholder="URL da Logo" />
                               <input type="file" accept="image/*" className="hidden" ref={clientFileInputRef} onChange={handleClientFileChange} />
                               <button onClick={() => clientFileInputRef.current?.click()} className="bg-white/10 p-1.5 rounded-lg hover:bg-white/20"><Upload className="w-4 h-4 text-indigo-300" /></button>
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
                          disabled={isUploadingClient}
                          className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                        >
                          {isUploadingClient ? <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin block" /> : <Save className="w-5 h-5" />}
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
                    </div>`;

const searchHeader = `                    <div className="flex items-center gap-6">
                      <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-2xl border border-white/10"
                        style={{ backgroundColor: \`\${selectedClient.color}10\`, color: selectedClient.color }}
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
                    </button>`;

content = content.replace(searchHeader, headerReplacement);

fs.writeFileSync(path, content, 'utf8');
console.log('ClientManagement.tsx updated successfully.');
