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
import { Client, WeeklyTask, TeamMember } from '../types';

const CLIENTS_COLLECTION = 'clients';
const TASKS_COLLECTION = 'weeklyTasks';
const TEAM_COLLECTION = 'teamMembers';

// Helper to remove undefined fields which Firestore rejects
const sanitize = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

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
    }, (error) => console.error("Error fetching clients:", error));
  },

  addClient: async (client: Omit<Client, 'id'>) => {
    const docRef = await addDoc(collection(db, CLIENTS_COLLECTION), sanitize(client));
    return docRef.id;
  },

  updateClient: async (client: Client) => {
    const { id, ...data } = client;
    await updateDoc(doc(db, CLIENTS_COLLECTION, id), sanitize(data));
  },

  deleteClient: async (id: string) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, CLIENTS_COLLECTION, id));
    
    // Find all tasks associated with this client to delete them as well
    const q = query(collection(db, TASKS_COLLECTION), where('clientId', '==', id));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((document) => {
      batch.delete(document.ref);
    });

    await batch.commit();
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
    }, (error) => console.error("Error fetching tasks:", error));
  },

  addTask: async (task: Omit<WeeklyTask, 'id'>) => {
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), sanitize(task));
    return docRef.id;
  },

  updateTask: async (task: WeeklyTask) => {
    const { id, ...data } = task;
    await updateDoc(doc(db, TASKS_COLLECTION, id), sanitize(data));
  },

  deleteTask: async (id: string) => {
    await deleteDoc(doc(db, TASKS_COLLECTION, id));
  },

  // Batch update for reordering
  reorderTasks: async (tasks: WeeklyTask[]) => {
    const batch = writeBatch(db);
    for (const task of tasks) {
      const { id, ...data } = task;
      const docRef = doc(db, TASKS_COLLECTION, id);
      batch.update(docRef, sanitize(data));
    }
    await batch.commit();
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
    }, (error) => console.error("Error fetching team:", error));
  },

  addTeamMember: async (member: Omit<TeamMember, 'id'>) => {
    const docRef = await addDoc(collection(db, TEAM_COLLECTION), sanitize(member));
    return docRef.id;
  },

  updateTeamMember: async (member: TeamMember) => {
    const { id, ...data } = member;
    await updateDoc(doc(db, TEAM_COLLECTION, id), sanitize(data));
  },

  deleteTeamMember: async (id: string) => {
    await deleteDoc(doc(db, TEAM_COLLECTION, id));
  }
};



