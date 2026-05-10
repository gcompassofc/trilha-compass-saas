import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { Client, MasterTask, Priority, SubTask, TaskType, TeamMember } from '../types';

interface TaskImporterProps {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  teamMembers: TeamMember[];
  onUpdateClient: (client: Client) => void;
}

interface ParsedTask {
  title: string;
  responsibles: string[];
  responsibleIds: string[];
  unmatchedResponsibles: string[];
  taskType: TaskType;
  priority: Priority;
  subTasks: string[];
  rawPriority: string;
  rawType: string;
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
  let inSubtasks = false;

  const flushTask = () => {
    if (!currentTask || !currentSection) return;
    if (currentTask.title) currentSection.tasks.push(currentTask);
    currentTask = null;
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
  // and it's NOT one of the labeled fields (Demanda/Responsáveis/Tipo/Prioridade/Subtarefas).
  const isFieldLine = (s: string) =>
    /^\*?\*?(Demanda|Respons[áa]veis?|Tipo|Prioridade|Subtarefas)\s*:/i.test(s);

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

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^---+$/.test(line)) continue;

    // Client header check first (so "**SALTUR**" doesn't get eaten as a subtask bullet)
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
    const respMatch = line.match(/^Respons[áa]veis?\s*:\s*(.+)$/i);
    const tipoMatch = line.match(/^Tipo\s*:\s*(.+)$/i);
    const prioMatch = line.match(/^Prioridade\s*:\s*(.+)$/i);
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
      continue;
    }

    if (currentTask && respMatch) {
      const names = respMatch[1].split(/[,;]| e /i).map(n => stripBoldMarkers(n).trim()).filter(Boolean);
      for (const name of names) {
        const member = findMember(name, teamMembers);
        if (member) {
          currentTask.responsibles.push(member.name);
          currentTask.responsibleIds.push(member.id);
        } else {
          currentTask.unmatchedResponsibles.push(name);
        }
      }
      continue;
    }

    if (currentTask && tipoMatch) {
      const raw = stripBoldMarkers(tipoMatch[1]).trim();
      currentTask.rawType = raw;
      const mapped = TYPE_MAP[normalizeName(raw)];
      if (mapped) currentTask.taskType = mapped;
      continue;
    }

    if (currentTask && prioMatch) {
      const raw = stripBoldMarkers(prioMatch[1]).trim();
      currentTask.rawPriority = raw;
      const mapped = PRIORITY_MAP[normalizeName(raw)];
      if (mapped) currentTask.priority = mapped;
      continue;
    }

    if (currentTask && subHeaderMatch) {
      inSubtasks = true;
      continue;
    }

    if (currentTask && inSubtasks && subBulletMatch) {
      const sub = stripBoldMarkers(subBulletMatch[1]).trim();
      if (sub) currentTask.subTasks.push(sub);
      continue;
    }
  }

  flushSection();

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
        const subTasks: SubTask[] = task.subTasks.map(t => ({
          id: generateId(),
          title: t,
          completed: false,
        }));
        const masterTask: MasterTask = {
          id: generateId(),
          title: task.title,
          completed: false,
          priority: task.priority,
          taskType: task.taskType,
          responsibles: task.responsibleIds,
          responsible: task.responsibleIds[0],
          subTasks,
        };
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
            className="glass-panel w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-white/10"
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
                    placeholder={`Cole aqui o texto no formato:\n\nNOME DO CLIENTE\n\nDemanda: Título da tarefa\nResponsáveis: Allyson\nTipo: Escopo\nPrioridade: Alta\nSubtarefas:\n- Primeira subtarefa\n- Segunda subtarefa`}
                    className="w-full min-h-[280px] bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-[12px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 font-mono leading-relaxed"
                  />

                  {rawText.trim() && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
                      <div className="text-[11px] text-slate-400">
                        <span className="text-white font-bold">{parseResult.sections.filter(s => s.clientId).length}</span> clientes ·{' '}
                        <span className="text-white font-bold">{totalTasks}</span> demandas ·{' '}
                        <span className="text-white font-bold">{totalSubtasks}</span> subtarefas
                      </div>
                      <button
                        onClick={() => setStep('preview')}
                        disabled={totalTasks === 0}
                        className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors"
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
                          {section.tasks.map((task, ti) => (
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
                                <ul className="space-y-0.5 pt-1">
                                  {task.subTasks.map((st, si2) => (
                                    <li key={si2} className="text-[11px] text-slate-400 pl-3 relative before:content-['·'] before:absolute before:left-0 before:text-slate-600">
                                      {st}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
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
                  className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-white"
                >
                  Voltar
                </button>
                <button
                  onClick={handleImport}
                  disabled={totalTasks === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors"
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
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors"
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
