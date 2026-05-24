import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { Client, MasterTask, Priority, SubTask, TaskStatus, TaskType, TeamMember } from '../types';

interface TaskImporterProps {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  teamMembers: TeamMember[];
  onUpdateClient: (client: Client) => void;
}

interface ParsedSubTask {
  title: string;
  startDate?: string;
  dueDate?: string;
  status?: TaskStatus;
  responsibles: string[];
  responsibleIds: string[];
  unmatchedResponsibles: string[];
}

interface ParsedTask {
  title: string;
  responsibles: string[];
  responsibleIds: string[];
  unmatchedResponsibles: string[];
  taskType: TaskType;
  priority: Priority;
  subTasks: ParsedSubTask[];
  rawPriority: string;
  rawType: string;
  startDate?: string;
  dueDate?: string;
  status?: TaskStatus;
}

interface ParsedSection {
  clientName: string;
  clientId: string | null;
  tasks: ParsedTask[];
}

interface ParseResult {
  sections: ParsedSection[];
  errors: string[];
}

const PRIORITY_MAP: Record<string, Priority> = {
  'urgente': 'high',
  'alta': 'high',
  'high': 'high',
  'normal': 'medium',
  'média': 'medium',
  'media': 'medium',
  'medium': 'medium',
  'baixa': 'low',
  'low': 'low',
};

const TYPE_MAP: Record<string, TaskType> = {
  'escopo': 'scope',
  'scope': 'scope',
  'overdelivery': 'overdelivery',
  'extra': 'overdelivery',
};

const STATUS_MAP: Record<string, TaskStatus> = {
  'em progresso': 'in_progress',
  'em andamento': 'in_progress',
  'progresso': 'in_progress',
  'in_progress': 'in_progress',
  'in progress': 'in_progress',
  'doing': 'in_progress',
  'impedimento': 'blocked',
  'bloqueado': 'blocked',
  'blocked': 'blocked',
  'travado': 'blocked',
  'concluida': 'done',
  'concluída': 'done',
  'feito': 'done',
  'feita': 'done',
  'done': 'done',
  'pronto': 'done',
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Aceita YYYY-MM-DD ou DD/MM/YYYY e devolve sempre YYYY-MM-DD. Retorna undefined se inválido. */
function parseDateLoose(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (ISO_DATE_RE.test(trimmed)) return trimmed;
  const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const [, d, m, y] = br;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return undefined;
}

const stripBoldMarkers = (s: string) => s.replace(/^\*\*|\*\*$/g, '').trim();

const normalizeName = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

const findClient = (clientName: string, clients: Client[]): Client | null => {
  const target = normalizeName(clientName);
  return (
    clients.find(c => normalizeName(c.name) === target) ||
    clients.find(c => normalizeName(c.name).startsWith(target)) ||
    clients.find(c => target.startsWith(normalizeName(c.name))) ||
    null
  );
};

const findMember = (name: string, members: TeamMember[]): TeamMember | null => {
  const target = normalizeName(name);
  return (
    members.find(m => normalizeName(m.name) === target) ||
    members.find(m => normalizeName(m.name).split(' ')[0] === target) ||
    members.find(m => normalizeName(m.name).startsWith(target)) ||
    null
  );
};

const parseInput = (raw: string, clients: Client[], teamMembers: TeamMember[]): ParseResult => {
  const lines = raw.split('\n').map(l => l.replace(/\r$/, ''));
  const sections: ParsedSection[] = [];
  const errors: string[] = [];

  let currentSection: ParsedSection | null = null;
  let currentTask: ParsedTask | null = null;
  let currentSub: ParsedSubTask | null = null;
  let inSubtasks = false;

  const flushTask = () => {
    if (!currentTask || !currentSection) return;
    if (currentTask.title) currentSection.tasks.push(currentTask);
    currentTask = null;
    currentSub = null;
    inSubtasks = false;
  };

  const flushSection = () => {
    flushTask();
    if (currentSection && currentSection.tasks.length > 0) sections.push(currentSection);
    currentSection = null;
  };

  // A line is a client header when:
  //  - it's wrapped in **...** (markdown bold), OR
  //  - it's a known client name, OR
  //  - it's all-uppercase short (<=60 chars)
  // and it's NOT one of the labeled fields.
  const isFieldLine = (s: string) =>
    /^\*?\*?(Demanda|Respons[áa]veis?|Tipo|Prioridade|Subtarefas|In[ií]cio|Entrega|Status)\s*:/i.test(s);

  const detectClientHeader = (s: string): { name: string; matched: Client | null } | null => {
    if (isFieldLine(s)) return null;
    const boldOnly = s.match(/^\*\*(.+?)\*\*\s*$/);
    if (boldOnly) {
      const inner = boldOnly[1].trim();
      return { name: inner, matched: findClient(inner, clients) };
    }
    const candidate = stripBoldMarkers(s);
    const isUppercaseHeading =
      /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s&\-0-9]+$/.test(candidate) && candidate.length <= 60;
    const matched = findClient(candidate, clients);
    if (matched || isUppercaseHeading) {
      return { name: candidate, matched };
    }
    return null;
  };

  /** Parseia os labels conhecidos numa linha "trim-mada", aplicando ao alvo (tarefa ou subtarefa). */
  const applyLabel = (
    line: string,
    target: { responsibles: string[]; responsibleIds: string[]; unmatchedResponsibles: string[];
              startDate?: string; dueDate?: string; status?: TaskStatus; rawType?: string; rawPriority?: string;
              taskType?: TaskType; priority?: Priority; },
    opts: { allowTypeAndPriority: boolean },
  ): boolean => {
    const respMatch = line.match(/^Respons[áa]veis?\s*:\s*(.+)$/i);
    if (respMatch) {
      const names = respMatch[1].split(/[,;]| e /i).map(n => stripBoldMarkers(n).trim()).filter(Boolean);
      for (const name of names) {
        const member = findMember(name, teamMembers);
        if (member) {
          target.responsibles.push(member.name);
          target.responsibleIds.push(member.id);
        } else {
          target.unmatchedResponsibles.push(name);
        }
      }
      return true;
    }
    const startMatch = line.match(/^In[ií]cio\s*:\s*(.+)$/i);
    if (startMatch) {
      const parsed = parseDateLoose(stripBoldMarkers(startMatch[1]));
      if (parsed) target.startDate = parsed;
      else errors.push(`Data de início inválida: "${startMatch[1].trim()}" (use YYYY-MM-DD ou DD/MM/YYYY).`);
      return true;
    }
    const dueMatch = line.match(/^Entrega\s*:\s*(.+)$/i);
    if (dueMatch) {
      const parsed = parseDateLoose(stripBoldMarkers(dueMatch[1]));
      if (parsed) target.dueDate = parsed;
      else errors.push(`Data de entrega inválida: "${dueMatch[1].trim()}" (use YYYY-MM-DD ou DD/MM/YYYY).`);
      return true;
    }
    const statusMatch = line.match(/^Status\s*:\s*(.+)$/i);
    if (statusMatch) {
      const rawStatus = stripBoldMarkers(statusMatch[1]).trim();
      const mapped = STATUS_MAP[normalizeName(rawStatus)];
      if (mapped) target.status = mapped;
      else errors.push(`Status desconhecido: "${rawStatus}" — use "Em progresso", "Impedimento" ou "Concluída".`);
      return true;
    }
    if (opts.allowTypeAndPriority) {
      const tipoMatch = line.match(/^Tipo\s*:\s*(.+)$/i);
      if (tipoMatch) {
        const rawT = stripBoldMarkers(tipoMatch[1]).trim();
        target.rawType = rawT;
        const mapped = TYPE_MAP[normalizeName(rawT)];
        if (mapped) target.taskType = mapped;
        return true;
      }
      const prioMatch = line.match(/^Prioridade\s*:\s*(.+)$/i);
      if (prioMatch) {
        const rawP = stripBoldMarkers(prioMatch[1]).trim();
        target.rawPriority = rawP;
        const mapped = PRIORITY_MAP[normalizeName(rawP)];
        if (mapped) target.priority = mapped;
        return true;
      }
    }
    return false;
  };

  for (let rawLine of lines) {
    const isIndented = /^(\s{2,}|\t)/.test(rawLine);
    const line = rawLine.trim();
    if (!line) continue;
    if (/^---+$/.test(line)) {
      // Separador `---` quebra o "modo subtarefa atual" mas mantém a tarefa.
      currentSub = null;
      continue;
    }

    // Header de cliente tem precedência (pra não comer "**SALTUR**" como bullet).
    const headerHit = detectClientHeader(line);
    if (headerHit) {
      flushSection();
      currentSection = {
        clientName: headerHit.name,
        clientId: headerHit.matched ? headerHit.matched.id : null,
        tasks: [],
      };
      if (!headerHit.matched) {
        errors.push(`Cliente "${headerHit.name}" não encontrado — demandas serão ignoradas.`);
      }
      continue;
    }

    const demandaMatch = line.match(/^\*?\*?Demanda\s*:\s*(.+?)\*?\*?$/i);
    const subHeaderMatch = /^Subtarefas\s*:?\s*$/i.test(line);
    const subBulletMatch = line.match(/^[-•]\s*(.+)$/);

    if (demandaMatch) {
      flushTask();
      if (!currentSection) {
        errors.push(`Demanda "${demandaMatch[1]}" sem cliente associado — ignorada.`);
        continue;
      }
      currentTask = {
        title: stripBoldMarkers(demandaMatch[1]).trim(),
        responsibles: [],
        responsibleIds: [],
        unmatchedResponsibles: [],
        taskType: 'scope',
        priority: 'medium',
        subTasks: [],
        rawPriority: '',
        rawType: '',
      };
      currentSub = null;
      inSubtasks = false;
      continue;
    }

    if (currentTask && subHeaderMatch) {
      inSubtasks = true;
      currentSub = null;
      continue;
    }

    // Bullet de subtarefa: cria nova entrada e fica em "modo subtarefa".
    if (currentTask && inSubtasks && subBulletMatch && !isIndented) {
      const subTitle = stripBoldMarkers(subBulletMatch[1]).trim();
      if (subTitle) {
        currentSub = {
          title: subTitle,
          responsibles: [],
          responsibleIds: [],
          unmatchedResponsibles: [],
        };
        currentTask.subTasks.push(currentSub);
      }
      continue;
    }

    // Linha indentada com label: aplica à subtarefa corrente.
    if (currentTask && currentSub && isIndented) {
      const consumed = applyLabel(line, currentSub, { allowTypeAndPriority: false });
      if (consumed) continue;
      // Se for indentado mas não bater nenhum label, ignora silenciosamente.
      continue;
    }

    // Linha sem indentação: aplica à tarefa principal (e encerra "modo subtarefa atual").
    if (currentTask) {
      const consumed = applyLabel(line, currentTask, { allowTypeAndPriority: true });
      if (consumed) {
        currentSub = null;
        continue;
      }
    }
  }

  flushSection();

  // Validação: intervalo invertido.
  for (const s of sections) {
    for (const t of s.tasks) {
      if (t.startDate && t.dueDate && t.startDate > t.dueDate) {
        errors.push(`"${t.title}": Início (${t.startDate}) é posterior à Entrega (${t.dueDate}).`);
      }
      for (const st of t.subTasks) {
        if (st.startDate && st.dueDate && st.startDate > st.dueDate) {
          errors.push(`Subtarefa "${st.title}": Início (${st.startDate}) é posterior à Entrega (${st.dueDate}).`);
        }
      }
    }
  }

  return { sections, errors };
};

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2) + Date.now().toString(36);

export default function TaskImporter({ open, onClose, clients, teamMembers, onUpdateClient }: TaskImporterProps) {
  const [rawText, setRawText] = useState('');
  const [step, setStep] = useState<'input' | 'preview' | 'done'>('input');
  const [importedCount, setImportedCount] = useState(0);

  const parseResult = useMemo<ParseResult>(() => {
    if (!rawText.trim()) return { sections: [], errors: [] };
    return parseInput(rawText, clients, teamMembers);
  }, [rawText, clients, teamMembers]);

  const totalTasks = parseResult.sections.reduce(
    (sum, s) => sum + (s.clientId ? s.tasks.length : 0),
    0
  );
  const totalSubtasks = parseResult.sections.reduce(
    (sum, s) => sum + (s.clientId ? s.tasks.reduce((t, task) => t + task.subTasks.length, 0) : 0),
    0
  );

  const handleImport = async () => {
    const tasksByClientId = new Map<string, MasterTask[]>();

    for (const section of parseResult.sections) {
      if (!section.clientId) continue;
      const list = tasksByClientId.get(section.clientId) || [];
      for (const task of section.tasks) {
        const subTasks: SubTask[] = task.subTasks.map(t => {
          const sub: SubTask = {
            id: generateId(),
            title: t.title,
            completed: t.status === 'done',
          };
          if (t.startDate) sub.startDate = t.startDate;
          if (t.dueDate) sub.dueDate = t.dueDate;
          if (t.status) sub.status = t.status;
          if (t.responsibleIds.length > 0) {
            sub.responsibles = t.responsibleIds;
            sub.responsible = t.responsibleIds[0];
          }
          return sub;
        });
        const masterTask: MasterTask = {
          id: generateId(),
          title: task.title,
          completed: task.status === 'done',
          priority: task.priority,
          taskType: task.taskType,
          responsibles: task.responsibleIds,
          responsible: task.responsibleIds[0],
          subTasks,
        };
        if (task.startDate) masterTask.startDate = task.startDate;
        if (task.dueDate) masterTask.dueDate = task.dueDate;
        if (task.status) masterTask.status = task.status;
        list.push(masterTask);
      }
      tasksByClientId.set(section.clientId, list);
    }

    let imported = 0;
    for (const [clientId, newTasks] of tasksByClientId.entries()) {
      const client = clients.find(c => c.id === clientId);
      if (!client) continue;
      const updated: Client = {
        ...client,
        masterTasks: [...(client.masterTasks || []), ...newTasks],
      };
      onUpdateClient(updated);
      imported += newTasks.length;
    }

    setImportedCount(imported);
    setStep('done');
  };

  const handleClose = () => {
    setRawText('');
    setStep('input');
    setImportedCount(0);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={e => e.stopPropagation()}
            className="gc-modal w-full flex flex-col"
            style={{ maxWidth: '768px', maxHeight: '85vh', padding: 0 }}
          >
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Importar Demandas</h2>
                  <p className="text-[11px] text-slate-500">Cole o texto formatado e revise antes de importar</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {step === 'input' && (
                <div className="space-y-4">
                  <textarea
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    placeholder={`Cole aqui o texto no formato:\n\nNOME DO CLIENTE\n\nDemanda: Título da tarefa\nResponsáveis: Allyson, Maria\nTipo: Escopo\nPrioridade: Alta\nInício: 2026-05-25\nEntrega: 2026-05-30\nStatus: Em progresso\nSubtarefas:\n- Primeira subtarefa\n  Entrega: 2026-05-27\n  Status: Em progresso\n- Segunda subtarefa\n  Responsáveis: Maria\n\nDicas:\n• Datas aceitam YYYY-MM-DD ou DD/MM/YYYY.\n• Status: Em progresso | Impedimento | Concluída.\n• Campos de subtarefa precisam estar indentados (2 espaços ou tab).`}
                    className="gc-input min-h-[280px] font-mono leading-relaxed text-[12px]"
                  />

                  {rawText.trim() && (
                    <div className="gc-panel flex items-center justify-between p-3">
                      <div className="text-[11px] text-slate-400">
                        <span className="text-white font-bold">{parseResult.sections.filter(s => s.clientId).length}</span> clientes ·{' '}
                        <span className="text-white font-bold">{totalTasks}</span> demandas ·{' '}
                        <span className="text-white font-bold">{totalSubtasks}</span> subtarefas
                      </div>
                      <button
                        onClick={() => setStep('preview')}
                        disabled={totalTasks === 0}
                        className="gc-button text-xs"
                      >
                        Ver Preview
                      </button>
                    </div>
                  )}

                  {parseResult.errors.length > 0 && (
                    <div className="space-y-1 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <div className="flex items-center gap-2 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
                        <AlertCircle className="w-3 h-3" /> Avisos
                      </div>
                      {parseResult.errors.map((err, i) => (
                        <p key={i} className="text-[11px] text-amber-300/80">· {err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 'preview' && (
                <div className="space-y-5">
                  {parseResult.sections.map((section, si) => {
                    const client = section.clientId ? clients.find(c => c.id === section.clientId) : null;
                    return (
                      <div key={si} className={`rounded-xl border ${client ? 'border-white/5 bg-white/[0.02]' : 'border-rose-500/30 bg-rose-500/5'} overflow-hidden`}>
                        <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {client && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: client.color }} />}
                            <h3 className={`text-sm font-bold ${client ? 'text-white' : 'text-rose-400'}`}>
                              {client ? client.name : `${section.clientName} (não encontrado)`}
                            </h3>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{section.tasks.length} demandas</span>
                        </div>
                        <div className="divide-y divide-white/5">
                          {section.tasks.map((task, ti) => {
                            const fmtBR = (iso?: string) => {
                              if (!iso) return '';
                              const [y, m, d] = iso.split('-');
                              return `${d}/${m}`;
                            };
                            const statusLabel = (s?: TaskStatus) =>
                              s === 'in_progress' ? 'Em progresso' :
                              s === 'blocked' ? 'Impedimento' :
                              s === 'done' ? 'Concluída' : '';
                            const statusClass = (s?: TaskStatus) =>
                              s === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                              s === 'blocked' ? 'bg-amber-500/20 text-amber-400' :
                              s === 'done' ? 'bg-emerald-500/20 text-emerald-400' : '';
                            const dateBadge = (start?: string, due?: string) => {
                              if (!start && !due) return null;
                              return (
                                <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-white/5 text-slate-300" title={`${start || '—'} → ${due || '—'}`}>
                                  📅 {fmtBR(start)}{start && due ? ' → ' : (due ? '→ ' : '')}{fmtBR(due)}
                                </span>
                              );
                            };
                            return (
                              <div key={ti} className="px-4 py-3 space-y-2">
                                <p className="text-[13px] font-medium text-slate-100">{task.title}</p>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                                    task.priority === 'high' ? 'bg-rose-500/20 text-rose-400' :
                                    task.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-emerald-500/20 text-emerald-400'
                                  }`}>
                                    {task.priority === 'high' ? 'Urgente' : task.priority === 'medium' ? 'Normal' : 'Baixa'}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                                    task.taskType === 'overdelivery' ? 'bg-purple-500/20 text-purple-400' : 'bg-indigo-500/20 text-indigo-400'
                                  }`}>
                                    {task.taskType === 'overdelivery' ? 'Overdelivery' : 'Escopo'}
                                  </span>
                                  {task.status && (
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${statusClass(task.status)}`}>
                                      {statusLabel(task.status)}
                                    </span>
                                  )}
                                  {dateBadge(task.startDate, task.dueDate)}
                                  {task.responsibles.map((r, i) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-white/5 text-slate-300">
                                      {r.split(' ')[0]}
                                    </span>
                                  ))}
                                  {task.unmatchedResponsibles.map((r, i) => (
                                    <span key={`u${i}`} className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-rose-500/10 text-rose-400" title="Membro não encontrado">
                                      ⚠ {r}
                                    </span>
                                  ))}
                                </div>
                                {task.subTasks.length > 0 && (
                                  <ul className="space-y-1 pt-1">
                                    {task.subTasks.map((st, si2) => (
                                      <li key={si2} className="text-[11px] text-slate-400 pl-3 relative before:content-['·'] before:absolute before:left-0 before:text-slate-600">
                                        <span>{st.title}</span>
                                        {(st.status || st.startDate || st.dueDate || st.responsibles.length > 0) && (
                                          <span className="ml-2 inline-flex flex-wrap items-center gap-1 align-middle">
                                            {st.status && (
                                              <span className={`px-1 py-px rounded text-[9px] uppercase font-bold ${statusClass(st.status)}`}>
                                                {statusLabel(st.status)}
                                              </span>
                                            )}
                                            {(st.startDate || st.dueDate) && (
                                              <span className="text-[9.5px] text-slate-500 font-mono">
                                                {fmtBR(st.startDate)}{st.startDate && st.dueDate ? '→' : (st.dueDate ? '→' : '')}{fmtBR(st.dueDate)}
                                              </span>
                                            )}
                                            {st.responsibles.map((r, i) => (
                                              <span key={i} className="text-[9.5px] text-slate-500">
                                                @{r.split(' ')[0]}
                                              </span>
                                            ))}
                                          </span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {step === 'done' && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-bold text-white">Importação concluída</h3>
                    <p className="text-sm text-slate-400">{importedCount} demandas adicionadas aos backlogs.</p>
                  </div>
                </div>
              )}
            </div>

            {step === 'preview' && (
              <div className="flex items-center justify-between p-4 border-t border-white/5">
                <button
                  onClick={() => setStep('input')}
                  className="gc-button gc-button--ghost text-xs"
                >
                  Voltar
                </button>
                <button
                  onClick={handleImport}
                  disabled={totalTasks === 0}
                  className="gc-button text-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importar {totalTasks} demandas
                </button>
              </div>
            )}

            {step === 'done' && (
              <div className="flex justify-end p-4 border-t border-white/5">
                <button
                  onClick={handleClose}
                  className="gc-button gc-button--ghost text-xs"
                >
                  Fechar
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
