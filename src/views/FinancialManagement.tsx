import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Plus,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  CheckCircle2,
  Circle,
  PieChart,
  Edit2,
  Trash2,
  Briefcase,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { FinancialTransaction, Client, TransactionType, TransactionCategory } from '../types';

interface FinancialManagementProps {
  transactions: FinancialTransaction[];
  clients: Client[];
  onAddTransaction: (t: Omit<FinancialTransaction, 'id'>) => void;
  onUpdateTransaction: (t: FinancialTransaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export default function FinancialManagement({
  transactions,
  clients,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction
}: FinancialManagementProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'spreadsheet'>('dashboard');
  const [filterMode, setFilterMode] = useState<'month' | 'range'>('month');
  const [filterMonth, setFilterMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const filterTransactions = (txs: FinancialTransaction[]) => {
    if (filterMode === 'month') {
      return txs.filter(t => t.date.startsWith(filterMonth));
    }
    return txs.filter(t => {
      if (filterStartDate && t.date < filterStartDate) return false;
      if (filterEndDate && t.date > filterEndDate) return false;
      return true;
    });
  };

  // Stats calculation — only paid transactions count
  const stats = useMemo(() => {
    const currentMonthTxs = filterTransactions(transactions).filter(t => t.status === 'paid');
    
    let entradasFixo = 0;
    let entradasRecorrente = 0;
    let despesasInfra = 0;
    let despesasTools = 0;
    let invAds = 0;
    let invConsulting = 0;
    let retiradasKallyl = 0;
    let retiradasAllyson = 0;
    let totalEntradas = 0;

    currentMonthTxs.forEach(t => {
      if (t.type === 'income') {
        totalEntradas += t.amount;
        if (t.category === 'income_fixed') entradasFixo += t.amount;
        if (t.category === 'income_recurring') entradasRecorrente += t.amount;
      }
      if (t.type === 'cost') {
        if (t.category === 'cost_infra') despesasInfra += t.amount;
        if (t.category === 'cost_tools') despesasTools += t.amount;
      }
      if (t.type === 'investment') {
        if (t.category === 'investment_ads') invAds += t.amount;
        if (t.category === 'investment_consulting') invConsulting += t.amount;
      }
      if (t.type === 'withdrawal') {
        if (t.category === 'withdrawal_kallyl') retiradasKallyl += t.amount;
        if (t.category === 'withdrawal_allyson') retiradasAllyson += t.amount;
      }
    });

    const despesasTotal = despesasInfra + despesasTools;
    const invTotal = invAds + invConsulting;
    const retiradasTotal = retiradasKallyl + retiradasAllyson;
    
    const saldoLivre = totalEntradas - despesasTotal - invTotal - retiradasTotal;

    return {
      entradasFixo,
      entradasRecorrente,
      totalEntradas,
      despesasTotal,
      invTotal,
      retiradasKallyl,
      retiradasAllyson,
      retiradasTotal,
      saldoLivre
    };
  }, [transactions, filterMonth, filterMode, filterStartDate, filterEndDate]);

  // Chart Data (Last 6 Months) — only paid transactions
  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7);
      const monthLabel = d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();

      const monthTxs = transactions.filter(t => t.date.startsWith(monthStr) && t.status === 'paid');
      let entradas = 0;
      let saidas = 0;

      monthTxs.forEach(t => {
        if (t.type === 'income') entradas += t.amount;
        else saidas += t.amount;
      });

      data.push({
        name: monthLabel,
        Entradas: entradas,
        Saídas: saidas
      });
    }
    return data;
  }, [transactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const categoryLabels: Record<TransactionCategory, string> = {
    income_fixed: 'Escopo Fixo',
    income_recurring: 'Recorrente',
    cost_infra: 'Infraestrutura',
    cost_tools: 'Ferramentas/SaaS',
    investment_ads: 'Tráfego (Ads)',
    investment_consulting: 'Consultoria',
    withdrawal_kallyl: 'Retirada (Kallyl)',
    withdrawal_allyson: 'Retirada (Allyson)',
    other: 'Outros'
  };

  const typeStyles: Record<TransactionType, { bg: string, text: string, icon: any }> = {
    income: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: ArrowUpRight },
    cost: { bg: 'bg-rose-500/10', text: 'text-rose-400', icon: ArrowDownRight },
    investment: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: TrendingUp },
    withdrawal: { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: Wallet }
  };

  const handleToggleStatus = (t: FinancialTransaction) => {
    onUpdateTransaction({ ...t, status: t.status === 'pending' ? 'paid' : 'pending' });
  };

  const pendingInRange = useMemo(
    () => filterTransactions(transactions).filter(t => t.status === 'pending'),
    [transactions, filterMode, filterMonth, filterStartDate, filterEndDate]
  );

  const handleMarkAllPending = () => {
    if (pendingInRange.length === 0) return;
    const label = filterMode === 'month'
      ? `do mês ${filterMonth}`
      : `do período selecionado`;
    if (!confirm(`Marcar ${pendingInRange.length} movimentação(ões) pendente(s) ${label} como pagas?`)) return;
    pendingInRange.forEach(t => onUpdateTransaction({ ...t, status: 'paid' }));
  };

  const byClient = useMemo(() => {
    const paid = filterTransactions(transactions).filter(t => t.status === 'paid' && t.clientId);
    const map = new Map<string, { receita: number; custo: number; investimento: number }>();
    paid.forEach(t => {
      const curr = map.get(t.clientId!) || { receita: 0, custo: 0, investimento: 0 };
      if (t.type === 'income') curr.receita += t.amount;
      else if (t.type === 'cost') curr.custo += t.amount;
      else if (t.type === 'investment') curr.investimento += t.amount;
      map.set(t.clientId!, curr);
    });
    return clients
      .map(c => {
        const v = map.get(c.id) || { receita: 0, custo: 0, investimento: 0 };
        const saldo = v.receita - v.custo - v.investimento;
        return { client: c, ...v, saldo };
      })
      .filter(r => r.receita > 0 || r.custo > 0 || r.investimento > 0)
      .sort((a, b) => b.saldo - a.saldo);
  }, [transactions, clients, filterMode, filterMonth, filterStartDate, filterEndDate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <header className="gc-hero">
        <div className="gc-hero__title-row">
          <div>
            <h1 className="gc-heading">Suas Finanças</h1>
            <p className="gc-subheading mt-1">Onde está o dinheiro entrando e saindo.</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="gc-button text-sm"
            >
              <Plus className="w-4 h-4" />
              Nova Movimentação
            </button>
          </div>
        </div>

        {viewMode === 'dashboard' && (
          <div className="gc-hero__stats">
            <div className="gc-hero-chip gc-hero-chip--success">
              <span className="gc-hero-chip__icon"><TrendingUp className="w-3.5 h-3.5" /></span>
              <span><strong>{formatCurrency(stats.totalEntradas)}</strong> entradas</span>
            </div>
            <div className={`gc-hero-chip ${stats.saldoLivre >= 0 ? 'gc-hero-chip--accent' : 'gc-hero-chip--danger'}`}>
              <span className="gc-hero-chip__icon"><DollarSign className="w-3.5 h-3.5" /></span>
              <span><strong>{formatCurrency(stats.saldoLivre)}</strong> saldo livre</span>
            </div>
            {pendingInRange.length > 0 && (
              <div className="gc-hero-chip gc-hero-chip--warning">
                <span className="gc-hero-chip__icon"><Clock className="w-3.5 h-3.5" /></span>
                <span><strong>{pendingInRange.length}</strong> pendentes</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="gc-segmented hidden md:inline-flex">
            <button
              onClick={() => setViewMode('dashboard')}
              data-active={viewMode === 'dashboard'}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setViewMode('spreadsheet')}
              data-active={viewMode === 'spreadsheet'}
            >
              Planilha Macro
            </button>
          </div>

          {viewMode === 'dashboard' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="gc-segmented">
                <button
                  onClick={() => setFilterMode('month')}
                  data-active={filterMode === 'month'}
                >
                  Mês
                </button>
                <button
                  onClick={() => setFilterMode('range')}
                  data-active={filterMode === 'range'}
                >
                  Período
                </button>
              </div>
              {filterMode === 'month' ? (
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="gc-input w-auto [color-scheme:dark]"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="gc-input w-auto [color-scheme:dark]"
                  />
                  <span className="text-slate-500 text-sm">até</span>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="gc-input w-auto [color-scheme:dark]"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {viewMode === 'dashboard' ? (
        <>
      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="gc-stat">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="gc-stat__label">Entradas</p>
              <h3 className="gc-stat__value">{formatCurrency(stats.totalEntradas)}</h3>
            </div>
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-4 border-t border-white/5 pt-3">
            <span>Fixo: <strong className="text-white">{formatCurrency(stats.entradasFixo)}</strong></span>
            <span>Recorrente: <strong className="text-white">{formatCurrency(stats.entradasRecorrente)}</strong></span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="gc-stat">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="gc-stat__label">Custo de Operação</p>
              <h3 className="gc-stat__value">{formatCurrency(stats.despesasTotal)}</h3>
            </div>
            <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4 border-t border-white/5 pt-3">
            Infraestrutura, Ferramentas e SaaS
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="gc-stat">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="gc-stat__label">Investimentos</p>
              <h3 className="gc-stat__value">{formatCurrency(stats.invTotal)}</h3>
            </div>
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <PieChart className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4 border-t border-white/5 pt-3">
            Tráfego Pago e Consultorias
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="gc-stat gc-stat--accent">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="gc-stat__label" style={{ color: '#c7d2fe' }}>Saldo Livre p/ Caixa</p>
              <h3 className="gc-stat__value">{formatCurrency(stats.saldoLivre)}</h3>
            </div>
            <div className="p-2 bg-white/10 rounded-lg text-white">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-indigo-200/70 mt-4 border-t border-white/10 pt-3">
            Resultado após despesas, inv. e retiradas
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHARTS & RETIRADAS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="gc-card">
            <h3 className="text-lg font-bold text-white mb-6">Fluxo de Caixa (6 Meses)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                  <RechartsTooltip 
                    cursor={{fill: '#ffffff05'}}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                  <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Saídas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="gc-card">
            <h3 className="text-lg font-bold text-white mb-4">Quadro de Retiradas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="gc-panel p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                    K
                  </div>
                  <span className="font-medium text-white">Kallyl</span>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-slate-400">Total Distribuído</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(stats.retiradasKallyl)}</p>
                </div>
              </div>
              <div className="gc-panel p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    A
                  </div>
                  <span className="font-medium text-white">Allyson</span>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-slate-400">Total Distribuído</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(stats.retiradasAllyson)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="gc-card">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-indigo-300" />
              <h3 className="text-lg font-bold text-white">Saúde por Cliente</h3>
              <span className="text-xs text-slate-500 ml-auto">apenas pagos · período do filtro</span>
            </div>
            {byClient.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                Nenhuma movimentação vinculada a cliente neste período. Vincule receitas/custos a um cliente ao criar a transação.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="gc-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th style={{ textAlign: 'right' }}>Receita</th>
                      <th style={{ textAlign: 'right' }}>Custo</th>
                      <th style={{ textAlign: 'right' }}>Inv.</th>
                      <th style={{ textAlign: 'right' }}>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byClient.map(row => (
                      <tr key={row.client.id}>
                        <td>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: row.client.color }} />
                            <span className="text-slate-200 font-medium">{row.client.name}</span>
                          </span>
                        </td>
                        <td className="text-right font-mono text-emerald-300">
                          {row.receita > 0 ? formatCurrency(row.receita) : '—'}
                        </td>
                        <td className="text-right font-mono text-rose-300">
                          {row.custo > 0 ? formatCurrency(row.custo) : '—'}
                        </td>
                        <td className="text-right font-mono text-blue-300">
                          {row.investimento > 0 ? formatCurrency(row.investimento) : '—'}
                        </td>
                        <td className={`text-right font-mono font-bold ${row.saldo >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(row.saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* TRANSACTIONS LIST */}
        <div className="gc-panel flex flex-col h-[800px]">
          <div className="p-5 border-b border-white/10 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">Últimas Movimentações</h3>
              <p className="text-sm text-slate-400">
                {filterMode === 'month'
                  ? `Lançamentos de ${filterMonth}`
                  : filterStartDate || filterEndDate
                    ? `${filterStartDate ? filterStartDate.split('-').reverse().join('/') : '...'} até ${filterEndDate ? filterEndDate.split('-').reverse().join('/') : '...'}`
                    : 'Todos os lançamentos'}
              </p>
            </div>
            {pendingInRange.length > 0 && (
              <button
                onClick={handleMarkAllPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 transition-all whitespace-nowrap"
                title="Marcar todas as pendentes do filtro atual como pagas"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Pagar {pendingInRange.length}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {filterTransactions(transactions).map((t) => {
              const style = typeStyles[t.type];
              const TypeIcon = style.icon;
              const isPending = t.status === 'pending';

              return (
                <div key={t.id} className={`gc-mission flex-col items-stretch !p-4 group ${isPending ? 'opacity-70' : ''}`} style={{ cursor: 'default' }}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleStatus(t)}
                        className={`mt-0.5 transition-colors ${t.status === 'paid' ? 'text-emerald-400' : 'text-yellow-500 hover:text-yellow-400'}`}
                      >
                        {t.status === 'paid' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </button>
                      <div>
                        <p className={`text-sm font-medium line-clamp-1 ${isPending ? 'text-slate-400' : 'text-white'}`}>{t.description}</p>
                        <p className="text-xs text-slate-500 mt-1">{t.date.split('-').reverse().join('/')}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingTransaction(t)}
                          className="p-1 text-slate-500 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if(window.confirm('Excluir esta movimentação?')) onDeleteTransaction(t.id);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className={`text-sm font-bold ${isPending ? 'text-slate-500 line-through' : style.text}`}>
                        {t.type !== 'income' && '-'}{formatCurrency(t.amount)}
                      </p>
                      {isPending && <span className="text-[10px] text-yellow-500/80 font-medium">pendente</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-8">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${style.bg} ${style.text}`}>
                      <TypeIcon className="w-3 h-3" />
                      {categoryLabels[t.category] || 'Outros'}
                    </span>
                    {t.clientId && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                        {clients.find(c => c.id === t.clientId)?.name || 'Cliente Removido'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {filterTransactions(transactions).length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">
                Nenhuma movimentação neste período.
              </div>
            )}
          </div>
        </div>

      </div>
      </>
      ) : (
        <div className="gc-panel flex flex-col h-[calc(100vh-160px)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs text-slate-400 bg-[#0f172a] uppercase sticky top-0 z-10 border-b border-white/10 shadow-md">
                <tr>
                  <th className="px-4 py-4 font-medium w-16 text-center">Status</th>
                  <th className="px-4 py-4 font-medium w-32">Data</th>
                  <th className="px-4 py-4 font-medium">Descrição</th>
                  <th className="px-4 py-4 font-medium w-48">Categoria</th>
                  <th className="px-4 py-4 font-medium w-48">Cliente</th>
                  <th className="px-4 py-4 font-medium text-right w-40">Valor</th>
                  <th className="px-4 py-4 font-medium text-right w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => {
                  const style = typeStyles[t.type];
                  const isPending = t.status === 'pending';
                  return (
                    <tr key={t.id} className={`transition-colors group ${isPending ? 'opacity-50' : 'hover:bg-white/5'}`}>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleToggleStatus(t)} className={`mt-1 ${t.status === 'paid' ? 'text-emerald-400' : 'text-yellow-500 hover:text-yellow-400'}`}>
                          {t.status === 'paid' ? <CheckCircle2 className="w-5 h-5 mx-auto" /> : <Circle className="w-5 h-5 mx-auto" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{t.date.split('-').reverse().join('/')}</td>
                      <td className="px-4 py-3 font-medium text-white">
                        {t.description}
                        {isPending && <span className="ml-2 text-[10px] text-yellow-500/80 font-normal">pendente</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-medium inline-flex items-center gap-1 ${style.bg} ${style.text}`}>
                          {categoryLabels[t.category] || 'Outros'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {t.clientId ? (clients.find(c => c.id === t.clientId)?.name || 'Removido') : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${isPending ? 'text-slate-500 line-through' : style.text}`}>
                        {t.type !== 'income' && '-'}{formatCurrency(t.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingTransaction(t)} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => { if(window.confirm('Excluir esta movimentação?')) onDeleteTransaction(t.id); }} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <div className="text-center py-20 text-slate-500 text-sm">
                Nenhuma movimentação cadastrada em todo o histórico.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      <AnimatePresence>
        {(isAddModalOpen || editingTransaction) && (
          <TransactionModal 
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingTransaction(null);
            }}
            onSave={(t) => {
              if (editingTransaction) {
                onUpdateTransaction({ ...t, id: editingTransaction.id } as FinancialTransaction);
              } else {
                onAddTransaction(t);
              }
              setIsAddModalOpen(false);
              setEditingTransaction(null);
            }}
            clients={clients}
            initialData={editingTransaction}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

// Transaction Modal Component
function TransactionModal({ 
  onClose, 
  onSave, 
  clients,
  initialData
}: { 
  onClose: () => void, 
  onSave: (t: Omit<FinancialTransaction, 'id'>) => void,
  clients: Client[],
  initialData?: FinancialTransaction | null
}) {
  const [type, setType] = useState<TransactionType>(initialData?.type || 'income');
  const [category, setCategory] = useState<TransactionCategory>(initialData?.category || 'income_fixed');
  const [description, setDescription] = useState(initialData?.description || '');
  const [amount, setAmount] = useState(initialData ? initialData.amount.toString() : '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'pending' | 'paid'>(initialData?.status || 'paid');
  const [clientId, setClientId] = useState(initialData?.clientId || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date) return;
    
    onSave({
      type,
      category,
      description,
      amount: parseFloat(amount),
      date,
      status,
      clientId: clientId || undefined,
      createdAt: Date.now()
    });
  };

  // Category Options based on Type
  const categoryOptions: Record<TransactionType, { value: TransactionCategory, label: string }[]> = {
    income: [
      { value: 'income_fixed', label: 'Escopo Fixo' },
      { value: 'income_recurring', label: 'Recorrente' }
    ],
    cost: [
      { value: 'cost_infra', label: 'Infraestrutura' },
      { value: 'cost_tools', label: 'Ferramentas/SaaS' }
    ],
    investment: [
      { value: 'investment_ads', label: 'Tráfego (Ads)' },
      { value: 'investment_consulting', label: 'Consultoria' }
    ],
    withdrawal: [
      { value: 'withdrawal_kallyl', label: 'Retirada Kallyl' },
      { value: 'withdrawal_allyson', label: 'Retirada Allyson' }
    ]
  };

  return (
    <div className="gc-modal-backdrop">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="gc-modal relative z-10"
      >
        <h2 className="gc-modal__title">{initialData ? 'Editar Movimentação' : 'Nova Movimentação'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => { setType('income'); setCategory('income_fixed'); }}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
            >
              Receita
            </button>
            <button
              type="button"
              onClick={() => { setType('cost'); setCategory('cost_tools'); }}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${type === 'cost' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400 hover:text-white'}`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => { setType('investment'); setCategory('investment_ads'); }}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${type === 'investment' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'}`}
            >
              Investimento
            </button>
            <button
              type="button"
              onClick={() => { setType('withdrawal'); setCategory('withdrawal_kallyl'); setClientId(''); }}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${type === 'withdrawal' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-white'}`}
            >
              Retirada
            </button>
          </div>

          <div>
            <label className="gc-label">Categoria</label>
            <select
              value={category} onChange={(e) => setCategory(e.target.value as TransactionCategory)}
              className="gc-input"
            >
              {categoryOptions[type].map(opt => (
                <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>
              ))}
              <option value="other" className="bg-slate-800">Outros</option>
            </select>
          </div>

          {type !== 'withdrawal' && (
            <div>
              <label className="gc-label">Vincular a Cliente (Opcional)</label>
              <select
                value={clientId} onChange={(e) => setClientId(e.target.value)}
                className="gc-input"
              >
                <option value="" className="bg-slate-800">Nenhum</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-800">{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="gc-label">Descrição</label>
            <input
              type="text" required value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Mensalidade Cliente X"
              className="gc-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="gc-label">Valor (R$)</label>
              <input
                type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="gc-input"
              />
            </div>
            <div>
              <label className="gc-label">Data</label>
              <input
                type="date" required value={date} onChange={e => setDate(e.target.value)}
                className="gc-input [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input 
                type="radio" name="status" value="paid" 
                checked={status === 'paid'} onChange={() => setStatus('paid')}
                className="text-emerald-500 focus:ring-emerald-500"
              />
              Já Pago / Recebido
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input 
                type="radio" name="status" value="pending" 
                checked={status === 'pending'} onChange={() => setStatus('pending')}
                className="text-yellow-500 focus:ring-yellow-500"
              />
              Pendente
            </label>
          </div>

          <div className="flex gap-3 pt-6">
            <button type="button" onClick={onClose} className="gc-button gc-button--ghost flex-1">
              Cancelar
            </button>
            <button type="submit" className="gc-button flex-1">
              Salvar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
