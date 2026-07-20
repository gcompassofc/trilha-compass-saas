// Modelo de dados do app Fluxo. Estes tipos espelham as coleções do
// Firestore (demandas, mural_notas, fluxo_backlog, fluxo_clientes, fluxo_pessoas).

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

// Horizonte de tempo (linhas da matriz do Quadro). Derivado do prazo:
// Hoje (prazo <= hoje) / Esta semana (<= 7 dias) / Depois. Pode ser fixado
// manualmente (ex.: item puxado do backlog cai em "Hoje").
export type Horizon = 'hoje' | 'semana' | 'depois';

export interface HorizonMeta {
  id: Horizon;
  label: string;
  colorVar: string;
  chipBg: string;
}

export interface Demand {
  id: string;
  titulo: string;
  cliente: string;
  status: StatusId;
  owner: PersonId | null; // responsável (usado na tela Dupla e no avatar do cartão)
  categoria: CategoryId;
  prioridade: Priority;
  prazo: string | null; // ISO yyyy-mm-dd
  horizonte?: Horizon | null; // override manual; se ausente, deriva de prazo
  concluida?: boolean; // usado no checkbox da tela Dupla
  descricao?: string; // briefing em markdown (texto, links, imagens por URL)
  extra?: Record<string, string>; // campos por categoria (vídeo/design/tráfego)
}

// Item de backlog: demanda sem horizonte definido ainda. Vive na gaveta.
export interface BacklogItem {
  id: string;
  titulo: string;
  categoria: CategoryId;
}

// Modelo pronto para preencher o modal de nova demanda.
export interface Template {
  nome: string;
  categoria: CategoryId;
  prioridade: Priority;
  descricao: string;
}

export interface MuralNote {
  id: string;
  texto: string;
  autor: PersonId;
  x: number; // posição livre (px relativos à área do mural)
  y: number;
  cor: number; // índice na paleta de post-its
}
