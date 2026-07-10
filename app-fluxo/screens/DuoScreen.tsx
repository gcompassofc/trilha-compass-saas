import { useState } from 'react';
import { Check } from 'lucide-react';
import { PEOPLE } from '../data';
import { category, dueBadge } from '../lib';
import type { Demand, PersonId } from '../types';
import Avatar from '../components/Avatar';

interface Props {
  demands: Demand[];
  onAssign: (id: string, owner: PersonId | null) => void;
  onToggleDone: (id: string, done: boolean) => void;
  onCardClick: (d: Demand) => void;
}

/** Dupla — quem faz o quê. Caixa de entrada compartilhada (sem dono) +
 *  uma coluna por pessoa. Arraste para atribuir; checkbox para concluir. */
export default function DuoScreen({ demands, onAssign, onToggleDone, onCardClick }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<PersonId | 'inbox' | null>(null);

  const inbox = demands.filter((d) => !d.owner);

  function dropOn(target: PersonId | 'inbox') {
    if (dragId) onAssign(dragId, target === 'inbox' ? null : target);
    setDragId(null);
    setOver(null);
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-[22px] font-bold text-ink">Quem faz o quê</h2>
        <p className="text-[13px] text-ink-faint">Arraste da caixa de entrada para cada pessoa.</p>
      </div>

      {/* caixa de entrada compartilhada */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver('inbox');
        }}
        onDragLeave={() => setOver((o) => (o === 'inbox' ? null : o))}
        onDrop={() => dropOn('inbox')}
        className={[
          'mb-5 rounded-2xl border border-black/[0.06] bg-black/[0.02] p-4 transition-colors',
          over === 'inbox' ? 'drop-active' : '',
        ].join(' ')}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-ink">Caixa de entrada compartilhada</span>
            <span className="text-[13px] font-semibold text-ink-faint">{inbox.length}</span>
          </div>
          <span className="text-[12px] text-ink-faint">arraste para uma pessoa →</span>
        </div>
        {inbox.length === 0 ? (
          <p className="py-3 text-center text-[13px] text-ink-faint">Tudo distribuído 🎉</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {inbox.map((d) => (
              <InboxCard
                key={d.id}
                demand={d}
                onClick={() => onCardClick(d)}
                onDragStart={() => setDragId(d.id)}
                onDragEnd={() => setDragId(null)}
                dragging={dragId === d.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* colunas por pessoa */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {PEOPLE.map((p) => {
          const items = demands.filter((d) => d.owner === p.id);
          const isOver = over === p.id;
          return (
            <div
              key={p.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(p.id);
              }}
              onDragLeave={() => setOver((o) => (o === p.id ? null : o))}
              onDrop={() => dropOn(p.id)}
              className={[
                'rounded-2xl border border-black/[0.06] bg-white/50 p-4 transition-colors',
                isOver ? 'drop-active' : '',
              ].join(' ')}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar id={p.id} size={38} ring />
                  <span className="text-[16px] font-bold text-ink">{p.name}</span>
                </div>
                <span className="text-[13px] font-semibold text-ink-faint">{items.length}</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {items.length === 0 && (
                  <p className="py-4 text-center text-[13px] text-ink-faint">Sem demandas ainda.</p>
                )}
                {items.map((d) => (
                  <PersonRow
                    key={d.id}
                    demand={d}
                    onToggle={() => onToggleDone(d.id, !d.concluida)}
                    onClick={() => onCardClick(d)}
                    onDragStart={() => setDragId(d.id)}
                    onDragEnd={() => setDragId(null)}
                    dragging={dragId === d.id}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InboxCard({
  demand,
  onClick,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  demand: Demand;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  dragging: boolean;
}) {
  const cat = category(demand.categoria);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{ borderLeft: `4px solid ${cat.colorVar}` }}
      className={[
        'w-[240px] cursor-grab rounded-xl bg-white px-4 py-3 card-shadow active:cursor-grabbing',
        dragging ? 'dragging' : '',
      ].join(' ')}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.colorVar }} />
        {cat.label}
      </span>
      <h4 className="mt-1.5 text-[14px] font-bold text-ink">{demand.titulo}</h4>
      <p className="mt-0.5 text-[12px] text-ink-faint">
        {demand.cliente}
        {demand.prazo ? ` · ${dueBadge(demand)?.label.replace(/^(Hoje|Atrasado) · /, '')}` : ''}
      </p>
    </div>
  );
}

function PersonRow({
  demand,
  onToggle,
  onClick,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  demand: Demand;
  onToggle: () => void;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  dragging: boolean;
}) {
  const cat = category(demand.categoria);
  const done = demand.concluida;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{ borderLeft: `4px solid ${cat.colorVar}` }}
      className={[
        'flex items-center gap-3 rounded-xl bg-white px-3.5 py-3 card-shadow',
        dragging ? 'dragging' : '',
      ].join(' ')}
    >
      <button
        onClick={onToggle}
        className={[
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition',
          done ? 'border-transparent text-white' : 'border-black/20 text-transparent hover:border-accent',
        ].join(' ')}
        style={done ? { background: 'var(--color-cat-estrategia)' } : undefined}
        title={done ? 'Concluída' : 'Marcar como concluída'}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1 cursor-pointer" onClick={onClick}>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.colorVar }} />
          {cat.label}
        </span>
        <h4 className={['mt-0.5 truncate text-[14px] font-bold', done ? 'text-ink-faint line-through' : 'text-ink'].join(' ')}>
          {demand.titulo}
        </h4>
        <p className="text-[12px] text-ink-faint">
          {demand.cliente}
          {demand.prazo ? ` · ${dueBadge(demand)?.label.replace(/^(Hoje|Atrasado) · /, '')}` : ''}
        </p>
      </div>

      {demand.prioridade === 'alta' && !done && (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--color-danger)' }} title="Prioridade alta" />
      )}
    </div>
  );
}
