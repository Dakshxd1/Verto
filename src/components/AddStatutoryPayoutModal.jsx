import React, { useState, useEffect } from "react";
import supabase from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowRight,
  AlertCircle,
  FileCheck,
  Eye,
  ChevronLeft,
  Trash2,
  Pencil,
  Loader2,
  CheckCircle2,
  IndianRupee,
  AlertTriangle,
  StickyNote,
  ShieldCheck,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const inr = (v) => Number(v || 0).toLocaleString("en-IN");

// ─── Section Card ─────────────────────────────────────────────────────────────
const Section = ({ icon: Icon, title, color, children }) => {
  const map = {
    blue: {
      card: "bg-blue-50/60 border-blue-100",
      icon: "bg-blue-100 text-blue-600",
      title: "text-blue-800",
    },
    emerald: {
      card: "bg-emerald-50/60 border-emerald-100",
      icon: "bg-emerald-100 text-emerald-600",
      title: "text-emerald-800",
    },
    amber: {
      card: "bg-amber-50/60 border-amber-100",
      icon: "bg-amber-100 text-amber-600",
      title: "text-amber-800",
    },
    gray: {
      card: "bg-gray-50/60 border-gray-100",
      icon: "bg-gray-100 text-gray-500",
      title: "text-gray-700",
    },
  };
  const s = map[color] || map.gray;
  return (
    <div className={`rounded-2xl border ${s.card} p-5`}>
      <div className="flex items-center gap-2.5 mb-5">
        <div
          className={`w-7 h-7 rounded-xl flex items-center justify-center ${s.icon}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
        <h3
          className={`text-xs font-black uppercase tracking-widest ${s.title}`}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
};

// ─── Field Wrapper ────────────────────────────────────────────────────────────
const Field = ({ label, required, hint, error, showErrors, children }) => (
  <div>
    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
      {label}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && !(showErrors && error) && (
      <p className="text-[11px] text-gray-400 mt-1">{hint}</p>
    )}
    <AnimatePresence>
      {showErrors && error && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-1 text-[11px] text-rose-500 font-semibold mt-1"
        >
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

const selCls = (err) =>
  `w-full bg-white border-2 text-gray-800 text-sm px-3.5 py-2.5 rounded-xl outline-none transition-all font-medium
   focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-400 hover:border-gray-200
   ${err ? "border-rose-400" : "border-gray-100"}`;

const inpCls = (err) =>
  `w-full bg-white border-2 text-gray-800 text-sm px-3.5 py-2.5 rounded-xl outline-none transition-all font-medium
   focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-400 hover:border-gray-200 placeholder:text-gray-300
   ${err ? "border-rose-400" : "border-gray-100"}`;

// small reusable input for the inline edit form inside the panel
const EditInput = ({
  label,
  value,
  onChange,
  type = "number",
  readOnly = false,
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
      {label}
    </label>
    {readOnly ? (
      <div className="border-2 border-gray-100 bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs font-black text-rose-600">
        ₹ {inr(value)}
      </div>
    ) : (
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="border-2 border-cyan-200 bg-white rounded-lg px-2.5 py-1.5 text-xs font-bold text-cyan-800 outline-none focus:border-cyan-400 w-full"
      />
    )}
  </div>
);

// ─── Records Panel ────────────────────────────────────────────────────────────
const StatutoryRecordsPanel = ({ onClose }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [toast, setToast] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [search, setSearch] = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("statutory_payout_view")
      .select("*")
      .order("created_at", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setConfirmId(null);
    setDeletingId(id);
    try {
      const { error } = await supabase.rpc(
        "delete_statutory_payment_complete",
        { p_id: id }
      );
      if (error) throw error;
      window.refreshDashboard?.();
      showToast("Deleted & ERP synced");
      await fetchRecords();
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Edit helpers ───────────────────────────────────────────────────────────
  const startEdit = (row) => {
    setEditingId(row.id);
    setEditForm({
      total_paid: String(row.total_paid ?? ""),
      original_total_paid: String(row.total_paid ?? ""),
      month_total_due: String(row.month_total_due ?? ""),
      month_total_paid: String(row.month_total_paid ?? ""),
      bank_id: row.bank_id ?? "",
      remarks: row.remarks ?? "",
      penalty: row.penalty ?? false,
      penalty_amount: String(row.penalty_amount ?? "0"),
      payment_date: row.payment_date || "",
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Save edit ──────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    setDeletingId(editingId);
    try {
      const newPaid = parseFloat(editForm.total_paid) || 0;
      const oldPaid = parseFloat(editForm.original_total_paid) || 0;
      const monthTotalDue = parseFloat(editForm.month_total_due) || 0;
      const monthTotalPaid = parseFloat(editForm.month_total_paid) || 0;

      const otherRowsPaid = monthTotalPaid - oldPaid;
      const maxAllowed = monthTotalDue - otherRowsPaid;

      if (newPaid > maxAllowed) {
        showToast(
          `❌ Cannot pay more than remaining ₹${inr(
            maxAllowed
          )} for this month`,
          "error"
        );
        setDeletingId(null);
        return;
      }

      const pending = Math.max(monthTotalDue - otherRowsPaid - newPaid, 0);

      // Non-blocking bank balance warning when paying from a bank
      if (editForm.bank_id && newPaid > 0) {
        try {
          const { data: bank } = await supabase
            .from("bank_master")
            .select("id,opening_balance,bank_name")
            .eq("id", editForm.bank_id)
            .maybeSingle();
          const { data: entries } = await supabase
            .from("bank_entries")
            .select("amount,type,is_deleted")
            .eq("bank_id", editForm.bank_id)
            .eq("is_deleted", false);
          const opening = Number(bank?.opening_balance || 0);
          const movement = (entries || []).reduce((sum, e) => {
            const amt = Number(e.amount || 0);
            return String(e.type).toLowerCase() === "debit" ? sum - amt : sum + amt;
          }, 0);
          const currentBalance = opening + movement;
          if (newPaid > currentBalance) {
            showToast(
              `⚠️ Entered bank payment (₹${newPaid.toLocaleString("en-IN")}) is greater than current bank balance (₹${Number(currentBalance).toLocaleString("en-IN")}). Proceeding anyway.`,
              "error"
            );
          }
        } catch (err) {
          console.debug("Bank balance check failed:", err.message || err);
        }
      }

      const { error } = await supabase
        .from("statutory_payments")
        .update({
          total_paid: newPaid,
          pending_due: pending,
          payment_status:
            pending <= 0 ? "paid" : newPaid > 0 ? "partial" : "pending",
          bank_id: editForm.bank_id || null,
          remarks: editForm.remarks || "",
          payment_date: editForm.payment_date || null,
          penalty: editForm.penalty || false,
          penalty_amount: parseFloat(editForm.penalty_amount) || 0,
        })
        .eq("id", editingId);
      if (error) throw error;
      setEditingId(null);
      setEditForm({});
      window.refreshDashboard?.();
      showToast("Updated & ERP synced ✅");
      await fetchRecords();
    } catch (err) {
      showToast("Update failed: " + err.message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredRecords = records.filter((r) => {
    const q = search.toLowerCase();

    return (
      r.entity?.toLowerCase().includes(q) ||
      r.type?.toLowerCase().includes(q) ||
      r.bank_name?.toLowerCase().includes(q)
    );
  });

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 260 }}
      className="absolute inset-0 bg-white z-10 flex flex-col rounded-2xl overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 px-5 py-4 flex-shrink-0 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div className="w-px h-5 bg-white/25" />
            <div>
              <p className="text-sm font-black">Statutory Payout Records</p>
              <p className="text-[11px] text-cyan-200 mt-0.5">
                Search · Filter · Export Records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3 border-b bg-white">
        <input
          type="text"
          placeholder="Search entity / type / bank..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-cyan-400"
        />
      </div>

      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-300">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm font-medium">Loading…</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <FileCheck className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-semibold">No records yet</p>
          </div>
        ) : (
          filteredRecords.map((row) => (
            <motion.div
              key={row.id}
              layout
              animate={{ opacity: deletingId === row.id ? 0.4 : 1 }}
              className={`bg-white border-b border-gray-100 ${
                deletingId === row.id ? "pointer-events-none" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-black text-gray-900 text-sm">
                      {row.display_type || row.type}
                    </span>
                    {row.type === "TDS" &&
                      row.tds_direction === "receivable" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ↓ Inflow
                        </span>
                      )}
                    {row.type === "TDS" &&
                      row.tds_direction !== "receivable" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          ↑ Outflow
                        </span>
                      )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        row.calculated_status === "paid"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : row.calculated_status === "partial"
                          ? "bg-amber-50 text-amber-600 border border-amber-200"
                          : "bg-rose-50 text-rose-600 border border-rose-200"
                      }`}
                    >
                      {row.calculated_status?.toUpperCase()}
                    </span>
                    {row.penalty && (
                      <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                        ⚡ Penalty
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-2">
                    <span className="text-[11px] text-gray-500 font-semibold">
                      Entity:{" "}
                      <span className="text-gray-700">{row.entity}</span>
                    </span>
                    <span className="text-[11px] text-gray-500 font-semibold">
                      Month:{" "}
                      <span className="text-gray-700">
                        {row.month
                          ? new Date(row.month).toLocaleDateString("en-IN", {
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </span>
                    {row.bank_name && (
                      <span className="text-[11px] text-cyan-600 font-semibold">
                        Bank: {row.bank_name}
                      </span>
                    )}
                    {row.payment_date && (
                      <span className="text-[11px] text-gray-500 font-semibold">
                        Paid:{" "}
                        <span className="text-gray-700">
                          {new Date(row.payment_date).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-700">
                      ₹{inr(row.total_paid)}
                    </span>
                    {Number(row.penalty_amount) > 0 && (
                      <span className="text-xs font-bold text-amber-600">
                        Penalty: ₹{inr(row.penalty_amount)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 pt-0.5 flex flex-col gap-1.5">
                  {deletingId === row.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  ) : confirmId === row.id ? (
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="px-3 py-1.5 bg-rose-500 text-white text-[11px] font-black rounded-xl hover:bg-rose-600 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-3 py-1.5 border-2 border-gray-100 text-gray-400 text-[11px] font-bold rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : editingId === row.id ? (
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1.5 bg-cyan-500 text-white text-[11px] font-black rounded-xl hover:bg-cyan-600 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditForm({});
                        }}
                        className="px-3 py-1.5 border-2 border-gray-100 text-gray-400 text-[11px] font-bold rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(row)}
                        className="p-2 text-gray-300 hover:text-cyan-500 hover:bg-cyan-50 rounded-xl border-2 border-transparent hover:border-cyan-100 transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmId(row.id)}
                        className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl border-2 border-transparent hover:border-rose-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* ── Inline edit form ── */}
              <AnimatePresence>
                {editingId === row.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-cyan-100 bg-cyan-50/40 px-4 py-3"
                  >
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <EditInput
                        label="Month Total Due (₹)"
                        value={editForm.month_total_due}
                        readOnly
                      />
                      <EditInput
                        label="This Payment (₹)"
                        value={editForm.total_paid}
                        onChange={(e) =>
                          handleEditChange("total_paid", e.target.value)
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <EditInput
                        label="Month Remaining (auto)"
                        value={Math.max(
                          (parseFloat(editForm.month_total_due) || 0) -
                            ((parseFloat(editForm.month_total_paid) || 0) -
                              (parseFloat(editForm.original_total_paid) || 0)) -
                            (parseFloat(editForm.total_paid) || 0),
                          0
                        ).toFixed(2)}
                        readOnly
                      />
                      <EditInput
                        label="Penalty Amount (₹)"
                        value={editForm.penalty_amount}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            penalty_amount: e.target.value,
                            penalty: parseFloat(e.target.value) > 0,
                          }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <EditInput
                        label="Payment Date"
                        type="date"
                        value={editForm.payment_date}
                        onChange={(e) =>
                          handleEditChange("payment_date", e.target.value)
                        }
                      />
                    </div>
                    <div className="mb-3">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block mb-1">
                        Remarks
                      </label>
                      <input
                        type="text"
                        value={editForm.remarks}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            remarks: e.target.value,
                          }))
                        }
                        placeholder="Optional remark…"
                        className="w-full border-2 border-cyan-200 bg-white rounded-lg px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-cyan-400"
                      />
                    </div>

                    {(() => {
                      const remaining = Math.max(
                        (parseFloat(editForm.month_total_due) || 0) -
                          ((parseFloat(editForm.month_total_paid) || 0) -
                            (parseFloat(editForm.original_total_paid) || 0)) -
                          (parseFloat(editForm.total_paid) || 0),
                        0
                      );
                      return (
                        <div
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold border-2 ${
                            remaining > 0
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : "bg-emerald-50 border-emerald-200 text-emerald-700"
                          }`}
                        >
                          {remaining > 0 ? (
                            <>
                              <AlertTriangle className="w-3 h-3" /> Partial — ₹
                              {inr(remaining)} still remaining for this month
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Fully Paid
                              for this month
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className={`absolute bottom-4 left-4 right-4 flex items-center gap-2.5 px-4 py-3 rounded-2xl text-white text-xs font-bold shadow-xl ${
              toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────
const AddStatutoryPayoutModal = ({
  isOpen,
  onClose,
  entities = [],
  banks: banksProp = [],
}) => {
  const [banks, setBanks] = useState(banksProp);

  // Fetch banks directly so the dropdown is always populated
  useEffect(() => {
    const fetchBanks = async () => {
      const { data } = await supabase.from("bank_master").select("id, bank_name").order("bank_name");
      if (data && data.length > 0) setBanks(data);
    };
    if (isOpen) fetchBanks();
  }, [isOpen]);

  // Sync prop changes too (in case parent provides them)
  useEffect(() => {
    if (banksProp && banksProp.length > 0) setBanks(banksProp);
  }, [banksProp]);

  // Change 2: Added rpc_type to formData
  const [formData, setFormData] = useState({
    entity: "",
    bank_id: "",
    statutoryPayoutType: "GST",
    tds_direction: null,
    rpc_type: "GST",
    forTheMonth: "",
    totalDue: "",
    totalPaid: "",
    pendingDue: "",
    anyInterestPenalties: "No",
    penaltyAmount: "",
    penaltyPercentage: "",
    remarks: "",
    payment_date: "",
    ops: "100",
    temp: "",
    recruitment: "",
    projects: "",
    others: "",
  });

  const [errors, setErrors] = useState({});
  const [showErrors, setShowErrors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  // Change 1: Updated statutoryTypes with rpc_type
  const statutoryTypes = [
    { value: "GST",            label: "GST",                              tds_direction: null,         rpc_type: "GST" },
    { value: "TDS",            label: "TDS Payout — We Pay Govt",         tds_direction: "payout",     rpc_type: "TDS" },
    { value: "TDS Receivable", label: "TDS Receivable — Client Deducted", tds_direction: "receivable", rpc_type: "TDS RECEIVABLE" },
    { value: "EPF",            label: "EPF",                              tds_direction: null,         rpc_type: "EPF" },
    { value: "ESI",            label: "ESI",                              tds_direction: null,         rpc_type: "ESI" },
    { value: "LWF",            label: "LWF",                              tds_direction: null,         rpc_type: "LWF" },
    { value: "PF",             label: "PF",                               tds_direction: null,         rpc_type: "PF" },
    { value: "Income Tax",     label: "Income Tax",                       tds_direction: null,         rpc_type: "INCOME TAX" },
    { value: "Others",         label: "Others",                           tds_direction: null,         rpc_type: null },
  ];

  // Change 3: Updated fetchAutoDue to use rpc_type
  const fetchAutoDue = async (entity, month, type, rpcType) => {
    if (!entity || !month || !type) return;
    if (!rpcType) {
      // Others — no auto-calc
      setFormData((prev) => ({ ...prev, totalDue: "" }));
      return;
    }

    const { data, error } = await supabase.rpc("get_statutory_due", {
      selected_entity: entity,
      selected_month: `${month}-01`,
      selected_type: rpcType,   // ← use rpc_type not display type
    });

    if (error) {
      console.error(error);
      return;
    }

    const totalDue = Number(data || 0);

    setFormData((prev) => ({
      ...prev,
      totalDue: totalDue.toFixed(2),
    }));
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      let updated = { ...prev, [field]: value };
      if (field === "totalPaid") {
        const remaining = parseFloat(prev.totalDue) || 0;
        const entered = parseFloat(value) || 0;
        if (entered > remaining)
          return { ...prev, totalPaid: remaining.toString() };
        updated.totalPaid = value;
      }
      return updated;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  useEffect(() => {
    const due = parseFloat(formData.totalDue) || 0;
    const paid = parseFloat(formData.totalPaid) || 0;
    const pending = due - paid;
    setFormData((prev) => ({
      ...prev,
      pendingDue: pending >= 0 ? pending.toFixed(2) : "0.00",
    }));
  }, [formData.totalDue, formData.totalPaid]);

  // Change 4: Updated useEffect to pass rpc_type
  useEffect(() => {
    if (
      formData.entity &&
      formData.forTheMonth &&
      formData.statutoryPayoutType
    ) {
      fetchAutoDue(
        formData.entity,
        formData.forTheMonth,
        formData.statutoryPayoutType,
        formData.rpc_type
      );
    }
  }, [
    formData.entity,
    formData.forTheMonth,
    formData.statutoryPayoutType,
    formData.rpc_type,
  ]);

  const calculateTotalPercentage = () =>
    ["OS", "temp", "recruitment", "projects", "others"].reduce(
      (s, k) => s + (parseFloat(formData[k]) || 0),
      0
    );

  const validateForm = () => {
    const e = {};
    if (!formData.entity) e.entity = "Entity is required";
    if (!formData.bank_id) e.bank_id = "Bank is required";
    if (!formData.statutoryPayoutType)
      e.statutoryPayoutType = "Type is required";
    if (!formData.forTheMonth.trim()) e.forTheMonth = "Month is required";
    if (!formData.totalDue) e.totalDue = "Total due is required";
    if (!formData.totalPaid) e.totalPaid = "Total paid is required";
    if (formData.anyInterestPenalties === "Yes") {
      if (!formData.penaltyAmount)
        e.penaltyAmount = "Penalty amount is required";
      if (!formData.penaltyPercentage)
        e.penaltyPercentage = "Penalty % is required";
      if (Math.abs(calculateTotalPercentage() - 100) > 0.01)
        e.costHeadBreakdown = "Cost head breakdown must total 100%";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ADD modal: always plain INSERT — each payment is its own row
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setShowErrors(true);
    if (!validateForm()) return;

    const paying = Number(formData.totalPaid || 0);
    const remaining = Number(formData.totalDue || 0);
    if (paying > remaining) {
      alert("❌ Cannot pay more than remaining due");
      return;
    }

    setLoading(true);
    try {
      const month = `${formData.forTheMonth}-01`;

      const { error } = await supabase.from("statutory_payments").insert([
        {
          entity: formData.entity,
          bank_id: formData.bank_id,
          month,
          payment_date: formData.payment_date,
          // Change 7: Store canonical type in DB
          type: formData.statutoryPayoutType === "TDS Receivable" ? "TDS" : formData.statutoryPayoutType,
          tds_direction: formData.tds_direction,

          // full liability for that month
          total_due: Number(formData.totalDue),

          // ONLY THIS PAYMENT
          total_paid: Number(formData.totalPaid),

          pending_due: Number(formData.pendingDue),

          penalty: formData.anyInterestPenalties === "Yes",

          penalty_amount: Number(formData.penaltyAmount || 0),

          remarks: formData.remarks,

          projection_status: "actual",

          payment_status: Number(formData.pendingDue) <= 0 ? "paid" : "partial",

          ops_percentage: Number(formData.ops || 0),

          temp_percentage: Number(formData.temp || 0),

          recruitment_percentage: Number(formData.recruitment || 0),

          projects_percentage: Number(formData.projects || 0),

          others_percentage: Number(formData.others || 0),
        },
      ]);

      if (error) throw error;

      window.refreshDashboard?.();
      alert("✅ Statutory Payment Saved");
      resetForm();
      onClose();
    } catch (err) {
      alert("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      entity: "",
      bank_id: "",
      statutoryPayoutType: "GST",
      tds_direction: null,
      rpc_type: "GST",
      forTheMonth: "",
      totalDue: "",
      totalPaid: "",
      pendingDue: "",
      anyInterestPenalties: "No",
      penaltyAmount: "",
      penaltyPercentage: "",
      remarks: "",
      payment_date: "",
      ops: "100",
      temp: "",
      recruitment: "",
      projects: "",
      others: "",
    });
    setErrors({});
    setShowErrors(false);
    setViewOpen(false);
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const totalPercentage = calculateTotalPercentage();
  const hasPending = Number(formData.pendingDue) > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.94, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 24, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden relative flex flex-col"
          >
            {/* Inline Records Panel */}
            <AnimatePresence>
              {viewOpen && (
                <StatutoryRecordsPanel onClose={() => setViewOpen(false)} />
              )}
            </AnimatePresence>

            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 px-7 py-5 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-cyan-200 uppercase tracking-[3px] mb-1">
                    Compliance
                  </p>
                  <h2 className="text-xl font-black tracking-tight">
                    + Add Statutory Payout
                  </h2>
                  <p className="text-cyan-100/80 text-xs mt-0.5">
                    Record statutory compliance payments
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setViewOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Records
                  </button>
                  <button
                    onClick={handleClose}
                    className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl transition-all text-cyan-100 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Scrollable Form ── */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* ── Statutory Details ── */}
                <Section
                  icon={ShieldCheck}
                  title="Statutory Details"
                  color="blue"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label="Entity"
                      required
                      error={errors.entity}
                      showErrors={showErrors}
                    >
                      <select
                        value={formData.entity}
                        onChange={(e) => handleChange("entity", e.target.value)}
                        className={selCls(showErrors && errors.entity)}
                      >
                        <option value="">Select Entity</option>
                        {entities.map((entity, idx) => (
                          <option key={idx} value={entity}>
                            {entity}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field
                      label="Statutory Type"
                      required
                      error={errors.statutoryPayoutType}
                      showErrors={showErrors}
                      hint="GST / TDS / EPF / ESI / LWF / PF / Income Tax / Others"
                    >
                      {/* Change 6: Simplified select value and Change 5: Updated onChange */}
                      <select
                        value={formData.statutoryPayoutType}
                        onChange={(e) => {
                          const selected = statutoryTypes.find((t) => t.value === e.target.value);
                          if (selected) {
                            setFormData((prev) => ({
                              ...prev,
                              statutoryPayoutType: selected.value,
                              tds_direction: selected.tds_direction,
                              rpc_type: selected.rpc_type,
                              totalDue: "", // reset when type changes
                            }));
                            if (errors.statutoryPayoutType)
                              setErrors((prev) => ({ ...prev, statutoryPayoutType: "" }));
                          }
                        }}
                        className={selCls(
                          showErrors && errors.statutoryPayoutType
                        )}
                      >
                        {statutoryTypes.map((t, i) => (
                          <option key={i} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <Field
                      label="For The Month"
                      required
                      error={errors.forTheMonth}
                      showErrors={showErrors}
                    >
                      <input
                        type="month"
                        value={formData.forTheMonth}
                        onChange={(e) =>
                          handleChange("forTheMonth", e.target.value)
                        }
                        className={inpCls(showErrors && errors.forTheMonth)}
                      />
                    </Field>
                    <Field
                      label="Bank"
                      required
                      error={errors.bank_id}
                      showErrors={showErrors}
                    >
                      <select
                        value={formData.bank_id}
                        onChange={(e) =>
                          handleChange("bank_id", e.target.value)
                        }
                        className={selCls(showErrors && errors.bank_id)}
                      >
                        <option value="">Select Bank</option>
                        {banks.map((bank) => (
                          <option key={bank.id} value={bank.id}>
                            {bank.bank_name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </Section>

                {/* ── Payment Info ── */}
                <Section
                  icon={IndianRupee}
                  title="Payment Information"
                  color="emerald"
                >
                  <div className="grid grid-cols-4 gap-4">
                    <Field
                      label="Total Due"
                      required
                      error={errors.totalDue}
                      showErrors={showErrors}
                      hint="Auto Collate"
                    >
                      <input
                        type="text"
                        value={formData.totalDue}
                        onChange={(e) =>
                          handleChange("totalDue", e.target.value)
                        }
                        className={inpCls(showErrors && errors.totalDue)}
                        placeholder="₹ 0"
                      />
                    </Field>
                    <Field
                      label="Total Paid"
                      required
                      error={errors.totalPaid}
                      showErrors={showErrors}
                    >
                      <input
                        type="text"
                        value={formData.totalPaid}
                        onChange={(e) =>
                          handleChange("totalPaid", e.target.value)
                        }
                        className={inpCls(showErrors && errors.totalPaid)}
                        placeholder="₹ 0"
                      />
                    </Field>
                    <Field label="Payment Date" required>
                      <input
                        type="date"
                        value={formData.payment_date}
                        onChange={(e) =>
                          handleChange("payment_date", e.target.value)
                        }
                        className={inpCls()}
                      />
                    </Field>
                    <Field label="Pending Due" hint="Auto-calculated">
                      <div
                        className={`w-full border-2 rounded-xl px-3.5 py-2.5 font-black font-mono text-sm transition-all ${
                          hasPending
                            ? "bg-rose-50 border-rose-200 text-rose-600"
                            : formData.totalDue
                            ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                            : "bg-gray-50 border-gray-100 text-gray-400"
                        }`}
                      >
                        ₹ {inr(formData.pendingDue)}
                      </div>
                    </Field>
                  </div>
                  <AnimatePresence>
                    {(formData.totalDue || formData.totalPaid) && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`mt-4 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold border-2 ${
                          hasPending
                            ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "bg-emerald-50 border-emerald-200 text-emerald-700"
                        }`}
                      >
                        {hasPending ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" /> Partial
                            Payment — ₹{inr(formData.pendingDue)} still pending
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
                            — No pending balance
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Section>

                {/* ── Penalties ── */}
                <Section
                  icon={AlertTriangle}
                  title="Interest / Penalties"
                  color="amber"
                >
                  <div className="mb-4">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Any Interest / Penalties
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {["Yes", "No"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            handleChange("anyInterestPenalties", opt)
                          }
                          className={`py-3 rounded-xl font-black text-sm transition-all border-2 ${
                            formData.anyInterestPenalties === opt
                              ? opt === "Yes"
                                ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20"
                                : "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20"
                              : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                          }`}
                        >
                          {opt === "Yes"
                            ? "⚡ Yes, There's a Penalty"
                            : "✓ No Penalty"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <AnimatePresence>
                    {formData.anyInterestPenalties === "Yes" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden space-y-4"
                      >
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <Field
                            label="Amount of Penalty"
                            required
                            error={errors.penaltyAmount}
                            showErrors={showErrors}
                          >
                            <input
                              type="number"
                              value={formData.penaltyAmount}
                              onChange={(e) =>
                                handleChange("penaltyAmount", e.target.value)
                              }
                              className={inpCls(
                                showErrors && errors.penaltyAmount
                              )}
                              placeholder="₹ 0"
                            />
                          </Field>
                          <Field
                            label="Penalty %"
                            required
                            error={errors.penaltyPercentage}
                            showErrors={showErrors}
                          >
                            <input
                              type="number"
                              value={formData.penaltyPercentage}
                              onChange={(e) =>
                                handleChange(
                                  "penaltyPercentage",
                                  e.target.value
                                )
                              }
                              className={inpCls(
                                showErrors && errors.penaltyPercentage
                              )}
                              placeholder="0"
                            />
                          </Field>
                        </div>
                        <div className="pt-4 border-t border-amber-200">
                          <p className="text-[11px] font-black text-amber-800 uppercase tracking-widest mb-3">
                            Cost Head Breakup for Penalties
                          </p>
                          <div className="grid grid-cols-5 gap-2.5">
                            {[
                              "OS",
                              "temp",
                              "recruitment",
                              "projects",
                              "others",
                            ].map((key) => (
                              <div key={key}>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center mb-1.5">
                                  {key}
                                </label>
                                <input
                                  type="number"
                                  value={formData[key]}
                                  onChange={(e) =>
                                    handleChange(key, e.target.value)
                                  }
                                  className="w-full bg-white border-2 border-gray-100 hover:border-gray-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 text-gray-700 text-xs text-center px-2 py-2.5 rounded-xl outline-none font-bold transition-all"
                                  placeholder="0"
                                />
                              </div>
                            ))}
                          </div>
                          <div
                            className={`mt-3 flex items-center justify-between px-4 py-3 rounded-xl border-2 font-black text-sm transition-all ${
                              Math.abs(totalPercentage - 100) < 0.01
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-rose-50 border-rose-200 text-rose-600"
                            }`}
                          >
                            <span>Total Allocation</span>
                            <span>{totalPercentage.toFixed(2)}%</span>
                          </div>
                          {showErrors && errors.costHeadBreakdown && (
                            <p className="flex items-center gap-1 text-[11px] text-rose-500 font-semibold mt-1.5">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              {errors.costHeadBreakdown}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Section>

                {/* ── Remarks ── */}
                <Section icon={StickyNote} title="Remarks" color="gray">
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => handleChange("remarks", e.target.value)}
                    rows={3}
                    className="w-full bg-white border-2 border-gray-100 hover:border-gray-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 text-gray-700 text-sm px-4 py-3 rounded-xl outline-none resize-none transition-all font-medium placeholder:text-gray-300"
                    placeholder="Additional remarks or notes…"
                  />
                </Section>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between pt-2 pb-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-5 py-2.5 border-2 border-gray-100 text-gray-500 text-sm font-bold rounded-xl hover:bg-gray-50 hover:border-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl shadow-lg shadow-cyan-500/25 transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                      </>
                    ) : (
                      <>
                        Save Statutory Payout <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddStatutoryPayoutModal;