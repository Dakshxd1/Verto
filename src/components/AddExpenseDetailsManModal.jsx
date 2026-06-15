import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "../lib/supabaseClient";
import * as XLSX from "xlsx";
import { logExport, EXPORT_ACTIONS } from "../utils/Auditlog.js";
import {
  X,
  Plus,
  Users,
  FileText,
  DollarSign,
  ChevronDown,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Building2,
  Search,
  Upload,
  Download,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  CheckCheck,
  Pencil,
  Trash2,
  Eye,
  RefreshCw,
  CornerDownLeft,
} from "lucide-react";
import ExpenseRecordsView from "./ExpenseRecordsView";
import { usePerms } from "../context/PermissionsContext";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const Select = ({ value, onChange, options, placeholder, error, disabled }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full border rounded-lg px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 transition
        ${
          error
            ? "border-red-400 bg-red-50 focus:ring-red-300"
            : "border-gray-200 bg-white focus:ring-indigo-400"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""} text-gray-800`}
    >
      <option value="" className="text-gray-400">
        {placeholder || "Select..."}
      </option>
      {options.map((opt) =>
        typeof opt === "string" ? (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ) : (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        )
      )}
    </select>
    <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
    {error && (
      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {error}
      </p>
    )}
  </div>
);

const SearchableSelect = ({
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!isOpen) setSearch(value || "");
  }, [value, isOpen]);
  useEffect(() => {
    const h = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = options
    .filter((opt) => {
      const label = typeof opt === "string" ? opt : opt.label;
      return label?.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      const kw = search.toLowerCase();
      const aL = (typeof a === "string" ? a : a.label)?.toLowerCase() || "";
      const bL = (typeof b === "string" ? b : b.label)?.toLowerCase() || "";
      if (aL.startsWith(kw) && !bL.startsWith(kw)) return -1;
      if (!aL.startsWith(kw) && bL.startsWith(kw)) return 1;
      return aL.localeCompare(bL);
    });

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (search.length > 0) setIsOpen(true);
          }}
          onClick={() => {
            if (search.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder || "Type to search..."}
          disabled={disabled}
          className={`w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition
            ${
              error
                ? "border-red-400 bg-red-50 focus:ring-red-300"
                : "border-gray-200 bg-white focus:ring-indigo-400"
            }
            ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            } text-gray-800 placeholder-gray-400`}
        />
      </div>
      {isOpen && filtered.length > 0 && search.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
          {filtered.map((opt, idx) => {
            const label = typeof opt === "string" ? opt : opt.label;
            const val = typeof opt === "string" ? opt : opt.value;
            return (
              <button
                key={idx}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSearch(label);
                  onChange(val);
                  setTimeout(() => setIsOpen(false), 100);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition text-sm border-b border-gray-100 last:border-0"
              >
                <p className="font-medium text-gray-900">{label}</p>
              </button>
            );
          })}
        </div>
      )}
      {isOpen && search.length > 0 && filtered.length === 0 && (
        <div className="absolute z-20 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 p-3">
          <p className="text-xs text-gray-400">
            No match found. You can type manually.
          </p>
        </div>
      )}
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
};

const FieldLabel = ({ children }) => (
  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1.5">
    {children}
  </label>
);

const SectionHeader = ({ icon: Icon, title, color = "indigo" }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className={`w-1 h-5 bg-${color}-500 rounded-full`} />
    <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wider flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4" />}
      {title}
    </h4>
  </div>
);

// ─── EXCEL COLUMN MAP ─────────────────────────────────────────────────────────
const COL_MAP = {
  "emp code": "emp_code",
  empcode: "emp_code",
  emp_code: "emp_code",
  name: "employee_name",
  "employee name": "employee_name",
  designation: "designation",
  entity: "entity",
  department: "department",
  dept: "department",
  "payment head": "pay_head",
  "pay head": "pay_head",
  payhead: "pay_head",
  "payment description": "payment_description",
  description: "payment_description",
  "payment amount": "payment_amount",
  amount: "payment_amount",
  "income tax deducted": "income_tax_deducted",
  "income tax": "income_tax_deducted",
  tds: "income_tax_deducted",
  "month of pay": "month_of_pay",
  month: "month_of_pay",
  "date of pay": "date_of_pay",
  date: "date_of_pay",
  "bank name/acct no": "bank_name",
  "bank name": "bank_name",
  bank: "bank_name",
  remarks: "remarks",
};
const normalizeHeader = (h) =>
  String(h || "")
    .trim()
    .toLowerCase();
const excelDateToString = (v) => {
  if (!v) return null;
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}$/.test(v)) return v;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
    return v;
  }
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  return null;
};

// ─── DOWNLOAD TEMPLATE ────────────────────────────────────────────────────────
const downloadTemplate = () => {
  const headers = [
    "Emp Code",
    "Name",
    "Designation",
    "Entity",
    "Department",
    "Payment Head",
    "Payment Description",
    "Payment Amount",
    "Income Tax Deducted",
    "Month of Pay",
    "Date of Pay",
    "Bank Name/Acct No",
    "Remarks",
  ];
  const sample = [
    "EMP001",
    "Rahul Sharma",
    "Manager",
    "Verto India Pvt Ltd",
    "OS",
    "Fixed Salary",
    "May 2026 salary",
    55000,
    5000,
    "2026-05",
    "2026-05-28",
    "HDFC Bank",
    "",
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  ws["!cols"] = headers.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, ws, "Employee Payouts");
  XLSX.writeFile(wb, "employee_payout_template.xlsx");
  logExport({
    action:      EXPORT_ACTIONS.TEMPLATE,
    category:    "Expense",
    description: "Downloaded Employee Payout Upload Template",
    meta:        { file: "employee_payout_template.xlsx" },
  });
};

// ─── BULK UPLOAD RESULT MODAL ─────────────────────────────────────────────────
const BulkResultModal = ({ result, onClose }) => {
  const { added, skipped, failed, skippedDetails, failedDetails } = result;
  const [tab, setTab] = useState(
    added > 0 ? "added" : skipped > 0 ? "skipped" : "failed"
  );
  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col overflow-hidden"
        style={{ maxHeight: "82vh" }}
      >
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <FileSpreadsheet size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">
                  Bulk Upload Result
                </h3>
                <p className="text-slate-400 text-xs">
                  Employee payouts processed
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={14} className="text-white" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: "✅ Added",
                value: added,
                bg: added > 0 ? "bg-emerald-500" : "bg-white/10",
              },
              {
                label: "⚠️ Skipped",
                value: skipped,
                bg: skipped > 0 ? "bg-amber-500" : "bg-white/10",
              },
              {
                label: "❌ Failed",
                value: failed,
                bg: failed > 0 ? "bg-rose-500" : "bg-white/10",
              },
            ].map((s) => (
              <div
                key={s.label}
                className={`${s.bg} rounded-xl p-3 text-center`}
              >
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white opacity-80">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
        {(skipped > 0 || failed > 0) && (
          <div className="flex border-b border-slate-100 flex-shrink-0">
            {[
              { key: "added", label: `Added (${added})`, show: added > 0 },
              {
                key: "skipped",
                label: `Skipped (${skipped})`,
                show: skipped > 0,
              },
              { key: "failed", label: `Failed (${failed})`, show: failed > 0 },
            ]
              .filter((t) => t.show)
              .map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${
                    tab === t.key
                      ? "border-slate-800 text-slate-800"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {tab === "added" && added > 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCheck size={30} className="text-emerald-600" />
              </div>
              <p className="text-lg font-bold text-slate-800">
                {added} record{added > 1 ? "s" : ""} saved
              </p>
              <p className="text-sm text-slate-500 text-center">
                All matched records inserted into{" "}
                <code className="bg-slate-100 px-1 rounded text-xs">
                  employee_expense_payouts
                </code>
              </p>
            </div>
          )}
          {tab === "skipped" &&
            skippedDetails?.map((row, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3"
              >
                <AlertTriangle
                  size={14}
                  className="text-amber-500 flex-shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-amber-800 text-sm">
                      {row.emp_code || "(empty)"}
                    </span>
                    <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">
                      Row {row.rowNum}
                    </span>
                  </div>
                  {row.employee_name && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {row.employee_name}
                    </p>
                  )}
                  <p className="text-xs text-amber-700 mt-0.5 font-medium">
                    {row.reason}
                  </p>
                </div>
                {row.payment_amount > 0 && (
                  <span className="text-xs font-bold text-amber-700 flex-shrink-0">
                    ₹{Number(row.payment_amount).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            ))}
          {tab === "failed" &&
            failedDetails?.map((row, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3"
              >
                <XCircle
                  size={14}
                  className="text-rose-500 flex-shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-rose-800 text-sm">
                      {row.emp_code || "(empty)"}
                    </span>
                    <span className="text-xs bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">
                      Row {row.rowNum}
                    </span>
                  </div>
                  {row.employee_name && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {row.employee_name}
                    </p>
                  )}
                  <p className="text-xs text-rose-700 mt-0.5">{row.error}</p>
                </div>
              </div>
            ))}
        </div>
        <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold transition-all"
          >
            {added > 0 ? "Done — View Records" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MISMATCH CONFIRM MODAL ───────────────────────────────────────────────────
const MismatchConfirmModal = ({ matched, mismatches, onProceed, onCancel }) => (
  <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div
      className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col overflow-hidden"
      style={{ maxHeight: "80vh" }}
    >
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-white" />
            <div>
              <h3 className="text-white font-bold text-base">
                Emp Code Mismatch Found
              </h3>
              <p className="text-amber-100 text-xs">
                {mismatches.length} row(s) not in employee master
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"
          >
            <X size={14} className="text-white" />
          </button>
        </div>
      </div>
      <div className="flex gap-3 px-5 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-emerald-700">{matched}</p>
          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
            Will Upload
          </p>
        </div>
        <div className="flex-1 bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-amber-700">
            {mismatches.length}
          </p>
          <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">
            Will Skip
          </p>
        </div>
      </div>
      <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
        <p className="text-xs text-slate-500 mb-2">
          The following emp_codes were not found in{" "}
          <strong>employee_master</strong> or <strong>internal_team</strong> and
          will be skipped:
        </p>
        {mismatches.map((m, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5"
          >
            <XCircle size={13} className="text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-mono font-bold text-amber-800 text-sm">
                {m.emp_code || "(empty)"}
              </span>
              {m.employee_name && (
                <span className="text-slate-400 text-xs ml-2">
                  {m.employee_name}
                </span>
              )}
              <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full ml-2">
                Row {m.rowNum}
              </span>
            </div>
            {m.payment_amount > 0 && (
              <span className="text-xs font-semibold text-amber-700">
                ₹{Number(m.payment_amount).toLocaleString("en-IN")}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-3 px-5 py-4 border-t border-slate-100 flex-shrink-0">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
        >
          Cancel All
        </button>
        <button
          onClick={onProceed}
          disabled={matched === 0}
          className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Upload size={14} />
          Upload {matched} Matched
        </button>
      </div>
    </div>
  </div>
);

// ─── OS PAYOUT RECORDS VIEW (INLINE — Edit/View/Delete) ───────────────────────
// ─── OS PAYOUT RECORDS VIEW (INLINE — Edit/View/Delete) ───────────────────────
const OsPayoutRecordsView = ({
  banks,
  entities,
  departments,
  clients,
  invoices,
  onClose,
  onChanged,
}) => {
  const { canEdit, canDelete } = usePerms();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [viewRow, setViewRow] = useState(null);

  // ── ADVANCED SEARCH STATE ──
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterBank, setFilterBank] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterPayHead, setFilterPayHead] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // BB states
  const [bbRow, setBbRow] = useState(null); // payout row for BB modal
  const [bbForm, setBbForm] = useState({});
  const [bbSaving, setBbSaving] = useState(false);
  const [bbErrors, setBbErrors] = useState({});
  const [drillRow, setDrillRow] = useState(null); // payout row for BB drilldown
  const [drillData, setDrillData] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [bbMap, setBbMap] = useState({}); // { [payout_id]: { total_bb, count } }

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("os_payouts")
      .select(
        "*, clients_master(client_name), invoices(invoice_number, net_in_hand), entity_master(entity_name), departments_master(dept_name), bank_master(bank_name)"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      setRecords(data);
      // Fetch BB totals for all payouts in one query
      const ids = data.map((r) => r.id);
      if (ids.length > 0) {
        const { data: bbData } = await supabase
          .from("os_payout_bouncebacks")
          .select("os_payout_id, bb_amount, bb_emp_count")
          .in("os_payout_id", ids);
        const map = {};
        (bbData || []).forEach((b) => {
          if (!map[b.os_payout_id])
            map[b.os_payout_id] = { total_bb: 0, total_bb_emp: 0, count: 0 };
          map[b.os_payout_id].total_bb += parseFloat(b.bb_amount) || 0;
          map[b.os_payout_id].total_bb_emp += parseInt(b.bb_emp_count) || 0;
          map[b.os_payout_id].count += 1;
        });
        setBbMap(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // ── helpers ──
  const fmtCur = (v) =>
    v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—";
  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const netApproved = (row) => {
    const bb = bbMap[row.id]?.total_bb || 0;
    return Math.max(
      (parseFloat(row.amount_paid) || 0) -
        bb -
        (parseFloat(row.income_tax_deducted) || 0),
      0
    );
  };
  const netEmpCount = (row) => {
    const bbEmp = bbMap[row.id]?.total_bb_emp || 0;
    return Math.max((parseInt(row.employee_count) || 0) - bbEmp, 0);
  };

  // ── FILTERED RECORDS ──
  const filteredRecords = records.filter((row) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQ =
      !q ||
      (row.payout_ref_no || "").toLowerCase().includes(q) ||
      (row.clients_master?.client_name || "").toLowerCase().includes(q) ||
      (row.pay_head || "").toLowerCase().includes(q) ||
      (row.bank_master?.bank_name || "").toLowerCase().includes(q) ||
      (row.remarks || "").toLowerCase().includes(q) ||
      (row.payment_details || "").toLowerCase().includes(q);

    const matchesDate =
      (!dateFrom || (row.payment_date && row.payment_date >= dateFrom)) &&
      (!dateTo || (row.payment_date && row.payment_date <= dateTo));

    const matchesBank = !filterBank || row.bank_id === filterBank;
    const matchesClient = !filterClient || row.client_id === filterClient;
    const matchesPayHead = !filterPayHead || row.pay_head === filterPayHead;

    return (
      matchesQ && matchesDate && matchesBank && matchesClient && matchesPayHead
    );
  });

  const activeFilterCount = [
    searchQuery,
    dateFrom,
    dateTo,
    filterBank,
    filterClient,
    filterPayHead,
  ].filter(Boolean).length;

  // ── EDIT ──
  const startEdit = (row) => {
    setEditRow(row.id);
    setEditForm({
      pay_head: row.pay_head || "",
      payment_details: row.payment_details || "",
      amount_paid: row.amount_paid || "",
      income_tax_deducted: row.income_tax_deducted || "",
      employee_count: row.employee_count || "",
      payment_date: row.payment_date || "",
      bank_id: row.bank_id || "",
      is_billable: row.is_billable || false,
      remarks: row.remarks || "",
    });
  };

  const saveEdit = async (row) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("os_payouts")
        .update({
          pay_head: editForm.pay_head,
          payment_details: editForm.payment_details,
          amount_paid: parseFloat(editForm.amount_paid) || 0,
          income_tax_deducted: parseFloat(editForm.income_tax_deducted) || 0,
          employee_count: parseInt(editForm.employee_count) || 0,
          payment_date: editForm.payment_date,
          bank_id: editForm.bank_id || null,
          bank_name:
            banks.find((b) => b.id === editForm.bank_id)?.bank_name || null,
          is_billable: editForm.is_billable,
          remarks: editForm.remarks,
        })
        .eq("id", row.id);
      if (error) throw error;
      setEditRow(null);
      fetchRecords();
      onChanged?.();
    } catch (err) {
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── DELETE ──
  const deleteRecord = async (row) => {
    if (
      !window.confirm(
        `Delete OS payout of ₹${Number(row.amount_paid).toLocaleString(
          "en-IN"
        )}?\nAll related BB entries and bank entries will also be deleted.`
      )
    )
      return;
    setDeleting(row.id);
    try {
      // Delete BB bank entries first
      const { data: bbList } = await supabase
        .from("os_payout_bouncebacks")
        .select("bank_entry_id")
        .eq("os_payout_id", row.id);
      const bankEntryIds = (bbList || [])
        .map((b) => b.bank_entry_id)
        .filter(Boolean);
      if (bankEntryIds.length > 0) {
        await supabase
          .from("bank_entries")
          .update({ is_deleted: true })
          .in("id", bankEntryIds);
      }
      // Delete BB records (cascade would also do this, just being explicit)
      await supabase
        .from("os_payout_bouncebacks")
        .delete()
        .eq("os_payout_id", row.id);
      // Delete the payout
      const { error } = await supabase
        .from("os_payouts")
        .delete()
        .eq("id", row.id);
      if (error) throw error;
      // Soft-delete original bank entry
      await supabase
        .from("bank_entries")
        .update({ is_deleted: true })
        .eq("source_table", "os_payouts")
        .eq("source_id", row.id);
      fetchRecords();
      onChanged?.();
    } catch (err) {
      alert("Error deleting: " + err.message);
    } finally {
      setDeleting(null);
    }
  };

  // ── BB DRILLDOWN ──
  const openDrilldown = async (row) => {
    setDrillRow(row);
    setDrillLoading(true);
    const { data } = await supabase
      .from("os_payout_bouncebacks")
      .select("*")
      .eq("os_payout_id", row.id)
      .order("created_at", { ascending: true });
    setDrillData(data || []);
    setDrillLoading(false);
  };

  const deleteBB = async (bb, parentRow) => {
    if (
      !window.confirm(
        `Delete BB ${bb.bb_ref_no} of ₹${Number(bb.bb_amount).toLocaleString(
          "en-IN"
        )}?`
      )
    )
      return;
    try {
      // Soft-delete the bank entry
      if (bb.bank_entry_id) {
        await supabase
          .from("bank_entries")
          .update({ is_deleted: true })
          .eq("id", bb.bank_entry_id);
      }
      await supabase.from("os_payout_bouncebacks").delete().eq("id", bb.id);
      // Refresh drilldown + records
      openDrilldown(parentRow);
      fetchRecords();
      onChanged?.();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // ── BB MODAL OPEN ──
  const openBbModal = (row) => {
    setBbRow(row);
    setBbForm({
      bb_date: new Date().toISOString().slice(0, 10),
      bb_amount: "",
      bb_emp_count: "",
      remarks: "",
    });
    setBbErrors({});
  };

  // ── BB SAVE ──
  const saveBB = async () => {
    const errs = {};
    if (!bbForm.bb_amount || parseFloat(bbForm.bb_amount) <= 0)
      errs.bb_amount = "Must be > 0";
    if (!bbForm.bb_date) errs.bb_date = "Required";
    const bbAmt = parseFloat(bbForm.bb_amount) || 0;
    const existingBB = bbMap[bbRow.id]?.total_bb || 0;
    const maxBB = parseFloat(bbRow.amount_paid) || 0;
    if (bbAmt + existingBB > maxBB) {
      errs.bb_amount = `Total BB (₹${(bbAmt + existingBB).toLocaleString(
        "en-IN"
      )}) cannot exceed amount paid (₹${maxBB.toLocaleString("en-IN")})`;
    }
    if (Object.keys(errs).length > 0) {
      setBbErrors(errs);
      return;
    }

    setBbSaving(true);
    try {
      // 1. Generate BB ref number
      const { data: refData } = await supabase.rpc("generate_bb_ref");
      const bbRef = refData || `BB${Date.now().toString().slice(-4)}`;

      // 2. Generate bank entry reference (same BNK- pattern)
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yy = String(now.getFullYear()).slice(-2);
      const { count: todayCount } = await supabase
        .from("bank_entries")
        .select("id", { count: "exact", head: true })
        .gte("created_at", now.toISOString().slice(0, 10));
      const seq = String((todayCount || 0) + 1).padStart(2, "0");
      const bankRef = `BNK-${dd}${mm}${yy}-${seq}`;

      // 3. Get bank_id from the original payout (use same bank — money coming back to same account)
      const bankId = bbRow.bank_id;
      const bankEntry = {
        bank_id: bankId,
        date: bbForm.bb_date,
        amount: bbAmt,
        type: "credit",
        flow_type: "os_bounce_back",
        entry_type: "os_bounce_back",
        source_table: "os_payout_bouncebacks",
        reference_no: bankRef,
        invoice_id: bbRow.invoice_id || null,
        invoice_number: bbRow.invoices?.invoice_number || null,
        entity: bbRow.entity_master?.entity_name || null,
        remarks: `OS Bounce Back - ${bbRef} - ${
          bbRow.payout_ref_no || bbRow.invoices?.invoice_number || ""
        }`,
        is_deleted: false,
      };

      const { data: savedBankEntry, error: beErr } = await supabase
        .from("bank_entries")
        .insert([bankEntry])
        .select()
        .single();
      if (beErr) throw beErr;

      // 4. Insert BB record
      const bbPayload = {
        bb_ref_no: bbRef,
        os_payout_id: bbRow.id,
        invoice_id: bbRow.invoice_id || null,
        invoice_number: bbRow.invoices?.invoice_number || null,
        client_id: bbRow.client_id || null,
        department_id: bbRow.department_id || null,
        entity_id: bbRow.entity_id || null,
        os_payout_date: bbRow.payment_date,
        bb_date: bbForm.bb_date,
        original_amount: parseFloat(bbRow.amount_paid) || 0,
        bb_amount: bbAmt,
        original_emp_count: parseInt(bbRow.employee_count) || 0,
        bb_emp_count: parseInt(bbForm.bb_emp_count) || 0,
        bank_entry_id: savedBankEntry.id,
        remarks: bbForm.remarks || "",
      };

      // Update source_id on bank entry to point to the BB record
      const { data: savedBB, error: bbErr } = await supabase
        .from("os_payout_bouncebacks")
        .insert([bbPayload])
        .select()
        .single();
      if (bbErr) throw bbErr;

      // Patch bank_entry source_id
      await supabase
        .from("bank_entries")
        .update({ source_id: savedBB.id })
        .eq("id", savedBankEntry.id);

      setBbRow(null);
      fetchRecords();
      onChanged?.();
      alert(
        `✅ Bounce Back ${bbRef} saved!\nBank credit entry ${bankRef} created for ₹${bbAmt.toLocaleString(
          "en-IN"
        )}`
      );
    } catch (err) {
      alert("Error saving BB: " + err.message);
    } finally {
      setBbSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl mx-4 flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}
      >
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-700 px-6 py-4 flex-shrink-0 space-y-3">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">
                  OS Payout Records
                </h3>
                <p className="text-white/70 text-xs">
                  Net Approved = OS Amt − BB − TDS &nbsp;|&nbsp; Net Emp = Emp
                  Count − BB Emp Count
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters((s) => !s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  showFilters || activeFilterCount > 0
                    ? "bg-white text-purple-700"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                {showFilters ? "Hide Filters" : "Advanced Search"}
                {activeFilterCount > 0 && (
                  <span className="ml-1 bg-purple-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                onClick={fetchRecords}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => {
                setSearchQuery("");
                setDateFrom("");
                setDateTo("");
                setFilterBank("");
                setFilterClient("");
                setFilterPayHead("");
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeFilterCount === 0
                  ? "bg-white text-purple-700"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              All Payments
            </button>
            {dateFrom || dateTo ? (
              <span className="px-2.5 py-1 rounded-lg bg-white/20 text-white text-xs font-medium flex items-center gap-1">
                📅 {dateFrom || "…"} → {dateTo || "…"}
                <button
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="hover:text-white/70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ) : null}
            {filterBank && (
              <span className="px-2.5 py-1 rounded-lg bg-white/20 text-white text-xs font-medium flex items-center gap-1">
                🏦{" "}
                {banks.find((b) => b.id === filterBank)?.bank_name ||
                  filterBank}
                <button
                  onClick={() => setFilterBank("")}
                  className="hover:text-white/70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterClient && (
              <span className="px-2.5 py-1 rounded-lg bg-white/20 text-white text-xs font-medium flex items-center gap-1">
                🏢{" "}
                {clients.find((c) => c.id === filterClient)?.client_name ||
                  filterClient}
                <button
                  onClick={() => setFilterClient("")}
                  className="hover:text-white/70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterPayHead && (
              <span className="px-2.5 py-1 rounded-lg bg-white/20 text-white text-xs font-medium flex items-center gap-1">
                📂 {filterPayHead}
                <button
                  onClick={() => setFilterPayHead("")}
                  className="hover:text-white/70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="px-2.5 py-1 rounded-lg bg-white/20 text-white text-xs font-medium flex items-center gap-1">
                🔍 "{searchQuery}"
                <button
                  onClick={() => setSearchQuery("")}
                  className="hover:text-white/70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {/* Expandable filter panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Search */}
                  <div className="relative lg:col-span-2">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/60 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Ref, Client, Ledger, Bank, Remarks..."
                      className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40"
                    />
                  </div>

                  {/* Date From */}
                  <div>
                    <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 [color-scheme:dark]"
                    />
                  </div>

                  {/* Date To */}
                  <div>
                    <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 [color-scheme:dark]"
                    />
                  </div>

                  {/* Bank Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block mb-1">
                      Bank
                    </label>
                    <select
                      value={filterBank}
                      onChange={(e) => setFilterBank(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40 appearance-none"
                    >
                      <option value="" className="text-gray-800">
                        All Banks
                      </option>
                      {banks.map((b) => (
                        <option
                          key={b.id}
                          value={b.id}
                          className="text-gray-800"
                        >
                          {b.bank_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Client Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block mb-1">
                      Client
                    </label>
                    <select
                      value={filterClient}
                      onChange={(e) => setFilterClient(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40 appearance-none"
                    >
                      <option value="" className="text-gray-800">
                        All Clients
                      </option>
                      {clients.map((c) => (
                        <option
                          key={c.id}
                          value={c.id}
                          className="text-gray-800"
                        >
                          {c.client_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pay Head / Ledger Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block mb-1">
                      Ledger (Pay Head)
                    </label>
                    <select
                      value={filterPayHead}
                      onChange={(e) => setFilterPayHead(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40 appearance-none"
                    >
                      <option value="" className="text-gray-800">
                        All Pay Heads
                      </option>
                      {OS_PAY_HEADS.map((ph) => (
                        <option key={ph} value={ph} className="text-gray-800">
                          {ph}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Clear All */}
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setDateFrom("");
                        setDateTo("");
                        setFilterBank("");
                        setFilterClient("");
                        setFilterPayHead("");
                      }}
                      className="w-full py-2 rounded-lg border border-white/30 text-white text-xs font-bold hover:bg-white/10 transition flex items-center justify-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Clear All Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Table ── */}
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading records…</span>
            </div>
          ) : filteredRecords.length === 0 && records.length > 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Search className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">
                No records match your filters
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setDateFrom("");
                  setDateTo("");
                  setFilterBank("");
                  setFilterClient("");
                  setFilterPayHead("");
                }}
                className="mt-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition"
              >
                Clear Filters
              </button>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No OS payout records found</p>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[1400px]">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  {[
                    "Date",
                    "Invoice / Client",
                    "Pay Head",
                    "Details",
                    "OS Amount",
                    "BB Amount",
                    "Net OS Amt",
                    "Emp Count",
                    "BB Emp",
                    "Net Emp",
                    "TDS",
                    "Bank",
                    "Billable",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((row) => {
                  const bb = bbMap[row.id] || {
                    total_bb: 0,
                    total_bb_emp: 0,
                    count: 0,
                  };
                  const netAmt = netApproved(row);
                  const netEmp = netEmpCount(row);
                  const hasBB = bb.count > 0;

                  return editRow === row.id ? (
                    /* ── EDIT ROW ── */
                    <tr key={row.id} className="bg-indigo-50/60">
                      <td className="px-2 py-2">
                        <input
                          type="date"
                          value={editForm.payment_date}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              payment_date: e.target.value,
                            }))
                          }
                          className="border border-indigo-300 rounded-lg px-2 py-1.5 text-xs w-32 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-500">
                        {row.invoices?.invoice_number ||
                          row.clients_master?.client_name ||
                          "—"}
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={editForm.pay_head}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              pay_head: e.target.value,
                            }))
                          }
                          className="border border-indigo-300 rounded-lg px-2 py-1.5 text-xs w-28 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={editForm.payment_details}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              payment_details: e.target.value,
                            }))
                          }
                          className="border border-indigo-300 rounded-lg px-2 py-1.5 text-xs w-32 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={editForm.amount_paid}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              amount_paid: e.target.value,
                            }))
                          }
                          className="border border-indigo-300 rounded-lg px-2 py-1.5 text-xs w-24 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </td>
                      {/* BB total — read-only in edit */}
                      <td className="px-2 py-2 text-xs text-rose-600 font-semibold">
                        {hasBB ? fmtCur(bb.total_bb) : "—"}
                      </td>
                      {/* Net — computed */}
                      <td className="px-2 py-2">
                        <div className="bg-emerald-100 border border-emerald-200 rounded-lg px-2 py-1.5 text-xs font-bold text-emerald-700 w-24 text-right">
                          ₹
                          {Math.max(
                            (parseFloat(editForm.amount_paid) || 0) -
                              bb.total_bb -
                              (parseFloat(editForm.income_tax_deducted) || 0),
                            0
                          ).toLocaleString("en-IN")}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={editForm.employee_count}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              employee_count: e.target.value,
                            }))
                          }
                          className="border border-indigo-300 rounded-lg px-2 py-1.5 text-xs w-16 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-2 py-2 text-xs text-rose-600 font-semibold">
                        {hasBB ? bb.total_bb_emp : "—"}
                      </td>
                      <td className="px-2 py-2 text-xs text-emerald-700 font-semibold">
                        {Math.max(
                          (parseInt(editForm.employee_count) || 0) -
                            bb.total_bb_emp,
                          0
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={editForm.income_tax_deducted}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              income_tax_deducted: e.target.value,
                            }))
                          }
                          className="border border-indigo-300 rounded-lg px-2 py-1.5 text-xs w-20 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={editForm.bank_id}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              bank_id: e.target.value,
                            }))
                          }
                          className="border border-indigo-300 rounded-lg px-2 py-1.5 text-xs w-28 focus:outline-none"
                        >
                          <option value="">—</option>
                          {banks.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.bank_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditForm((p) => ({
                              ...p,
                              is_billable: !p.is_billable,
                            }))
                          }
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                            editForm.is_billable
                              ? "bg-emerald-500"
                              : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${
                              editForm.is_billable
                                ? "translate-x-5"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => saveEdit(row)}
                            disabled={saving}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                          >
                            {saving ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={10} />
                            )}
                            Save
                          </button>
                          <button
                            onClick={() => setEditRow(null)}
                            className="px-2 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    /* ── VIEW ROW ── */
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-3 whitespace-nowrap text-gray-700 text-xs">
                        {fmtDate(row.payment_date)}
                      </td>
                      <td className="px-3 py-3">
                        {row.invoice_id ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            <FileText size={10} />
                            {row.invoices?.invoice_number || "Inv"}
                          </span>
                        ) : (
                          <span className="text-gray-700 text-xs">
                            {row.clients_master?.client_name || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-700 text-xs">
                        {row.pay_head || "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs max-w-[120px] truncate">
                        {row.payment_details || "—"}
                      </td>

                      {/* OS Amount */}
                      <td className="px-3 py-3 font-semibold text-gray-900 text-xs whitespace-nowrap">
                        {fmtCur(row.amount_paid)}
                      </td>

                      {/* BB Amount */}
                      <td className="px-3 py-3 text-xs">
                        {hasBB ? (
                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                              <CornerDownLeft size={10} />−{fmtCur(bb.total_bb)}
                              <span className="text-[10px] opacity-70">
                                ({bb.count})
                              </span>
                            </span>
                            <button
                              onClick={() => openDrilldown(row)}
                              className="p-1 rounded-lg hover:bg-rose-100 text-rose-500 transition"
                              title="View / Delete BB entries"
                            >
                              <Eye size={11} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Net OS Amount */}
                      <td className="px-3 py-3 text-xs">
                        <span
                          className={`inline-flex items-center font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                            hasBB
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {fmtCur(netAmt)}
                        </span>
                      </td>

                      {/* Emp Count */}
                      <td className="px-3 py-3 text-center text-gray-700 text-xs font-semibold">
                        {row.employee_count > 0 ? row.employee_count : "—"}
                      </td>

                      {/* BB Emp */}
                      <td className="px-3 py-3 text-center text-xs">
                        {hasBB && bb.total_bb_emp > 0 ? (
                          <span className="text-rose-600 font-semibold">
                            −{bb.total_bb_emp}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Net Emp */}
                      <td className="px-3 py-3 text-center text-xs">
                        {row.employee_count > 0 ? (
                          <span
                            className={`font-bold ${
                              hasBB ? "text-amber-700" : "text-emerald-700"
                            }`}
                          >
                            {netEmp}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* TDS */}
                      <td className="px-3 py-3 text-gray-600 text-xs">
                        {(parseFloat(row.income_tax_deducted) || 0) > 0
                          ? fmtCur(row.income_tax_deducted)
                          : "—"}
                      </td>

                      <td className="px-3 py-3 text-gray-600 text-xs">
                        {row.bank_master?.bank_name || "—"}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                            row.is_billable
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {row.is_billable ? "✓ Bill" : "No"}
                        </span>
                      </td>

                      {/* Actions: View | Edit | BB | Delete */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewRow(row)}
                            className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition"
                            title="View"
                          >
                            <Eye size={13} />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => startEdit(row)}
                              className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-600 transition"
                              title="Edit"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => openBbModal(row)}
                            className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-500 transition"
                            title="Add Bounce Back"
                          >
                            <CornerDownLeft size={13} />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => deleteRecord(row)}
                              disabled={deleting === row.id}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition disabled:opacity-40"
                              title="Delete"
                            >
                              {deleting === row.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {filteredRecords.length} of {records.length} record
            {records.length !== 1 ? "s" : ""}
            {activeFilterCount > 0 && " (filtered)"}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          BB MODAL — Add Bounce Back
      ══════════════════════════════════════════════ */}
      {bbRow && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <CornerDownLeft className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-bold">Add Bounce Back</h4>
                  <p className="text-white/70 text-xs">
                    {bbRow.invoices?.invoice_number ||
                      bbRow.clients_master?.client_name ||
                      bbRow.payout_ref_no ||
                      "OS Payout"}
                    &nbsp;·&nbsp;Paid: {fmtCur(bbRow.amount_paid)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBbRow(null)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Existing BB summary if any */}
              {(bbMap[bbRow.id]?.count || 0) > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs">
                  <p className="text-rose-700 font-semibold mb-1">
                    Existing Bounce Backs on this payout:
                  </p>
                  <div className="flex justify-between">
                    <span className="text-rose-600">Total BB so far</span>
                    <span className="font-bold text-rose-700">
                      {fmtCur(bbMap[bbRow.id].total_bb)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rose-600">
                      Remaining after existing BB
                    </span>
                    <span className="font-bold text-emerald-700">
                      {fmtCur(
                        (parseFloat(bbRow.amount_paid) || 0) -
                          (bbMap[bbRow.id]?.total_bb || 0)
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Breakdown preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">OS Amount Paid</span>
                  <span className="font-bold text-gray-800">
                    {fmtCur(bbRow.amount_paid)}
                  </span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>This Bounce Back</span>
                  <span className="font-bold">
                    −
                    {bbForm.bb_amount
                      ? fmtCur(parseFloat(bbForm.bb_amount) || 0)
                      : "₹0"}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1">
                  <span className="font-semibold text-gray-700">
                    Net Approved (after this BB)
                  </span>
                  <span className="font-bold text-emerald-600">
                    {fmtCur(
                      Math.max(
                        (parseFloat(bbRow.amount_paid) || 0) -
                          (bbMap[bbRow.id]?.total_bb || 0) -
                          (parseFloat(bbForm.bb_amount) || 0) -
                          (parseFloat(bbRow.income_tax_deducted) || 0),
                        0
                      )
                    )}
                  </span>
                </div>
              </div>

              {/* BB Date */}
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1.5">
                  BB Date *
                </label>
                <input
                  type="date"
                  value={bbForm.bb_date}
                  onChange={(e) =>
                    setBbForm((p) => ({ ...p, bb_date: e.target.value }))
                  }
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 text-gray-800 ${
                    bbErrors.bb_date
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 bg-white"
                  }`}
                />
                {bbErrors.bb_date && (
                  <p className="text-xs text-red-500 mt-1">
                    {bbErrors.bb_date}
                  </p>
                )}
              </div>

              {/* BB Amount + Emp Count */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1.5">
                    BB Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-rose-500 text-sm font-medium">
                      ₹
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={bbForm.bb_amount}
                      onChange={(e) => {
                        setBbForm((p) => ({
                          ...p,
                          bb_amount: e.target.value.replace(/[^0-9.]/g, ""),
                        }));
                        setBbErrors((p) => ({ ...p, bb_amount: "" }));
                      }}
                      className={`w-full border rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 text-gray-800 placeholder-gray-400 ${
                        bbErrors.bb_amount
                          ? "border-red-400 bg-red-50"
                          : "border-rose-200 bg-rose-50"
                      }`}
                      placeholder="0"
                    />
                  </div>
                  {bbErrors.bb_amount && (
                    <p className="text-xs text-red-500 mt-1">
                      {bbErrors.bb_amount}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1.5">
                    BB Emp Count
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bbForm.bb_emp_count}
                    onChange={(e) =>
                      setBbForm((p) => ({
                        ...p,
                        bb_emp_count: e.target.value.replace(/[^0-9]/g, ""),
                      }))
                    }
                    className="w-full border border-gray-200 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">
                    Original: {bbRow.employee_count || 0}
                  </p>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1.5">
                  Remarks
                </label>
                <textarea
                  rows={2}
                  value={bbForm.remarks}
                  onChange={(e) =>
                    setBbForm((p) => ({ ...p, remarks: e.target.value }))
                  }
                  className="w-full border border-gray-200 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                  placeholder="Reason for bounce back..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700">
                💡 Saving will auto-create a <strong>Credit bank entry</strong>{" "}
                (flow: os_bounce_back) and update OS Amt Difference across
                dashboards.
              </div>
            </div>

            <div className="px-5 py-4 border-t flex gap-3">
              <button
                onClick={() => setBbRow(null)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveBB}
                disabled={bbSaving}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {bbSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CornerDownLeft size={14} />
                )}
                {bbSaving ? "Saving…" : "Save Bounce Back"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          BB DRILLDOWN MODAL
      ══════════════════════════════════════════════ */}
      {drillRow && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-4 flex items-center justify-between">
              <div>
                <h4 className="text-white font-bold">Bounce Back Breakdown</h4>
                <p className="text-white/70 text-xs">
                  {drillRow.invoices?.invoice_number ||
                    drillRow.payout_ref_no ||
                    "OS Payout"}
                  &nbsp;·&nbsp;Original: {fmtCur(drillRow.amount_paid)}
                </p>
              </div>
              <button
                onClick={() => setDrillRow(null)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {drillLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading…</span>
                </div>
              ) : drillData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No bounce backs found.
                </p>
              ) : (
                <>
                  {drillData.map((bb, i) => (
                    <div
                      key={bb.id}
                      className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-rose-700 text-sm">
                            {bb.bb_ref_no}
                          </span>
                          <span className="text-xs bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">
                            {fmtDate(bb.bb_date)}
                          </span>
                          {bb.bb_emp_count > 0 && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                              {bb.bb_emp_count} emp
                            </span>
                          )}
                        </div>
                        {bb.remarks && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {bb.remarks}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-rose-700">
                          {fmtCur(bb.bb_amount)}
                        </p>
                        <button
                          onClick={() => deleteBB(bb, drillRow)}
                          className="text-[10px] text-red-400 hover:text-red-600 mt-0.5 flex items-center gap-0.5 ml-auto"
                        >
                          <Trash2 size={10} />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Total */}
                  <div className="border-t border-gray-200 pt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">OS Amount Paid</span>
                      <span className="font-bold text-gray-800">
                        {fmtCur(drillRow.amount_paid)}
                      </span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Total Bounce Back ({drillData.length})</span>
                      <span className="font-bold">
                        −
                        {fmtCur(
                          drillData.reduce(
                            (s, b) => s + (parseFloat(b.bb_amount) || 0),
                            0
                          )
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>TDS</span>
                      <span className="font-bold">
                        −{fmtCur(drillRow.income_tax_deducted || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-1">
                      <span className="font-bold text-gray-700">
                        Net Approved
                      </span>
                      <span className="font-bold text-emerald-600 text-base">
                        {fmtCur(
                          Math.max(
                            (parseFloat(drillRow.amount_paid) || 0) -
                              drillData.reduce(
                                (s, b) => s + (parseFloat(b.bb_amount) || 0),
                                0
                              ) -
                              (parseFloat(drillRow.income_tax_deducted) || 0),
                            0
                          )
                        )}
                      </span>
                    </div>
                    {drillRow.employee_count > 0 && (
                      <div className="flex justify-between text-xs text-gray-500 pt-1">
                        <span>
                          Net Emp Count ({drillRow.employee_count} −{" "}
                          {drillData.reduce(
                            (s, b) => s + (parseInt(b.bb_emp_count) || 0),
                            0
                          )}{" "}
                          BB)
                        </span>
                        <span className="font-bold text-emerald-600">
                          {Math.max(
                            (drillRow.employee_count || 0) -
                              drillData.reduce(
                                (s, b) => s + (parseInt(b.bb_emp_count) || 0),
                                0
                              ),
                            0
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="px-5 py-3 border-t flex gap-2">
              <button
                onClick={() => {
                  setDrillRow(null);
                  openBbModal(drillRow);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition flex items-center justify-center gap-2"
              >
                <CornerDownLeft size={14} />
                Add Another BB
              </button>
              <button
                onClick={() => setDrillRow(null)}
                className="flex-1 py-2 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          VIEW DETAIL MODAL
      ══════════════════════════════════════════════ */}
      {viewRow && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-700 px-5 py-4 flex items-center justify-between">
              <h4 className="text-white font-bold">OS Payout Detail</h4>
              <button
                onClick={() => setViewRow(null)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm max-h-[65vh] overflow-y-auto">
              {/* Payment breakdown */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Payment Breakdown
                </p>
                <div className="flex justify-between">
                  <span className="text-gray-600">OS Amount Paid</span>
                  <span className="font-bold text-gray-900">
                    {fmtCur(viewRow.amount_paid)}
                  </span>
                </div>
                {(bbMap[viewRow.id]?.total_bb || 0) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span className="flex items-center gap-1">
                      <CornerDownLeft size={12} />
                      Total Bounce Back ({bbMap[viewRow.id].count})
                    </span>
                    <span className="font-bold">
                      −{fmtCur(bbMap[viewRow.id].total_bb)}
                    </span>
                  </div>
                )}
                {(parseFloat(viewRow.income_tax_deducted) || 0) > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>TDS Deducted</span>
                    <span className="font-bold">
                      −{fmtCur(viewRow.income_tax_deducted)}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-bold text-gray-700">Net Approved</span>
                  <span className="font-bold text-emerald-600 text-base">
                    {fmtCur(netApproved(viewRow))}
                  </span>
                </div>
                {viewRow.employee_count > 0 && (
                  <div className="flex justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
                    <span>Net Emp Count</span>
                    <span className="font-bold text-emerald-600">
                      {netEmpCount(viewRow)} of {viewRow.employee_count}
                    </span>
                  </div>
                )}
              </div>

              {[
                [
                  "Date",
                  viewRow.payment_date
                    ? new Date(viewRow.payment_date).toLocaleDateString(
                        "en-IN",
                        { day: "2-digit", month: "long", year: "numeric" }
                      )
                    : "—",
                ],
                ["Invoice", viewRow.invoices?.invoice_number || "—"],
                ["Client", viewRow.clients_master?.client_name || "—"],
                ["Entity", viewRow.entity_master?.entity_name || "—"],
                ["Department", viewRow.departments_master?.dept_name || "—"],
                ["Pay Head", viewRow.pay_head || "—"],
                ["Payment Details", viewRow.payment_details || "—"],
                ["Bank", viewRow.bank_master?.bank_name || "—"],
                ["Billable", viewRow.is_billable ? "Yes ✓" : "No"],
                ["Payout Ref", viewRow.payout_ref_no || "—"],
                ["Remarks", viewRow.remarks || "—"],
              ].map(([label, val]) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-xs font-semibold text-gray-500 w-32 flex-shrink-0 pt-0.5">
                    {label}
                  </span>
                  <span className="text-gray-800 font-medium break-words">
                    {val}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t flex gap-2">
              <button
                onClick={() => {
                  setViewRow(null);
                  openBbModal(viewRow);
                }}
                className="flex-1 py-2 rounded-xl border-2 border-rose-200 text-rose-600 text-sm font-semibold hover:bg-rose-50 transition flex items-center justify-center gap-2"
              >
                <CornerDownLeft size={14} />
                Add BB
              </button>
              <button
                onClick={() => {
                  setViewRow(null);
                  startEdit(viewRow);
                }}
                className="flex-1 py-2 rounded-xl border-2 border-indigo-200 text-indigo-700 text-sm font-semibold hover:bg-indigo-50 transition flex items-center justify-center gap-2"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={() => setViewRow(null)}
                className="flex-1 py-2 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── DEPT / PAY HEAD OPTIONS ──────────────────────────────────────────────────
const DEPT_OPTIONS = [
  "Common",
  "OS",
  "Temp",
  "Rec",
  "BD",
  "Accts",
  "HR",
  "Admin",
  "IT",
  "Legal",
  "Projects",
  "Others",
];
const INTERNAL_PAY_HEADS = [
  "Fixed Salary",
  "Variable",
  "Reimbursement",
  "Arrear Bonus",
  "Others",
  "Loan-Advance",
];
const OS_PAY_HEADS = ["Salary", "Claim", "Incentive", "Other"];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const AddExpenseDetailsManModal = ({ isOpen, onClose, onSaved }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});

  const [showViewPage, setShowViewPage] = useState(false);
  const [showOsRecords, setShowOsRecords] = useState(false);
  const [osOutstanding, setOsOutstanding] = useState(null); // { net_in_hand, already_paid, remaining }
  const [osOutstandingLoading, setOsOutstandingLoading] = useState(false);

  const [entities, setEntities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [clients, setClients] = useState([]);
  const [banks, setBanks] = useState([]);
  const [payHeads, setPayHeads] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [internalTeam, setInternalTeam] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMismatch, setBulkMismatch] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const excelFileRef = useRef(null);
  const pendingValidRows = useRef([]);
  const pendingMasterData = useRef({});

  const [intForm, setIntForm] = useState({
    entity: "",
    department: "",
    empCode: "",
    name: "",
    designation: "",
    paymentHeader: "",
    paymentAmount: "",
    incomeTax: "",
    paymentDescription: "",
    monthOfPay: "",
    dateOfPay: "",
    bankId: "",
    remarks: "",
  });

  const [osForm, setOsForm] = useState({
    invoiceAvailable: "No",
    invoiceId: "",
    noOfEmployees: "",
    amountPaid: "",
    incomeTaxOs: "",
    datePaid: "",
    bankIdOs: "",
    payHeadOs: "",
    paymentDetailsOs: "",
    isBillable: false,
    osEntity: "",
    osDepartment: "",
    osClient: "",
    ledgerName: "",
    paymentDetails: "",
    payoutMonth: "",
    osNoOfEmployees: "",
    osAmountPaid: "",
    osIncomeTax: "",
    osDatePaid: "",
    osBankId: "",
    osPayHead: "",
    osIsBillable: false,
  });

  useEffect(() => {
    if (!isOpen) return;
    fetchMasters();
  }, [isOpen]);

  const fetchMasters = async () => {
    const [e, d, c, b, ph, des, emp, it, inv] = await Promise.all([
      supabase
        .from("entity_master")
        .select("id, entity_name")
        .order("entity_name"),
      supabase
        .from("departments_master")
        .select("id, dept_code, dept_name")
        .order("dept_name"),
      supabase
        .from("clients_master")
        .select("id, client_name, ledger_name")
        .order("client_name"),
      supabase
        .from("bank_master")
        .select("id, bank_name, account_number")
        .order("bank_name"),
      supabase.from("pay_head_master").select("*").eq("is_active", true),
      supabase
        .from("designation_master")
        .select("id, designation_name")
        .order("designation_name"),
      supabase
        .from("employee_master")
        .select(
          "*, designation_master(designation_name), entity_master(entity_name), departments_master(dept_name), bank_master(bank_name)"
        )
        .order("employee_name"),
      supabase
        .from("internal_team")
        .select("id, emp_code, name, entity, department, designation, status")
        .order("name"),
      supabase
        .from("invoices")
        .select(
          "id, invoice_number, client_id, entity_id, clients_master(client_name), entity_master(entity_name)"
        )
        .order("invoice_number", { ascending: false }),
    ]);
    if (!e.error) setEntities(e.data || []);
    if (!d.error) setDepartments(d.data || []);
    if (!c.error) setClients(c.data || []);
    if (!b.error) setBanks(b.data || []);
    if (!ph.error) setPayHeads(ph.data || []);
    if (!des.error) setDesignations(des.data || []);
    if (!emp.error) {
      setEmployees(
        (emp.data || []).filter((r) => {
          const code = (r.emp_code || "").toLowerCase();
          return (
            !code.startsWith("mock") &&
            !code.startsWith("test") &&
            !code.includes("_old")
          );
        })
      );
    }
    if (!it.error) {
      setInternalTeam(
        (it.data || []).filter((r) => {
          const code = (r.emp_code || "").toLowerCase();
          return !code.startsWith("mock") && !code.startsWith("test");
        })
      );
    }
    if (!inv.error) setInvoices(inv.data || []);
  };

  useEffect(() => {
    if (!intForm.empCode) return;

    const emp = employees.find(
      (e) => e.emp_code?.toUpperCase() === intForm.empCode?.toUpperCase()
    );
    if (emp) {
      setIntForm((prev) => ({
        ...prev,
        name: emp.employee_name || "",
        designation: emp.designation_master?.designation_name || "",
        department: emp.departments_master?.dept_name || "",
        bankId: emp.bank_id || "",
      }));
      return;
    }

    const it = internalTeam.find(
      (e) => e.emp_code?.toUpperCase() === intForm.empCode?.toUpperCase()
    );
    if (it) {
      const matchedDept = departments.find(
        (d) =>
          d.dept_code?.toLowerCase().trim() ===
          it.department?.toLowerCase().trim()
      );
      setIntForm((prev) => ({
        ...prev,
        name: it.name || "",
        designation: it.designation || "",
        department: matchedDept?.dept_name || it.department || "",
      }));
    }
  }, [intForm.empCode, employees, internalTeam]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedOption(null);
      setSaved(false);
      setErrors({});
      setBulkMismatch(null);
      setBulkResult(null);
      setShowViewPage(false);
      setShowOsRecords(false);
      setOsOutstanding(null);
      setIntForm({
        entity: "",
        department: "",
        empCode: "",
        name: "",
        designation: "",
        paymentHeader: "",
        paymentAmount: "",
        incomeTax: "",
        paymentDescription: "",
        monthOfPay: "",
        dateOfPay: "",
        bankId: "",
        remarks: "",
      });
      setOsForm({
        invoiceAvailable: "No",
        invoiceId: "",
        noOfEmployees: "",
        amountPaid: "",
        incomeTaxOs: "",
        datePaid: "",
        bankIdOs: "",
        payHeadOs: "",
        paymentDetailsOs: "",
        isBillable: false,
        osEntity: "",
        osDepartment: "",
        osClient: "",
        ledgerName: "",
        paymentDetails: "",
        payoutMonth: "",
        osNoOfEmployees: "",
        osAmountPaid: "",
        osIncomeTax: "",
        osDatePaid: "",
        osBankId: "",
        osPayHead: "",
        osIsBillable: false,
      });
    }
  }, [isOpen]);

  // ─── Fetch OS Outstanding ─────────────────────────────────────────────────
  const fetchOsOutstanding = async (invoiceId) => {
    if (!invoiceId) {
      setOsOutstanding(null);
      return;
    }
    setOsOutstandingLoading(true);
    try {
      const { data: inv } = await supabase
        .from("invoices")
        .select("net_in_hand")
        .eq("id", invoiceId)
        .single();

      const { data: payouts } = await supabase
        .from("os_payouts")
        .select("amount_paid, bounce_back_amount, income_tax_deducted")
        .eq("invoice_id", invoiceId);

      const netInHand = parseFloat(inv?.net_in_hand) || 0;
      const alreadyPaid = (payouts || []).reduce(
        (s, p) =>
          s +
          Math.max(
            (parseFloat(p.amount_paid) || 0) -
              (parseFloat(p.bounce_back_amount) || 0) -
              (parseFloat(p.income_tax_deducted) || 0),
            0
          ),
        0
      );
      const remaining = netInHand - alreadyPaid;

      setOsOutstanding({ netInHand, alreadyPaid, remaining });
    } catch (e) {
      setOsOutstanding(null);
    } finally {
      setOsOutstandingLoading(false);
    }
  };

  const setInt = (field, value) => {
    setIntForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  };
  const setOs = (field, value) => {
    setOsForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  };

  const netPayment =
    (parseFloat(intForm.paymentAmount) || 0) -
    (parseFloat(intForm.incomeTax) || 0);

  const validateInternal = () => {
    const e = {};
    if (!intForm.entity) e.entity = "Required";
    if (!intForm.department) e.department = "Required";
    if (!intForm.empCode) e.empCode = "Required";
    if (!intForm.name) e.name = "Required";
    if (!intForm.paymentHeader) e.paymentHeader = "Required";
    if (!intForm.paymentAmount || parseFloat(intForm.paymentAmount) <= 0)
      e.paymentAmount = "Must be > 0";
    if (!intForm.dateOfPay) e.dateOfPay = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateOS = () => {
    const e = {};
    if (osForm.invoiceAvailable === "Yes") {
      if (!osForm.invoiceId) e.invoiceId = "Select an invoice";
      if (!osForm.amountPaid || parseFloat(osForm.amountPaid) <= 0)
        e.amountPaid = "Must be > 0";
      if (!osForm.datePaid) e.datePaid = "Required";
      if (!osForm.bankIdOs) e.bankIdOs = "Select bank";
    } else {
      if (!osForm.osEntity) e.osEntity = "Required";
      if (!osForm.osDepartment) e.osDepartment = "Required";
      if (!osForm.osClient) e.osClient = "Required";
      if (!osForm.paymentDetails) e.paymentDetails = "Required";
      if (!osForm.payoutMonth) e.payoutMonth = "Required";
      if (!osForm.osAmountPaid || parseFloat(osForm.osAmountPaid) <= 0)
        e.osAmountPaid = "Must be > 0";
      if (!osForm.osDatePaid) e.osDatePaid = "Required";
      if (!osForm.osBankId) e.osBankId = "Select bank";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ══════════════════════════════════════════════════════════════
  // BULK UPLOAD — FIXED: Fetch all & filter locally to avoid URI too long
  // ══════════════════════════════════════════════════════════════
  const handleExcelFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (excelFileRef.current) excelFileRef.current.value = "";
    setBulkLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(ws, { raw: true, defval: "" });
      if (!rawRows.length) {
        alert("Excel file is empty.");
        setBulkLoading(false);
        return;
      }

      const normalizedRows = rawRows.map((row, idx) => {
        const normalized = { _rowNum: idx + 2 };
        Object.entries(row).forEach(([key, val]) => {
          const mapped = COL_MAP[normalizeHeader(key)];
          if (mapped) normalized[mapped] = val;
        });
        return normalized;
      });
      if (!normalizedRows[0].hasOwnProperty("emp_code")) {
        alert('Column "Emp Code" not found. Please use the template.');
        setBulkLoading(false);
        return;
      }

      // Build a Set of normalized (uppercase) emp codes from Excel
      const excelCodes = [
        ...new Set(
          normalizedRows
            .map((r) =>
              String(r.emp_code || "")
                .trim()
                .toUpperCase()
            )
            .filter(Boolean)
        ),
      ];

      // Create a Set for fast lookup
      const excelSet = new Set(excelCodes);

      // FIX: Fetch ALL employee_master records (no .in() filter)
      const { data: empMasterRows, error: empMasterError } = await supabase
        .from("employee_master")
        .select(
          "emp_code, employee_name, entity_master(entity_name), departments_master(dept_name), bank_master(bank_name, id), bank_id"
        );

      // FIX: Fetch ALL internal_team records (no .in() filter)
      const { data: internalTeamRows, error: internalTeamError } =
        await supabase
          .from("internal_team")
          .select("emp_code, name, entity, department, designation, status");

      // Debug logs
      console.log("Excel unique codes:", excelCodes.length);
      console.log("employee_master total:", empMasterRows?.length || 0);
      console.log("internal_team total:", internalTeamRows?.length || 0);
      if (empMasterError) console.error("empMasterError:", empMasterError);
      if (internalTeamError)
        console.error("internalTeamError:", internalTeamError);

      // FIX: Filter locally instead of using .in()
      const filteredEmpMaster = (empMasterRows || []).filter((r) =>
        excelSet.has(String(r.emp_code).trim().toUpperCase())
      );
      const filteredInternalTeam = (internalTeamRows || []).filter((r) =>
        excelSet.has(String(r.emp_code).trim().toUpperCase())
      );

      console.log("Matched employee_master:", filteredEmpMaster.length);
      console.log("Matched internal_team:", filteredInternalTeam.length);

      // Build empMap with normalized uppercase keys
      const empMap = {};
      filteredEmpMaster.forEach((r) => {
        empMap[String(r.emp_code).trim().toUpperCase()] = {
          source: "employee_master",
          ...r,
        };
      });

      filteredInternalTeam.forEach((r) => {
        const code = String(r.emp_code).trim().toUpperCase();
        if (!empMap[code]) {
          empMap[code] = {
            source: "internal_team",
            ...r,
          };
        }
      });

      const entityMap = {};
      entities.forEach((e) => {
        entityMap[e.entity_name?.toLowerCase().trim()] = e.id;
      });
      const deptMap = {};
      departments.forEach((d) => {
        deptMap[d.dept_name?.toLowerCase().trim()] = d.id;
        deptMap[d.dept_code?.toLowerCase().trim()] = d.id;
      });
      const bankMap = {};
      banks.forEach((b) => {
        bankMap[b.bank_name?.toLowerCase().trim()] = b.id;
      });

      pendingMasterData.current = { empMap, entityMap, deptMap, bankMap };

      const validRows = [],
        mismatchRows = [];
      normalizedRows.forEach((row) => {
        const code = String(row.emp_code || "")
          .trim()
          .toUpperCase();

        if (!code) {
          mismatchRows.push({ ...row, reason: "Empty emp_code" });
        } else if (empMap[code]) {
          validRows.push({ ...row, _empData: empMap[code] });
        } else {
          mismatchRows.push({
            ...row,
            reason: `emp_code "${code}" not in employee master or internal team`,
          });
        }
      });
      pendingValidRows.current = validRows;

      // CHANGE 3: Store file.name in bulkMismatch state
      if (mismatchRows.length > 0) {
        setBulkMismatch({
          matched: validRows.length,
          mismatches: mismatchRows,
          fileName: file.name,
        });
      } else {
        // CHANGE 3: Pass file.name when calling executeUpload
        await executeUpload(
          validRows,
          pendingMasterData.current,
          [],
          file.name
        );
      }
    } catch (err) {
      alert("❌ Failed to process Excel: " + err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // CHANGE 3: Updated to pass fileName from bulkMismatch
  const handleProceedWithMatched = async () => {
    setBulkMismatch(null);
    setBulkLoading(true);
    const skippedDetails = (bulkMismatch?.mismatches || []).map((m) => ({
      emp_code: m.emp_code,
      employee_name: m.employee_name || "",
      payment_amount: parseFloat(m.payment_amount) || 0,
      rowNum: m._rowNum,
      reason: m.reason,
    }));
    await executeUpload(
      pendingValidRows.current,
      pendingMasterData.current,
      skippedDetails,
      bulkMismatch?.fileName || ""
    );
    setBulkLoading(false);
  };

  // CHANGE 1: Updated executeUpload to generate batch and save batch columns
  const executeUpload = async (
    validRows,
    masterData,
    existingSkipped = [],
    fileName = ""
  ) => {
    const { empMap, entityMap, deptMap, bankMap } = masterData;
    let added = 0;
    const failedDetails = [];

    // ── Generate batch code and create batch record ──
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const batchCode = `BULK_${dd}${mm}${yyyy}_${Date.now()
      .toString()
      .slice(-4)}`;
    const totalAmount = validRows.reduce(
      (s, r) => s + (parseFloat(r.payment_amount) || 0),
      0
    );

    const { data: batchRow, error: batchErr } = await supabase
      .from("bulk_upload_batches")
      .insert({
        batch_code: batchCode,
        file_name: fileName,
        employee_count: validRows.length,
        total_amount: totalAmount,
        upload_date: now.toISOString(),
      })
      .select()
      .single();

    if (batchErr) {
      alert("Failed to create batch record: " + batchErr.message);
      return;
    }

    // Non-blocking bank balance warning for bulk upload
    // Group total payment amount by bank_id
    const bankPaymentMap = {};
    for (const row of validRows) {
      const emp = row._empData;
      const bankName = (row.bank_name || emp?.bank_master?.bank_name || "")
        .toLowerCase()
        .trim();
      const bankId = bankMap[bankName] || emp?.bank_id || null;
      const paymentAmount = parseFloat(row.payment_amount) || 0;
      if (bankId && paymentAmount > 0) {
        if (!bankPaymentMap[bankId]) bankPaymentMap[bankId] = 0;
        bankPaymentMap[bankId] += paymentAmount;
      }
    }

    // Check each bank's balance against total payment amount
    for (const [bankId, totalPayment] of Object.entries(bankPaymentMap)) {
      try {
        const { data: bank } = await supabase
          .from("bank_master")
          .select("id,opening_balance,bank_name")
          .eq("id", bankId)
          .maybeSingle();
        const { data: entries } = await supabase
          .from("bank_entries")
          .select("amount,type,is_deleted")
          .eq("bank_id", bankId)
          .eq("is_deleted", false);
        const opening = Number(bank?.opening_balance || 0);
        const movement = (entries || []).reduce((sum, e) => {
          const amt = Number(e.amount || 0);
          return String(e.type).toLowerCase() === "debit"
            ? sum - amt
            : sum + amt;
        }, 0);
        const currentBalance = opening + movement;
        if (totalPayment > currentBalance) {
          const ok = window.confirm(
            `⚠️ Bulk upload — ${
              bank?.bank_name || "Bank"
            }: total payment (₹${totalPayment.toLocaleString(
              "en-IN"
            )}) exceeds balance (₹${Number(currentBalance).toLocaleString(
              "en-IN"
            )}).\n\nOK to proceed, Cancel to abort.`
          );
          if (!ok) {
            setBulkLoading(false);
            return;
          }
        }
      } catch (err) {
        console.debug("Bank balance check failed:", err.message || err);
      }
    }

    for (const row of validRows) {
      try {
        const emp = row._empData;
        const entityName = (
          row.entity ||
          emp?.entity_master?.entity_name ||
          emp?.entity ||
          ""
        )
          .toLowerCase()
          .trim();
        const entityId = entityMap[entityName] || null;
        const deptName = (
          row.department ||
          emp?.departments_master?.dept_name ||
          emp?.department ||
          ""
        )
          .toLowerCase()
          .trim();
        const deptId = deptMap[deptName] || null;
        const bankName = (row.bank_name || emp?.bank_master?.bank_name || "")
          .toLowerCase()
          .trim();
        const bankId = bankMap[bankName] || emp?.bank_id || null;
        const paymentAmount = parseFloat(row.payment_amount) || 0;
        const incomeTax = parseFloat(row.income_tax_deducted) || 0;
        const netPay = Math.max(paymentAmount - incomeTax, 0);
        let monthOfPay = null;
        if (row.month_of_pay) {
          const m = excelDateToString(row.month_of_pay);
          if (m) monthOfPay = m.slice(0, 7) + "-01";
        }
        const dateOfPay = excelDateToString(row.date_of_pay);
        if (!dateOfPay)
          throw new Error("Invalid date_of_pay: " + row.date_of_pay);

        // CHANGE 2: Added batch columns to payload
        const payload = {
          emp_code: String(row.emp_code).trim(),
          employee_name:
            row.employee_name || emp?.employee_name || emp?.name || "",
          designation: row.designation || "",
          entity_id: entityId,
          department_id: deptId,
          pay_head: row.pay_head || "",
          payment_description: row.payment_description || "",
          payment_amount: paymentAmount,
          income_tax_deducted: incomeTax,
          net_payment: netPay,
          month_of_pay: monthOfPay,
          date_of_pay: dateOfPay,
          bank_id: bankId,
          bank_name: row.bank_name || emp?.bank_master?.bank_name || "",
          remarks: row.remarks || "",
          entry_type: "bulk",
          bulk_batch_id: batchRow.id,
          bulk_batch_code: batchCode,
          bulk_file_name: fileName,
          bulk_upload_date: now.toISOString(),
        };
        const { error: insertErr } = await supabase
          .from("employee_expense_payouts")
          .insert([payload]);
        if (insertErr) throw insertErr;
        if (incomeTax > 0) {
          await supabase.from("statutory_liabilities").insert([
            {
              source_type: "salary",
              statutory_type: "TDS",
              entity:
                row.entity ||
                emp?.entity_master?.entity_name ||
                emp?.entity ||
                "",
              amount: incomeTax,
              status: "pending",
            },
          ]);
        }
        added++;
      } catch (err) {
        failedDetails.push({
          emp_code: row.emp_code,
          employee_name: row.employee_name || "",
          rowNum: row._rowNum,
          error: err.message,
        });
      }
    }
    setBulkResult({
      added,
      skipped: existingSkipped.length,
      failed: failedDetails.length,
      skippedDetails: existingSkipped,
      failedDetails,
    });
    if (added > 0) onSaved?.();
  };

  // ── Save Internal ──
  const saveInternal = async () => {
    if (!validateInternal()) return;
    setLoading(true);
    try {
      // Non-blocking bank balance warning
      if (intForm.bankId && (parseFloat(intForm.paymentAmount) || 0) > 0) {
        try {
          const { data: bank } = await supabase
            .from("bank_master")
            .select("id,opening_balance,bank_name")
            .eq("id", intForm.bankId)
            .maybeSingle();
          const { data: entries } = await supabase
            .from("bank_entries")
            .select("amount,type,is_deleted")
            .eq("bank_id", intForm.bankId)
            .eq("is_deleted", false);
          const opening = Number(bank?.opening_balance || 0);
          const movement = (entries || []).reduce((sum, e) => {
            const amt = Number(e.amount || 0);
            return String(e.type).toLowerCase() === "debit"
              ? sum - amt
              : sum + amt;
          }, 0);
          const currentBalance = opening + movement;
          const payAmt = Number(parseFloat(intForm.paymentAmount) || 0);
          if (payAmt > currentBalance) {
            const ok = window.confirm(
              `⚠️ Payment (₹${payAmt.toLocaleString(
                "en-IN"
              )}) exceeds bank balance (₹${Number(
                currentBalance
              ).toLocaleString(
                "en-IN"
              )}).\n\nClick OK to proceed, or Cancel to go back.`
            );
            if (!ok) {
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.debug("Bank balance check failed:", err.message || err);
        }
      }
      const payload = {
        entity_id:
          entities.find((e) => e.entity_name === intForm.entity)?.id || null,
        department_id:
          departments.find((d) => d.dept_name === intForm.department)?.id ||
          null,
        emp_code: intForm.empCode,
        employee_name: intForm.name,
        designation: intForm.designation,
        pay_head: intForm.paymentHeader,
        payment_description: intForm.paymentDescription,
        payment_amount: parseFloat(intForm.paymentAmount) || 0,
        income_tax_deducted: parseFloat(intForm.incomeTax) || 0,
        net_payment: Math.max(netPayment, 0),
        month_of_pay: intForm.monthOfPay ? intForm.monthOfPay + "-01" : null,
        date_of_pay: intForm.dateOfPay,
        bank_id: intForm.bankId || null,
        bank_name:
          banks.find((b) => b.id === intForm.bankId)?.bank_name || null,
        remarks: intForm.remarks,
        entry_type: "single",
      };
      const { data: savedPayment, error } = await supabase
        .from("employee_expense_payouts")
        .insert([payload])
        .select()
        .single();
      if (error) throw error;

      if ((parseFloat(intForm.incomeTax) || 0) > 0) {
        await supabase.from("statutory_liabilities").insert([
          {
            source_type: "salary",
            source_id: savedPayment.id,
            statutory_type: "TDS",
            entity: intForm.entity,
            amount: parseFloat(intForm.incomeTax),
            status: "pending",
          },
        ]);
      }
      setSaved(true);
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 1200);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // SAVE OS
  // ══════════════════════════════════════════════════════════════
  const saveOS = async () => {
    if (!validateOS()) return;
    setLoading(true);
    try {
      let payload;

      if (osForm.invoiceAvailable === "Yes") {
        const inv = invoices.find((i) => i.id === osForm.invoiceId);

        // ── Hard block: Amount Paid cannot exceed OS Amt Difference ──
        if (inv?.net_in_hand > 0) {
          const { data: existingPayouts } = await supabase
            .from("os_payouts")
            .select("amount_paid, bounce_back_amount, income_tax_deducted")
            .eq("invoice_id", osForm.invoiceId);

          const alreadyPaid = (existingPayouts || []).reduce(
            (s, p) =>
              s +
              Math.max(
                (Number(p.amount_paid) || 0) -
                  (Number(p.bounce_back_amount) || 0) -
                  (Number(p.income_tax_deducted) || 0),
                0
              ),
            0
          );

          const thisAmount = parseFloat(osForm.amountPaid) || 0;
          const remaining = Number(inv.net_in_hand) - alreadyPaid;

          if (thisAmount > remaining) {
            const proceed = window.confirm(
              `⚠️ Amount Paid (₹${thisAmount.toLocaleString(
                "en-IN"
              )}) exceeds the OS Amt Difference remaining (₹${remaining.toLocaleString(
                "en-IN"
              )}).\n\nClick OK to proceed anyway, or Cancel to go back and fix the amount.`
            );
            if (!proceed) {
              setErrors((p) => ({
                ...p,
                amountPaid: `⛔ Exceeds OS Amt Difference. Max allowed: ₹${remaining.toLocaleString(
                  "en-IN"
                )} — You entered: ₹${thisAmount.toLocaleString("en-IN")}`,
              }));
              setLoading(false);
              return; // Cancel → stop save
            }
            setErrors((p) => ({ ...p, amountPaid: "" }));
          }
        }

        payload = {
          invoice_id: osForm.invoiceId || null,
          entity_id: inv?.entity_id || null,
          department_id: null,
          client_id: inv?.client_id || null,
          ledger_name: null,
          pay_head: osForm.payHeadOs,
          payment_details: osForm.paymentDetailsOs,
          payout_month: null,
          employee_count: parseInt(osForm.noOfEmployees) || 0,
          amount_paid: parseFloat(osForm.amountPaid) || 0,
          income_tax_deducted: parseFloat(osForm.incomeTaxOs) || 0,
          is_billable: osForm.isBillable,
          payment_date: osForm.datePaid,
          bank_id: osForm.bankIdOs || null,
          bank_name:
            banks.find((b) => b.id === osForm.bankIdOs)?.bank_name || null,
          remarks: "",
        };
      } else {
        const client = clients.find((c) => c.client_name === osForm.osClient);

        payload = {
          invoice_id: null,
          entity_id:
            entities.find((e) => e.entity_name === osForm.osEntity)?.id || null,
          department_id:
            departments.find((d) => d.dept_name === osForm.osDepartment)?.id ||
            null,
          client_id: client?.id || null,
          ledger_name: osForm.ledgerName,
          pay_head: osForm.osPayHead,
          payment_details: osForm.paymentDetails,
          payout_month: osForm.payoutMonth ? osForm.payoutMonth + "-01" : null,
          employee_count: parseInt(osForm.osNoOfEmployees) || 0,
          amount_paid: parseFloat(osForm.osAmountPaid) || 0,
          income_tax_deducted: parseFloat(osForm.osIncomeTax) || 0,
          is_billable: osForm.osIsBillable,
          payment_date: osForm.osDatePaid,
          bank_id: osForm.osBankId || null,
          bank_name:
            banks.find((b) => b.id === osForm.osBankId)?.bank_name || null,
          remarks: "",
        };
      }

      // Non-blocking bank balance warning for OS payout
      try {
        const bankIdForOs = payload.bank_id;
        const osAmt = Number(payload.amount_paid || 0);
        if (bankIdForOs && osAmt > 0) {
          const { data: bank } = await supabase
            .from("bank_master")
            .select("id,opening_balance,bank_name")
            .eq("id", bankIdForOs)
            .maybeSingle();
          const { data: entries } = await supabase
            .from("bank_entries")
            .select("amount,type,is_deleted")
            .eq("bank_id", bankIdForOs)
            .eq("is_deleted", false);
          const opening = Number(bank?.opening_balance || 0);
          const movement = (entries || []).reduce((sum, e) => {
            const amt = Number(e.amount || 0);
            return String(e.type).toLowerCase() === "debit"
              ? sum - amt
              : sum + amt;
          }, 0);
          const currentBalance = opening + movement;
          if (osAmt > currentBalance) {
            const ok = window.confirm(
              `⚠️ Payment (₹${osAmt.toLocaleString(
                "en-IN"
              )}) exceeds bank balance (₹${Number(
                currentBalance
              ).toLocaleString(
                "en-IN"
              )}).\n\nClick OK to proceed, or Cancel to go back.`
            );
            if (!ok) {
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.debug("Bank balance check failed:", err.message || err);
      }

      const { data: savedPayout, error: payoutErr } = await supabase
        .from("os_payouts")
        .insert([payload])
        .select()
        .single();
      if (payoutErr) throw payoutErr;

      const taxAmt =
        parseFloat(
          osForm.invoiceAvailable === "Yes"
            ? osForm.incomeTaxOs
            : osForm.osIncomeTax
        ) || 0;
      if (taxAmt > 0) {
        await supabase.from("statutory_liabilities").insert([
          {
            source_type: "os_payout",
            source_id: savedPayout.id,
            statutory_type: "TDS",
            entity: osForm.osEntity || "",
            amount: taxAmt,
            status: "pending",
          },
        ]);
      }

      setSaved(true);
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 1200);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const internalHeads = payHeads
    .filter((p) => p.payout_type === "INTERNAL")
    .map((p) => p.name);
  const osHeads = payHeads
    .filter((p) => p.payout_type === "OS")
    .map((p) => p.name);
  const intPayHeadOptions =
    internalHeads.length > 0 ? internalHeads : INTERNAL_PAY_HEADS;
  const osPayHeadOptions = osHeads.length > 0 ? osHeads : OS_PAY_HEADS;

  if (showViewPage) {
    return <ExpenseRecordsView onClose={() => setShowViewPage(false)} />;
  }

  if (showOsRecords) {
    return (
      <OsPayoutRecordsView
        banks={banks}
        entities={entities}
        departments={departments}
        clients={clients}
        invoices={invoices}
        onClose={() => setShowOsRecords(false)}
        onChanged={() => onSaved?.()}
      />
    );
  }

  // ─── OPTION SELECTION ──────────────────────────────────────────────────────
  const OptionSelection = () => (
    <div className="p-8">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-1">
          Select Expense / Payout Type
        </h3>
        <p className="text-gray-600 text-sm">Choose the category to proceed</p>
      </div>
      <div className="grid grid-cols-2 gap-5">
        {[
          {
            key: "internal",
            icon: Users,
            title: "Internal Employee",
            subtitle: "Salary, Reimbursement, Bonus, Loan",
            gradient: "from-blue-500 to-indigo-600",
            bg: "from-blue-50 to-indigo-50",
            border: "border-blue-200 hover:border-blue-400",
          },
          {
            key: "os",
            icon: FileText,
            title: "3rd Party / OS Payout",
            subtitle: "Vendor, Consultant, Contract Staff",
            gradient: "from-purple-500 to-pink-600",
            bg: "from-purple-50 to-pink-50",
            border: "border-purple-200 hover:border-purple-400",
          },
        ].map((opt) => (
          <motion.button
            key={opt.key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedOption(opt.key)}
            className={`p-7 bg-gradient-to-br ${opt.bg} border-2 ${opt.border} rounded-2xl transition-all group text-left`}
          >
            <div
              className={`w-14 h-14 bg-gradient-to-br ${opt.gradient} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}
            >
              <opt.icon className="w-7 h-7 text-white" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-1">
              {opt.title}
            </h4>
            <p className="text-sm text-gray-600">{opt.subtitle}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );

  // ─── INTERNAL EMPLOYEE FORM ────────────────────────────────────────────────
  const internalFormJSX = (
    <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <SectionHeader icon={Users} title="Employee Information" color="blue" />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <FieldLabel>Entity *</FieldLabel>
            <Select
              value={intForm.entity}
              onChange={(v) => setInt("entity", v)}
              options={entities.map((e) => ({
                value: e.entity_name,
                label: e.entity_name,
              }))}
              placeholder="Select entity"
              error={errors.entity}
            />
          </div>
          <div>
            <FieldLabel>Department *</FieldLabel>
            <Select
              value={intForm.department}
              onChange={(v) => setInt("department", v)}
              options={departments.map((d) => ({
                value: d.dept_name,
                label: d.dept_name,
              }))}
              placeholder="Select dept"
              error={errors.department}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <FieldLabel>Emp Code *</FieldLabel>
            <SearchableSelect
              value={intForm.empCode}
              onChange={(v) => setInt("empCode", v)}
              options={[
                ...internalTeam.map((it) => ({
                  value: it.emp_code,
                  label: `${it.emp_code} – ${it.name}`,
                  _source: "internal_team",
                })),
                ...employees
                  .filter(
                    (e) =>
                      !internalTeam.some(
                        (it) =>
                          it.emp_code?.toUpperCase() ===
                          e.emp_code?.toUpperCase()
                      ) && !e.emp_code?.toLowerCase().includes("old")
                  )
                  .map((e) => ({
                    value: e.emp_code,
                    label: `${e.emp_code} – ${e.employee_name}`,
                    _source: "employee_master",
                  })),
              ]}
              placeholder="Type employee code or name..."
              error={errors.empCode}
            />
          </div>
          <div>
            <FieldLabel>Name *</FieldLabel>
            <input
              type="text"
              defaultValue={intForm.name}
              onBlur={(e) => setInt("name", e.target.value)}
              placeholder="Auto-filled from emp code"
              readOnly={!!intForm.empCode}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${
                errors.name
                  ? "border-red-400 bg-red-50 focus:ring-red-300"
                  : "border-gray-200 focus:ring-indigo-400"
              } ${
                intForm.empCode
                  ? "bg-gray-100 text-gray-700 cursor-not-allowed"
                  : "bg-white text-gray-800"
              } placeholder-gray-400`}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
          </div>
          <div>
            <FieldLabel>Designation</FieldLabel>
            <input
              type="text"
              defaultValue={intForm.designation}
              onBlur={(e) => setInt("designation", e.target.value)}
              placeholder="Auto-filled"
              readOnly={!!intForm.empCode}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition border-gray-200 focus:ring-indigo-400 ${
                intForm.empCode
                  ? "bg-gray-100 text-gray-700 cursor-not-allowed"
                  : "bg-white text-gray-800"
              } placeholder-gray-400`}
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <SectionHeader
          icon={DollarSign}
          title="Payment Details"
          color="indigo"
        />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <FieldLabel>Pay Head *</FieldLabel>
            <Select
              value={intForm.paymentHeader}
              onChange={(v) => setInt("paymentHeader", v)}
              options={intPayHeadOptions.map((p) => ({ value: p, label: p }))}
              placeholder="Select pay head"
              error={errors.paymentHeader}
            />
          </div>
          <div>
            <FieldLabel>Month of Pay</FieldLabel>
            <input
              type="month"
              defaultValue={intForm.monthOfPay}
              onBlur={(e) => setInt("monthOfPay", e.target.value)}
              className="w-full border border-gray-200 bg-white text-gray-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <FieldLabel>Payment Amount *</FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500 text-sm font-medium">
                ₹
              </span>
              <input
                type="text"
                inputMode="decimal"
                defaultValue={intForm.paymentAmount}
                onBlur={(e) =>
                  setInt(
                    "paymentAmount",
                    e.target.value.replace(/[^0-9.]/g, "")
                  )
                }
                className={`w-full border rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-800 placeholder-gray-400 ${
                  errors.paymentAmount
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200 bg-white"
                }`}
                placeholder="0"
              />
            </div>
            {errors.paymentAmount && (
              <p className="text-xs text-red-500 mt-1">
                {errors.paymentAmount}
              </p>
            )}
          </div>
          <div>
            <FieldLabel>Income Tax Deducted</FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500 text-sm font-medium">
                ₹
              </span>
              <input
                type="text"
                inputMode="decimal"
                defaultValue={intForm.incomeTax}
                onBlur={(e) =>
                  setInt("incomeTax", e.target.value.replace(/[^0-9.]/g, ""))
                }
                className="w-full border border-gray-200 bg-white text-gray-800 placeholder-gray-400 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Net Payment</FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-emerald-600 text-sm font-medium">
                ₹
              </span>
              <input
                type="text"
                value={Math.max(netPayment, 0)}
                readOnly
                className="w-full border border-emerald-200 rounded-lg pl-7 pr-3 py-2.5 text-sm bg-emerald-50 text-emerald-700 font-semibold cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              = Amount − Tax (auto)
            </p>
          </div>
        </div>
        <div className="mb-3">
          <FieldLabel>Payment Description</FieldLabel>
          <textarea
            defaultValue={intForm.paymentDescription}
            onBlur={(e) => setInt("paymentDescription", e.target.value)}
            rows={2}
            placeholder="Describe the payment..."
            className="w-full border border-gray-200 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Date of Pay *</FieldLabel>
            <input
              type="date"
              defaultValue={intForm.dateOfPay}
              onBlur={(e) => setInt("dateOfPay", e.target.value)}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-800 ${
                errors.dateOfPay
                  ? "border-red-400 bg-red-50"
                  : "border-gray-200 bg-white"
              }`}
            />
            {errors.dateOfPay && (
              <p className="text-xs text-red-500 mt-1">{errors.dateOfPay}</p>
            )}
          </div>
          <div>
            <FieldLabel>Bank / Account</FieldLabel>
            <Select
              value={intForm.bankId}
              onChange={(v) => setInt("bankId", v)}
              options={banks.map((b) => ({
                value: b.id,
                label: `${b.bank_name} — ${b.account_number}`,
              }))}
              placeholder="Select bank"
            />
          </div>
        </div>
        <div className="mt-3">
          <FieldLabel>Remarks</FieldLabel>
          <textarea
            defaultValue={intForm.remarks}
            onBlur={(e) => setInt("remarks", e.target.value)}
            rows={2}
            className="w-full border border-gray-200 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            placeholder="Additional notes..."
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-gray-200 gap-3">
        <button
          onClick={() => setSelectedOption(null)}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition"
          >
            <Download size={13} />
            Template
          </button>
          <label
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              bulkLoading
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {bulkLoading ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Processing…
              </>
            ) : (
              <>
                <Upload size={13} /> Upload Excel
              </>
            )}
            <input
              ref={excelFileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelFileSelected}
              disabled={bulkLoading}
              className="hidden"
            />
          </label>
        </div>
        <button
          onClick={saveInternal}
          disabled={loading || saved}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 min-w-[160px] justify-center transition ${
            saved
              ? "bg-emerald-500 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="w-4 h-4" /> Saved!
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Save Employee Expense
            </>
          )}
        </button>
      </div>
    </div>
  );

  // ─── OS PAYOUT FORM ────────────────────────────────────────────────────────
  const osFormJSX = (() => {
    const withInvoice = osForm.invoiceAvailable === "Yes";
    return (
      <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <FieldLabel>Invoice Number Available?</FieldLabel>
          <div className="flex gap-3 mt-1">
            {["Yes", "No"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setOs("invoiceAvailable", opt)}
                className={`px-5 py-2 rounded-lg text-sm font-medium border transition ${
                  osForm.invoiceAvailable === opt
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-purple-300"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {withInvoice && (
            <p className="mt-2 text-xs text-purple-700 bg-purple-100 rounded-lg px-3 py-1.5 font-medium">
              ℹ️ Bank entry will be created automatically by the system. If
              marked Billable, invoice outstanding amount will be updated.
            </p>
          )}
        </div>

        {withInvoice && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 space-y-3">
            <SectionHeader
              icon={FileText}
              title="Invoice-Linked Payout"
              color="blue"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Invoice *</FieldLabel>
                <SearchableSelect
                  value={osForm.invoiceId}
                  onChange={(v) => {
                    setOs("invoiceId", v);
                    fetchOsOutstanding(v);
                  }}
                  options={invoices.map((i) => ({
                    value: i.id,
                    label: `${i.invoice_number}${
                      i.clients_master
                        ? " – " + i.clients_master.client_name
                        : ""
                    }`,
                  }))}
                  placeholder="Type invoice number..."
                  error={errors.invoiceId}
                />
              </div>
              <div>
                <FieldLabel>Pay Head</FieldLabel>
                <Select
                  value={osForm.payHeadOs}
                  onChange={(v) => setOs("payHeadOs", v)}
                  options={osPayHeadOptions.map((p) => ({
                    value: p,
                    label: p,
                  }))}
                  placeholder="Select pay head"
                />
              </div>
            </div>
            <div>
              <FieldLabel>Payment Details</FieldLabel>
              <input
                type="text"
                defaultValue={osForm.paymentDetailsOs}
                onBlur={(e) => setOs("paymentDetailsOs", e.target.value)}
                placeholder="Description of payout..."
                className="w-full border border-gray-200 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* ── OS Outstanding Banner ── */}
            {osOutstandingLoading && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-xs text-blue-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Fetching OS outstanding…
              </div>
            )}
            {osOutstanding && !osOutstandingLoading && (
              <div
                className={`rounded-xl border px-4 py-3 text-xs space-y-1.5 ${
                  osOutstanding.remaining <= 0
                    ? "bg-red-50 border-red-200"
                    : "bg-emerald-50 border-emerald-200"
                }`}
              >
                <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                  OS Amt Difference
                </p>
                <div className="flex justify-between">
                  <span className="text-gray-500">Net in Hand</span>
                  <span className="font-semibold text-gray-800">
                    ₹{osOutstanding.netInHand.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Already Paid (net of BB+TDS)</span>
                  <span className="font-semibold">
                    −₹{osOutstanding.alreadyPaid.toLocaleString("en-IN")}
                  </span>
                </div>
                <div
                  className={`flex justify-between border-t pt-1.5 font-bold text-sm ${
                    osOutstanding.remaining <= 0
                      ? "border-red-200 text-red-600"
                      : "border-emerald-200 text-emerald-700"
                  }`}
                >
                  <span>Remaining (Max you can enter)</span>
                  <span>
                    ₹{osOutstanding.remaining.toLocaleString("en-IN")}
                  </span>
                </div>
                {osOutstanding.remaining <= 0 && (
                  <p className="text-red-600 font-semibold text-[11px] pt-0.5">
                    ⛔ This invoice has no OS amount remaining. You cannot add
                    more payouts.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel>Amount Paid *</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 text-sm font-medium">
                    ₹
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={osForm.amountPaid}
                    onBlur={(e) =>
                      setOs(
                        "amountPaid",
                        e.target.value.replace(/[^0-9.]/g, "")
                      )
                    }
                    className={`w-full border rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-400 ${
                      errors.amountPaid
                        ? "border-red-400 bg-red-50"
                        : "border-gray-200 bg-white"
                    }`}
                    placeholder="0"
                  />
                </div>
                {errors.amountPaid && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.amountPaid}
                  </p>
                )}
              </div>
              <div>
                <FieldLabel>Income Tax Deducted</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 text-sm font-medium">
                    ₹
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={osForm.incomeTaxOs}
                    onBlur={(e) =>
                      setOs(
                        "incomeTaxOs",
                        e.target.value.replace(/[^0-9.]/g, "")
                      )
                    }
                    className="w-full border border-gray-200 bg-white text-gray-800 placeholder-gray-400 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>No. of Employees</FieldLabel>
                <input
                  type="text"
                  inputMode="numeric"
                  defaultValue={osForm.noOfEmployees}
                  onBlur={(e) =>
                    setOs(
                      "noOfEmployees",
                      e.target.value.replace(/[^0-9]/g, "")
                    )
                  }
                  placeholder="0"
                  className="w-full border border-gray-200 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Date Paid *</FieldLabel>
                <input
                  type="date"
                  defaultValue={osForm.datePaid}
                  onBlur={(e) => setOs("datePaid", e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 ${
                    errors.datePaid
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 bg-white"
                  }`}
                />
                {errors.datePaid && (
                  <p className="text-xs text-red-500 mt-1">{errors.datePaid}</p>
                )}
              </div>
              <div>
                <FieldLabel>Bank *</FieldLabel>
                <Select
                  value={osForm.bankIdOs}
                  onChange={(v) => setOs("bankIdOs", v)}
                  options={banks.map((b) => ({
                    value: b.id,
                    label: `${b.bank_name} — ${b.account_number}`,
                  }))}
                  placeholder="Select bank"
                  error={errors.bankIdOs}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <label className="text-sm font-semibold text-gray-700">
                Billable to Client?
              </label>
              <button
                type="button"
                onClick={() => setOs("isBillable", !osForm.isBillable)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  osForm.isBillable ? "bg-emerald-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    osForm.isBillable ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`text-xs font-semibold ${
                  osForm.isBillable ? "text-emerald-600" : "text-gray-500"
                }`}
              >
                {osForm.isBillable
                  ? "Billable ✓ — will update invoice outstanding"
                  : "Non-Billable"}
              </span>
            </div>
          </div>
        )}

        {!withInvoice && (
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 space-y-3">
            <SectionHeader
              icon={Building2}
              title="Manual OS Payout Entry"
              color="purple"
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel>Entity *</FieldLabel>
                <Select
                  value={osForm.osEntity}
                  onChange={(v) => setOs("osEntity", v)}
                  options={entities.map((e) => ({
                    value: e.entity_name,
                    label: e.entity_name,
                  }))}
                  placeholder="Select entity"
                  error={errors.osEntity}
                />
              </div>
              <div>
                <FieldLabel>Department *</FieldLabel>
                <Select
                  value={osForm.osDepartment}
                  onChange={(v) => setOs("osDepartment", v)}
                  options={departments.map((d) => ({
                    value: d.dept_name,
                    label: d.dept_name,
                  }))}
                  placeholder="Select dept"
                  error={errors.osDepartment}
                />
              </div>
              <div>
                <FieldLabel>Client *</FieldLabel>
                <SearchableSelect
                  value={osForm.osClient}
                  onChange={(v) => {
                    setOs("osClient", v);
                    const cl = clients.find((c) => c.client_name === v);
                    if (cl?.ledger_name)
                      setTimeout(() => setOs("ledgerName", cl.ledger_name), 0);
                  }}
                  options={clients.map((c) => ({
                    value: c.client_name,
                    label: c.client_name,
                  }))}
                  placeholder="Type client name..."
                  error={errors.osClient}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Ledger Name</FieldLabel>
                <input
                  type="text"
                  defaultValue={osForm.ledgerName}
                  onBlur={(e) => setOs("ledgerName", e.target.value)}
                  placeholder="Auto-filled from client"
                  className="w-full border border-gray-200 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <FieldLabel>Pay Head</FieldLabel>
                <Select
                  value={osForm.osPayHead}
                  onChange={(v) => setOs("osPayHead", v)}
                  options={osPayHeadOptions.map((p) => ({
                    value: p,
                    label: p,
                  }))}
                  placeholder="Select pay head"
                />
              </div>
            </div>
            <div>
              <FieldLabel>Payment Details *</FieldLabel>
              <input
                type="text"
                defaultValue={osForm.paymentDetails}
                onBlur={(e) => setOs("paymentDetails", e.target.value)}
                placeholder="Describe this OS payout..."
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800 placeholder-gray-400 ${
                  errors.paymentDetails
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200 bg-white"
                }`}
              />
              {errors.paymentDetails && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.paymentDetails}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Payout Month *</FieldLabel>
                <input
                  type="month"
                  defaultValue={osForm.payoutMonth}
                  onBlur={(e) => setOs("payoutMonth", e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800 ${
                    errors.payoutMonth
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 bg-white"
                  }`}
                />
                {errors.payoutMonth && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.payoutMonth}
                  </p>
                )}
              </div>
              <div>
                <FieldLabel>No. of Employees</FieldLabel>
                <input
                  type="text"
                  inputMode="numeric"
                  defaultValue={osForm.osNoOfEmployees}
                  onBlur={(e) =>
                    setOs(
                      "osNoOfEmployees",
                      e.target.value.replace(/[^0-9]/g, "")
                    )
                  }
                  placeholder="0"
                  className="w-full border border-gray-200 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel>Amount Paid *</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 text-sm font-medium">
                    ₹
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={osForm.osAmountPaid}
                    onBlur={(e) =>
                      setOs(
                        "osAmountPaid",
                        e.target.value.replace(/[^0-9.]/g, "")
                      )
                    }
                    className={`w-full border rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800 placeholder-gray-400 ${
                      errors.osAmountPaid
                        ? "border-red-400 bg-red-50"
                        : "border-gray-200 bg-white"
                    }`}
                    placeholder="0"
                  />
                </div>
                {errors.osAmountPaid && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.osAmountPaid}
                  </p>
                )}
              </div>
              <div>
                <FieldLabel>Income Tax Deducted</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 text-sm font-medium">
                    ₹
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={osForm.osIncomeTax}
                    onBlur={(e) =>
                      setOs(
                        "osIncomeTax",
                        e.target.value.replace(/[^0-9.]/g, "")
                      )
                    }
                    className="w-full border border-gray-200 bg-white text-gray-800 placeholder-gray-400 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Date Paid *</FieldLabel>
                <input
                  type="date"
                  defaultValue={osForm.osDatePaid}
                  onBlur={(e) => setOs("osDatePaid", e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800 ${
                    errors.osDatePaid
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 bg-white"
                  }`}
                />
                {errors.osDatePaid && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.osDatePaid}
                  </p>
                )}
              </div>
            </div>
            <div>
              <FieldLabel>Bank *</FieldLabel>
              <Select
                value={osForm.osBankId}
                onChange={(v) => setOs("osBankId", v)}
                options={banks.map((b) => ({
                  value: b.id,
                  label: `${b.bank_name} — ${b.account_number}`,
                }))}
                placeholder="Select bank"
                error={errors.osBankId}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">
                Billable to Client?
              </label>
              <button
                type="button"
                onClick={() => setOs("osIsBillable", !osForm.osIsBillable)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  osForm.osIsBillable ? "bg-emerald-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    osForm.osIsBillable ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`text-xs font-semibold ${
                  osForm.osIsBillable ? "text-emerald-600" : "text-gray-500"
                }`}
              >
                {osForm.osIsBillable ? "Billable ✓" : "Non-Billable"}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
          <button
            onClick={() => setSelectedOption(null)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
          >
            ← Back
          </button>
          <button
            onClick={saveOS}
            disabled={loading || saved}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 min-w-[160px] justify-center transition ${
              saved
                ? "bg-emerald-500 text-white"
                : "bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-60"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> Saved!
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Save OS Payout
              </>
            )}
          </button>
        </div>
      </div>
    );
  })();

  // ─── MODAL WRAPPER ─────────────────────────────────────────────────────────
  const hc = {
    null: {
      title: "Add Expense / Payout",
      gradient: "from-indigo-600 to-purple-700",
    },
    internal: {
      title: "Internal Employee Expense",
      gradient: "from-blue-600 to-indigo-700",
    },
    os: {
      title: "3rd Party / OS Payout",
      gradient: "from-purple-600 to-pink-700",
    },
  }[selectedOption] || {
    title: "Add Expense / Payout",
    gradient: "from-indigo-600 to-purple-700",
  };

  return ReactDOM.createPortal(
    <>
      {bulkMismatch && (
        <MismatchConfirmModal
          matched={bulkMismatch.matched}
          mismatches={bulkMismatch.mismatches}
          onProceed={handleProceedWithMatched}
          onCancel={() => {
            setBulkMismatch(null);
            setBulkLoading(false);
          }}
        />
      )}
      {bulkResult && (
        <BulkResultModal
          result={bulkResult}
          onClose={() => {
            setBulkResult(null);
            if (bulkResult.added > 0) {
              onSaved?.();
              onClose();
            }
          }}
        />
      )}

      <div className="fixed inset-0 z-[99999]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col pointer-events-auto overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex items-center justify-between px-6 py-4 bg-gradient-to-r ${hc.gradient} text-white flex-shrink-0`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  {selectedOption === "internal" ? (
                    <Users className="w-5 h-5" />
                  ) : selectedOption === "os" ? (
                    <FileText className="w-5 h-5" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">
                    {hc.title}
                  </h3>
                  <p className="text-white/80 text-xs">
                    {selectedOption === "internal"
                      ? "Salary, Reimbursement, Bonus, Loan"
                      : selectedOption === "os"
                      ? "Vendor, Consultant, Contract Staff"
                      : "Select the type of expense to continue"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowViewPage(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all text-xs font-semibold"
                >
                  <Users className="w-3.5 h-3.5" />
                  Internal Records
                </button>
                <button
                  onClick={() => setShowOsRecords(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all text-xs font-semibold"
                >
                  <FileText className="w-3.5 h-3.5" />
                  OS Records
                </button>
                <button
                  onClick={onClose}
                  className="text-white/70 hover:text-white transition p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {!selectedOption && (
                  <motion.div
                    key="options"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <OptionSelection />
                  </motion.div>
                )}
                {selectedOption === "internal" && (
                  <motion.div
                    key="internal"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {internalFormJSX}
                  </motion.div>
                )}
                {selectedOption === "os" && (
                  <motion.div
                    key="os"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {osFormJSX}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default AddExpenseDetailsManModal;
