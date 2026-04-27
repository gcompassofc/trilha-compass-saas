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
    <div className="w-full md:w-64 h-auto md:h-screen border-t md:border-t-0 md:border-r border-white/5 flex flex-row md:flex-col p-2 md:p-6 fixed md:sticky bottom-0 md:top-0 left-0 bg-[#030712]/90 md:bg-[#030712]/50 backdrop-blur-3xl z-50">
      <div className="hidden md:block mb-12 px-2">
        <img src="/logo-full.png" alt="GCompass Logo" className="h-10 w-auto object-contain" />
      </div>

      <nav className="flex-1 flex flex-row md:flex-col justify-around md:justify-start space-y-0 md:space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`w-auto md:w-full flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-2xl transition-all duration-300 relative group ${
              activeTab === item.id 
                ? 'text-white' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === item.id && (
              <motion.div
                layoutId="active-bg"
                className="absolute inset-0 bg-white/5 rounded-2xl border border-white/10 hidden md:block"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <item.icon className="w-5 h-5 relative z-10" />
            <span className="text-[10px] md:text-base font-medium relative z-10">{item.label}</span>
            {activeTab === item.id && (
              <motion.div 
                layoutId="active-pill"
                className="w-1 h-5 bg-indigo-500 rounded-full absolute right-3 hidden md:block"
              />
            )}
          </button>
        ))}
      </nav>

      <div className="hidden md:block pt-6 border-t border-white/5 space-y-2">
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
