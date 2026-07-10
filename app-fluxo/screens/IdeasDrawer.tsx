import { useState } from 'react';
import { X, ArrowRight, Plus } from 'lucide-react';
import { PEOPLE } from '../data';
import type { Idea, PersonId } from '../types';
import Avatar from '../components/Avatar';

interface Props {
  open: boolean;
  onClose: () => void;
  ideas: Idea[];
  onAddIdea: (idea: Omit<Idea, 'id'>) => void;
  onDeleteIdea: (id: string) => void;
  onPromote: (idea: Idea) => void;
}

/** Gaveta de ideias — rascunhos que se promovem pro Quadro. */
export default function IdeasDrawer({ open, onClose, ideas, onAddIdea, onDeleteIdea, onPromote }: Props) {
  const [text, setText] = useState('');
  const [author, setAuthor] = useState<PersonId>('allyson');

  function add() {
    const t = text.trim();
    if (!t) return;
    onAddIdea({ texto: t, autor: author });
    setText('');
  }

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        className={[
          'fixed inset-0 z-40 bg-black/25 transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      />
      {/* painel */}
      <aside
        className={[
          'fixed top-0 right-0 z-50 flex h-full w-full max-w-[380px] flex-col bg-canvas shadow-2xl transition-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-start justify-between border-b border-black/[0.06] px-5 py-4">
          <div>
            <h3 className="text-[18px] font-bold text-ink">Gaveta de ideias</h3>
            <p className="text-[12px] text-ink-faint">Guarde pra depois. Promova pro Quadro quando for a hora.</p>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* nova ideia */}
        <div className="border-b border-black/[0.06] px-5 py-4">
          <div className="flex items-center gap-2 rounded-full border border-black/[0.07] bg-white/70 p-1 pl-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="Nova ideia..."
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
            />
            <button
              onClick={add}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white hover:bg-accent-strong"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2 pl-1">
            <span className="text-[12px] text-ink-faint">Quem:</span>
            {PEOPLE.map((p) => (
              <Avatar key={p.id} id={p.id} size={26} ring={author === p.id} onClick={() => setAuthor(p.id)} />
            ))}
          </div>
        </div>

        {/* lista */}
        <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
          {ideas.length === 0 && (
            <p className="py-8 text-center text-[13px] text-ink-faint">Nenhuma ideia guardada.</p>
          )}
          {ideas.map((idea) => (
            <div key={idea.id} className="rounded-2xl bg-white px-4 py-3 card-shadow">
              <p className="text-[14px] font-medium text-ink">{idea.texto}</p>
              <div className="mt-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Avatar id={idea.autor} size={22} />
                  <span className="text-[12px] text-ink-soft">
                    {PEOPLE.find((p) => p.id === idea.autor)?.name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onDeleteIdea(idea.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-ink-faint hover:bg-black/5 hover:text-ink"
                    title="Descartar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onPromote(idea)}
                    className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-semibold text-accent hover:bg-accent hover:text-white"
                  >
                    Quadro <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
