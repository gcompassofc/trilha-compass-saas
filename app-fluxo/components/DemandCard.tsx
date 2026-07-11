import { Check, AlignLeft } from 'lucide-react';
import { category, dueBadge } from '../lib';
import type { Demand } from '../types';
import Avatar from './Avatar';

interface Props {
  demand: Demand;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  dragging?: boolean;
  selectMode?: boolean; // quando true, clique marca/desmarca em vez de abrir
  selected?: boolean;
}

/** Cartão de demanda do Quadro (borda-esquerda na cor da categoria). */
export default function DemandCard({
  demand,
  onClick,
  draggable,
  onDragStart,
  onDragEnd,
  dragging,
  selectMode,
  selected,
}: Props) {
  const cat = category(demand.categoria);
  const badge = dueBadge(demand);
  const isDone = demand.concluida;

  return (
    <div
      onClick={onClick}
      draggable={draggable && !selectMode}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={[
        'group relative rounded-2xl bg-white px-[15px] py-[14px] card-shadow',
        'transition-shadow hover:card-shadow-hover',
        selectMode ? 'cursor-pointer' : draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        selected ? 'ring-2 ring-accent' : '',
        dragging ? 'dragging' : '',
      ].join(' ')}
      style={{ borderLeft: `4px solid ${cat.colorVar}` }}
    >
      {selectMode && (
        <span
          className={[
            'absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full border-2 transition',
            selected ? 'border-transparent bg-accent text-white' : 'border-black/20 bg-white text-transparent',
          ].join(' ')}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
      {/* linha topo: categoria + prioridade alta */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: cat.colorVar }} />
          {cat.label}
        </span>
        {demand.prioridade === 'alta' && !isDone && (
          <span
            title="Prioridade alta"
            className="h-2 w-2 rounded-full"
            style={{ background: 'var(--color-danger)' }}
          />
        )}
      </div>

      <h4
        className={[
          'mt-2 text-[15px] leading-snug font-bold',
          isDone ? 'text-ink-faint line-through' : 'text-ink',
        ].join(' ')}
      >
        {demand.titulo}
      </h4>
      <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-faint">
        {demand.cliente}
        {demand.descricao?.trim() && (
          <AlignLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-label="Tem descrição" />
        )}
      </p>

      <div className="mt-3 flex items-center justify-between">
        {demand.owner ? <Avatar id={demand.owner} size={26} /> : <span />}
        {badge && (
          <span
            className={[
              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
              badge.kind === 'today' ? 'bg-accent text-white' : '',
              badge.kind === 'late' ? 'text-white' : '',
              badge.kind === 'plain' ? 'text-ink-faint' : '',
            ].join(' ')}
            style={badge.kind === 'late' ? { background: 'var(--color-danger)' } : undefined}
          >
            {badge.label}
          </span>
        )}
      </div>
    </div>
  );
}
