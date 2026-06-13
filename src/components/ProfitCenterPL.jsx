import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import supabase from '../lib/supabaseClient';
import * as XLSX from 'xlsx';
import {
  Search, Download, Filter, ChevronRight, ChevronLeft,
  ChevronDown, ChevronUp, Building2, TrendingUp, TrendingDown,
  AlertTriangle, RefreshCw, X, Calendar, Loader2, Info
} from 'lucide-react';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmt = (val) => {
  const n = Number(val) || 0;
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000)   return `₹${(n / 100000).toFixed(2)}L`;
  if (Math.abs(n) >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};

const fmtFull = (val) => {
  const n = Number(val) || 0;
  return '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const profitColor = (val) => {
  const n = Number(val) || 0;
  if (n > 0) return 'text-emerald-600 font-bold';
  if (n < 0) return 'text-rose-600 font-bold';
  return 'text-gray-500';
};

const DEPT_COLORS = {
  'Operations':   { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  'Temporary':    { bg: 'bg-violet-100',  text: 'text-violet-700', dot: 'bg-violet-500' },
  'Recruitment':  { bg: 'bg-amber-100',   text: 'text-amber-700',  dot: 'bg-amber-500' },
  'Projects':     { bg: 'bg-emerald-100', text: 'text-emerald-700',dot: 'bg-emerald-500' },
  'Others':       { bg: 'bg-gray-100',    text: 'text-gray-600',   dot: 'bg-gray-400' },
};
const getDeptStyle = (name) => DEPT_COLORS[name] || DEPT_COLORS['Others'];

// ─── SORT ICON ─────────────────────────────────────────────────────────────────
const SortIcon = ({ col, sortConfig }) => {
  if (sortConfig.key !== col) return <ChevronDown className="w-3 h-3 opacity-25 ml-1" />;
  return sortConfig.dir === 'asc'
    ? <ChevronUp className="w-3 h-3 ml-1 text-blue-600" />
    : <ChevronDown className="w-3 h-3 ml-1 text-blue-600" />;
};

// ─── COLUMN DEFINITION ────────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'month_label',            label: 'Month',                    align: 'left',  color: '',               group: 'base' },
  { key: 'dept_name',              label: 'Department',               align: 'left',  color: '',               group: 'base' },
  { key: 'total_invoice_value',    label: 'Invoice Value',            align: 'right', color: '',               group: 'revenue' },
  { key: 'verto_fee_earned',       label: 'Verto Fee Earned',         align: 'right', color: '',               group: 'revenue' },
  { key: 'tds',                    label: 'Less: TDS',                align: 'right', color: 'text-rose-600',  group: 'revenue' },
  { key: 'verto_fee_post_tds',     label: 'Fee Post TDS',             align: 'right', color: '',               group: 'revenue' },
  { key: 'money_not_received',     label: 'Money Not Received',       align: 'right', color: 'text-amber-600', group: 'revenue' },
  { key: 'verto_fee_received',     label: 'Fee Received',             align: 'right', color: 'text-blue-700',  group: 'revenue' },
  { key: 'cn_bad_debt',            label: 'CN / Bad Debt',            align: 'right', color: 'text-rose-500',  group: 'revenue' },
  { key: 'monthly_expense',        label: 'Monthly Expense',          align: 'right', color: '',               group: 'expense' },
  { key: 'dedicated_resource_exp', label: 'Dedicated Resource',       align: 'right', color: 'text-slate-500', group: 'expense' },
  { key: 'shared_resource_exp',    label: 'Shared Resource',          align: 'right', color: 'text-slate-500', group: 'expense' },
  { key: 'other_exp',              label: 'Other Expense',            align: 'right', color: 'text-slate-500', group: 'expense' },
  { key: 'profit_pre_tds',         label: 'Profit Pre TDS',           align: 'right', color: '',               group: 'pl' },
  { key: 'profit_post_tds',        label: 'Profit Post TDS',          align: 'right', color: '',               group: 'pl' },
  { key: 'actual_profit_post_tds', label: 'Actual Profit (Post TDS)', align: 'right', color: 'text-emerald-700',group: 'pl' },
  { key: 'actual_profit_pre_tds',  label: 'Actual Profit (Pre TDS)',  align: 'right', color: 'text-emerald-600',group: 'pl' },
];

const GROUP_LABELS = {
  base:    { label: '',          span: 2, bg: '' },
  revenue: { label: 'Revenue',  span: 7, bg: 'bg-blue-50 border-b border-blue-200 text-blue-700' },
  expense: { label: 'Expenses', span: 4, bg: 'bg-orange-50 border-b border-orange-200 text-orange-700' },
  pl:      { label: 'P & L',    span: 4, bg: 'bg-emerald-50 border-b border-emerald-200 text-emerald-700' },
};

const ITEMS_PER_PAGE = 10;

// ─── KPI CARD ──────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, color = 'blue', icon: Icon, delay = 0 }) => {
  const colorMap = {
    blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    icon: 'text-blue-400' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-400' },
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   icon: 'text-amber-400' },
    rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    icon: 'text-rose-400' },
    violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  icon: 'text-violet-400' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={`${c.bg} border ${c.border} rounded-2xl px-5 py-4 flex items-start gap-3 min-h-24`}
    >
      {Icon && <Icon className={`w-5 h-5 mt-0.5 ${c.icon} shrink-0`} />}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 truncate">{label}</p>
        <p className={`text-2xl md:text-3xl font-semibold mt-1 ${c.text} truncate`}>{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1 truncate">{sub}</p>}
      </div>
    </motion.div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const ProfitCenterPL = () => {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [deptFilter, setDept]   = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage]         = useState(1);
  const [sortConfig, setSort]   = useState({ key: 'pl_month', dir: 'desc' });
  const [tooltip, setTooltip]   = useState(null); // { key, value, x, y }

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('profit_center_pl_view')
        .select('*')
        .order('pl_month', { ascending: false });

      if (dateFrom) q = q.gte('pl_month', dateFrom);
      if (dateTo)   q = q.lte('pl_month', dateTo);

      const { data, error: err } = await q;
      if (err) throw err;
      setRows(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Default date range: last 12 months ────────────────────────
  useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 11);
    from.setDate(1);
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(to.toISOString().slice(0, 10));
  }, []);

  // ── Derived lists ──────────────────────────────────────────────
  const allDepts = useMemo(() =>
    ['All', ...new Set(rows.map(r => r.dept_name).filter(Boolean))],
    [rows]
  );

  // ── Filter + sort ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let d = rows.filter(r => {
      const term = search.toLowerCase();
      const matchSearch = !term
        || r.dept_name?.toLowerCase().includes(term)
        || r.month_label?.toLowerCase().includes(term)
        || r.dept_code?.toLowerCase().includes(term);
      const matchDept = deptFilter === 'All' || r.dept_name === deptFilter;
      return matchSearch && matchDept;
    });

    if (sortConfig.key) {
      d = [...d].sort((a, b) => {
        const av = a[sortConfig.key], bv = b[sortConfig.key];
        if (typeof av === 'number') return sortConfig.dir === 'asc' ? av - bv : bv - av;
        return sortConfig.dir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return d;
  }, [rows, search, deptFilter, sortConfig]);

  // ── KPIs ───────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const sum = (key) => filtered.reduce((s, r) => s + (Number(r[key]) || 0), 0);
    return {
      totalInvoice:   sum('total_invoice_value'),
      vertoFeeEarned: sum('verto_fee_earned'),
      feeReceived:    sum('verto_fee_received'),
      notReceived:    sum('money_not_received'),
      expense:        sum('monthly_expense'),
      actualProfit:   sum('actual_profit_post_tds'),
      cnBadDebt:      sum('cn_bad_debt'),
      tds:            sum('tds'),
    };
  }, [filtered]);

  // ── Pagination ─────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageData   = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, deptFilter, dateFrom, dateTo]);

  // ── Sort handler ───────────────────────────────────────────────
  const handleSort = (key) => {
    setSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  // ── Excel export ───────────────────────────────────────────────
  const exportExcel = () => {
    const headers = COLUMNS.map(c => c.label);
    const exportRows = filtered.map(r =>
      COLUMNS.map(c => {
        const v = r[c.key];
        return (c.align === 'right' && v !== undefined) ? Number(v) : v;
      })
    );
    // totals row
    const totals = COLUMNS.map(c => {
      if (c.key === 'month_label') return 'TOTAL';
      if (c.key === 'dept_name') return '';
      if (c.align === 'right') return filtered.reduce((s, r) => s + (Number(r[c.key]) || 0), 0);
      return '';
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...exportRows, totals]);
    ws['!cols'] = COLUMNS.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, 'P&L');
    XLSX.writeFile(wb, `Verto_PL_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // ── Totals row ─────────────────────────────────────────────────
  const totals = useMemo(() =>
    COLUMNS.reduce((acc, c) => {
      if (c.align === 'right') {
        acc[c.key] = filtered.reduce((s, r) => s + (Number(r[c.key]) || 0), 0);
      }
      return acc;
    }, {}),
    [filtered]
  );

  // ─── RENDER ────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-8 min-h-screen bg-gray-50/60">

      {/* ── PAGE HEADER ── */}
      <div className="flex items-center justify-between pt-1 pb-1">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Profit Center P&amp;L
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Department-wise profitability · DB-driven · Real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportExcel}
            disabled={!filtered.length}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-40"
          >
            <Download className="w-4 h-4" />Export Excel
          </button>
        </div>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search dept or month…"
            className="pl-9 pr-3 py-2 w-56 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dept filter */}
        <select
          value={deptFilter}
          onChange={e => setDept(e.target.value)}
          className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
        >
          {allDepts.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-200 bg-gray-50 rounded-lg px-2 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition w-36"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="border border-gray-200 bg-gray-50 rounded-lg px-2 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition w-36"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          {loading
            ? <span className="flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</span>
            : <span className="font-medium text-gray-600">{filtered.length} rows</span>
          }
        </div>
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Error loading data: {error}</span>
          <button onClick={fetchData} className="ml-auto text-rose-600 underline text-xs">Retry</button>
        </div>
      )}

      {/* ── KPI CARDS ── */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <KpiCard label="Total Invoice"   value={fmt(kpis.totalInvoice)}   color="blue"   icon={Building2}     delay={0.00} />
          <KpiCard label="Verto Fee Earned" value={fmt(kpis.vertoFeeEarned)} color="blue"   icon={TrendingUp}    delay={0.04} />
          <KpiCard label="Fee Received"    value={fmt(kpis.feeReceived)}    color="emerald" icon={TrendingUp}   delay={0.08} sub="Proportional" />
          <KpiCard label="Not Received"    value={fmt(kpis.notReceived)}    color="amber"  icon={AlertTriangle} delay={0.12} sub="Outstanding" />
          <KpiCard label="Total TDS"       value={fmt(kpis.tds)}            color="rose"   icon={TrendingDown}  delay={0.16} />
          <KpiCard label="CN / Bad Debt"   value={fmt(kpis.cnBadDebt)}      color="rose"   icon={AlertTriangle} delay={0.20} />
          <KpiCard label="Monthly Expense" value={fmt(kpis.expense)}        color="violet" icon={TrendingDown}  delay={0.24} sub="Non-billable only" />
          <KpiCard label="Actual Profit"   value={fmt(kpis.actualProfit)}   color={kpis.actualProfit >= 0 ? 'emerald' : 'rose'} icon={TrendingUp} delay={0.28} sub="Post TDS" />
        </div>
      )}

      {/* ── TABLE ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

        {/* Table header meta */}
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Profit &amp; Loss — Department × Month
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Positive profit
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              Loss
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Outstanding
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <span className="text-sm">Loading P&amp;L data…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <Building2 className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">No data found</p>
            <p className="text-xs">Try adjusting filters or date range</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[1400px]">

              {/* Group header row */}
              <thead>
                <tr>
                  {/* base: 2 cols, no label */}
                  <th colSpan={2} className="border-b border-gray-200 bg-white" />
                  <th colSpan={7} className={`text-center text-xs font-bold uppercase tracking-widest py-2 border-b ${GROUP_LABELS.revenue.bg}`}>
                    Revenue
                  </th>
                  <th colSpan={4} className={`text-center text-xs font-bold uppercase tracking-widest py-2 border-b ${GROUP_LABELS.expense.bg}`}>
                    Expenses
                  </th>
                  <th colSpan={4} className={`text-center text-xs font-bold uppercase tracking-widest py-2 border-b ${GROUP_LABELS.pl.bg}`}>
                    P &amp; L
                  </th>
                </tr>

                {/* Column header row */}
                <tr className="bg-gray-50 border-b border-gray-200">
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`px-3 py-2.5 whitespace-nowrap cursor-pointer select-none
                        text-xs font-bold uppercase tracking-wider text-gray-500
                        hover:bg-gray-100 transition-colors
                        ${col.align === 'right' ? 'text-right' : 'text-left'}
                        ${col.color || ''}
                        ${sortConfig.key === col.key ? 'bg-blue-50 text-blue-700' : ''}
                      `}
                    >
                      <span className="inline-flex items-center gap-1 justify-end w-full">
                        {col.align === 'left' ? col.label : null}
                        <SortIcon col={col.key} sortConfig={sortConfig} />
                        {col.align === 'right' ? col.label : null}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence mode="sync">
                  {pageData.map((row, idx) => {
                    const ds = getDeptStyle(row.dept_name);
                    const isLoss = Number(row.actual_profit_post_tds) < 0;
                    return (
                      <motion.tr
                        key={`${row.pl_month}-${row.department_id}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`hover:bg-blue-50/40 transition-colors ${isLoss ? 'bg-rose-50/20' : ''}`}
                      >
                        {/* Month */}
                        <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">
                          {row.month_label}
                        </td>

                        {/* Dept badge */}
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${ds.bg} ${ds.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${ds.dot}`} />
                            {row.dept_name}
                          </span>
                        </td>

                        {/* Invoice value */}
                        <td className="px-3 py-2.5 text-right font-mono text-gray-700">{fmt(row.total_invoice_value)}</td>

                        {/* Verto fee earned */}
                        <td className="px-3 py-2.5 text-right font-mono text-gray-800 font-medium">{fmt(row.verto_fee_earned)}</td>

                        {/* TDS */}
                        <td className="px-3 py-2.5 text-right font-mono text-rose-600">
                          {Number(row.tds) > 0 ? `-${fmt(row.tds)}` : '—'}
                        </td>

                        {/* Fee post TDS */}
                        <td className="px-3 py-2.5 text-right font-mono text-gray-800">{fmt(row.verto_fee_post_tds)}</td>

                        {/* Money not received */}
                        <td className="px-3 py-2.5 text-right font-mono">
                          {Number(row.money_not_received) > 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-xs font-semibold">
                              {fmt(row.money_not_received)}
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>

                        {/* Fee received */}
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-blue-700">{fmt(row.verto_fee_received)}</td>

                        {/* CN / Bad debt */}
                        <td className="px-3 py-2.5 text-right font-mono">
                          {Number(row.cn_bad_debt) > 0 ? (
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md text-xs font-semibold">
                              -{fmt(row.cn_bad_debt)}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Monthly expense */}
                        <td className="px-3 py-2.5 text-right font-mono text-gray-700">{fmt(row.monthly_expense)}</td>

                        {/* Dedicated resource */}
                        <td className="px-3 py-2.5 text-right font-mono text-slate-500 text-xs">{fmt(row.dedicated_resource_exp)}</td>

                        {/* Shared resource */}
                        <td className="px-3 py-2.5 text-right font-mono text-slate-500 text-xs">{fmt(row.shared_resource_exp)}</td>

                        {/* Other expense */}
                        <td className="px-3 py-2.5 text-right font-mono text-slate-500 text-xs">{fmt(row.other_exp)}</td>

                        {/* Profit pre TDS */}
                        <td className={`px-3 py-2.5 text-right font-mono ${profitColor(row.profit_pre_tds)}`}>
                          {fmt(row.profit_pre_tds)}
                        </td>

                        {/* Profit post TDS */}
                        <td className={`px-3 py-2.5 text-right font-mono ${profitColor(row.profit_post_tds)}`}>
                          {fmt(row.profit_post_tds)}
                        </td>

                        {/* Actual profit post TDS */}
                        <td className="px-3 py-2.5 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold
                            ${Number(row.actual_profit_post_tds) > 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : Number(row.actual_profit_post_tds) < 0
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-gray-100 text-gray-500'
                            }`}>
                            {Number(row.actual_profit_post_tds) > 0 ? <TrendingUp className="w-3 h-3" /> : Number(row.actual_profit_post_tds) < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                            {fmt(row.actual_profit_post_tds)}
                          </span>
                        </td>

                        {/* Actual profit pre TDS */}
                        <td className={`px-3 py-2.5 text-right font-mono ${profitColor(row.actual_profit_pre_tds)}`}>
                          {fmt(row.actual_profit_pre_tds)}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>

              {/* Totals footer */}
              <tfoot>
                <tr className="bg-slate-800 text-white font-bold border-t-2 border-slate-600">
                  <td className="px-3 py-3 text-sm text-white/80 uppercase tracking-widest" colSpan={2}>
                    Total ({filtered.length} rows)
                  </td>
                  {COLUMNS.slice(2).map(col => (
                    <td key={col.key} className="px-3 py-3 text-right font-mono text-sm">
                      {col.key === 'money_not_received' && Number(totals[col.key]) > 0 ? (
                        <span className="text-amber-300">{fmt(totals[col.key])}</span>
                      ) : col.key === 'tds' && Number(totals[col.key]) > 0 ? (
                        <span className="text-rose-300">-{fmt(totals[col.key])}</span>
                      ) : col.key === 'cn_bad_debt' && Number(totals[col.key]) > 0 ? (
                        <span className="text-rose-300">-{fmt(totals[col.key])}</span>
                      ) : col.key.includes('profit') || col.key.includes('actual') ? (
                        <span className={Number(totals[col.key]) >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                          {fmt(totals[col.key])}
                        </span>
                      ) : (
                        <span className="text-white/90">{fmt(totals[col.key])}</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── PAGINATION ── */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-700">{(page - 1) * ITEMS_PER_PAGE + 1}</span>
              {' '}–{' '}
              <span className="font-semibold text-gray-700">{Math.min(page * ITEMS_PER_PAGE, filtered.length)}</span>
              {' '}of{' '}
              <span className="font-semibold text-gray-700">{filtered.length}</span> entries
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p;
                if (totalPages <= 7) p = i + 1;
                else if (page <= 4) p = i + 1;
                else if (page >= totalPages - 3) p = totalPages - 6 + i;
                else p = page - 3 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                      page === p
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── LEGEND ── */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="font-semibold text-gray-700 mr-2">Legend:</span>
          <span><span className="font-semibold text-gray-700">Invoice Value</span> = Total billed (excl. CN)</span>
          <span><span className="font-semibold text-gray-700">Fee Received</span> = Proportional to amount collected</span>
          <span className="text-amber-600"><span className="font-semibold">Money Not Received</span> = Live outstanding (from DB)</span>
          <span className="text-rose-600"><span className="font-semibold">CN / Bad Debt</span> = Written off</span>
          <span><span className="font-semibold text-gray-700">Monthly Expense</span> = Non-billable costs only</span>
          <span className="text-emerald-600"><span className="font-semibold">Actual Profit</span> = Fee Received − TDS − Expense</span>
        </div>
      )}
    </div>
  );
};

export default ProfitCenterPL;