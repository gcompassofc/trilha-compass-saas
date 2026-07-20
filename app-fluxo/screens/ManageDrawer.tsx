import { useState } from 'react';
import { X, Plus, Trash2, Check, Pencil } from 'lucide-react';
import { personColor, uid } from '../lib';
import { clientColorFor } from '../components/ClientAvatar';
import PhotoUpload from '../components/PhotoUpload';
import type { Client, Person, PersonId } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  people: Person[];
  clients: Client[];
  onPersonPhotoUpload: (id: PersonId, file: File) => Promise<void>;
  onPersonPhotoRemove: (id: PersonId) => void;
  onAddClient: (nome: string) => void;
  onRenameClient: (id: string, nome: string) => void;
  onClientPhotoUpload: (id: string, file: File) => Promise<void>;
  onClientPhotoRemove: (id: string) => void;
  onRemoveClient: (id: string) => void;
}

/** Painel «Gerenciar»: fotos das pessoas + CRUD de clientes com foto. */
export default function ManageDrawer({
  open,
  onClose,
  people,
  clients,
  onPersonPhotoUpload,
  onPersonPhotoRemove,
  onAddClient,
  onRenameClient,
  onClientPhotoUpload,
  onClientPhotoRemove,
  onRemoveClient,
}: Props) {
  const [newClient, setNewClient] = useState('');

  function addClient() {
    const nome = newClient.trim();
    if (!nome) return;
    onAddClient(nome);
    setNewClient('');
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
          'fixed top-0 right-0 z-50 flex h-full w-full max-w-[400px] flex-col bg-surface glass-30 shadow-2xl transition-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-start justify-between border-b border-hairline-soft px-5 py-4">
          <div>
            <h3 className="text-[18px] font-bold text-ink">Gerenciar</h3>
            <p className="text-[12px] text-ink-faint">Fotos da dupla e cadastro de clientes.</p>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* ── Pessoas ── */}
          <section>
            <h4 className="mb-3 text-[12px] font-bold tracking-wide text-ink-soft uppercase">Pessoas</h4>
            <div className="flex flex-col gap-3">
              {people.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3">
                  <PhotoUpload
                    name={p.name}
                    photoUrl={p.photoUrl}
                    color={personColor(p.id)}
                    size={48}
                    rounded="full"
                    onUpload={(file) => onPersonPhotoUpload(p.id, file)}
                    onRemove={() => onPersonPhotoRemove(p.id)}
                  />
                  <div>
                    <div className="text-[15px] font-bold text-ink">{p.name}</div>
                    <div className="text-[12px] text-ink-faint">
                      {p.photoUrl ? 'Toque na foto para trocar' : 'Toque para adicionar foto'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Clientes ── */}
          <section className="mt-7">
            <h4 className="mb-3 text-[12px] font-bold tracking-wide text-ink-soft uppercase">Clientes</h4>

            <div className="mb-3 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 pl-3">
              <input
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addClient()}
                placeholder="Novo cliente..."
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
              />
              <button
                onClick={addClient}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white hover:bg-accent-strong"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {clients.length === 0 && (
                <p className="py-4 text-center text-[13px] text-ink-faint">Nenhum cliente cadastrado.</p>
              )}
              {clients.map((c) => (
                <ClientRow
                  key={c.id}
                  client={c}
                  onPhotoUpload={(file) => onClientPhotoUpload(c.id, file)}
                  onPhotoRemove={() => onClientPhotoRemove(c.id)}
                  onRename={(nome) => onRenameClient(c.id, nome)}
                  onRemove={() => onRemoveClient(c.id)}
                />
              ))}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}

function ClientRow({
  client,
  onPhotoUpload,
  onPhotoRemove,
  onRename,
  onRemove,
}: {
  client: Client;
  onPhotoUpload: (file: File) => Promise<void>;
  onPhotoRemove: () => void;
  onRename: (nome: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(client.nome);

  function commit() {
    const nome = draft.trim();
    if (nome && nome !== client.nome) onRename(nome);
    else setDraft(client.nome);
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3.5 py-2.5">
      <PhotoUpload
        name={client.nome}
        photoUrl={client.photoUrl}
        color={clientColorFor(client.nome)}
        size={40}
        rounded="lg"
        onUpload={onPhotoUpload}
        onRemove={onPhotoRemove}
      />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[14px] font-semibold text-ink outline-none focus:border-accent/50"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{client.nome}</span>
      )}

      <div className="flex items-center gap-1">
        {editing ? (
          <button onClick={commit} className="flex h-7 w-7 items-center justify-center rounded-full text-done hover:bg-white/8" title="Salvar">
            <Check className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={() => setEditing(true)} className="flex h-7 w-7 items-center justify-center rounded-full text-ink-faint hover:bg-white/8 hover:text-ink" title="Renomear">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        <button onClick={onRemove} className="flex h-7 w-7 items-center justify-center rounded-full text-ink-faint hover:bg-white/8 hover:text-danger" title="Remover">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
