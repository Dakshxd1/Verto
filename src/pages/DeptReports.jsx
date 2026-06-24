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
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Clock,
  XCircle,
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
  emerald: "#2F8577",
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

const KpiCard = ({ label, value, sub, icon: Icon, color, trend, highlight }) => (
  <div className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-200 ${trend != null ? (trend >= 0 ? "border-emerald-200" : "border-rose-200") : "border-slate-200"} ${highlight ? "ring-1 ring-blue-200/60" : ""}`}>
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

const WcBadge = ({ overdue }) => overdue
  ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-600">Overdue</span>
  : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Upcoming</span>;

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
  const [deptId, setDeptId] = useState(null); // null = All Departments

  // ── Change 5: Custom date range states ──────────────────────────────
  const [customStart, setCustomStart] = useState("");  // "YYYY-MM-DD" or ""
  const [customEnd,   setCustomEnd]   = useState("");

  // RPC STATES
  const [rpcRevenue, setRpcRevenue] = useState([]);
  const [rpcSalary, setRpcSalary] = useState([]);
  const [rpcNonSalary, setRpcNonSalary] = useState([]);
  const [rpcManpower, setRpcManpower] = useState([]);
  const [rpcAttrition, setRpcAttrition] = useState([]);
  const [rpcRatios, setRpcRatios] = useState([]);
  const [rpcBirthdays, setRpcBirthdays] = useState([]);
  const [rpcAnniversaries, setRpcAnniversaries] = useState([]);
  const [rpcClientAdv, setRpcClientAdv] = useState([]);
  
  // ── P&L states ──────────────────────────────────────────────────────────
  const [rpcProfit, setRpcProfit] = useState([]);
  const [rpcClientProfit, setRpcClientProfit] = useState([]);

  // ── Working Capital state ──────────────────────────────────────────────────
  const [wcBanks,       setWcBanks]       = useState([]);
  const [wcBalances,    setWcBalances]    = useState([]);
  const [wcCollections, setWcCollections] = useState([]);
  const [wcPayables,    setWcPayables]    = useState([]);
  const [wcStatutory,   setWcStatutory]   = useState([]);
  const [wcForecast,    setWcForecast]    = useState([]);
  const [wcSelectedBank, setWcSelectedBank] = useState(null);
  const [wcLoading,     setWcLoading]     = useState(false);

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
        // REMOVED auto-select — deptId stays null = All Departments
      } else {
        setDeptId(resolvedDeptId);
      }

      // 3) Effective dept for all RPC calls — null = All Departments
      const effectiveDeptId = resolvedIsAdmin ? deptId : resolvedDeptId;
      
      // ── Change 5: Custom date range overrides FY ────────────────────
      const p_start = customStart || fy.start;
      const p_end   = customEnd   || fy.end;

      // 4) Fetch all 11 RPCs in parallel (added 2 P&L RPCs)
      const [
        dRevenue, dSalary, dNonSalary, dManpower,
        dAttrition, dRatios, dBirthdays, dAnniv, dClientAdv,
        dProfit, dClientProfit
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
        supabase.rpc("get_dept_report_profit",         { p_start, p_end, p_dept_id: effectiveDeptId }),
        supabase.rpc("get_dept_report_client_profit",  { p_start, p_end, p_dept_id: effectiveDeptId, p_limit: 50 }),
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
      setRpcProfit(extractData(dProfit));
      setRpcClientProfit(extractData(dClientProfit));

    } catch (e) {
      console.error("FETCH ERROR:", e);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [fy.start, fy.end, deptId, customStart, customEnd]);

  // ── Working Capital fetch ──────────────────────────────────────────────────
  const fetchWorkingCapital = useCallback(async (bankId = null) => {
    setWcLoading(true);
    try {
      const p = bankId || null;
      const [rBanks, rCol, rPay, rStat, rFore] = await Promise.all([
        supabase.rpc("get_working_capital_bank_balances",    { p_bank_id: p }),
        supabase.rpc("get_working_capital_collections",       { p_bank_id: p }),
        supabase.rpc("get_working_capital_os_payables",       { p_bank_id: p }),
        supabase.rpc("get_working_capital_statutory",         { p_bank_id: p }),
        supabase.rpc("get_working_capital_weekly_forecast",   { p_bank_id: p }),
      ]);
      const ex = (r) => (Array.isArray(r?.data) ? r.data : []);
      const bal = ex(rBanks);
      setWcBanks(bal);
      setWcBalances(bal);
      setWcCollections(ex(rCol));
      setWcPayables(ex(rPay));
      setWcStatutory(ex(rStat));
      setWcForecast(ex(rFore));
    } catch (e) {
      console.error("WC fetch error:", e);
    } finally {
      setWcLoading(false);
    }
  }, []);

  // ── Change 5: Added customStart, customEnd to dependency array ────
  useEffect(() => {
    fetchAll();
  }, [fyStartYear, deptId, customStart, customEnd]);

  useEffect(() => {
    fetchWorkingCapital(wcSelectedBank);
  }, [wcSelectedBank]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
// AFTER — correct, sums ALL rows for headcount/cost, rat0 only for % ratios
const kpi = useMemo(() => {
  const rev = rpcRevenue.reduce((s, r) => s + Number(r.total_revenue || 0), 0);
  const fee = rpcRevenue.reduce((s, r) => s + Number(r.total_fee || 0), 0);
  const tds = rpcRevenue.reduce((s, r) => s + Number(r.total_tds || 0), 0);

  const revDepts = ['Operations', 'Recruitment', 'Temporary', 'Projects'];
  const rat = rpcRatios.filter(r => revDepts.includes(r.dept_name));
  const rat0 = rat[0] || rpcRatios[0] || {};

  // ── Sum headcount across ALL dept rows returned ──────────────────
  const internal_headcount = rpcRatios.reduce((s, r) => s + Number(r.internal_headcount || 0), 0);
  const external_headcount = rpcRatios.reduce((s, r) => s + Number(r.external_headcount || 0), 0);
  const total_internal_salary = rpcRatios.reduce((s, r) => s + Number(r.total_internal_salary || 0), 0);
  const total_external_cost   = rpcRatios.reduce((s, r) => s + Number(r.total_external_cost   || 0), 0);
  const total_non_salary      = rpcRatios.reduce((s, r) => s + Number(r.total_non_salary      || 0), 0);

  // revenue_per_ext_head: recalculate from summed totals
  const revenue_per_ext_head = external_headcount > 0 ? rev / external_headcount : 0;

  // % ratios: still use rat0 (dept-level % doesn't aggregate by summing)
  const totalMgmtCost  = Number(rpcRatios[0]?.total_mgmt_cost || 0);
  const totalEmpCost   = Number(rpcRatios[0]?.total_emp_cost  || 0);
  const adminMgmtRatio = totalEmpCost ? (totalMgmtCost / totalEmpCost * 100) : 0;

  const bdRow  = rpcRatios.find(r => r.dept_name === 'Business Development' || r.dept_name === 'BD');
  const bdCost = Number(bdRow?.total_internal_salary || 0);

  return {
    total_revenue:        rev,
    total_fee:            fee,
    total_tds:            tds,
    fee_to_revenue_pct:   Number(rat0.fee_to_revenue || 0),
    internal_salary:      total_internal_salary,
    external_cost:        total_external_cost,
    non_salary_exp:       total_non_salary,
    internal_headcount,   // ← now sum of ALL depts from internal_team
    external_headcount,   // ← now sum of ALL depts
    revenue_per_ext_head, // ← recalculated from sums
    dept_salary_to_fee:   Number(rat0.dept_salary_to_dept_fee || 0),
    totalMgmtCost,
    totalEmpCost,
    adminMgmtRatio,
    bdCost,
  };
}, [rpcRevenue, rpcRatios]);

  // ── Revenue Growth ──────────────────────────────────────────────────────
  const growth = useMemo(() => {
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

  // ── Salary by Month ─────────────────────────────────────────────────────
  const salByMonth = useMemo(() => {
    const map = new Map();
    for (const r of rpcSalary) {
      const m = r.month;
      if (!m) continue;
      if (!map.has(m)) map.set(m, { month: m, fixed: 0, variable: 0, reimb: 0, total: 0 });
      const entry = map.get(m);
      entry.total += Number(r.net_payment || 0);
      if (r.pay_head === 'Fixed Salary')   entry.fixed    += Number(r.net_payment || 0);
      if (r.pay_head === 'Variable Salary' || r.pay_head === 'Incentive') entry.variable += Number(r.net_payment || 0);
      if (r.pay_head === 'Reimbursement')  entry.reimb    += Number(r.net_payment || 0);
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [rpcSalary]);

  // ── HR KPIs ─────────────────────────────────────────────────────────────
  // ── Change 1: Add avgAge ──────────────────────────────────────────────
  const hrKPIs = useMemo(() => {
    const active    = rpcAttrition.reduce((s, r) => s + Number(r.total_active    || 0), 0);
    const inactive  = rpcAttrition.reduce((s, r) => s + Number(r.total_inactive  || 0), 0);
    const avgTenure = rpcAttrition.length
      ? rpcAttrition.reduce((s, r) => s + Number(r.avg_tenure_months || 0), 0) / rpcAttrition.length
      : 0;
    // avg_age_years: weighted by active headcount per dept
    const totalActive = rpcAttrition.reduce((s, r) => s + Number(r.total_active || 0), 0);
    const weightedAge = rpcAttrition.reduce((s, r) =>
      s + (Number(r.avg_age_years || 0) * Number(r.total_active || 0)), 0);
    const avgAge = totalActive > 0 ? weightedAge / totalActive : 0;
    return { active, inactive, totalEmployees: active + inactive, avgTenureMonths: avgTenure, avgAge };
  }, [rpcAttrition]);

  // ── Birthday / Anniversary alerts ──────────────────────────────────────
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

  // ── Working Capital Summary ────────────────────────────────────────────
  const wcSummary = useMemo(() => {
    const totalCash        = wcBalances.reduce((s, b) => s + Number(b.current_balance || 0), 0);
    const totalOutstanding = wcCollections.reduce((s, c) => s + Number(c.outstanding || 0), 0);
    const overdueCol       = wcCollections.filter(c => c.is_overdue).reduce((s, c) => s + Number(c.outstanding || 0), 0);
    const totalPayables    = wcPayables.reduce((s, p) => s + Number(p.os_amt_difference || 0), 0);
    const totalStatutory   = wcStatutory.reduce((s, s2) => s + Number(s2.pending_due || 0), 0);
    const currentWeek      = wcForecast.find(f => f.week_offset === 0) || {};
    return { totalCash, totalOutstanding, overdueCol, totalPayables, totalStatutory, currentWeek };
  }, [wcBalances, wcCollections, wcPayables, wcStatutory, wcForecast]);

  // ── Section 1 Table ─────────────────────────────────────────────────────
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

  // Filter departments for cost ratio tables
  const revDepts = ['Operations', 'Recruitment', 'Temporary', 'Projects'];

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
                  onChange={(e) => setDeptId(e.target.value || null)}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-200"
                >
                  <option value="">All Departments</option>
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

          {/* ── Change 5: Custom date range pickers ────────────────────── */}
          <div className="min-w-[150px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">From Date</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">To Date</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
          </div>
          {(customStart || customEnd) && (
            <div className="flex items-end">
              <button
                onClick={() => { setCustomStart(""); setCustomEnd(""); }}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-500 hover:bg-slate-50 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear dates
              </button>
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
          {salByMonth.length === 0 ? <Empty msg="No salary data" /> : (
            <div className="space-y-2">
              {salByMonth.slice(-6).map((r, i) => (
                <div key={`${r.month}-${i}`} className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-700">{fmtMonth(r.month)}</span>
                  <span className="text-xs font-bold tabular-nums text-slate-700">
                    Fixed: {fmt(r.fixed)} · Var: {fmt(r.variable)} · Reimb: {fmt(r.reimb)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Change 2: Non-Salary Expenses section ────────────────────── */}
      <SH icon={CreditCard} title="Non-Salary Expenses" color={P.clay} />
      {rpcNonSalary.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <Empty msg="No non-salary expense data" />
        </div>
      ) : (() => {
        // Pivot: get all unique pay_heads as columns
        const heads = [...new Set(rpcNonSalary.map(r => r.pay_head))].sort();
        // Group by month
        const byMonth = new Map();
        for (const r of rpcNonSalary) {
          const key = r.month || "—";
          if (!byMonth.has(key)) byMonth.set(key, { month: key, dept: r.department || "", total: 0 });
          byMonth.get(key)[r.pay_head] = (byMonth.get(key)[r.pay_head] || 0) + Number(r.total_amount || 0);
          byMonth.get(key).total += Number(r.total_amount || 0);
        }
        const rows = Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
        const grandTotal = rows.reduce((s, r) => s + r.total, 0);

        return (
          <ChartCard title="Non-Salary Expense Breakdown" subtitle="CC Bill · Mobile · Internet · Repair & other heads">
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                  <tr>
                    <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Month</th>
                    {heads.map((h, i) => (
                      <th key={i} className="text-right py-2 pr-3 text-slate-400 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                    <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2 pr-3 font-semibold text-slate-700">{fmtMonth(r.month)}</td>
                      {heads.map((h, j) => (
                        <td key={j} className="py-2 pr-3 text-right tabular-nums text-slate-600">
                          {r[h] ? fmt(r[h]) : "—"}
                        </td>
                      ))}
                      <td className="py-2 pr-3 text-right tabular-nums font-bold text-slate-800">{fmt(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200">
                  <tr className="bg-slate-50/60">
                    <td className="py-2 pr-3 font-bold text-slate-700 text-xs">Grand Total</td>
                    {heads.map((h, i) => (
                      <td key={i} className="py-2 pr-3 text-right tabular-nums font-semibold text-slate-700">
                        {fmt(rows.reduce((s, r) => s + (r[h] || 0), 0))}
                      </td>
                    ))}
                    <td className="py-2 pr-3 text-right tabular-nums font-black text-slate-900">{fmt(grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </ChartCard>
        );
      })()}

      {/* SECTION 3 — Profit (Pre & Post TDS) */}
      <SH icon={TrendingUp} title="Profit & P&L" color={P.emerald} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {(() => {
          const totPreTds  = rpcProfit.reduce((s, r) => s + Number(r.profit_pre_tds  || 0), 0);
          const totPostTds = rpcProfit.reduce((s, r) => s + Number(r.profit_post_tds || 0), 0);
          const totActual  = rpcProfit.reduce((s, r) => s + Number(r.actual_profit   || 0), 0);
          const totFee     = rpcProfit.reduce((s, r) => s + Number(r.verto_fee_earned|| 0), 0);
          const avgMargin  = totFee ? (totPreTds / totFee * 100) : 0;
          return (<>
            <KpiCard label="Profit Pre-TDS"      value={fmt(totPreTds)}  sub="Fee − Expenses"          icon={TrendingUp}  color={P.teal}    trend={totPreTds  >= 0 ? 1 : -1} />
            <KpiCard label="Profit Post-TDS"     value={fmt(totPostTds)} sub="Pre-TDS − TDS"           icon={TrendingUp}  color={P.emerald} trend={totPostTds >= 0 ? 1 : -1} />
            <KpiCard label="Actual Cash Profit"  value={fmt(totActual)}  sub="Based on amount received" icon={CheckCircle} color={P.sky}     trend={totActual  >= 0 ? 1 : -1} />
            <KpiCard label="Avg Profit Margin"   value={`${avgMargin.toFixed(1)}%`} sub="Pre-TDS / Fee" icon={BarChart2} color={P.plum} />
          </>);
        })()}
      </div>

      {/* Dept-wise P&L Table */}
      <ChartCard title="Department-wise P&L" subtitle="Revenue → Fee → Expense → Profit">
        {rpcProfit.length === 0 ? <Empty /> : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-100">
                <tr>
                  {["Month","Dept","Invoice","Fee Earned","TDS","Expense","Profit Pre-TDS","Profit Post-TDS","Actual Profit","Margin%"].map((h,i) => (
                    <th key={i} className={`py-2 pr-3 text-slate-400 font-semibold ${i>1?"text-right":"text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rpcProfit.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-2 pr-3 text-slate-500">{r.month}</td>
                    <td className="py-2 pr-3 font-semibold text-slate-800">{r.dept_name}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{fmt(r.total_invoice)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-semibold text-slate-700">{fmt(r.verto_fee_earned)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-rose-500">{fmt(r.tds)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-amber-600">{fmt(r.monthly_expense)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className={Number(r.profit_pre_tds)>=0?"text-emerald-600 font-bold":"text-rose-600 font-bold"}>{fmt(r.profit_pre_tds)}</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className={Number(r.profit_post_tds)>=0?"text-emerald-600 font-semibold":"text-rose-500 font-semibold"}>{fmt(r.profit_post_tds)}</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className={Number(r.actual_profit)>=0?"text-sky-600 font-semibold":"text-slate-400"}>{fmt(r.actual_profit)}</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className={`font-bold ${Number(r.margin_pct)>=30?"text-emerald-600":Number(r.margin_pct)>=0?"text-amber-600":"text-rose-600"}`}>
                        {Number(r.margin_pct||0).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {/* Client-wise P&L Table */}
      <SH icon={TrendingUp} title="Client-wise P&L" color={P.sky} count={`${rpcClientProfit.length} rows`} />
      <ChartCard title="Client P&L Breakdown" subtitle="Fee earned, expenses, profit pre & post TDS per client">
        {rpcClientProfit.length === 0 ? <Empty /> : (
          <div className="overflow-auto" style={{ maxHeight: 420 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr>
                  {["Client","Dept","Month","Invoice","Fee Earned","TDS","Expense","Profit Pre-TDS","Profit Post-TDS","Actual Profit","Pending"].map((h,i) => (
                    <th key={i} className={`py-2 pr-3 text-slate-400 font-semibold ${i>2?"text-right":"text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rpcClientProfit.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-2 pr-3 font-medium text-slate-800 max-w-[160px] truncate">{r.client_name}</td>
                    <td className="py-2 pr-3 text-slate-500">{r.dept_name}</td>
                    <td className="py-2 pr-3 text-slate-400">{r.month}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{fmt(r.total_invoice)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-semibold text-slate-700">{fmt(r.verto_fee_earned)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-rose-500">{Number(r.tds)>0?fmt(r.tds):"—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-amber-600">{fmt(r.total_expense)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className={Number(r.profit_pre_tds)>=0?"text-emerald-600 font-bold":"text-rose-600 font-bold"}>{fmt(r.profit_pre_tds)}</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className={Number(r.profit_post_tds)>=0?"text-emerald-600 font-semibold":"text-rose-500 font-semibold"}>{fmt(r.profit_post_tds)}</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className={Number(r.actual_profit)>=0?"text-sky-600 font-semibold":"text-slate-400"}>{fmt(r.actual_profit)}</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className={Number(r.money_not_received)>0?"text-rose-500 font-semibold":"text-slate-300"}>
                        {Number(r.money_not_received)>0?fmt(r.money_not_received):"—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {/* ── Change 3: Amount Not Received from Client ────────────────── */}
      {(() => {
        const unpaid = rpcClientProfit
          .filter(r => Number(r.money_not_received || 0) > 0)
          .sort((a, b) => Number(b.money_not_received) - Number(a.money_not_received));
        const totalUnpaid = unpaid.reduce((s, r) => s + Number(r.money_not_received || 0), 0);
        if (unpaid.length === 0) return null;
        return (
          <>
            <SH icon={AlertTriangle} title="Amount Paid but Not Yet Received" color={P.brick} count={`${unpaid.length} clients`} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
              <KpiCard
                label="Total Unreceived Amount"
                value={fmt(totalUnpaid)}
                sub="Invoiced + paid but not collected"
                icon={AlertTriangle}
                color={P.brick}
              />
              <KpiCard
                label="Clients with Pending Receipt"
                value={String(unpaid.length)}
                sub="from current filter"
                icon={Users}
                color={P.amber}
              />
              <KpiCard
                label="Largest Single Pending"
                value={fmt(unpaid[0]?.money_not_received)}
                sub={unpaid[0]?.client_name || "—"}
                icon={FileText}
                color={P.slate}
              />
            </div>
            <ChartCard title="Client-wise Unreceived Amounts" subtitle="Sorted by amount pending — invoiced but cash not yet in">
              <div className="overflow-auto" style={{ maxHeight: 320 }}>
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                    <tr>
                      <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Client</th>
                      <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Department</th>
                      <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Month</th>
                      <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Fee Earned</th>
                      <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Actual Profit</th>
                      <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Not Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {unpaid.map((r, i) => (
                      <tr key={i} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-2 pr-3 font-medium text-slate-800 max-w-[160px] truncate">{r.client_name}</td>
                        <td className="py-2 pr-3 text-slate-500">{r.dept_name}</td>
                        <td className="py-2 pr-3 text-slate-400">{r.month}</td>
                        <td className="py-2 pr-3 text-right tabular-nums font-semibold text-slate-700">{fmt(r.verto_fee_earned)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          <span className={Number(r.actual_profit) >= 0 ? "text-emerald-600" : "text-rose-500"}>
                            {fmt(r.actual_profit)}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          <span className="font-bold text-rose-600">{fmt(r.money_not_received)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </>
        );
      })()}

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
                  <span className="text-xs font-semibold text-slate-700">{r.month}</span>
                  <span className="text-xs font-bold tabular-nums text-slate-700">
                    Internal: {Number(r.internal_headcount || 0)} · External: {Number(r.external_headcount || 0)}
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
                <div key={`${r.department}-${i}`} className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-700">{r.department}</span>
                  {/* ── Change 1: Added Age to attrition card ── */}
                  <span className="text-xs font-bold tabular-nums text-slate-700">
                    Active: {r.total_active} · Inactive: {r.total_inactive} · Attrition: {Number(r.attrition_rate||0).toFixed(1)}% · Tenure: {Number(r.avg_tenure_months||0).toFixed(1)}m · Age: {Number(r.avg_age_years||0).toFixed(1)}y
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* SECTION 5 Cost Ratios — Department-wise table */}
      <SH icon={Wallet} title="Cost Ratios by Department" color={P.sky} />
      <div className="overflow-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
            <tr>
              <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Department</th>
              <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Fee / Revenue %</th>
              <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Salary / Fee %</th>
              <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Variable / Fixed %</th>
              <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Reimb / Fixed %</th>
              <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Salary / Exp %</th>
              <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Cost/Head</th>
              <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Rev/Ext Head</th>
              <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Mgmt Cost %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rpcRatios
              .filter(r => revDepts.includes(r.dept_name))
              .map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-2.5 pr-3 font-semibold text-slate-800">{r.dept_name}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  <span className="font-semibold text-slate-700">{r.fee_to_revenue != null ? `${Number(r.fee_to_revenue).toFixed(1)}%` : "—"}</span>
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  <span className={`font-semibold ${Number(r.dept_salary_to_dept_fee) > 80 ? "text-rose-600" : Number(r.dept_salary_to_dept_fee) > 60 ? "text-amber-600" : "text-emerald-600"}`}>
                    {r.dept_salary_to_dept_fee != null ? `${Number(r.dept_salary_to_dept_fee).toFixed(1)}%` : "—"}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                  {r.variable_to_fixed != null ? `${Number(r.variable_to_fixed).toFixed(1)}%` : "—"}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                  {r.reimbursement_to_fixed != null ? `${Number(r.reimbursement_to_fixed).toFixed(1)}%` : "—"}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                  {r.salary_to_internal_exp != null ? `${Number(r.salary_to_internal_exp).toFixed(1)}%` : "—"}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                  {r.internal_cost_per_head != null ? fmt(r.internal_cost_per_head) : "—"}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                  {r.revenue_per_ext_head != null ? fmt(r.revenue_per_ext_head) : "—"}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  <span className={`font-bold ${Number(r.mgmt_cost_ratio) > 20 ? "text-rose-600" : Number(r.mgmt_cost_ratio) > 10 ? "text-amber-600" : "text-slate-500"}`}>
                    {r.mgmt_cost_ratio != null ? `${Number(r.mgmt_cost_ratio).toFixed(2)}%` : "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Change 4: Management + BD Cost — Admin summary only ────── */}
      {isAdmin && (
        <>
          <SH icon={Wallet} title="Management & BD Cost Overview" color={P.plum} />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard
              label="Total Mgmt Cost"
              value={fmt(kpi.totalMgmtCost)}
              sub="Management dept salary paid"
              icon={Wallet}
              color={P.plum}
            />
            <KpiCard
              label="Total Employee Cost"
              value={fmt(kpi.totalEmpCost)}
              sub="All employee_expense_payouts"
              icon={Users}
              color={P.slate}
            />
            <KpiCard
              label="Mgmt / Total Emp Cost"
              value={`${kpi.adminMgmtRatio.toFixed(2)}%`}
              sub="Overall management overhead"
              icon={TrendingUp}
              color={P.plum}
            />
            <KpiCard
              label="BD Cost / Total Emp Cost"
              value={kpi.totalEmpCost > 0 ? `${(kpi.bdCost / kpi.totalEmpCost * 100).toFixed(2)}%` : "—"}
              sub={`BD dept salary: ${fmt(kpi.bdCost)}`}
              icon={TrendingUp}
              color={P.sky}
            />
          </div>
        </>
      )}

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

      {/* ── Change 1: 5-card HR grid with Avg Age ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <KpiCard label="Active Headcount"   value={fmtCount(hrKPIs.active)}                             sub="status=Active"        icon={Users}    color={P.teal} />
        <KpiCard label="Inactive Headcount" value={fmtCount(hrKPIs.inactive)}                           sub="status=Inactive"      icon={Users}    color={P.brick} />
        <KpiCard label="Total Employees"    value={fmtCount(hrKPIs.totalEmployees)}                     sub="all records"          icon={Users}    color={P.slate} />
        <KpiCard label="Avg Tenure"         value={`${(hrKPIs.avgTenureMonths / 12).toFixed(1)} yrs`}   sub="based on doj"         icon={Calendar} color={P.sky} />
        <KpiCard label="Avg Age of Team"    value={hrKPIs.avgAge > 0 ? `${hrKPIs.avgAge.toFixed(1)} yrs` : "—"} sub="avg across active employees" icon={Users} color={P.amber} />
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

      {/* ════════════════════════════════════════════════════════════
          SECTION 8 — Working Capital (merged from WorkingCapital.jsx)
          ════════════════════════════════════════════════════════════ */}

      <div className="flex items-center justify-between flex-wrap gap-3 mt-8">
        <SH icon={Landmark} title="Working Capital" color={P.steel} />
        <div className="flex items-center gap-2 mb-4">
          {/* Bank selector */}
          <div className="relative">
            <select
              value={wcSelectedBank || ""}
              onChange={(e) => setWcSelectedBank(e.target.value || null)}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-200 min-w-[200px]"
            >
              <option value="">All Banks</option>
              {wcBanks.map((b) => (
                <option key={b.bank_id} value={b.bank_id}>{b.bank_name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
          </div>
          <button
            onClick={() => fetchWorkingCapital(wcSelectedBank)}
            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition"
            disabled={wcLoading}
          >
            <RefreshCw className={`w-4 h-4 ${wcLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Cash Position KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="Current Cash Balance"   value={fmt(wcSummary.totalCash)}        sub="Across all banks"                          icon={Landmark}     color={P.steel} highlight />
        <KpiCard label="Expected Collections"   value={fmt(wcSummary.totalOutstanding)}  sub={`${wcCollections.length} outstanding invoices`} icon={TrendingUp}   color={P.teal} />
        <KpiCard label="OS Payables"            value={fmt(wcSummary.totalPayables)}     sub={`${wcPayables.length} pending payouts`}    icon={TrendingUp} color={P.brick} />
        <KpiCard label="Statutory Pending"      value={fmt(wcSummary.totalStatutory)}    sub="GST / PF / ESI / TDS"                     icon={FileText}     color={P.amber} />
      </div>

      {/* Bank-wise balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {wcBalances.map((b) => (
          <div key={b.bank_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-bold text-slate-700 leading-tight max-w-[70%]">{b.bank_name}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${Number(b.current_balance) > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                {Number(b.current_balance) > 0 ? "Active" : "Zero"}
              </span>
            </div>
            <p className="text-xl font-black text-slate-900">{fmt(b.current_balance)}</p>
            <div className="mt-2 flex gap-3 text-[10px] text-slate-400">
              <span>Opening: {fmt(b.opening_balance)}</span>
              <span className="text-emerald-600">+{fmt(b.total_inflow)}</span>
              <span className="text-rose-500">-{fmt(b.total_outflow)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Forecast */}
      <SH icon={TrendingUp} title="Weekly Cash Forecast" color={P.teal} />

      {wcSummary.currentWeek?.week_label && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <KpiCard label="Opening Cash (Current Week)"      value={fmt(wcSummary.currentWeek.opening_cash)}   sub={fmtDate(wcSummary.currentWeek.week_start)} icon={Landmark}      color={P.slate} />
          <KpiCard label="Expected Inflow"                   value={fmt(wcSummary.currentWeek.expected_inflow)} sub="Collections due this week"                 icon={ArrowUpRight}  color={P.teal} />
          <KpiCard label="Expected Outflow (OS+Statutory)"   value={fmt(Number(wcSummary.currentWeek.expected_outflow_os || 0) + Number(wcSummary.currentWeek.expected_outflow_statutory || 0))} sub="Payables + Statutory" icon={ArrowDownRight} color={P.brick} />
          <KpiCard label="Projected Closing Cash"            value={fmt(wcSummary.currentWeek.closing_cash)}   sub="End of current week"                       icon={CheckCircle}   color={P.emerald} highlight />
        </div>
      )}

      <ChartCard title="W-5 to W+10 Cash Forecast" subtitle="Weekly projected cash position">
        {wcForecast.length === 0 ? <Empty msg="No forecast data" /> : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-100">
                <tr>
                  {["Week","Period","Opening","Inflow","OS Outflow","Statutory","Net","Closing"].map((h, i) => (
                    <th key={i} className={`py-2 pr-3 text-slate-400 font-semibold ${i > 1 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {wcForecast.map((w, i) => {
                  const isCurrent = w.week_offset === 0;
                  const isPast    = w.week_offset < 0;
                  return (
                    <tr key={i} className={`transition-colors ${isCurrent ? "bg-blue-50/60" : "hover:bg-slate-50/50"}`}>
                      <td className="py-2 pr-3">
                        <span className={`font-bold ${isCurrent ? "text-blue-600" : isPast ? "text-slate-400" : "text-slate-700"}`}>
                          {w.week_label}
                        </span>
                        {isCurrent && <span className="ml-1 text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">NOW</span>}
                      </td>
                      <td className="py-2 pr-3 text-slate-400">{fmtDate(w.week_start)} – {fmtDate(w.week_end)}</td>
                      <td className="py-2 pr-3 text-right text-slate-600 tabular-nums">{fmt(w.opening_cash)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        <span className={Number(w.expected_inflow) > 0 ? "text-emerald-600 font-semibold" : "text-slate-300"}>
                          {Number(w.expected_inflow) > 0 ? `+${fmt(w.expected_inflow)}` : "—"}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        <span className={Number(w.expected_outflow_os) > 0 ? "text-rose-500 font-semibold" : "text-slate-300"}>
                          {Number(w.expected_outflow_os) > 0 ? `-${fmt(w.expected_outflow_os)}` : "—"}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        <span className={Number(w.expected_outflow_statutory) > 0 ? "text-amber-600 font-semibold" : "text-slate-300"}>
                          {Number(w.expected_outflow_statutory) > 0 ? `-${fmt(w.expected_outflow_statutory)}` : "—"}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        <span className={Number(w.net_movement) >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                          {Number(w.net_movement) >= 0 ? `+${fmt(w.net_movement)}` : fmt(w.net_movement)}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-bold text-slate-800">{fmt(w.closing_cash)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {/* Outstanding Collections */}
      <SH icon={TrendingUp} title="Outstanding Collections" color={P.teal} />
      {wcCollections.filter(c => c.is_overdue).length > 0 && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs font-semibold">
            {wcCollections.filter(c => c.is_overdue).length} overdue invoices totalling {fmt(wcSummary.overdueCol)}
          </p>
        </div>
      )}
      <ChartCard title="Outstanding Invoices" subtitle="Expected collections with overdue status">
        {wcCollections.length === 0 ? <Empty msg="No outstanding collections" /> : (
          <div className="overflow-auto" style={{ maxHeight: 340 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-100">
                <tr>
                  {["Invoice","Client","Bank","Expected Date","Outstanding","Overdue Days","Status"].map((h, i) => (
                    <th key={i} className={`py-2 pr-3 text-slate-400 font-semibold ${i >= 4 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {wcCollections.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 pr-3 font-mono text-slate-500">{c.invoice_number}</td>
                    <td className="py-2 pr-3 font-medium text-slate-800 max-w-[160px] truncate">{c.client_name}</td>
                    <td className="py-2 pr-3 text-slate-400 text-[10px]">{c.bank_name}</td>
                    <td className="py-2 pr-3 text-slate-600">{fmtDate(c.expected_collection_date)}</td>
                    <td className="py-2 pr-3 text-right font-bold text-slate-800">{fmt(c.outstanding)}</td>
                    <td className="py-2 pr-3 text-right">
                      <span className={c.days_overdue > 0 ? "text-rose-600 font-bold" : "text-slate-400"}>
                        {c.days_overdue > 0 ? `${c.days_overdue}d` : "—"}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right"><WcBadge overdue={c.is_overdue} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {/* Payables & Statutory */}
      <SH icon={TrendingUp} title="Payables & Statutory" color={P.brick} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="OS Payables" subtitle="Pending payout obligations">
          {wcPayables.length === 0 ? <Empty msg="No OS payables" /> : (
            <div className="overflow-auto" style={{ maxHeight: 320 }}>
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white border-b border-slate-100">
                  <tr>
                    {["Invoice","Client","Due Date","Payable","Status"].map((h, i) => (
                      <th key={i} className={`py-2 pr-3 text-slate-400 font-semibold ${i >= 3 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {wcPayables.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2 pr-3 font-mono text-slate-500">{p.invoice_number}</td>
                      <td className="py-2 pr-3 font-medium text-slate-800 max-w-[130px] truncate">{p.client_name}</td>
                      <td className="py-2 pr-3 text-slate-500">{fmtDate(p.expected_outflow_date)}</td>
                      <td className="py-2 pr-3 text-right font-bold text-rose-600">{fmt(p.os_amt_difference)}</td>
                      <td className="py-2 pr-3 text-right"><WcBadge overdue={p.is_overdue} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Statutory Liabilities" subtitle="GST / PF / ESI / TDS pending">
          {wcStatutory.length === 0 ? <Empty msg="No statutory pending" /> : (
            <div className="space-y-3">
              {wcStatutory.map((s, i) => (
                <div key={i} className={`rounded-xl border p-3 ${s.is_overdue ? "border-rose-200 bg-rose-50/40" : "border-slate-200 bg-slate-50/40"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mr-2 ${
                        s.type === "GST" ? "bg-amber-100 text-amber-700" :
                        s.type === "PF"  ? "bg-blue-100 text-blue-700" :
                        s.type === "TDS" ? "bg-purple-100 text-purple-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>{s.type}</span>
                      <span className="text-xs font-semibold text-slate-700">{s.entity}</span>
                    </div>
                    <WcBadge overdue={s.is_overdue} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-slate-400">
                      Due: {fmtDate(s.payment_date)} · Month: {fmtDate(s.month)}
                    </span>
                    <span className="text-sm font-black text-rose-600">{fmt(s.pending_due)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">{s.bank_name}</div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

    </div>
  );
};

export default DeptReports;