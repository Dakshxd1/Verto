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

  const [rows, setRows] = useState([]);

  const [invoices, setInvoices] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [internalTeam, setInternalTeam] = useState([]);
  const [osPayouts, setOsPayouts] = useState([]);
  const [employeeExpenses, setEmployeeExpenses] = useState([]);

  const [rpcProfit, setRpcProfit] = useState([]);
  const [rpcDeptRev, setRpcDeptRev] = useState([]);
  const [rpcClientPL, setRpcClientPL] = useState([]);
  const [rpcCollectionDelay, setRpcCollectionDelay] = useState([]);
  const [rpcCashflowProj, setRpcCashflowProj] = useState([]);
  const [rpcPaymentsMade, setRpcPaymentsMade] = useState([]);

  const [search, setSearch] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Auth
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      if (!user) throw new Error("Not logged in");

      // 2) Permission logic — use internal_team directly, NO profiles table
      let resolvedIsAdmin = false;
      let deptNameFromInternalTeam = null;
      let resolvedDeptId = null;
      let resolvedDeptName = null;

      // Check internal_team by email
      const { data: tmByEmail } = await supabase
        .from("internal_team")
        .select("department, designation, emp_code")
        .eq("email", user.email)
        .maybeSingle();

      if (tmByEmail) {
        deptNameFromInternalTeam = tmByEmail.department || null;
        // Consider admin if designation includes admin/management titles
        const adminTitles = ["admin", "management", "director", "ceo", "founder", "head"];
        resolvedIsAdmin = adminTitles.some(t => 
          (tmByEmail.designation || "").toLowerCase().includes(t)
        );
      }

      // Fallback: try emp_code from user_metadata
      if (!tmByEmail) {
        const empCode = user?.user_metadata?.emp_code;
        if (empCode) {
          const { data: tmByCode } = await supabase
            .from("internal_team")
            .select("department, designation")
            .eq("emp_code", empCode)
            .maybeSingle();
          if (tmByCode) {
            deptNameFromInternalTeam = tmByCode.department || null;
            const adminTitles = ["admin", "management", "director", "ceo", "founder", "head"];
            resolvedIsAdmin = adminTitles.some(t => 
              (tmByCode.designation || "").toLowerCase().includes(t)
            );
          }
        }
      }

      // Also check user role from auth metadata if available
      const userRole = user?.user_metadata?.role || user?.app_metadata?.role;
      if (userRole && ["admin", "management"].includes(userRole.toLowerCase())) {
        resolvedIsAdmin = true;
      }

      setIsAdmin(resolvedIsAdmin);

      // Map department name to department ID
      if (deptNameFromInternalTeam) {
        const { data: deptRow } = await supabase
          .from("departments_master")
          .select("id, dept_name")
          .ilike("dept_name", `%${deptNameFromInternalTeam}%`)
          .maybeSingle();
        if (deptRow) {
          resolvedDeptId = deptRow.id;
          resolvedDeptName = deptRow.dept_name;
        }
      }

      if (resolvedIsAdmin) {
        // admin: load all depts list
        const { data: depts } = await supabase
          .from("departments_master")
          .select("id, dept_name")
          .order("dept_name");
        const d = depts || [];
        setAllDepts(d);
        // Default to first dept if none selected
        const effectiveDeptId = deptId || d[0]?.id || resolvedDeptId;
        if (!deptId && effectiveDeptId) setDeptId(effectiveDeptId);
        setUserDeptName(resolvedDeptName || d[0]?.dept_name || "All Departments");
      } else {
        // employee: lock to their dept
        setUserDeptId(resolvedDeptId);
        setUserDeptName(resolvedDeptName || deptNameFromInternalTeam || "(unknown)");
        setDeptId(resolvedDeptId);
      }

      // 3) Load section data
      const p_start = fy.start;  // "2026-04-01"
      const p_end = fy.end;      // "2027-03-31"

      // client_wise_pl_view — USE FULL DATES
      const effectiveDeptId = resolvedIsAdmin ? (deptId || resolvedDeptId) : resolvedDeptId;

      let viewQuery = supabase
        .from("client_wise_pl_view")
        .select("*")
        .gte("pl_month", p_start)
        .lte("pl_month", p_end);

      // Filter by department_id if available in view
      if (effectiveDeptId) {
        viewQuery = viewQuery.eq("department_id", effectiveDeptId);
      }

      const { data: viewRows, error: vErr } = await viewQuery;

      if (vErr) {
        console.error("client_wise_pl_view error:", vErr);
        throw vErr;
      }

      setRows(viewRows || []);

      // Build queries for raw tables
      const invQuery = supabase
        .from("invoices")
        .select("id, invoice_date, invoice_value, verto_fee, tds, receivable_amount, department_id, client_id, status, invoice_number")
        .gte("invoice_date", p_start)
        .lte("invoice_date", p_end);

      const osQuery = supabase
        .from("os_payouts")
        .select("id, payout_month, payment_date, amount_paid, employee_count, is_billable, pay_head, client_id, department_id, entity_id")
        .gte("payout_month", toYYYYMM(p_start))
        .lte("payout_month", toYYYYMM(p_end));

      const salQuery = supabase
        .from("employee_expense_payouts")
        .select("id, month_of_pay, date_of_pay, net_payment, pay_head, employee_name, emp_code, department_id")
        .gte("month_of_pay", toYYYYMM(p_start))
        .lte("month_of_pay", toYYYYMM(p_end));

      // Apply dept filter to raw tables
      if (effectiveDeptId) {
        invQuery.eq("department_id", effectiveDeptId);
        osQuery.eq("department_id", effectiveDeptId);
        salQuery.eq("department_id", effectiveDeptId);
      }

      const [{ data: inv }, { data: cn }, { data: tm }, { data: os }, { data: sal }] =
        await Promise.all([
          invQuery,
          supabase
            .from("credit_note_bad_debt")
            .select("id, issue_date, amount, verto_fee_cn, tds_cn, gst_cn")
            .gte("issue_date", p_start)
            .lte("issue_date", p_end),
          supabase
            .from("internal_team")
            .select("id, name, emp_code, department, designation, location, ctc, status, doj, entity, email")
            .eq("status", "Active"),
          osQuery,
          salQuery,
        ]);

      setInvoices(inv || []);
      setCreditNotes(cn || []);
      setInternalTeam(tm || []);
      setOsPayouts(os || []);
      setEmployeeExpenses(sal || []);

      // RPCs for profitability + collection/workcap + expense breakdown
      const rpcDeptParam = resolvedIsAdmin ? (deptId || null) : resolvedDeptId;

      const [dProfit, dDeptRev, dClientPL, dDelay, dCashflow, dPayMade] = await Promise.all([
        supabase.rpc("get_analytics_profit_waterfall", { p_start, p_end }),
        supabase.rpc("get_analytics_dept_revenue", {
          p_start,
          p_end,
          p_dept_id: rpcDeptParam,
          p_limit: 20,
        }),
        supabase.rpc("get_analytics_client_pl", {
          p_start,
          p_end,
          p_dept_id: rpcDeptParam,
          p_limit: 15,
        }),
        supabase.rpc("get_analytics_collection_delay", { p_start, p_end }),
        supabase.rpc("get_analytics_cashflow_projection_vs_actual", { p_start, p_end }),
        supabase.rpc("get_analytics_payments_made_breakdown", { p_start, p_end }),
      ]);

      setRpcProfit(extractData(dProfit));
      setRpcDeptRev(extractData(dDeptRev));
      setRpcClientPL(extractData(dClientPL));
      setRpcCollectionDelay(extractData(dDelay));
      setRpcCashflowProj(extractData(dCashflow));
      setRpcPaymentsMade(extractData(dPayMade));
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

  // KPIs from Section 1 data
  const kpi = useMemo(() => {
    const sum = (k) => rows.reduce((a, r) => a + Number(r[k] || 0), 0);
    const total_invoice_value = sum("total_invoice_value");
    const verto_fee_earned = sum("verto_fee_earned");
    const profit_pre_tds = sum("profit_pre_tds");
    const profit_post_tds = sum("profit_post_tds");
    const actual_profit = sum("actual_profit");
    const money_not_received = sum("money_not_received");
    const total_expense = sum("total_expense");
    const cn_bad_debt = sum("cn_bad_debt");

    const feeRevenuePct = total_invoice_value
      ? safeDivPct(verto_fee_earned, total_invoice_value)
      : 0;

    return {
      total_invoice_value,
      verto_fee_earned,
      profit_pre_tds,
      profit_post_tds,
      actual_profit,
      money_not_received,
      total_expense,
      cn_bad_debt,
      feeRevenuePct,
    };
  }, [rows]);

  // Revenue & Fee Growth computed from client_wise_pl_view grouped by month
  const growth = useMemo(() => {
    const groupByMonth = new Map();
    for (const r of rows) {
      const ym = r.pl_month;
      if (!ym) continue;
      if (!groupByMonth.has(ym)) {
        groupByMonth.set(ym, { rev: 0, fee: 0, cn: 0 });
      }
      const g = groupByMonth.get(ym);
      g.rev += Number(r.total_invoice_value || 0);
      g.fee += Number(r.verto_fee_earned || 0);
      g.cn += Number(r.cn_bad_debt || 0);
    }
    const months = Array.from(groupByMonth.entries())
      .map(([ym, v]) => ({ ym, ...v, x: fmtMonth(ym) }))
      .sort((a, b) => String(a.ym).localeCompare(String(b.ym)));
    const last = months[months.length - 1];
    const prev = months[months.length - 2];

    const revMoM = prev ? safeDivPct(last.rev - prev.rev, prev.rev) : 0;
    const feeMoM = prev ? safeDivPct(last.fee - prev.fee, prev.fee) : 0;

    return { months, last, prev, revMoM, feeMoM };
  }, [rows]);

  const section1Table = useMemo(() => {
    const d = rows.filter((r) => {
      if (!search.trim()) return true;
      const t = search.toLowerCase();
      return (
        String(r.client_name || "").toLowerCase().includes(t) ||
        String(r.dept_name || "").toLowerCase().includes(t) ||
        String(r.month_label || "").toLowerCase().includes(t)
      );
    });
    return d
      .map((r) => ({
        month: r.month_label || r.pl_month,
        client: r.client_name,
        Revenue: r.total_invoice_value,
        "Verto Fee": r.verto_fee_earned,
        TDS: r.tds,
        "Fee Post TDS": r.verto_fee_post_tds,
        "Not Received": r.money_not_received,
        Expense: r.total_expense,
        "CN/Bad Debt": r.cn_bad_debt,
        "Profit Pre TDS": r.profit_pre_tds,
        "Profit Post TDS": r.profit_post_tds,
        "Actual Profit": r.actual_profit,
        _raw: r,
      }))
      .sort((a, b) => String(a._raw?.pl_month || "").localeCompare(String(b._raw?.pl_month || "")));
  }, [rows, search]);

  const [page, setPage] = useState(1);
  const ITEMS = 10;
  useEffect(() => setPage(1), [search, deptId, fyStartYear]);

  const paged = useMemo(() => {
    const start = (page - 1) * ITEMS;
    return section1Table.slice(start, start + ITEMS);
  }, [section1Table, page]);

  const exportExcel = () => {
    const headers = [
      "Month", "Client", "Revenue", "Verto Fee", "TDS", "Fee Post TDS",
      "Not Received", "Expense", "CN/Bad Debt", "Profit Pre TDS",
      "Profit Post TDS", "Actual Profit",
    ];

    const rowsX = section1Table.map((r) => [
      r.month, r.client, r.Revenue, r["Verto Fee"], r.TDS,
      r["Fee Post TDS"], r["Not Received"], r.Expense, r["CN/Bad Debt"],
      r["Profit Pre TDS"], r["Profit Post TDS"], r["Actual Profit"],
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

  // Collections + working capital summary KPIs
  const collectionKPIs = useMemo(() => {
    const totalOutstanding = rpcCollectionDelay.reduce(
      (s, r) => s + Number(r.receivable_amount || 0), 0
    );
    const overdue = rpcCollectionDelay.filter((r) => String(r.delay_bucket || "").includes("Overdue"));
    const overdueAmt = overdue.reduce((s, r) => s + Number(r.receivable_amount || 0), 0);
    const overduePct = totalOutstanding ? (overdueAmt / totalOutstanding) * 100 : 0;
    const critical = rpcCollectionDelay.filter((r) => r.delay_bucket === "Overdue 60d+");
    const criticalAmt = critical.reduce((s, r) => s + Number(r.receivable_amount || 0), 0);

    const cashNet = (rpcCashflowProj || []).map((r) => ({
      x: r.month,
      net: Number(r.actual_inflow || 0) - Number(r.actual_outflow || 0),
    }));
    const netCash = cashNet.length ? cashNet[cashNet.length - 1].net : 0;

    return { totalOutstanding, overdueAmt, overduePct, criticalAmt, netCash };
  }, [rpcCollectionDelay, rpcCashflowProj]);

  // HR KPIs
  const hrKPIs = useMemo(() => {
    const totalEmployees = internalTeam.length;
    const active = internalTeam.filter((t) => t.status === "Active").length;

    const now = new Date();
    const dojDates = internalTeam.map((t) => t.doj).filter(isValidDateStr);
    const avgTenureMonths = dojDates.length
      ? dojDates.reduce((s, d) => {
          const dt = new Date(d);
          const months = (now - dt) / (1000 * 60 * 60 * 24 * 30.4375);
          return s + months;
        }, 0) / dojDates.length
      : 0;

    return { totalEmployees, active, avgTenureMonths };
  }, [internalTeam]);

  const upcomingDates = useMemo(() => {
    const now = new Date();
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);
    const thisWeek = new Date(now);
    thisWeek.setDate(thisWeek.getDate() + 7);

    const hasDob = internalTeam.some((t) => t.dob);
    const birthdays = [];

    if (hasDob) {
      for (const t of internalTeam) {
        if (!t.dob) continue;
        const d = new Date(t.dob);
        const year = now.getFullYear();
        const candidate = new Date(year, d.getMonth(), d.getDate());
        const candidateNextYear = new Date(year + 1, d.getMonth(), d.getDate());
        const picked = candidate >= now ? candidate : candidateNextYear;
        if (picked >= now && picked <= in30) {
          birthdays.push({ name: t.name, date: picked });
        }
      }
    }

    const anniversaries = [];
    for (const t of internalTeam) {
      if (!t.doj) continue;
      const d = new Date(t.doj);
      const year = now.getFullYear();
      const candidate = new Date(year, d.getMonth(), d.getDate());
      const candidateNextYear = new Date(year + 1, d.getMonth(), d.getDate());
      const picked = candidate >= now ? candidate : candidateNextYear;
      if (picked >= now && picked <= in30) {
        anniversaries.push({ name: t.name, date: picked });
      }
    }

    const birthdaysThisWeek = birthdays.filter((b) => b.date <= thisWeek).length;
    const anniversariesThisWeek = anniversaries.filter((b) => b.date <= thisWeek).length;

    return {
      birthdays,
      anniversaries,
      hasDob,
      alertCount: birthdaysThisWeek + anniversariesThisWeek,
    };
  }, [internalTeam]);

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
                placeholder="Client / dept / month…"
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

      <SH icon={TrendingUp} title="Department P&L Overview" color={P.steel} count={`${rows.length} rows`} />

      {/* Section 1 KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="Total Revenue" value={fmt(kpi.total_invoice_value)} sub={`FY ${fy.label}`} icon={FileText} color={P.steel} />
        <KpiCard label="Verto Fee" value={fmt(kpi.verto_fee_earned)} sub="Fee earned" icon={TrendingUp} color={P.trend} />
        <KpiCard label="Fee / Revenue %" value={`${kpi.feeRevenuePct.toFixed(1)}%`} sub="verto_fee_earned / total_invoice_value" icon={Wallet} color={P.sky} />
        <KpiCard label="Profit Pre TDS" value={fmt(kpi.profit_pre_tds)} sub="profit_pre_tds" icon={TrendingUp} color={P.teal} />
        <KpiCard label="Profit Post TDS" value={fmt(kpi.profit_post_tds)} sub="profit_post_tds" icon={TrendingUp} color={P.amber} />
        <KpiCard label="Actual Profit" value={fmt(kpi.actual_profit)} sub="actual_profit" icon={TrendingUp} color={kpi.actual_profit >= 0 ? P.teal : P.brick} />
        <KpiCard label="Amount Not Received" value={fmt(kpi.money_not_received)} sub="money_not_received" icon={AlertTriangle} color={P.amber} />
        <KpiCard label="Total Expense" value={fmt(kpi.total_expense)} sub="total_expense" icon={CreditCard} color={P.plum} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <ChartCard
          title="Department P&L Detail (client-wise)"
          subtitle="Month + Client rows"
        >
          {section1Table.length === 0 ? (
            <Empty />
          ) : (
            <>
              <DataTable
                maxHeight={380}
                columns={[
                  { header: "Month", key: "month", className: "text-slate-500" },
                  { header: "Client", key: "client", className: "font-medium text-slate-800" },
                  { header: "Revenue", key: "Revenue", align: "right", formatter: (v) => <span className="font-semibold text-slate-700">{fmt(v)}</span> },
                  { header: "Verto Fee", key: "Verto Fee", align: "right", formatter: (v) => <span className="font-semibold text-slate-700">{fmt(v)}</span> },
                  { header: "TDS", key: "TDS", align: "right", formatter: (v) => <span className={Number(v) > 0 ? "text-rose-600 font-semibold" : "text-slate-300"}>{Number(v) > 0 ? `-${fmt(v)}` : "—"}</span> },
                  { header: "Fee Post TDS", key: "Fee Post TDS", align: "right", formatter: (v) => <span className="font-semibold text-slate-700">{fmt(v)}</span> },
                  { header: "Not Received", key: "Not Received", align: "right", formatter: (v) => <span className="text-amber-700 font-semibold">{Number(v) ? fmt(v) : "—"}</span> },
                  { header: "Expense", key: "Expense", align: "right", formatter: (v) => <span className="text-slate-600 font-semibold">{Number(v) ? `-${fmt(v)}` : "—"}</span> },
                  { header: "CN/Bad Debt", key: "CN/Bad Debt", align: "right", formatter: (v) => <span className="text-rose-600 font-semibold">{Number(v) ? `-${fmt(v)}` : "—"}</span> },
                  { header: "Profit Pre TDS", key: "Profit Pre TDS", align: "right", formatter: (v) => <span className={Number(v) >= 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>{fmt(v)}</span> },
                  { header: "Profit Post TDS", key: "Profit Post TDS", align: "right", formatter: (v) => <span className={Number(v) >= 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>{fmt(v)}</span> },
                  { header: "Actual Profit", key: "Actual Profit", align: "right", formatter: (v) => <span className={Number(v) >= 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>{fmt(v)}</span> },
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
        <ChartCard title="Monthly Revenue vs Net Fee" subtitle="Computed from client_wise_pl_view">
          <div className="text-xs text-slate-500">Monthly breakdown:</div>
          {growth.months.slice(-6).map((m) => (
            <div key={m.ym} className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="font-semibold text-slate-700">{m.x}</span>
              <span className="text-slate-600 tabular-nums">Rev: {fmt(m.rev)} · Fee: {fmt(m.fee)}</span>
            </div>
          ))}
        </ChartCard>
        <ChartCard title="Client-wise Top 10 Revenue" subtitle="Rank (top 10 clients)">
          {(() => {
            const map = new Map();
            for (const r of rows) {
              const key = r.client_name;
              const prev = map.get(key) || 0;
              map.set(key, prev + Number(r.total_invoice_value || 0));
            }
            const arr = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
            arr.sort((a, b) => b.value - a.value);
            const top = arr.slice(0, 10);
            return top.length === 0 ? <Empty /> : (
              <div className="space-y-2">
                {top.map((t, i) => (
                  <div key={t.name} className="flex items-center gap-2">
                    <span className="w-6 text-xs font-bold text-slate-400">{i + 1}</span>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-slate-700 truncate">{t.name}</div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${safeDivPct(t.value, top[0]?.value || 1)}%` }}
                          className="h-2 rounded-full bg-blue-600/70"
                        />
                      </div>
                    </div>
                    <div className="w-28 text-right text-xs font-bold text-slate-700 tabular-nums">{fmt(t.value)}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </ChartCard>
      </div>

      {/* SECTION 3 Profitability */}
      <SH icon={TrendingUp} title="Profitability" color={P.amber} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          label="Profit Margin % (Pre TDS)"
          value={`${safeDivPct(kpi.profit_pre_tds, kpi.verto_fee_earned).toFixed(1)}%`}
          sub="profit_pre_tds / verto_fee_earned"
          icon={TrendingUp}
          color={P.teal}
        />
        <KpiCard
          label="Profit Margin % (Post TDS)"
          value={`${safeDivPct(kpi.profit_post_tds, kpi.verto_fee_post_tds).toFixed(1)}%`}
          sub="profit_post_tds / verto_fee_post_tds"
          icon={TrendingUp}
          color={P.trend}
        />
        <KpiCard
          label="Actual Profit Margin"
          value={`${(() => {
            const denom = kpi.verto_fee_earned - kpi.cn_bad_debt;
            return safeDivPct(kpi.actual_profit, denom).toFixed(1);
          })()}%`}
          sub="actual_profit / (verto_fee_earned - cn_bad_debt)"
          icon={FileText}
          color={kpi.actual_profit >= 0 ? P.teal : P.brick}
        />
        <KpiCard
          label="Actual Profit"
          value={fmt(kpi.actual_profit)}
          sub="actual_profit"
          icon={TrendingUp}
          color={kpi.actual_profit >= 0 ? P.teal : P.brick}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Monthly Profit (Pre vs Post vs Actual)" subtitle="Computed/available via profit waterfall RPC">
          {rpcProfit.length === 0 ? <Empty msg="No profit waterfall data" /> : (
            <div className="text-xs text-slate-500">
              {rpcProfit.slice(-6).map((r) => (
                <div key={r.month} className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">{r.month}</span>
                  <span className="text-slate-600 tabular-nums">
                    Pre: {fmt(r.profit_pre_tds)} · Post: {fmt(r.profit_post_tds)} · Actual: {fmt(r.actual_profit)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
        <ChartCard title="Client-wise Actual Profit (Top)" subtitle="Top clients by actual profit">
          {rpcClientPL.length === 0 ? <Empty msg="No client profit data" /> : (
            <div className="space-y-2">
              {rpcClientPL.slice(0, 10).map((r, i) => (
                <div key={r.client_name} className="flex items-center justify-between py-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-xs font-bold text-slate-400">{i + 1}</span>
                    <span className="text-xs font-semibold text-slate-700 truncate max-w-[220px]">{r.client_name}</span>
                  </div>
                  <span className={`text-xs font-bold tabular-nums ${Number(r.actual_profit) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {fmt(r.actual_profit)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* SECTION 4 Manpower & Salary */}
      <SH icon={Users} title="Manpower & Salary" color={P.plum} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="Internal Team Count" value={fmtCount(internalTeam.filter((t) => t.status === "Active").length)} sub="Active employees" icon={Users} color={P.slate} />
        <KpiCard label="External Manpower Count" value={fmtCount(osPayouts.reduce((s, r) => s + Number(r.employee_count || 0), 0))} sub="sum employee_count" icon={Users} color={P.clay} />
        <KpiCard label="Internal / External" value={(() => {
          const i = internalTeam.filter((t) => t.status === "Active").length;
          const e = osPayouts.reduce((s, r) => s + Number(r.employee_count || 0), 0);
          return e ? (i / e).toFixed(2) : "—";
        })()} sub="ratio" icon={TrendingUp} color={P.teal} />
        <KpiCard label="Revenue per Employee" value={(() => {
          const totalEmp = internalTeam.filter((t) => t.status === "Active").length + osPayouts.reduce((s, r) => s + Number(r.employee_count || 0), 0);
          const denom = totalEmp || 0;
          return denom ? fmt(kpi.total_invoice_value / denom) : "—";
        })()} sub="total_invoice_value / employees" icon={FileText} color={P.steel} />
      </div>

      <div className="text-xs text-slate-500">(Charts for manpower/ salary breakdown require additional recharts integration; kept minimal here.)</div>

      {/* SECTION 6 Collections & Working Capital */}
      <SH icon={Wallet} title="Collections & Working Capital" color={P.sky} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="Total Outstanding" value={fmt(collectionKPIs.totalOutstanding)} sub="sum receivable_amount" icon={Wallet} color={P.amber} />
        <KpiCard label="Overdue Amount" value={fmt(collectionKPIs.overdueAmt)} sub="Overdue buckets" icon={AlertTriangle} color={P.brick} />
        <KpiCard label="Overdue % of Total" value={`${collectionKPIs.overduePct.toFixed(1)}%`} sub="overdue / total" icon={TrendingUp} color={P.amber} />
        <KpiCard label="Critical (60d+)" value={fmt(collectionKPIs.criticalAmt)} sub="Overdue 60d+" icon={AlertTriangle} color={P.brick} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Collection Delay Buckets" subtitle="Risk segments">
          {rpcCollectionDelay.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {(() => {
                const order = [
                  "Paid", "Not Yet Due", "No Due Date", "Overdue 1–15d",
                  "Overdue 16–30d", "Overdue 31–60d", "Overdue 60d+",
                ];
                const m = new Map();
                for (const r of rpcCollectionDelay) {
                  const b = r.delay_bucket || "Unknown";
                  if (!m.has(b)) m.set(b, { bucket: b, outstanding: 0 });
                  m.get(b).outstanding += Number(r.receivable_amount || 0);
                }
                const arr = order.map((b) => m.get(b)).filter(Boolean);
                return arr.length === 0 ? <Empty /> : arr.map((x) => (
                  <div key={x.bucket} className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-700">{x.bucket}</span>
                    <span className="text-xs font-bold text-slate-700 tabular-nums">{fmt(x.outstanding)}</span>
                  </div>
                ));
              })()}
            </div>
          )}
        </ChartCard>
        <ChartCard title="Projected vs Actual Net Cash" subtitle="from RPC">
          {rpcCashflowProj.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {rpcCashflowProj.slice(-6).map((r) => (
                <div key={r.month} className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-700">{r.month}</span>
                  <span className="text-xs font-bold tabular-nums text-slate-700">Net: {fmt(Number(r.actual_inflow || 0) - Number(r.actual_outflow || 0))}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* SECTION 7 HR Intelligence */}
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
        <KpiCard label="Avg Tenure" value={`${(hrKPIs.avgTenureMonths / 12).toFixed(1)} yrs`} sub="based on doj" icon={Calendar} color={P.sky} />
        <KpiCard label="Total Employees" value={fmtCount(hrKPIs.totalEmployees)} sub="all records" icon={Users} color={P.slate} />
        <KpiCard label="New Joiners" value={"—"} sub="needs joiner logic" icon={Users} color={P.amber} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Upcoming Birthdays & Alerts" subtitle={upcomingDates.hasDob ? "next 30 days" : "dob field not available"}>
          {!upcomingDates.hasDob ? (
            <Empty msg="Birthdays unavailable (dob not present in internal_team)" />
          ) : upcomingDates.birthdays.length === 0 ? (
            <Empty msg="No birthdays in next 30 days" />
          ) : (
            <div className="space-y-2">
              {upcomingDates.birthdays.slice(0, 10).map((b) => (
                <div key={b.name + b.date.toISOString()} className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-700 truncate max-w-[240px]">{b.name}</span>
                  <span className="text-xs font-bold text-slate-700 tabular-nums">{fmtDate(b.date)}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Work Anniversaries" subtitle="next 30 days from doj">
          {upcomingDates.anniversaries.length === 0 ? (
            <Empty msg="No anniversaries in next 30 days" />
          ) : (
            <div className="space-y-2">
              {upcomingDates.anniversaries.slice(0, 10).map((a) => (
                <div key={a.name + a.date.toISOString()} className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-700 truncate max-w-[240px]">{a.name}</span>
                  <span className="text-xs font-bold text-slate-700 tabular-nums">{fmtDate(a.date)}</span>
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
