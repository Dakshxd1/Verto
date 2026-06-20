import React, { useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { usePerms } from "../context/PermissionsContext";
import {
  Search,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  FileText,
  AlertTriangle,
  TrendingDown,
  Filter,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Calendar,
  Building2,
  BadgeIndianRupee,
  Hash,
  MoreHorizontal,
  Download,
  Lock,
} from "lucide-react";

// ─── Stat Card ──────────────────────────────────────────────
const StatCard = ({ label, value, sub, color, icon: Icon }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-2xl border p-5 flex flex-col gap-2 ${color}`}
  >
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
        {label}
      </p>
      <Icon className="w-4 h-4 opacity-50" />
    </div>
    <p className="text-2xl font-black tracking-tight">{value}</p>
    {sub && <p className="text-xs opacity-60">{sub}</p>}
  </motion.div>
);

// ─── Badge ──────────────────────────────────────────────────
const TypeBadge = ({ type }) =>
  type === "Bad Debt" ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
      <AlertTriangle className="w-3 h-3" />
      Bad Debt
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-100 text-violet-700 border border-violet-200">
      <FileText className="w-3 h-3" />
      CN
    </span>
  );

// ─── Toast ──────────────────────────────────────────────────
const Toast = ({ toast }) => (
  <AnimatePresence>
    {toast && (
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40 }}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-white text-sm font-semibold shadow-2xl ${
          toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
        }`}
      >
        {toast.type === "success" ? (
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 shrink-0" />
        )}
        {toast.msg}
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Confirm Delete Dialog ───────────────────────────────────
const ConfirmDialog = ({ record, onConfirm, onCancel }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
      onClick={(e) => e.stopPropagation()}
      className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Delete Record?</h3>
          <p className="text-xs text-gray-500">This action cannot be undone</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-3.5 mb-5 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Reference</span>
          <span className="font-mono font-semibold text-gray-800">
            {record.reference_no || record.id?.slice(0, 8)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Invoice</span>
          <span className="font-semibold text-gray-800">{record.invoice_number || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Amount</span>
          <span className="font-bold text-red-600">
            ₹ {Number(record.amount || 0).toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Type</span>
          <TypeBadge type={record.type} />
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-5">
        Deleting this will remove linked software entries and recalculate
        invoice outstanding, CN totals, and status.
      </p>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-bold text-sm shadow-lg shadow-red-200"
        >
          Yes, Delete
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// ─── Export to CSV ───────────────────────────────────────────
const exportCSV = (records) => {
  const headers = [
    "Reference No",
    "Type",
    "Invoice Number",
    "Entity",
    "Amount",
    "Issue Date",
    "Remarks",
  ];
  const rows = records.map((r) => [
    r.reference_no || "",
    r.type || "",
    r.invoice_number || "",
    r.entity || "",
    r.amount || 0,
    r.issue_date || "",
    (r.remarks || "").replace(/,/g, " "),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `cn_bad_debt_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const isLocked = (issueDate) => {
  if (!issueDate) return false;
  const date = new Date(issueDate);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 45);
  cutoff.setHours(0, 0, 0, 0);
  return date < cutoff;
};

// ─── Main View Page ─────────────────────────────────────────
const CNBadDebtRecordsPage = () => {
  const [records, setRecords]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filterType, setFilterType]   = useState("All"); // All | CN | Bad Debt
  const [filterEntity, setFilterEntity] = useState("All");
  const [sortField, setSortField]     = useState("issue_date");
  const [sortDir, setSortDir]         = useState("desc");
  const [confirmRecord, setConfirmRecord] = useState(null);
  const [deletingId, setDeletingId]   = useState(null);
  const [toast, setToast]             = useState(null);
  const [expandedId, setExpandedId]   = useState(null);
  const { canDelete, isIntern, isAdmin } = usePerms();

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("credit_note_bad_debt")
      .select(`
        id,
        reference_no,
        invoice_number,
        type,
        amount,
        issue_date,
        entity,
        remarks,
        employee_count,
        invoice_id,
        created_at,
        invoices ( invoice_number, status )
      `)
      .order("issue_date", { ascending: false });

    if (error) showToast("Failed to load records: " + error.message, "error");
    setRecords(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // ── Delete ────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmRecord) return;
    const id = confirmRecord.id;
    setConfirmRecord(null);
    setDeletingId(id);
    try {
      const { error } = await supabase.rpc("delete_cn_bad_debt_complete", {
        p_cn_id: id,
      });
      if (error) throw error;
      window.refreshDashboard?.();
      showToast("Deleted & invoice recalculated");
      await fetchRecords();
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Sort ──────────────────────────────────────────────────
  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field)
      return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-violet-600" />
      : <ChevronDown className="w-3 h-3 text-violet-600" />;
  };

  // ── Derived data ──────────────────────────────────────────
  const entities = ["All", ...new Set(records.map((r) => r.entity).filter(Boolean))];

  const filtered = records
    .filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (r.reference_no || "").toLowerCase().includes(q) ||
        (r.invoice_number || "").toLowerCase().includes(q) ||
        (r.entity || "").toLowerCase().includes(q) ||
        (r.remarks || "").toLowerCase().includes(q);
      const matchType   = filterType === "All" || r.type === filterType;
      const matchEntity = filterEntity === "All" || r.entity === filterEntity;
      return matchSearch && matchType && matchEntity;
    })
    .sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (sortField === "amount") { av = Number(av); bv = Number(bv); }
      if (sortField === "issue_date") { av = new Date(av); bv = new Date(bv); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const totalCN      = records.filter((r) => r.type === "CN")
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalBD      = records.filter((r) => r.type === "Bad Debt")
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalAll     = totalCN + totalBD;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Intern banner */}
      {isIntern && (
        <div style={{background: '#f3e8ff', border: '1px solid #a855f7', borderRadius: '0.75rem', padding: '0.75rem 1rem', margin: '1rem'}}>
          <p style={{fontSize: '0.875rem', color: '#6b21a8', margin: 0}}>
            <strong>Training Mode</strong> — You can view but cannot delete records.
          </p>
        </div>
      )}
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-800 px-6 py-8 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-violet-300 text-xs font-semibold uppercase tracking-widest mb-1">
                <TrendingDown className="w-3.5 h-3.5" />
                Finance · Adjustments
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                CN / Bad Debt Records
              </h1>
              <p className="text-violet-200 text-sm mt-1">
                {records.length} records · Total ₹{" "}
                {totalAll.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportCSV(filtered)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={fetchRecords}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-semibold transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Summary Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Records"
            value={records.length}
            sub={`${filtered.length} shown`}
            color="bg-white border-gray-200 text-gray-800"
            icon={Hash}
          />
          <StatCard
            label="Total Amount"
            value={`₹ ${totalAll.toLocaleString("en-IN")}`}
            sub="CN + Bad Debt"
            color="bg-violet-600 border-violet-700 text-white"
            icon={BadgeIndianRupee}
          />
          <StatCard
            label="Credit Notes"
            value={`₹ ${totalCN.toLocaleString("en-IN")}`}
            sub={`${records.filter((r) => r.type === "CN").length} entries`}
            color="bg-white border-violet-200 text-violet-800"
            icon={FileText}
          />
          <StatCard
            label="Bad Debt"
            value={`₹ ${totalBD.toLocaleString("en-IN")}`}
            sub={`${records.filter((r) => r.type === "Bad Debt").length} entries`}
            color="bg-red-50 border-red-200 text-red-800"
            icon={AlertTriangle}
          />
        </div>

        {/* ── Filters Row ───────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ref, invoice, entity, remarks…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {["All", "CN", "Bad Debt"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterType === t
                    ? t === "Bad Debt"
                      ? "bg-red-600 text-white shadow"
                      : t === "CN"
                      ? "bg-violet-600 text-white shadow"
                      : "bg-white text-gray-800 shadow"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Entity filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="pl-8 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 appearance-none bg-white"
            >
              {entities.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          <span className="text-xs text-gray-400 ml-auto">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Table ─────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-violet-400" />
              <p className="text-sm font-medium">Loading records…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <RefreshCcw className="w-10 h-10 mb-3 opacity-20" />
              <p className="font-semibold text-gray-500">No records found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-[1.4fr_0.8fr_1fr_1.2fr_1fr_0.9fr_auto] gap-0 bg-gray-50 border-b border-gray-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <button
                  onClick={() => toggleSort("reference_no")}
                  className="flex items-center gap-1 hover:text-gray-800"
                >
                  Reference <SortIcon field="reference_no" />
                </button>
                <span>Type</span>
                <button
                  onClick={() => toggleSort("invoice_number")}
                  className="flex items-center gap-1 hover:text-gray-800"
                >
                  Invoice <SortIcon field="invoice_number" />
                </button>
                <button
                  onClick={() => toggleSort("entity")}
                  className="flex items-center gap-1 hover:text-gray-800"
                >
                  Entity <SortIcon field="entity" />
                </button>
                <button
                  onClick={() => toggleSort("amount")}
                  className="flex items-center gap-1 hover:text-gray-800"
                >
                  Amount <SortIcon field="amount" />
                </button>
                <button
                  onClick={() => toggleSort("issue_date")}
                  className="flex items-center gap-1 hover:text-gray-800"
                >
                  Date <SortIcon field="issue_date" />
                </button>
                <span>Action</span>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-gray-100">
                {filtered.map((row, idx) => (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className={`transition-colors ${
                      deletingId === row.id
                        ? "opacity-40 pointer-events-none"
                        : "hover:bg-violet-50/40"
                    }`}
                  >
                    {/* Desktop Row */}
                    <div className="hidden md:grid grid-cols-[1.4fr_0.8fr_1fr_1.2fr_1fr_0.9fr_auto] gap-0 px-4 py-3.5 items-center">
                      {/* Reference */}
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg font-bold">
                          {row.reference_no || row.id?.slice(0, 8) || "—"}
                        </span>
                      </div>

                      {/* Type */}
                      <div>
                        <TypeBadge type={row.type} />
                      </div>

                      {/* Invoice */}
                      <div className="text-sm font-semibold text-gray-800">
                        {row.invoice_number || "—"}
                      </div>

                      {/* Entity */}
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{row.entity || "—"}</span>
                      </div>

                      {/* Amount */}
                      <div className="font-bold text-sm text-gray-900">
                        ₹ {Number(row.amount || 0).toLocaleString("en-IN")}
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {row.issue_date
                          ? new Date(row.issue_date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </div>

                      {/* Action */}
                      <div className="flex items-center gap-1 pl-2">
                        <button
                          onClick={() =>
                            setExpandedId(expandedId === row.id ? null : row.id)
                          }
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="More details"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {deletingId === row.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                        ) : canDelete ? (
                          (() => {
                            const rowLocked = isLocked(row.issue_date);
                            const lockedByDate = rowLocked && !isAdmin;
                            return (
                              <button
                                onClick={() => { if (!lockedByDate) setConfirmRecord(row); }}
                                disabled={lockedByDate}
                                title={
                                  lockedByDate
                                    ? "Locked — entries older than 45 days can only be edited by an Admin."
                                    : "Delete"
                                }
                                className={`p-1.5 rounded-lg transition-colors ${
                                  lockedByDate
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "text-red-400 hover:text-red-600 hover:bg-red-50"
                                }`}
                              >
                                {lockedByDate ? (
                                  <Lock className="w-4 h-4" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            );
                          })()
                        ) : null}
                      </div>
                    </div>

                    {/* Expanded detail row */}
                    <AnimatePresence>
                      {expandedId === row.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 bg-violet-50/60 border-t border-violet-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                                Invoice Status
                              </p>
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                  row.invoices?.status === "paid"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : row.invoices?.status === "partial"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {row.invoices?.status || "—"}
                              </span>
                            </div>
                            {row.employee_count && (
                              <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                                  Employees
                                </p>
                                <p className="font-semibold">{row.employee_count}</p>
                              </div>
                            )}
                            <div className="col-span-2">
                              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                                Remarks
                              </p>
                              <p className="text-gray-700 italic text-xs">
                                {row.remarks || "No remarks"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                                Created At
                              </p>
                              <p className="text-xs text-gray-600">
                                {row.created_at
                                  ? new Date(row.created_at).toLocaleString("en-IN")
                                  : "—"}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Mobile Row */}
                    <div className="md:hidden px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold">
                              {row.reference_no || row.id?.slice(0, 8) || "—"}
                            </span>
                            <TypeBadge type={row.type} />
                            <span className="font-bold text-gray-900 text-sm">
                              ₹ {Number(row.amount || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 font-semibold">
                            {row.invoice_number || "—"}
                          </p>
                          <div className="flex gap-3 mt-1 text-[11px] text-gray-400">
                            <span>{row.entity || "—"}</span>
                            <span>
                              {row.issue_date
                                ? new Date(row.issue_date).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </span>
                          </div>
                        </div>
                        <div>
                          {deletingId === row.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                          ) : canDelete ? (
                            (() => {
                              const rowLocked = isLocked(row.issue_date);
                              const lockedByDate = rowLocked && !isAdmin;
                              return (
                                <button
                                  onClick={() => { if (!lockedByDate) setConfirmRecord(row); }}
                                  disabled={lockedByDate}
                                  title={
                                    lockedByDate
                                      ? "Locked — entries older than 45 days can only be edited by an Admin."
                                      : "Delete"
                                  }
                                  className={`p-2 rounded-xl transition-colors ${
                                    lockedByDate
                                      ? "text-gray-300 cursor-not-allowed"
                                      : "text-red-400 hover:text-red-600 hover:bg-red-50"
                                  }`}
                                >
                                  {lockedByDate ? (
                                    <Lock className="w-4 h-4" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              );
                            })()
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer total */}
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">
                  Showing {filtered.length} of {records.length} records
                </span>
                <span className="text-sm font-black text-gray-800">
                  Filtered Total:{" "}
                  <span className="text-violet-700">
                    ₹{" "}
                    {filtered
                      .reduce((s, r) => s + Number(r.amount || 0), 0)
                      .toLocaleString("en-IN")}
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Confirm Dialog ────────────────────────────────── */}
      <AnimatePresence>
        {confirmRecord && (
          <ConfirmDialog
            record={confirmRecord}
            onConfirm={handleDelete}
            onCancel={() => setConfirmRecord(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ─────────────────────────────────────────── */}
      <Toast toast={toast} />
    </div>
  );
};

export default CNBadDebtRecordsPage;