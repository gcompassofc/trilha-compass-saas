import { CATEGORIES, HORIZONS, PEOPLE, STATUS_COLUMNS, TODAY } from './data';
import type { CategoryId, Demand, Horizon, PersonId, Priority, StatusId } from './types';

export function person(id: PersonId | null | undefined) {
  return PEOPLE.find((p) => p.id === id);
}

export function category(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id)!;
}

export function statusMeta(id: StatusId) {
  return STATUS_COLUMNS.find((s) => s.id === id)!;
}

export function horizonMeta(id: Horizon) {
  return HORIZONS.find((h) => h.id === id)!;
}

/** Horizonte de uma demanda: override manual, senão derivado do prazo. */
export function demandHorizon(d: Demand): Horizon {
  if (d.horizonte) return d.horizonte;
  return horizonFromPrazo(d.prazo);
}

/** Deriva o horizonte a partir do prazo (Hoje / Esta semana / Depois). */
export function horizonFromPrazo(prazo: string | null | undefined): Horizon {
  if (!prazo) return 'depois';
  const diff = daysFromToday(prazo);
  if (diff <= 0) return 'hoje';
  if (diff <= 7) return 'semana';
  return 'depois';
}

export function personColor(id: PersonId): string {
  return id === 'allyson' ? 'var(--color-p-allyson)' : 'var(--color-p-kallyl)';
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Diferença em dias entre um prazo e "hoje" (negativo = atrasado). */
export function daysFromToday(prazo: string): number {
  const a = parseDate(prazo).getTime();
  const b = parseDate(TODAY).getTime();
  return Math.round((a - b) / 86_400_000);
}

/** Rótulo curto do prazo: "16 jul". */
export function formatShort(iso: string): string {
  const d = parseDate(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export type DueBadge =
  | { kind: 'plain'; label: string }
  | { kind: 'today'; label: string }
  | { kind: 'late'; label: string };

/** Badge de prazo replicando a referência: "Hoje · 10 jul", "Atrasado · 8 jul". */
export function dueBadge(demand: Demand): DueBadge | null {
  if (!demand.prazo) return null;
  const short = formatShort(demand.prazo);
  if (demand.concluida) return { kind: 'plain', label: short };
  const diff = daysFromToday(demand.prazo);
  if (diff === 0) return { kind: 'today', label: `Hoje · ${short}` };
  if (diff < 0) return { kind: 'late', label: `Atrasado · ${short}` };
  return { kind: 'plain', label: short };
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  alta: 'Prioridade alta',
  media: 'Prioridade média',
  baixa: 'Prioridade baixa',
};

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  alta: { label: 'Alta', color: 'var(--color-danger)' },
  media: { label: 'Média', color: 'var(--color-hz-semana)' },
  baixa: { label: 'Baixa', color: 'var(--color-ink-soft)' },
};

export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

let counter = 1000;
export function uid(prefix = 'x'): string {
  counter += 1;
  return `${prefix}${counter}`;
}

/**
 * Lê um arquivo de imagem, redimensiona para um quadrado de `size`px (cover)
 * e devolve um data URL JPEG leve. Mantém o estado enxuto — no passo 3 isso
 * vira upload pro Firebase Storage, mas o formato (data URL) já serve de preview.
 */
export function fileToAvatarDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Arquivo não é uma imagem'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Não foi possível ler a imagem'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        // cover: recorta o centro no menor lado
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
