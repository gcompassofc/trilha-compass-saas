import type {
  Category,
  Client,
  Demand,
  Idea,
  MuralNote,
  Person,
  StatusColumn,
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

export const CATEGORIES: Category[] = [
  { id: 'social', label: 'Social Media', colorVar: 'var(--color-cat-social)' },
  { id: 'trafego', label: 'Tráfego', colorVar: 'var(--color-cat-trafego)' },
  { id: 'design', label: 'Design', colorVar: 'var(--color-cat-design)' },
  { id: 'video', label: 'Edição de Vídeo', colorVar: 'var(--color-cat-video)' },
  { id: 'site', label: 'Site', colorVar: 'var(--color-cat-site)' },
  { id: 'estrategia', label: 'Estratégia', colorVar: 'var(--color-cat-estrategia)' },
];

export const STATUS_COLUMNS: StatusColumn[] = [
  { id: 'afazer', label: 'A fazer', colorVar: 'var(--color-ink-faint)' },
  { id: 'fazendo', label: 'Fazendo', colorVar: 'var(--color-cat-trafego)' },
  { id: 'revisao', label: 'Revisão', colorVar: 'var(--color-cat-estrategia)' },
  { id: 'feito', label: 'Feito', colorVar: 'var(--color-done)' },
];

// Paleta de post-its do Mural (cores pastel da referência).
export const NOTE_COLORS = [
  { bg: 'oklch(0.95 0.03 300)', accent: 'var(--color-cat-social)' },
  { bg: 'oklch(0.95 0.03 260)', accent: 'var(--color-cat-trafego)' },
  { bg: 'oklch(0.95 0.03 356)', accent: 'var(--color-cat-design)' },
  { bg: 'oklch(0.95 0.03 66)', accent: 'var(--color-cat-estrategia)' },
];

// Datas relativas a "hoje" = 2026-07-10 para reproduzir os badges
// (Hoje / Atrasado) exatamente como na referência.
export const SEED_DEMANDS: Demand[] = [
  // d1/d2 sem dono: aparecem na "Caixa de entrada compartilhada" da tela Dupla
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

export const SEED_IDEAS: Idea[] = [
  { id: 'i1', texto: 'Campanha de indicação (member get member)', autor: 'kallyl' },
  { id: 'i2', texto: 'Vídeo depoimento de cliente', autor: 'allyson' },
  { id: 'i3', texto: 'Rebrand do e-book em setembro', autor: 'kallyl' },
];

// "Hoje" fixo para os dados de exemplo baterem com os badges.
export const TODAY = '2026-07-10';
