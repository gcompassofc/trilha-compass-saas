import { useEffect, useRef, useState } from 'react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from './firebase';
import { fluxoDb } from './fluxoDb';
import { PEOPLE, SEED_BACKLOG, SEED_CLIENTS, SEED_DEMANDS, SEED_NOTES } from './data';
import type { BacklogItem, Client, Demand, MuralNote, Person } from './types';

// Assina as coleções do Fluxo em tempo real. Na primeira execução (coleções
// vazias) faz um seed único com os dados de exemplo que você validou, pra o
// app já nascer utilizável — depois disso, tudo vem do Firestore.
export function useFluxoData(enabled: boolean) {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [notes, setNotes] = useState<MuralNote[]>([]);
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [people, setPeople] = useState<Person[]>(PEOPLE);
  const [loading, setLoading] = useState(true);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // marca "carregou" quando cada uma das 5 assinaturas emitir a 1ª vez
    const arrived = new Set<string>();
    const markReady = (key: string) => {
      if (arrived.has(key)) return;
      arrived.add(key);
      if (arrived.size >= 5) setLoading(false);
    };

    const unsubs = [
      fluxoDb.subscribeToDemands((rows) => {
        setDemands(rows);
        markReady('demands');
      }),
      fluxoDb.subscribeToNotes((rows) => {
        setNotes(rows);
        markReady('notes');
      }),
      fluxoDb.subscribeToBacklog((rows) => {
        setBacklog(rows);
        markReady('backlog');
      }),
      fluxoDb.subscribeToClients((rows) => {
        setClients(rows);
        markReady('clients');
      }),
      fluxoDb.subscribeToPeople((rows) => {
        // mescla foto do Firestore sobre a lista fixa de pessoas
        setPeople(PEOPLE.map((p) => ({ ...p, ...rows.find((r) => r.id === p.id) })));
        markReady('people');
      }),
    ];

    // seed único quando tudo chegou vazio
    void maybeSeed();

    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  async function maybeSeed() {
    if (seededRef.current) return;
    seededRef.current = true;
    try {
      const [d, n, b, c] = await Promise.all([
        getDocs(collection(db, 'demandas')),
        getDocs(collection(db, 'mural_notas')),
        getDocs(collection(db, 'fluxo_backlog')),
        getDocs(collection(db, 'fluxo_clientes')),
      ]);
      if (!d.empty || !n.empty || !b.empty || !c.empty) return; // já tem dados

      const batch = writeBatch(db);
      SEED_CLIENTS.forEach((cl) => {
        const { id, ...rest } = cl;
        batch.set(doc(db, 'fluxo_clientes', id), rest);
      });
      SEED_DEMANDS.forEach((dm) => {
        const { id, ...rest } = dm;
        batch.set(doc(db, 'demandas', id), rest);
      });
      SEED_NOTES.forEach((nt) => {
        const { id, ...rest } = nt;
        batch.set(doc(db, 'mural_notas', id), rest);
      });
      SEED_BACKLOG.forEach((bl) => {
        const { id, ...rest } = bl;
        batch.set(doc(db, 'fluxo_backlog', id), rest);
      });
      await batch.commit();
    } catch (e) {
      console.error('seed inicial falhou', e);
    }
  }

  return { demands, notes, backlog, clients, people, loading };
}
