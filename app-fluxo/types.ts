// Modelo de dados do app Fluxo. Estes tipos vão espelhar as coleções do
// Firestore no passo 3 (demandas, mural_notas, ideias). Por enquanto, dados
// de exemplo em memória para validar o visual.

export type PersonId = 'allyson' | 'kallyl';

export interface Person {
  id: PersonId;
  name: string;
  photoUrl?: string; // data URL do upload; fallback = inicial colorida
}

// Cliente cadastrável. `nome` é a chave usada nas demandas (Demand.cliente),
// para manter compatibilidade com a busca/exibição já existentes.
export interface Client {
  id: string;
  nome: string;
  photoUrl?: string; // data URL do upload; fallback = inicial colorida
}

export type CategoryId = 'social' | 'trafego' | 'design' | 'video' | 'site' | 'estrategia';

export interface Category {
  id: CategoryId;
  label: string;
  colorVar: string; // css var --color-cat-*
}

export type StatusId = 'afazer' | 'fazendo' | 'revisao' | 'feito';

export interface StatusColumn {
  id: StatusId;
  label: string;
  colorVar: string;
}

export type Priority = 'alta' | 'media' | 'baixa';

export interface Demand {
  id: string;
  titulo: string;
  cliente: string;
  status: StatusId;
  owner: PersonId | null; // responsável (usado na tela Dupla e no avatar do cartão)
  categoria: CategoryId;
  prioridade: Priority;
  prazo: string | null; // ISO yyyy-mm-dd
  concluida?: boolean; // usado no checkbox da tela Dupla
  descricao?: string; // briefing em markdown (texto, links, imagens por URL)
}

export interface MuralNote {
  id: string;
  texto: string;
  autor: PersonId;
  x: number; // posição livre (px relativos à área do mural)
  y: number;
  cor: number; // índice na paleta de post-its
}

export interface Idea {
  id: string;
  texto: string;
  autor: PersonId;
}
