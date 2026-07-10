import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  deleteField,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Client, Demand, Idea, MuralNote, Person, PersonId } from './types';

// Coleções próprias do app novo (não tocam nas do app antigo).
const C = {
  demandas: 'demandas',
  notas: 'mural_notas',
  ideias: 'ideias',
  clientes: 'fluxo_clientes',
  pessoas: 'fluxo_pessoas',
} as const;

// Firestore rejeita `undefined`. Converte para deleteField() em update (remove o
// campo) e dropa undefineds em create.
function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out;
}
function toUpdatePayload<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === undefined ? deleteField() : v;
  return out;
}

function logErr(context: string, e: unknown) {
  console.error(`Fluxo Firestore (${context}):`, e);
}

/** Assina uma coleção e devolve os docs mapeados com o id do Firestore. */
function subscribe<T>(
  name: string,
  callback: (rows: T[]) => void,
): () => void {
  return onSnapshot(
    collection(db, name),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[];
      callback(rows);
    },
    (e) => logErr(`subscribe:${name}`, e),
  );
}

export const fluxoDb = {
  // ── Demandas (Quadro + Dupla) ──
  subscribeToDemands: (cb: (rows: Demand[]) => void) => subscribe<Demand>(C.demandas, cb),
  async addDemand(d: Omit<Demand, 'id'>): Promise<string | null> {
    try {
      const ref = await addDoc(collection(db, C.demandas), stripUndefined(d as Record<string, unknown>));
      return ref.id;
    } catch (e) {
      logErr('addDemand', e);
      return null;
    }
  },
  async updateDemand(id: string, patch: Partial<Demand>) {
    try {
      await updateDoc(doc(db, C.demandas, id), toUpdatePayload(patch as Record<string, unknown>));
    } catch (e) {
      logErr('updateDemand', e);
    }
  },
  async deleteDemand(id: string) {
    try {
      await deleteDoc(doc(db, C.demandas, id));
    } catch (e) {
      logErr('deleteDemand', e);
    }
  },

  // ── Notas do Mural ──
  subscribeToNotes: (cb: (rows: MuralNote[]) => void) => subscribe<MuralNote>(C.notas, cb),
  async addNote(n: Omit<MuralNote, 'id'>): Promise<string | null> {
    try {
      const ref = await addDoc(collection(db, C.notas), stripUndefined(n as Record<string, unknown>));
      return ref.id;
    } catch (e) {
      logErr('addNote', e);
      return null;
    }
  },
  async updateNote(id: string, patch: Partial<MuralNote>) {
    try {
      await updateDoc(doc(db, C.notas, id), toUpdatePayload(patch as Record<string, unknown>));
    } catch (e) {
      logErr('updateNote', e);
    }
  },
  async deleteNote(id: string) {
    try {
      await deleteDoc(doc(db, C.notas, id));
    } catch (e) {
      logErr('deleteNote', e);
    }
  },

  // ── Ideias (Gaveta) ──
  subscribeToIdeas: (cb: (rows: Idea[]) => void) => subscribe<Idea>(C.ideias, cb),
  async addIdea(i: Omit<Idea, 'id'>): Promise<string | null> {
    try {
      const ref = await addDoc(collection(db, C.ideias), stripUndefined(i as Record<string, unknown>));
      return ref.id;
    } catch (e) {
      logErr('addIdea', e);
      return null;
    }
  },
  async deleteIdea(id: string) {
    try {
      await deleteDoc(doc(db, C.ideias, id));
    } catch (e) {
      logErr('deleteIdea', e);
    }
  },

  // ── Clientes ──
  subscribeToClients: (cb: (rows: Client[]) => void) => subscribe<Client>(C.clientes, cb),
  async addClient(c: Omit<Client, 'id'>): Promise<string | null> {
    try {
      const ref = await addDoc(collection(db, C.clientes), stripUndefined(c as Record<string, unknown>));
      return ref.id;
    } catch (e) {
      logErr('addClient', e);
      return null;
    }
  },
  async updateClient(id: string, patch: Partial<Client>) {
    try {
      await updateDoc(doc(db, C.clientes, id), toUpdatePayload(patch as Record<string, unknown>));
    } catch (e) {
      logErr('updateClient', e);
    }
  },
  async deleteClient(id: string) {
    try {
      await deleteDoc(doc(db, C.clientes, id));
    } catch (e) {
      logErr('deleteClient', e);
    }
  },

  // ── Pessoas (só a foto; id fixo = allyson/kallyl) ──
  subscribeToPeople: (cb: (rows: Person[]) => void) => subscribe<Person>(C.pessoas, cb),
  async setPersonPhoto(id: PersonId, name: string, photoUrl: string | undefined) {
    try {
      // setDoc com merge: cria o doc da pessoa se ainda não existe.
      await setDoc(
        doc(db, C.pessoas, id),
        stripUndefined({ name, photoUrl }),
        { merge: true },
      );
      if (photoUrl === undefined) {
        await updateDoc(doc(db, C.pessoas, id), { photoUrl: deleteField() });
      }
    } catch (e) {
      logErr('setPersonPhoto', e);
    }
  },
};
