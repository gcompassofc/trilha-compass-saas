import { useState } from 'react';
import { ChevronRight, Flame, ListTodo } from 'lucide-react';
import { HORIZONS, STATUS_COLUMNS } from '../data';
import { demandHorizon } from '../lib';
import type { Demand, Horizon, StatusId } from '../types';
import BoardCard from '../components/BoardCard';

interface Props {
  demands: Demand[]; // já filtrado pelo App (busca/categoria/foco/rápidos)
  focus: boolean;
  backlogCount: number;
  onOpenCard: (d: Demand) => void;
  onMove: (id: string, horizonte: Horizon, status: StatusId) => void;
  onQuickAdd: (horizonte: Horizon, status: StatusId) => void;
  onOpenBacklog: () => void;
  onExitFocus: () => void;
}

const CELL_LIMIT = 4;

/** Quadro por horizonte × status (redesign). */
export default function BoardScreen({
  demands,
  focus,
  backlogCount,
  onOpenCard,
  onMove,
  onQuickAdd,
  onOpenBacklog,
  onExitFocus,
}: Props) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ semana: false, depois: false });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCell, setOverCell] = useState<string | null>(null);

  const shownHorizons = focus ? HORIZONS.filter((h) => h.id === 'hoje') : HORIZONS;

  const byCell = (hz: Horizon, st: StatusId) =>
    demands.filter((d) => demandHorizon(d) === hz && d.status === st);

  function cellKey(hz: Horizon, st: StatusId) {
    return `${hz}:${st}`;
  }

  function renderCell(hz: Horizon, st: StatusId) {
    const key = cellKey(hz, st);
    const all = byCell(hz, st);
    const isExpanded = !!expanded[key];
    const shown = isExpanded ? all : all.slice(0, CELL_LIMIT);
    const hiddenCount = all.length - shown.length;
    const isOver = overCell === key;

    return (
      <div
        key={key}
        onDragOver={(e) => {
          e.preventDefault();
          setOverCell(key);
        }}
        onDragLeave={() => setOverCell((c) => (c === key ? null : c))}
        onDrop={() => {
          if (dragId) onMove(dragId, hz, st);
          setDragId(null);
          setOverCell(null);
        }}
        className={['flex min-h-[72px] flex-col gap-2.5 rounded-2xl p-1 transition-colors', isOver ? 'drop-active' : ''].join(' ')}
      >
        {shown.map((d) => (
          <BoardCard
            key={d.id}
            demand={d}
            dragging={dragId === d.id}
            onOpen={() => onOpenCard(d)}
            onDragStart={() => setDragId(d.id)}
          />
        ))}
        {hiddenCount > 0 && (
          <button
            onClick={() => setExpanded((e) => ({ ...e, [key]: true }))}
            className="rounded-lg py-1.5 text-center text-[12px] font-bold text-ink-soft transition hover:bg-white/5 hover:text-ink-2"
          >
            +{hiddenCount} demandas
          </button>
        )}
        {isExpanded && all.length > CELL_LIMIT && (
          <button
            onClick={() => setExpanded((e) => ({ ...e, [key]: false }))}
            className="rounded-lg py-1.5 text-center text-[12px] font-bold text-ink-soft transition hover:bg-white/5 hover:text-ink-2"
          >
            ↑ Recolher
          </button>
        )}
        <button
          onClick={() => onQuickAdd(hz, st)}
          className="rounded-lg border border-dashed border-white/10 py-1.5 text-center text-[11px] font-semibold text-ink-dim opacity-0 transition group-hover/cell:opacity-100 hover:border-white/20 hover:text-ink-soft"
        >
          + Adicionar
        </button>
      </div>
    );
  }

  return (
    <section>
      {/* título + backlog */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-extrabold text-ink">Quadro por horizonte</h2>
          <p className="mt-1 text-[13px] text-ink-faint">
            Arraste os cards entre as células. Clique num card pra ver detalhes.
          </p>
        </div>
        <button
          onClick={onOpenBacklog}
          className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-surface glass-30 px-3.5 py-2.5 transition hover:border-white/20"
        >
          <ListTodo className="h-[15px] w-[15px] text-ink-soft" />
          <span className="text-[13px] font-bold text-ink-2">Backlog</span>
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11.5px] font-bold text-ink-soft">{backlogCount}</span>
          <ChevronRight className="h-4 w-4 text-ink-faint" />
        </button>
      </div>

      {focus && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3">
          <Flame className="h-4 w-4 shrink-0 text-accent-text" />
          <span className="text-[13px] font-semibold text-ink-2">
            Modo foco: só as suas demandas de hoje. Semana, depois e backlog ficam guardados.
          </span>
          <button onClick={onExitFocus} className="ml-auto shrink-0 text-[12.5px] font-bold text-accent-text hover:opacity-80">
            Sair do foco
          </button>
        </div>
      )}

      {/* cabeçalho de status */}
      <div className="mb-3 grid grid-cols-[130px_repeat(4,minmax(0,1fr))] items-end gap-4">
        <div />
        {STATUS_COLUMNS.map((s) => {
          const count = demands.filter(
            (d) => d.status === s.id && shownHorizons.some((h) => h.id === demandHorizon(d)),
          ).length;
          return (
            <div key={s.id} className="flex items-center gap-2 border-b border-white/8 pb-2">
              <span className="h-2 w-2 rounded-full" style={{ background: s.colorVar }} />
              <span className="text-[12px] font-extrabold tracking-wide uppercase" style={{ color: s.colorVar }}>
                {s.label}
              </span>
              <span className="text-[12px] font-bold text-ink-dim">· {count}</span>
            </div>
          );
        })}
      </div>

      {shownHorizons.map((h) => {
        const items = demands.filter((d) => demandHorizon(d) === h.id);
        const isHoje = h.id === 'hoje';
        const isOpen = isHoje || !!openSections[h.id];

        // linha Hoje: sempre aberta e destacada
        if (isHoje) {
          return (
            <div
              key={h.id}
              className="mb-3.5 grid grid-cols-[130px_repeat(4,minmax(0,1fr))] items-stretch gap-4 rounded-3xl p-4"
              style={{ background: 'linear-gradient(180deg,rgba(239,68,68,.06),rgba(255,255,255,.03))' }}
            >
              <div className="flex flex-col justify-center gap-2 border-l-[3px] pl-3" style={{ borderColor: h.colorVar }}>
                <div className="flex items-center gap-1.5">
                  <Flame className="h-4 w-4" style={{ color: h.colorVar }} fill="currentColor" />
                  <span className="text-[15px] font-extrabold text-ink">{h.label}</span>
                </div>
                <span
                  className="w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                  style={{ background: h.chipBg, color: h.colorVar }}
                >
                  {items.length} demandas
                </span>
              </div>
              {STATUS_COLUMNS.map((s) => (
                <div key={s.id} className="group/cell">
                  {renderCell(h.id, s.id)}
                </div>
              ))}
            </div>
          );
        }

        // seções recolhíveis (Esta semana / Depois)
        const statusCounts = STATUS_COLUMNS.map((s) => ({
          dot: s.colorVar,
          n: items.filter((d) => d.status === s.id).length,
        }));
        return (
          <div key={h.id} className="mb-3.5 overflow-hidden rounded-3xl bg-white/4">
            <button
              onClick={() => setOpenSections((o) => ({ ...o, [h.id]: !o[h.id] }))}
              className="flex w-full items-center gap-3.5 px-4 py-3.5 transition hover:bg-white/[0.03]"
            >
              <ChevronRight
                className={['h-4 w-4 text-ink-soft transition-transform', isOpen ? 'rotate-90' : ''].join(' ')}
              />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: h.colorVar }} />
              <span className="text-[15px] font-extrabold text-ink">{h.label}</span>
              <span
                className="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold"
                style={{ background: h.chipBg, color: h.colorVar }}
              >
                {items.length} demandas
              </span>
              <div className="ml-auto flex items-center gap-3">
                {statusCounts.map((sc, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: sc.dot }} />
                    <span className="text-[12px] font-bold text-ink-soft">{sc.n}</span>
                  </span>
                ))}
              </div>
            </button>
            {isOpen && (
              <div className="grid grid-cols-[130px_repeat(4,minmax(0,1fr))] items-stretch gap-4 px-4 pt-0.5 pb-4">
                <div />
                {STATUS_COLUMNS.map((s) => (
                  <div key={s.id} className="group/cell">
                    {renderCell(h.id, s.id)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
