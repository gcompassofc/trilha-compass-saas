import { useState } from 'react';
import { Plus, Trash2, Users, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TeamMember } from '../types';
import GlassCard from '../components/GlassCard';
import { dbService } from '../services/db';

interface TeamManagementProps {
  teamMembers: TeamMember[];
}

export default function TeamManagement({ teamMembers }: TeamManagementProps) {
  const [newName, setNewName] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  const handleAddMember = async () => {
    if (!newName.trim()) return;
    await dbService.addTeamMember({
      name: newName,
      photoUrl: newPhotoUrl || undefined
    });
    setNewName('');
    setNewPhotoUrl('');
  };

  const handleDeleteMember = async (id: string) => {
    await dbService.deleteTeamMember(id);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold prisma-text">Equipe</h1>
        <p className="text-slate-400 font-light">Gerencie os responsáveis pelas demandas do projeto.</p>
      </header>

      <GlassCard className="p-8">
        <div className="flex flex-col gap-6">
          <div className="flex gap-4 items-start">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Nome do Membro</label>
              <input
                type="text"
                placeholder="Ex: Kallyl Bertolino"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">URL da Foto (Opcional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://..."
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                  className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                />
                <button 
                  onClick={handleAddMember}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <AnimatePresence>
              {teamMembers.map((member) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt={member.name} className="w-12 h-12 rounded-full object-cover border border-white/10 shadow-lg" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 text-indigo-400">
                        <Users className="w-6 h-6" />
                      </div>
                    )}
                    <span className="font-medium text-slate-200">{member.name}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteMember(member.id)}
                    className="p-2 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {teamMembers.length === 0 && (
              <div className="col-span-2 text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-20" />
                <p className="text-slate-500 font-light">Nenhum membro adicionado à equipe ainda.</p>
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
