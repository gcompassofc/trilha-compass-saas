import { useRef, useState } from 'react';
import { Bold, Italic, Link2, Image as ImageIcon, Eye, Pencil } from 'lucide-react';
import { Markdown } from '../markdown';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

/** Editor de descrição em Markdown: textarea com atalhos (Ctrl+B/I/K),
 *  mini-barra de botões e aba de preview. Imagens/links por URL. */
export default function DescriptionEditor({ value, onChange }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');

  // envolve a seleção com `before`/`after` (ex.: ** ** para negrito)
  function wrap(before: string, after = before, placeholder = '') {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(next);
    // reposiciona o cursor após atualizar
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + before.length + sel.length;
      ta.setSelectionRange(start + before.length, pos);
    });
  }

  function insertLink() {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end) || 'texto';
    const snippet = `[${sel}](https://)`;
    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      // deixa o cursor dentro dos parênteses, após https://
      const pos = start + sel.length + 3 + 'https://'.length + 1;
      ta.setSelectionRange(pos, pos);
    });
  }

  function insertImage() {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const snippet = `![](https://)`;
    const next = value.slice(0, start) + snippet + value.slice(start);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + snippet.length - 1; // antes do )
      ta.setSelectionRange(pos, pos);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === 'b') {
      e.preventDefault();
      wrap('**', '**', 'negrito');
    } else if (key === 'i') {
      e.preventDefault();
      wrap('*', '*', 'itálico');
    } else if (key === 'k') {
      e.preventDefault();
      insertLink();
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      {/* barra */}
      <div className="flex items-center justify-between border-b border-hairline-soft px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          <ToolBtn title="Negrito (Ctrl+B)" onClick={() => wrap('**', '**', 'negrito')}><Bold className="h-4 w-4" /></ToolBtn>
          <ToolBtn title="Itálico (Ctrl+I)" onClick={() => wrap('*', '*', 'itálico')}><Italic className="h-4 w-4" /></ToolBtn>
          <ToolBtn title="Link (Ctrl+K)" onClick={insertLink}><Link2 className="h-4 w-4" /></ToolBtn>
          <ToolBtn title="Imagem por URL" onClick={insertImage}><ImageIcon className="h-4 w-4" /></ToolBtn>
        </div>
        <div className="flex items-center gap-0.5">
          <TabBtn active={tab === 'edit'} onClick={() => setTab('edit')}><Pencil className="h-3.5 w-3.5" /> Escrever</TabBtn>
          <TabBtn active={tab === 'preview'} onClick={() => setTab('preview')}><Eye className="h-3.5 w-3.5" /> Preview</TabBtn>
        </div>
      </div>

      {tab === 'edit' ? (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={'Briefing, links e imagens...\n\nEx.: **negrito**, https://link.com\n![imagem](https://url-da-imagem.png)'}
          rows={6}
          className="block w-full resize-y bg-transparent px-3 py-2.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
        />
      ) : (
        <div className="min-h-[9rem] px-3 py-2.5">
          {value.trim() ? <Markdown source={value} /> : <p className="text-[13px] text-ink-faint">Nada para pré-visualizar ainda.</p>}
        </div>
      )}
    </div>
  );
}

function ToolBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-soft transition hover:bg-white/8 hover:text-ink"
    >
      {children}
    </button>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold transition',
        active ? 'bg-accent text-white' : 'text-ink-soft hover:bg-white/8',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
