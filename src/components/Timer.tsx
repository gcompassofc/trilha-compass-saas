import React, { useEffect, useState } from 'react';
import { Play, Pause } from 'lucide-react';

interface Timed {
  timeSpent?: number;
  timerStartedAt?: number | null;
  completed?: boolean;
}

interface TimerProps<T extends Timed> {
  item: T;
  onChange: (next: T) => void;
  size?: 'xs' | 'sm';
}

const formatTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function Timer<T extends Timed>({ item, onChange, size = 'xs' }: TimerProps<T>) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let interval: any;
    if (item.timerStartedAt && !item.completed) {
      interval = setInterval(() => setNow(Date.now()), 1000);
    }
    return () => clearInterval(interval);
  }, [item.timerStartedAt, item.completed]);

  const isRunning = !!item.timerStartedAt && !item.completed;
  const baseTime = item.timeSpent || 0;
  const elapsed = isRunning && item.timerStartedAt ? Math.floor((now - item.timerStartedAt) / 1000) : 0;
  const totalSeconds = baseTime + elapsed;

  const toggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.completed) return;
    if (isRunning) {
      onChange({ ...item, timerStartedAt: null, timeSpent: totalSeconds });
    } else {
      onChange({ ...item, timerStartedAt: Date.now() });
    }
  };

  const sizeClasses = size === 'sm'
    ? 'px-2 py-1 text-[11px]'
    : 'px-1.5 py-0.5 text-[10px]';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-2.5 h-2.5';

  const showLabel = totalSeconds > 0 || isRunning;

  return (
    <button
      onClick={toggleTimer}
      className={`flex items-center gap-1 rounded font-mono transition-all ${sizeClasses} ${
        isRunning
          ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          : showLabel
            ? 'bg-white/5 border border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
            : 'bg-white/[0.02] border border-white/5 text-slate-600 hover:text-slate-300 hover:bg-white/10'
      }`}
      title={isRunning ? 'Pausar timer' : totalSeconds > 0 ? 'Retomar timer' : 'Iniciar timer'}
    >
      {isRunning ? <Pause className={iconSize} fill="currentColor" /> : <Play className={iconSize} fill="currentColor" />}
      {showLabel && <span>{formatTime(totalSeconds)}</span>}
    </button>
  );
}
