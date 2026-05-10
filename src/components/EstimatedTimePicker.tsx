import React, { useEffect, useRef, useState } from 'react';
import { Clock, X } from 'lucide-react';

interface Props {
  value?: number;
  onChange: (minutes: number | undefined) => void;
  size?: 'xs' | 'sm';
}

const PRESETS: { label: string; minutes: number }[] = [
  { label: '15min', minutes: 15 },
  { label: '30min', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '4h', minutes: 240 },
  { label: '1d', minutes: 480 },
];

export const formatEstimated = (min: number): string => {
  if (min <= 0) return '—';
  if (min >= 480 && min % 480 === 0) return `${min / 480}d`;
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${m}min`;
};

const parseFreeText = (raw: string): number | null => {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!s) return null;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  let total = 0;
  let matched = false;
  const dMatch = s.match(/(\d+)d/);
  if (dMatch) { total += parseInt(dMatch[1], 10) * 480; matched = true; }
  const hMatch = s.match(/(\d+)h/);
  if (hMatch) { total += parseInt(hMatch[1], 10) * 60; matched = true; }
  const mMatch = s.match(/(\d+)(min|m)(?!\d)/);
  if (mMatch) { total += parseInt(mMatch[1], 10); matched = true; }
  return matched ? total : null;
};

export default function EstimatedTimePicker({ value, onChange, size = 'xs' }: Props) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const sizeClasses = size === 'sm'
    ? 'px-2 py-1 text-[11px]'
    : 'px-1.5 py-0.5 text-[10px]';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-2.5 h-2.5';

  const hasValue = typeof value === 'number' && value > 0;

  const applyCustom = () => {
    const parsed = parseFreeText(custom);
    if (parsed && parsed > 0) {
      onChange(parsed);
      setCustom('');
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className={`flex items-center gap-1 rounded font-mono transition-all ${sizeClasses} ${
          hasValue
            ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
            : 'bg-white/[0.02] border border-white/5 text-slate-600 hover:text-slate-300 hover:bg-white/10'
        }`}
        title={hasValue ? `Tempo estimado: ${formatEstimated(value!)}` : 'Definir tempo estimado'}
      >
        <Clock className={iconSize} />
        <span>{hasValue ? `Est. ${formatEstimated(value!)}` : 'Est.'}</span>
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 top-full mt-1 left-0 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-3 min-w-[240px] space-y-3"
        >
          <div>
            <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mb-1.5">Presets</div>
            <div className="grid grid-cols-3 gap-1">
              {PRESETS.map(p => {
                const active = value === p.minutes;
                return (
                  <button
                    key={p.minutes}
                    onClick={() => { onChange(p.minutes); setOpen(false); }}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                      active
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mb-1.5">Custom</div>
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="ex: 1h30, 45min, 2h"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
                className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
              />
              <button
                onClick={applyCustom}
                disabled={!parseFreeText(custom)}
                className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-[11px] font-bold hover:bg-indigo-500/30 disabled:opacity-40"
              >
                OK
              </button>
            </div>
          </div>
          {hasValue && (
            <button
              onClick={() => { onChange(undefined); setOpen(false); }}
              className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 font-bold"
            >
              <X className="w-3 h-3" /> Limpar estimativa
            </button>
          )}
        </div>
      )}
    </div>
  );
}
