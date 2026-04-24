/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import WeeklyPlanner from './views/WeeklyPlanner';
import ClientManagement from './views/ClientManagement';
import { Client, WeeklyTask, DayOfWeek } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'planner' | 'clients'>('planner');
  
  // State Initialization from LocalStorage
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('df_clients');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Exemplo Mkt', logo: '🚀', color: '#6366f1', masterTasks: [] }
    ];
  });

  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>(() => {
    const saved = localStorage.getItem('df_weekly_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('df_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('df_weekly_tasks', JSON.stringify(weeklyTasks));
  }, [weeklyTasks]);

  // Handler Functions
  const handleAddClient = (client: Client) => setClients([...clients, client]);
  const handleDeleteClient = (id: string) => {
    setClients(clients.filter(c => c.id !== id));
    setWeeklyTasks(weeklyTasks.filter(t => t.clientId !== id));
  };
  const handleUpdateClient = (updated: Client) => {
    setClients(clients.map(c => c.id === updated.id ? updated : c));
  };

  const handleAddTask = (task: WeeklyTask) => setWeeklyTasks([...weeklyTasks, task]);
  const handleUpdateTask = (updated: WeeklyTask) => {
    // Sync completion status with Client Backlog (MasterTask) if linked
    if (updated.clientId && updated.masterTaskId) {
      setClients(prevClients => prevClients.map(client => {
        if (client.id === updated.clientId) {
          return {
            ...client,
            masterTasks: client.masterTasks.map(mt => 
              mt.id === updated.masterTaskId ? { ...mt, completed: updated.completed } : mt
            )
          };
        }
        return client;
      }));
    }
    setWeeklyTasks(weeklyTasks.map(t => t.id === updated.id ? updated : t));
  };
  const handleDeleteTask = (id: string) => {
    const taskToDelete = weeklyTasks.find(t => t.id === id);
    // If we delete from week, we might want to un-schedule it from backlog
    // but the user requirement focuses on completion sync.
    setWeeklyTasks(weeklyTasks.filter(t => t.id !== id));
  };
  
  const handleReorderTasks = (day: DayOfWeek, tasksForDay: WeeklyTask[]) => {
    const otherTasks = weeklyTasks.filter(t => t.day !== day);
    const updatedTasks = tasksForDay.map((t, idx) => ({ ...t, order: idx }));
    setWeeklyTasks([...otherTasks, ...updatedTasks]);
  };

  return (
    <div className="flex min-h-screen plasma-bg overflow-hidden">
      {/* Visual background accents */}
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-8 overflow-y-auto h-screen relative z-10 transition-all duration-500">
        <AnimatePresence mode="wait">
          {activeTab === 'planner' ? (
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
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onReorderTasks={handleReorderTasks}
              />
            </motion.div>
          ) : (
            <motion.div
              key="clients"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <ClientManagement 
                clients={clients}
                onAddClient={handleAddClient}
                onDeleteClient={handleDeleteClient}
                onUpdateClient={handleUpdateClient}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
