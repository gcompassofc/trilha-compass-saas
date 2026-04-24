/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import WeeklyPlanner from './views/WeeklyPlanner';
import ClientManagement from './views/ClientManagement';
import TeamManagement from './views/TeamManagement';
import Login from './components/Login';
import { Client, WeeklyTask, DayOfWeek, TeamMember } from './types';
import { dbService } from './services/db';
import { auth } from './firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';

const getWeekId = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'planner' | 'clients' | 'team'>('planner');
  const [clients, setClients] = useState<Client[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentWeekId, setCurrentWeekId] = useState(getWeekId(new Date()));
  const [loading, setLoading] = useState(true);

  // Auth State
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  // Real-time synchronization with Firestore
  useEffect(() => {
    if (!user) return;

    const unsubClients = dbService.subscribeToClients((data) => {
      setClients(data);
      setLoading(false);
    });

    const unsubTeam = dbService.subscribeToTeam((data) => {
      setTeamMembers(data);
    });

    return () => {
      unsubClients();
      unsubTeam();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubTasks = dbService.subscribeToTasks(currentWeekId, (data) => {
      setWeeklyTasks(data);
    });
    return () => unsubTasks();
  }, [user, currentWeekId]);

  // Handler Functions
  const handleAddClient = async (client: Omit<Client, 'id'>) => {
    await dbService.addClient(client);
  };

  const handleDeleteClient = async (id: string) => {
    await dbService.deleteClient(id);
    const tasksToDelete = weeklyTasks.filter(t => t.clientId === id);
    for (const task of tasksToDelete) {
      await dbService.deleteTask(task.id);
    }
  };

  const handleUpdateClient = async (updated: Client) => {
    await dbService.updateClient(updated);
  };

  const handleAddTask = async (task: Omit<WeeklyTask, 'id'>) => {
    await dbService.addTask(task);
  };

  const handleUpdateTask = async (updated: WeeklyTask) => {

    // Sync completion status with Client Backlog if linked
    if (updated.clientId && updated.masterTaskId) {
      const client = clients.find(c => c.id === updated.clientId);
      if (client) {
        const updatedMasterTasks = client.masterTasks.map(mt => 
          mt.id === updated.masterTaskId ? { 
            ...mt, 
            completed: updated.completed,
            subTasks: updated.subTasks,
            responsible: updated.responsible
          } : mt
        );
        await dbService.updateClient({ ...client, masterTasks: updatedMasterTasks });
      }
    }
    await dbService.updateTask(updated);
  };

  const handleDeleteTask = async (id: string) => {
    await dbService.deleteTask(id);
  };
  
  const handleReorderTasks = async (day: DayOfWeek, tasksForDay: WeeklyTask[]) => {
    const updatedTasks = tasksForDay.map((t, idx) => ({ ...t, order: idx }));
    await dbService.reorderTasks(updatedTasks);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen plasma-bg text-white">
        <div className="text-2xl font-light tracking-widest animate-pulse">CARREGANDO...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen plasma-bg overflow-hidden">
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-8 overflow-y-auto h-screen relative z-10 transition-all duration-500">
        <div className="flex justify-end mb-4">
          <button 
            onClick={() => auth.signOut()}
            className="text-white/40 hover:text-white/70 text-xs font-medium px-3 py-1 rounded-full border border-white/10"
          >
            Sair ({user.email})
          </button>
        </div>
        <AnimatePresence mode="wait">
          {activeTab === 'planner' && (
            <motion.div
              key="planner"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <WeeklyPlanner 
                clients={clients}
                weeklyTasks={weeklyTasks}
                teamMembers={teamMembers}
                currentWeekId={currentWeekId}
                setCurrentWeekId={setCurrentWeekId}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onReorderTasks={handleReorderTasks}
              />
            </motion.div>
          )}
          {activeTab === 'clients' && (
            <motion.div
              key="clients"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <ClientManagement 
                clients={clients}
                teamMembers={teamMembers}
                onAddClient={handleAddClient}
                onDeleteClient={handleDeleteClient}
                onUpdateClient={handleUpdateClient}
              />
            </motion.div>
          )}
          {activeTab === 'team' && (
            <motion.div
              key="team"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <TeamManagement 
                teamMembers={teamMembers}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
