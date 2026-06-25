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
  PieChart as PieIcon,
  Activity,
  Lightbulb,
  Flag,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, AreaChart, Area
} from "recharts";

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
  const [userRole, setUserRole] = useState('employee');

  const [allDepts, setAllDepts] = useState([]);
  const [deptId, setDeptId] = useState(null);

  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // ── NEW: Tab states for Birthdays/Anniversaries ──
  const [hrTab, setHrTab] = useState("birthdays");

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
  const [rpcProfit, setRpcProfit] = useState([]);
  const [rpcClientProfit, setRpcClientProfit] = useState([]);
  const [rpcClientRevenue, setRpcClientRevenue] = useState([]);

  // Working Capital state
  const [wcBanks, setWcBanks] = useState([]);
  const [wcBalances, setWcBalances] = useState([]);
  const [wcCollections, setWcCollections] = useState([]);
  const [wcPayables, setWcPayables] = useState([]);
  const [wcStatutory, setWcStatutory] = useState([]);
  const [wcForecast, setWcForecast] = useState([]);
  const [wcSelectedBank, setWcSelectedBank] = useState(null);
  const [wcLoading, setWcLoading] = useState(false);

  const [search, setSearch] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      if (!user) throw new Error("Not logged in");

      const { data: roleData, error: roleErr } = await supabase
        .rpc("get_user_dept_and_role", { p_email: user.email });
      if (roleErr) throw roleErr;

      const userInfo = roleData?.[0];
      const resolvedIsAdmin = userInfo?.is_admin ?? false;
      const resolvedDeptId = userInfo?.dept_id ?? null;
      const resolvedDeptName = userInfo?.dept_name ?? null;

      setIsAdmin(resolvedIsAdmin);
      setUserDeptName(resolvedDeptName || "(unknown)");
      setUserDeptId(resolvedDeptId);
      setUserRole(userInfo?.role ?? 'employee');

      if (resolvedIsAdmin) {
        const { data: depts } = await supabase
          .from("departments_master")
          .select("id, dept_name")
          .order("dept_name");
        setAllDepts(depts || []);
      } else {
        setDeptId(resolvedDeptId);
      }

      const effectiveDeptId = resolvedIsAdmin ? deptId : resolvedDeptId;
      const p_start = customStart || fy.start;
      const p_end = customEnd || fy.end;

      const [
        dRevenue, dSalary, dNonSalary, dManpower,
        dAttrition, dRatios, dBirthdays, dAnniv, dClientAdv,
        dProfit, dClientProfit, dClientRevenue
      ] = await Promise.all([
        supabase.rpc("get_dept_report_revenue", { p_start, p_end, p_dept_id: effectiveDeptId }),
        supabase.rpc("get_dept_report_salary", { p_start, p_end, p_dept_id: effectiveDeptId }),
        supabase.rpc("get_dept_report_non_salary", { p_start, p_end, p_dept_id: effectiveDeptId }),
        supabase.rpc("get_dept_report_manpower", { p_start, p_end, p_dept_id: effectiveDeptId }),
        supabase.rpc("get_dept_report_attrition", { p_start, p_end, p_dept_id: effectiveDeptId }),
        supabase.rpc("get_dept_report_ratios", { p_start, p_end, p_dept_id: effectiveDeptId }),
        supabase.rpc("get_dept_report_birthdays", { p_dept_id: effectiveDeptId, p_days_ahead: 30 }),
        supabase.rpc("get_dept_report_anniversaries", { p_dept_id: effectiveDeptId, p_days_ahead: 30 }),
        supabase.rpc("get_dept_report_client_advance", { p_start, p_end }),
        supabase.rpc("get_dept_report_profit", { p_start, p_end, p_dept_id: effectiveDeptId }),
        supabase.rpc("get_dept_report_client_profit", { p_start, p_end, p_dept_id: effectiveDeptId, p_limit: 50 }),
        supabase.rpc("get_analytics_client_revenue", { p_start, p_end, p_dept_id: effectiveDeptId, p_limit: 50 }),
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
      setRpcClientRevenue(extractData(dClientRevenue));

    } catch (e) {
      console.error("FETCH ERROR:", e);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [fy.start, fy.end, deptId, customStart, customEnd]);

  const fetchWorkingCapital = useCallback(async (bankId = null) => {
    setWcLoading(true);
    try {
      const p = bankId || null;
      const [rBanks, rCol, rPay, rStat, rFore] = await Promise.all([
        supabase.rpc("get_working_capital_bank_balances", { p_bank_id: p }),
        supabase.rpc("get_working_capital_collections", { p_bank_id: p }),
        supabase.rpc("get_working_capital_os_payables", { p_bank_id: p }),
        supabase.rpc("get_working_capital_statutory", { p_bank_id: p }),
        supabase.rpc("get_working_capital_weekly_forecast", { p_bank_id: p }),
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

  useEffect(() => {
    fetchAll();
  }, [fyStartYear, deptId, customStart, customEnd]);

  useEffect(() => {
    fetchWorkingCapital(wcSelectedBank);
  }, [wcSelectedBank]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const rev = rpcRevenue.reduce((s, r) => s + Number(r.total_revenue || 0), 0);
    const fee = rpcRevenue.reduce((s, r) => s + Number(r.total_fee || 0), 0);
    const tds = rpcRevenue.reduce((s, r) => s + Number(r.total_tds || 0), 0);

    const revDepts = ['Operations', 'Recruitment', 'Temporary', 'Projects'];
    const rat = rpcRatios.filter(r => revDepts.includes(r.dept_name));
    const rat0 = rat[0] || rpcRatios[0] || {};

    const internal_headcount = rpcRatios.reduce((s, r) => s + Number(r.internal_headcount || 0), 0);
    const external_headcount = rpcRatios.reduce((s, r) => s + Number(r.external_headcount || 0), 0);
    const total_internal_salary = rpcRatios.reduce((s, r) => s + Number(r.total_internal_salary || 0), 0);
    const total_external_cost = rpcRatios.reduce((s, r) => s + Number(r.total_external_cost || 0), 0);
    const total_non_salary = rpcRatios.reduce((s, r) => s + Number(r.total_non_salary || 0), 0);

    const revenue_per_ext_head = external_headcount > 0 ? rev / external_headcount : 0;

    const totalMgmtCost = Number(rpcRatios[0]?.total_mgmt_cost || 0);
    const totalEmpCost = Number(rpcRatios[0]?.total_emp_cost || 0);
    const adminMgmtRatio = totalEmpCost ? (totalMgmtCost / totalEmpCost * 100) : 0;

    const bdRow = rpcRatios.find(r => r.dept_name === 'Business Development' || r.dept_name === 'BD');
    const bdCost = Number(bdRow?.total_internal_salary || 0);

    return {
      total_revenue: rev,
      total_fee: fee,
      total_tds: tds,
      fee_to_revenue_pct: Number(rat0.fee_to_revenue || 0),
      internal_salary: total_internal_salary,
      external_cost: total_external_cost,
      non_salary_exp: total_non_salary,
      internal_headcount,
      external_headcount,
      revenue_per_ext_head,
      dept_salary_to_fee: Number(rat0.dept_salary_to_dept_fee || 0),
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

  // ── Chart 1 + 2: Revenue vs Fee bar data (grouped by month) ─────────
  const revenueChartData = useMemo(() => {
    const byMonth = new Map();
    for (const r of rpcRevenue) {
      const ym = r.month;
      if (!ym) continue;
      if (!byMonth.has(ym)) byMonth.set(ym, { month: ym, revenue: 0, fee: 0 });
      byMonth.get(ym).revenue += Number(r.total_revenue || 0);
      byMonth.get(ym).fee += Number(r.total_fee || 0);
    }
    return Array.from(byMonth.values())
      .sort((a, b) => String(a.month).localeCompare(String(b.month)))
      .map(m => ({ ...m, monthLabel: fmtMonth(m.month) }));
  }, [rpcRevenue]);

  // ── Chart 2: Profit trend line data ──────────────────────────────────
  const profitChartData = useMemo(() => {
    const byMonth = new Map();
    for (const r of rpcProfit) {
      const ym = r.month;
      if (!ym) continue;
      if (!byMonth.has(ym)) byMonth.set(ym, { month: ym, preTds: 0, postTds: 0, actual: 0, fee: 0 });
      const e = byMonth.get(ym);
      e.preTds += Number(r.profit_pre_tds || 0);
      e.postTds += Number(r.profit_post_tds || 0);
      e.actual += Number(r.actual_profit || 0);
      e.fee += Number(r.verto_fee_earned || 0);
    }
    return Array.from(byMonth.values())
      .sort((a, b) => String(a.month).localeCompare(String(b.month)))
      .map(m => ({ ...m, monthLabel: fmtMonth(m.month) }));
  }, [rpcProfit]);

  // ── Chart 3: Salary donut data ────────────────────────────────────────
  const salaryDonutData = useMemo(() => {
    const totals = { fixed: 0, variable: 0, reimb: 0 };
    for (const r of rpcSalary) {
      if (r.pay_head === 'Fixed Salary') totals.fixed += Number(r.net_payment || 0);
      if (r.pay_head === 'Variable Salary' || r.pay_head === 'Incentive') totals.variable += Number(r.net_payment || 0);
      if (r.pay_head === 'Reimbursement') totals.reimb += Number(r.net_payment || 0);
    }
    return [
      { name: 'Fixed Salary', value: totals.fixed, color: P.steel },
      { name: 'Variable/Incentive', value: totals.variable, color: P.amber },
      { name: 'Reimbursement', value: totals.reimb, color: P.clay },
    ].filter(d => d.value > 0);
  }, [rpcSalary]);

  // ── Client-wise MoM Growth ──────────────────────────────────────────
  const clientGrowth = useMemo(() => {
    const byClient = new Map();
    for (const r of rpcClientProfit) {
      const key = r.client_name;
      if (!byClient.has(key)) byClient.set(key, { name: key, dept: r.dept_name, months: [] });
      byClient.get(key).months.push({
        month: r.month,
        sort: r.month_sort || r.month,
        fee: Number(r.verto_fee_earned || 0),
        preTds: Number(r.profit_pre_tds || 0),
        postTds: Number(r.profit_post_tds || 0),
      });
    }

    return Array.from(byClient.values())
      .map(c => {
        const sorted = c.months.sort((a, b) => String(a.sort).localeCompare(String(b.sort)));
        const last = sorted[sorted.length - 1];
        const prev = sorted[sorted.length - 2];
        const feeMoM = prev?.fee ? safeDivPct(last.fee - prev.fee, prev.fee) : null;
        const profMoM = prev?.preTds ? safeDivPct(last.preTds - prev.preTds, Math.abs(prev.preTds)) : null;
        const totalFee = sorted.reduce((s, m) => s + m.fee, 0);
        return {
          name: c.name,
          dept: c.dept,
          totalFee,
          lastFee: last?.fee ?? 0,
          lastProfit: last?.preTds ?? 0,
          lastMonth: last?.month ?? "—",
          feeMoM,
          profMoM,
          months: sorted,
        };
      })
      .sort((a, b) => b.totalFee - a.totalFee);
  }, [rpcClientProfit]);

  // ── Client Revenue grouped by first word ────────────────────────────
  const clientRevenueGrouped = useMemo(() => {
    const getGroup = (name) => {
      const clean = String(name || "").trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
      return clean.split(/\s+/)[0] || "other";
    };

    const groups = new Map();
    for (const r of rpcClientRevenue) {
      const key = getGroup(r.client_name);
      if (!groups.has(key)) {
        groups.set(key, {
          groupKey: key,
          clients: [],
          invoice_value: 0,
          verto_fee: 0,
          tds: 0,
          amount_received: 0,
          outstanding: 0,
          cn_amount: 0,
          invoice_count: 0,
        });
      }
      const g = groups.get(key);
      g.clients.push(r.client_name);
      g.invoice_value += Number(r.invoice_value || 0);
      g.verto_fee += Number(r.verto_fee || 0);
      g.tds += Number(r.tds || 0);
      g.amount_received += Number(r.amount_received || 0);
      g.outstanding += Number(r.outstanding || 0);
      g.cn_amount += Number(r.cn_amount || 0);
      g.invoice_count += Number(r.invoice_count || 0);
    }

    return Array.from(groups.values())
      .map(g => ({
        ...g,
        displayName: g.clients.length === 1 ? g.clients[0] : `${g.clients[0].split(" ")[0]} (${g.clients.length} entities)`,
        collection_pct: g.invoice_value > 0 ? (g.amount_received / g.invoice_value * 100) : 0,
      }))
      .sort((a, b) => b.verto_fee - a.verto_fee);
  }, [rpcClientRevenue]);

  // ── Salary by Month ─────────────────────────────────────────────────────
  const salByMonth = useMemo(() => {
    const map = new Map();
    for (const r of rpcSalary) {
      const m = r.month;
      if (!m) continue;
      if (!map.has(m)) map.set(m, { month: m, fixed: 0, variable: 0, reimb: 0, total: 0 });
      const entry = map.get(m);
      entry.total += Number(r.net_payment || 0);
      if (r.pay_head === 'Fixed Salary') entry.fixed += Number(r.net_payment || 0);
      if (r.pay_head === 'Variable Salary' || r.pay_head === 'Incentive') entry.variable += Number(r.net_payment || 0);
      if (r.pay_head === 'Reimbursement') entry.reimb += Number(r.net_payment || 0);
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [rpcSalary]);

  // ── Manpower MoM Growth ──────────────────────────────────────────────
  const manpowerGrowth = useMemo(() => {
    const sorted = [...rpcManpower].sort((a, b) => String(a.month).localeCompare(String(b.month)));
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const intMoM = prev?.internal_headcount
      ? safeDivPct(Number(last?.internal_headcount) - Number(prev?.internal_headcount), Number(prev?.internal_headcount))
      : 0;
    const extMoM = prev?.external_headcount
      ? safeDivPct(Number(last?.external_headcount) - Number(prev?.external_headcount), Number(prev?.external_headcount))
      : 0;
    return { sorted, intMoM, extMoM, last, prev };
  }, [rpcManpower]);

  // ── HR KPIs ─────────────────────────────────────────────────────────────
  const hrKPIs = useMemo(() => {
    const active = rpcAttrition.reduce((s, r) => s + Number(r.total_active || 0), 0);
    const inactive = rpcAttrition.reduce((s, r) => s + Number(r.total_inactive || 0), 0);
    const avgTenure = rpcAttrition.length
      ? rpcAttrition.reduce((s, r) => s + Number(r.avg_tenure_months || 0), 0) / rpcAttrition.length
      : 0;
    const totalActive = rpcAttrition.reduce((s, r) => s + Number(r.total_active || 0), 0);
    const weightedAge = rpcAttrition.reduce((s, r) =>
      s + (Number(r.avg_age_years || 0) * Number(r.total_active || 0)), 0);
    const avgAge = totalActive > 0 ? weightedAge / totalActive : 0;
    return { active, inactive, totalEmployees: active + inactive, avgTenureMonths: avgTenure, avgAge };
  }, [rpcAttrition]);

  // ── Birthday / Anniversary alerts ──────────────────────────────────────
  const upcomingDates = useMemo(() => {
    const thisWeek = 7;
    const birthdaysThisWeek = rpcBirthdays.filter(b => Number(b.days_until) <= thisWeek).length;
    const anniversariesThisWeek = rpcAnniversaries.filter(a => Number(a.days_until) <= thisWeek).length;
    return {
      birthdays: rpcBirthdays,
      anniversaries: rpcAnniversaries,
      hasDob: rpcBirthdays.length > 0,
      alertCount: birthdaysThisWeek + anniversariesThisWeek,
    };
  }, [rpcBirthdays, rpcAnniversaries]);

  // ── Working Capital Summary ────────────────────────────────────────────
  const wcSummary = useMemo(() => {
    const totalCash = wcBalances.reduce((s, b) => s + Number(b.current_balance || 0), 0);
    const totalCollections = wcCollections.reduce((s, c) => s + Number(c.outstanding || 0), 0);
    const totalPayables = wcPayables.reduce((s, p) => s + Number(p.os_amt_difference || 0), 0);
    const totalStatutory = wcStatutory.reduce((s, s2) => s + Number(s2.pending_due || 0), 0);
    const projectedWC = totalCash + totalCollections - totalPayables - totalStatutory;

    const overdueColItems = wcCollections.filter(c => c.is_overdue);
    const overdueOSItems = wcPayables.filter(p => p.is_overdue);
    const overdueStatItems = wcStatutory.filter(s => s.is_overdue);
    const overdueColAmt = overdueColItems.reduce((s, c) => s + Number(c.outstanding || 0), 0);
    const overdueOSAmt = overdueOSItems.reduce((s, p) => s + Number(p.os_amt_difference || 0), 0);
    const overdueStatAmt = overdueStatItems.reduce((s, s2) => s + Number(s2.pending_due || 0), 0);

    const currentWeek = wcForecast.find(f => f.week_offset === 0) || {};
    return {
      totalCash, totalCollections, totalPayables, totalStatutory, projectedWC,
      overdueColItems, overdueOSItems, overdueStatItems,
      overdueColAmt, overdueOSAmt, overdueStatAmt,
      currentWeek,
    };
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

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW ENHANCEMENT COMPUTED DATA (preserves all existing above)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── SECTION A: Forecasting ──────────────────────────────────────────────
  const forecasts = useMemo(() => {
    const months = growth.months;
    if (months.length < 2) return { revenue: {}, fee: {}, profit: {} };
    const last = months[months.length - 1];
    const prev = months[months.length - 2];
    const revTrend = prev?.rev ? (last.rev - prev.rev) / prev.rev : 0;
    const feeTrend = prev?.fee ? (last.fee - prev.fee) / prev.fee : 0;

    const lastProfit = profitChartData[profitChartData.length - 1];
    const prevProfit = profitChartData[profitChartData.length - 2];
    const profTrend = prevProfit?.preTds ? (lastProfit.preTds - prevProfit.preTds) / prevProfit.preTds : 0;

    return {
      revenue: {
        current: last.rev,
        nextMonth: last.rev * (1 + revTrend),
        nextQuarter: last.rev * Math.pow(1 + revTrend, 3),
      },
      fee: {
        current: last.fee,
        nextMonth: last.fee * (1 + feeTrend),
        nextQuarter: last.fee * Math.pow(1 + feeTrend, 3),
      },
      profit: {
        current: lastProfit?.preTds || 0,
        nextMonth: (lastProfit?.preTds || 0) * (1 + profTrend),
        nextQuarter: (lastProfit?.preTds || 0) * Math.pow(1 + profTrend, 3),
      },
    };
  }, [growth, profitChartData]);

  // ── SECTION A: Growth Insights ──────────────────────────────────────────
  const growthInsights = useMemo(() => {
    const insights = [];
    if (growth.months.length >= 2) {
      const last = growth.months[growth.months.length - 1];
      const prev = growth.months[growth.months.length - 2];
      const revChange = safeDivPct(last.rev - prev.rev, prev.rev);
      const feeChange = safeDivPct(last.fee - prev.fee, prev.fee);
      insights.push({
        label: "Revenue",
        change: revChange,
        text: `Revenue ${revChange >= 0 ? 'increased' : 'decreased'} by ${Math.abs(revChange).toFixed(1)}% compared to previous month.`,
      });
      insights.push({
        label: "Fee",
        change: feeChange,
        text: `Fee ${feeChange >= 0 ? 'increased' : 'decreased'} by ${Math.abs(feeChange).toFixed(1)}% compared to previous month.`,
      });

      // Top contributing clients for revenue
      const topClients = [...clientGrowth].sort((a, b) => b.lastFee - a.lastFee).slice(0, 3);
      if (topClients.length > 0) {
        insights.push({
          label: "Top Contributors",
          text: `Growth contributed mainly by: ${topClients.map(c => c.name).join(", ")}.`,
        });
      }

      // Consecutive months trend
      let posStreak = 0;
      for (let i = growth.months.length - 1; i > 0; i--) {
        const curr = growth.months[i];
        const prev = growth.months[i - 1];
        if (curr.rev > prev.rev) posStreak++;
        else break;
      }
      if (posStreak >= 2) {
        insights.push({
          label: "Streak",
          text: `Revenue trend has been positive for ${posStreak} consecutive months.`,
        });
      }
    }
    return insights;
  }, [growth, clientGrowth]);

  // ── SECTION B: Department Comparison (All Depts only) ───────────────────
  const deptComparison = useMemo(() => {
    if (deptId) return []; // Hide when single department selected
    const map = new Map();
    for (const r of rpcRevenue) {
      const d = r.dept_name;
      if (!d) continue;
      if (!map.has(d)) map.set(d, { dept: d, revenue: 0, fee: 0, prevRevenue: 0 });
      const e = map.get(d);
      e.revenue += Number(r.total_revenue || 0);
      e.fee += Number(r.total_fee || 0);
    }
    // Calculate growth % (need previous month data per dept)
    const byMonthDept = new Map();
    for (const r of rpcRevenue) {
      const key = `${r.month}__${r.dept_name}`;
      byMonthDept.set(key, { revenue: Number(r.total_revenue || 0), fee: Number(r.total_fee || 0) });
    }
    const months = [...new Set(rpcRevenue.map(r => r.month))].sort();
    const lastMonth = months[months.length - 1];
    const prevMonth = months[months.length - 2];

    return Array.from(map.values()).map(d => {
      const last = byMonthDept.get(`${lastMonth}__${d.dept}`);
      const prev = byMonthDept.get(`${prevMonth}__${d.dept}`);
      const growthPct = prev?.revenue ? safeDivPct(last?.revenue - prev.revenue, prev.revenue) : 0;
      return {
        ...d,
        feeToRev: d.revenue > 0 ? (d.fee / d.revenue * 100) : 0,
        growthPct,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [rpcRevenue, deptId]);

  // ── SECTION B: Top Revenue Clients ────────────────────────────────────
  const topRevenueClients = useMemo(() => {
    const map = new Map();
    for (const r of rpcClientRevenue) {
      const key = r.client_name;
      if (!map.has(key)) map.set(key, { client: key, revenue: 0, fee: 0 });
      map.get(key).revenue += Number(r.invoice_value || 0);
      map.get(key).fee += Number(r.verto_fee || 0);
    }
    const totalRev = kpi.total_revenue || 1;
    return Array.from(map.values())
      .map(c => ({ ...c, contribution: (c.revenue / totalRev) * 100 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [rpcClientRevenue, kpi.total_revenue]);

  // ── SECTION B: Top Fee Clients ────────────────────────────────────────────
  const topFeeClients = useMemo(() => {
    const map = new Map();
    for (const r of rpcClientRevenue) {
      const key = r.client_name;
      if (!map.has(key)) map.set(key, { client: key, fee: 0, revenue: 0 });
      map.get(key).fee += Number(r.verto_fee || 0);
      map.get(key).revenue += Number(r.invoice_value || 0);
    }
    const totalFee = kpi.total_fee || 1;
    return Array.from(map.values())
      .map(c => ({ ...c, contribution: (c.fee / totalFee) * 100 }))
      .sort((a, b) => b.fee - a.fee)
      .slice(0, 10);
  }, [rpcClientRevenue, kpi.total_fee]);

  // ── SECTION C: Profit Margin ──────────────────────────────────────────────
  const profitMargin = useMemo(() => {
    const months = profitChartData;
    if (months.length < 2) return { current: 0, prev: 0, change: 0 };
    const last = months[months.length - 1];
    const prev = months[months.length - 2];
    const currMargin = last.fee > 0 ? (last.preTds / last.fee) * 100 : 0;
    const prevMargin = prev.fee > 0 ? (prev.preTds / prev.fee) * 100 : 0;
    return {
      current: currMargin,
      prev: prevMargin,
      change: safeDivPct(currMargin - prevMargin, prevMargin),
    };
  }, [profitChartData]);

  // ── SECTION C: Client Profitability Ranking ───────────────────────────────
  const clientProfitRanking = useMemo(() => {
    const map = new Map();
    for (const r of rpcClientProfit) {
      const key = r.client_name;
      if (!map.has(key)) map.set(key, { client: key, revenue: 0, fee: 0, profit: 0, expense: 0 });
      const e = map.get(key);
      e.revenue += Number(r.total_invoice || 0);
      e.fee += Number(r.verto_fee_earned || 0);
      e.profit += Number(r.profit_pre_tds || 0);
      e.expense += Number(r.total_expense || 0);
    }
    return Array.from(map.values())
      .map(c => ({
        ...c,
        margin: c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
  }, [rpcClientProfit]);

  // ── SECTION C: Loss Making Clients ──────────────────────────────────────
  const lossMakingClients = useMemo(() => {
    const map = new Map();
    for (const r of rpcClientProfit) {
      const key = r.client_name;
      if (!map.has(key)) map.set(key, { client: key, revenue: 0, fee: 0, loss: 0 });
      const e = map.get(key);
      e.revenue += Number(r.total_invoice || 0);
      e.fee += Number(r.verto_fee_earned || 0);
      e.loss += Number(r.profit_pre_tds || 0);
    }
    return Array.from(map.values())
      .filter(c => c.loss < 0)
      .sort((a, b) => a.loss - b.loss) // Most negative first
      .slice(0, 10);
  }, [rpcClientProfit]);

  // ── SECTION D: Salary Trend Summary ──────────────────────────────────────
  const salaryTrendSummary = useMemo(() => {
    if (salByMonth.length === 0) return { highest: 0, lowest: 0, avg: 0 };
    const totals = salByMonth.map(s => s.total);
    const highest = Math.max(...totals);
    const lowest = Math.min(...totals);
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    return { highest, lowest, avg };
  }, [salByMonth]);

  // ── SECTION E: Expense Categorization ────────────────────────────────────
  const expenseCategories = useMemo(() => {
    const map = new Map();
    for (const r of rpcNonSalary) {
      const head = r.pay_head || "Miscellaneous";
      if (!map.has(head)) map.set(head, { head, amount: 0 });
      map.get(head).amount += Number(r.total_amount || 0);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [rpcNonSalary]);

  const expenseTrendData = useMemo(() => {
    const byMonth = new Map();
    for (const r of rpcNonSalary) {
      const m = r.month || "—";
      if (!byMonth.has(m)) byMonth.set(m, { month: m, total: 0 });
      byMonth.get(m).total += Number(r.total_amount || 0);
    }
    return Array.from(byMonth.values())
      .sort((a, b) => String(a.month).localeCompare(String(b.month)))
      .map(m => ({ ...m, monthLabel: fmtMonth(m.month) }));
  }, [rpcNonSalary]);

  // ── SECTION F: Headcount Summary ─────────────────────────────────────────
  const headcountSummary = useMemo(() => {
    const last = manpowerGrowth.last;
    return {
      internal: Number(last?.internal_headcount || 0),
      external: Number(last?.external_headcount || 0),
      total: Number(last?.internal_headcount || 0) + Number(last?.external_headcount || 0),
    };
  }, [manpowerGrowth]);

  // ── SECTION F: Productivity Metrics ──────────────────────────────────────
  const productivity = useMemo(() => {
    const totalHC = headcountSummary.total || 1;
    return {
      revPerEmp: kpi.total_revenue / totalHC,
      feePerEmp: kpi.total_fee / totalHC,
      profitPerEmp: (profitChartData[profitChartData.length - 1]?.preTds || 0) / totalHC,
    };
  }, [kpi, headcountSummary, profitChartData]);

  // ── SECTION G: Attrition Trend ───────────────────────────────────────────
  const attritionTrendData = useMemo(() => {
    const byMonth = new Map();
    for (const r of rpcAttrition) {
      const m = r.month || r.period;
      if (!m) continue;
      if (!byMonth.has(m)) byMonth.set(m, { month: m, active: 0, inactive: 0, rate: 0 });
      const e = byMonth.get(m);
      e.active += Number(r.total_active || 0);
      e.inactive += Number(r.total_inactive || 0);
    }
    return Array.from(byMonth.values())
      .sort((a, b) => String(a.month).localeCompare(String(b.month)))
      .map(m => ({
        ...m,
        attritionRate: m.active + m.inactive > 0 ? (m.inactive / (m.active + m.inactive)) * 100 : 0,
        monthLabel: fmtMonth(m.month),
      }));
  }, [rpcAttrition]);

  // ── SECTION G: Department Attrition Table (All Depts only) ──────────────
  const deptAttritionTable = useMemo(() => {
    if (deptId) return [];
    return rpcAttrition.map(r => ({
      dept: r.department,
      active: Number(r.total_active || 0),
      inactive: Number(r.total_inactive || 0),
      attritionRate: Number(r.total_active || 0) + Number(r.total_inactive || 0) > 0
        ? (Number(r.total_inactive || 0) / (Number(r.total_active || 0) + Number(r.total_inactive || 0))) * 100
        : 0,
    })).sort((a, b) => b.attritionRate - a.attritionRate);
  }, [rpcAttrition, deptId]);

  // ── SECTION H: Age Distribution ───────────────────────────────────────────
  const ageDistribution = useMemo(() => {
    if (rpcAttrition.length === 0 || !rpcAttrition[0]?.avg_age_years) return [];
    const buckets = [
      { label: "18-25", min: 18, max: 25, count: 0 },
      { label: "26-30", min: 26, max: 30, count: 0 },
      { label: "31-35", min: 31, max: 35, count: 0 },
      { label: "36-40", min: 36, max: 40, count: 0 },
      { label: "40+", min: 40, max: 100, count: 0 },
    ];
    // Approximate distribution using weighted avg age per dept
    for (const r of rpcAttrition) {
      const avgAge = Number(r.avg_age_years || 0);
      const count = Number(r.total_active || 0);
      if (avgAge > 0 && count > 0) {
        const bucket = buckets.find(b => avgAge >= b.min && avgAge <= b.max) || buckets[buckets.length - 1];
        bucket.count += count;
      }
    }
    return buckets.filter(b => b.count > 0).map(b => ({ name: b.label, value: b.count, color: P.steel }));
  }, [rpcAttrition]);

  // ── SECTION H: Tenure Distribution ────────────────────────────────────────
  const tenureDistribution = useMemo(() => {
    if (rpcAttrition.length === 0) return [];
    const buckets = [
      { label: "0-1 Year", min: 0, max: 12, count: 0 },
      { label: "1-3 Years", min: 12, max: 36, count: 0 },
      { label: "3-5 Years", min: 36, max: 60, count: 0 },
      { label: "5+ Years", min: 60, max: 999, count: 0 },
    ];
    for (const r of rpcAttrition) {
      const avgTenure = Number(r.avg_tenure_months || 0);
      const count = Number(r.total_active || 0);
      if (avgTenure > 0 && count > 0) {
        const bucket = buckets.find(b => avgTenure >= b.min && avgTenure < b.max) || buckets[buckets.length - 1];
        bucket.count += count;
      }
    }
    return buckets.filter(b => b.count > 0).map((b, i) => ({ name: b.label, value: b.count, color: [P.teal, P.sky, P.amber, P.clay][i] }));
  }, [rpcAttrition]);

  // ── SECTION J: Outstanding Aging ───────────────────────────────────────────
  const outstandingAging = useMemo(() => {
    const buckets = {
      "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0,
    };
    const clients = new Map();
    for (const c of wcCollections) {
      const days = Number(c.days_overdue || 0);
      const amt = Number(c.outstanding || 0);
      if (days <= 30) buckets["0-30"] += amt;
      else if (days <= 60) buckets["31-60"] += amt;
      else if (days <= 90) buckets["61-90"] += amt;
      else buckets["90+"] += amt;

      // Top outstanding clients
      const key = c.client_name;
      if (!clients.has(key)) clients.set(key, { client: key, invoiceAmt: 0, received: 0, outstanding: 0, age: 0, count: 0 });
      const cl = clients.get(key);
      cl.invoiceAmt += Number(c.invoice_value || c.outstanding || 0);
      cl.received += Number(c.amount_received || 0);
      cl.outstanding += amt;
      cl.age = Math.max(cl.age, days);
      cl.count++;
    }
    const topClients = Array.from(clients.values())
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 10);

    return { buckets, topClients };
  }, [wcCollections]);

  // ── SECTION J: Outstanding Summary ───────────────────────────────────────
  const outstandingSummary = useMemo(() => {
    const total = wcCollections.reduce((s, c) => s + Number(c.outstanding || 0), 0);
    const clients = new Set(wcCollections.map(c => c.client_name)).size;
    const avg = clients > 0 ? total / clients : 0;
    const highest = wcCollections.length > 0
      ? wcCollections.reduce((max, c) => Number(c.outstanding || 0) > max.amt ? { client: c.client_name, amt: Number(c.outstanding || 0) } : max, { client: "", amt: 0 })
      : { client: "", amt: 0 };
    return { total, clients, avg, highest };
  }, [wcCollections]);

  // ── SECTION K: Working Capital Health ────────────────────────────────────
  const wcHealth = useMemo(() => {
    const nwc = wcSummary.projectedWC;
    let status = "Healthy";
    let color = "text-emerald-600";
    let bg = "bg-emerald-50 border-emerald-200";
    if (nwc < 0) {
      status = "Critical";
      color = "text-rose-600";
      bg = "bg-rose-50 border-rose-200";
    } else if (nwc < wcSummary.totalCash * 0.2) {
      status = "Warning";
      color = "text-amber-600";
      bg = "bg-amber-50 border-amber-200";
    }
    return {
      status,
      color,
      bg,
      cash: wcSummary.totalCash,
      receivables: wcSummary.totalCollections,
      payables: wcSummary.totalPayables,
      statutory: wcSummary.totalStatutory,
      nwc,
    };
  }, [wcSummary]);

  // ── SECTION L: Ratios ────────────────────────────────────────────────────
  const ratioData = useMemo(() => {
    const revDepts = ['Operations', 'Recruitment', 'Temporary', 'Projects'];
    const rows = rpcRatios.filter(r => revDepts.includes(r.dept_name));
    const totalHC = headcountSummary.total || 1;
    return rows.map(r => ({
      dept: r.dept_name,
      feeToRev: Number(r.fee_to_revenue || 0),
      intTeamToFee: Number(r.internal_team_to_fee || 0),
      intCostPerHead: Number(r.internal_cost_per_head || 0),
      revPerExtHead: Number(r.revenue_per_ext_head || 0),
      mgmtCostRatio: Number(r.mgmt_cost_ratio || 0),
      bdCostRatio: Number(r.bd_cost_ratio || 0),
      salToIntExp: Number(r.salary_to_internal_exp || 0),
      varToFixed: Number(r.variable_to_fixed || 0),
      reimbToFixed: Number(r.reimbursement_to_fixed || 0),
      deptSalToFee: Number(r.dept_salary_to_dept_fee || 0),
      // NEW ratios
      profitToRev: safeDivPct(r.profit_pre_tds, r.total_revenue),
      revPerEmp: safeDivPct(r.total_revenue, r.internal_headcount + r.external_headcount),
      feePerEmp: safeDivPct(r.verto_fee_earned, r.internal_headcount + r.external_headcount),
      profitPerEmp: safeDivPct(r.profit_pre_tds, r.internal_headcount + r.external_headcount),
    }));
  }, [rpcRatios, headcountSummary]);

  // ── SECTION M: Exception Reporting ────────────────────────────────────────
  const exceptionReports = useMemo(() => {
    const highestRev = [...topRevenueClients].slice(0, 10);
    const highestProfit = [...clientProfitRanking].slice(0, 10);
    const highestOutstanding = [...outstandingAging.topClients].slice(0, 10);
    const lossClients = [...lossMakingClients].slice(0, 10);

    // Highest cost departments (All Depts only)
    const deptCosts = deptId ? [] : rpcRatios
      .filter(r => r.dept_name && r.total_internal_salary != null)
      .map(r => ({ dept: r.dept_name, cost: Number(r.total_internal_salary || 0) + Number(r.total_external_cost || 0) + Number(r.total_non_salary || 0) }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    return { highestRev, highestProfit, highestOutstanding, lossClients, deptCosts };
  }, [topRevenueClients, clientProfitRanking, outstandingAging, lossMakingClients, rpcRatios, deptId]);

  // ── SECTION N: Management Insights ──────────────────────────────────────
  const managementInsights = useMemo(() => {
    const insights = [];

    // Revenue insight
    if (growth.revMoM !== 0) {
      insights.push(`Revenue ${growth.revMoM >= 0 ? 'increased' : 'decreased'} ${Math.abs(growth.revMoM).toFixed(1)}% MoM.`);
    }

    // Profit insight
    if (profitMargin.change !== 0) {
      insights.push(`Profit margin ${profitMargin.change >= 0 ? 'improved' : 'declined'} by ${Math.abs(profitMargin.change).toFixed(1)}%.`);
    }

    // Attrition insight
    if (hrKPIs.inactive > 0) {
      const attrRate = hrKPIs.totalEmployees > 0 ? (hrKPIs.inactive / hrKPIs.totalEmployees * 100).toFixed(1) : 0;
      insights.push(`Attrition rate is ${attrRate}% with ${hrKPIs.inactive} inactive employees.`);
    }

    // Outstanding insight
    if (outstandingSummary.total > 0) {
      insights.push(`Outstanding collection of ${fmt(outstandingSummary.total)} across ${outstandingSummary.clients} clients.`);
    }

    // Working capital insight
    if (wcHealth.nwc !== 0) {
      insights.push(`Working capital is ${wcHealth.status.toLowerCase()} at ${fmt(wcHealth.nwc)}.`);
    }

    // Department margin insight
    if (deptComparison.length > 0) {
      const best = deptComparison.reduce((max, d) => d.feeToRev > max.feeToRev ? d : max, deptComparison[0]);
      if (best) insights.push(`Highest fee/revenue ratio in ${best.dept} at ${best.feeToRev.toFixed(1)}%.`);
    }

    // Loss making clients
    if (lossMakingClients.length > 0) {
      insights.push(`${lossMakingClients.length} clients are currently loss-making.`);
    }

    // Headcount insight
    if (manpowerGrowth.intMoM !== 0) {
      insights.push(`Internal headcount ${manpowerGrowth.intMoM >= 0 ? 'grew' : 'declined'} by ${Math.abs(manpowerGrowth.intMoM).toFixed(1)}% MoM.`);
    }

    // Expense insight
    if (expenseCategories.length > 0) {
      const topExp = expenseCategories[0];
      insights.push(`Highest expense category: ${topExp.head} at ${fmt(topExp.amount)}.`);
    }

    return insights.slice(0, 10);
  }, [growth, profitMargin, hrKPIs, outstandingSummary, wcHealth, deptComparison, lossMakingClients, manpowerGrowth, expenseCategories]);

  // ── Existing Section 1 Table ──────────────────────────────────────────────
  const totalPages = Math.ceil(section1Table.length / ITEMS);
  const revDepts = ['Operations', 'Recruitment', 'Temporary', 'Projects'];

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

  return (
    <div className="space-y-6 pb-10 bg-gray-50/60 min-h-screen" style={{ fontFamily: "'DM Sans', 'Geist', sans-serif" }}>
      {/* Header */}
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

      {/* Filters */}
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

      {/* ════════════════════════════════════════════════════════════
          SECTION A — Trends & Future Projection (ENHANCED)
          ════════════════════════════════════════════════════════════ */}
      <SH icon={TrendingUp} title="Trends & Future Projection" color={P.steel} />

      {/* Forecast Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Revenue Forecast */}
        <ChartCard title="Revenue Forecast" subtitle="Based on current trend">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">Current Month</span>
              <span className="text-sm font-bold text-slate-800">{fmt(forecasts.revenue.current)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">Next Month</span>
              <span className="text-sm font-bold text-emerald-600">{fmt(forecasts.revenue.nextMonth)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-slate-500">Next Quarter</span>
              <span className="text-sm font-bold text-sky-600">{fmt(forecasts.revenue.nextQuarter)}</span>
            </div>
          </div>
        </ChartCard>

        {/* Fee Forecast */}
        <ChartCard title="Fee Forecast" subtitle="Based on current trend">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">Current Month</span>
              <span className="text-sm font-bold text-slate-800">{fmt(forecasts.fee.current)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">Next Month</span>
              <span className="text-sm font-bold text-emerald-600">{fmt(forecasts.fee.nextMonth)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-slate-500">Next Quarter</span>
              <span className="text-sm font-bold text-sky-600">{fmt(forecasts.fee.nextQuarter)}</span>
            </div>
          </div>
        </ChartCard>

        {/* Profit Forecast */}
        <ChartCard title="Profit Pre-TDS Forecast" subtitle="Based on current trend">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">Current Month</span>
              <span className="text-sm font-bold text-slate-800">{fmt(forecasts.profit.current)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">Next Month</span>
              <span className="text-sm font-bold text-emerald-600">{fmt(forecasts.profit.nextMonth)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-slate-500">Next Quarter</span>
              <span className="text-sm font-bold text-sky-600">{fmt(forecasts.profit.nextQuarter)}</span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Growth Insights */}
      {growthInsights.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800">Growth Insights</h3>
          </div>
          <div className="space-y-2">
            {growthInsights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <span className="text-slate-600">{insight.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          EXISTING: Department P&L Overview (PRESERVED)
          ════════════════════════════════════════════════════════════ */}
      <SH icon={TrendingUp} title="Department P&L Overview" color={P.steel} count={`${rpcRevenue.length} rows`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="Total Revenue" value={fmt(kpi.total_revenue)} sub={`FY ${fy.label}`} icon={FileText} color={P.steel} />
        <KpiCard label="Verto Fee" value={fmt(kpi.total_fee)} sub="Fee earned" icon={TrendingUp} color={P.trend} />
        <KpiCard label="Fee / Revenue %" value={`${kpi.fee_to_revenue_pct.toFixed(1)}%`} sub="verto_fee / total_revenue" icon={Wallet} color={P.sky} />
        <KpiCard label="Total TDS" value={fmt(kpi.total_tds)} sub="tax deducted at source" icon={CreditCard} color={P.amber} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <ChartCard title="Revenue Detail by Month" subtitle="Monthly breakdown">
          {section1Table.length === 0 ? (
            <Empty />
          ) : (
            <>
              <DataTable
                maxHeight={380}
                columns={[
                  { header: "Month", key: "month", className: "text-slate-500" },
                  { header: "Department", key: "dept", className: "font-medium text-slate-800" },
                  { header: "Revenue", key: "Revenue", align: "right", formatter: (v) => <span className="font-semibold text-slate-700">{fmt(v)}</span> },
                  { header: "Verto Fee", key: "Verto Fee", align: "right", formatter: (v) => <span className="font-semibold text-slate-700">{fmt(v)}</span> },
                  { header: "TDS", key: "TDS", align: "right", formatter: (v) => <span className="text-rose-600 font-semibold">{Number(v) > 0 ? fmt(v) : "—"}</span> },
                  { header: "Invoices", key: "Invoices", align: "right", formatter: (v) => <span className="text-slate-500">{v}</span> },
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

      {/* ════════════════════════════════════════════════════════════
          SECTION B — Revenue & Fee (ENHANCED)
          ════════════════════════════════════════════════════════════ */}
      <SH icon={TrendingUp} title="Revenue & Fee Growth" color={P.teal} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="Revenue Growth % (MoM)" value={`${growth.revMoM.toFixed(1)}%`} sub="current vs prev month" icon={TrendingUp} color={P.steel} />
        <KpiCard label="Fee Growth % (MoM)" value={`${growth.feeMoM.toFixed(1)}%`} sub="current vs prev month" icon={TrendingUp} color={P.trend} />
        <KpiCard label="Revenue (Current Month)" value={fmt(growth.last?.rev)} sub={growth.last?.ym ? fmtMonth(growth.last.ym) : "—"} icon={FileText} color={P.steel} />
        <KpiCard label="Fee (Current Month)" value={fmt(growth.last?.fee)} sub={growth.last?.ym ? fmtMonth(growth.last.ym) : "—"} icon={Wallet} color={P.trend} />
      </div>

      {/* NEW: Department Comparison Table (All Depts only) */}
      {!deptId && deptComparison.length > 0 && (
        <ChartCard title="Department Comparison" subtitle="Revenue · Fee · Fee/Revenue % · Growth %">
          <div className="overflow-auto" style={{ maxHeight: 320 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr>
                  <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Department</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Revenue</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Fee</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Fee/Revenue %</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Growth %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {deptComparison.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 pr-3 font-semibold text-slate-800">{d.dept}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-semibold text-slate-700">{fmt(d.revenue)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-semibold text-slate-700">{fmt(d.fee)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className={`font-bold ${d.feeToRev >= 50 ? "text-emerald-600" : d.feeToRev >= 30 ? "text-amber-600" : "text-rose-600"}`}>
                        {d.feeToRev.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className={`font-bold ${d.growthPct >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                        {d.growthPct >= 0 ? "↑" : "↓"}{Math.abs(d.growthPct).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* NEW: Top Revenue Clients */}
      {topRevenueClients.length > 0 && (
        <ChartCard title="Top 10 Revenue Clients" subtitle="Client · Revenue · Fee · Contribution %">
          <div className="overflow-auto" style={{ maxHeight: 320 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr>
                  <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Client</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Revenue</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Fee</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Contribution %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topRevenueClients.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 pr-3 font-medium text-slate-800 max-w-[200px] truncate">{c.client}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-semibold text-slate-700">{fmt(c.revenue)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{fmt(c.fee)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className="font-bold text-sky-600">{c.contribution.toFixed(1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* NEW: Top Fee Clients */}
      {topFeeClients.length > 0 && (
        <ChartCard title="Top 10 Fee Clients" subtitle="Client · Fee · Revenue · Contribution %">
          <div className="overflow-auto" style={{ maxHeight: 320 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr>
                  <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Client</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Fee</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Revenue</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Contribution %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topFeeClients.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 pr-3 font-medium text-slate-800 max-w-[200px] truncate">{c.client}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-semibold text-slate-700">{fmt(c.fee)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{fmt(c.revenue)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className="font-bold text-sky-600">{c.contribution.toFixed(1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Revenue vs Fee Bar Chart (PRESERVED) */}
        <ChartCard title="Monthly Revenue vs Fee" subtitle="Grouped bar chart — Revenue (blue) vs Verto Fee (teal)">
          {revenueChartData.length === 0 ? <Empty msg="No revenue data" /> : (
            <>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => {
                      if (Math.abs(v) >= 1e7) return `₹${(v/1e7).toFixed(1)}Cr`;
                      if (Math.abs(v) >= 1e5) return `₹${(v/1e5).toFixed(1)}L`;
                      if (Math.abs(v) >= 1e3) return `₹${(v/1e3).toFixed(0)}K`;
                      return `₹${v}`;
                    }} tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={60} />
                    <Tooltip formatter={(value, name) => [fmt(value), name]} contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(v) => <span style={{ color: "#64748b" }}>{v}</span>} />
                    <Bar dataKey="revenue" name="Revenue" fill={P.steel} radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="fee" name="Verto Fee" fill={P.teal} radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-0">
                {revenueChartData.slice(-3).map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50 text-xs">
                    <span className="font-semibold text-slate-600">{m.monthLabel}</span>
                    <span className="text-slate-500 tabular-nums">Rev: {fmt(m.revenue)} · Fee: {fmt(m.fee)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>

        {/* Chart 3: Salary Donut (PRESERVED) */}
        <ChartCard title="Salary Breakdown" subtitle="Fixed · Variable · Reimbursement composition">
          {salByMonth.length === 0 ? <Empty msg="No salary data" /> : (
            <div className="flex flex-col gap-3">
              {salaryDonutData.length > 0 && (
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={salaryDonutData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value"
                        label={({ name, percent }) => `${name.split('/')[0].trim()} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {salaryDonutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [fmt(v), ""]} contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e2e8f0" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="space-y-1">
                {salByMonth.slice(-4).map((r, i) => (
                  <div key={`${r.month}-${i}`} className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-700">{fmtMonth(r.month)}</span>
                    <span className="text-xs font-bold tabular-nums text-slate-700">
                      Fixed: {fmt(r.fixed)} · Var: {fmt(r.variable)} · Reimb: {fmt(r.reimb)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION C — Profitability (ENHANCED)
          ════════════════════════════════════════════════════════════ */}
      <SH icon={TrendingUp} title="Profit & P&L" color={P.emerald} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {(() => {
          const totPreTds = rpcProfit.reduce((s, r) => s + Number(r.profit_pre_tds || 0), 0);
          const totPostTds = rpcProfit.reduce((s, r) => s + Number(r.profit_post_tds || 0), 0);
          const totActual = rpcProfit.reduce((s, r) => s + Number(r.actual_profit || 0), 0);
          const totFee = rpcProfit.reduce((s, r) => s + Number(r.verto_fee_earned || 0), 0);
          const avgMargin = totFee ? (totPreTds / totFee * 100) : 0;
          return (<>
            <KpiCard label="Profit Pre-TDS" value={fmt(totPreTds)} sub="Fee − Expenses" icon={TrendingUp} color={P.teal} trend={totPreTds >= 0 ? 1 : -1} />
            <KpiCard label="Profit Post-TDS" value={fmt(totPostTds)} sub="Pre-TDS − TDS" icon={TrendingUp} color={P.emerald} trend={totPostTds >= 0 ? 1 : -1} />
            <KpiCard label="Actual Cash Profit" value={fmt(totActual)} sub="Based on amount received" icon={CheckCircle} color={P.sky} trend={totActual >= 0 ? 1 : -1} />
            <KpiCard label="Avg Profit Margin" value={`${avgMargin.toFixed(1)}%`} sub="Pre-TDS / Fee" icon={BarChart2} color={P.plum} />
          </>);
        })()}
      </div>

      {/* NEW: Profit Margin Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Current Margin %" value={`${profitMargin.current.toFixed(1)}%`} sub="Profit Pre-TDS / Revenue" icon={TrendingUp} color={P.emerald} trend={profitMargin.change} />
        <KpiCard label="Previous Month Margin %" value={`${profitMargin.prev.toFixed(1)}%`} sub="Last month comparison" icon={TrendingUp} color={P.sky} />
        <KpiCard label="Margin Change %" value={`${profitMargin.change.toFixed(1)}%`} sub="MoM change" icon={TrendingUp} color={profitMargin.change >= 0 ? P.emerald : P.brick} trend={profitMargin.change} />
      </div>

      {/* NEW: Client Profitability Ranking */}
      {clientProfitRanking.length > 0 && (
        <ChartCard title="Top 10 Most Profitable Clients" subtitle="Client · Revenue · Fee · Profit · Margin %">
          <div className="overflow-auto" style={{ maxHeight: 320 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr>
                  <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Client</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Revenue</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Fee</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Profit</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clientProfitRanking.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 pr-3 font-medium text-slate-800 max-w-[200px] truncate">{c.client}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{fmt(c.revenue)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-semibold text-slate-700">{fmt(c.fee)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className={`font-bold ${c.profit >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{fmt(c.profit)}</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className={`font-bold ${c.margin >= 30 ? "text-emerald-600" : c.margin >= 0 ? "text-amber-600" : "text-rose-600"}`}>
                        {c.margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* NEW: Loss Making Clients */}
      {lossMakingClients.length > 0 && (
        <ChartCard title="Loss Making Clients" subtitle="Clients where Profit < 0">
          <div className="overflow-auto" style={{ maxHeight: 320 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr>
                  <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Client</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Revenue</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Fee</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Loss Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {lossMakingClients.map((c, i) => (
                  <tr key={i} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-2 pr-3 font-medium text-slate-800 max-w-[200px] truncate">{c.client}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{fmt(c.revenue)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{fmt(c.fee)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className="font-bold text-rose-600">{fmt(Math.abs(c.loss))}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* Chart 2: Profit Trend Lines (PRESERVED) */}
      {profitChartData.length > 0 && (
        <ChartCard title="Profit Trend" subtitle="Pre-TDS (emerald) · Post-TDS (teal) · Actual Cash Profit (blue)">
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={profitChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => {
                  if (Math.abs(v) >= 1e7) return `₹${(v/1e7).toFixed(1)}Cr`;
                  if (Math.abs(v) >= 1e5) return `₹${(v/1e5).toFixed(1)}L`;
                  if (Math.abs(v) >= 1e3) return `₹${(v/1e3).toFixed(0)}K`;
                  return `₹${v}`;
                }} tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={65} />
                <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1.5} />
                <Tooltip formatter={(value, name) => [fmt(value), name]} contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(v) => <span style={{ color: "#64748b" }}>{v}</span>} />
                <Line type="monotone" dataKey="preTds" name="Profit Pre-TDS" stroke={P.teal} strokeWidth={2.5} dot={{ r: 4, fill: P.teal, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="postTds" name="Profit Post-TDS" stroke={P.sky} strokeWidth={2} dot={{ r: 3, fill: P.sky, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="actual" name="Actual Cash Profit" stroke={P.steel} strokeWidth={2} dot={{ r: 3, fill: P.steel, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
            {profitChartData.slice(-1).map((m, i) => (
              <React.Fragment key={i}>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">Last Month Pre-TDS</p>
                  <p className={`text-sm font-bold ${m.preTds >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(m.preTds)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">Post-TDS</p>
                  <p className={`text-sm font-bold ${m.postTds >= 0 ? "text-sky-600" : "text-rose-600"}`}>{fmt(m.postTds)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">Actual Cash</p>
                  <p className={`text-sm font-bold ${m.actual >= 0 ? "text-sky-700" : "text-rose-600"}`}>{fmt(m.actual)}</p>
                </div>
              </React.Fragment>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Dept-wise P&L Table (PRESERVED) */}
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

      {/* Client-wise P&L Table (PRESERVED) */}
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

      {/* Client-wise MoM Growth (PRESERVED) */}
      <SH icon={TrendingUp} title="Client-wise Revenue & Fee Growth" color={P.sky} count={`${clientGrowth.length} clients`} />
      <ChartCard title="Top Clients — Fee & Profit Growth" subtitle="MoM growth % computed from month-wise P&L data">
        {clientGrowth.length === 0 ? <Empty /> : (
          <div className="overflow-auto" style={{ maxHeight: 400 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr>
                  <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Client</th>
                  <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Dept</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Total Fee</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Last Month Fee</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Fee MoM %</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Last Profit (Pre-TDS)</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Profit MoM %</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Last Month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clientGrowth.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 pr-3 font-medium text-slate-800 max-w-[160px] truncate">{c.name}</td>
                    <td className="py-2 pr-3 text-slate-400">{c.dept}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-semibold text-slate-700">{fmt(c.totalFee)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{fmt(c.lastFee)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {c.feeMoM != null ? (
                        <span className={`font-bold ${c.feeMoM >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                          {c.feeMoM >= 0 ? "↑" : "↓"}{Math.abs(c.feeMoM).toFixed(1)}%
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className={Number(c.lastProfit) >= 0 ? "text-emerald-600 font-semibold" : "text-rose-500 font-semibold"}>
                        {fmt(c.lastProfit)}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {c.profMoM != null ? (
                        <span className={`font-bold ${c.profMoM >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                          {c.profMoM >= 0 ? "↑" : "↓"}{Math.abs(c.profMoM).toFixed(1)}%
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-400">{c.lastMonth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {/* Client Revenue Grouped Section (PRESERVED) */}
      <SH icon={FileText} title="Client Revenue Summary (Grouped)" color={P.sky} count={`${clientRevenueGrouped.length} groups`} />

      {clientRevenueGrouped.length > 0 && (
        <ChartCard title="Top Clients by Fee" subtitle="Horizontal bar — Verto Fee (blue) · Outstanding (rose)">
          <div style={{ height: Math.min(clientRevenueGrouped.length * 36 + 20, 320) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientRevenueGrouped.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => {
                  if (Math.abs(v) >= 1e7) return `₹${(v/1e7).toFixed(1)}Cr`;
                  if (Math.abs(v) >= 1e5) return `₹${(v/1e5).toFixed(1)}L`;
                  if (Math.abs(v) >= 1e3) return `₹${(v/1e3).toFixed(0)}K`;
                  return `₹${v}`;
                }} tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="displayName" width={120} tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value, name) => [fmt(value), name]} contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(v) => <span style={{ color: "#64748b" }}>{v}</span>} />
                <Bar dataKey="verto_fee" name="Verto Fee" fill={P.steel} radius={[0, 4, 4, 0]} maxBarSize={18} />
                <Bar dataKey="outstanding" name="Outstanding" fill={P.brick} radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      <ChartCard title="Client-wise Revenue — Grouped by Client" subtitle="Clients with same name prefix merged · sorted by fee">
        {clientRevenueGrouped.length === 0 ? <Empty msg="No client revenue data" /> : (
          <div className="overflow-auto" style={{ maxHeight: 420 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr>
                  <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Client Group</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Invoices</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Invoice Value</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Verto Fee</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">TDS</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">CN Amount</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Received</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Outstanding</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Collection %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clientRevenueGrouped.map((g, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 pr-3 font-medium text-slate-800">
                      {g.displayName}
                      {g.clients.length > 1 && (
                        <div className="text-[9px] text-slate-400 mt-0.5">{g.clients.join(" · ")}</div>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-500">{g.invoice_count}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{fmt(g.invoice_value)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-semibold text-slate-800">{fmt(g.verto_fee)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-rose-500">{g.tds > 0 ? fmt(g.tds) : "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-amber-600">{g.cn_amount > 0 ? fmt(g.cn_amount) : "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-emerald-600 font-semibold">{fmt(g.amount_received)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className={g.outstanding > 0 ? "text-rose-600 font-bold" : "text-slate-300"}>
                        {g.outstanding > 0 ? fmt(g.outstanding) : "—"}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className={`font-bold ${g.collection_pct >= 90 ? "text-emerald-600" : g.collection_pct >= 60 ? "text-amber-600" : "text-rose-600"}`}>
                        {g.collection_pct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/60">
                <tr>
                  <td className="py-2 pr-3 font-bold text-slate-700 text-xs">Total</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold text-slate-700">{clientRevenueGrouped.reduce((s,g)=>s+g.invoice_count,0)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold text-slate-700">{fmt(clientRevenueGrouped.reduce((s,g)=>s+g.invoice_value,0))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-black text-slate-900">{fmt(clientRevenueGrouped.reduce((s,g)=>s+g.verto_fee,0))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold text-rose-500">{fmt(clientRevenueGrouped.reduce((s,g)=>s+g.tds,0))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold text-amber-600">{fmt(clientRevenueGrouped.reduce((s,g)=>s+g.cn_amount,0))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold text-emerald-600">{fmt(clientRevenueGrouped.reduce((s,g)=>s+g.amount_received,0))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-bold text-rose-600">{fmt(clientRevenueGrouped.reduce((s,g)=>s+g.outstanding,0))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-bold text-slate-700">
                    {(() => { const iv = clientRevenueGrouped.reduce((s,g)=>s+g.invoice_value,0); const ar = clientRevenueGrouped.reduce((s,g)=>s+g.amount_received,0); return iv > 0 ? `${(ar/iv*100).toFixed(1)}%` : "—"; })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </ChartCard>

      {/* Amount Not Received from Client (PRESERVED) */}
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
              <KpiCard label="Total Unreceived Amount" value={fmt(totalUnpaid)} sub="Invoiced + paid but not collected" icon={AlertTriangle} color={P.brick} />
              <KpiCard label="Clients with Pending Receipt" value={String(unpaid.length)} sub="from current filter" icon={Users} color={P.amber} />
              <KpiCard label="Largest Single Pending" value={fmt(unpaid[0]?.money_not_received)} sub={unpaid[0]?.client_name || "—"} icon={FileText} color={P.slate} />
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

      {/* ════════════════════════════════════════════════════════════
          SECTION D — Internal Salary Expenses (ENHANCED)
          ════════════════════════════════════════════════════════════ */}
      <SH icon={CreditCard} title="Non-Salary Expenses" color={P.clay} />
      {rpcNonSalary.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <Empty msg="No non-salary expense data" />
        </div>
      ) : (() => {
        const heads = [...new Set(rpcNonSalary.map(r => r.pay_head))].sort();
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

      {/* NEW: Top Expense Categories Bar Chart */}
      {expenseCategories.length > 0 && (
        <ChartCard title="Top Expense Categories" subtitle="Bar chart by expense head">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseCategories.slice(0, 10)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="head" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => {
                  if (Math.abs(v) >= 1e5) return `₹${(v/1e5).toFixed(0)}L`;
                  if (Math.abs(v) >= 1e3) return `₹${(v/1e3).toFixed(0)}K`;
                  return `₹${v}`;
                }} tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={50} />
                <Tooltip formatter={(v) => [fmt(v), ""]} contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="amount" name="Amount" fill={P.clay} radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {/* NEW: Expense Trend */}
      {expenseTrendData.length > 0 && (
        <ChartCard title="Expense Trend" subtitle="Month-wise non-salary expense trend">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={expenseTrendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => {
                  if (Math.abs(v) >= 1e5) return `₹${(v/1e5).toFixed(0)}L`;
                  if (Math.abs(v) >= 1e3) return `₹${(v/1e3).toFixed(0)}K`;
                  return `₹${v}`;
                }} tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={50} />
                <Tooltip formatter={(v) => [fmt(v), "Total Expense"]} contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e2e8f0" }} />
                <Area type="monotone" dataKey="total" name="Total Expense" stroke={P.clay} fill={P.clay + "30"} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {/* ════════════════════════════════════════════════════════════
          SECTION F — Manpower (ENHANCED)
          ════════════════════════════════════════════════════════════ */}
      <SH icon={Users} title="Manpower" color={P.plum} />

      {/* NEW: Headcount Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Internal Headcount" value={fmtCount(headcountSummary.internal)} sub="Active employees" icon={Users} color={P.slate} />
        <KpiCard label="External Headcount" value={fmtCount(headcountSummary.external)} sub="OS payout employees" icon={Users} color={P.clay} />
        <KpiCard label="Total Headcount" value={fmtCount(headcountSummary.total)} sub="Internal + External" icon={Users} color={P.plum} />
      </div>

      {/* NEW: Productivity Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Revenue per Employee" value={fmt(productivity.revPerEmp)} sub="Revenue / Total HC" icon={FileText} color={P.steel} />
        <KpiCard label="Fee per Employee" value={fmt(productivity.feePerEmp)} sub="Fee / Total HC" icon={Wallet} color={P.teal} />
        <KpiCard label="Profit per Employee" value={fmt(productivity.profitPerEmp)} sub="Profit / Total HC" icon={TrendingUp} color={P.emerald} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
        <KpiCard label="Internal Headcount" value={fmtCount(kpi.internal_headcount)} sub="Active employees" icon={Users} color={P.slate} />
        <KpiCard label="External Headcount" value={fmtCount(kpi.external_headcount)} sub="OS payout employees" icon={Users} color={P.clay} />
        <KpiCard label="Internal / External" value={kpi.external_headcount ? (kpi.internal_headcount / kpi.external_headcount).toFixed(2) : "—"} sub="ratio" icon={TrendingUp} color={P.teal} />
        <KpiCard label="Revenue per Ext Head" value={fmt(kpi.revenue_per_ext_head)} sub="revenue / external headcount" icon={FileText} color={P.steel} />
        <KpiCard label="Internal Growth (MoM)" value={`${manpowerGrowth.intMoM.toFixed(1)}%`} sub="vs previous month" icon={TrendingUp} color={P.teal} trend={manpowerGrowth.intMoM} />
        <KpiCard label="External Growth (MoM)" value={`${manpowerGrowth.extMoM.toFixed(1)}%`} sub="vs previous month" icon={TrendingUp} color={P.clay} trend={manpowerGrowth.extMoM} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Manpower Trend (PRESERVED) */}
        <ChartCard title="Manpower Trend" subtitle="Internal vs External headcount with MoM growth">
          {rpcManpower.length === 0 ? <Empty msg="No manpower data" /> : (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white border-b border-slate-100">
                  <tr>
                    <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Month</th>
                    <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Internal</th>
                    <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Int MoM</th>
                    <th className="text-right py-2 pr-3 text-slate-400 font-semibold">External</th>
                    <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Ext MoM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {manpowerGrowth.sorted.map((r, i) => {
                    const prev = manpowerGrowth.sorted[i - 1];
                    const intMoM = prev?.internal_headcount
                      ? safeDivPct(Number(r.internal_headcount) - Number(prev.internal_headcount), Number(prev.internal_headcount))
                      : null;
                    const extMoM = prev?.external_headcount
                      ? safeDivPct(Number(r.external_headcount) - Number(prev.external_headcount), Number(prev.external_headcount))
                      : null;
                    return (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2 pr-3 font-semibold text-slate-700">{r.month}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-slate-700">{Number(r.internal_headcount || 0)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {intMoM != null
                            ? <span className={`font-bold text-[11px] ${intMoM >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{intMoM >= 0 ? "↑" : "↓"}{Math.abs(intMoM).toFixed(1)}%</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums text-slate-700">{Number(r.external_headcount || 0)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {extMoM != null
                            ? <span className={`font-bold text-[11px] ${extMoM >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{extMoM >= 0 ? "↑" : "↓"}{Math.abs(extMoM).toFixed(1)}%</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>

        {/* NEW: Headcount Trend Line Chart */}
        {manpowerGrowth.sorted.length > 0 && (
          <ChartCard title="Headcount Trend" subtitle="Internal vs External — Line Chart">
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={manpowerGrowth.sorted.map(r => ({
                  month: r.month,
                  internal: Number(r.internal_headcount || 0),
                  external: Number(r.external_headcount || 0),
                }))} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e2e8f0" }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(v) => <span style={{ color: "#64748b" }}>{v}</span>} />
                  <Line type="monotone" dataKey="internal" name="Internal" stroke={P.steel} strokeWidth={2} dot={{ r: 3, fill: P.steel, stroke: "#fff", strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="external" name="External" stroke={P.clay} strokeWidth={2} dot={{ r: 3, fill: P.clay, stroke: "#fff", strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION G — Attrition (ENHANCED)
          ════════════════════════════════════════════════════════════ */}
      <SH icon={Users} title="Attrition" color={P.brick} />

      {/* NEW: Department Attrition Table (All Depts only) */}
      {!deptId && deptAttritionTable.length > 0 && (
        <ChartCard title="Department Attrition" subtitle="Active · Inactive · Attrition %">
          <div className="overflow-auto" style={{ maxHeight: 320 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr>
                  <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Department</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Active</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Inactive</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Attrition %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {deptAttritionTable.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 pr-3 font-semibold text-slate-800">{d.dept}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-emerald-600 font-semibold">{d.active}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-rose-500 font-semibold">{d.inactive}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className={`font-bold ${d.attritionRate > 10 ? "text-rose-600" : d.attritionRate > 5 ? "text-amber-600" : "text-emerald-600"}`}>
                        {d.attritionRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 5: Attrition ComposedChart (PRESERVED) */}
        <ChartCard title="Attrition Summary" subtitle="Active (teal) · Inactive (rose) bars · Avg Tenure line">
          {rpcAttrition.length === 0 ? <Empty msg="No attrition data" /> : (
            <>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={rpcAttrition.map(r => ({
                      dept: r.department,
                      active: Number(r.total_active || 0),
                      inactive: Number(r.total_inactive || 0),
                      tenure: Number(r.avg_tenure_months || 0),
                      age: Number(r.avg_age_years || 0),
                      attrition: Number(r.attrition_rate || 0),
                    }))}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                    barCategoryGap="30%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="dept" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={30} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#C08A3E" }} tickLine={false} axisLine={false} width={35} tickFormatter={(v) => `${v}m`} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                      formatter={(value, name) => [name === "Avg Tenure" ? `${value}m` : name === "Attrition %" ? `${value}%` : value, name]} />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} formatter={(v) => <span style={{ color: "#64748b" }}>{v}</span>} />
                    <Bar yAxisId="left" dataKey="active" name="Active" fill={P.teal} radius={[3, 3, 0, 0]} maxBarSize={28} />
                    <Bar yAxisId="left" dataKey="inactive" name="Inactive" fill={P.brick} radius={[3, 3, 0, 0]} maxBarSize={28} />
                    <Line yAxisId="right" type="monotone" dataKey="tenure" name="Avg Tenure" stroke={P.amber} strokeWidth={2}
                      dot={{ r: 4, fill: P.amber, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                {rpcAttrition.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] font-semibold text-slate-700">{r.department}</span>
                    <span className="text-[10px] tabular-nums text-slate-500">
                      Active: <b>{r.total_active}</b> · Tenure: {Number(r.avg_tenure_months||0).toFixed(0)}m · Age: {Number(r.avg_age_years||0).toFixed(1)}y
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>

        {/* NEW: Attrition Trend */}
        {attritionTrendData.length > 0 && (
          <ChartCard title="Attrition Trend" subtitle="Month-wise attrition rate">
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attritionTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={35} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => [`${v.toFixed(1)}%`, "Attrition Rate"]} contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e2e8f0" }} />
                  <Line type="monotone" dataKey="attritionRate" name="Attrition Rate" stroke={P.brick} strokeWidth={2} dot={{ r: 4, fill: P.brick, stroke: "#fff", strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION H — Age & Tenure (ENHANCED)
          ════════════════════════════════════════════════════════════ */}
      <SH icon={Users} title="Age & Tenure" color={P.slate} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* NEW: Age Distribution */}
        {ageDistribution.length > 0 && (
          <ChartCard title="Age Distribution" subtitle="If data available">
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ageDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {ageDistribution.map((entry, i) => <Cell key={i} fill={[P.steel, P.teal, P.sky, P.amber, P.clay][i % 5]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v, "Count"]} contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e2e8f0" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {/* NEW: Tenure Distribution */}
        {tenureDistribution.length > 0 && (
          <ChartCard title="Tenure Distribution" subtitle="If data available">
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tenureDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {tenureDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v, "Count"]} contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e2e8f0" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION I — Birthdays & Work Anniversary (ENHANCED)
          ════════════════════════════════════════════════════════════ */}
      <SH icon={Cake} title="HR Intelligence" color={P.slate} />

      {upcomingDates.alertCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4" />
          <div className="text-xs font-semibold">
            Upcoming people events this week: <span className="tabular-nums">{upcomingDates.alertCount}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <KpiCard label="Active Headcount" value={fmtCount(hrKPIs.active)} sub="status=Active" icon={Users} color={P.teal} />
        <KpiCard label="Inactive Headcount" value={fmtCount(hrKPIs.inactive)} sub="status=Inactive" icon={Users} color={P.brick} />
        <KpiCard label="Total Employees" value={fmtCount(hrKPIs.totalEmployees)} sub="all records" icon={Users} color={P.slate} />
        <KpiCard label="Avg Tenure" value={`${(hrKPIs.avgTenureMonths / 12).toFixed(1)} yrs`} sub="based on doj" icon={Calendar} color={P.sky} />
        <KpiCard label="Avg Age of Team" value={hrKPIs.avgAge > 0 ? `${hrKPIs.avgAge.toFixed(1)} yrs` : "—"} sub="avg across active employees" icon={Users} color={P.amber} />
      </div>

      {/* NEW: Tabs for Birthdays/Anniversaries with alert badges */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1 border-b border-slate-100 px-5 pt-4">
          <button
            onClick={() => setHrTab("birthdays")}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all ${hrTab === "birthdays" ? "bg-slate-100 text-slate-800 border-t-2 border-slate-800" : "text-slate-400 hover:text-slate-600"}`}
          >
            <div className="flex items-center gap-1.5">
              <Cake className="w-3.5 h-3.5" />
              Upcoming Birthdays
              {upcomingDates.birthdays.filter(b => Number(b.days_until) <= 7).length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[9px] font-bold">
                  {upcomingDates.birthdays.filter(b => Number(b.days_until) <= 7).length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setHrTab("anniversaries")}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all ${hrTab === "anniversaries" ? "bg-slate-100 text-slate-800 border-t-2 border-slate-800" : "text-slate-400 hover:text-slate-600"}`}
          >
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Work Anniversaries
              {upcomingDates.anniversaries.filter(a => Number(a.days_until) <= 7).length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[9px] font-bold">
                  {upcomingDates.anniversaries.filter(a => Number(a.days_until) <= 7).length}
                </span>
              )}
            </div>
          </button>
        </div>
        <div className="p-5">
          {hrTab === "birthdays" ? (
            !upcomingDates.hasDob ? (
              <Empty msg="Birthdays unavailable" />
            ) : upcomingDates.birthdays.length === 0 ? (
              <Empty msg="No birthdays in next 30 days" />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Next 7 Days</h4>
                  <div className="space-y-2">
                    {upcomingDates.birthdays.filter(b => Number(b.days_until) <= 7).length === 0 && (
                      <p className="text-xs text-slate-300 py-4">No birthdays in next 7 days</p>
                    )}
                    {upcomingDates.birthdays.filter(b => Number(b.days_until) <= 7).map((b, i) => (
                      <div key={`${b.name}-${b.birthday_this_year}-${i}`} className="flex items-center justify-between py-1 border-b border-slate-100">
                        <div>
                          <span className="text-xs font-semibold text-slate-700">{b.name}</span>
                          <span className="ml-2 text-[10px] text-slate-400">{b.designation}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-700">{fmtDate(b.birthday_this_year)}</span>
                          <span className="ml-2 text-[10px] text-rose-500 font-semibold">{b.days_until}d away</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Next 30 Days</h4>
                  <div className="space-y-2">
                    {upcomingDates.birthdays.slice(0, 10).map((b, i) => (
                      <div key={`${b.name}-${b.birthday_this_year}-${i}-30`} className="flex items-center justify-between py-1 border-b border-slate-100">
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
                </div>
              </div>
            )
          ) : (
            upcomingDates.anniversaries.length === 0 ? (
              <Empty msg="No anniversaries in next 30 days" />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Next 7 Days</h4>
                  <div className="space-y-2">
                    {upcomingDates.anniversaries.filter(a => Number(a.days_until) <= 7).length === 0 && (
                      <p className="text-xs text-slate-300 py-4">No anniversaries in next 7 days</p>
                    )}
                    {upcomingDates.anniversaries.filter(a => Number(a.days_until) <= 7).map((a, i) => (
                      <div key={`${a.name}-${a.anniversary_date}-${i}`} className="flex items-center justify-between py-1 border-b border-slate-100">
                        <div>
                          <span className="text-xs font-semibold text-slate-700">{a.name}</span>
                          <span className="ml-2 text-[10px] text-slate-400">{a.years_completed} yr{a.years_completed !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-700">{fmtDate(a.anniversary_date)}</span>
                          <span className="ml-2 text-[10px] text-rose-500 font-semibold">{a.days_until}d away</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Next 30 Days</h4>
                  <div className="space-y-2">
                    {upcomingDates.anniversaries.slice(0, 10).map((a, i) => (
                      <div key={`${a.name}-${a.anniversary_date}-${i}-30`} className="flex items-center justify-between py-1 border-b border-slate-100">
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
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Client Advances (PRESERVED) */}
      {rpcClientAdv.length > 0 && (
        <>
          <SH icon={Wallet} title="Client Advances" color={P.amber} count={`${rpcClientAdv.length} clients`} />
          <DataTable
            maxHeight={280}
            columns={[
              { header: "Client", key: "client_name", className: "font-medium text-slate-800" },
              { header: "Total Advanced", key: "total_advanced", align: "right", formatter: (v) => <span className="font-semibold text-orange-700">{fmt(v)}</span> },
              { header: "Paid Back", key: "total_paid_back", align: "right", formatter: (v) => <span className="text-emerald-600 font-semibold">{fmt(v)}</span> },
              { header: "Pending", key: "pending_due", align: "right", formatter: (v) => <span className={Number(v) > 0 ? "text-rose-600 font-bold" : "text-slate-300"}>{Number(v) > 0 ? fmt(v) : "—"}</span> },
              { header: "Status", key: "status", formatter: (v) => <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v === "Closed" ? "bg-emerald-100 text-emerald-700" : v === "Partially Paid" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>{v}</span> },
              { header: "Count", key: "advance_count", align: "right", formatter: (v) => <span className="text-slate-500">{v}</span> },
            ]}
            data={rpcClientAdv}
          />
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          SECTION J — Amount Paid But Not Received (ENHANCED)
          ════════════════════════════════════════════════════════════ */}
      <SH icon={AlertTriangle} title="Outstanding Collections" color={P.brick} />

      {/* NEW: Outstanding Summary Cards */}
      {wcCollections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <KpiCard label="Total Outstanding" value={fmt(outstandingSummary.total)} sub="Across all clients" icon={AlertTriangle} color={P.brick} />
          <KpiCard label="Clients Outstanding" value={String(outstandingSummary.clients)} sub="With pending amounts" icon={Users} color={P.amber} />
          <KpiCard label="Average Outstanding" value={fmt(outstandingSummary.avg)} sub="Per client" icon={Wallet} color={P.slate} />
          <KpiCard label="Highest Outstanding" value={fmt(outstandingSummary.highest.amt)} sub={outstandingSummary.highest.client || "—"} icon={Flag} color={P.plum} />
        </div>
      )}

      {/* NEW: Outstanding Aging Chart */}
      {Object.values(outstandingAging.buckets).some(v => v > 0) && (
        <ChartCard title="Outstanding Aging" subtitle="0-30 · 31-60 · 61-90 · 90+ Days">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { bucket: "0-30 Days", amount: outstandingAging.buckets["0-30"] },
                { bucket: "31-60 Days", amount: outstandingAging.buckets["31-60"] },
                { bucket: "61-90 Days", amount: outstandingAging.buckets["61-90"] },
                { bucket: "90+ Days", amount: outstandingAging.buckets["90+"] },
              ]} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => {
                  if (Math.abs(v) >= 1e5) return `₹${(v/1e5).toFixed(0)}L`;
                  if (Math.abs(v) >= 1e3) return `₹${(v/1e3).toFixed(0)}K`;
                  return `₹${v}`;
                }} tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={50} />
                <Tooltip formatter={(v) => [fmt(v), ""]} contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="amount" name="Outstanding" fill={P.brick} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {/* NEW: Top Outstanding Clients Table */}
      {outstandingAging.topClients.length > 0 && (
        <ChartCard title="Top Outstanding Clients" subtitle="Client · Invoice Amount · Received · Outstanding · Age">
          <div className="overflow-auto" style={{ maxHeight: 320 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr>
                  <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Client</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Invoice Amount</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Received</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Outstanding</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Age (Days)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {outstandingAging.topClients.map((c, i) => (
                  <tr key={i} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-2 pr-3 font-medium text-slate-800 max-w-[200px] truncate">{c.client}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{fmt(c.invoiceAmt)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-emerald-600 font-semibold">{fmt(c.received)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-bold text-rose-600">{fmt(c.outstanding)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span className={`font-bold ${c.age > 90 ? "text-rose-600" : c.age > 60 ? "text-amber-600" : "text-emerald-600"}`}>
                        {c.age}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* ════════════════════════════════════════════════════════════
          SECTION K — Working Capital (ENHANCED)
          ════════════════════════════════════════════════════════════ */}

      {(isAdmin || userRole === 'manager') && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3 mt-8">
            <SH icon={Landmark} title="Working Capital" color={P.steel} />
            <div className="flex items-center gap-2 mb-4">
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

          {/* NEW: Working Capital Health Card */}
          {wcCollections.length > 0 && (
            <div className={`rounded-2xl border p-4 ${wcHealth.bg}`}>
              <div className="flex items-center gap-2 mb-3">
                <Activity className={`w-4 h-4 ${wcHealth.color}`} />
                <h3 className={`text-sm font-bold ${wcHealth.color}`}>Working Capital Health</h3>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${wcHealth.status === "Healthy" ? "bg-emerald-100 text-emerald-700" : wcHealth.status === "Warning" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-600"}`}>
                  {wcHealth.status}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">Cash Available</p>
                  <p className="text-sm font-bold text-slate-800">{fmt(wcHealth.cash)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">Receivables</p>
                  <p className="text-sm font-bold text-emerald-600">{fmt(wcHealth.receivables)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">Payables</p>
                  <p className="text-sm font-bold text-rose-500">{fmt(wcHealth.payables)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">Statutory Dues</p>
                  <p className="text-sm font-bold text-amber-600">{fmt(wcHealth.statutory)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">Net Working Capital</p>
                  <p className={`text-sm font-bold ${wcHealth.nwc >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(wcHealth.nwc)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard label="Current Cash Position" value={fmt(wcSummary.totalCash)} sub="Across all banks" icon={Landmark} color={P.steel} highlight />
            <KpiCard label="Expected Collections" value={fmt(wcSummary.totalCollections)} sub={`${wcCollections.length} outstanding invoices`} icon={ArrowUpRight} color={P.teal} />
            <KpiCard label="OS Payables" value={fmt(wcSummary.totalPayables)} sub={`${wcPayables.length} pending payouts`} icon={ArrowDownRight} color={P.brick} />
            <KpiCard label="Statutory Pending" value={fmt(wcSummary.totalStatutory)} sub="GST / PF / ESI / TDS" icon={FileText} color={P.amber} />
            <KpiCard label="Projected Working Capital" value={fmt(wcSummary.projectedWC)} sub="Cash + Collections − Payables − Statutory" icon={TrendingUp} color={wcSummary.projectedWC >= 0 ? P.emerald : P.brick} highlight />
            <KpiCard label="Overdue Collections" value={fmt(wcSummary.overdueColAmt)} sub={`${wcSummary.overdueColItems.length} invoices overdue`} icon={AlertTriangle} color={P.brick} />
            <KpiCard label="Overdue OS Payouts" value={fmt(wcSummary.overdueOSAmt)} sub={`${wcSummary.overdueOSItems.length} payouts overdue`} icon={AlertTriangle} color={P.amber} />
            <KpiCard label="Overdue Statutory" value={fmt(wcSummary.overdueStatAmt)} sub={`${wcSummary.overdueStatItems.length} records overdue`} icon={AlertTriangle} color={P.plum} />
          </div>

          {/* Bank-wise balance cards (PRESERVED) */}
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

          {/* Weekly Cash Forecast (PRESERVED) */}
          <SH icon={TrendingUp} title="Outstanding Collections" color={P.teal} />
          {wcCollections.filter(c => c.is_overdue).length > 0 && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-3 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <p className="text-xs font-semibold">
                {wcCollections.filter(c => c.is_overdue).length} overdue invoices totalling {fmt(wcSummary.overdueColAmt)}
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

          {/* Payables & Statutory (PRESERVED) */}
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
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mr-2 ${s.type === "GST" ? "bg-amber-100 text-amber-700" : s.type === "PF" ? "bg-blue-100 text-blue-700" : s.type === "TDS" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"}`}>{s.type}</span>
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
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          SECTION L — Ratios (ENHANCED)
          ════════════════════════════════════════════════════════════ */}
      <SH icon={Wallet} title="Cost Ratios by Department" color={P.sky} />

      {/* NEW: Dedicated Ratio Section with new ratios */}
      {ratioData.length > 0 && (
        <ChartCard title="Department Ratios" subtitle="Existing + New ratios — all department-aware">
          <div className="overflow-auto" style={{ maxHeight: 400 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr>
                  <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Department</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Fee/Rev%</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Sal/Fee%</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Team/Fee%</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Var/Fixed%</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Reimb/Fixed%</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Sal/Exp%</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Cost/Head</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Rev/Ext</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Mgmt%</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Profit/Rev%</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Rev/Emp</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Fee/Emp</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Profit/Emp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ratioData.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 pr-3 font-semibold text-slate-800">{r.dept}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-semibold text-slate-700">{r.feeToRev != null ? `${r.feeToRev.toFixed(1)}%` : "—"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      <span className={`font-semibold ${r.deptSalToFee > 80 ? "text-rose-600" : r.deptSalToFee > 60 ? "text-amber-600" : "text-emerald-600"}`}>
                        {r.deptSalToFee != null ? `${r.deptSalToFee.toFixed(1)}%` : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">{r.intTeamToFee != null ? `${r.intTeamToFee.toFixed(1)}%` : "—"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">{r.varToFixed != null ? `${r.varToFixed.toFixed(1)}%` : "—"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">{r.reimbToFixed != null ? `${r.reimbToFixed.toFixed(1)}%` : "—"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">{r.salToIntExp != null ? `${r.salToIntExp.toFixed(1)}%` : "—"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">{r.intCostPerHead != null ? fmt(r.intCostPerHead) : "—"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">{r.revPerExtHead != null ? fmt(r.revPerExtHead) : "—"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      <span className={`font-bold ${r.mgmtCostRatio > 20 ? "text-rose-600" : r.mgmtCostRatio > 10 ? "text-amber-600" : "text-slate-500"}`}>
                        {r.mgmtCostRatio != null ? `${r.mgmtCostRatio.toFixed(2)}%` : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-semibold text-emerald-600">{r.profitToRev != null ? `${r.profitToRev.toFixed(1)}%` : "—"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">{r.revPerEmp != null ? fmt(r.revPerEmp) : "—"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">{r.feePerEmp != null ? fmt(r.feePerEmp) : "—"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">{r.profitPerEmp != null ? fmt(r.profitPerEmp) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* Chart 6: Cost Ratio Radar (PRESERVED) */}
      {rpcRatios.filter(r => revDepts.includes(r.dept_name) && r.fee_to_revenue != null).length > 0 && (
        <ChartCard title="Cost Ratio Radar" subtitle="Department comparison across key ratios — capped at 100 for readability">
          {(() => {
            const radarDepts = rpcRatios.filter(r => revDepts.includes(r.dept_name) && r.fee_to_revenue != null);
            const axes = [
              { key: "fee_to_revenue", label: "Fee/Rev%" },
              { key: "dept_salary_to_dept_fee", label: "Sal/Fee%" },
              { key: "salary_to_internal_exp", label: "Sal/Exp%" },
              { key: "variable_to_fixed", label: "Var/Fixed%" },
              { key: "reimbursement_to_fixed", label: "Reimb/Fixed%" },
            ];
            const COLORS = [P.steel, P.teal, P.amber, P.brick];
            const radarData = axes.map(ax => {
              const obj = { axis: ax.label };
              radarDepts.forEach(r => {
                obj[r.dept_name] = Math.min(Number(r[ax.key] || 0), 100);
              });
              return obj;
            });
            return (
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8, fill: "#94a3b8" }} tickCount={4} />
                    {radarDepts.map((r, i) => (
                      <Radar key={r.dept_name} name={r.dept_name} dataKey={r.dept_name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.12} strokeWidth={2} />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(v) => <span style={{ color: "#64748b" }}>{v}</span>} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e2e8f0" }} formatter={(v, name) => [`${Number(v).toFixed(1)}%`, name]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </ChartCard>
      )}

      {/* Management + BD Cost — Admin summary only (PRESERVED) */}
      {isAdmin && (
        <>
          <SH icon={Wallet} title="Management & BD Cost Overview" color={P.plum} />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard label="Total Mgmt Cost" value={fmt(kpi.totalMgmtCost)} sub="Management dept salary paid" icon={Wallet} color={P.plum} />
            <KpiCard label="Total Employee Cost" value={fmt(kpi.totalEmpCost)} sub="All employee_expense_payouts" icon={Users} color={P.slate} />
            <KpiCard label="Mgmt / Total Emp Cost" value={`${kpi.adminMgmtRatio.toFixed(2)}%`} sub="Overall management overhead" icon={TrendingUp} color={P.plum} />
            <KpiCard label="BD Cost / Total Emp Cost" value={kpi.totalEmpCost > 0 ? `${(kpi.bdCost / kpi.totalEmpCost * 100).toFixed(2)}%` : "—"} sub={`BD dept salary: ${fmt(kpi.bdCost)}`} icon={TrendingUp} color={P.sky} />
          </div>
        </>
      )}

            {/* ════════════════════════════════════════════════════════════
          SECTION M — Exception Reporting (NEW)
          ════════════════════════════════════════════════════════════ */}
      <SH icon={TrendingUp} title="Weekly Cash Forecast" color={P.teal} />

          <ChartCard title="Working Capital Forecast" subtitle="Blue = Cash Balance · Green = Inflow · Red = OS Outflow · Orange = Statutory">
            {wcForecast.length === 0 ? <Empty msg="No forecast data" /> : (() => {
              const chartData = wcForecast.filter(w => w.week_offset >= 0 || w.week_offset < -5).map(w => ({
                label: w.week_label,
                offset: w.week_offset,
                cash: Number(w.closing_cash || 0),
                inflow: Number(w.actual_inflow || 0) + Number(w.forecast_inflow || 0),
                actual_inflow: Number(w.actual_inflow || 0),
                forecast_inflow: Number(w.forecast_inflow || 0),
                outflow_os: Number(w.expected_outflow_os || 0),
                outflow_statutory: Number(w.expected_outflow_statutory || 0),
                actual_outflow: Number(w.actual_outflow || 0),
                opening: Number(w.opening_cash || 0),
                net: Number(w.net_movement || 0),
                period: `${fmtDate(w.week_start)} – ${fmtDate(w.week_end)}`,
                isCurrent: w.week_offset === 0,
                isPast: w.week_offset < 0,
              }));

              const fmtAxis = (v) => {
                if (Math.abs(v) >= 1e7) return `₹${(v/1e7).toFixed(1)}Cr`;
                if (Math.abs(v) >= 1e5) return `₹${(v/1e5).toFixed(1)}L`;
                if (Math.abs(v) >= 1e3) return `₹${(v/1e3).toFixed(0)}K`;
                return `₹${v}`;
              };

              const CustomTooltip = ({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[220px]">
                    <p className="font-bold text-slate-800 mb-1">{label}</p>
                    <p className="text-[10px] text-slate-400 mb-2">{d?.period}</p>
                    <div className="space-y-1 border-t border-slate-100 pt-2">
                      {[
                        { label: "Opening Cash", value: d?.opening, color: "#94a3b8" },
                        { label: "Inflow", value: d?.inflow, color: "#2F8577" },
                        { label: "OS Outflow", value: d?.outflow_os, color: "#B14B3F" },
                        { label: "Statutory", value: d?.outflow_statutory, color: "#C08A3E" },
                        { label: "Net Movement", value: d?.net, color: d?.net >= 0 ? "#2F8577" : "#B14B3F" },
                        { label: "Closing Cash", value: d?.cash, color: "#3D6A91" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                            <span className="text-slate-500">{item.label}</span>
                          </div>
                          <span className={`font-semibold tabular-nums ${item.value < 0 ? "text-rose-600" : "text-slate-800"}`}>
                            {item.value !== 0 ? fmtAxis(item.value) : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              };

              return (
                <>
                  <div style={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={70} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} formatter={(v) => <span style={{ color: "#64748b" }}>{v}</span>} />
                        <ReferenceLine x="Current" stroke="#3b82f6" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: "NOW", position: "top", fontSize: 9, fill: "#3b82f6", fontWeight: 700 }} />

                        <Line type="monotone" dataKey="cash" name="Cash Balance" stroke="#3D6A91" strokeWidth={2.5}
                          dot={(props) => {
                            const { cx, cy, payload } = props;
                            return <circle key={`c-${payload.label}`} cx={cx} cy={cy} r={payload.isCurrent ? 5 : 3} fill={payload.isCurrent ? "#3D6A91" : "#fff"} stroke="#3D6A91" strokeWidth={2} />;
                          }} activeDot={{ r: 6, fill: "#3D6A91" }} />

                        <Line type="monotone" dataKey="inflow" name="Expected Inflow" stroke="#2F8577" strokeWidth={2}
                          dot={(props) => {
                            const { cx, cy, payload } = props;
                            if (!payload.inflow) return <g key={`i-${payload.label}`} />;
                            return <circle key={`i-${payload.label}`} cx={cx} cy={cy} r={5} fill="#2F8577" stroke="#fff" strokeWidth={2} />;
                          }} activeDot={{ r: 6, fill: "#2F8577" }} />

                        <Line type="monotone" dataKey="outflow_os" name="OS Outflow" stroke="#B14B3F" strokeWidth={2}
                          dot={(props) => {
                            const { cx, cy, payload } = props;
                            if (!payload.outflow_os) return <g key={`o-${payload.label}`} />;
                            return <circle key={`o-${payload.label}`} cx={cx} cy={cy} r={5} fill="#B14B3F" stroke="#fff" strokeWidth={2} />;
                          }} activeDot={{ r: 6, fill: "#B14B3F" }} />

                        <Line type="monotone" dataKey="outflow_statutory" name="Statutory" stroke="#C08A3E" strokeWidth={2}
                          dot={(props) => {
                            const { cx, cy, payload } = props;
                            if (!payload.outflow_statutory) return <g key={`s-${payload.label}`} />;
                            return <circle key={`s-${payload.label}`} cx={cx} cy={cy} r={5} fill="#C08A3E" stroke="#fff" strokeWidth={2} />;
                          }} activeDot={{ r: 6, fill: "#C08A3E" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-auto mt-4 border-t border-slate-100 pt-4">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-white border-b border-slate-100">
                        <tr>
                          {["Week","Period","Opening","Inflow","OS Outflow","Statutory","Net","Closing"].map((h, i) => (
                            <th key={i} className={`py-2 pr-3 text-slate-400 font-semibold ${i > 1 ? "text-right" : "text-left"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {wcForecast.filter(w => w.week_offset >= 0 || w.week_offset < -5).map((w, i) => {
                          const isCurrent = w.week_offset === 0;
                          const isPast = w.week_offset < 0;
                          return (
                            <tr key={i} className={`transition-colors ${isCurrent ? "bg-blue-50/60" : "hover:bg-slate-50/50"}`}>
                              <td className="py-2 pr-3">
                                <span className={`font-bold ${isCurrent ? "text-blue-600" : isPast ? "text-slate-400" : "text-slate-700"}`}>
                                  {w.week_label}
                                </span>
                                {isCurrent && <span className="ml-1 text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">NOW</span>}
                              </td>
                              <td className="py-2 pr-3 text-slate-400">{fmtDate(w.week_start)} – {fmtDate(w.week_end)}</td>
                              <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{fmt(w.opening_cash)}</td>
                              <td className="py-2 pr-3 text-right tabular-nums">
                                {(() => {
                                  const totalIn = Number(w.actual_inflow || 0) + Number(w.forecast_inflow || 0);
                                  const isActual = w.week_offset < 0;
                                  return totalIn > 0
                                    ? <span className="text-emerald-600 font-semibold">
                                        +{fmt(totalIn)}
                                        {isActual && <span className="ml-1 text-[9px] bg-slate-100 text-slate-500 px-1 rounded">actual</span>}
                                      </span>
                                    : <span className="text-slate-300">—</span>;
                                })()}
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
                </>
              );
            })()}
          </ChartCard>

          {/* Outstanding Collections (PRESERVED) */}
          <SH icon={Flag} title="Exception Reporting" color={P.brick} />

      {/* Highest Cost Departments (All Depts only) */}
      {!deptId && exceptionReports.deptCosts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Highest Cost Departments" subtitle="Top 10 (All Department View)">
            <div className="overflow-auto" style={{ maxHeight: 280 }}>
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                  <tr>
                    <th className="text-left py-2 pr-3 text-slate-400 font-semibold">Department</th>
                    <th className="text-right py-2 pr-3 text-slate-400 font-semibold">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {exceptionReports.deptCosts.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-2 pr-3 font-medium text-slate-800">{d.dept}</td>
                      <td className="py-2 pr-3 text-right tabular-nums font-bold text-rose-600">{fmt(d.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      )}
{/* ════════════════════════════════════════════════════════════
          SECTION N — Management Insights (NEW)
          ════════════════════════════════════════════════════════════ */}
      {managementInsights.length > 0 && (
        <>
          <SH icon={Lightbulb} title="Management Insights" color={P.amber} count={`${managementInsights.length} insights`} />
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="space-y-2">
              {managementInsights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 text-xs p-2 rounded-lg hover:bg-slate-50/50 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-amber-600">{i + 1}</span>
                  </div>
                  <span className="text-slate-600 leading-relaxed pt-0.5">{insight}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default DeptReports;
