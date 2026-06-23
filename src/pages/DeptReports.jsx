import React, { useEffect, useMemo, useState, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2,
  TrendingUp,
  Users,
  Building2,
  Wallet,
  CreditCard,
  FileText,
  Download,
  RefreshCw,
  Search,
  ChevronDown,
  X,
  Loader2,
  AlertTriangle,
  Calendar,
  Cake,
  Landmark,
} from "lucide-react";
import * as XLSX from "xlsx";

// Reuse the same UI philosophy/components as AnalyticsDashboard
const P = {
  steel: "#3D6A91",
  teal: "#2F8577",
  amber: "#C08A3E",
  brick: "#B14B3F",
  clay: "#C17F4E",
  plum: "#6E5E94",
  slate: "#5B6B82",
  sky: "#4A7FA6",
  trend: "#33415C",
};

const fmt = (n) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  if (Math.abs(v) >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
};

const fmtFull = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtCount = (n) => Number(n || 0).toLocaleString("en-IN");
const toYYYYMM = (d) => (d ? String(d).slice(0, 7) : "");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "");
const fmtMonth = (ym) => {
  if (!ym) return "";
  return new Date(ym + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
};

const fyRange = (startYear) => {
  const start = `${startYear}-04-01`;
  const end = `${startYear + 1}-03-31`;
  const label = `FY ${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
  return { label, start, end };
};
const currentFYStartYear = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 4 ? y : y - 1;
};

const safeDivPct = (num, den) => {
  const a = Number(num || 0);
  const b = Number(den || 0);
  if (!b) return 0;
  return (a / b) * 100;
};

const ArrowUp = ({ className }) => (
  <span className={className}>↑</span>
);
const ArrowDown = ({ className }) => (
  <span className={className}>↓</span>
);

const SH = ({ icon: Icon, title, color, count }) => (
  <div className="flex items-center gap-2.5 mb-4 mt-2">
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: color + "18" }}
    >
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
    <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">{title}</h2>
    {count !== undefined && (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
        {count}
      </span>
    )}
    <div className="flex-1 h-px bg-slate-100" />
  </div>
);

const KpiCard = ({ label, value, sub, icon: Icon, color, trend }) => (
  <div className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-200 ${trend != null ? (trend >= 0 ? "border-emerald-200" : "border-rose-200") : "border-slate-200"}`}>
    <div className="flex items-start justify-between mb-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: color + "18" }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      {trend != null && (
        <span className={`flex items-center gap-1 text-[11px] font-semibold ${trend >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
          {trend >= 0 ? <ArrowUp className="" /> : <ArrowDown className="" />}
          {Math.abs(trend).toFixed(1)}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
    <p className="text-[11px] font-semibold text-slate-500 mt-1">{label}</p>
    {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

const ChartCard = ({ title, subtitle, children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
    <div className="flex items-start justify-between px-5 pt-5 pb-0 mb-4">
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="px-5 pb-5">{children}</div>
  </div>
);

const FYSelector = ({ startYear, onChange }) => {
  const { label } = fyRange(startYear);
  const minYear = 2015;
  const maxYear = currentFYStartYear() + 1;
  return (
    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-full px-1.5 py-1">
      <button
        onClick={() => onChange(Math.max(minYear, startYear - 1))}
        disabled={startYear <= minYear}
        className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        ‹
      </button>
      <span className="text-xs font-bold text-slate-700 px-2 tracking-wide whitespace-nowrap">{label}</span>
      <button
        onClick={() => onChange(Math.min(maxYear, startYear + 1))}
        disabled={startYear >= maxYear}
        className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        ›
      </button>
    </div>
  );
};

const Empty = ({ msg = "No data for selected filters" }) => (
  <div className="flex flex-col items-center justify-center py-12 text-slate-300">
    <BarChart2 className="w-8 h-8 mb-2 opacity-50" />
    <p className="text-xs font-medium">{msg}</p>
  </div>
);

const DataTable = ({ columns, data, maxHeight = 320 }) => {
  if (!data?.length) return null;
  return (
    <div className="overflow-auto" style={{ maxHeight }}>
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className={`text-left py-2 pr-3 text-slate-400 font-semibold ${col.align === "right" ? "text-right" : ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              {columns.map((col, j) => (
                <td
                  key={j}
                  className={`py-2 pr-3 ${col.className || ""} ${col.align === "right" ? "text-right" : ""}`}
                >
                  {col.formatter ? col.formatter(row[col.key], row, i) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const isValidDateStr = (s) => !!s && !Number.isNaN(new Date(s).getTime());

// Extract data helper for Supabase responses
const extractData = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  return [];
};

const DeptReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fyStartYear, setFyStartYear] = useState(currentFYStartYear());
  const fy = useMemo(() => fyRange(fyStartYear), [fyStartYear]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [userDeptId, setUserDeptId] = useState(null);
  const [userDeptName, setUserDeptName] = useState(null);

  const [allDepts, setAllDepts] = useState([]);
  const [deptId, setDeptId] = useState(null);

  // NEW RPC STATES - replace all old table states
  const [rpcRevenue, setRpcRevenue] = useState([]);
  const [rpcSalary, setRpcSalary] = useState([]);
  const [rpcNonSalary, setRpcNonSalary] = useState([]);
  const [rpcManpower, setRpcManpower] = useState([]);
  const [rpcAttrition, setRpcAttrition] = useState([]);
  const [rpcRatios, setRpcRatios] = useState([]);
  const [rpcBirthdays, setRpcBirthdays] = useState([]);
  const [rpcAnniversaries, setRpcAnniversaries] = useState([]);
  const [rpcClientAdv, setRpcClientAdv] = useState([]);

  const [search, setSearch] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Auth
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      if (!user) throw new Error("Not logged in");

      // 2) Role + dept via RPC (single call)
      const { data: roleData, error: roleErr } = await supabase
        .rpc("get_user_dept_and_role", { p_email: user.email });
      if (roleErr) throw roleErr;

      const userInfo = roleData?.[0];
      const resolvedIsAdmin = userInfo?.is_admin ?? false;
      const resolvedDeptId  = userInfo?.dept_id  ?? null;
      const resolvedDeptName = userInfo?.dept_name ?? null;

      setIsAdmin(resolvedIsAdmin);
      setUserDeptName(resolvedDeptName || "(unknown)");
      setUserDeptId(resolvedDeptId);

      if (resolvedIsAdmin) {
        const { data: depts } = await supabase
          .from("departments_master")
          .select("id, dept_name")
          .order("dept_name");
        const d = depts || [];
        setAllDepts(d);
        if (!deptId && d.length > 0) setDeptId(d[0].id);
      } else {
        setDeptId(resolvedDeptId);
      }

      // 3) Effective dept for all RPC calls
      const effectiveDeptId = resolvedIsAdmin ? (deptId ?? null) : resolvedDeptId;
      const p_start = fy.start;
      const p_end   = fy.end;

      // 4) Fetch all 9 dept RPCs in parallel
      const [
        dRevenue, dSalary, dNonSalary, dManpower,
        dAttrition, dRatios, dBirthdays, dAnniv, dClientAdv
      ] = await Promise.all([
        supabase.rpc("get_dept_report_revenue",       { p_start, p_end, p_dept_id: effectiveDeptId }),
        supabase.rpc("get_dept_report_salary",         { p_start, p_end, p_dept_id: effectiveDeptId }),
        supabase.rpc("get_dept_report_non_salary",     { p_start, p_end, p_dept_id: effectiveDeptId }),
        supabase.rpc("get_dept_report_manpower",       { p_start, p_end, p_dept_id: effectiveDeptId }),
        supabase.rpc("get_dept_report_attrition",      { p_start, p_end, p_dept_id: effectiveDeptId }),
        supabase.rpc("get_dept_report_ratios",         { p_start, p_end, p_dept_id: effectiveDeptId }),
        supabase.rpc("get_dept_report_birthdays",      { p_dept_id: effectiveDeptId, p_days_ahead: 30 }),
        supabase.rpc("get_dept_report_anniversaries",  { p_dept_id: effectiveDeptId, p_days_ahead: 30 }),
        supabase.rpc("get_dept_report_client_advance", { p_start, p_end }),
      ]);

      setRpcRevenue(extractData(dRevenue));
      setRpcSalary(extractData(dSalary));
      setRpcNonSalary(extractData(dNonSalary));
      setRpcManpower(extractData(dManpower));
      setRpcAttrition(extractData(dAttrition));
      setRpcRatios(extractData(dRatios));
      setRpcBirthdays(extractData(dBirthdays));
      setRpcAnniversaries(extractData(dAnniv));
      setRpcClientAdv(extractData(dClientAdv));

    } catch (e) {
      console.error("FETCH ERROR:", e);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [fy.start, fy.end, deptId]);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fyStartYear, deptId]);

  // Section 1: Revenue KPIs from rpcRevenue + rpcRatios
  const kpi = useMemo(() => {
    const rev = rpcRevenue.reduce((s, r) => s + Number(r.total_revenue || 0), 0);
    const fee = rpcRevenue.reduce((s, r) => s + Number(r.total_fee || 0), 0);
    const tds = rpcRevenue.reduce((s, r) => s + Number(r.total_tds || 0), 0);

    const rat = rpcRatios[0] || {};
    return {
      total_revenue:         rev,
      total_fee:             fee,
      total_tds:             tds,
      fee_to_revenue_pct:    Number(rat.fee_to_revenue || 0),
      internal_salary:       Number(rat.total_internal_salary || 0),
      external_cost:         Number(rat.total_external_cost || 0),
      non_salary_exp:        Number(rat.total_non_salary || 0),
      internal_headcount:    Number(rat.internal_headcount || 0),
      external_headcount:    Number(rat.external_headcount || 0),
      revenue_per_ext_head:  Number(rat.revenue_per_ext_head || 0),
      dept_salary_to_fee:    Number(rat.dept_salary_to_dept_fee || 0),
    };
  }, [rpcRevenue, rpcRatios]);

  // Section 2: Monthly revenue growth - FIX: Aggregate by month to handle multiple depts
  const growth = useMemo(() => {
    // Aggregate across depts — multiple rows per month from RPC
    const byMonth = new Map();
    for (const r of rpcRevenue) {
      const ym = r.month;
      if (!ym) continue;
      if (!byMonth.has(ym)) byMonth.set(ym, { ym, rev: 0, fee: 0 });
      byMonth.get(ym).rev += Number(r.total_revenue || 0);
      byMonth.get(ym).fee += Number(r.total_fee || 0);
    }
    const months = Array.from(byMonth.values())
      .sort((a, b) => String(a.ym).localeCompare(String(b.ym)));
    const last = months[months.length - 1];
    const prev = months[months.length - 2];
    const revMoM = prev?.rev ? safeDivPct(last.rev - prev.rev, prev.rev) : 0;
    const feeMoM = prev?.fee ? safeDivPct(last.fee - prev.fee, prev.fee) : 0;
    return { months, last, prev, revMoM, feeMoM };
  }, [rpcRevenue]);

  // Section 3: Salary breakdown table
  const salaryTable = useMemo(() =>
    [...rpcSalary].sort((a, b) => String(a.month).localeCompare(String(b.month))),
  [rpcSalary]);

  // Section 4: HR KPIs from attrition RPC
  const hrKPIs = useMemo(() => {
    const active    = rpcAttrition.reduce((s, r) => s + Number(r.total_active    || 0), 0);
    const inactive  = rpcAttrition.reduce((s, r) => s + Number(r.total_inactive  || 0), 0);
    const avgTenure = rpcAttrition.length
      ? rpcAttrition.reduce((s, r) => s + Number(r.avg_tenure_months || 0), 0) / rpcAttrition.length
      : 0;
    return { active, inactive, totalEmployees: active + inactive, avgTenureMonths: avgTenure };
  }, [rpcAttrition]);

  // Section 5: Birthday / anniversary alerts
  const upcomingDates = useMemo(() => {
    const thisWeek = 7;
    const birthdaysThisWeek    = rpcBirthdays.filter(b    => Number(b.days_until)    <= thisWeek).length;
    const anniversariesThisWeek = rpcAnniversaries.filter(a => Number(a.days_until) <= thisWeek).length;
    return {
      birthdays:    rpcBirthdays,
      anniversaries: rpcAnniversaries,
      hasDob: rpcBirthdays.length > 0,
      alertCount: birthdaysThisWeek + anniversariesThisWeek,
    };
  }, [rpcBirthdays, rpcAnniversaries]);

  const section1Table = useMemo(() => {
    const d = rpcRevenue.filter((r) => {
      if (!search.trim()) return true;
      const t = search.toLowerCase();
      return (
        String(r.dept_name || "").toLowerCase().includes(t) ||
        String(r.month || "").toLowerCase().includes(t)
      );
    });
    return d
      .map((r) => ({
        month: fmtMonth(r.month),
        dept: r.dept_name,
        Revenue: r.total_revenue,
        "Verto Fee": r.total_fee,
        TDS: r.total_tds,
        Invoices: r.invoice_count,
        _raw: r,
      }))
      .sort((a, b) => String(a._raw?.month || "").localeCompare(String(b._raw?.month || "")));
  }, [rpcRevenue, search]);

  const [page, setPage] = useState(1);
  const ITEMS = 10;
  useEffect(() => setPage(1), [search, deptId, fyStartYear]);

  const paged = useMemo(() => {
    const start = (page - 1) * ITEMS;
    return section1Table.slice(start, start + ITEMS);
  }, [section1Table, page]);

  const exportExcel = () => {
    const headers = [
      "Month", "Department", "Revenue", "Verto Fee", "TDS", "Invoice Count"
    ];

    const rowsX = section1Table.map((r) => [
      r.month, r.dept, r.Revenue, r["Verto Fee"], r.TDS, r.Invoices
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rowsX]);
    ws["!cols"] = headers.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, "Department P&L");

    XLSX.writeFile(
      wb,
      `DeptReports_${fy.label.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center animate-pulse">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Loading Department Reports…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4">
        <div className="font-bold text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Error
        </div>
        <div className="text-xs mt-2">{error}</div>
        <button 
          onClick={fetchAll}
          className="mt-3 px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-200 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const totalPages = Math.ceil(section1Table.length / ITEMS);

  return (
    <div className="space-y-6 pb-10 bg-gray-50/60 min-h-screen" style={{ fontFamily: "'DM Sans', 'Geist', sans-serif" }}>
      <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" /> Department Reports
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAdmin ? "Admin / Management view" : `Department: ${userDeptName || "(locked)"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FYSelector startYear={fyStartYear} onChange={setFyStartYear} />
          <button
            onClick={fetchAll}
            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition disabled:opacity-40"
            title="Refresh"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={exportExcel}
            disabled={section1Table.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* Role-based department selector */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Search (Section 1 table)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Department / month…"
                className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-200"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {isAdmin ? (
            <div className="min-w-[260px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</label>
              <div className="relative">
                <select
                  value={deptId || ""}
                  onChange={(e) => setDeptId(Number(e.target.value))}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-200"
                >
                  {allDepts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.dept_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div className="min-w-[260px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</label>
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                {userDeptName || "(locked)"}
              </div>
            </div>
          )}
        </div>
      </div>

      <SH icon={TrendingUp} title="Department P&L Overview" color={P.steel} count={`${rpcRevenue.length} rows`} />

      {/* Section 1 KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="Total Revenue" value={fmt(kpi.total_revenue)} sub={`FY ${fy.label}`} icon={FileText} color={P.steel} />
        <KpiCard label="Verto Fee" value={fmt(kpi.total_fee)} sub="Fee earned" icon={TrendingUp} color={P.trend} />
        <KpiCard label="Fee / Revenue %" value={`${kpi.fee_to_revenue_pct.toFixed(1)}%`} sub="verto_fee / total_revenue" icon={Wallet} color={P.sky} />
        <KpiCard label="Total TDS" value={fmt(kpi.total_tds)} sub="tax deducted at source" icon={CreditCard} color={P.amber} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <ChartCard
          title="Revenue Detail by Month"
          subtitle="Monthly breakdown"
        >
          {section1Table.length === 0 ? (
            <Empty />
          ) : (
            <>
              <DataTable
                maxHeight={380}
                columns={[
                  { header: "Month",       key: "month",         className: "text-slate-500" },
                  { header: "Department",  key: "dept",      className: "font-medium text-slate-800" },
                  { header: "Revenue",     key: "Revenue",  align: "right", formatter: (v) => <span className="font-semibold text-slate-700">{fmt(v)}</span> },
                  { header: "Verto Fee",   key: "Verto Fee", align: "right", formatter: (v) => <span className="font-semibold text-slate-700">{fmt(v)}</span> },
                  { header: "TDS",         key: "TDS",      align: "right", formatter: (v) => <span className="text-rose-600 font-semibold">{Number(v) > 0 ? fmt(v) : "—"}</span> },
                  { header: "Invoices",    key: "Invoices", align: "right", formatter: (v) => <span className="text-slate-500">{v}</span> },
                ]}
                data={paged}
              />
              <div className="px-1 pt-3 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{(page - 1) * ITEMS + 1}</span>–
                  <span className="font-semibold text-slate-700">{Math.min(page * ITEMS, section1Table.length)}</span> of <span className="font-semibold text-slate-700">{section1Table.length}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                  >
                    ‹
                  </button>
                  <span className="text-xs font-bold text-slate-600">{page}/{Math.max(1, totalPages)}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* SECTION 2 */}
      <SH icon={TrendingUp} title="Revenue & Fee Growth" color={P.teal} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          label="Revenue Growth % (MoM)"
          value={`${growth.revMoM.toFixed(1)}%`}
          sub="current vs prev month"
          icon={TrendingUp}
          color={P.steel}
        />
        <KpiCard
          label="Fee Growth % (MoM)"
          value={`${growth.feeMoM.toFixed(1)}%`}
          sub="current vs prev month"
          icon={TrendingUp}
          color={P.trend}
        />
        <KpiCard
          label="Revenue (Current Month)"
          value={fmt(growth.last?.rev)}
          sub={growth.last?.ym ? fmtMonth(growth.last.ym) : "—"}
          icon={FileText}
          color={P.steel}
        />
        <KpiCard
          label="Fee (Current Month)"
          value={fmt(growth.last?.fee)}
          sub={growth.last?.ym ? fmtMonth(growth.last.ym) : "—"}
          icon={Wallet}
          color={P.trend}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Monthly Revenue vs Fee" subtitle="Computed from department revenue RPC">
          <div className="text-xs text-slate-500">Monthly breakdown:</div>
          {growth.months.slice(-6).map((m, i) => (
            <div key={`${m.ym}-${i}`} className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="font-semibold text-slate-700">{fmtMonth(m.ym)}</span>
              <span className="text-slate-600 tabular-nums">Rev: {fmt(m.rev)} · Fee: {fmt(m.fee)}</span>
            </div>
          ))}
        </ChartCard>
        <ChartCard title="Salary Breakdown" subtitle="Internal vs External salary costs">
          {rpcSalary.length === 0 ? <Empty msg="No salary data" /> : (
            <div className="space-y-2">
              {rpcSalary.slice(-6).map((r, i) => (
                <div key={`${r.month}-${i}`} className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-700">{fmtMonth(r.month)}</span>
                  <span className="text-xs font-bold tabular-nums text-slate-700">
                    Internal: {fmt(r.total_internal_salary)} · External: {fmt(r.total_external_salary)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* SECTION 4 Manpower */}
      <SH icon={Users} title="Manpower" color={P.plum} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="Internal Headcount"  value={fmtCount(kpi.internal_headcount)}  sub="Active employees"      icon={Users}     color={P.slate} />
        <KpiCard label="External Headcount"  value={fmtCount(kpi.external_headcount)}  sub="OS payout employees"   icon={Users}     color={P.clay} />
        <KpiCard label="Internal / External" value={kpi.external_headcount ? (kpi.internal_headcount / kpi.external_headcount).toFixed(2) : "—"} sub="ratio" icon={TrendingUp} color={P.teal} />
        <KpiCard label="Revenue per Ext Head" value={fmt(kpi.revenue_per_ext_head)} sub="revenue / external_headcount" icon={FileText} color={P.steel} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Manpower Trend" subtitle="Internal vs External headcount">
          {rpcManpower.length === 0 ? <Empty msg="No manpower data" /> : (
            <div className="space-y-2">
              {rpcManpower.slice(-6).map((r, i) => (
                <div key={`${r.month}-${i}`} className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-700">{fmtMonth(r.month)}</span>
                  <span className="text-xs font-bold tabular-nums text-slate-700">
                    Internal: {r.internal_headcount} · External: {r.external_headcount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
        <ChartCard title="Attrition Summary" subtitle="Active vs Inactive employees">
          {rpcAttrition.length === 0 ? <Empty msg="No attrition data" /> : (
            <div className="space-y-2">
              {rpcAttrition.slice(-6).map((r, i) => (
                <div key={`${r.department || r.month}-${i}`} className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-700">{fmtMonth(r.month)}</span>
                  <span className="text-xs font-bold tabular-nums text-slate-700">
                    Active: {r.total_active} · Inactive: {r.total_inactive} · Tenure: {r.avg_tenure_months?.toFixed(1)}m
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* SECTION 5 Cost Ratios */}
      <SH icon={Wallet} title="Cost Ratios" color={P.sky} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="Salary to Internal Exp"  value={`${Number(rpcRatios[0]?.salary_to_internal_exp || 0).toFixed(1)}%`}  sub="salary / all internal expense" icon={Wallet}       color={P.plum} />
        <KpiCard label="Dept Salary to Fee"       value={`${Number(rpcRatios[0]?.dept_salary_to_dept_fee || 0).toFixed(1)}%`} sub="salary / dept verto fee"        icon={TrendingUp}  color={P.amber} />
        <KpiCard label="Variable to Fixed"        value={`${Number(rpcRatios[0]?.variable_to_fixed || 0).toFixed(1)}%`}       sub="variable / fixed salary"       icon={CreditCard}  color={P.clay} />
        <KpiCard label="Reimbursement to Fixed"   value={`${Number(rpcRatios[0]?.reimbursement_to_fixed || 0).toFixed(1)}%`}  sub="reimb / fixed salary"          icon={FileText}    color={P.sky} />
      </div>

      {/* SECTION 6 HR Intelligence */}
      <SH icon={Users} title="HR Intelligence" color={P.slate} />

      {upcomingDates.alertCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4" />
          <div className="text-xs font-semibold">
            Upcoming people events this week: <span className="tabular-nums">{upcomingDates.alertCount}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="Active Headcount" value={fmtCount(hrKPIs.active)} sub="status=Active" icon={Users} color={P.teal} />
        <KpiCard label="Inactive Headcount" value={fmtCount(hrKPIs.inactive)} sub="status=Inactive" icon={Users} color={P.brick} />
        <KpiCard label="Total Employees" value={fmtCount(hrKPIs.totalEmployees)} sub="all records" icon={Users} color={P.slate} />
        <KpiCard label="Avg Tenure" value={`${(hrKPIs.avgTenureMonths / 12).toFixed(1)} yrs`} sub="based on doj" icon={Calendar} color={P.sky} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Upcoming Birthdays" subtitle="next 30 days">
          {!upcomingDates.hasDob ? (
            <Empty msg="Birthdays unavailable" />
          ) : upcomingDates.birthdays.length === 0 ? (
            <Empty msg="No birthdays in next 30 days" />
          ) : (
            <div className="space-y-2">
              {upcomingDates.birthdays.slice(0, 10).map((b, i) => (
                <div key={`${b.name}-${b.birthday_this_year}-${i}`} className="flex items-center justify-between py-1 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-semibold text-slate-700">{b.name}</span>
                    <span className="ml-2 text-[10px] text-slate-400">{b.designation}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-700">{fmtDate(b.birthday_this_year)}</span>
                    <span className="ml-2 text-[10px] text-amber-600 font-semibold">{b.days_until}d away</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Work Anniversaries" subtitle="next 30 days">
          {upcomingDates.anniversaries.length === 0 ? (
            <Empty msg="No anniversaries in next 30 days" />
          ) : (
            <div className="space-y-2">
              {upcomingDates.anniversaries.slice(0, 10).map((a, i) => (
                <div key={`${a.name}-${a.anniversary_date}-${i}`} className="flex items-center justify-between py-1 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-semibold text-slate-700">{a.name}</span>
                    <span className="ml-2 text-[10px] text-slate-400">{a.years_completed} yr{a.years_completed !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-700">{fmtDate(a.anniversary_date)}</span>
                    <span className="ml-2 text-[10px] text-blue-600 font-semibold">{a.days_until}d away</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* SECTION 7 Client Advances */}
      {rpcClientAdv.length > 0 && (
        <>
          <SH icon={Wallet} title="Client Advances" color={P.amber} count={`${rpcClientAdv.length} clients`} />
          <DataTable
            maxHeight={280}
            columns={[
              { header: "Client",        key: "client_name",    className: "font-medium text-slate-800" },
              { header: "Total Advanced", key: "total_advanced", align: "right", formatter: (v) => <span className="font-semibold text-orange-700">{fmt(v)}</span> },
              { header: "Paid Back",     key: "total_paid_back", align: "right", formatter: (v) => <span className="text-emerald-600 font-semibold">{fmt(v)}</span> },
              { header: "Pending",       key: "pending_due",     align: "right", formatter: (v) => <span className={Number(v) > 0 ? "text-rose-600 font-bold" : "text-slate-300"}>{Number(v) > 0 ? fmt(v) : "—"}</span> },
              { header: "Status",        key: "status",          formatter: (v) => <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v === "Closed" ? "bg-emerald-100 text-emerald-700" : v === "Partially Paid" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>{v}</span> },
              { header: "Count",         key: "advance_count",  align: "right", formatter: (v) => <span className="text-slate-500">{v}</span> },
            ]}
            data={rpcClientAdv}
          />
        </>
      )}
    </div>
  );
};

export default DeptReports;