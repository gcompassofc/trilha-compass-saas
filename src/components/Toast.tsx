import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastKind = 'error' | 'success' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

type Listener = (item: ToastItem) => void;
const listeners = new Set<Listener>();
let nextId = 1;

export const toast = {
  error: (title: string, message?: string) => emit({ id: nextId++, kind: 'error', title, message }),
  success: (title: string, message?: string) => emit({ id: nextId++, kind: 'success', title, message }),
  info: (title: string, message?: string) => emit({ id: nextId++, kind: 'info', title, message }),
};

function emit(item: ToastItem) {
  listeners.forEach(l => l(item));
}

const ICONS = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

const COLORS = {
  error: 'border-red-400/30 bg-red-500/10 text-red-200',
  success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  info: 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200',
};

export default function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (item) => {
      setItems(curr => [...curr, item]);
      const ttl = item.kind === 'error' ? 6000 : 3500;
      setTimeout(() => {
        setItems(curr => curr.filter(i => i.id !== item.id));
      }, ttl);
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const dismiss = (id: number) => setItems(curr => curr.filter(i => i.id !== id));

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {items.map(item => {
          const Icon = ICONS[item.kind];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 30, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-xl shadow-black/30 ${COLORS[item.kind]}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{item.title}</div>
                {item.message && (
                  <div className="text-xs opacity-80 mt-0.5 break-words">{item.message}</div>
                )}
              </div>
              <button
                onClick={() => dismiss(item.id)}
                className="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
