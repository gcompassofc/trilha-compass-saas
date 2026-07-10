import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { CATEGORIES, PEOPLE, STATUS_COLUMNS } from '../data';
import { uid } from '../lib';
import type { CategoryId, Client, Demand, PersonId, Priority, StatusId } from '../types';
import Avatar from './Avatar';
import ClientAvatar from './ClientAvatar';

interface Props {
  open: boolean;
  demand: Demand | null; // null = criar nova
  clients: Client[];
  onClose: () => void;
  onSave: (d: Demand) => void;
  onCreateClient: (nome: string) => void; // cadastra cliente novo criado aqui
}

const PRIORITIES: { id: Priority; label: string }[] = [
  { id: 'alta', label: 'Alta' },
  { id: 'media', label: 'Média' },
  { id: 'baixa', label: 'Baixa' },
];

const empty: Demand = {
  id: '',
  titulo: '',
  cliente: '',
  status: 'afazer',
  owner: null,
  categoria: 'social',
  prioridade: 'media',
  prazo: null,
};

/** Modal de criar/editar demanda. */
export default function DemandModal({ open, demand, clients, onClose, onSave, onCreateClient }: Props) {
  const [form, setForm] = useState<Demand>(empty);
  const [addingClient, setAddingClient] = useState(false);
  const [newClient, setNewClient] = useState('');

  useEffect(() => {
    if (open) {
      setForm(demand ?? { ...empty, id: uid('d') });
      setAddingClient(false);
      setNewClient('');
    }
  }, [open, demand]);

  if (!open) return null;

  function confirmNewClient() {
    const nome = newClient.trim();
    if (!nome) return;
    if (!clients.some((c) => c.nome === nome)) onCreateClient(nome);
    set('cliente', nome);
    setNewClient('');
    setAddingClient(false);
  }

  function set<K extends keyof Demand>(key: K, value: Demand[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function save() {
    if (!form.titulo.trim()) return;
    onSave({ ...form, cliente: form.cliente.trim() || 'Interno' });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] rounded-t-3xl bg-canvas p-5 shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[19px] font-bold text-ink">{demand ? 'Editar demanda' : 'Nova demanda'}</h3>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Título">
            <input
              autoFocus
              value={form.titulo}
              onChange={(e) => set('titulo', e.target.value)}
              placeholder="Ex.: Carrossel de lançamento"
              className="input"
            />
          </Field>

          <Field label="Cliente">
            {addingClient ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmNewClient();
                    if (e.key === 'Escape') setAddingClient(false);
                  }}
                  placeholder="Nome do cliente"
                  className="input flex-1"
                />
                <button onClick={confirmNewClient} className="rounded-full bg-accent px-3 py-2 text-[13px] font-semibold text-white hover:bg-accent-strong">
                  Adicionar
                </button>
                <button onClick={() => setAddingClient(false)} className="rounded-full px-2 py-2 text-[13px] text-ink-soft hover:bg-black/5">
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => set('cliente', c.nome)}
                    className={[
                      'flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-[13px] font-semibold transition',
                      form.cliente === c.nome
                        ? 'border-transparent bg-ink text-white'
                        : 'border-black/[0.08] bg-white/60 text-ink-soft hover:bg-white',
                    ].join(' ')}
                  >
                    <ClientAvatar nome={c.nome} size={22} />
                    {c.nome}
                  </button>
                ))}
                <button
                  onClick={() => setAddingClient(true)}
                  className="flex items-center gap-1 rounded-full border border-dashed border-black/20 px-3 py-1.5 text-[13px] font-semibold text-ink-soft hover:border-accent/50 hover:text-accent"
                >
                  <Plus className="h-3.5 w-3.5" /> Novo cliente
                </button>
              </div>
            )}
          </Field>

          <Field label="Prazo">
            <input type="date" value={form.prazo ?? ''} onChange={(e) => set('prazo', e.target.value || null)} className="input" />
          </Field>

          <Field label="Responsável">
            <div className="flex items-center gap-2">
              <PersonChip active={form.owner === null} onClick={() => set('owner', null)}>Ninguém</PersonChip>
              {PEOPLE.map((p) => (
                <button
                  key={p.id}
                  onClick={() => set('owner', p.id as PersonId)}
                  className={[
                    'flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-[13px] font-semibold transition',
                    form.owner === p.id ? 'bg-white shadow-sm ring-1 ring-accent/40' : 'hover:bg-white/60',
                  ].join(' ')}
                >
                  <Avatar id={p.id} size={26} />
                  {p.name}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Categoria">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => set('categoria', c.id as CategoryId)}
                  className={[
                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition',
                    form.categoria === c.id ? 'border-transparent bg-ink text-white' : 'border-black/[0.08] bg-white/60 text-ink-soft hover:bg-white',
                  ].join(' ')}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.colorVar }} />
                  {c.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prioridade">
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => set('prioridade', p.id)}
                    className={[
                      'flex-1 rounded-lg border py-2 text-[13px] font-semibold transition',
                      form.prioridade === p.id ? 'border-transparent bg-ink text-white' : 'border-black/[0.08] bg-white/60 text-ink-soft hover:bg-white',
                    ].join(' ')}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value as StatusId)}
                className="input"
              >
                {STATUS_COLUMNS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2.5 text-[14px] font-semibold text-ink-soft hover:bg-black/5">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={!form.titulo.trim()}
            className="rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-accent-strong disabled:opacity-40"
          >
            {demand ? 'Salvar' : 'Criar demanda'}
          </button>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,.08);
          background: rgba(255,255,255,.7);
          padding: 10px 12px;
          font-size: 14px;
          color: var(--color-ink);
          outline: none;
        }
        .input:focus { border-color: color-mix(in oklch, var(--color-accent) 45%, transparent); background: #fff; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function PersonChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-full border px-3 py-1.5 text-[13px] font-semibold transition',
        active ? 'border-transparent bg-ink text-white' : 'border-black/[0.08] bg-white/60 text-ink-soft hover:bg-white',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
