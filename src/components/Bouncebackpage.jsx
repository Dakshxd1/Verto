import React, { useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCcw,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  Calendar,
  Building2,
  Hash,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import AddBounceBackModal from "./AddBounceBackModal";
import { usePerms } from "../context/PermissionsContext";

// ─── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onDismiss }) => (
  <motion.div
    initial={{ opacity: 0, y: 40, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 20, scale: 0.95 }}
    className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-semibold border ${
      type === "success"
        ? "bg-emerald-600 border-emerald-500 shadow-emerald-900/40"
        : "bg-rose-600 border-rose-500 shadow-rose-900/40"
    }`}
  >
    {type === "success" ? (
      <CheckCircle2 className="w-4 h-4 shrink-0" />
    ) : (
      <AlertCircle className="w-4 h-4 shrink-0" />
    )}
    {message}
    <button
      onClick={onDismiss}
      className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  </motion.div>
);

// ─── Confirm Dialog ────────────────────────────────────────────────────────────
const ConfirmDialog = ({ onConfirm, onCancel, amount, payRef }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9998] flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <motion.div
      initial={{ scale: 0.88, y: 24, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.88, y: 24, opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      onClick={(e) => e.stopPropagation()}
      className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
    >
      {/* Red top stripe */}
      <div className="h-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600" />
      <div className="p-7">
        <div className="flex items-center justify-center w-14 h-14 bg-rose-50 border-2 border-rose-100 rounded-2xl mx-auto mb-5">
          <Trash2 className="w-6 h-6 text-rose-600" />
        </div>
        <h3 className="text-xl font-black text-gray-900 text-center tracking-tight">
          Delete this record?
        </h3>
        <p className="text-sm text-gray-500 text-center mt-2.5 leading-relaxed">
          Linked bank & software entries will be removed and invoice balances
          recalculated automatically.
        </p>
        <div className="mt-4 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-rose-500 font-medium uppercase tracking-wider mb-0.5">
            Record
          </p>
          <p className="text-sm font-bold text-rose-700">
            {payRef} &nbsp;·&nbsp; ₹ {Number(amount).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-rose-200"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, accent, icon: Icon, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow"
  >
    {/* Accent bar */}
    <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
          {label}
        </p>
        <p className="text-[1.6rem] font-black text-gray-900 mt-1.5 leading-none tracking-tight">
          {value}
        </p>
        {sub && (
          <p className="text-xs text-gray-400 mt-1.5 font-medium">{sub}</p>
        )}
      </div>
      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
        <Icon className="w-4.5 h-4.5 text-gray-400" />
      </div>
    </div>
  </motion.div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────
const BounceBackPage = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [toast, setToast] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("bounce_date");
  const [sortDir, setSortDir] = useState("desc");
  const [invoices, setInvoices] = useState([]);
  const [paymentReferences, setPaymentReferences] = useState([]);
  const { canSave, canDelete, isIntern } = usePerms();

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchBounceBacks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bounce_back")
        .select(
          `id,
             payment_ref,
             amount,
             bounce_date,
             bank_details,
             remarks,
             invoice_id,
             created_at,
          
             invoices (
               invoice_number
             )`
        )
        .order(sortField, { ascending: sortDir === "asc" });
      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      showToast("Failed to load: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [sortField, sortDir]);

  const fetchDropdownLists = async () => {
    const [{ data: invData }, { data: payData }] = await Promise.all([
      supabase.from("invoices").select("invoice_number"),
      supabase.from("payments_received").select("payment_ref"),
    ]);
    setInvoices((invData || []).map((i) => i.invoice_number));
    setPaymentReferences((payData || []).map((p) => p.payment_ref));
  };

  const handleDelete = async () => {
    if (!confirmRow) return;
    const bounceId = confirmRow.id;
    setConfirmRow(null);
    setDeletingId(bounceId);
    try {
      const { error } = await supabase.rpc("delete_bounce_back_complete", {
        p_bounce_id: bounceId,
      });
      if (error) throw error;
      window.refreshDashboard?.();
      await fetchBounceBacks();
      showToast("Bounce back deleted & balances recalculated");
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field)
      return <ChevronDown className="w-3 h-3 opacity-25" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-rose-500" />
    ) : (
      <ChevronDown className="w-3 h-3 text-rose-500" />
    );
  };

  useEffect(() => {
    fetchBounceBacks();
    fetchDropdownLists();
  }, [fetchBounceBacks]);

  useEffect(() => {
    const channel = supabase
      .channel("bounce-back-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bounce_back" },
        async () => {
          await fetchBounceBacks();
          window.refreshDashboard?.();
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchBounceBacks]);

  const filtered = records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.payment_ref?.toLowerCase().includes(q) ||
      r.invoices?.invoice_number?.toLowerCase().includes(q) ||
      "—"?.toLowerCase().includes(q) ||
      r.bank_details?.toLowerCase().includes(q) ||
      r.remarks?.toLowerCase().includes(q)
    );
  });

  const totalAmount = records.reduce((s, r) => s + Number(r.amount || 0), 0);
  const thisMonth = records.filter((r) => {
    const d = new Date(r.bounce_date);
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });
  const thisMonthAmount = thisMonth.reduce(
    (s, r) => s + Number(r.amount || 0),
    0
  );
  const filteredTotal = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);

  const cols = [
    { label: "#", field: null, width: "w-10" },
    { label: "Payment Ref", field: "payment_ref" },
    { label: "Invoice", field: null },
    { label: "Client", field: null },
    { label: "Bank", field: null },
    { label: "Date", field: "bounce_date" },
    { label: "Amount", field: "amount" },
    { label: "Remarks", field: null },
    { label: "", field: null },
  ];

  return (
    <div className="min-h-screen bg-[#f8f7f5] font-sans">
      {/* ── HERO HEADER ─────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#1a0a0a] via-[#2d0f0f] to-[#1a0505] overflow-hidden">
        {/* Decorative rings */}
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full border border-rose-900/30 pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full border border-rose-800/20 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-px h-full bg-gradient-to-b from-transparent via-rose-900/20 to-transparent pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 py-10">
          {/* Top row */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-rose-600/30 border border-rose-500/40 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                </div>
                <span className="text-rose-400/70 text-xs font-bold uppercase tracking-[0.2em]">
                  Finance · ERP
                </span>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight leading-none">
                Bounce Backs
              </h1>
              <p className="text-rose-200/50 text-sm mt-2 font-medium">
                Track & manage payment reversals
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center gap-2.5"
            >
              <button
                onClick={fetchBounceBacks}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-sm font-semibold border border-white/10 transition-all"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                Refresh
              </button>
                {canSave && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold shadow-xl shadow-rose-900/50 transition-all border border-rose-500/50"
                  >
                    <Plus className="w-4 h-4" />
                    Add Bounce Back
                  </button>
                )}
            </motion.div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            <StatCard
              label="Total Records"
              value={records.length}
              sub="all time"
              accent="bg-gradient-to-r from-rose-500 to-pink-500"
              icon={Hash}
              delay={0.1}
            />
            <StatCard
              label="Total Bounced"
              value={`₹ ${totalAmount.toLocaleString("en-IN")}`}
              sub="cumulative amount"
              accent="bg-gradient-to-r from-amber-400 to-orange-500"
              icon={TrendingDown}
              delay={0.15}
            />
            <StatCard
              label="This Month"
              value={thisMonth.length}
              sub="bounce backs"
              accent="bg-gradient-to-r from-blue-400 to-indigo-500"
              icon={Calendar}
              delay={0.2}
            />
            <StatCard
              label="Month Total"
              value={`₹ ${thisMonthAmount.toLocaleString("en-IN")}`}
              sub="current month"
              accent="bg-gradient-to-r from-emerald-400 to-teal-500"
              icon={Building2}
              delay={0.25}
            />
          </div>
        </div>
      </div>

      {/* ── BODY ────────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-7">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search ref, client, bank…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-300/30 shadow-sm transition-all"
            />
            <AnimatePresence>
              {search && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {search && (
              <motion.span
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs text-rose-500 font-semibold bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-lg"
              >
                {filtered.length} match{filtered.length !== 1 ? "es" : ""}
              </motion.span>
            )}
            <span className="text-xs text-gray-400 font-medium">
              {records.length} total records
            </span>
          </div>
        </div>

        {/* Table Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-28 text-gray-400 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-rose-400" />
              <p className="text-sm font-medium">Loading records…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 text-gray-400">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 border-2 border-rose-100 flex items-center justify-center mb-4">
                <TrendingDown className="w-7 h-7 text-rose-300" />
              </div>
              <p className="text-base font-bold text-gray-600">
                No records found
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {search
                  ? "Try a different search term"
                  : "Add your first bounce back"}
              </p>
              {!search && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm rounded-xl font-bold transition-colors shadow-lg shadow-rose-200"
                >
                  <Plus className="w-4 h-4" />
                  Add Bounce Back
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {cols.map(({ label, field }) => (
                      <th
                        key={label || "action"}
                        onClick={() => field && handleSort(field)}
                        className={`px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap bg-gray-50/70 ${
                          field
                            ? "cursor-pointer hover:text-rose-600 select-none transition-colors"
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

                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence>
                    {filtered.map((row, idx) => (
                      <motion.tr
                        key={row.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: idx * 0.018, duration: 0.25 }}
                        className={`group hover:bg-rose-50/40 transition-colors ${
                          deletingId === row.id
                            ? "opacity-30 pointer-events-none"
                            : ""
                        }`}
                      >
                        {/* # */}
                        <td className="px-4 py-3.5 text-gray-300 font-mono text-[11px] font-bold">
                          {String(idx + 1).padStart(2, "0")}
                        </td>

                        {/* Payment Ref */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 font-mono text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg font-bold tracking-tight border border-gray-200">
                            {row.payment_ref || "—"}
                          </span>
                        </td>

                        {/* Invoice */}
                        <td className="px-4 py-3.5 text-gray-500 text-xs font-medium">
                          {row.invoices?.invoice_number || (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Client */}
                        <td className="px-4 py-3.5">
                          <span className="text-gray-800 font-semibold text-xs">
                            {row.client_name || (
                              <span className="text-gray-300 font-normal">
                                —
                              </span>
                            )}
                          </span>
                        </td>

                        {/* Bank */}
                        <td className="px-4 py-3.5">
                          {row.bank_details ? (
                            <span className="text-[11px] font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg border border-blue-100">
                              {row.bank_details}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                          {row.bounce_date ? (
                            new Date(row.bounce_date).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-black text-rose-600 text-sm">
                            ₹ {Number(row.amount || 0).toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* Remarks */}
                        <td className="px-4 py-3.5 max-w-[160px]">
                          {row.remarks ? (
                            <span
                              className="text-xs text-gray-400 italic truncate block"
                              title={row.remarks}
                            >
                              {row.remarks}
                            </span>
                          ) : (
                            <span className="text-gray-200 text-xs">—</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3.5">
                          {deletingId === row.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                          ) : (
                            canDelete && (
                              <button
                                onClick={() => setConfirmRow(row)}
                                className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg text-xs font-bold border border-rose-200 hover:border-rose-600 transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            )
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>

                {/* Footer / Totals */}
                <tfoot>
                  <tr className="border-t-2 border-rose-100 bg-gradient-to-r from-rose-50 to-pink-50">
                    <td
                      colSpan={6}
                      className="px-4 py-3.5 text-[11px] font-black uppercase tracking-widest text-rose-600"
                    >
                      <span className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5" />
                        {filtered.length} Record
                        {filtered.length !== 1 ? "s" : ""}
                        {search && " (filtered)"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-black text-rose-700 text-base whitespace-nowrap">
                        ₹ {filteredTotal.toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </motion.div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-5 font-medium">
          Live sync enabled · changes reflect instantly
        </p>
      </div>

      {/* Dialogs & Modal */}
      <AnimatePresence>
        {confirmRow && (
          <ConfirmDialog
            onConfirm={handleDelete}
            onCancel={() => setConfirmRow(null)}
            amount={confirmRow.amount}
            payRef={confirmRow.payment_ref}
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

      <AddBounceBackModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchBounceBacks();
        }}
        invoices={invoices}
        paymentReferences={paymentReferences}
      />
    </div>
  );
};

export default BounceBackPage;
