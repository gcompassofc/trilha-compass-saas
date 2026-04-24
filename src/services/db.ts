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
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Client, WeeklyTask, TeamMember } from '../types';

const CLIENTS_COLLECTION = 'clients';
const TASKS_COLLECTION = 'weeklyTasks';
const TEAM_COLLECTION = 'teamMembers';

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
    });
  },

  addClient: async (client: Omit<Client, 'id'>) => {
    const docRef = await addDoc(collection(db, CLIENTS_COLLECTION), client);
    return docRef.id;
  },

  updateClient: async (client: Client) => {
    const { id, ...data } = client;
    await updateDoc(doc(db, CLIENTS_COLLECTION, id), data as any);
  },

  deleteClient: async (id: string) => {
    await deleteDoc(doc(db, CLIENTS_COLLECTION, id));
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
    });
  },

  addTask: async (task: Omit<WeeklyTask, 'id'>) => {
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), task);
    return docRef.id;
  },

  updateTask: async (task: WeeklyTask) => {
    const { id, ...data } = task;
    await updateDoc(doc(db, TASKS_COLLECTION, id), data as any);
  },

  deleteTask: async (id: string) => {
    await deleteDoc(doc(db, TASKS_COLLECTION, id));
  },

  // Batch update for reordering
  reorderTasks: async (tasks: WeeklyTask[]) => {
    for (const task of tasks) {
      const { id, ...data } = task;
      await updateDoc(doc(db, TASKS_COLLECTION, id), data as any);
    }
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
    });
  },

  addTeamMember: async (member: Omit<TeamMember, 'id'>) => {
    const docRef = await addDoc(collection(db, TEAM_COLLECTION), member);
    return docRef.id;
  },

  updateTeamMember: async (member: TeamMember) => {
    const { id, ...data } = member;
    await updateDoc(doc(db, TEAM_COLLECTION, id), data as any);
  },

  deleteTeamMember: async (id: string) => {
    await deleteDoc(doc(db, TEAM_COLLECTION, id));
  }
};
