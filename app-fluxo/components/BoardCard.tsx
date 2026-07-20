import { category, dueBadge } from '../lib';
import type { Demand } from '../types';
import Avatar from './Avatar';

interface Props {
  demand: Demand;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
  dragging?: boolean;
}

/** Card do Quadro (tema escuro / glass). */
export default function BoardCard({ demand, onOpen, onDragStart, dragging }: Props) {
  const cat = category(demand.categoria);
  const badge = dueBadge(demand);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className={[
        'group flex cursor-pointer flex-col gap-2.5 rounded-2xl bg-card glass-12 px-3 py-[11px]',
        'shadow-[0_6px_18px_-8px_rgba(0,0,0,.35)] transition hover:bg-[rgba(31,37,48,.6)]',
        dragging ? 'dragging' : '',
      ].join(' ')}
    >
      <span
        className="flex items-center gap-1.5 text-[9.5px] font-bold tracking-wide uppercase"
        style={{ color: cat.colorVar }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.colorVar }} />
        {cat.label}
      </span>
      <span className="text-[13px] leading-snug font-bold text-ink">{demand.titulo}</span>
      <div className="flex items-center gap-2">
        {demand.owner ? <Avatar id={demand.owner} size={20} /> : <span className="h-5 w-5 rounded-full bg-white/10" />}
        {badge && badge.kind !== 'plain' && (
          <span
            className="ml-auto flex items-center gap-1.5 text-[10.5px] font-bold"
            style={{ color: badge.kind === 'late' ? 'var(--color-danger)' : 'var(--color-warn)' }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: badge.kind === 'late' ? 'var(--color-danger)' : 'var(--color-warn)' }}
            />
            {badge.kind === 'late' ? 'Atrasada' : 'Prazo hoje'}
          </span>
        )}
      </div>
    </div>
  );
}
