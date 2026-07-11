import React from 'react';

// Renderizador de Markdown leve e SEGURO, escrito à mão (sem dependência nova).
// Suporta: parágrafos, # títulos, - listas, **negrito**, *itálico*, `código`,
// links [texto](url), URLs soltas, imagens ![alt](url). Só aceita http(s) —
// bloqueia javascript:/data: para evitar XSS. Não interpreta HTML cru.

function safeUrl(url: string): string | null {
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  return null; // rejeita javascript:, data:, etc.
}

let keySeq = 0;
function k() {
  keySeq += 1;
  return `md${keySeq}`;
}

// ── inline: negrito, itálico, código, links, imagens, URLs soltas ──
function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // regex combinada, na ordem de precedência
  const re =
    /(!\[([^\]]*)\]\(([^)]+)\))|(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|((?:https?:\/\/)[^\s)]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      // imagem ![alt](url)
      const url = safeUrl(m[3]);
      if (url) {
        out.push(
          <img
            key={k()}
            src={url}
            alt={m[2] || ''}
            className="my-2 max-h-80 max-w-full rounded-lg border border-black/[0.06]"
            loading="lazy"
          />,
        );
      } else {
        out.push(m[1]);
      }
    } else if (m[4]) {
      // link [texto](url)
      const url = safeUrl(m[6]);
      if (url) {
        out.push(
          <a key={k()} href={url} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:opacity-80">
            {m[5]}
          </a>,
        );
      } else {
        out.push(m[5]);
      }
    } else if (m[7]) {
      out.push(<strong key={k()}>{m[8]}</strong>);
    } else if (m[9]) {
      out.push(<em key={k()}>{m[10]}</em>);
    } else if (m[11]) {
      out.push(
        <code key={k()} className="rounded bg-black/[0.06] px-1 py-0.5 font-mono text-[0.9em]">
          {m[12]}
        </code>,
      );
    } else if (m[13]) {
      // URL solta
      const url = safeUrl(m[13]);
      if (url) {
        out.push(
          <a key={k()} href={url} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:opacity-80 break-all">
            {m[13]}
          </a>,
        );
      } else {
        out.push(m[13]);
      }
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// ── blocos: títulos, listas, parágrafos ──
export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let list: string[] | null = null;

  const flushList = () => {
    if (list && list.length) {
      blocks.push(
        <ul key={k()} className="my-1.5 list-disc space-y-0.5 pl-5">
          {list.map((li) => (
            <li key={k()}>{renderInline(li)}</li>
          ))}
        </ul>,
      );
    }
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) {
      (list ??= []).push(line.replace(/^\s*[-*]\s+/, ''));
      continue;
    }
    flushList();
    if (line.trim() === '') continue;
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const cls = level === 1 ? 'text-[16px] font-bold' : level === 2 ? 'text-[15px] font-bold' : 'text-[14px] font-semibold';
      blocks.push(
        <p key={k()} className={`mt-2 mb-1 ${cls} text-ink`}>
          {renderInline(h[2])}
        </p>,
      );
      continue;
    }
    blocks.push(
      <p key={k()} className="my-1 leading-relaxed">
        {renderInline(line)}
      </p>,
    );
  }
  flushList();

  return <div className="text-[14px] text-ink">{blocks}</div>;
}
