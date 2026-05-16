/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar, { ActiveTab } from './components/Sidebar';
import SprintPlanner from './views/SprintPlanner/SprintPlanner';
import ClientManagement from './views/ClientManagement';
import TeamManagement from './views/TeamManagement';
import FinancialManagement from './views/FinancialManagement';
import Login from './components/Login';
import GlobalSearch from './components/GlobalSearch';
import ToastContainer from './components/Toast';
import { Search } from 'lucide-react';
import { Client, WeeklyTask, DayOfWeek, TeamMember, FinancialTransaction, UserGamification } from './types';
import { dbService } from './services/db';
import { auth, db } from './firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { getWeekId, getWeekIdFromDateString, getDayOfWeekFromDateString } from './utils/dateUtils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const saved = localStorage.getItem('active_tab');
    // Migrate users coming from the dual-tab transition.
    if (saved === 'sprint') return 'planner';
    return (saved as ActiveTab) || 'planner';
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [gamification, setGamification] = useState<UserGamification[]>([]);
  const [incompleteTasks, setIncompleteTasks] = useState<WeeklyTask[]>([]);
  const [currentWeekId, setCurrentWeekId] = useState(getWeekId(new Date()));
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('active_tab', activeTab);
  }, [activeTab]);

  // Keyboard Shortcut for Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

    const unsubTransactions = dbService.subscribeToTransactions((data) => {
      setTransactions(data);
    });

    const unsubGamification = dbService.subscribeToAllGamification((data) => {
      setGamification(data);
    });

    const unsubIncomplete = dbService.subscribeToIncompleteTasks((data) => {
      setIncompleteTasks(data);
    });

    return () => {
      unsubClients();
      unsubTeam();
      unsubTransactions();
      unsubGamification();
      unsubIncomplete();
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
  };

  const handleAddTransaction = async (transaction: Omit<FinancialTransaction, 'id'>) => {
    await dbService.addTransaction(transaction);
  };

  const handleUpdateTransaction = async (transaction: FinancialTransaction) => {
    await dbService.updateTransaction(transaction);
  };

  const handleDeleteTransaction = async (id: string) => {
    await dbService.deleteTransaction(id);
  };

  const handleUpdateClient = async (updated: Client) => {
    // 1. Update the client in Firebase
    await dbService.updateClient(updated);

    // 2. Sync changes down to WeeklyTasks (Two-way sync)
    const oldClient = clients.find(c => c.id === updated.id);
    if (oldClient) {
      // 2.1 Sync deletions (tasks removed from Client Backlog)
      const removedTasks = oldClient.masterTasks.filter(oldMt => 
         !updated.masterTasks.some(newMt => newMt.id === oldMt.id)
      );
      
      removedTasks.forEach(async (deletedMt) => {
         const q = query(collection(db, 'weeklyTasks'), where('masterTaskId', '==', deletedMt.id));
         let snapshot = await getDocs(q);
         
         if (snapshot.empty) {
           const qFallback = query(collection(db, 'weeklyTasks'), where('clientId', '==', updated.id));
           const snapshotFallback = await getDocs(qFallback);
           
           snapshotFallback.docs
             .filter(docSnap => docSnap.data().title === deletedMt.title)
             .forEach(docSnap => {
               dbService.deleteTask(docSnap.id);
             });
         } else {
           snapshot.forEach(docSnap => {
              dbService.deleteTask(docSnap.id);
           });
         }
      });

      // 2.2 Sync updates
      updated.masterTasks.forEach(async (newMt) => {
        const oldMt = oldClient.masterTasks.find(t => t.id === newMt.id);
        // If it exists and has changes
        if (oldMt && JSON.stringify(oldMt) !== JSON.stringify(newMt)) {
          const q = query(collection(db, 'weeklyTasks'), where('masterTaskId', '==', newMt.id));
          let snapshot = await getDocs(q);

          // Se a data foi REMOVIDA na aba de clientes, remover a WT vinculada do planejador.
          if (oldMt.dueDate && !newMt.dueDate) {
            if (!snapshot.empty) {
              snapshot.forEach(docSnap => dbService.deleteTask(docSnap.id));
            } else {
              const qFallback = query(collection(db, 'weeklyTasks'), where('clientId', '==', updated.id));
              const snapshotFallback = await getDocs(qFallback);
              snapshotFallback.docs
                .filter(d => d.data().title === oldMt.title)
                .forEach(docSnap => dbService.deleteTask(docSnap.id));
            }
            return;
          }

          // Fallback para tarefas antigas (legadas) sem masterTaskId
          if (snapshot.empty) {
            const qFallback = query(collection(db, 'weeklyTasks'), where('clientId', '==', updated.id));
            const snapshotFallback = await getDocs(qFallback);
            const legacyMatches = snapshotFallback.docs.filter(d => d.data().title === oldMt.title);

            // Se data foi definida (não havia antes) e não há WT linkada nem legada com mesmo título,
            // criar uma nova WeeklyTask agendada conforme a dueDate.
            if (
              legacyMatches.length === 0 &&
              newMt.dueDate &&
              oldMt.dueDate !== newMt.dueDate
            ) {
              const targetWeekId = getWeekIdFromDateString(newMt.dueDate);
              const targetDay = getDayOfWeekFromDateString(newMt.dueDate);
              dbService.addTask({
                weekId: targetWeekId,
                day: targetDay,
                clientId: updated.id,
                masterTaskId: newMt.id,
                title: newMt.title,
                completed: newMt.completed,
                order: 999,
                subTasks: newMt.subTasks,
                responsible: newMt.responsible,
                responsibles: newMt.responsibles,
                taskType: newMt.taskType,
                phase: newMt.phase,
                dueDate: newMt.dueDate,
                priority: newMt.priority,
                estimatedMinutes: newMt.estimatedMinutes,
                comments: newMt.comments,
              });
              return;
            }

            legacyMatches
              .forEach(docSnap => {
                const wt = docSnap.data() as WeeklyTask;
                let wtUpdated = {
                   ...wt,
                   title: newMt.title,
                   completed: newMt.completed,
                   subTasks: newMt.subTasks,
                   responsible: newMt.responsible,
                   responsibles: newMt.responsibles,
                   taskType: newMt.taskType,
                   comments: newMt.comments,
                   dueDate: newMt.dueDate,
                   estimatedMinutes: newMt.estimatedMinutes
                };

                if (newMt.dueDate && oldMt.dueDate !== newMt.dueDate) {
                   wtUpdated.weekId = getWeekIdFromDateString(newMt.dueDate);
                   wtUpdated.day = getDayOfWeekFromDateString(newMt.dueDate);
                }

                if (!wtUpdated.masterTaskId) {
                   wtUpdated.masterTaskId = newMt.id;
                }

                updateDoc(docSnap.ref, JSON.parse(JSON.stringify(wtUpdated)));
              });
          } else {
            snapshot.forEach(docSnap => {
              const wt = docSnap.data() as WeeklyTask;
              let wtUpdated = {
                 ...wt,
                 title: newMt.title,
                 completed: newMt.completed,
                 subTasks: newMt.subTasks,
                 responsible: newMt.responsible,
                 responsibles: newMt.responsibles,
                 taskType: newMt.taskType,
                 comments: newMt.comments,
                 dueDate: newMt.dueDate,
                 estimatedMinutes: newMt.estimatedMinutes
              };
              
              if (newMt.dueDate && oldMt.dueDate !== newMt.dueDate) {
                 wtUpdated.weekId = getWeekIdFromDateString(newMt.dueDate);
                 wtUpdated.day = getDayOfWeekFromDateString(newMt.dueDate);
              }
              
              if (!wtUpdated.masterTaskId) {
                 wtUpdated.masterTaskId = newMt.id;
              }
              
              updateDoc(docSnap.ref, JSON.parse(JSON.stringify(wtUpdated)));
            });
          }
        }
      });
    }
  };

  const handleAddTask = async (task: Omit<WeeklyTask, 'id'>) => {
    await dbService.addTask(task);
  };

  const handleUpdateTask = async (updated: WeeklyTask) => {
    // 1. If date changed via Planner card directly, sync its weekId and day
    if (updated.dueDate) {
       const newWeekId = getWeekIdFromDateString(updated.dueDate);
       const newDay = getDayOfWeekFromDateString(updated.dueDate);
       if (updated.weekId !== newWeekId || updated.day !== newDay) {
          updated.weekId = newWeekId;
          updated.day = newDay;
       }
    }

    // 2. Sync full status with Client Backlog if linked (Two-way sync)
    if (updated.clientId) {
      const client = clients.find(c => c.id === updated.clientId);
      if (client) {
        const mtIndex = client.masterTasks.findIndex(mt => 
          updated.masterTaskId ? mt.id === updated.masterTaskId : mt.title === updated.title
        );

        if (mtIndex !== -1) {
          const updatedMasterTasks = [...client.masterTasks];
          const mt = updatedMasterTasks[mtIndex];
          
          updatedMasterTasks[mtIndex] = {
            ...mt,
            title: updated.title,
            completed: updated.completed,
            subTasks: updated.subTasks,
            responsible: updated.responsible,
            responsibles: updated.responsibles,
            taskType: updated.taskType,
            comments: updated.comments,
            dueDate: updated.dueDate,
            estimatedMinutes: updated.estimatedMinutes
          };

          if (!updated.masterTaskId) {
             updated.masterTaskId = mt.id;
          }

          await dbService.updateClient({ ...client, masterTasks: updatedMasterTasks });
        }
      }
    }
    await dbService.updateTask(updated);
  };

  const handleDeleteTask = async (id: string) => {
    const wt = weeklyTasks.find(t => t.id === id);
    await dbService.deleteTask(id);
    if (wt?.clientId && wt.masterTaskId) {
      const client = clients.find(c => c.id === wt.clientId);
      const linkedMt = client?.masterTasks.find(mt => mt.id === wt.masterTaskId);
      if (client && linkedMt?.dueDate) {
        const updatedMasterTasks = client.masterTasks.map(mt =>
          mt.id === wt.masterTaskId ? { ...mt, dueDate: undefined } : mt
        );
        await dbService.updateClient({ ...client, masterTasks: updatedMasterTasks });
      }
    }
  };
  
  const handleReorderTasks = async (day: DayOfWeek, tasksForDay: WeeklyTask[]) => {
    const updatedTasks = tasksForDay.map((t, idx) => ({ ...t, order: idx }));
    await dbService.reorderTasks(updatedTasks);
  };

  const handleReorderClients = async (reorderedClients: Client[]) => {
    const updatedClients = reorderedClients.map((c, idx) => ({ ...c, order: idx }));
    await dbService.reorderClients(updatedClients);
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
    <div className="flex flex-col md:flex-row min-h-screen plasma-bg overflow-hidden">
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <ToastContainer />

      <GlobalSearch
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        clients={clients} 
        weeklyTasks={weeklyTasks} 
        teamMembers={teamMembers} 
      />

      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-hidden flex flex-col h-[100dvh] md:h-screen relative z-10 transition-all duration-500">
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 text-slate-400 hover:text-white bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:bg-white/10 shadow-lg shadow-black/20"
          >
            <Search className="w-4 h-4" />
            Pesquisar...
            <span className="text-[10px] font-mono opacity-50 ml-2">Ctrl+K</span>
          </button>
          
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
              className="flex-1 min-h-0 w-full overflow-y-auto"
            >
              <SprintPlanner
                user={user}
                clients={clients}
                weeklyTasks={weeklyTasks}
                teamMembers={teamMembers}
                incompleteTasks={incompleteTasks}
                currentWeekId={currentWeekId}
                setCurrentWeekId={setCurrentWeekId}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onAddTask={handleAddTask}
                gamification={gamification}
                onUpdateGamification={dbService.upsertUserGamification}
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
              className="flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar pr-2 pb-8"
            >
              <ClientManagement 
                clients={clients}
                teamMembers={teamMembers}
                onAddClient={handleAddClient}
                onDeleteClient={handleDeleteClient}
                onUpdateClient={handleUpdateClient}
                currentWeekId={currentWeekId}
                onAddWeeklyTask={handleAddTask}
                onReorderClients={handleReorderClients}
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
              className="flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar pr-2 pb-8"
            >
              <TeamManagement 
                teamMembers={teamMembers}
              />
            </motion.div>
          )}
          {activeTab === 'financial' && (
            <motion.div
              key="financial"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar pr-2 pb-8"
            >
              <FinancialManagement 
                transactions={transactions}
                clients={clients}
                onAddTransaction={handleAddTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                onDeleteTransaction={handleDeleteTransaction}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
