import { useEffect, useRef, useState } from 'react';
import { GripVertical, X, Plus } from 'lucide-react';
import { NOTE_COLORS, PEOPLE } from '../data';
import type { MuralNote, PersonId } from '../types';
import Avatar from '../components/Avatar';

interface Props {
  notes: MuralNote[];
  onAddNote: (note: Omit<MuralNote, 'id'>) => void;
  onMoveNote: (id: string, x: number, y: number) => void; // persistido no fim do arrasto
  onDeleteNote: (id: string) => void;
}

/** Mural: post-its de posição livre. Arraste pela alça; cada um tem autor. */
export default function MuralScreen({ notes, onAddNote, onMoveNote, onDeleteNote }: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; x: number; y: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [newAuthor, setNewAuthor] = useState<PersonId>('allyson');
  const [newText, setNewText] = useState('');

  // cópia local para arrasto suave; sincroniza quando os dados mudam no Firestore
  const [localNotes, setLocalNotes] = useState<MuralNote[]>(notes);
  useEffect(() => {
    if (!drag.current) setLocalNotes(notes);
  }, [notes]);

  function onPointerDown(e: React.PointerEvent, note: MuralNote) {
    const area = areaRef.current!.getBoundingClientRect();
    drag.current = {
      id: note.id,
      dx: e.clientX - area.left - note.x,
      dy: e.clientY - area.top - note.y,
      x: note.x,
      y: note.y,
    };
    setDraggingId(note.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const area = areaRef.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - area.left - drag.current.dx, area.width - 220));
    const y = Math.max(0, e.clientY - area.top - drag.current.dy);
    drag.current.x = x;
    drag.current.y = y;
    const id = drag.current.id;
    setLocalNotes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
  }
  function onPointerUp() {
    if (drag.current) {
      // persiste a posição só uma vez, ao soltar
      onMoveNote(drag.current.id, drag.current.x, drag.current.y);
    }
    drag.current = null;
    setDraggingId(null);
  }

  function addNote() {
    const t = newText.trim();
    if (!t) return;
    onAddNote({ texto: t, autor: newAuthor, x: 24, y: 24, cor: notes.length % NOTE_COLORS.length });
    setNewText('');
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold text-ink">Mural</h2>
          <p className="text-[13px] text-ink-faint">Escreva ideias soltas e diga quem foi. Arraste pra organizar.</p>
        </div>
        {/* nova nota */}
        <div className="flex items-center gap-2 rounded-full border border-black/[0.07] bg-white/70 p-1 pl-3">
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
            placeholder="Nova nota..."
            className="w-40 bg-transparent text-[13px] outline-none placeholder:text-ink-faint sm:w-56"
          />
          <div className="flex items-center gap-1">
            {PEOPLE.map((p) => (
              <Avatar
                key={p.id}
                id={p.id}
                size={26}
                ring={newAuthor === p.id}
                onClick={() => setNewAuthor(p.id)}
                title={`Autor: ${p.name}`}
              />
            ))}
          </div>
          <button
            onClick={addNote}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white hover:bg-accent-strong"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* área do mural */}
      <div
        ref={areaRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="mural-grid relative min-h-[560px] w-full touch-none overflow-hidden rounded-2xl border border-black/[0.06] bg-white/40"
      >
        {localNotes.map((n) => {
          const color = NOTE_COLORS[n.cor % NOTE_COLORS.length];
          return (
            <div
              key={n.id}
              style={{
                left: n.x,
                top: n.y,
                background: color.bg,
                boxShadow: draggingId === n.id ? '0 18px 40px -18px rgba(40,38,60,.55)' : undefined,
              }}
              className={[
                'group absolute w-[220px] rounded-2xl px-4 py-3.5 card-shadow transition-shadow',
                draggingId === n.id ? 'z-20 scale-[1.02]' : 'z-10',
              ].join(' ')}
            >
              <div className="flex items-start justify-between">
                <button
                  onPointerDown={(e) => onPointerDown(e, n)}
                  className="-ml-1 cursor-grab text-ink-faint active:cursor-grabbing"
                  title="Arraste"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDeleteNote(n.id)}
                  className="text-ink-faint opacity-0 transition group-hover:opacity-100 hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 font-hand text-[22px] leading-tight text-ink">{n.texto}</p>
              <div className="mt-3 flex items-center gap-1.5">
                <Avatar id={n.autor} size={22} />
                <span className="text-[12px] font-medium text-ink-soft">
                  {PEOPLE.find((p) => p.id === n.autor)?.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
