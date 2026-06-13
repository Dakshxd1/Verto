import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import supabase from '../lib/supabaseClient';
import * as XLSX from 'xlsx';
import {
  Search, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, FileText, Users, AlertTriangle, RefreshCw,
  X, Filter, Building2, Loader2, Calendar, ReceiptText, BadgeDollarSign,
  Landmark, CircleDollarSign, ShieldAlert, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (val) => {
  const n = Number(val) || 0;
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000)   return `₹${(n / 100000).toFixed(2)}L`;
  if (Math.abs(n) >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const fmtFull = (val) => {
  const n = Number(val) || 0;
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const profitCls = (v) => {
  const n = Number(v) || 0;
  if (n > 0) return 'text-emerald-600 font-bold';
  if (n < 0) return 'text-rose-600 font-bold';
  return 'text-gray-400';
};

const profitBadgeCls = (v) => {
  const n = Number(v) || 0;
  if (n > 0) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (n < 0) return 'bg-rose-50 text-rose-700 border border-rose-200';
  return 'bg-gray-50 text-gray-500 border border-gray-200';
};

const getCurrentFY = () => {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
};
const fyStart = (fy) => `${fy}-04-01`;
const fyEnd   = (fy) => `${fy + 1}-03-31`;
const fyLabel = (fy) => `FY ${String(fy).slice(2)}-${String(fy + 1).slice(2)}`;

const STATUTORY_COLORS = {
  GST: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  TDS: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
  EPF: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  ESI: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  LWF: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
  PF:  { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  'Income Tax': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  Others: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' },
};
const getStatColor = (t) => STATUTORY_COLORS[t] || STATUTORY_COLORS.Others;

const DEPT_COLORS = {
  Operations:  { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  Temporary:   { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  Recruitment: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  Projects:    { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};
const getDeptColor = (d) => DEPT_COLORS[d] || { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' };

const ITEMS = 10;

// ─── SORT ICON ─────────────────────────────────────────────────────────────────
const SortIcon = ({ col, cfg }) =>
  cfg.key !== col
    ? <ChevronDown className="w-3 h-3 opacity-25 ml-0.5 inline" />
    : cfg.dir === 'asc'
      ? <ChevronUp className="w-3 h-3 ml-0.5 inline text-blue-500" />
      : <ChevronDown className="w-3 h-3 ml-0.5 inline text-blue-500" />;

// ─── KPI CARD ──────────────────────────────────────────────────────────────────
const KPI = ({ label, value, sub, color = 'blue', Icon, delay = 0 }) => {
  const map = {
    blue:    'bg-blue-50 border-blue-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    amber:   'bg-amber-50 border-amber-200',
    rose:    'bg-rose-50 border-rose-200',
    violet:  'bg-violet-50 border-violet-200',
    slate:   'bg-slate-50 border-slate-200',
  };
  const cls = map[color] || map.blue;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={`${cls} border rounded-2xl px-4 py-4 flex items-start gap-3 min-h-24`}>
      {Icon && <Icon className="w-5 h-5 mt-0.5 shrink-0 opacity-80" />}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 truncate">{label}</p>
        <p className="text-2xl md:text-3xl font-semibold mt-1 text-slate-950 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1 truncate">{sub}</p>}
      </div>
    </motion.div>
  );
};

// ─── MAIN ──────────────────────────────────────────────────────────────────────
const ClientPL = () => {
  const [tab, setTab]           = useState('pnl'); // 'pnl' | 'statutory'
  const [pnlData, setPnlData]   = useState([]);
  const [statData, setStatData] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // Filters — PnL
  const [search, setSearch]         = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');
  const [selectedFY, setSelectedFY] = useState(getCurrentFY);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minProfit, setMinProfit]   = useState('');
  const [maxProfit, setMaxProfit]   = useState('');

  // Filters — Statutory
  const [statSearch, setStatSearch]   = useState('');
  const [statEntity, setStatEntity]   = useState('All');
  const [statType, setStatType]       = useState('All');
  const [statStatus, setStatStatus]   = useState('All');

  const [sort, setSort] = useState({ key: 'pl_month', dir: 'desc' });
  const [statSort, setStatSort] = useState({ key: 'month', dir: 'desc' });
  const [page, setPage]     = useState(1);
  const [statPage, setStatPage] = useState(1);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [{ data: pnl, error: e1 }, { data: stat, error: e2 }] = await Promise.all([
        supabase.from('client_wise_pl_view').select('*').order('pl_month', { ascending: false }),
        supabase.from('statutory_payments').select('*').order('month', { ascending: false }),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      setPnlData(pnl || []);
      setStatData(stat || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [search, deptFilter, clientFilter, selectedFY, minProfit, maxProfit]);
  useEffect(() => { setStatPage(1); }, [statSearch, statEntity, statType, statStatus]);

  // ── Derived lists ──────────────────────────────────────────────────────────
  const allDepts   = useMemo(() => ['All', ...new Set(pnlData.map(r => r.dept_name).filter(Boolean))], [pnlData]);
  const allClients = useMemo(() => ['All', ...new Set(pnlData.map(r => r.client_name).filter(Boolean)).values()].sort(), [pnlData]);
  const allEntities = useMemo(() => ['All', ...new Set(statData.map(r => r.entity).filter(Boolean))].sort(), [statData]);
  const allTypes   = useMemo(() => ['All', ...new Set(statData.map(r => r.type).filter(Boolean))], [statData]);

  // ── PnL filter + sort ──────────────────────────────────────────────────────
  const filteredPnl = useMemo(() => {
    let d = pnlData.filter(r => {
      const term = search.toLowerCase();
      const matchSearch = !term
        || r.client_name?.toLowerCase().includes(term)
        || r.dept_name?.toLowerCase().includes(term)
        || r.month_label?.toLowerCase().includes(term);
      const matchDept   = deptFilter === 'All' || r.dept_name === deptFilter;
      const matchClient = clientFilter === 'All' || r.client_name === clientFilter;
      const matchFY     = !r.pl_month || (r.pl_month >= fyStart(selectedFY) && r.pl_month <= fyEnd(selectedFY));
      const matchMin    = !minProfit || Number(r.actual_profit) >= Number(minProfit);
      const matchMax    = !maxProfit || Number(r.actual_profit) <= Number(maxProfit);
      return matchSearch && matchDept && matchClient && matchFY && matchMin && matchMax;
    });
    if (sort.key) {
      d = [...d].sort((a, b) => {
        const av = a[sort.key], bv = b[sort.key];
        if (typeof av === 'number' || !isNaN(Number(av)))
          return sort.dir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
        return sort.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return d;
  }, [pnlData, search, deptFilter, clientFilter, selectedFY, minProfit, maxProfit, sort]);

  // ── Statutory filter + sort ────────────────────────────────────────────────
  const filteredStat = useMemo(() => {
    let d = statData.filter(r => {
      const term = statSearch.toLowerCase();
      const matchSearch = !term
        || r.entity?.toLowerCase().includes(term)
        || r.type?.toLowerCase().includes(term)
        || r.month?.includes(term);
      const matchEntity = statEntity === 'All' || r.entity === statEntity;
      const matchType   = statType === 'All' || r.type === statType;
      const matchStatus = statStatus === 'All' || r.payment_status === statStatus;
      return matchSearch && matchEntity && matchType && matchStatus;
    });
    if (statSort.key) {
      d = [...d].sort((a, b) => {
        const av = a[statSort.key], bv = b[statSort.key];
        if (!isNaN(Number(av))) return statSort.dir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
        return statSort.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return d;
  }, [statData, statSearch, statEntity, statType, statStatus, statSort]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const pnlKpis = useMemo(() => {
    const s = (k) => filteredPnl.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    return {
      invoice: s('total_invoice_value'), fee: s('verto_fee_earned'),
      tds: s('tds'), notRecvd: s('money_not_received'),
      expense: s('total_expense'), cn: s('cn_bad_debt'), actual: s('actual_profit'),
    };
  }, [filteredPnl]);

  const statKpis = useMemo(() => {
    const s = (k) => filteredStat.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    return { due: s('total_due'), paid: s('total_paid'), pending: s('pending_due'), penalty: s('penalty_amount') };
  }, [filteredStat]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const pnlPages  = Math.ceil(filteredPnl.length / ITEMS);
  const statPages = Math.ceil(filteredStat.length / ITEMS);
  const pnlPage   = filteredPnl.slice((page - 1) * ITEMS, page * ITEMS);
  const statPage2 = filteredStat.slice((statPage - 1) * ITEMS, statPage * ITEMS);

  // ── Sort handlers ──────────────────────────────────────────────────────────
  const handleSort = (k) => setSort(p => ({ key: k, dir: p.key === k && p.dir === 'asc' ? 'desc' : 'asc' }));
  const handleStatSort = (k) => setStatSort(p => ({ key: k, dir: p.key === k && p.dir === 'asc' ? 'desc' : 'asc' }));

  // ── Excel export ───────────────────────────────────────────────────────────
  const exportPnl = () => {
    const headers = ['Month','Department','Client','Invoice Value','Verto Fee','TDS','Fee Post TDS','Not Received','Expense','CN/Bad Debt','Profit Pre TDS','Profit Post TDS','Actual Profit'];
    const rows = filteredPnl.map(r => [
      r.month_label, r.dept_name, r.client_name,
      r.total_invoice_value, r.verto_fee_earned, r.tds, r.verto_fee_post_tds,
      r.money_not_received, r.total_expense, r.cn_bad_debt,
      r.profit_pre_tds, r.profit_post_tds, r.actual_profit
    ]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Client P&L');
    XLSX.writeFile(wb, `ClientPL_${fyLabel(selectedFY)}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const exportStat = () => {
    const headers = ['Month','Entity','Type','Total Due','Total Paid','Pending','Penalty','Status','Remarks'];
    const rows = filteredStat.map(r => [
      r.month, r.entity, r.type, r.total_due, r.total_paid,
      r.pending_due, r.penalty_amount, r.payment_status, r.remarks
    ]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Statutory');
    XLSX.writeFile(wb, `Statutory_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // ── Totals ─────────────────────────────────────────────────────────────────
  const pnlTotals = useMemo(() => {
    const s = (k) => filteredPnl.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    return {
      total_invoice_value: s('total_invoice_value'), verto_fee_earned: s('verto_fee_earned'),
      tds: s('tds'), verto_fee_post_tds: s('verto_fee_post_tds'),
      money_not_received: s('money_not_received'), total_expense: s('total_expense'),
      cn_bad_debt: s('cn_bad_debt'), profit_pre_tds: s('profit_pre_tds'),
      profit_post_tds: s('profit_post_tds'), actual_profit: s('actual_profit'),
    };
  }, [filteredPnl]);

  const Pagination = ({ cur, total, onChange }) => (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(1, cur - 1))} disabled={cur === 1}
        className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
        <ChevronLeft className="w-4 h-4" />
      </button>
      {Array.from({ length: Math.min(total, 7) }, (_, i) => {
        let p = total <= 7 ? i + 1 : cur <= 4 ? i + 1 : cur >= total - 3 ? total - 6 + i : cur - 3 + i;
        return (
          <button key={p} onClick={() => onChange(p)}
            className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${cur === p ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {p}
          </button>
        );
      })}
      <button onClick={() => onChange(Math.min(total, cur + 1))} disabled={cur >= total || total === 0}
        className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-8 bg-gray-50/60 min-h-screen" style={{ fontFamily: "'DM Sans', 'Geist', sans-serif" }}>

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            {tab === 'pnl' ? 'Client-wise P&L' : 'Statutory Payouts'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {tab === 'pnl' ? 'Per client · per department · per month' : 'GST · TDS · EPF · ESI · LWF'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} disabled={loading}
            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition disabled:opacity-40" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={tab === 'pnl' ? exportPnl : exportStat} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-40">
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* ── TAB SWITCHER ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {[
          { id: 'pnl', label: 'P&L Summary', Icon: TrendingUp },
          { id: 'statutory', label: 'Statutory Payouts', Icon: Landmark },
        ].map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Error: {error}</span>
          <button onClick={fetchAll} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          P&L TAB
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'pnl' && (
        <>
          {/* Filter bar */}
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Client, dept, month…"
                  className="pl-9 pr-3 py-2 w-52 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 transition" />
                {search && <button onClick={() => setSearch('')} className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
              </div>

              {/* Client */}
              <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
                className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300">
                {allClients.map(c => <option key={c} value={c}>{c === 'All' ? 'All Clients' : c}</option>)}
              </select>

              {/* Dept */}
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300">
                {allDepts.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
              </select>

              {/* FY Navigator */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-full px-1 py-1">
                <button onClick={() => setSelectedFY(y => y - 1)}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white text-gray-500 hover:text-gray-800 transition text-sm font-bold">‹</button>
                <span className="px-2 text-xs font-bold text-gray-700 whitespace-nowrap">{fyLabel(selectedFY)}</span>
                <button onClick={() => setSelectedFY(y => y + 1)}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white text-gray-500 hover:text-gray-800 transition text-sm font-bold">›</button>
              </div>

              {/* Advanced toggle */}
              <button onClick={() => setShowAdvanced(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition ${showAdvanced ? 'border-blue-400 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                <Filter className="w-3.5 h-3.5" /> Advanced
              </button>

              <div className="ml-auto text-xs text-gray-500 font-medium">
                {loading ? <span className="flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</span>
                  : <span>{filteredPnl.length} rows</span>}
              </div>
            </div>

            {/* Advanced filters */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                  <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-4 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Min Actual Profit</label>
                      <input type="number" value={minProfit} onChange={e => setMinProfit(e.target.value)}
                        placeholder="₹ Min" className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Max Actual Profit</label>
                      <input type="number" value={maxProfit} onChange={e => setMaxProfit(e.target.value)}
                        placeholder="₹ Max" className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    {(minProfit || maxProfit || search || deptFilter !== 'All' || clientFilter !== 'All') && (
                      <button onClick={() => { setMinProfit(''); setMaxProfit(''); setSearch(''); setDeptFilter('All'); setClientFilter('All'); }}
                        className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 border border-rose-200 px-3 py-2 rounded-lg bg-rose-50 transition">
                        <X className="w-3 h-3" /> Clear All
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* KPIs */}
          {!loading && filteredPnl.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <KPI label="Invoice Value"    value={fmt(pnlKpis.invoice)} color="blue"    Icon={ReceiptText}       delay={0.00} />
              <KPI label="Verto Fee"        value={fmt(pnlKpis.fee)}     color="blue"    Icon={BadgeDollarSign}   delay={0.04} />
              <KPI label="TDS"              value={fmt(pnlKpis.tds)}     color="rose"    Icon={ShieldAlert}       delay={0.08} />
              <KPI label="Not Received"     value={fmt(pnlKpis.notRecvd)} color="amber"  Icon={AlertTriangle}     delay={0.12} sub="Outstanding" />
              <KPI label="CN / Bad Debt"    value={fmt(pnlKpis.cn)}      color="rose"    Icon={FileText}          delay={0.16} />
              <KPI label="Expense"          value={fmt(pnlKpis.expense)} color="violet"  Icon={TrendingDown}      delay={0.20} />
              <KPI label="Actual Profit"    value={fmt(pnlKpis.actual)}
                color={pnlKpis.actual >= 0 ? 'emerald' : 'rose'} Icon={TrendingUp}  delay={0.24} sub="Post TDS" />
            </div>
          )}

          {/* P&L Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> Client × Department × Month
              </h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{filteredPnl.length} rows</span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <span className="text-sm">Loading P&L data…</span>
              </div>
            ) : filteredPnl.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                <Users className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">No data found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[1100px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {[
                        ['month_label','Month','left'],['dept_name','Department','left'],['client_name','Client','left'],
                        ['total_invoice_value','Invoice Value','right'],['verto_fee_earned','Verto Fee','right'],
                        ['tds','TDS','right'],['verto_fee_post_tds','Fee Post TDS','right'],
                        ['money_not_received','Not Received','right'],['total_expense','Expense','right'],
                        ['cn_bad_debt','CN / BD','right'],['profit_pre_tds','Profit Pre TDS','right'],
                        ['profit_post_tds','Profit Post TDS','right'],['actual_profit','Actual Profit','right'],
                      ].map(([k, label, align]) => (
                        <th key={k} onClick={() => handleSort(k)}
                          className={`px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:bg-gray-100 transition whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'} ${sort.key === k ? 'bg-blue-50 text-blue-700' : ''}`}>
                          {label}<SortIcon col={k} cfg={sort} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <AnimatePresence mode="sync">
                      {pnlPage.map((row, i) => {
                        const dc = getDeptColor(row.dept_name);
                        return (
                          <motion.tr key={`${row.pl_month}-${row.client_id}-${row.department_id}`}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                            className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{row.month_label}</td>
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${dc.bg} ${dc.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${dc.dot}`} />{row.dept_name}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-medium text-blue-700 max-w-[160px] truncate">{row.client_name}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-gray-700">{fmt(row.total_invoice_value)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-gray-800 font-medium">{fmt(row.verto_fee_earned)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-rose-600">
                              {Number(row.tds) > 0 ? `-${fmt(row.tds)}` : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-gray-800">{fmt(row.verto_fee_post_tds)}</td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              {Number(row.money_not_received) > 0
                                ? <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-xs font-semibold">{fmt(row.money_not_received)}</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-gray-600">
                              {Number(row.total_expense) > 0 ? `-${fmt(row.total_expense)}` : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              {Number(row.cn_bad_debt) > 0
                                ? <span className="text-rose-600 text-xs font-semibold">-{fmt(row.cn_bad_debt)}</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className={`px-3 py-2.5 text-right font-mono ${profitCls(row.profit_pre_tds)}`}>{fmt(row.profit_pre_tds)}</td>
                            <td className={`px-3 py-2.5 text-right font-mono ${profitCls(row.profit_post_tds)}`}>{fmt(row.profit_post_tds)}</td>
                            <td className="px-3 py-2.5 text-right">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${profitBadgeCls(row.actual_profit)}`}>
                                {Number(row.actual_profit) > 0 ? <ArrowUpRight className="w-3 h-3" /> : Number(row.actual_profit) < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                                {fmt(row.actual_profit)}
                              </span>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white font-bold border-t-2 border-slate-600">
                      <td colSpan={3} className="px-3 py-3 text-sm text-white/70 uppercase tracking-widest">Total ({filteredPnl.length} rows)</td>
                      <td className="px-3 py-3 text-right font-mono text-sm">{fmt(pnlTotals.total_invoice_value)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm">{fmt(pnlTotals.verto_fee_earned)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-rose-300">-{fmt(pnlTotals.tds)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm">{fmt(pnlTotals.verto_fee_post_tds)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-amber-300">{fmt(pnlTotals.money_not_received)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-rose-300">-{fmt(pnlTotals.total_expense)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-rose-300">-{fmt(pnlTotals.cn_bad_debt)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm">{fmt(pnlTotals.profit_pre_tds)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm">{fmt(pnlTotals.profit_post_tds)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm">
                        <span className={Number(pnlTotals.actual_profit) >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                          {fmt(pnlTotals.actual_profit)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {!loading && filteredPnl.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Showing <span className="font-semibold text-gray-700">{(page - 1) * ITEMS + 1}</span>–<span className="font-semibold text-gray-700">{Math.min(page * ITEMS, filteredPnl.length)}</span> of <span className="font-semibold text-gray-700">{filteredPnl.length}</span>
                </p>
                <Pagination cur={page} total={pnlPages} onChange={setPage} />
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STATUTORY TAB
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'statutory' && (
        <>
          {/* Filter bar */}
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              <input type="text" value={statSearch} onChange={e => setStatSearch(e.target.value)}
                placeholder="Entity, type, month…"
                className="pl-9 pr-3 py-2 w-52 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 transition" />
              {statSearch && <button onClick={() => setStatSearch('')} className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
            </div>

            <select value={statEntity} onChange={e => setStatEntity(e.target.value)}
              className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300">
              {allEntities.map(e => <option key={e} value={e}>{e === 'All' ? 'All Entities' : e}</option>)}
            </select>

            <select value={statType} onChange={e => setStatType(e.target.value)}
              className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300">
              {allTypes.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
            </select>

            <select value={statStatus} onChange={e => setStatStatus(e.target.value)}
              className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300">
              {['All','paid','partial','pending'].map(s => <option key={s} value={s}>{s === 'All' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>

            <div className="ml-auto text-xs text-gray-500 font-medium">
              {loading ? <span className="flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</span>
                : <span>{filteredStat.length} rows</span>}
            </div>
          </div>

          {/* Stat KPIs */}
          {!loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI label="Total Due"    value={fmt(statKpis.due)}     color="blue"    Icon={CircleDollarSign} delay={0.00} />
              <KPI label="Total Paid"   value={fmt(statKpis.paid)}    color="emerald" Icon={BadgeDollarSign}  delay={0.04} />
              <KPI label="Pending Due"  value={fmt(statKpis.pending)} color="amber"   Icon={AlertTriangle}    delay={0.08} />
              <KPI label="Penalties"    value={fmt(statKpis.penalty)} color="rose"    Icon={ShieldAlert}      delay={0.12} />
            </div>
          )}

          {/* Statutory Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-600" /> Statutory Payment Records
              </h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{filteredStat.length} rows</span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <span className="text-sm">Loading statutory data…</span>
              </div>
            ) : filteredStat.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                <Landmark className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">No statutory records found</p>
                <p className="text-xs">Records will appear here once statutory payments are entered</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {[
                        ['month','Month','left'],['entity','Entity','left'],['type','Type','left'],
                        ['total_due','Total Due','right'],['total_paid','Total Paid','right'],
                        ['pending_due','Pending','right'],['payment_status','Status','center'],
                        ['payment_date','Payment Date','center'],['penalty_amount','Penalty','right'],['remarks','Remarks','left'],
                      ].map(([k, label, align]) => (
                        <th key={k} onClick={() => handleStatSort(k)}
                          className={`px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:bg-gray-100 transition whitespace-nowrap text-${align} ${statSort.key === k ? 'bg-blue-50 text-blue-700' : ''}`}>
                          {label}<SortIcon col={k} cfg={statSort} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <AnimatePresence mode="sync">
                      {statPage2.map((row, i) => {
                        const sc = getStatColor(row.type);
                        const statusCls = row.payment_status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : row.payment_status === 'partial'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200';
                        return (
                          <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }} className="hover:bg-emerald-50/20 transition-colors">
                            <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">
                              {row.month ? new Date(row.month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td className="px-3 py-2.5 font-medium text-blue-700">{row.entity || '—'}</td>
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${sc.bg} ${sc.text} ${sc.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{row.type}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-gray-700">{fmtFull(row.total_due)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-emerald-600 font-medium">{fmtFull(row.total_paid)}</td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              {Number(row.pending_due) > 0
                                ? <span className="text-rose-600 font-bold">{fmtFull(row.pending_due)}</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${statusCls}`}>
                                {row.payment_status || 'pending'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center text-xs text-gray-500">
                              {row.payment_date ? new Date(row.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              {Number(row.penalty_amount) > 0
                                ? <span className="text-rose-600 text-xs font-semibold">{fmtFull(row.penalty_amount)}</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[140px] truncate">{row.remarks || '—'}</td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}

            {!loading && filteredStat.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Showing <span className="font-semibold text-gray-700">{(statPage - 1) * ITEMS + 1}</span>–<span className="font-semibold text-gray-700">{Math.min(statPage * ITEMS, filteredStat.length)}</span> of <span className="font-semibold text-gray-700">{filteredStat.length}</span>
                </p>
                <Pagination cur={statPage} total={statPages} onChange={setStatPage} />
              </div>
            )}
          </div>
        </>
      )}

      {/* Legend */}
      {tab === 'pnl' && !loading && filteredPnl.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="font-semibold text-gray-700 mr-1">Formulas:</span>
          <span><b className="text-gray-700">Verto Fee Post TDS</b> = Verto Fee − TDS</span>
          <span><b className="text-amber-600">Not Received</b> = Outstanding per invoice (live)</span>
          <span><b className="text-gray-700">Profit Pre TDS</b> = Verto Fee Earned − Expense</span>
          <span><b className="text-gray-700">Profit Post TDS</b> = Fee Post TDS − Expense</span>
          <span><b className="text-emerald-600">Actual Profit</b> = Fee Received − TDS − Expense (most realistic)</span>
        </div>
      )}
    </div>
  );
};

export default ClientPL;