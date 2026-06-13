import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "../lib/supabaseClient";
import {
  Activity,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Download,
  FileText,
  Wallet,
  CreditCard,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  Undo2,
  FileMinus2,
  Banknote,
  Landmark,
  AlertTriangle,
  Users,
  ShieldCheck,
  LogIn,
  LogOut as LogOutIcon,
  PlusCircle,
  Pencil,
  Trash2,
  Calendar,
  Mail,
  Hash,
  Building2,
  IndianRupee,
  Clock,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

// ── Static config ───────────────────────────────────────────────────────
const CATEGORY_CONFIG = {
  Invoice: { label: "Invoices", icon: FileText, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  "Payment Received": { label: "Payments Received", icon: ArrowDownLeft, color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  "Payment Made": { label: "Payments Made", icon: ArrowUpRight, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  "OS Payout": { label: "OS Payouts", icon: Banknote, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  "CN / Bad Debt": { label: "CN / Bad Debt", icon: FileMinus2, color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
  "Employee Payout": { label: "Employee Payouts", icon: Users, color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  Expense: { label: "Expenses", icon: Receipt, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  "Bank Transfer": { label: "Bank Transfers", icon: Landmark, color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
  Statutory: { label: "Statutory Payouts", icon: ShieldCheck, color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" },
  "Interest / Penalty": { label: "Interest / Penalty", icon: AlertTriangle, color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
  "Petty Cash": { label: "Petty Cash", icon: Wallet, color: "#65a30d", bg: "#f7fee7", border: "#d9f99d" },
  Employee: { label: "Employee Records", icon: Users, color: "#475569", bg: "#f8fafc", border: "#e2e8f0" },
  "User Management": { label: "User Management", icon: ShieldCheck, color: "#9333ea", bg: "#faf5ff", border: "#e9d5ff" },
  Login: { label: "Login Activity", icon: LogIn, color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd" },
  "Bounce Back": { label: "Bounce Back", icon: Undo2, color: "#c026d3", bg: "#fdf4ff", border: "#f5d0fe" },
};

const ACTION_CONFIG = {
  INSERT: { label: "Created", icon: PlusCircle, color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  UPDATE: { label: "Updated", icon: Pencil, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  DELETE: { label: "Deleted", icon: Trash2, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  LOGIN: { label: "Login", icon: LogIn, color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd" },
  LOGOUT: { label: "Logout", icon: LogOutIcon, color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
  KICKED: { label: "Session Kicked", icon: AlertTriangle, color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
};

const DATE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "all", label: "All time" },
];

const PAGE_SIZE = 25;

function formatDateInput(d) {
  return d.toISOString().split("T")[0];
}

function getPresetRange(preset) {
  const today = new Date();
  const to = formatDateInput(today);
  if (preset === "today") return { from: to, to };
  if (preset === "7d") {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return { from: formatDateInput(d), to };
  }
  if (preset === "30d") {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return { from: formatDateInput(d), to };
  }
  if (preset === "90d") {
    const d = new Date();
    d.setDate(d.getDate() - 89);
    return { from: formatDateInput(d), to };
  }
  return { from: "", to: "" };
}

function formatAmount(amount) {
  if (amount === null || amount === undefined) return null;
  const num = Number(amount);
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  if (diffMins < 1) return { relative: "Just now", full: `${dateStr}, ${time}` };
  if (diffMins < 60) return { relative: `${diffMins}m ago`, full: `${dateStr}, ${time}` };
  if (diffHours < 24) return { relative: `${diffHours}h ago`, full: `${dateStr}, ${time}` };
  return { relative: dateStr, full: time };
}

function initialsFromEmail(email) {
  if (!email) return "?";
  const namePart = email.split("@")[0];
  const parts = namePart.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return namePart.slice(0, 2).toUpperCase();
}

// Diff renderer for old vs new values
function ValueDiff({ oldValues, newValues }) {
  if (!oldValues && !newValues) return null;

  // UPDATE: show changed fields only
  if (oldValues && newValues) {
    const changedKeys = Object.keys(newValues).filter((key) => {
      const ov = oldValues[key];
      const nv = newValues[key];
      if (JSON.stringify(ov) === JSON.stringify(nv)) return false;
      // Skip internal/system fields
      if (["created_at", "updated_at"].includes(key)) return false;
      return true;
    });

    if (changedKeys.length === 0) {
      return <p className="text-xs text-gray-400 italic">No field-level changes detected.</p>;
    }

    return (
      <div className="space-y-2">
        {changedKeys.map((key) => (
          <div key={key} className="grid grid-cols-12 gap-2 text-xs items-start">
            <div className="col-span-3 font-semibold text-gray-500 uppercase tracking-wide pt-0.5 truncate">
              {key.replace(/_/g, " ")}
            </div>
            <div className="col-span-4 px-2 py-1 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 font-mono break-all">
              {formatCellValue(oldValues[key])}
            </div>
            <div className="col-span-1 flex items-center justify-center text-gray-300 pt-1">
              →
            </div>
            <div className="col-span-4 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 font-mono break-all">
              {formatCellValue(newValues[key])}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // INSERT: show created snapshot
  if (newValues && !oldValues) {
    const keys = Object.keys(newValues).filter(
      (k) => newValues[k] !== null && newValues[k] !== "" && !["created_at"].includes(k)
    );
    return (
      <div className="grid grid-cols-2 gap-2 text-xs">
        {keys.map((key) => (
          <div key={key} className="flex justify-between gap-2 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-100">
            <span className="font-semibold text-emerald-700 uppercase tracking-wide text-[10px]">
              {key.replace(/_/g, " ")}
            </span>
            <span className="text-emerald-800 font-mono break-all text-right">{formatCellValue(newValues[key])}</span>
          </div>
        ))}
      </div>
    );
  }

  // DELETE: show last known snapshot
  if (oldValues && !newValues) {
    const keys = Object.keys(oldValues).filter(
      (k) => oldValues[k] !== null && oldValues[k] !== "" && !["created_at"].includes(k)
    );
    return (
      <div className="grid grid-cols-2 gap-2 text-xs">
        {keys.map((key) => (
          <div key={key} className="flex justify-between gap-2 px-2 py-1 rounded-lg bg-rose-50 border border-rose-100">
            <span className="font-semibold text-rose-700 uppercase tracking-wide text-[10px]">
              {key.replace(/_/g, " ")}
            </span>
            <span className="text-rose-800 font-mono break-all text-right">{formatCellValue(oldValues[key])}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function formatCellValue(val) {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

// ── Single log row ──────────────────────────────────────────────────────
function LogRow({ log, index }) {
  const [expanded, setExpanded] = useState(false);
  const actionCfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.UPDATE;
  const categoryCfg = CATEGORY_CONFIG[log.category] || {
    label: log.category,
    icon: Activity,
    color: "#64748b",
    bg: "#f8fafc",
    border: "#e2e8f0",
  };
  const ts = formatTimestamp(log.created_at);
  const hasDiff = log.old_values || log.new_values;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
      className="border border-gray-100 rounded-2xl bg-white hover:border-gray-200 hover:shadow-sm transition-all duration-150 overflow-hidden"
    >
      <button
        onClick={() => hasDiff && setExpanded(!expanded)}
        className={`w-full flex items-start gap-3 px-4 py-3.5 text-left ${hasDiff ? "cursor-pointer" : "cursor-default"}`}
      >
        {/* Actor avatar */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/20">
          <span className="text-white text-[11px] font-bold">{initialsFromEmail(log.actor_email)}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Top row: action badge, category chip, timestamp */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
              style={{ color: actionCfg.color, background: actionCfg.bg, border: `1px solid ${actionCfg.border}` }}
            >
              <actionCfg.icon className="w-3 h-3" />
              {actionCfg.label}
            </span>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ color: categoryCfg.color, background: categoryCfg.bg, border: `1px solid ${categoryCfg.border}` }}
            >
              <categoryCfg.icon className="w-3 h-3" />
              {categoryCfg.label}
            </span>
            {log.amount !== null && log.amount !== undefined && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-gray-700 bg-gray-100 border border-gray-200">
                <IndianRupee className="w-2.5 h-2.5" />
                {formatAmount(log.amount).replace("₹", "")}
              </span>
            )}
            <span className="ml-auto flex items-center gap-1 text-[11px] text-gray-400 font-medium" title={ts.full}>
              <Clock className="w-3 h-3" />
              {ts.relative}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-800 leading-snug">{log.description}</p>

          {/* Meta row: actor email, reference */}
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {log.actor_email || "system"}
            </span>
            {log.reference_no && (
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {log.reference_no}
              </span>
            )}
            {log.client_name && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {log.client_name}
              </span>
            )}
          </div>
        </div>

        {hasDiff && (
          <div className="flex-shrink-0 mt-1">
            <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
          </div>
        )}
      </button>

      {/* Expanded diff */}
      <AnimatePresence>
        {expanded && hasDiff && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 ml-12 border-t border-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-3">
                {log.action === "INSERT" ? "Record created" : log.action === "DELETE" ? "Record deleted" : "Changes"}
              </p>
              <ValueDiff oldValues={log.old_values} newValues={log.new_values} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Filter chip dropdown ────────────────────────────────────────────────
function FilterDropdown({ label, icon: Icon, value, onChange, options, allLabel = "All" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
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
        <span>{value ? selectedOption?.label || value : label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1.5 w-56 max-h-72 overflow-y-auto bg-white border border-gray-100 rounded-2xl shadow-2xl py-1.5 z-30"
            style={{ boxShadow: "0 20px 60px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)" }}
          >
            <button
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition-colors ${
                !value ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:bg-gray-50"
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
                  value === opt.value ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.icon && <opt.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: opt.color }} />}
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main AuditLogPage ──────────────────────────────────────────────────
export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [page, setPage] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState(null);
  const [action, setAction] = useState(null);
  const [actorEmail, setActorEmail] = useState(null);
  const [datePreset, setDatePreset] = useState("30d");
  const [customRange, setCustomRange] = useState(null); // { from, to }
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [actorList, setActorList] = useState([]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, category, action, actorEmail, datePreset, customRange]);

  const dateRange = customRange || getPresetRange(datePreset);

  const fetchLogs = useCallback(
    async (isAuto = false) => {
      if (isAuto) setRefreshing(true);
      else setLoading(true);
      setErrorMsg(null);

      try {
        const { data, error } = await supabase.rpc("get_audit_logs", {
          p_limit: PAGE_SIZE,
          p_offset: page * PAGE_SIZE,
          p_category: category,
          p_action: action,
          p_actor_email: actorEmail,
          p_search: search || null,
          p_date_from: dateRange.from || null,
          p_date_to: dateRange.to || null,
        });

        if (error) throw error;

        setLogs(data || []);
        setTotalCount(data && data.length > 0 ? Number(data[0].total_count) : 0);
      } catch (err) {
        setErrorMsg(err.message || "Failed to load audit logs.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, category, action, actorEmail, search, dateRange.from, dateRange.to]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh every 30s (only when on first page, no active text search)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (page === 0) fetchLogs(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, page, fetchLogs]);

  // Load distinct actor emails for filter dropdown
  useEffect(() => {
    const loadActors = async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("actor_email")
        .not("actor_email", "is", null)
        .order("actor_email");
      if (data) {
        const unique = [...new Set(data.map((d) => d.actor_email))];
        setActorList(unique);
      }
    };
    loadActors();
  }, []);

  const handleExport = () => {
    if (!logs.length) return;
    const headers = ["Timestamp", "Action", "Category", "Actor", "Reference", "Client", "Amount", "Description"];
    const rows = logs.map((l) => [
      new Date(l.created_at).toLocaleString("en-IN"),
      l.action,
      l.category,
      l.actor_email || "",
      l.reference_no || "",
      l.client_name || "",
      l.amount ?? "",
      `"${(l.description || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${formatDateInput(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeFilterCount = [category, action, actorEmail, customRange].filter(Boolean).length +
    (datePreset !== "30d" && !customRange ? 1 : 0);

  const clearAllFilters = () => {
    setCategory(null);
    setAction(null);
    setActorEmail(null);
    setDatePreset("30d");
    setCustomRange(null);
    setSearchInput("");
    setSearch("");
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const categoryOptions = Object.entries(CATEGORY_CONFIG).map(([value, cfg]) => ({
    value,
    label: cfg.label,
    icon: cfg.icon,
    color: cfg.color,
  }));

  const actionOptions = Object.entries(ACTION_CONFIG).map(([value, cfg]) => ({
    value,
    label: cfg.label,
    icon: cfg.icon,
    color: cfg.color,
  }));

  const actorOptions = actorList.map((email) => ({ value: email, label: email }));

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Audit Log</h2>
            <p className="text-xs text-gray-400">
              {totalCount.toLocaleString("en-IN")} action{totalCount === 1 ? "" : "s"} recorded
              {dateRange.from && dateRange.to ? ` · ${dateRange.from} to ${dateRange.to}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              autoRefresh
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-white border-gray-200 text-gray-500"
            }`}
            title={autoRefresh ? "Live updates on (every 30s)" : "Live updates off"}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
            Live
          </button>
          <button
            onClick={() => fetchLogs(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={!logs.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* ── Filters bar ── */}
      <div
        className="bg-white rounded-3xl border border-gray-100 p-4 space-y-3"
        style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -12px rgba(59,130,246,0.08)" }}
      >
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by invoice no, payment ref, client name, employee, or email..."
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

        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest mr-1">
            <Filter className="w-3 h-3" />
            Filters
          </span>

          <FilterDropdown
            label="All categories"
            icon={Activity}
            value={category}
            onChange={setCategory}
            options={categoryOptions}
            allLabel="All categories"
          />

          <FilterDropdown
            label="All actions"
            icon={Pencil}
            value={action}
            onChange={setAction}
            options={actionOptions}
            allLabel="All actions"
          />

          <FilterDropdown
            label="All users"
            icon={Mail}
            value={actorEmail}
            onChange={setActorEmail}
            options={actorOptions}
            allLabel="All users"
          />

          {/* Date range */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                customRange ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {customRange
                ? `${customRange.from} → ${customRange.to}`
                : DATE_PRESETS.find((p) => p.id === datePreset)?.label}
              <ChevronDown className={`w-3 h-3 transition-transform ${showDatePicker ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showDatePicker && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-1.5 w-72 bg-white border border-gray-100 rounded-2xl shadow-2xl p-3 z-30"
                  style={{ boxShadow: "0 20px 60px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)" }}
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
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Custom range</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        defaultValue={dateRange.from}
                        max={formatDateInput(new Date())}
                        onChange={(e) => setCustomRange((r) => ({ from: e.target.value, to: r?.to || dateRange.to }))}
                        className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-slate-900 outline-none focus:border-blue-400"
                      />
                      <span className="text-gray-300 text-xs">to</span>
                      <input
                        type="date"
                        defaultValue={dateRange.to}
                        max={formatDateInput(new Date())}
                        onChange={(e) => setCustomRange((r) => ({ from: r?.from || dateRange.from, to: e.target.value }))}
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

        {/* Quick category shortcuts */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-50">
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mr-1">Quick:</span>
          {["Invoice", "Payment Received", "Payment Made", "OS Payout", "CN / Bad Debt", "Expense", "Login", "Bounce Back"].map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const isActive = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(isActive ? null : cat)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border"
                style={
                  isActive
                    ? { color: cfg.color, background: cfg.bg, borderColor: cfg.border }
                    : { color: "#94a3b8", background: "transparent", borderColor: "#f1f5f9" }
                }
              >
                <cfg.icon className="w-3 h-3" />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Log list ── */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse mb-3">
              <Activity className="text-white w-5 h-5" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Loading audit log...</p>
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-rose-100">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-3 border border-rose-100">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <p className="text-sm font-semibold text-rose-700">Couldn't load the audit log</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">{errorMsg}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-gray-100">
            <div className="w-14 h-14 bg-blue-50 rounded-3xl flex items-center justify-center mb-4 border border-blue-100">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-base font-semibold text-gray-700">No activity found</p>
            <p className="text-sm text-gray-400 mt-1 max-w-sm">
              {activeFilterCount > 0 || search
                ? "Try adjusting your filters or search terms."
                : "Actions like invoices, payments, and edits will show up here as they happen."}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {logs.map((log, idx) => (
              <LogRow key={log.id} log={log} index={idx} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-400">
            Showing <span className="font-semibold text-gray-600">{page * PAGE_SIZE + 1}</span>–
            <span className="font-semibold text-gray-600">{Math.min((page + 1) * PAGE_SIZE, totalCount)}</span> of{" "}
            <span className="font-semibold text-gray-600">{totalCount.toLocaleString("en-IN")}</span>
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