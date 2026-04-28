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
  PieChart
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
  const [filterMonth, setFilterMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );

  // Stats calculation for the selected month
  const stats = useMemo(() => {
    const currentMonthTxs = transactions.filter(t => t.date.startsWith(filterMonth));
    
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
      // Only count paid or we can count all but specify? Let's count all to project
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
  }, [transactions, filterMonth]);

  // Chart Data (Last 6 Months)
  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7);
      const monthLabel = d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
      
      const monthTxs = transactions.filter(t => t.date.startsWith(monthStr));
      let entradas = 0;
      let saidas = 0;
      
      monthTxs.forEach(t => {
        if (t.type === 'income') entradas += t.amount;
        else saidas += t.amount; // costs, investments, withdrawals
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Gestão Financeira</h1>
          <p className="text-slate-400 text-sm mt-1">Acompanhamento de fluxo de caixa, custos operacionais e retiradas.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="month" 
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            Nova Movimentação
          </button>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-sm font-medium">Entradas</p>
              <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(stats.totalEntradas)}</h3>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-sm font-medium">Custo de Operação</p>
              <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(stats.despesasTotal)}</h3>
            </div>
            <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4 border-t border-white/5 pt-3">
            Infraestrutura, Ferramentas e SaaS
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-sm font-medium">Investimentos</p>
              <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(stats.invTotal)}</h3>
            </div>
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <PieChart className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4 border-t border-white/5 pt-3">
            Tráfego Pago e Consultorias
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-indigo-200 text-sm font-medium">Saldo Livre p/ Caixa</p>
              <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(stats.saldoLivre)}</h3>
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
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
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

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-4">Quadro de Retiradas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
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
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
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
        </div>

        {/* TRANSACTIONS LIST */}
        <div className="bg-white/5 border border-white/10 rounded-2xl flex flex-col backdrop-blur-sm h-[800px]">
          <div className="p-5 border-b border-white/10">
            <h3 className="text-lg font-bold text-white">Últimas Movimentações</h3>
            <p className="text-sm text-slate-400">Lançamentos de {filterMonth}</p>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {transactions.filter(t => t.date.startsWith(filterMonth)).map((t) => {
              const style = typeStyles[t.type];
              const TypeIcon = style.icon;
              
              return (
                <div key={t.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col gap-3 group hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-3">
                      <button 
                        onClick={() => handleToggleStatus(t)}
                        className={`mt-0.5 transition-colors ${t.status === 'paid' ? 'text-emerald-400' : 'text-slate-500 hover:text-white'}`}
                      >
                        {t.status === 'paid' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </button>
                      <div>
                        <p className="text-sm font-medium text-white line-clamp-1">{t.description}</p>
                        <p className="text-xs text-slate-400 mt-1">{t.date.split('-').reverse().join('/')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${style.text}`}>
                        {t.type !== 'income' && '-'}{formatCurrency(t.amount)}
                      </p>
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
            
            {transactions.filter(t => t.date.startsWith(filterMonth)).length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">
                Nenhuma movimentação neste mês.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ADD MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <TransactionModal 
            onClose={() => setIsAddModalOpen(false)}
            onSave={(t) => {
              onAddTransaction(t);
              setIsAddModalOpen(false);
            }}
            clients={clients}
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
  clients 
}: { 
  onClose: () => void, 
  onSave: (t: Omit<FinancialTransaction, 'id'>) => void,
  clients: Client[]
}) {
  const [type, setType] = useState<TransactionType>('income');
  const [category, setCategory] = useState<TransactionCategory>('income_fixed');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'pending' | 'paid'>('paid');
  const [clientId, setClientId] = useState('');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0f172a] border border-white/10 p-6 rounded-2xl w-full max-w-md relative z-10 shadow-2xl"
      >
        <h2 className="text-xl font-bold text-white mb-6">Nova Movimentação</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl">
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
              onClick={() => { setType('withdrawal'); setCategory('withdrawal_kallyl'); }}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${type === 'withdrawal' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-white'}`}
            >
              Retirada
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Categoria</label>
            <select 
              value={category} onChange={(e) => setCategory(e.target.value as TransactionCategory)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {categoryOptions[type].map(opt => (
                <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>
              ))}
              <option value="other" className="bg-slate-800">Outros</option>
            </select>
          </div>

          {type === 'income' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Vincular a Cliente (Opcional)</label>
              <select 
                value={clientId} onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="" className="bg-slate-800">Nenhum</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-800">{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Descrição</label>
            <input 
              type="text" required value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Mensalidade Cliente X"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Valor (R$)</label>
              <input 
                type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Data</label>
              <input 
                type="date" required value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
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
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium transition-colors">
              Salvar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
