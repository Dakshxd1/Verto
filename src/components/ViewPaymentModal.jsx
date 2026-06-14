import React, { useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import * as XLSX from "xlsx";
import { logExport, EXPORT_ACTIONS } from "../utils/auditLog";
import { usePerms } from "../context/PermissionsContext";
import {
  X,
  Download,
  Eye,
  Search,
  Calendar,
  Building2,
  FileText,
  CreditCard,
  CheckCircle,
  XCircle,
  TrendingDown,
  RefreshCw,
  ChevronDown,
  Filter,
  AlertCircle,
  Pencil,
  Trash2,
  Save,
  Ban,
  Loader2,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const fmt = (v) =>
  `₹ ${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const TYPE_COLORS = {
  Invoice:      { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-400" },
  "Petty Cash": { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400"  },
  Other:        { bg: "bg-slate-100", text: "text-slate-600",  dot: "bg-slate-400"  },
};

const TypeBadge = ({ type }) => {
  const c = TYPE_COLORS[type] || TYPE_COLORS.Other;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {type}
    </span>
  );
};

const BillablePill = ({ v }) =>
  v ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">
      <CheckCircle size={10} /> Billable
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
      <XCircle size={10} /> Non-Bill
    </span>
  );

const inputCls =
  "w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30 transition-all";

/* ─────────────────────────────────────────────
   Delete Confirm Dialog
───────────────────────────────────────────── */
const DeleteConfirm = ({ payment, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
      <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
        <Trash2 className="w-7 h-7 text-rose-600" />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">Delete Payment?</h3>
      <p className="text-sm text-slate-500 mb-1">
        This will permanently delete payment of <strong className="text-slate-800">{fmt(payment.amount)}</strong>
      </p>
      {payment.invoice_number && (
        <p className="text-xs text-slate-400 mb-5">Invoice: {payment.invoice_number}</p>
      )}
      <p className="text-xs text-rose-600 font-medium mb-5">
        ⚠️ This also reverses the bank entry. This cannot be undone.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          {loading ? "Deleting…" : "Yes, Delete"}
        </button>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Inline Edit Row
───────────────────────────────────────────── */
const EditRow = ({ payment, banks, onSave, onCancel, saving }) => {
  const [form, setForm] = useState({
    amount:       String(payment.amount || ""),
    payment_date: payment.payment_date || "",
    payment_type: payment.payment_type || "Invoice",
    bank_id:      payment.bank_id || "",
    remarks:      payment.remarks || "",
    is_billable:  payment.is_billable || false,
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <tr className="bg-indigo-50/60 border-b border-indigo-200">
      <td className="px-3 py-2">
        <input type="date" value={form.payment_date} onChange={(e) => set("payment_date", e.target.value)} className={inputCls} />
      </td>
      <td className="px-3 py-2">
        <select value={form.payment_type} onChange={(e) => set("payment_type", e.target.value)} className={inputCls}>
          <option value="Invoice">Invoice</option>
          <option value="Petty Cash">Petty Cash</option>
          <option value="Other">Other</option>
        </select>
      </td>
      <td className="px-3 py-2">
        <span className="text-xs text-slate-500 italic">{payment.invoice_number || "—"}</span>
      </td>
      <td className="px-3 py-2">
        <select value={form.bank_id} onChange={(e) => set("bank_id", e.target.value)} className={inputCls}>
          <option value="">Select bank</option>
          {banks.map((b) => <option key={b.id} value={b.id}>{b.bank_name}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
          <input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} className={`${inputCls} pl-5 text-right`} />
        </div>
      </td>
      <td className="px-3 py-2">
        <button
          onClick={() => set("is_billable", !form.is_billable)}
          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${form.is_billable ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-600"}`}
        >
          {form.is_billable ? "Billable" : "Non-Bill"}
        </button>
      </td>
      <td className="px-3 py-2">
        <input type="text" value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Remarks…" className={inputCls} />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSave(payment.id, form)}
            disabled={saving}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
            Save
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-300 transition-colors"
          >
            <Ban size={11} />
          </button>
        </div>
      </td>
    </tr>
  );
};

/* ─────────────────────────────────────────────
   Excel Export
───────────────────────────────────────────── */
const exportToExcel = (rows) => {
  const wb          = XLSX.utils.book_new();
  const totalAmount = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const billableSum = rows.filter((r) => r.is_billable).reduce((s, r) => s + Number(r.amount || 0), 0);
  const nonBillable = totalAmount - billableSum;

  const summaryData = [
    ["PAYMENT MADE — SUMMARY REPORT"],
    ["Generated On", new Date().toLocaleString("en-IN")],
    [],
    ["OVERVIEW"],
    ["Total Records",        rows.length],
    ["Total Amount Paid",    totalAmount],
    ["Billable Amount",      billableSum],
    ["Non-Billable Amount",  nonBillable],
    [],
    ["PAYMENT TYPE BREAKDOWN"],
    ["Invoice Payments", rows.filter((r) => r.payment_type === "Invoice").length],
    ["Petty Cash",       rows.filter((r) => r.payment_type === "Petty Cash").length],
    ["Other Payments",   rows.filter((r) => r.payment_type === "Other").length],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 28 }, { wch: 22 }];

  const headers = ["#","Payment Date","Payment Type","Invoice Number","Client Name","Bank","Amount (₹)","Billable","Transfer Amount (₹)","Remarks"];
  const detail  = rows.map((r, i) => [
    i + 1,
    fmtDate(r.payment_date),
    r.payment_type || "—",
    r.invoice_number || "—",
    r.client_name || "—",
    r.bank_master?.bank_name || "—",
    Number(r.amount || 0),
    r.is_billable ? "Yes" : "No",
    Number(r.transfer_amount || 0),
    r.remarks || "",
  ]);

  const detailWs = XLSX.utils.aoa_to_sheet([headers, ...detail]);
  detailWs["!cols"] = [{ wch: 4 },{ wch: 14 },{ wch: 14 },{ wch: 18 },{ wch: 22 },{ wch: 20 },{ wch: 14 },{ wch: 10 },{ wch: 18 },{ wch: 30 }];

  XLSX.utils.book_append_sheet(wb, detailWs, "Payment Details");
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
  XLSX.writeFile(wb, `Payments_Made_${new Date().toISOString().slice(0, 10)}.xlsx`);
  logExport({
    action:      EXPORT_ACTIONS.EXCEL,
    category:    "Payments",
    description: `Downloaded Payments Made Excel (${rows.length} records)`,
    meta:        { rows: rows.length },
  });
};

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const ViewPaymentModal = ({ isOpen, onClose, invoice }) => {
  const { canEdit, canDelete, canExport } = usePerms();
  const [payments, setPayments]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterBill, setFilterBill] = useState("All");
  const [exporting, setExporting]   = useState(false);
  const [banks, setBanks]           = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [savingId, setSavingId]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId]     = useState(null);

  /* ── fetch banks ── */
  useEffect(() => {
    supabase
      .from("bank_master")
      .select("id, bank_name")
      .then(({ data }) => setBanks(data || []));
  }, []);

  /* ── fetch payments ── */
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("payments_made")
      .select("*, bank_master(bank_name), software_entry_id, reference_no")
      .order("payment_date", { ascending: false });

    if (invoice?.id)             q = q.eq("invoice_id", invoice.id);
    else if (invoice?.invoice_number) q = q.eq("invoice_number", invoice.invoice_number);

    const { data, error } = await q;
    if (!error) setPayments(data || []);
    setLoading(false);
  }, [invoice]);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setFilterType("All");
      setFilterBill("All");
      setEditingId(null);
      setDeleteTarget(null);
      fetchPayments();
    }
  }, [isOpen, fetchPayments]);

  if (!isOpen) return null;

  /* ── filtered rows ── */
  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (p.invoice_number || "").toLowerCase().includes(q) ||
      (p.client_name    || "").toLowerCase().includes(q) ||
      (p.remarks        || "").toLowerCase().includes(q) ||
      (p.bank_master?.bank_name || "").toLowerCase().includes(q);
    const matchType = filterType === "All" || p.payment_type === filterType;
    const matchBill =
      filterBill === "All" ||
      (filterBill === "Billable"     &&  p.is_billable) ||
      (filterBill === "Non-Billable" && !p.is_billable);
    return matchSearch && matchType && matchBill;
  });

  const totalShown = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);

  /* ── EDIT SAVE ── */
  const handleSave = async (id, form) => {
    setSavingId(id);
    try {
      const payload = {
        amount:        parseFloat(form.amount) || 0,
        payment_date:  form.payment_date,
        payment_type:  form.payment_type,
        bank_id:       form.bank_id || null,
        remarks:       form.remarks,
        is_billable:   form.is_billable,
        petty_cash:    form.payment_type === "Petty Cash",
        other_payment: form.payment_type === "Other",
      };

      const { error } = await supabase.from("payments_made").update(payload).eq("id", id);
      if (error) throw error;

      // Also update the related software_entry and bank_entry
      const currentPayment = payments.find((p) => p.id === id);
      if (currentPayment?.software_entry_id) {
        await supabase
          .from("software_entries")
          .update({ amount: -payload.amount, date: payload.payment_date, remarks: payload.remarks || "Payment Made", bank_id: payload.bank_id })
          .eq("id", currentPayment.software_entry_id);

        await supabase
          .from("bank_entries")
          .update({ amount: payload.amount, date: payload.payment_date, bank_id: payload.bank_id, remarks: payload.remarks || "" })
          .eq("reference_no", currentPayment.reference_no);
      }

      // Refresh local list
      await fetchPayments();

      // ✅ FIX: Tell the parent Dashboard to re-fetch outstanding_invoice_view
      // so the table and stat cards reflect the updated amounts immediately.
      window.refreshDashboard?.();

      setEditingId(null);
    } catch (err) {
      alert("❌ Update failed: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  /* ── DELETE ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);

    try {
      const { error } = await supabase.from("payments_made").delete().eq("id", deleteTarget.id);
      if (error) throw error;

      // Refresh local list
      await fetchPayments();

      // ✅ FIX: Tell the parent Dashboard to re-fetch outstanding_invoice_view
      // so the outstanding balance and stat cards update immediately after delete.
      window.refreshDashboard?.();

      setDeleteTarget(null);
    } catch (err) {
      alert("❌ Delete failed: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = () => {
    setExporting(true);
    try { exportToExcel(filtered); }
    catch (e) { alert("Export failed: " + e.message); }
    finally { setExporting(false); }
  };

  /* ────────────────── RENDER ────────────────── */
  return (
    <>
      {deleteTarget && (
        <DeleteConfirm
          payment={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={!!deletingId}
        />
      )}

      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[2px]">
        <div
          className="bg-white w-full sm:max-w-5xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: "96vh" }}
        >
          {/* ── HEADER ── */}
          <div
            className="relative p-6 pb-5 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%)" }}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
            <div className="absolute bottom-0 left-16 w-20 h-20 bg-indigo-500/10 rounded-full translate-y-8" />

            <div className="relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                    <Eye size={16} className="text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Payment History</h2>
                </div>
                <p className="text-indigo-300 text-xs ml-10">
                  {invoice
                    ? `Payments for ${invoice.invoice_number || "this invoice"}`
                    : "All outgoing payments — click ✏️ to edit, 🗑️ to delete"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  disabled={exporting || filtered.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all disabled:opacity-40"
                >
                  {exporting ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                  Export
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X size={15} className="text-white/80" />
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div className="relative mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Records",    value: filtered.length,                                   icon: FileText    },
                { label: "Total Paid", value: fmt(totalShown),                                   icon: TrendingDown },
                { label: "Billable",   value: filtered.filter((r) => r.is_billable).length + " items", icon: CheckCircle },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-white/10 border border-white/15 rounded-2xl px-3 py-2.5 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={12} className="text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-[9px] text-indigo-400 uppercase tracking-widest font-bold">{label}</p>
                    <p className="text-white text-xs font-bold leading-none mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── FILTERS ── */}
          <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-slate-100 space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search invoice, client, bank, remarks…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={12} className="text-slate-400" />
              {["All", "Invoice", "Petty Cash", "Other"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${filterType === t ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                >
                  {t}
                </button>
              ))}
              <div className="w-px h-4 bg-slate-200 mx-1" />
              {["All", "Billable", "Non-Billable"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterBill(t)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${filterBill === t ? "bg-violet-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* ── TABLE ── */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
                <p className="text-sm text-slate-400">Fetching payments…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <AlertCircle size={20} className="text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 font-medium">No payments found</p>
                <p className="text-xs text-slate-400">Try adjusting filters or search</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr>
                    {["Date","Type","Invoice / Client","Bank","Amount","Billable","Remarks","Actions"].map((h) => (
                      <th key={h} className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) =>
                    editingId === p.id ? (
                      <EditRow
                        key={p.id}
                        payment={p}
                        banks={banks}
                        onSave={handleSave}
                        onCancel={() => setEditingId(null)}
                        saving={savingId === p.id}
                      />
                    ) : (
                      <tr
                        key={p.id}
                        className={`border-b border-slate-100 hover:bg-indigo-50/40 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-300" />
                            <span className="text-black text-xs">{fmtDate(p.payment_date)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><TypeBadge type={p.payment_type || "Other"} /></td>
                        <td className="px-4 py-3 max-w-[140px]">
                          {p.invoice_number ? (
                            <div>
                              <p className="font-semibold text-black text-xs truncate">{p.invoice_number}</p>
                              {p.client_name && <p className="text-[10px] text-slate-600 truncate">{p.client_name}</p>}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={11} className="text-slate-400" />
                            <span className="text-xs text-black">{p.bank_master?.bank_name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="font-bold text-indigo-700 text-sm">{fmt(p.amount)}</span>
                        </td>
                        <td className="px-4 py-3"><BillablePill v={p.is_billable} /></td>
                        <td className="px-4 py-3 max-w-[140px]">
                          <span className="text-xs text-black truncate block" title={p.remarks}>
                            {p.remarks || <span className="text-slate-300">—</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {canEdit && (
                              <button
                                onClick={() => { setEditingId(p.id); setDeleteTarget(null); }}
                                title="Edit"
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => { setDeleteTarget(p); setEditingId(null); }}
                                title="Delete"
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>

                <tfoot className="sticky bottom-0 bg-indigo-900 border-t-2 border-indigo-600">
                  <tr>
                    <td colSpan={4} className="px-4 py-3">
                      <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest">
                        Total ({filtered.length} records)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-white text-base">{fmt(totalShown)}</span>
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="flex-shrink-0 px-5 pb-6 pt-3 border-t border-slate-100 flex items-center gap-3">
            <button
              onClick={fetchPayments}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-black text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            {canExport && (
              <button
                onClick={handleExport}
                disabled={exporting || filtered.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20"
              >
                {exporting ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                Download Excel
              </button>
            )}
            <button
              onClick={onClose}
              className="ml-auto flex-1 max-w-[120px] py-2.5 rounded-2xl border-2 border-slate-200 text-black text-sm font-semibold hover:bg-slate-50 transition-colors text-center"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewPaymentModal;