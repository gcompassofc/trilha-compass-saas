import { useState } from 'react';
import { STATUS_COLUMNS } from '../data';
import type { Demand, StatusId } from '../types';
import DemandCard from '../components/DemandCard';

interface Props {
  demands: Demand[];
  onCardClick: (d: Demand) => void;
  onMove: (id: string, status: StatusId) => void;
  onQuickAdd: (status: StatusId, titulo: string) => void;
}

/** Quadro por status: 4 colunas, add rápido no topo, drag-drop entre colunas. */
export default function BoardScreen({ demands, onCardClick, onMove, onQuickAdd }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<StatusId | null>(null);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-[22px] font-bold text-ink">Quadro por status</h2>
        <p className="text-[13px] text-ink-faint">Arraste os cartões entre as colunas.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATUS_COLUMNS.map((col) => {
          const items = demands.filter((d) => d.status === col.id);
          const isOver = overCol === col.id;
          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.id);
              }}
              onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
              onDrop={() => {
                if (dragId) onMove(dragId, col.id);
                setOverCol(null);
                setDragId(null);
              }}
              className={[
                'rounded-2xl p-1 transition-colors',
                isOver ? 'drop-active' : '',
              ].join(' ')}
            >
              {/* cabeçalho da coluna */}
              <div className="mb-2 flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: col.colorVar }} />
                  <span className="text-[14px] font-bold text-ink">{col.label}</span>
                </div>
                <span className="text-[13px] font-semibold text-ink-faint">{items.length}</span>
              </div>

              {/* add rápido */}
              <QuickAdd onAdd={(titulo) => onQuickAdd(col.id, titulo)} />

              {/* cartões */}
              <div className="mt-2 flex flex-col gap-3">
                {items.map((d) => (
                  <DemandCard
                    key={d.id}
                    demand={d}
                    draggable
                    dragging={dragId === d.id}
                    onDragStart={() => setDragId(d.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => onCardClick(d)}
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

function QuickAdd({ onAdd }: { onAdd: (titulo: string) => void }) {
  const [value, setValue] = useState('');
  function submit() {
    const t = value.trim();
    if (!t) return;
    onAdd(t);
    setValue('');
  }
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && submit()}
      onBlur={submit}
      placeholder="+ Adicionar"
      className="w-full rounded-xl border border-dashed border-black/[0.12] bg-transparent px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-accent/50 focus:bg-white/70"
    />
  );
}
