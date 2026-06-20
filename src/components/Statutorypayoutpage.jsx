import React, { useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCcw,
  Plus,
  Trash2,
  Pencil,
  Save,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Calendar,
  Building2,
  Hash,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  TrendingDown,
  AlertTriangle,
  Lock,
} from "lucide-react";
import AddStatutoryPayoutModal from "./AddStatutoryPayoutModal";
import { usePerms } from "../context/PermissionsContext";

// ─── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onDismiss }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-white text-sm font-medium ${
      type === "success" ? "bg-emerald-600" : "bg-rose-600"
    }`}
  >
    {type === "success" ? (
      <CheckCircle2 className="w-4 h-4 shrink-0" />
    ) : (
      <AlertCircle className="w-4 h-4 shrink-0" />
    )}
    {message}
    <button onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100">
      <X className="w-3.5 h-3.5" />
    </button>
  </motion.div>
);

// ─── Confirm Dialog ────────────────────────────────────────────────────────────
const ConfirmDialog = ({ onConfirm, onCancel, row }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
      onClick={(e) => e.stopPropagation()}
      className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
    >
      <div className="flex items-center justify-center w-12 h-12 bg-rose-100 rounded-full mx-auto mb-4">
        <Trash2 className="w-6 h-6 text-rose-600" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 text-center">
        Delete Statutory Payout?
      </h3>
      <p className="text-sm text-gray-500 text-center mt-2">
        Removes linked bank & software entries and resyncs ERP.
        <br />
        <span className="font-semibold text-gray-700">
          {row?.type} · {row?.entity} · ₹{" "}
          {Number(row?.total_paid || 0).toLocaleString("en-IN")}
        </span>
      </p>
      <div className="flex gap-3 mt-6">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Yes, Delete
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color, icon: Icon }) => (
  <div className={`rounded-xl p-4 border-2 ${color} bg-white`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {label}
        </p>
        <p className="text-2xl font-black text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className="p-2 rounded-lg bg-gray-50">
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  </div>
);

// ─── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    paid: "bg-emerald-100 text-emerald-700",
    partial: "bg-amber-100 text-amber-700",
    pending: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
        map[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status?.toUpperCase() || "—"}
    </span>
  );
};

const isLocked = (issueDate) => {
  if (!issueDate) return false;
  const date = new Date(issueDate);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 45);
  cutoff.setHours(0, 0, 0, 0);
  return date < cutoff;
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const StatutoryPayoutPage = () => {
  const { isAdmin } = usePerms();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [toast, setToast] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [banks, setBanks] = useState([]);
  const [entities, setEntities] = useState([]);

  // ── Edit state ──────────────────────────────────────────────────────────────
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("statutory_payout_view")
        .select("*")
        .order(sortField, { ascending: sortDir === "asc" });
      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      showToast("Failed to load: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [sortField, sortDir]);

  const fetchMeta = async () => {
    const [{ data: bankData }, { data: entData }] = await Promise.all([
      supabase.from("bank_master").select("id, bank_name"),
      supabase.from("statutory_payments").select("entity"),
    ]);
    setBanks(bankData || []);
    const unique = [
      ...new Set((entData || []).map((r) => r.entity).filter(Boolean)),
    ];
    setEntities(unique);
  };

  useEffect(() => {
    fetchRecords();
    fetchMeta();
  }, [fetchRecords]);

  // ── Real-time ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("statutory-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "statutory_payments" },
        async () => {
          await fetchRecords();
          window.refreshDashboard?.();
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchRecords]);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmRow) return;
    const id = confirmRow.id;
    setConfirmRow(null);
    setDeletingId(id);
    try {
      const { error } = await supabase.rpc(
        "delete_statutory_payment_complete",
        { p_id: id }
      );
      if (error) throw error;
      window.refreshDashboard?.();
      await fetchRecords();
      showToast("Statutory payout deleted & ERP synced");
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Edit save ───────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editRow) return;
    setSavingEdit(true);
    try {
      const due = parseFloat(editForm.total_due) || 0;
      const paid = parseFloat(editForm.total_paid) || 0;
      const pending = Math.max(due - paid, 0);
      const { error } = await supabase
        .from("statutory_payments")
        .update({
          total_due: due,
          total_paid: paid,
          pending_due: pending,
          payment_status:
            pending <= 0 ? "paid" : paid > 0 ? "partial" : "pending",
          bank_id: editForm.bank_id || editRow.bank_id,
          remarks: editForm.remarks || "",
          penalty: editForm.penalty || false,
          penalty_amount: parseFloat(editForm.penalty_amount) || 0,
        })
        .eq("id", editRow.id);
      if (error) throw error;
      window.refreshDashboard?.();
      await fetchRecords();
      showToast("Updated & ERP synced ✅");
      setEditRow(null);
      setEditForm({});
    } catch (err) {
      showToast("Update failed: " + err.message, "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Sort ────────────────────────────────────────────────────────────────────
  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field)
      return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-cyan-600" />
    ) : (
      <ChevronDown className="w-3 h-3 text-cyan-600" />
    );
  };

  // ── Filter + Search ─────────────────────────────────────────────────────────
  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      [r.type, r.entity, r.bank_name, r.remarks].some((v) =>
        v?.toLowerCase().includes(q)
      );
    const matchType = filterType === "All" || r.type === filterType;
    const matchStatus =
      filterStatus === "All" || r.calculated_status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  // ── Stats ───────────────────────────────────────────────────────────────────
  // ── Stats ───────────────────────────────────────────────────────────────────
  // De-duplicate by type+month — avoids double-counting if duplicates exist
  const uniqueMonthMap = {};
  records.forEach((r) => {
    const key = `${r.type}__${r.month}`;
    if (!uniqueMonthMap[key]) uniqueMonthMap[key] = r;
  });
  const uniqueRecords = Object.values(uniqueMonthMap);

  const totalPaid = uniqueRecords.reduce(
    (s, r) => s + Number(r.month_total_paid || 0),
    0
  );
  const totalPending = uniqueRecords.reduce(
    (s, r) => s + Number(r.month_pending_due || 0),
    0
  );
  const totalPenalty = records.reduce(
    (s, r) => s + Number(r.penalty_amount || 0),
    0
  );
  const overdue = records.filter((r) => r.delay_days > 0).length;

  const typeOptions = [
    "All",
    "GST",
    "TDS",
    "EPF",
    "ESI",
    "LWF",
    "PF",
    "Income Tax",
    "Others",
  ];
  const statusOptions = ["All", "paid", "partial", "pending"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-8 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight">
                STATUTORY PAYOUT
              </h1>
              <p className="text-cyan-200 text-sm mt-1">
                GST · TDS · EPF · ESI · LWF · PF · Income Tax
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchRecords}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium border border-white/20 transition-colors"
              >
                <RefreshCcw className="w-4 h-4" /> Refresh
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2 bg-white text-cyan-700 rounded-lg text-sm font-bold shadow-lg hover:bg-cyan-50 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Statutory Payout
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <StatCard
              label="Total Records"
              value={records.length}
              sub="all time"
              color="border-cyan-200"
              icon={Hash}
            />
            <StatCard
              label="Total Paid"
              value={`₹ ${totalPaid.toLocaleString("en-IN")}`}
              sub="outflow"
              color="border-emerald-200"
              icon={FileCheck}
            />
            <StatCard
              label="Pending Due"
              value={`₹ ${totalPending.toLocaleString("en-IN")}`}
              sub="outstanding"
              color="border-rose-200"
              icon={TrendingDown}
            />
            <StatCard
              label="Overdue"
              value={overdue}
              sub={`₹ ${totalPenalty.toLocaleString("en-IN")} penalty`}
              color="border-amber-200"
              icon={AlertTriangle}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search type, entity, bank..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-cyan-400 text-gray-700"
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {t === "All" ? "All Types" : t}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-cyan-400 text-gray-700"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === "All"
                  ? "All Status"
                  : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          <p className="text-sm text-gray-500 ml-auto">
            {filtered.length} of {records.length} records
          </p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading
              records...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <FileCheck className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">
                No statutory payout records found
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-4 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 transition-colors"
              >
                + Add First Record
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {[
                      { label: "#", field: null },
                      { label: "Type", field: "type" },
                      { label: "Entity", field: "entity" },
                      { label: "Month", field: "month" },
                      { label: "Bank", field: null },
                      { label: "Due", field: "total_due" },
                      { label: "Paid", field: "total_paid" },
                      { label: "Pending", field: "pending_due" },
                      { label: "Status", field: "calculated_status" },
                      { label: "Delay", field: "delay_days" },
                      { label: "Penalty", field: null },
                      { label: "Delete", field: null },
                      { label: "Edit", field: null },
                    ].map(({ label, field }) => (
                      <th
                        key={label}
                        onClick={() => field && handleSort(field)}
                        className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap ${
                          field
                            ? "cursor-pointer hover:text-gray-800 select-none"
                            : ""
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          {label}
                          {field && <SortIcon field={field} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <AnimatePresence>
                    {filtered.map((row, idx) => (
                      <React.Fragment key={row.id}>
                        <motion.tr
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: idx * 0.015 }}
                          className={`hover:bg-cyan-50/40 transition-colors ${
                            deletingId === row.id
                              ? "opacity-40 pointer-events-none"
                              : ""
                          } ${editRow?.id === row.id ? "bg-cyan-50/60" : ""}`}
                        >
                          <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-cyan-700 text-xs bg-cyan-50 px-2 py-1 rounded">
                              {row.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700 text-xs font-medium">
                            {row.entity || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                            {row.month
                              ? new Date(row.month).toLocaleDateString(
                                  "en-IN",
                                  { month: "short", year: "numeric" }
                                )
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                            {row.bank_name || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-gray-700 whitespace-nowrap">
                            ₹{" "}
                            {Number(row.total_due || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-emerald-600 text-xs whitespace-nowrap">
                              ₹{" "}
                              {Number(row.total_paid || 0).toLocaleString(
                                "en-IN"
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-bold text-xs whitespace-nowrap ${
                                Number(row.pending_due) > 0
                                  ? "text-rose-600"
                                  : "text-gray-400"
                              }`}
                            >
                              ₹{" "}
                              {Number(row.pending_due || 0).toLocaleString(
                                "en-IN"
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={row.calculated_status} />
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {row.delay_days > 0 ? (
                              <span className="text-rose-600 font-semibold">
                                {row.delay_days}d late
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {row.penalty ? (
                              <span className="text-amber-600 font-semibold">
                                ₹{" "}
                                {Number(row.penalty_amount || 0).toLocaleString(
                                  "en-IN"
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>

                          {/* Delete */}
                          <td className="px-4 py-3">
                            {deletingId === row.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                            ) : (
                              (() => {
                                const rowLocked = isLocked(row.month);
                                const lockedByDate = rowLocked && !isAdmin;
                                return (
                                  <button
                                    onClick={() => { if (!lockedByDate) setConfirmRow(row); }}
                                    disabled={lockedByDate}
                                    title={
                                      lockedByDate
                                        ? "Locked — entries older than 45 days can only be edited by an Admin."
                                        : "Delete"
                                    }
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                      lockedByDate
                                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                        : "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200"
                                    }`}
                                  >
                                    {lockedByDate ? (
                                      <Lock className="w-3.5 h-3.5" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                    {lockedByDate ? "Locked" : "Delete"}
                                  </button>
                                );
                              })()
                            )}
                          </td>

                          {/* Edit */}
                          <td className="px-4 py-3">
                            {editRow?.id === row.id ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={savingEdit}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-60"
                                >
                                  {savingEdit ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Save className="w-3 h-3" />
                                  )}{" "}
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditRow(null);
                                    setEditForm({});
                                  }}
                                  className="px-2 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs hover:bg-gray-50 transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              (() => {
                                const rowLocked = isLocked(row.month);
                                const lockedByDate = rowLocked && !isAdmin;
                                return (
                                  <button
                                    onClick={() => {
                                      if (!lockedByDate) {
                                        setEditRow(row);
                                        setEditForm({
                                          total_due: row.total_due,
                                          total_paid: row.total_paid,
                                          bank_id: row.bank_id,
                                          remarks: row.remarks || "",
                                          penalty: row.penalty,
                                          penalty_amount: row.penalty_amount || 0,
                                        });
                                      }
                                    }}
                                    disabled={lockedByDate}
                                    title={
                                      lockedByDate
                                        ? "Locked — entries older than 45 days can only be edited by an Admin."
                                        : "Edit"
                                    }
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                      lockedByDate
                                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                        : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200"
                                    }`}
                                  >
                                    {lockedByDate ? (
                                      <Lock className="w-3.5 h-3.5" />
                                    ) : (
                                      <Pencil className="w-3.5 h-3.5" />
                                    )}
                                    {lockedByDate ? "Locked" : "Edit"}
                                  </button>
                                );
                              })()
                            )}
                          </td>
                        </motion.tr>

                        {/* Inline edit form row */}
                        {editRow?.id === row.id && (
                          <tr className="bg-cyan-50/80 border-b-2 border-cyan-300">
                            <td colSpan={2} />
                            <td colSpan={2} className="px-4 py-3">
                              <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                                Total Due (₹)
                              </label>
                              <input
                                type="number"
                                value={editForm.total_due}
                                onChange={(e) => {
                                  const d = parseFloat(e.target.value) || 0;
                                  const p = Math.min(
                                    parseFloat(editForm.total_paid) || 0,
                                    d
                                  );
                                  setEditForm((f) => ({
                                    ...f,
                                    total_due: d,
                                    total_paid: p,
                                    pending_due: Math.max(d - p, 0),
                                  }));
                                }}
                                className="w-full border-2 border-cyan-200 bg-white rounded-lg px-2 py-1.5 text-xs font-bold text-cyan-800 outline-none focus:border-cyan-400"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                                Total Paid (₹)
                              </label>
                              <input
                                type="number"
                                value={editForm.total_paid}
                                max={editForm.total_due}
                                onChange={(e) => {
                                  const p = Math.min(
                                    parseFloat(e.target.value) || 0,
                                    parseFloat(editForm.total_due) || 0
                                  );
                                  setEditForm((f) => ({
                                    ...f,
                                    total_paid: p,
                                    pending_due: Math.max(
                                      (parseFloat(f.total_due) || 0) - p,
                                      0
                                    ),
                                  }));
                                }}
                                className="w-full border-2 border-cyan-200 bg-white rounded-lg px-2 py-1.5 text-xs font-bold text-cyan-800 outline-none focus:border-cyan-400"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                                Pending (auto)
                              </label>
                              <div className="border-2 border-gray-100 bg-gray-50 rounded-lg px-2 py-1.5 text-xs font-bold text-rose-600">
                                ₹{" "}
                                {Number(
                                  editForm.pending_due || 0
                                ).toLocaleString("en-IN")}
                              </div>
                            </td>
                            <td colSpan={2} className="px-4 py-3">
                              <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                                Bank
                              </label>
                              <select
                                value={editForm.bank_id || ""}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    bank_id: e.target.value,
                                  }))
                                }
                                className="w-full border-2 border-cyan-200 bg-white rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none"
                              >
                                <option value="">Select bank</option>
                                {banks.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.bank_name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td colSpan={2} className="px-4 py-3">
                              <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                                Penalty Amount (₹)
                              </label>
                              <input
                                type="number"
                                value={editForm.penalty_amount || 0}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    penalty_amount: e.target.value,
                                    penalty: parseFloat(e.target.value) > 0,
                                  }))
                                }
                                className="w-full border-2 border-cyan-200 bg-white rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none"
                              />
                            </td>
                            <td colSpan={2} className="px-4 py-3">
                              <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                                Remarks
                              </label>
                              <input
                                type="text"
                                value={editForm.remarks || ""}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    remarks: e.target.value,
                                  }))
                                }
                                placeholder="Optional remark..."
                                className="w-full border-2 border-cyan-200 bg-white rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none"
                              />
                            </td>
                            <td colSpan={2} />
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </AnimatePresence>
                </tbody>
                <tfoot>
                  <tr className="bg-cyan-50 border-t-2 border-cyan-200">
                    <td
                      colSpan={5}
                      className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-cyan-800"
                    >
                      Total ({filtered.length} records)
                    </td>
                    <td className="px-4 py-3 font-black text-gray-700 text-xs whitespace-nowrap">
                      ₹{" "}
                      {filtered
                        .reduce((s, r) => s + Number(r.total_due || 0), 0)
                        .toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 font-black text-emerald-700 text-xs whitespace-nowrap">
                      ₹{" "}
                      {filtered
                        .reduce((s, r) => s + Number(r.total_paid || 0), 0)
                        .toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 font-black text-rose-700 text-xs whitespace-nowrap">
                      ₹{" "}
                      {filtered
                        .reduce((s, r) => s + Number(r.pending_due || 0), 0)
                        .toLocaleString("en-IN")}
                    </td>
                    <td colSpan={5} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AnimatePresence>
        {confirmRow && (
          <ConfirmDialog
            onConfirm={handleDelete}
            onCancel={() => setConfirmRow(null)}
            row={confirmRow}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      <AddStatutoryPayoutModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchRecords();
        }}
        banks={banks}
        entities={entities}
      />
    </div>
  );
};

export default StatutoryPayoutPage;