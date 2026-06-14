import React, { useState, useEffect, useCallback, useMemo } from "react";
import supabase from "../lib/supabaseClient";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, Tooltip, XAxis, YAxis,
  CartesianGrid, ResponsiveContainer, Legend, LabelList,
} from "recharts";
import {
  TrendingUp, DollarSign, Users, CreditCard,
  FileText, Activity, Filter, RefreshCw,
  ChevronDown, X, ArrowUpRight, ArrowDownRight,
  Wallet, Building2, BarChart2, PieChartIcon,
  Calendar, Search,
} from "lucide-react";

// ─── Palette ─────────────────────────────────────────────────────────────────
const P = {
  blue:    "#3b82f6",
  indigo:  "#6366f1",
  violet:  "#8b5cf6",
  emerald: "#10b981",
  amber:   "#f59e0b",
  rose:    "#f43f5e",
  sky:     "#0ea5e9",
  teal:    "#14b8a6",
  orange:  "#f97316",
  pink:    "#ec4899",
};
const CHART_COLORS = Object.values(P);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => {
  const v = Number(n || 0);
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
};
const fmtFull = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtMonth = (d) => {
  if (!d) return "";
  const dt = new Date(d + (d.length === 7 ? "-01" : ""));
  return dt.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3 text-xs min-w-[140px]">
      {label && <p className="font-bold text-gray-700 mb-2 border-b pb-1">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3 mt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || p.fill }} />
            <span className="text-gray-500">{p.name}</span>
          </span>
          <span className="font-semibold text-gray-800">
            {typeof p.value === "number" && p.value > 1000 ? fmtFull(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, icon: Icon, color, trend }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center`}
        style={{ background: color + "18" }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      {trend !== undefined && (
        <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
          {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
    <p className="text-xs font-semibold text-gray-500 mt-1">{label}</p>
    {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

// ─── Chart Card ───────────────────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>
    <div className="mb-4">
      <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, color, activeFilters = [], appliesTo = [] }) => {
  // Which of the currently-active filters actually affect this section
  const relevant = appliesTo.filter((f) => activeFilters.includes(f));
  // Which active filters do NOT affect this section
  const ignored  = activeFilters.filter((f) => !appliesTo.includes(f));

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + "18" }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">{title}</h2>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Filter applicability tags */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-10">
        {/* Filters that DO apply — shown in color */}
        {relevant.map((f) => (
          <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            {f}
          </span>
        ))}
        {/* Filters that DON'T apply — shown in gray with strikethrough feel */}
        {ignored.map((f) => (
          <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-300 border border-gray-100" title={`"${f}" filter doesn't affect this section`}>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
            {f} ✕
          </span>
        ))}
        {/* If no filters active at all, show what would apply */}
        {activeFilters.length === 0 && (
          <span className="text-[10px] text-gray-300 font-medium">
            Responds to: {appliesTo.join(" · ")}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Filter Select ────────────────────────────────────────────────────────────
const FilterSelect = ({ label, value, onChange, options, placeholder = "All" }) => (
  <div className="relative">
    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2 pr-8 text-xs font-medium text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
    </div>
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────
const Empty = ({ msg = "No data for selected filters" }) => (
  <div className="flex flex-col items-center justify-center py-10 text-gray-300">
    <BarChart2 className="w-8 h-8 mb-2" />
    <p className="text-xs font-medium">{msg}</p>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AnalyticsDashboard() {
  // ── Raw Data ──────────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [osPayouts, setOsPayouts] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [team, setTeam] = useState([]);
  const [bankEntries, setBankEntries] = useState([]);
  const [softwareEntries, setSoftwareEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    impactMonth: "",
    department: "",
    client: "",
    entity: "",
    invoiceNumber: "",
    status: "",
    payHead: "",
    employee: "",
  });
  const [filtersOpen, setFiltersOpen] = useState(true);

  const setFilter = (k, v) => setFilters((p) => ({ ...p, [k]: v }));
  const clearFilters = () => setFilters({ dateFrom: "", dateTo: "", impactMonth: "", department: "", client: "", entity: "", invoiceNumber: "", status: "", payHead: "", employee: "" });
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // ── Fetch all data ────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [
      { data: inv },
      { data: pay },
      { data: os },
      { data: sal },
      { data: tm },
      { data: be },
      { data: se },
      { data: cl },
      { data: dm },
      { data: em },
    ] = await Promise.all([
      supabase.from("invoices").select(`*, clients_master(client_name), departments_master(dept_name), entity_master(entity_name)`),
      supabase.from("payments_received").select(`*, invoices(invoice_number, client_id, clients_master(client_name))`),
      supabase.from("os_payouts").select(`*, clients_master(client_name), departments_master(dept_name), entity_master(entity_name)`),
      supabase.from("employee_expense_payouts").select(`*, departments_master(dept_name), entity_master(entity_name)`),
      supabase.from("internal_team").select("*"),
      supabase.from("bank_entries").select("*").order("date"),
      supabase.from("software_entries").select("*").order("date"),
      supabase.from("clients_master").select("id, client_name"),
      supabase.from("departments_master").select("id, dept_name"),
      supabase.from("entity_master").select("id, entity_name"),
    ]);
    setInvoices(inv || []);
    setPayments(pay || []);
    setOsPayouts(os || []);
    setSalaries(sal || []);
    setTeam(tm || []);
    setBankEntries(be || []);
    setSoftwareEntries(se || []);
    setClients(cl || []);
    setDepartments(dm || []);
    setEntities(em || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Flat helpers ──────────────────────────────────────────────────────────
  const flatInvoices = useMemo(() => invoices.map((i) => ({
    ...i,
    client_name: i.clients_master?.client_name || i.client_name || "Unknown",
    dept_name: i.departments_master?.dept_name || "Unknown",
    entity_name: i.entity_master?.entity_name || "Unknown",
  })), [invoices]);

  const flatSalaries = useMemo(() => salaries.map((s) => ({
    ...s,
    dept_name: s.departments_master?.dept_name || s.department || "Unknown",
    entity_name: s.entity_master?.entity_name || "Unknown",
  })), [salaries]);

  const flatOs = useMemo(() => osPayouts.map((o) => ({
    ...o,
    client_name: o.clients_master?.client_name || "Unknown",
    dept_name: o.departments_master?.dept_name || "Unknown",
  })), [osPayouts]);

  // ── Apply Filters ─────────────────────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    return flatInvoices.filter((i) => {
      if (filters.dateFrom && i.invoice_date < filters.dateFrom) return false;
      if (filters.dateTo && i.invoice_date > filters.dateTo) return false;
      if (filters.impactMonth) {
        const im = i.impact_month?.slice(0, 7);
        if (im !== filters.impactMonth) return false;
      }
      if (filters.department && i.dept_name !== filters.department) return false;
      if (filters.client && i.client_name !== filters.client) return false;
      if (filters.entity && i.entity_name !== filters.entity) return false;
      if (filters.invoiceNumber && !i.invoice_number?.toLowerCase().includes(filters.invoiceNumber.toLowerCase())) return false;
      if (filters.status && i.status !== filters.status) return false;
      if (filters.payHead && i.pay_head !== filters.payHead) return false;
      return true;
    });
  }, [flatInvoices, filters]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (filters.dateFrom && p.payment_date < filters.dateFrom) return false;
      if (filters.dateTo && p.payment_date > filters.dateTo) return false;
      if (filters.invoiceNumber) {
        const inv = p.invoices?.invoice_number || "";
        if (!inv.toLowerCase().includes(filters.invoiceNumber.toLowerCase())) return false;
      }
      return true;
    });
  }, [payments, filters]);

  const filteredOs = useMemo(() => {
    return flatOs.filter((o) => {
      if (filters.dateFrom && o.payment_date < filters.dateFrom) return false;
      if (filters.dateTo && o.payment_date > filters.dateTo) return false;
      if (filters.department && o.dept_name !== filters.department) return false;
      if (filters.client && o.client_name !== filters.client) return false;
      return true;
    });
  }, [flatOs, filters]);

  const filteredSalaries = useMemo(() => {
    return flatSalaries.filter((s) => {
      if (filters.dateFrom && s.date_of_pay && s.date_of_pay < filters.dateFrom) return false;
      if (filters.dateTo && s.date_of_pay && s.date_of_pay > filters.dateTo) return false;
      if (filters.department && s.dept_name !== filters.department) return false;
      if (filters.entity && s.entity_name !== filters.entity) return false;
      if (filters.payHead && s.pay_head !== filters.payHead) return false;
      if (filters.employee && !s.employee_name?.toLowerCase().includes(filters.employee.toLowerCase())) return false;
      return true;
    });
  }, [flatSalaries, filters]);

  const filteredTeam = useMemo(() => {
    return team.filter((t) => {
      if (filters.department && t.department !== filters.department) return false;
      if (filters.employee && !t.name?.toLowerCase().includes(filters.employee.toLowerCase())) return false;
      return true;
    });
  }, [team, filters]);

  const filteredBank = useMemo(() => {
    return bankEntries.filter((b) => {
      if (filters.dateFrom && b.date < filters.dateFrom) return false;
      if (filters.dateTo && b.date > filters.dateTo) return false;
      return true;
    });
  }, [bankEntries, filters]);

  const filteredSoftware = useMemo(() => {
    return softwareEntries.filter((s) => {
      if (filters.dateFrom && s.date < filters.dateFrom) return false;
      if (filters.dateTo && s.date > filters.dateTo) return false;
      return true;
    });
  }, [softwareEntries, filters]);

  // ── KPI Calculations ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalInvoiceValue = filteredInvoices.reduce((s, i) => s + Number(i.invoice_value || 0), 0);
    const totalReceived = filteredPayments.reduce((s, p) => s + Number(p.amount_received || 0), 0);
    const totalOutstanding = filteredInvoices.reduce((s, i) => s + Number(i.receivable_amount || 0), 0);
    const totalVertoFee = filteredInvoices.reduce((s, i) => s + Number(i.verto_fee || 0), 0);
    const totalOsPayout = filteredOs.reduce((s, o) => s + Number(o.amount_paid || 0), 0);
    const totalSalary = filteredSalaries.reduce((s, e) => s + Number(e.net_payment || 0), 0);
    const totalEmployees = filteredTeam.filter((t) => t.status === "Active").length;
    const collectionPct = totalInvoiceValue > 0 ? ((totalReceived / totalInvoiceValue) * 100).toFixed(1) : 0;
    return { totalInvoiceValue, totalReceived, totalOutstanding, totalVertoFee, totalOsPayout, totalSalary, totalEmployees, collectionPct };
  }, [filteredInvoices, filteredPayments, filteredOs, filteredSalaries, filteredTeam]);

  // ── Chart Data ────────────────────────────────────────────────────────────

  // 1. Invoice Value by Month
  const invoiceByMonth = useMemo(() => {
    const map = {};
    filteredInvoices.forEach((i) => {
      const m = i.impact_month?.slice(0, 7) || i.invoice_date?.slice(0, 7);
      if (!m) return;
      if (!map[m]) map[m] = { month: m, invoiceValue: 0, vertoFee: 0, gst: 0, tds: 0, netInHand: 0 };
      map[m].invoiceValue += Number(i.invoice_value || 0);
      map[m].vertoFee += Number(i.verto_fee || 0);
      map[m].gst += Number(i.gst || 0);
      map[m].tds += Number(i.tds || 0);
      map[m].netInHand += Number(i.net_in_hand || 0);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map((d) => ({ ...d, month: fmtMonth(d.month) }));
  }, [filteredInvoices]);

  // 2. Invoice status donut
  const invoiceStatus = useMemo(() => {
    const map = {};
    filteredInvoices.forEach((i) => {
      const s = i.status || "Unknown";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredInvoices]);

  // 3. Revenue by client
  const revenueByClient = useMemo(() => {
    const map = {};
    filteredInvoices.forEach((i) => {
      const c = i.client_name;
      if (!map[c]) map[c] = { client: c, invoiceValue: 0, received: 0, vertoFee: 0 };
      map[c].invoiceValue += Number(i.invoice_value || 0);
      map[c].vertoFee += Number(i.verto_fee || 0);
    });
    filteredPayments.forEach((p) => {
      const c = p.invoices?.clients_master?.client_name || "Unknown";
      if (!map[c]) map[c] = { client: c, invoiceValue: 0, received: 0, vertoFee: 0 };
      map[c].received += Number(p.amount_received || 0);
    });
    return Object.values(map).sort((a, b) => b.invoiceValue - a.invoiceValue);
  }, [filteredInvoices, filteredPayments]);

  // 4. Revenue by department
  const revenueByDept = useMemo(() => {
    const map = {};
    filteredInvoices.forEach((i) => {
      const d = i.dept_name;
      if (!map[d]) map[d] = { dept: d, invoiceValue: 0, vertoFee: 0, employeeCount: 0 };
      map[d].invoiceValue += Number(i.invoice_value || 0);
      map[d].vertoFee += Number(i.verto_fee || 0);
      map[d].employeeCount += Number(i.employee_count || 0);
    });
    return Object.values(map).sort((a, b) => b.invoiceValue - a.invoiceValue);
  }, [filteredInvoices]);

  // 5. Pay head donut (invoices)
  const payHeadInvoice = useMemo(() => {
    const map = {};
    filteredInvoices.forEach((i) => {
      const ph = i.pay_head || "Other";
      map[ph] = (map[ph] || 0) + Number(i.invoice_value || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredInvoices]);

  // 6. Collection: invoice vs received per invoice
  const collectionPerInvoice = useMemo(() => {
    return filteredInvoices.map((i) => ({
      invoice: i.invoice_number,
      "Invoice Value": Number(i.invoice_value || 0),
      "Amount Received": Number(i.amount_received || 0),
      "Collection %": i.invoice_value > 0 ? Math.round((Number(i.amount_received) / Number(i.invoice_value)) * 100) : 0,
    }));
  }, [filteredInvoices]);

  // 7. Outstanding by client
  const outstandingByClient = useMemo(() => {
    const map = {};
    filteredInvoices.forEach((i) => {
      const c = i.client_name;
      map[c] = (map[c] || 0) + Number(i.receivable_amount || 0);
    });
    return Object.entries(map).map(([client, outstanding]) => ({ client, outstanding })).filter((d) => d.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding);
  }, [filteredInvoices]);

  // 8. Payments received trend
  const paymentsTrend = useMemo(() => {
    const map = {};
    filteredPayments.forEach((p) => {
      const d = p.payment_date;
      if (!d) return;
      if (!map[d]) map[d] = { date: d, received: 0 };
      map[d].received += Number(p.amount_received || 0);
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ ...d, date: fmtDate(d.date) }));
  }, [filteredPayments]);

  // 9. OS payout by month
  const osByMonth = useMemo(() => {
    const map = {};
    filteredOs.forEach((o) => {
      const m = o.payout_month?.slice(0, 7);
      if (!m) return;
      if (!map[m]) map[m] = { month: m, amountPaid: 0, employeeCount: 0, billable: 0, nonBillable: 0 };
      map[m].amountPaid += Number(o.amount_paid || 0);
      map[m].employeeCount += Number(o.employee_count || 0);
      if (o.is_billable) map[m].billable += Number(o.amount_paid || 0);
      else map[m].nonBillable += Number(o.amount_paid || 0);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map((d) => ({ ...d, month: fmtMonth(d.month) }));
  }, [filteredOs]);

  // 10. OS payout by client
  const osByClient = useMemo(() => {
    const map = {};
    filteredOs.forEach((o) => {
      const c = o.client_name;
      if (!map[c]) map[c] = { client: c, amountPaid: 0, employeeCount: 0 };
      map[c].amountPaid += Number(o.amount_paid || 0);
      map[c].employeeCount += Number(o.employee_count || 0);
    });
    return Object.values(map).sort((a, b) => b.amountPaid - a.amountPaid);
  }, [filteredOs]);

  // 11. Billable vs non-billable OS donut
  const osBillable = useMemo(() => {
    let b = 0, nb = 0;
    filteredOs.forEach((o) => {
      if (o.is_billable) b += Number(o.amount_paid || 0);
      else nb += Number(o.amount_paid || 0);
    });
    return [{ name: "Billable", value: b }, { name: "Non-Billable", value: nb }].filter((d) => d.value > 0);
  }, [filteredOs]);

  // 12. Salary by month
  const salaryByMonth = useMemo(() => {
    const map = {};
    filteredSalaries.forEach((s) => {
      const m = s.month_of_pay?.slice(0, 7);
      if (!m) return;
      if (!map[m]) map[m] = { month: m, salary: 0, count: 0 };
      map[m].salary += Number(s.net_payment || 0);
      map[m].count += 1;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map((d) => ({ ...d, month: fmtMonth(d.month) }));
  }, [filteredSalaries]);

  // 13. Salary by department
  const salaryByDept = useMemo(() => {
    const map = {};
    filteredSalaries.forEach((s) => {
      const d = s.dept_name;
      if (!map[d]) map[d] = { dept: d, salary: 0, count: 0 };
      map[d].salary += Number(s.net_payment || 0);
      map[d].count += 1;
    });
    return Object.values(map).sort((a, b) => b.salary - a.salary);
  }, [filteredSalaries]);

  // 14. Pay head split salary donut
  const salaryPayHead = useMemo(() => {
    const map = {};
    filteredSalaries.forEach((s) => {
      const ph = s.pay_head || "Other";
      map[ph] = (map[ph] || 0) + Number(s.net_payment || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredSalaries]);

  // 15. Team by department
  const teamByDept = useMemo(() => {
    const map = {};
    filteredTeam.forEach((t) => {
      const d = t.department || "Unknown";
      if (!map[d]) map[d] = { dept: d, count: 0, ctc: 0, active: 0 };
      map[d].count += 1;
      map[d].ctc += Number(t.ctc || 0);
      if (t.status === "Active") map[d].active += 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredTeam]);

  // 16. Team status donut
  const teamStatus = useMemo(() => {
    const map = {};
    filteredTeam.forEach((t) => {
      const s = t.status || "Unknown";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTeam]);

  // 17. Designation distribution
  const designations = useMemo(() => {
    const map = {};
    filteredTeam.forEach((t) => {
      if (!t.designation) return;
      map[t.designation] = (map[t.designation] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count]) => ({ name, count }));
  }, [filteredTeam]);

  // 18. Location distribution
  const locationDist = useMemo(() => {
    const map = {};
    filteredTeam.forEach((t) => {
      if (!t.location) return;
      map[t.location] = (map[t.location] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count]) => ({ name, count }));
  }, [filteredTeam]);

  // 19. CTC range histogram
  const ctcHistogram = useMemo(() => {
    const buckets = [
      { label: "< 20K", min: 0, max: 20000 },
      { label: "20-30K", min: 20000, max: 30000 },
      { label: "30-50K", min: 30000, max: 50000 },
      { label: "50-75K", min: 50000, max: 75000 },
      { label: "75K+", min: 75000, max: Infinity },
    ];
    return buckets.map((b) => ({
      range: b.label,
      count: filteredTeam.filter((t) => {
        const c = Number(t.ctc || 0);
        return c >= b.min && c < b.max;
      }).length,
    }));
  }, [filteredTeam]);

  // 20. Bank inflow/outflow
  const bankFlow = useMemo(() => {
    const map = {};
    filteredBank.forEach((b) => {
      const d = b.date;
      if (!d) return;
      if (!map[d]) map[d] = { date: d, inflow: 0, outflow: 0 };
      const amt = Math.abs(Number(b.amount || 0));
      if (b.flow_type === "inflow" || Number(b.amount) > 0) map[d].inflow += amt;
      else map[d].outflow += amt;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ ...d, date: fmtDate(d.date) }));
  }, [filteredBank]);

  // 21. Software inflow/outflow
  const softwareFlow = useMemo(() => {
    const map = {};
    filteredSoftware.forEach((s) => {
      const d = s.date;
      if (!d) return;
      if (!map[d]) map[d] = { date: d, inflow: 0, outflow: 0 };
      const amt = Math.abs(Number(s.amount || 0));
      if (s.flow_type === "inflow" || Number(s.amount) > 0) map[d].inflow += amt;
      else map[d].outflow += amt;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ ...d, date: fmtDate(d.date) }));
  }, [filteredSoftware]);

  // 22. Cash flow by source type
  const cashBySource = useMemo(() => {
    const map = {};
    [...filteredBank, ...filteredSoftware].forEach((e) => {
      const src = e.source_table || "manual";
      const label = { payments_received: "Payment In", os_payouts: "OS Payout", employee_expense_payouts: "Salary", statutory_payments: "Statutory", manual: "Manual" }[src] || src;
      if (!map[label]) map[label] = { source: label, inflow: 0, outflow: 0 };
      const amt = Math.abs(Number(e.amount || 0));
      if (Number(e.amount) > 0) map[label].inflow += amt;
      else map[label].outflow += amt;
    });
    return Object.values(map);
  }, [filteredBank, filteredSoftware]);

  // 23. Statutory from invoices (pf, esi, lwf, pt)
  const statutoryByInvoice = useMemo(() => {
    return filteredInvoices.filter((i) => Number(i.co_pf || 0) + Number(i.co_esi || 0) + Number(i.lwf_tax || 0) + Number(i.pt_tax || 0) > 0).map((i) => ({
      invoice: i.invoice_number,
      "Co. PF": Number(i.co_pf || 0),
      "Co. ESI": Number(i.co_esi || 0),
      "LWF": Number(i.lwf_tax || 0),
      "PT": Number(i.pt_tax || 0),
    }));
  }, [filteredInvoices]);

  // 24. Net-in-hand vs Gross vs Invoice per invoice
  const invoiceBreakdown = useMemo(() => {
    return filteredInvoices.map((i) => ({
      invoice: i.invoice_number,
      "Invoice Value": Number(i.invoice_value || 0),
      "Gross Value": Number(i.gross_value || 0),
      "Net in Hand": Number(i.net_in_hand || 0),
    }));
  }, [filteredInvoices]);

  // ── Filter option lists ───────────────────────────────────────────────────
  const deptOptions = departments.map((d) => ({ value: d.dept_name, label: d.dept_name }));
  const clientOptions = clients.map((c) => ({ value: c.client_name, label: c.client_name }));
  const entityOptions = entities.map((e) => ({ value: e.entity_name, label: e.entity_name }));
  const statusOptions = [...new Set(invoices.map((i) => i.status).filter(Boolean))].map((s) => ({ value: s, label: s }));
  const payHeadOptions = [...new Set([...invoices.map((i) => i.pay_head), ...salaries.map((s) => s.pay_head)].filter(Boolean))].map((p) => ({ value: p, label: p }));
  const impactMonthOptions = [...new Set(invoices.map((i) => i.impact_month?.slice(0, 7)).filter(Boolean))].sort().reverse().map((m) => ({ value: m, label: fmtMonth(m) }));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center animate-pulse">
          <BarChart2 className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm text-gray-400 font-medium">Loading analytics…</p>
      </div>
    </div>
  );

  // ── Build list of human-readable names of currently-active filters ──────────
  const FILTER_LABELS = {
    dateFrom:      "Date From",
    dateTo:        "Date To",
    impactMonth:   "Impact Month",
    department:    "Department",
    client:        "Client",
    entity:        "Entity",
    invoiceNumber: "Invoice #",
    status:        "Status",
    payHead:       "Pay Head",
    employee:      "Employee",
  };
  const activeFilterLabels = Object.entries(filters)
    .filter(([, v]) => Boolean(v))
    .map(([k]) => FILTER_LABELS[k] || k);

  return (
    <div className="space-y-6 pb-10">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">Admin · Live from Supabase · All data reflects actual entries</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${filtersOpen ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-blue-600 text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button onClick={fetchAll} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:border-blue-300 transition-all">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Filter Panel ── */}
      {filtersOpen && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Advanced Filters</span>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 font-semibold transition-colors">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date From</label>
              <input type="date" value={filters.dateFrom} onChange={(e) => setFilter("dateFrom", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date To</label>
              <input type="date" value={filters.dateTo} onChange={(e) => setFilter("dateTo", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </div>
            <FilterSelect label="Impact Month" value={filters.impactMonth} onChange={(v) => setFilter("impactMonth", v)} options={impactMonthOptions} />
            <FilterSelect label="Department" value={filters.department} onChange={(v) => setFilter("department", v)} options={deptOptions} />
            <FilterSelect label="Client" value={filters.client} onChange={(v) => setFilter("client", v)} options={clientOptions} />
            <FilterSelect label="Entity" value={filters.entity} onChange={(v) => setFilter("entity", v)} options={entityOptions} />
            <FilterSelect label="Invoice Status" value={filters.status} onChange={(v) => setFilter("status", v)} options={statusOptions} />
            <FilterSelect label="Pay Head" value={filters.payHead} onChange={(v) => setFilter("payHead", v)} options={payHeadOptions} />
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Invoice #</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
                <input type="text" value={filters.invoiceNumber} onChange={(e) => setFilter("invoiceNumber", e.target.value)}
                  placeholder="Search..."
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Employee</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
                <input type="text" value={filters.employee} onChange={(e) => setFilter("employee", e.target.value)}
                  placeholder="Search..."
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Invoice Value" value={fmt(kpis.totalInvoiceValue)} sub={`${filteredInvoices.length} invoices`} icon={FileText} color={P.blue} />
        <KpiCard label="Total Collected" value={fmt(kpis.totalReceived)} sub={`${kpis.collectionPct}% collection rate`} icon={DollarSign} color={P.emerald} />
        <KpiCard label="Outstanding" value={fmt(kpis.totalOutstanding)} sub="Pending receivables" icon={Activity} color={P.amber} />
        <KpiCard label="Verto Fee Earned" value={fmt(kpis.totalVertoFee)} sub="Across all invoices" icon={TrendingUp} color={P.indigo} />
        <KpiCard label="OS Payout" value={fmt(kpis.totalOsPayout)} sub={`${filteredOs.length} payouts`} icon={Wallet} color={P.orange} />
        <KpiCard label="Salary Paid" value={fmt(kpis.totalSalary)} sub={`${filteredSalaries.length} entries`} icon={CreditCard} color={P.violet} />
        <KpiCard label="Active Employees" value={kpis.totalEmployees} sub="Internal team" icon={Users} color={P.teal} />
        <KpiCard label="Collection %" value={`${kpis.collectionPct}%`} sub="Invoice value collected" icon={Building2} color={kpis.collectionPct >= 80 ? P.emerald : P.rose} />
      </div>

      {/* ══ SECTION 1: REVENUE & INVOICING ══ */}
      <SectionHeader icon={TrendingUp} title="Revenue & Invoicing" color={P.blue}
        activeFilters={activeFilterLabels}
        appliesTo={["Date From","Date To","Impact Month","Department","Client","Entity","Invoice #","Status","Pay Head"]}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Chart 1: Invoice Value by Month */}
        <ChartCard title="Invoice Value by Month" subtitle="Grouped by impact month">
          {invoiceByMonth.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={invoiceByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="invoiceValue" name="Invoice Value" fill={P.blue} radius={[4, 4, 0, 0]} />
                <Bar dataKey="vertoFee" name="Verto Fee" fill={P.indigo} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 2: Invoice Status Donut */}
        <ChartCard title="Invoice Status" subtitle="Distribution by status">
          {invoiceStatus.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={invoiceStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {invoiceStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 3: Revenue by Client */}
        <ChartCard title="Revenue by Client" subtitle="Invoice value & amount received">
          {revenueByClient.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueByClient} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                <YAxis dataKey="client" type="category" tick={{ fontSize: 10 }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="invoiceValue" name="Invoice Value" fill={P.blue} radius={[0, 4, 4, 0]} />
                <Bar dataKey="received" name="Received" fill={P.emerald} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 4: Revenue by Department */}
        <ChartCard title="Revenue by Department" subtitle="Invoice value per department">
          {revenueByDept.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueByDept} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dept" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="invoiceValue" name="Invoice Value" fill={P.indigo} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="invoiceValue" position="top" formatter={(v) => fmt(v)} style={{ fontSize: 9, fill: "#6366f1" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 5: Pay Head Distribution */}
        <ChartCard title="Pay Head Distribution" subtitle="Invoice value by pay head type">
          {payHeadInvoice.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={payHeadInvoice} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true}>
                  {payHeadInvoice.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 6: GST & TDS by Month */}
        <ChartCard title="GST & TDS by Month" subtitle="Tax components from invoices">
          {invoiceByMonth.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={invoiceByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="gst" name="GST" fill={P.amber} radius={[4, 4, 0, 0]} />
                <Bar dataKey="tds" name="TDS" fill={P.rose} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Invoice Breakdown Full Width */}
      {invoiceBreakdown.length > 0 && (
        <ChartCard title="Invoice Breakdown: Invoice Value vs Gross vs Net-in-Hand" subtitle="Side-by-side per invoice">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={invoiceBreakdown} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="invoice" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Invoice Value" fill={P.blue} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gross Value" fill={P.indigo} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Net in Hand" fill={P.emerald} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ══ SECTION 2: COLLECTIONS ══ */}
      <SectionHeader icon={DollarSign} title="Collections" color={P.emerald}
        activeFilters={activeFilterLabels}
        appliesTo={["Date From","Date To","Invoice #","Client"]}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Chart 7: Invoice vs Received */}
        <ChartCard title="Invoice Value vs Amount Collected" subtitle="Per invoice comparison">
          {collectionPerInvoice.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={collectionPerInvoice} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="invoice" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Invoice Value" fill={P.blue} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Amount Received" fill={P.emerald} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 8: Collection % per Invoice */}
        <ChartCard title="Collection Rate per Invoice" subtitle="% of invoice value collected">
          {collectionPerInvoice.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={collectionPerInvoice} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="invoice" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Collection %" fill={P.teal} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Collection %" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 9, fill: "#14b8a6" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 9: Payments Received Trend */}
        <ChartCard title="Payments Received Trend" subtitle="Daily collection amounts">
          {paymentsTrend.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={paymentsTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="receivedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={P.emerald} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={P.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="received" name="Received" stroke={P.emerald} fill="url(#receivedGrad)" strokeWidth={2} dot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 10: Outstanding by Client */}
        <ChartCard title="Outstanding by Client" subtitle="Remaining receivable per client">
          {outstandingByClient.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-emerald-500">
              <DollarSign className="w-8 h-8 mb-2" />
              <p className="text-xs font-semibold">No outstanding amounts 🎉</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={outstandingByClient} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                <YAxis dataKey="client" type="category" tick={{ fontSize: 10 }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="outstanding" name="Outstanding" fill={P.amber} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="outstanding" position="right" formatter={(v) => fmt(v)} style={{ fontSize: 9, fill: "#f59e0b" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ══ SECTION 3: OS & SALARY OUTFLOWS ══ */}
      <SectionHeader icon={Wallet} title="Outflows — OS Payouts & Salary" color={P.orange}
        activeFilters={activeFilterLabels}
        appliesTo={["Date From","Date To","Department","Client","Entity","Pay Head","Employee"]}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Chart 11: OS by Month */}
        <ChartCard title="OS Payout by Month" subtitle="Amount paid to outsourced staff">
          {osByMonth.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={osByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="amountPaid" name="Amount Paid" fill={P.orange} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 12: OS Billable Donut */}
        <ChartCard title="Billable vs Non-Billable OS" subtitle="OS payout split by billability">
          {osBillable.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={osBillable} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {osBillable.map((_, i) => <Cell key={i} fill={i === 0 ? P.orange : P.sky} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 13: OS by Client */}
        <ChartCard title="OS Payout by Client" subtitle="Amount paid per client">
          {osByClient.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={osByClient} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                <YAxis dataKey="client" type="category" tick={{ fontSize: 10 }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amountPaid" name="Amount Paid" fill={P.orange} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 14: OS Employee Count */}
        <ChartCard title="OS Employee Count by Month" subtitle="Headcount deployed per month">
          {osByMonth.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={osByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="employeeCount" name="Employee Count" stroke={P.amber} strokeWidth={2} dot={{ r: 5, fill: P.amber }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 15: Salary by Month */}
        <ChartCard title="Salary Paid by Month" subtitle="Internal team net salary outflow">
          {salaryByMonth.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={salaryByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="salary" name="Net Salary" fill={P.violet} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" position="top" formatter={(v) => `${v} emp`} style={{ fontSize: 9, fill: "#8b5cf6" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 16: Salary by Department */}
        <ChartCard title="Salary by Department" subtitle="Net salary paid per department">
          {salaryByDept.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={salaryByDept} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                <YAxis dataKey="dept" type="category" tick={{ fontSize: 10 }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="salary" name="Net Salary" fill={P.violet} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 17: Pay Head Split Donut */}
        <ChartCard title="Salary Pay Head Split" subtitle="Distribution by pay head type">
          {salaryPayHead.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={salaryPayHead} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {salaryPayHead.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ══ SECTION 4: INTERNAL TEAM ══ */}
      <SectionHeader icon={Users} title="Internal Team — Headcount & Cost" color={P.teal}
        activeFilters={activeFilterLabels}
        appliesTo={["Department","Employee"]}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Chart 18: Team by Dept */}
        <ChartCard title="Employee Count by Department" subtitle="Headcount from internal_team master">
          {teamByDept.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={teamByDept} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dept" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Employees" fill={P.teal} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: "#14b8a6", fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 19: CTC by Dept */}
        <ChartCard title="Total CTC by Department" subtitle="Monthly salary burden per department">
          {teamByDept.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={teamByDept} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dept" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ctc" name="Total CTC" fill={P.indigo} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="ctc" position="top" formatter={(v) => fmt(v)} style={{ fontSize: 9, fill: "#6366f1" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 20: Active vs Inactive */}
        <ChartCard title="Employee Status" subtitle="Active vs inactive breakdown">
          {teamStatus.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={teamStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {teamStatus.map((d, i) => <Cell key={i} fill={d.name === "Active" ? P.emerald : P.rose} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 21: Location Distribution */}
        <ChartCard title="Employee Location Distribution" subtitle="Top cities by headcount">
          {locationDist.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={locationDist} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Employees" fill={P.sky} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: 9, fill: "#0ea5e9" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 22: Designation Distribution */}
        <ChartCard title="Designation Distribution" subtitle="Top 12 designations by headcount">
          {designations.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={designations} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Count" fill={P.pink} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 23: CTC Histogram */}
        <ChartCard title="CTC Range Distribution" subtitle="How many employees fall in each range">
          {ctcHistogram.every((d) => d.count === 0) ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ctcHistogram} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Employees" radius={[4, 4, 0, 0]}>
                  {ctcHistogram.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 10, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ══ SECTION 5: CASH FLOW ══ */}
      <SectionHeader icon={Activity} title="Cash Flow — Bank & Software" color={P.sky}
        activeFilters={activeFilterLabels}
        appliesTo={["Date From","Date To"]}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Chart 24: Bank Flow */}
        <ChartCard title="Bank Inflow vs Outflow" subtitle="Daily bank entry movements">
          {bankFlow.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={bankFlow} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="bankIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={P.emerald} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={P.emerald} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bankOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={P.rose} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={P.rose} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="inflow" name="Inflow" stroke={P.emerald} fill="url(#bankIn)" strokeWidth={2} />
                <Area type="monotone" dataKey="outflow" name="Outflow" stroke={P.rose} fill="url(#bankOut)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 25: Software Flow */}
        <ChartCard title="Software Balance Flow" subtitle="Software entry inflow vs outflow">
          {softwareFlow.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={softwareFlow} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="swIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={P.sky} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={P.sky} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="swOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={P.amber} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={P.amber} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="inflow" name="Inflow" stroke={P.sky} fill="url(#swIn)" strokeWidth={2} />
                <Area type="monotone" dataKey="outflow" name="Outflow" stroke={P.amber} fill="url(#swOut)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 26: Cash Flow by Source */}
        <ChartCard title="Cash Flow by Transaction Type" subtitle="Inflow vs outflow grouped by source" className="lg:col-span-2">
          {cashBySource.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cashBySource} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="source" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="inflow" name="Inflow" fill={P.emerald} radius={[4, 4, 0, 0]} />
                <Bar dataKey="outflow" name="Outflow" fill={P.rose} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ══ SECTION 6: STATUTORY (from invoices) ══ */}
      {statutoryByInvoice.length > 0 && (
        <>
          <SectionHeader icon={FileText} title="Statutory Deductions — from Invoices" color={P.rose}
            activeFilters={activeFilterLabels}
            appliesTo={["Date From","Date To","Client","Department","Entity","Invoice #"]}
          />
          <ChartCard title="PF + ESI + LWF + PT per Invoice" subtitle="Employer statutory cost breakdown">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statutoryByInvoice} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="invoice" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Co. PF" stackId="a" fill={P.indigo} />
                <Bar dataKey="Co. ESI" stackId="a" fill={P.sky} />
                <Bar dataKey="LWF" stackId="a" fill={P.amber} />
                <Bar dataKey="PT" stackId="a" fill={P.rose} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {/* Footer */}
      <div className="text-center py-4 text-[11px] text-gray-300 font-medium">
        Analytics Dashboard · Admin Only · Data live from Supabase · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
      </div>
    </div>
  );
}