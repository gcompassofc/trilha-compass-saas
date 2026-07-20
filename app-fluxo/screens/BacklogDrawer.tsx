import { useMemo, useState } from 'react';
import { X, Search, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { CATEGORIES } from '../data';
import { category } from '../lib';
import type { BacklogItem, CategoryId } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  backlog: BacklogItem[];
  onPull: (item: BacklogItem) => void; // puxa pro "Hoje"
  onAdd: (item: Omit<BacklogItem, 'id'>) => void;
  onDelete: (id: string) => void;
}

/** Gaveta de Backlog: adicionar, buscar, filtrar, puxar pro Quadro (Hoje) e apagar. */
export default function BacklogDrawer({ open, onClose, backlog, onPull, onAdd, onDelete }: Props) {
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<CategoryId | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState<CategoryId>('social');

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return backlog.filter((b) => {
      if (catFilter && b.categoria !== catFilter) return false;
      if (q && !(b.titulo.toLowerCase().includes(q) || category(b.categoria).label.toLowerCase().includes(q)))
        return false;
      return true;
    });
  }, [backlog, query, catFilter]);

  function add() {
    const t = newTitle.trim();
    if (!t) return;
    onAdd({ titulo: t, categoria: newCat });
    setNewTitle('');
  }

  return (
    <>
      <div
        onClick={onClose}
        className={[
          'fixed inset-0 z-40 bg-black/60 transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      />
      <aside
        className={[
          'fixed top-0 right-0 z-50 flex h-full w-full max-w-[360px] flex-col bg-surface glass-30 shadow-2xl transition-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-hairline-soft px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="text-[16px] font-extrabold text-ink">Backlog</span>
            <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-[11.5px] font-bold text-ink-soft">
              {backlog.length}
            </span>
          </div>
          <button onClick={onClose} className="text-ink-soft transition hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* novo item */}
        <div className="flex flex-col gap-2.5 border-b border-hairline-soft px-5 py-4">
          <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="Novo item no backlog..."
              className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-dim"
            />
            <button
              onClick={add}
              disabled={!newTitle.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-text transition hover:bg-accent/25 disabled:opacity-40"
              title="Adicionar ao backlog"
            >
              <Plus className="h-4 w-4" strokeWidth={2.6} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setNewCat(c.id)}
                className={[
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
                  newCat === c.id ? 'bg-white/12 text-ink' : 'bg-white/5 text-ink-dim hover:bg-white/8',
                ].join(' ')}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.colorVar }} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* busca + filtros */}
        <div className="flex flex-col gap-3 border-b border-hairline-soft px-5 py-4">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5">
            <Search className="h-3.5 w-3.5 text-ink-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar no backlog..."
              className="flex-1 bg-transparent text-[13px] text-ink outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip active={catFilter === null} onClick={() => setCatFilter(null)}>
              Tudo
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                active={catFilter === c.id}
                dot={c.colorVar}
                onClick={() => setCatFilter((cur) => (cur === c.id ? null : c.id))}
              >
                {c.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* lista */}
        <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
          {items.length === 0 && (
            <p className="py-8 text-center text-[12.5px] text-ink-dim">Nada encontrado.</p>
          )}
          {items.map((b) => {
            const cat = category(b.categoria);
            return (
              <div key={b.id} className="group flex items-center gap-3 rounded-2xl bg-white/5 px-3.5 py-3">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cat.colorVar }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-ink">{b.titulo}</div>
                  <div className="mt-0.5 text-[11px] text-ink-faint">{cat.label}</div>
                </div>
                <button
                  onClick={() => onDelete(b.id)}
                  className="flex shrink-0 items-center justify-center rounded-lg p-2 text-ink-dim opacity-0 transition group-hover:opacity-100 hover:bg-white/8 hover:text-hz-hoje"
                  title="Apagar do backlog"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onPull(b)}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent-soft px-2.5 py-2 text-[11.5px] font-bold text-accent-text transition hover:bg-accent/25"
                >
                  <ArrowUp className="h-3 w-3" strokeWidth={2.6} />
                  Hoje
                </button>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}

function Chip({
  active,
  onClick,
  dot,
  children,
}: {
  active: boolean;
  onClick: () => void;
  dot?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition',
        active ? 'bg-ink text-[#0f1217]' : 'bg-white/6 text-ink-2 hover:bg-white/10',
      ].join(' ')}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
      {children}
    </button>
  );
}
