import { LayoutDashboard, Users, Calendar, Settings, LogOut, Building2 } from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  activeTab: 'planner' | 'clients' | 'team';
  setActiveTab: (tab: 'planner' | 'clients' | 'team') => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'planner', label: 'Planejador', icon: Calendar },
    { id: 'clients', label: 'Clientes', icon: Building2 },
    { id: 'team', label: 'Equipe', icon: Users },
  ];

  return (
    <div className="w-64 h-screen border-r border-white/5 flex flex-col p-6 sticky top-0 bg-[#030712]/50 backdrop-blur-3xl">
      <div className="mb-12 px-2">
        <img src="/logo-full.png" alt="GCompass Logo" className="h-10 w-auto object-contain" />
      </div>


      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 relative group ${
              activeTab === item.id 
                ? 'text-white' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === item.id && (
              <motion.div
                layoutId="active-bg"
                className="absolute inset-0 bg-white/5 rounded-2xl border border-white/10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <item.icon className="w-5 h-5 relative z-10" />
            <span className="font-medium relative z-10">{item.label}</span>
            {activeTab === item.id && (
              <motion.div 
                layoutId="active-pill"
                className="w-1 h-5 bg-indigo-500 rounded-full absolute right-3"
              />
            )}
          </button>
        ))}
      </nav>

      <div className="pt-6 border-t border-white/5 space-y-2">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-slate-200 transition-colors">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Configurações</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-400/80 hover:text-rose-400 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </div>
  );
}
