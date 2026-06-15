import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "../lib/supabaseClient";
import {
  Activity,
  Search,
  Filter,
  X,
  ChevronDown,
  RefreshCw,
  Download,
  Calendar,
  Building2,
  Briefcase,
  IndianRupee,
  ArrowUpRight,
  Users,
  Banknote,
  Receipt,
  ShieldCheck,
  FileMinus2,
  Undo2,
  AlertTriangle,
  Wallet,
  Landmark,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Mail,
} from "lucide-react";

// ── Transaction type config (OUTGOING ONLY) ────────────────────────────────────────────
const TYPE_CONFIG = {
  "Payment Made": {
    icon: ArrowUpRight,
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
  },
  "Employee Payout": {
    icon: Users,
    color: "#0891b2",
    bg: "#ecfeff",
    border: "#a5f3fc",
  },
  "OS Payout": {
    icon: Banknote,
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
  },
  Expense: {
    icon: Receipt,
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  "Statutory Payment": {
    icon: ShieldCheck,
    color: "#0d9488",
    bg: "#f0fdfa",
    border: "#99f6e4",
  },
  "Bounce Back": {
    icon: Undo2,
    color: "#c026d3",
    bg: "#fdf4ff",
    border: "#f5d0fe",
  },
  "Client Advance Tracker": {
    icon: Landmark,
    color: "#4338ca",
    bg: "#eef2ff",
    border: "#c7d2fe",
  },
};

function getTypeConfig(type) {
  if (TYPE_CONFIG[type]) return TYPE_CONFIG[type];
  if (type?.startsWith("CN / Bad Debt"))
    return {
      icon: FileMinus2,
      color: "#ea580c",
      bg: "#fff7ed",
      border: "#fed7aa",
    };
  if (type?.startsWith("Interest/Penalty"))
    return {
      icon: AlertTriangle,
      color: "#b91c1c",
      bg: "#fef2f2",
      border: "#fecaca",
    };
  return { icon: Activity, color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" };
}

// Only these types are fetched / shown
const OUTGOING_TYPES = [
    "Payment Made",
    "Employee Payout",
    "OS Payout",
    "Expense",
    "Statutory Payment",
    "Bounce Back",
    "Client Advance Tracker",
  ];
// prefix-matched types (CN / Bad Debt, Interest/Penalty) are also included via fallback

const DATE_PRESETS = [
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "ytd", label: "This year" },
  { id: "all", label: "All time" },
];

const PAGE_SIZE = 30;

function formatDateInput(d) {
  return d.toISOString().split("T")[0];
}

function getPresetRange(preset) {
  const now = new Date();
  const today = formatDateInput(now);
  if (preset === "this_month") {
    return {
      from: formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: today,
    };
  }
  if (preset === "last_month") {
    return {
      from: formatDateInput(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: formatDateInput(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  if (preset === "30d") {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return { from: formatDateInput(d), to: today };
  }
  if (preset === "90d") {
    const d = new Date();
    d.setDate(d.getDate() - 89);
    return { from: formatDateInput(d), to: today };
  }
  if (preset === "ytd") {
    return {
      from: formatDateInput(new Date(now.getFullYear(), 0, 1)),
      to: today,
    };
  }
  return { from: "", to: "" };
}

function formatAmount(amount) {
  if (amount === null || amount === undefined) return "—";
  return `₹${Number(amount).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function formatMonth(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

// ── Filter dropdown ──────────────────────────────────────────────────
function FilterDropdown({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  allLabel = "All",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selectedOption = options.find((o) => o.value === value);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
          value
            ? "bg-blue-50 border-blue-200 text-blue-700"
            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
        }`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="truncate max-w-[140px]">
          {value ? selectedOption?.label || value : label}
        </span>
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1.5 w-56 max-h-72 overflow-y-auto bg-white border border-gray-100 rounded-2xl shadow-2xl py-1.5 z-30"
            style={{
              boxShadow:
                "0 20px 60px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)",
            }}
          >
            <button
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition-colors ${
                !value
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {allLabel}
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center gap-2 transition-colors ${
                  value === opt.value
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.icon && (
                  <opt.icon
                    className="w-3.5 h-3.5 flex-shrink-0"
                    style={{ color: opt.color }}
                  />
                )}
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Single transaction row ──────────────────────────────────────────
function TransactionRow({ tx, index }) {
  const cfg = getTypeConfig(tx.transaction_type);
  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.012, 0.25) }}
      className="border-b border-gray-50 last:border-0 hover:bg-[#f7f9ff] transition-colors"
    >
      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
        {formatDate(tx.payment_date)}
      </td>
      <td className="px-3 py-3">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
          style={{
            color: cfg.color,
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
          }}
        >
          <cfg.icon className="w-3 h-3" />
          {tx.transaction_type}
        </span>
      </td>
      <td className="px-3 py-3 text-sm text-gray-800 max-w-[220px]">
        <div className="truncate font-medium">
          {tx.client_name || tx.employee_name || tx.pay_head || "—"}
        </div>
        {(tx.employee_name && tx.client_name) || tx.emp_code ? (
          <div className="text-[11px] text-gray-400 truncate">
            {tx.emp_code ? `${tx.emp_code} · ` : ""}
            {tx.client_name && tx.employee_name ? tx.employee_name : ""}
          </div>
        ) : null}
      </td>
      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
        {tx.invoice_number || tx.reference_no || "—"}
      </td>
      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
        {tx.department || "—"}
      </td>
      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
        {tx.entity || "—"}
      </td>
      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
        {formatMonth(tx.payout_month)}
      </td>
      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap text-center">
        {tx.head_count ?? "—"}
      </td>
      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
        {tx.bank_name || "—"}
      </td>
      <td className="px-3 py-3 text-xs max-w-[180px]">
        <span className="text-gray-400 truncate block">
          {tx.remarks || "—"}
        </span>
      </td>
      <td className="px-3 py-3 text-xs whitespace-nowrap">
        {tx.status ? (
          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px] font-medium">
            {tx.status}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">
        {tx.created_by_email ? (
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {tx.created_by_email}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="pl-3 pr-4 py-3 text-sm font-bold text-gray-900 text-right whitespace-nowrap">
        {formatAmount(tx.amount)}
      </td>
    </motion.tr>
  );
}

// ── Main Finance Register Page ────────────────────────────────────
export default function FinanceRegisterPage() {
  const [rows, setRows] = useState([]);
  const [allRowsForTotals, setAllRowsForTotals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [type, setType] = useState(null);
  const [entity, setEntity] = useState(null);
  const [department, setDepartment] = useState(null);
  const [datePreset, setDatePreset] = useState("this_month");
  const [customRange, setCustomRange] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [typeOptions, setTypeOptions] = useState([]);
  const [entityOptions, setEntityOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [search, type, entity, department, datePreset, customRange]);

  const dateRange = customRange || getPresetRange(datePreset);

  // Load distinct filter options — only outgoing types
  useEffect(() => {
    const loadOptions = async () => {
      const { data } = await supabase.rpc("get_register_filter_options");

      if (data) {
        const get = (type) =>
          data
            .filter((d) => d.option_type === type)
            .map((d) => d.option_value);

        setTypeOptions(
          get("transaction_type").map((t) => ({
            value: t,
            label: t,
            icon: getTypeConfig(t).icon,
            color: getTypeConfig(t).color,
          }))
        );
        setEntityOptions(get("entity").map((e) => ({ value: e, label: e })));
        setDepartmentOptions(
          get("department").map((d) => ({ value: d, label: d }))
        );
      }
    };
    loadOptions();
  }, []);

  // Base query — always scoped to outgoing types (exact + prefix-matched via or)
  const buildQuery = useCallback(() => {
    let q = supabase
      .from("finance_transaction_register_view")
      .select("*", { count: "exact" })
      .or(
        [
          ...OUTGOING_TYPES.map((t) => `transaction_type.eq.${t}`),
          "transaction_type.ilike.CN / Bad Debt%",
          "transaction_type.ilike.Interest/Penalty%",
        ].join(",")
      );

    if (type) q = q.eq("transaction_type", type);
    if (entity) q = q.eq("entity", entity);
    if (department) q = q.eq("department", department);
    if (dateRange.from) q = q.gte("payment_date", dateRange.from);
    if (dateRange.to) q = q.lte("payment_date", dateRange.to);
    if (search) {
      const term = `%${search}%`;
      q = q.or(
        `client_name.ilike.${term},employee_name.ilike.${term},emp_code.ilike.${term},invoice_number.ilike.${term},reference_no.ilike.${term},remarks.ilike.${term},pay_head.ilike.${term},created_by_email.ilike.${term}`
      );
    }
    return q;
  }, [type, entity, department, dateRange.from, dateRange.to, search]);

  const fetchRows = useCallback(
    async (isAuto = false) => {
      if (isAuto) setRefreshing(true);
      else setLoading(true);
      setErrorMsg(null);
      try {
        const { data, error, count } = await buildQuery()
          .order("payment_date", { ascending: false, nullsFirst: false })
          .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
        if (error) throw error;
        setRows(data || []);
        setTotalCount(count || 0);

        const { data: totalsData } = await supabase.rpc("get_register_totals", {
          p_type: type || null,
          p_entity: entity || null,
          p_department: department || null,
          p_date_from: dateRange.from || null,
          p_date_to: dateRange.to || null,
          p_search: search || null,
        });
        setAllRowsForTotals(totalsData || []);
      } catch (err) {
        setErrorMsg(err.message || "Failed to load transactions.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildQuery, page]
  );

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const activeFilterCount =
    [type, entity, department, customRange].filter(Boolean).length +
    (datePreset !== "this_month" && !customRange ? 1 : 0);

  const clearAllFilters = () => {
    setType(null);
    setEntity(null);
    setDepartment(null);
    setDatePreset("this_month");
    setCustomRange(null);
    setSearchInput("");
    setSearch("");
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Totals — all outgoing
  const grandTotal = (allRowsForTotals || []).reduce(
    (sum, r) => sum + (Number(r.total_amount) || 0),
    0
  );

  const byType = (types) =>
    (allRowsForTotals || [])
      .filter((r) =>
        types.some(
          (t) =>
            r.transaction_type === t || r.transaction_type?.startsWith(t)
        )
      )
      .reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);

  const payrollTotal = byType(["Employee Payout", "OS Payout"]);
  const expenseTotal = byType([
    "Payment Made",
    "Expense",
    "Statutory Payment",
    "CN / Bad Debt",
    "Interest/Penalty",
    "Bounce Back",
  ]);

  const handleExport = () => {
    if (!rows.length) return;
    const headers = [
      "Date",
      "Type",
      "Client/Employee",
      "Emp Code",
      "Employee Email",
      "Invoice/Ref",
      "Department",
      "Entity",
      "Payout Month",
      "Head Count",
      "Pay Head",
      "Bank",
      "Remarks",
      "Status",
      "Created By",
      "Amount",
    ];
    const csvRows = rows.map((r) => [
      formatDate(r.payment_date),
      r.transaction_type,
      r.client_name || r.employee_name || "",
      r.emp_code || "",
      r.employee_email || "",
      r.invoice_number || r.reference_no || "",
      r.department || "",
      r.entity || "",
      formatMonth(r.payout_month),
      r.head_count ?? "",
      r.pay_head || "",
      r.bank_name || "",
      `"${(r.remarks || "").replace(/"/g, '""')}"`,
      r.status || "",
      r.created_by_email || "",
      r.amount ?? "",
    ]);
    const csv = [headers.join(","), ...csvRows.map((r) => r.join(","))].join(
      "\n"
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `outgoing-register-${formatDateInput(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/30">
            <ArrowUpRight className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Outgoing Transaction Register
            </h2>
            <p className="text-xs text-gray-400">
              {totalCount.toLocaleString("en-IN")} transaction
              {totalCount === 1 ? "" : "s"}
              {dateRange.from && dateRange.to
                ? ` · ${dateRange.from} to ${dateRange.to}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRows(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-all"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={!rows.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Outflow */}
        <div
          className="bg-white rounded-3xl border border-gray-100 p-5"
          style={{
            boxShadow:
              "0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -12px rgba(220,38,38,0.10)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-xs font-semibold text-gray-500">Total Outflow</p>
          </div>
          <p className="text-2xl font-bold text-rose-600">
            {formatAmount(grandTotal)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {(allRowsForTotals || [])
              .reduce((s, r) => s + Number(r.row_count || 0), 0)
              .toLocaleString("en-IN")} entries in view
          </p>
        </div>

        {/* Payroll & OS */}
        <div
          className="bg-white rounded-3xl border border-gray-100 p-5"
          style={{
            boxShadow:
              "0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -12px rgba(8,145,178,0.10)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-cyan-600" />
            </div>
            <p className="text-xs font-semibold text-gray-500">
              Payroll & OS Payouts
            </p>
          </div>
          <p className="text-2xl font-bold text-cyan-700">
            {formatAmount(payrollTotal)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Employee + OS Payouts
          </p>
        </div>

        {/* Payments, Expenses & Others */}
        <div
          className="bg-white rounded-3xl border border-gray-100 p-5"
          style={{
            boxShadow:
              "0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -12px rgba(217,119,6,0.10)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xs font-semibold text-gray-500">
              Payments, Expenses & Others
            </p>
          </div>
          <p className="text-2xl font-bold text-amber-700">
            {formatAmount(expenseTotal)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Payments Made, Expenses, Statutory & more
          </p>
        </div>
      </div>

      {/* ── Filters bar ── */}
      <div
        className="bg-white rounded-3xl border border-gray-100 p-4 space-y-3"
        style={{
          boxShadow:
            "0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -12px rgba(59,130,246,0.08)",
        }}
      >
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by client, employee, invoice no, reference, remarks, or creator email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all placeholder:text-gray-400"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest mr-1">
            <Filter className="w-3 h-3" />
            Filters
          </span>
          <FilterDropdown
            label="All types"
            icon={Activity}
            value={type}
            onChange={setType}
            options={typeOptions}
            allLabel="All types"
          />
          <FilterDropdown
            label="All entities"
            icon={Building2}
            value={entity}
            onChange={setEntity}
            options={entityOptions}
            allLabel="All entities"
          />
          <FilterDropdown
            label="All departments"
            icon={Briefcase}
            value={department}
            onChange={setDepartment}
            options={departmentOptions}
            allLabel="All departments"
          />

          {/* Date range */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                customRange
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {customRange
                ? `${customRange.from} → ${customRange.to}`
                : DATE_PRESETS.find((p) => p.id === datePreset)?.label}
              <ChevronDown
                className={`w-3 h-3 transition-transform ${
                  showDatePicker ? "rotate-180" : ""
                }`}
              />
            </button>
            <AnimatePresence>
              {showDatePicker && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-1.5 w-72 bg-white border border-gray-100 rounded-2xl shadow-2xl p-3 z-30"
                  style={{
                    boxShadow:
                      "0 20px 60px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)",
                  }}
                >
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {DATE_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setDatePreset(p.id);
                          setCustomRange(null);
                          setShowDatePicker(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          datePreset === p.id && !customRange
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "text-gray-600 hover:bg-gray-50 border border-transparent"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                      Custom range
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        defaultValue={dateRange.from}
                        onChange={(e) =>
                          setCustomRange((r) => ({
                            from: e.target.value,
                            to: r?.to || dateRange.to,
                          }))
                        }
                        className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-slate-900 outline-none focus:border-blue-400"
                      />
                      <span className="text-gray-300 text-xs">to</span>
                      <input
                        type="date"
                        defaultValue={dateRange.to}
                        onChange={(e) =>
                          setCustomRange((r) => ({
                            from: r?.from || dateRange.from,
                            to: e.target.value,
                          }))
                        }
                        className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-slate-900 outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
        </div>

        {/* Quick type shortcuts — outgoing only */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-50">
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mr-1">
            Quick:
          </span>
          {Object.entries(TYPE_CONFIG).map(([t, cfg]) => {
            const isActive = type === t;
            return (
              <button
                key={t}
                onClick={() => setType(isActive ? null : t)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border"
                style={
                  isActive
                    ? {
                        color: cfg.color,
                        background: cfg.bg,
                        borderColor: cfg.border,
                      }
                    : {
                        color: "#94a3b8",
                        background: "transparent",
                        borderColor: "#f1f5f9",
                      }
                }
              >
                <cfg.icon className="w-3 h-3" />
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ── */}
      <div
        className="bg-white rounded-3xl border border-gray-100 overflow-hidden"
        style={{
          boxShadow:
            "0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -12px rgba(59,130,246,0.08)",
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/30 animate-pulse mb-3">
              <ArrowUpRight className="text-white w-5 h-5" />
            </div>
            <p className="text-sm text-gray-400 font-medium">
              Loading transactions...
            </p>
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-3 border border-rose-100">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <p className="text-sm font-semibold text-rose-700">
              Couldn't load transactions
            </p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">{errorMsg}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-rose-50 rounded-3xl flex items-center justify-center mb-4 border border-rose-100">
              <ArrowUpRight className="w-6 h-6 text-rose-400" />
            </div>
            <p className="text-base font-semibold text-gray-700">
              No outgoing transactions found
            </p>
            <p className="text-sm text-gray-400 mt-1 max-w-sm">
              {activeFilterCount > 0 || search
                ? "Try adjusting your filters, date range, or search terms."
                : "Outgoing transactions will appear here as they're recorded."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    "Date",
                    "Type",
                    "Client / Employee",
                    "Invoice / Ref",
                    "Department",
                    "Entity",
                    "Payout Month",
                    "Head Count",
                    "Bank",
                    "Remarks",
                    "Status",
                    "Created By",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="pl-3 pr-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tx, idx) => (
                  <TransactionRow
                    key={`${tx.transaction_type}-${tx.id}`}
                    tx={tx}
                    index={idx}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-400">
            Showing{" "}
            <span className="font-semibold text-gray-600">
              {page * PAGE_SIZE + 1}
            </span>
            –
            <span className="font-semibold text-gray-600">
              {Math.min((page + 1) * PAGE_SIZE, totalCount)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-600">
              {totalCount.toLocaleString("en-IN")}
            </span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-gray-600">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
