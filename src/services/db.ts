import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  setDoc,
  writeBatch,
  getDocs,
  deleteField
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Client, WeeklyTask, TeamMember, FinancialTransaction, UserGamification } from '../types';
import { toast } from '../components/Toast';

const CLIENTS_COLLECTION = 'clients';
const TASKS_COLLECTION = 'weeklyTasks';
const TEAM_COLLECTION = 'teamMembers';
const GAMIFICATION_COLLECTION = 'gamification';

// Helper to remove undefined fields which Firestore rejects
const sanitize = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

// For updateDoc payloads: keep top-level undefined as deleteField() so cleared
// selects ("Ninguém", limpar data) realmente removam o campo no Firestore. Nested
// undefineds são tratadas pelo JSON.stringify (silenciosamente removidas).
const sanitizeForUpdate = <T extends Record<string, unknown>>(data: T): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) {
      out[k] = deleteField();
    } else if (v === null || typeof v !== 'object') {
      out[k] = v;
    } else {
      // Para arrays/objetos aninhados, usa o sanitize tradicional que dropa undefineds.
      out[k] = JSON.parse(JSON.stringify(v));
    }
  }
  return out;
};

const handleError = (error: any, context: string) => {
  console.error(`Firebase Error (${context}):`, error);
  toast.error(`Erro: ${context}`, error?.message || 'Falha desconhecida no Firestore');
  throw error;
};

export const dbService = {
  // Clients
  subscribeToClients: (callback: (clients: Client[]) => void) => {
    const q = collection(db, CLIENTS_COLLECTION);
    return onSnapshot(q, (snapshot) => {
      const clients = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Client[];
      
      clients.sort((a, b) => {
        const orderA = a.order ?? 9999;
        const orderB = b.order ?? 9999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
      
      callback(clients);
    }, (error) => handleError(error, "Listar Clientes"));
  },

  addClient: async (client: Omit<Client, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, CLIENTS_COLLECTION), sanitize(client));
      return docRef.id;
    } catch (e) { handleError(e, "Adicionar Cliente"); }
  },

  updateClient: async (client: Client) => {
    try {
      const { id, ...data } = client;
      await updateDoc(doc(db, CLIENTS_COLLECTION, id), sanitizeForUpdate(data));
    } catch (e) { handleError(e, "Atualizar Cliente"); }
  },

  deleteClient: async (id: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, CLIENTS_COLLECTION, id));
      
      const q = query(collection(db, TASKS_COLLECTION), where('clientId', '==', id));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((document) => {
        batch.delete(document.ref);
      });

      await batch.commit();
    } catch (e) { handleError(e, "Deletar Cliente"); }
  },

  reorderClients: async (clients: Client[]) => {
    try {
      const batch = writeBatch(db);
      for (const client of clients) {
        const { id, ...data } = client;
        const docRef = doc(db, CLIENTS_COLLECTION, id);
        batch.update(docRef, sanitize(data));
      }
      await batch.commit();
    } catch (e) { handleError(e, "Reordenar Clientes"); }
  },

  // Weekly Tasks
  subscribeToTasks: (weekId: string, callback: (tasks: WeeklyTask[]) => void) => {
    const q = query(
      collection(db, TASKS_COLLECTION), 
      where('weekId', '==', weekId),
      orderBy('order')
    );
    return onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as WeeklyTask[];
      callback(tasks);
    }, (error) => handleError(error, "Listar Demandas"));
  },

  addTask: async (task: Omit<WeeklyTask, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, TASKS_COLLECTION), sanitize(task));
      return docRef.id;
    } catch (e) { handleError(e, "Adicionar Demanda"); }
  },

  updateTask: async (task: WeeklyTask) => {
    try {
      const { id, ...data } = task;
      await updateDoc(doc(db, TASKS_COLLECTION, id), sanitizeForUpdate(data));
    } catch (e) { handleError(e, "Atualizar Demanda"); }
  },

  deleteTask: async (id: string) => {
    try {
      await deleteDoc(doc(db, TASKS_COLLECTION, id));
    } catch (e) { handleError(e, "Deletar Demanda"); }
  },

  // Batch update for reordering — escreve apenas o campo order para evitar
  // sobrescrever mudanças concorrentes (toggle completed durante drag, etc).
  reorderTasks: async (tasks: WeeklyTask[]) => {
    try {
      const batch = writeBatch(db);
      for (const task of tasks) {
        batch.update(doc(db, TASKS_COLLECTION, task.id), { order: task.order });
      }
      await batch.commit();
    } catch (e) { handleError(e, "Reordenar Demandas"); }
  },

  // Team Members
  subscribeToTeam: (callback: (members: TeamMember[]) => void) => {
    const q = query(collection(db, TEAM_COLLECTION), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as TeamMember[];
      callback(members);
    }, (error) => handleError(error, "Listar Equipe"));
  },

  addTeamMember: async (member: Omit<TeamMember, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, TEAM_COLLECTION), sanitize(member));
      return docRef.id;
    } catch (e) { handleError(e, "Adicionar Membro"); }
  },

  updateTeamMember: async (member: TeamMember) => {
    try {
      const { id, ...data } = member;
      await updateDoc(doc(db, TEAM_COLLECTION, id), sanitizeForUpdate(data));
    } catch (e) { handleError(e, "Atualizar Membro"); }
  },

  deleteTeamMember: async (id: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, TEAM_COLLECTION, id));

      const clientsSnap = await getDocs(collection(db, CLIENTS_COLLECTION));
      clientsSnap.forEach((cdoc) => {
        const c = cdoc.data() as Client;
        let touched = false;
        const newMasterTasks = (c.masterTasks ?? []).map((mt) => {
          const hasPrimary = mt.responsible === id;
          const list = mt.responsibles ?? [];
          const hasSecondary = list.includes(id);
          if (!hasPrimary && !hasSecondary) return mt;
          touched = true;
          const next = { ...mt };
          if (hasPrimary) delete next.responsible;
          if (hasSecondary) next.responsibles = list.filter((x) => x !== id);
          return next;
        });
        if (touched) batch.update(cdoc.ref, sanitize({ masterTasks: newMasterTasks }));
      });

      const tasksSnap = await getDocs(collection(db, TASKS_COLLECTION));
      tasksSnap.forEach((tdoc) => {
        const t = tdoc.data() as WeeklyTask;
        const list = t.responsibles ?? [];
        const hasPrimary = t.responsible === id;
        const hasSecondary = list.includes(id);
        if (!hasPrimary && !hasSecondary) return;
        const payload: Record<string, unknown> = {};
        if (hasPrimary) payload.responsible = deleteField();
        if (hasSecondary) payload.responsibles = list.filter((x) => x !== id);
        batch.update(tdoc.ref, payload);
      });

      await batch.commit();
    } catch (e) { handleError(e, "Deletar Membro"); }
  },

  // Financial Transactions
  subscribeToTransactions: (callback: (transactions: FinancialTransaction[]) => void) => {
    const q = query(collection(db, 'financialTransactions'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as FinancialTransaction[];
      callback(transactions);
    }, (error) => handleError(error, "Listar Transações Financeiras"));
  },

  addTransaction: async (transaction: Omit<FinancialTransaction, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'financialTransactions'), sanitize(transaction));
      return docRef.id;
    } catch (e) { handleError(e, "Adicionar Transação"); }
  },

  updateTransaction: async (transaction: FinancialTransaction) => {
    try {
      const { id, ...data } = transaction;
      await updateDoc(doc(db, 'financialTransactions', id), sanitizeForUpdate(data));
    } catch (e) { handleError(e, "Atualizar Transação"); }
  },

  deleteTransaction: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'financialTransactions', id));
    } catch (e) { handleError(e, "Deletar Transação"); }
  },

  // Gamification — per-user state for the Sprint Semanal view.
  subscribeToAllGamification: (callback: (entries: UserGamification[]) => void) => {
    const q = collection(db, GAMIFICATION_COLLECTION);
    return onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(d => ({ ...(d.data() as Omit<UserGamification, 'userId'>), userId: d.id })) as UserGamification[];
      callback(entries);
    }, (error) => handleError(error, "Listar Gamificação"));
  },

  subscribeToUserGamification: (userId: string, callback: (entry: UserGamification | null) => void) => {
    return onSnapshot(doc(db, GAMIFICATION_COLLECTION, userId), (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback({ ...(snap.data() as Omit<UserGamification, 'userId'>), userId: snap.id });
    }, (error) => handleError(error, "Ler Gamificação"));
  },

  upsertUserGamification: async (entry: UserGamification) => {
    try {
      const { userId, ...data } = entry;
      await setDoc(doc(db, GAMIFICATION_COLLECTION, userId), { ...data, updatedAt: Date.now() }, { merge: true });
    } catch (e) { handleError(e, "Atualizar Gamificação"); }
  },
};
