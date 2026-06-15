import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { usePerms } from "../context/PermissionsContext";
import * as XLSX from "xlsx";
import { logExport, EXPORT_ACTIONS } from "../utils/Auditlog.js";
import {
  X,
  Loader2,
  Database,
  Search,
  Download,
  RefreshCw,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  TrendingDown,
  Users,
  Layers,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";
import supabase from "../lib/supabaseClient";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmt = (v) =>
  `₹ ${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const BoolPill = ({ value, yesLabel = "YES", noLabel = "NO" }) =>
  value ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
      <CheckCircle size={10} /> {yesLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
      <XCircle size={10} /> {noLabel}
    </span>
  );

/* ─── Excel Export ─────────────────────────────────────────────────────────── */
const exportToExcel = (rows) => {
  const wb = XLSX.utils.book_new();
  const totalDue = rows.reduce((s, r) => s + Number(r.due_amount || 0), 0);
  const totalTds = rows.reduce((s, r) => s + Number(r.tds_amount || 0), 0);
  const totalTransfer = rows.reduce(
    (s, r) => s + Number(r.transfer_amount || 0),
    0
  );

  const headers = [
    "#",
    "Client",
    "Entity",
    "Department",
    "Pay Head",
    "Due Amount (₹)",
    "TDS (₹)",
    "Transfer (₹)",
    "Payment Date",
    "Bank",
    "Billable",
    "Cash",
    "Created At",
  ];
  const detail = rows.map((r, i) => [
    i + 1,
    r.client_name || "—",
    r.entity || "—",
    r.department || "—",
    r.pay_head || "—",
    Number(r.due_amount || 0),
    Number(r.tds_amount || 0),
    Number(r.transfer_amount || 0),
    fmtDate(r.payment_date),
    r.bank_name || "—",
    r.is_billable ? "Yes" : "No",
    r.petty_cash ? "Yes" : "No",
    fmtDate(r.created_at),
  ]);
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    ...detail,
    [
      "",
      "TOTAL",
      "",
      "",
      "",
      totalDue,
      totalTds,
      totalTransfer,
      "",
      "",
      "",
      "",
      "",
    ],
  ]);
  ws["!cols"] = [4, 20, 14, 16, 18, 14, 12, 14, 14, 20, 10, 10, 14].map(
    (w) => ({ wch: w })
  );
  XLSX.utils.book_append_sheet(wb, ws, "Expenses");
  XLSX.writeFile(wb, `Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`);
  logExport({
    action:      EXPORT_ACTIONS.EXCEL,
    category:    "Expense",
    description: `Downloaded Expenses Excel (${rows.length} records)`,
    meta:        { rows: rows.length },
  });
};

/* ─── Confirm Delete Dialog ────────────────────────────────────────────────── */
const ConfirmDeleteDialog = ({ row, onConfirm, onCancel }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999999] flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9 }}
      onClick={(e) => e.stopPropagation()}
      className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
    >
      <div className="flex items-center justify-center w-12 h-12 bg-rose-100 rounded-full mx-auto mb-4">
        <Trash2 className="w-6 h-6 text-rose-600" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 text-center">
        Delete Expense?
      </h3>
      <p className="text-sm text-gray-500 text-center mt-2">
        This will delete the payment record, bank entry, software entry and
        reverse any billable invoice impact.
        <br />
        <span className="font-semibold text-gray-700 text-xs">
          {row?.pay_head} · {row?.department} · {fmt(row?.due_amount)}
        </span>
      </p>
      <div className="flex gap-3 mt-6">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
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

/* ─── Main Component ───────────────────────────────────────────────────────── */
const ExpenseViewModal = ({ open, onClose, onSaved }) => {
  const { canEdit, canDelete } = usePerms();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [filterBill, setFilterBill] = useState("All");
  const [filterCash, setFilterCash] = useState("All");
  const [exporting, setExporting] = useState(false);

  // ── Edit state ──────────────────────────────────────────────────────────────
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // ── Delete state ────────────────────────────────────────────────────────────
  const [confirmRow, setConfirmRow] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // ── Toast state ─────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);

  // ── Banks for edit dropdown ─────────────────────────────────────────────────
  const [banks, setBanks] = useState([]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setFilterBill("All");
    setFilterCash("All");
    setEditRow(null);
    setEditForm({});
    setConfirmRow(null);
    fetchExpenses();
    supabase
      .from("bank_master")
      .select("id, bank_name")
      .then(({ data }) => setBanks(data || []));
  }, [open]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_made_view")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      showToast("Load failed: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  /* ── Filtered rows ── */
  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      [r.client_name, r.entity, r.department, r.pay_head, r.bank_name].some(
        (v) => v?.toLowerCase().includes(q)
      );
    const matchBill =
      filterBill === "All" ||
      (filterBill === "Billable" && r.is_billable) ||
      (filterBill === "Non-Billable" && !r.is_billable);
    const matchCash =
      filterCash === "All" ||
      (filterCash === "Cash" && r.petty_cash) ||
      (filterCash === "Non-Cash" && !r.petty_cash);
    return matchSearch && matchBill && matchCash;
  });

  const totalDue = filtered.reduce((s, r) => s + Number(r.due_amount || 0), 0);
  const totalTransfer = filtered.reduce(
    (s, r) => s + Number(r.transfer_amount || 0),
    0
  );
  const totalTds = filtered.reduce((s, r) => s + Number(r.tds_amount || 0), 0);

  /* ── Delete handler ── */
  const handleDelete = async () => {
    if (!confirmRow) return;
    const id = confirmRow.id;
    setConfirmRow(null);
    setDeletingId(id);
    try {
      const { error } = await supabase.rpc("delete_payment_made_complete", {
        p_payment_id: id,
      });
      if (error) throw error;
      window.refreshDashboard?.();
      onSaved?.();
      await fetchExpenses();
      showToast("Expense deleted & ERP synced ✅");
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Edit save handler ── */
  const handleSaveEdit = async () => {
    if (!editRow) return;
    setSavingEdit(true);
    try {
      const dueAmt = parseFloat(editForm.due_amount) || 0;
      const tdsAmt = parseFloat(editForm.tds_amount) || 0;
      const transAmt = Math.max(dueAmt - tdsAmt, 0);

      const { error } = await supabase
        .from("payments_made")
        .update({
          due_amount: dueAmt,
          tds_amount: tdsAmt,
          amount: dueAmt,
          transfer_amount: transAmt,
          payment_date: editForm.payment_date,
          bank_id: editForm.bank_id || null,
          payment_description: editForm.payment_description || null,
          remarks: editForm.remarks || null,
          department: editForm.department || null,
        })
        .eq("id", editRow.id);
      if (error) throw error;

      window.refreshDashboard?.();
      onSaved?.();
      await fetchExpenses();
      showToast("Expense updated & bank synced ✅");
      setEditRow(null);
      setEditForm({});
    } catch (err) {
      showToast("Update failed: " + err.message, "error");
    } finally {
      setSavingEdit(false);
    }
  };

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

  return ReactDOM.createPortal(
    <AnimatePresence>
      {/* Confirm delete dialog — renders above modal */}
      {confirmRow && (
        <ConfirmDeleteDialog
          row={confirmRow}
          onConfirm={handleDelete}
          onCancel={() => setConfirmRow(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`fixed bottom-6 right-6 z-[9999999] flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle size={14} />
          ) : (
            <CheckCircle size={14} />
          )}
          {toast.msg}
        </motion.div>
      )}

      <motion.div
        className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-[98vw] h-[95vh] overflow-hidden flex flex-col"
        >
          {/* ── HEADER ── */}
          <div
            className="relative px-6 py-5 flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, #431407 0%, #9a3412 50%, #ea580c 100%)",
            }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                    <Database size={18} className="text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Expense Database View
                  </h2>
                </div>
                <p className="text-orange-300 text-xs ml-11">
                  {filtered.length} records · edit & delete inline
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setExporting(true);
                    try {
                      exportToExcel(filtered);
                    } finally {
                      setExporting(false);
                    }
                  }}
                  disabled={exporting || filtered.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all disabled:opacity-40"
                >
                  {exporting ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}{" "}
                  Export
                </button>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X size={16} className="text-white/80" />
                </button>
              </div>
            </div>
            {/* Stats */}
            <div className="relative mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Records", value: filtered.length, icon: Layers },
                { label: "Due", value: fmt(totalDue), icon: TrendingDown },
                { label: "TDS", value: fmt(totalTds), icon: Users },
                {
                  label: "Transfer",
                  value: fmt(totalTransfer),
                  icon: Building2,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="bg-white/10 border border-white/15 rounded-2xl px-3 py-2.5 flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={12} className="text-orange-300" />
                  </div>
                  <div>
                    <p className="text-[9px] text-orange-400 uppercase tracking-widest font-bold">
                      {label}
                    </p>
                    <p className="text-white text-xs font-bold leading-none mt-0.5">
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── FILTERS ── */}
          <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-slate-100 space-y-3 bg-white">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search client, entity, department, pay head, bank…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={12} className="text-slate-400" />
              {["All", "Billable", "Non-Billable"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterBill(t)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    filterBill === t
                      ? "bg-orange-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
              <div className="w-px h-4 bg-slate-200 mx-1" />
              {["All", "Cash", "Non-Cash"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterCash(t)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    filterCash === t
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* ── TABLE ── */}
          <div className="flex-1 overflow-auto bg-slate-50">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-orange-200 border-t-orange-600 animate-spin" />
                <p className="text-sm text-slate-400">Fetching expenses…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <AlertCircle size={24} className="text-orange-300" />
                <p className="text-sm text-slate-500 font-medium">
                  No expense records found
                </p>
              </div>
            ) : (
              <table className="min-w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {[
                      "#",
                      "Client",
                      "Entity",
                      "Dept",
                      "Pay Head",
                      "Due",
                      "TDS",
                      "Transfer",
                      "Date",
                      "Bank",
                      "Billable",
                      "Cash",
                      "Edit",
                      "Delete",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border-b border-orange-900/20"
                        style={{ background: "#431407", color: "#fed7aa" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, index) => (
                    <React.Fragment key={row.id || index}>
                      {/* ── Data row ── */}
                      <tr
                        className={`border-b border-orange-100 transition-colors ${
                          deletingId === row.id
                            ? "opacity-30 pointer-events-none"
                            : ""
                        } ${
                          editRow?.id === row.id
                            ? "bg-orange-50/80"
                            : index % 2 === 0
                            ? "bg-white hover:bg-orange-50"
                            : "bg-orange-50/40 hover:bg-orange-50"
                        }`}
                      >
                        <td className="px-4 py-3 text-center text-xs text-slate-400 font-medium">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 text-xs">
                            {row.client_name || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-orange-100 text-orange-800 text-[10px] font-bold">
                            {row.entity || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                          {row.department || "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                          {row.pay_head || "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="font-bold text-orange-700 text-sm">
                            {fmt(row.due_amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="text-xs font-semibold text-red-600">
                            {fmt(row.tds_amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="text-xs font-semibold text-slate-700">
                            {fmt(row.transfer_amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={11} className="text-slate-300" />
                            <span className="text-xs text-slate-600">
                              {fmtDate(row.payment_date)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={11} className="text-slate-300" />
                            <span className="text-xs text-slate-600">
                              {row.bank_name || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <BoolPill value={row.is_billable} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <BoolPill
                            value={row.petty_cash}
                            yesLabel="CASH"
                            noLabel="NO"
                          />
                        </td>

                        {/* Edit button */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {editRow?.id === row.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={handleSaveEdit}
                                disabled={savingEdit}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[11px] font-bold transition-colors disabled:opacity-60"
                              >
                                {savingEdit ? (
                                  <Loader2 size={10} className="animate-spin" />
                                ) : (
                                  <Save size={10} />
                                )}{" "}
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditRow(null);
                                  setEditForm({});
                                }}
                                className="px-2 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-[11px] hover:bg-gray-50 transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          ) : canEdit ? (
                            <button
                              onClick={() => {
                                setEditRow(row);
                                setEditForm({
                                  due_amount: row.due_amount,
                                  tds_amount: row.tds_amount || 0,
                                  payment_date: row.payment_date,
                                  bank_id: row.bank_id,
                                  department: row.department,
                                  payment_description:
                                    row.payment_description || "",
                                  remarks: row.remarks || "",
                                });
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-[11px] font-semibold border border-orange-200 transition-colors"
                            >
                              <Pencil size={10} /> Edit
                            </button>
                          ) : null}
                        </td>

                        {/* Delete button */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {deletingId === row.id ? (
                            <Loader2
                              size={14}
                              className="animate-spin text-rose-400"
                            />
                          ) : canDelete ? (
                            <button
                              onClick={() => setConfirmRow(row)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-semibold border border-rose-200 transition-colors"
                            >
                              <Trash2 size={10} /> Delete
                            </button>
                          ) : null}
                        </td>
                      </tr>

                      {/* ── Inline edit form row ── */}
                      {editRow?.id === row.id && (
                        <tr className="bg-orange-50/90 border-b-2 border-orange-300">
                          <td colSpan={2} />
                          {/* Due Amount */}
                          <td className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                              Due Amount
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-gray-400 text-xs">
                                ₹
                              </span>
                              <input
                                type="number"
                                value={editForm.due_amount}
                                onChange={(e) => {
                                  const d = parseFloat(e.target.value) || 0;
                                  const t =
                                    parseFloat(editForm.tds_amount) || 0;
                                  setEditForm((f) => ({
                                    ...f,
                                    due_amount: d,
                                    transfer_amount: Math.max(d - t, 0),
                                  }));
                                }}
                                className="w-full border-2 border-orange-200 bg-white rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-orange-800 outline-none focus:border-orange-400"
                              />
                            </div>
                          </td>
                          {/* TDS */}
                          <td className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                              TDS
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-gray-400 text-xs">
                                ₹
                              </span>
                              <input
                                type="number"
                                value={editForm.tds_amount}
                                onChange={(e) => {
                                  const t = parseFloat(e.target.value) || 0;
                                  const d =
                                    parseFloat(editForm.due_amount) || 0;
                                  setEditForm((f) => ({
                                    ...f,
                                    tds_amount: t,
                                    transfer_amount: Math.max(d - t, 0),
                                  }));
                                }}
                                className="w-full border-2 border-orange-200 bg-white rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-red-700 outline-none focus:border-orange-400"
                              />
                            </div>
                          </td>
                          {/* Transfer (auto) */}
                          <td className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                              Transfer (auto)
                            </label>
                            <div className="border-2 border-gray-100 bg-gray-50 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600">
                              ₹{" "}
                              {Number(
                                Math.max(
                                  (parseFloat(editForm.due_amount) || 0) -
                                    (parseFloat(editForm.tds_amount) || 0),
                                  0
                                )
                              ).toLocaleString("en-IN")}
                            </div>
                          </td>
                          {/* Date */}
                          <td className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                              Date
                            </label>
                            <input
                              type="date"
                              value={editForm.payment_date}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  payment_date: e.target.value,
                                }))
                              }
                              className="w-full border-2 border-orange-200 bg-white rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-orange-400"
                            />
                          </td>
                          {/* Bank */}
                          <td className="px-3 py-3">
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
                              className="w-full border-2 border-orange-200 bg-white rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-orange-400"
                            >
                              <option value="">Select bank</option>
                              {banks.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.bank_name}
                                </option>
                              ))}
                            </select>
                          </td>
                          {/* Department */}
                          <td className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                              Department
                            </label>
                            <select
                              value={editForm.department || ""}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  department: e.target.value,
                                }))
                              }
                              className="w-full border-2 border-orange-200 bg-white rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-orange-400"
                            >
                              <option value="">Select dept</option>
                              {DEPT_OPTIONS.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </td>
                          {/* Description */}
                          <td colSpan={2} className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                              Description / Remarks
                            </label>
                            <input
                              type="text"
                              value={
                                editForm.payment_description ||
                                editForm.remarks ||
                                ""
                              }
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  payment_description: e.target.value,
                                  remarks: e.target.value,
                                }))
                              }
                              placeholder="Optional description..."
                              className="w-full border-2 border-orange-200 bg-white rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-orange-400"
                            />
                          </td>
                          <td colSpan={4} />
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0">
                  <tr style={{ background: "#431407" }}>
                    <td colSpan={5} className="px-4 py-3">
                      <span className="text-[11px] font-bold text-orange-300 uppercase tracking-widest">
                        Total ({filtered.length})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-white text-base">
                        {fmt(totalDue)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-orange-300 text-sm">
                        {fmt(totalTds)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-orange-200 text-sm">
                        {fmt(totalTransfer)}
                      </span>
                    </td>
                    <td colSpan={6} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-slate-100 bg-white flex items-center gap-3">
            <button
              onClick={fetchExpenses}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <button
              onClick={() => {
                setExporting(true);
                try {
                  exportToExcel(filtered);
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting || filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold transition-all disabled:opacity-50 shadow-lg"
              style={{
                background: "linear-gradient(135deg, #9a3412, #ea580c)",
              }}
            >
              {exporting ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}{" "}
              Download Excel
            </button>
            <button
              onClick={onClose}
              className="ml-auto px-6 py-2.5 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default ExpenseViewModal;
