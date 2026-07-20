import type {
  BacklogItem,
  Category,
  Client,
  Demand,
  HorizonMeta,
  MuralNote,
  Person,
  StatusColumn,
  Template,
} from './types';

export const PEOPLE: Person[] = [
  { id: 'allyson', name: 'Allyson' },
  { id: 'kallyl', name: 'Kallyl' },
];

// Clientes de exemplo. "Interno" é o fallback para demandas sem cliente externo.
export const SEED_CLIENTS: Client[] = [
  { id: 'c1', nome: 'Loja Aurora' },
  { id: 'c2', nome: 'TechFlow' },
  { id: 'c3', nome: 'Interno' },
];

// Ao escolher um cliente no modal, sugere responsável + categoria.
export const CLIENT_DEFAULTS: Record<string, { owner: Person['id']; categoria: Category['id'] }> = {
  'Loja Aurora': { owner: 'allyson', categoria: 'design' },
  TechFlow: { owner: 'kallyl', categoria: 'site' },
};

export const CATEGORIES: Category[] = [
  { id: 'social', label: 'Social Media', colorVar: 'var(--color-cat-social)' },
  { id: 'trafego', label: 'Tráfego', colorVar: 'var(--color-cat-trafego)' },
  { id: 'design', label: 'Design', colorVar: 'var(--color-cat-design)' },
  { id: 'video', label: 'Edição de Vídeo', colorVar: 'var(--color-cat-video)' },
  { id: 'site', label: 'Site', colorVar: 'var(--color-cat-site)' },
  { id: 'estrategia', label: 'Estratégia', colorVar: 'var(--color-cat-estrategia)' },
];

export const STATUS_COLUMNS: StatusColumn[] = [
  { id: 'afazer', label: 'A fazer', colorVar: 'var(--color-st-afazer)' },
  { id: 'fazendo', label: 'Fazendo', colorVar: 'var(--color-st-fazendo)' },
  { id: 'revisao', label: 'Revisão', colorVar: 'var(--color-st-revisao)' },
  { id: 'feito', label: 'Feito', colorVar: 'var(--color-st-feito)' },
];

// Linhas da matriz do Quadro.
export const HORIZONS: HorizonMeta[] = [
  { id: 'hoje', label: 'Hoje', colorVar: 'var(--color-hz-hoje)', chipBg: 'rgba(239,68,68,.14)' },
  { id: 'semana', label: 'Esta semana', colorVar: 'var(--color-hz-semana)', chipBg: 'rgba(245,158,11,.14)' },
  { id: 'depois', label: 'Depois', colorVar: 'var(--color-hz-depois)', chipBg: 'rgba(156,163,175,.16)' },
];

// Campos extras exibidos no modal conforme a categoria.
export const EXTRA_FIELDS: Partial<Record<Category['id'], { key: string; label: string }[]>> = {
  video: [
    { key: 'link', label: 'Link dos arquivos' },
    { key: 'formato', label: 'Formato' },
    { key: 'duracao', label: 'Duração' },
    { key: 'ref', label: 'Referência' },
  ],
  design: [
    { key: 'formato', label: 'Formato da arte' },
    { key: 'dim', label: 'Dimensões' },
    { key: 'texto', label: 'Texto da peça' },
    { key: 'ref', label: 'Referências' },
  ],
  trafego: [
    { key: 'obj', label: 'Objetivo' },
    { key: 'orc', label: 'Orçamento' },
    { key: 'plat', label: 'Plataforma' },
    { key: 'inicio', label: 'Data de início' },
  ],
};

export const TEMPLATES: Template[] = [
  { nome: 'Criativo para anúncio', categoria: 'design', prioridade: 'alta', descricao: 'Peça para anúncio pago. Incluir headline, CTA e variações.' },
  { nome: 'Edição de Reels', categoria: 'video', prioridade: 'media', descricao: 'Editar Reels vertical 9:16, até 45s, com legendas.' },
  { nome: 'Publicação de artigo', categoria: 'site', prioridade: 'media', descricao: 'Publicar artigo no blog com SEO básico.' },
  { nome: 'Nova campanha', categoria: 'trafego', prioridade: 'alta', descricao: 'Estruturar campanha: objetivo, público e orçamento.' },
  { nome: 'Ajuste no site', categoria: 'site', prioridade: 'media', descricao: 'Ajuste pontual no site. Descrever a alteração.' },
  { nome: 'Relatório mensal', categoria: 'estrategia', prioridade: 'baixa', descricao: 'Compilar métricas do mês e insights.' },
];

// Paleta de post-its do Mural (adaptada ao tema escuro).
export const NOTE_COLORS = [
  { bg: 'rgba(139,92,246,.22)', accent: 'var(--color-cat-social)' },
  { bg: 'rgba(59,130,246,.22)', accent: 'var(--color-cat-video)' },
  { bg: 'rgba(236,72,153,.22)', accent: 'var(--color-cat-design)' },
  { bg: 'rgba(224,152,47,.22)', accent: 'var(--color-cat-estrategia)' },
];

// Datas relativas a "hoje" = 2026-07-10.
export const SEED_DEMANDS: Demand[] = [
  { id: 'd1', titulo: 'Stories com enquete', cliente: 'Loja Aurora', status: 'afazer', owner: null, categoria: 'social', prioridade: 'media', prazo: '2026-07-11' },
  { id: 'd2', titulo: 'Reels bastidores do evento', cliente: 'TechFlow', status: 'afazer', owner: null, categoria: 'video', prioridade: 'media', prazo: '2026-07-16' },
  { id: 'd3', titulo: 'Campanha Black Friday', cliente: 'Loja Aurora', status: 'afazer', owner: 'kallyl', categoria: 'trafego', prioridade: 'alta', prazo: '2026-07-20' },
  { id: 'd4', titulo: 'Carrossel de lançamento', cliente: 'Loja Aurora', status: 'fazendo', owner: 'allyson', categoria: 'social', prioridade: 'alta', prazo: '2026-07-10' },
  { id: 'd5', titulo: 'Identidade do e-book', cliente: 'TechFlow', status: 'fazendo', owner: 'allyson', categoria: 'design', prioridade: 'media', prazo: '2026-07-18' },
  { id: 'd6', titulo: 'Otimizar criativos', cliente: 'Loja Aurora', status: 'revisao', owner: 'kallyl', categoria: 'trafego', prioridade: 'media', prazo: '2026-07-08' },
  { id: 'd7', titulo: 'Landing page do webinar', cliente: 'TechFlow', status: 'revisao', owner: 'kallyl', categoria: 'site', prioridade: 'alta', prazo: '2026-07-12' },
  { id: 'd8', titulo: 'Planejamento de julho', cliente: 'Interno', status: 'feito', owner: 'kallyl', categoria: 'estrategia', prioridade: 'media', prazo: '2026-07-09', concluida: true },
];

export const SEED_NOTES: MuralNote[] = [
  { id: 'n1', texto: 'Testar Reels com áudio em alta', autor: 'allyson', x: 40, y: 30, cor: 0 },
  { id: 'n2', texto: 'Parceria com a cafeteria da esquina?', autor: 'kallyl', x: 300, y: 20, cor: 1 },
  { id: 'n3', texto: 'Série "mitos de tráfego" em carrossel', autor: 'allyson', x: 560, y: 30, cor: 0 },
  { id: 'n4', texto: 'Refazer a bio do perfil', autor: 'kallyl', x: 40, y: 240, cor: 1 },
  { id: 'n5', texto: 'Enquete: qual próximo produto?', autor: 'allyson', x: 300, y: 250, cor: 2 },
];

export const SEED_BACKLOG: BacklogItem[] = [
  { id: 'b1', titulo: 'Newsletter setembro', categoria: 'estrategia' },
  { id: 'b2', titulo: 'Roteiro - Reels institucional', categoria: 'video' },
  { id: 'b3', titulo: 'Briefing tráfego Q3', categoria: 'trafego' },
  { id: 'b4', titulo: 'Design - E-book captação', categoria: 'design' },
  { id: 'b5', titulo: 'Atualizar bio do Instagram', categoria: 'social' },
  { id: 'b6', titulo: 'Landing page nova', categoria: 'site' },
];

// "Hoje" fixo para os dados de exemplo baterem com os horizontes.
export const TODAY = '2026-07-10';
