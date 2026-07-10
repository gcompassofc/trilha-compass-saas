import { createContext, useContext } from 'react';
import { PEOPLE } from './data';
import { personColor } from './lib';
import type { Client, Person, PersonId } from './types';

// Contexto leve para pessoas (com foto) e clientes ficarem acessíveis aos
// avatares espalhados pelas telas sem prop drilling. As fotos vivem no estado
// do App; aqui só exponho leitura + helpers de cor/lookup.
interface FluxoStore {
  people: Person[];
  clients: Client[];
}

const Ctx = createContext<FluxoStore>({ people: PEOPLE, clients: [] });

export const StoreProvider = Ctx.Provider;

export function usePeople(): Person[] {
  return useContext(Ctx).people;
}

export function useClients(): Client[] {
  return useContext(Ctx).clients;
}

export function usePerson(id: PersonId | null | undefined): Person | undefined {
  return useContext(Ctx).people.find((p) => p.id === id);
}

/** Busca o cliente pelo nome (Demand.cliente guarda o nome). */
export function useClientByName(nome: string | null | undefined): Client | undefined {
  return useContext(Ctx).clients.find((c) => c.nome === nome);
}

export { personColor };
