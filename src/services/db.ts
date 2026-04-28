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
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Client, WeeklyTask, TeamMember, FinancialTransaction } from '../types';

const CLIENTS_COLLECTION = 'clients';
const TASKS_COLLECTION = 'weeklyTasks';
const TEAM_COLLECTION = 'teamMembers';

// Helper to remove undefined fields which Firestore rejects
const sanitize = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

const handleError = (error: any, context: string) => {
  console.error(`Firebase Error (${context}):`, error);
  alert(`Erro no Banco de Dados (${context}):\n${error.message}\n\nPossíveis causas:\n1. Regras do Firestore bloqueando acesso (Permission Denied)\n2. Faltando índice no Firestore (Index Required)`);
  throw error;
};

export const dbService = {
  // Clients
  subscribeToClients: (callback: (clients: Client[]) => void) => {
    const q = query(collection(db, CLIENTS_COLLECTION), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const clients = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Client[];
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
      await updateDoc(doc(db, CLIENTS_COLLECTION, id), sanitize(data));
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
      await updateDoc(doc(db, TASKS_COLLECTION, id), sanitize(data));
    } catch (e) { handleError(e, "Atualizar Demanda"); }
  },

  deleteTask: async (id: string) => {
    try {
      await deleteDoc(doc(db, TASKS_COLLECTION, id));
    } catch (e) { handleError(e, "Deletar Demanda"); }
  },

  // Batch update for reordering
  reorderTasks: async (tasks: WeeklyTask[]) => {
    try {
      const batch = writeBatch(db);
      for (const task of tasks) {
        const { id, ...data } = task;
        const docRef = doc(db, TASKS_COLLECTION, id);
        batch.update(docRef, sanitize(data));
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
      await updateDoc(doc(db, TEAM_COLLECTION, id), sanitize(data));
    } catch (e) { handleError(e, "Atualizar Membro"); }
  },

  deleteTeamMember: async (id: string) => {
    try {
      await deleteDoc(doc(db, TEAM_COLLECTION, id));
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
      await updateDoc(doc(db, 'financialTransactions', id), sanitize(data));
    } catch (e) { handleError(e, "Atualizar Transação"); }
  },

  deleteTransaction: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'financialTransactions', id));
    } catch (e) { handleError(e, "Deletar Transação"); }
  }
};
