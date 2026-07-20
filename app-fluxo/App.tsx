import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { Search, LayoutGrid, StickyNote, Users, Plus, Settings2, LogOut, Flame } from 'lucide-react';
import { CATEGORIES } from './data';
import type { BacklogItem, CategoryId, Demand, Horizon, MuralNote, PersonId, StatusId } from './types';
import { auth } from './firebase';
import { fluxoDb } from './fluxoDb';
import { fileToAvatarDataUrl } from './lib';
import { useFluxoData } from './useFluxoData';
import { StoreProvider } from './store';
import Login from './components/Login';
import Avatar from './components/Avatar';
import BoardScreen from './screens/BoardScreen';
import MuralScreen from './screens/MuralScreen';
import DuoScreen from './screens/DuoScreen';
import BacklogDrawer from './screens/BacklogDrawer';
import ManageDrawer from './screens/ManageDrawer';
import DemandModal from './components/DemandModal';

type Screen = 'quadro' | 'mural' | 'dupla';

const NAV: { id: Screen; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'quadro', label: 'Quadro', icon: LayoutGrid },
  { id: 'mural', label: 'Mural', icon: StickyNote },
  { id: 'dupla', label: 'Dupla', icon: Users },
];

export default function App() {
  // ── auth ──
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u);
    setAuthReady(true);
  }), []);

  const authed = !!user;
  // dados em tempo real (só assina depois de autenticar)
  const { demands, notes, backlog, clients, people, loading } = useFluxoData(authed);

  // ── UI local ──
  const [screen, setScreen] = useState<Screen>('quadro');
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<CategoryId | null>(null);
  const [personFilter, setPersonFilter] = useState<PersonId | null>(null);
  const [focus, setFocus] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editing, setEditing] = useState<Demand | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // ── filtro (busca + categoria + pessoa) ──
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return demands.filter((d) => {
      if (catFilter && d.categoria !== catFilter) return false;
      if (personFilter && d.owner !== personFilter) return false;
      if (q && !(d.titulo.toLowerCase().includes(q) || d.cliente.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [demands, query, catFilter, personFilter]);

  // ── ações de demanda (persistem no Firestore; onSnapshot reflete de volta) ──
  function saveDemand(d: Demand) {
    const { id, ...rest } = d;
    if (demands.some((x) => x.id === id)) fluxoDb.updateDemand(id, rest);
    else fluxoDb.addDemand(rest); // id gerado pelo Firestore
  }
  function patchDemand(id: string, patch: Partial<Demand>) {
    fluxoDb.updateDemand(id, patch);
  }
  // Mover no Quadro: grava status + fixa o horizonte manualmente (a linha alvo).
  function moveDemand(id: string, horizonte: Horizon, status: StatusId) {
    fluxoDb.updateDemand(id, { status, horizonte });
  }
  function quickAdd(horizonte: Horizon, status: StatusId) {
    fluxoDb.addDemand({
      titulo: 'Nova demanda',
      cliente: 'Interno',
      status,
      owner: personFilter ?? null,
      categoria: 'social',
      prioridade: 'media',
      prazo: null,
      horizonte,
    });
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(d: Demand) {
    setEditing(d);
    setModalOpen(true);
  }

  // Puxa item do backlog pro Quadro (Hoje) e remove do backlog.
  async function pullBacklog(item: BacklogItem) {
    await fluxoDb.addDemand({
      titulo: item.titulo,
      cliente: 'Interno',
      status: 'afazer',
      owner: personFilter ?? null,
      categoria: item.categoria,
      prioridade: 'media',
      prazo: null,
      horizonte: 'hoje',
    });
    await fluxoDb.deleteBacklogItem(item.id);
    setDrawerOpen(false);
    setScreen('quadro');
  }

  // ── clientes ──
  function addClient(nome: string) {
    if (clients.some((c) => c.nome === nome)) return;
    fluxoDb.addClient({ nome });
  }
  function renameClient(id: string, nome: string) {
    const old = clients.find((c) => c.id === id);
    fluxoDb.updateClient(id, { nome });
    // mantém as demandas apontando pro cliente renomeado
    if (old && old.nome !== nome) {
      demands.filter((d) => d.cliente === old.nome).forEach((d) => fluxoDb.updateDemand(d.id, { cliente: nome }));
    }
  }
  function removeClient(id: string) {
    fluxoDb.deleteClient(id);
  }

  // ── fotos: data URL (256px JPEG) salvo direto no doc do Firestore ──
  async function uploadPersonPhoto(id: PersonId, file: File) {
    const p = people.find((x) => x.id === id);
    const dataUrl = await fileToAvatarDataUrl(file);
    await fluxoDb.setPersonPhoto(id, p?.name ?? id, dataUrl);
  }
  function removePersonPhoto(id: PersonId) {
    const p = people.find((x) => x.id === id);
    void fluxoDb.setPersonPhoto(id, p?.name ?? id, undefined);
  }
  async function uploadClientPhoto(id: string, file: File) {
    const dataUrl = await fileToAvatarDataUrl(file);
    await fluxoDb.updateClient(id, { photoUrl: dataUrl });
  }
  function removeClientPhoto(id: string) {
    void fluxoDb.updateClient(id, { photoUrl: undefined });
  }

  // ── auth gate ──
  if (!authReady) {
    return <FullScreenSpinner label="Carregando..." />;
  }
  if (!authed) {
    return <Login />;
  }

  return (
    <StoreProvider value={{ people, clients }}>
      <div className="flex min-h-screen flex-col">
        {/* ───────── Header ───────── */}
        <header className="sticky top-0 z-30 border-b border-hairline-soft bg-surface glass-30">
          <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                <span className="h-4 w-4 rounded-md bg-white" />
              </div>
              <div className="hidden sm:block">
                <div className="text-[17px] leading-none font-extrabold text-ink">Fluxo</div>
                <div className="mt-0.5 text-[12px] text-ink-faint">Demandas de marketing</div>
              </div>
            </div>

            <div className="relative ml-1 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-dim" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar demanda, cliente..."
                className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 pr-4 pl-9 text-[14px] text-ink outline-none placeholder:text-ink-dim focus:border-accent/40 focus:bg-white/8"
              />
            </div>

            {/* pessoas (clique = filtra por pessoa) */}
            <div className="hidden items-center gap-1.5 md:flex">
              {people.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersonFilter((cur) => (cur === p.id ? null : p.id))}
                  className={[
                    'flex items-center gap-2 rounded-full py-1 pr-3 pl-1 transition',
                    personFilter === p.id ? 'bg-white/10 ring-1 ring-accent/40' : 'hover:bg-white/6',
                  ].join(' ')}
                >
                  <Avatar id={p.id} size={30} ring />
                  <span className="text-[13px] font-semibold text-ink-2">{p.name}</span>
                </button>
              ))}
            </div>

            {/* modo foco */}
            <button
              onClick={() => setFocus((f) => !f)}
              title="Modo foco: só as demandas de hoje"
              className={[
                'flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition',
                focus
                  ? 'bg-accent-soft text-accent-text ring-1 ring-accent/40'
                  : 'border border-white/10 bg-white/5 text-ink-soft hover:bg-white/8 hover:text-ink',
              ].join(' ')}
            >
              <Flame className="h-[15px] w-[15px]" fill={focus ? 'currentColor' : 'none'} />
              <span className="hidden sm:inline">Foco</span>
            </button>

            <button
              onClick={() => setManageOpen(true)}
              title="Gerenciar pessoas e clientes"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-ink-soft transition hover:bg-white/8 hover:text-ink"
            >
              <Settings2 className="h-[18px] w-[18px]" />
            </button>

            <button
              onClick={openNew}
              className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-accent-strong"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova demanda</span>
            </button>

            <button
              onClick={() => signOut(auth)}
              title="Sair"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-ink-soft transition hover:bg-white/8 hover:text-ink"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* filtros por categoria */}
          <div className="mx-auto flex w-full max-w-[1400px] items-center gap-2 overflow-x-auto px-4 pb-3 no-scrollbar sm:px-6">
            <FilterPill active={catFilter === null} onClick={() => setCatFilter(null)}>
              Tudo
            </FilterPill>
            {CATEGORIES.map((c) => (
              <FilterPill
                key={c.id}
                active={catFilter === c.id}
                onClick={() => setCatFilter((cur) => (cur === c.id ? null : c.id))}
                dot={c.colorVar}
              >
                {c.label}
              </FilterPill>
            ))}
            <span className="ml-auto shrink-0 pl-4 text-[12px] text-ink-faint">
              {filtered.length} {filtered.length === 1 ? 'demanda' : 'demandas'}
            </span>
          </div>
        </header>

        {/* ───────── Conteúdo ───────── */}
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-5 pb-28 sm:px-6">
          {loading ? (
            <div className="flex min-h-[50vh] items-center justify-center text-[14px] text-ink-faint">
              Sincronizando…
            </div>
          ) : (
            <>
              {screen === 'quadro' && (
                <BoardScreen
                  demands={filtered}
                  focus={focus}
                  backlogCount={backlog.length}
                  onOpenCard={openEdit}
                  onMove={moveDemand}
                  onQuickAdd={quickAdd}
                  onOpenBacklog={() => setDrawerOpen(true)}
                  onExitFocus={() => setFocus(false)}
                />
              )}
              {screen === 'mural' && (
                <MuralScreen
                  notes={notes}
                  onAddNote={(n) => fluxoDb.addNote(n)}
                  onMoveNote={(id, x, y) => fluxoDb.updateNote(id, { x, y })}
                  onDeleteNote={(id) => fluxoDb.deleteNote(id)}
                />
              )}
              {screen === 'dupla' && (
                <DuoScreen
                  demands={filtered}
                  onAssign={(id, owner) => patchDemand(id, { owner })}
                  onToggleDone={(id, done) => patchDemand(id, { concluida: done, status: done ? 'feito' : 'fazendo' })}
                  onCardClick={openEdit}
                />
              )}
            </>
          )}
        </main>

        {/* ───────── Nav inferior flutuante ───────── */}
        <nav className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-[#141922]/90 p-1.5 shadow-xl glass-30">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = screen === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setScreen(n.id)}
                className={[
                  'flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition',
                  active ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </button>
            );
          })}
        </nav>

        <BacklogDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          backlog={backlog}
          onPull={pullBacklog}
          onAdd={(item) => fluxoDb.addBacklogItem(item)}
          onDelete={(id) => fluxoDb.deleteBacklogItem(id)}
        />

        <ManageDrawer
          open={manageOpen}
          onClose={() => setManageOpen(false)}
          people={people}
          clients={clients}
          onPersonPhotoUpload={uploadPersonPhoto}
          onPersonPhotoRemove={removePersonPhoto}
          onAddClient={addClient}
          onRenameClient={renameClient}
          onClientPhotoUpload={uploadClientPhoto}
          onClientPhotoRemove={removeClientPhoto}
          onRemoveClient={removeClient}
        />

        <DemandModal
          open={modalOpen}
          demand={editing}
          clients={clients}
          onClose={() => setModalOpen(false)}
          onSave={(d) => {
            saveDemand(d);
            setModalOpen(false);
          }}
          onCreateClient={addClient}
          onDelete={(id) => {
            fluxoDb.deleteDemand(id);
            setModalOpen(false);
          }}
        />
      </div>
    </StoreProvider>
  );
}

function FullScreenSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-[14px] text-ink-faint">
      {label}
    </div>
  );
}

// ── pílula de filtro ──
function FilterPill({
  children,
  active,
  onClick,
  dot,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition',
        active
          ? 'border-transparent bg-ink text-[#0f1217]'
          : 'border-white/10 bg-white/5 text-ink-soft hover:bg-white/8 hover:text-ink',
      ].join(' ')}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
      {children}
    </button>
  );
}
