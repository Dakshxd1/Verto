import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Landmark,
  IndianRupee,
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  X,
  Building2,
  Eye,
  ChevronLeft,
  Trash2,
  Loader2,
  RefreshCcw,
} from "lucide-react";

import supabase from "../lib/supabaseClient";
import { usePerms } from "../context/PermissionsContext";

// CHANGE 1: Removed hardcoded ENTITIES array

const EMPTY_FORM = {
  entry_date: new Date().toISOString().split("T")[0],
  penalty_type: "interest",
  entity: "", // CHANGE 4: Empty default instead of hardcoded entity
  bank_id: "",
  amount: "",
  remarks: "",
  status: "unpaid",
  paid_date: "",
};

// ─── Inline Records Panel ──────────────────────────────────────────────────────
const InterestPenaltyRecordsPanel = ({ onClose, banks = [] }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("interest_penalties")
        .select("id, entry_date, penalty_type, entity, bank_id, amount, remarks, status, paid_date, reference_no")
        .order("entry_date", { ascending: false });
      setRecords(data || []);
    } catch (error) {
      console.error("Error fetching records:", error);
      showToast("Failed to load records", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchRecords(); 
  }, []);

  const handleDelete = async (id) => {
    setConfirmId(null);
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("interest_penalties")
        .delete()
        .eq("id", id);
      if (error) throw error;
      showToast("Record deleted successfully");
      await fetchRecords();
      window.refreshDashboard?.();
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const getBankName = (bankId) => {
    const bank = banks.find((b) => b.id === bankId);
    return bank?.bank_name || "—";
  };

  const totalAmount = records.reduce((s, r) => s + Number(r.amount || 0), 0);

  const typeLabel = (t) => ({
    interest: "Interest",
    late_payment: "Late Payment",
    gst_penalty: "GST Penalty",
    tds_penalty: "TDS Penalty",
    bank_charge: "Bank Charge",
    bounce_charge: "Bounce Charge",
    other: "Other",
  }[t] || t);

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "tween", duration: 0.25 }}
      className="absolute inset-0 bg-white z-10 flex flex-col rounded-3xl overflow-hidden"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0 bg-red-50">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-semibold">Back</span>
          </button>
          <div className="w-px h-4 bg-red-200" />
          <div>
            <h3 className="text-sm font-bold text-gray-900">Interest & Penalty Records</h3>
            <p className="text-red-500 text-xs">
              {records.length} total · ₹ {totalAmount.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Records List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading...
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <RefreshCcw className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No records yet</p>
          </div>
        ) : (
          records.map((row) => (
            <div
              key={row.id}
              className={`bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm transition-opacity ${
                deletingId === row.id ? "opacity-40 pointer-events-none" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Top row: type badge + amount */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                      {typeLabel(row.penalty_type)}
                    </span>
                    <span className="font-bold text-red-600 text-sm">
                      ₹ {Number(row.amount || 0).toLocaleString("en-IN")}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      row.status === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {row.status === "paid" ? "Paid" : "Unpaid"}
                    </span>
                  </div>

                  {/* Middle row: bank + entity */}
                  <p className="text-xs text-gray-600 mt-1">
                    {getBankName(row.bank_id)}
                    {row.entity && (
                      <span className="text-gray-400"> · {row.entity}</span>
                    )}
                  </p>

                  {/* Bottom row: dates + remarks */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {row.entry_date && (
                      <span className="text-[10px] text-gray-400">
                        Entry: {new Date(row.entry_date).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </span>
                    )}
                    {row.paid_date && (
                      <span className="text-[10px] text-emerald-600">
                        Paid: {new Date(row.paid_date).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </span>
                    )}
                    {row.remarks && (
                      <span className="text-[10px] text-gray-400 italic truncate max-w-[140px]">
                        {row.remarks}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete / Confirm */}
                <div className="flex-shrink-0">
                  {deletingId === row.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                  ) : confirmId === row.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-2 py-1 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(row.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold border border-red-100 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`absolute bottom-4 left-4 right-4 flex items-center gap-2 px-4 py-3 rounded-xl text-white text-xs font-semibold shadow-lg ${
              toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
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

const AddInterestPenaltyModal = ({ isOpen, onClose, banks = [] }) => {
  const { isIntern } = usePerms?.() || {};
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [viewOpen, setViewOpen] = useState(false);
  // CHANGE 2: Added entitiesList state
  const [entitiesList, setEntitiesList] = useState([]);

  // CHANGE 3: Added useEffect to fetch entities from entity_master
  useEffect(() => {
    const fetchEntities = async () => {
      const { data } = await supabase
        .from("entity_master")
        .select("id, entity_name")
        .order("entity_name");
      if (data) setEntitiesList(data);
    };
    if (isOpen) fetchEntities();
  }, [isOpen]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (isIntern) return;
    if (!form.amount || !form.bank_id) {
      alert("Bank and Amount are required.");
      return;
    }
    if (Number(form.amount) <= 0) {
      alert("Amount must be greater than 0.");
      return;
    }
    if (form.status === "paid" && !form.paid_date) {
      alert("Please enter the Paid Date.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("interest_penalties").insert([
        {
          entry_date: form.entry_date,
          penalty_type: form.penalty_type,
          entity: form.entity || null,
          bank_id: form.bank_id,
          amount: Number(form.amount),
          remarks: form.remarks || null,
          status: form.status,
          paid_date: form.status === "paid" ? form.paid_date : null,
        },
      ]);

      if (error) throw error;

      alert("Interest / Penalty Added");
      setForm(EMPTY_FORM);
      setViewOpen(false);
      onClose();
      window.refreshDashboard?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl relative"
        >
          {/* ── Inline records panel slides over form ── */}
          <AnimatePresence>
            {viewOpen && (
              <InterestPenaltyRecordsPanel
                onClose={() => setViewOpen(false)}
                banks={banks}
              />
            )}
          </AnimatePresence>

          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Add Interest / Penalty
                </h2>
                <p className="text-sm text-gray-500">Record charges and penalties</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold border border-red-100 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                View Records
              </button>
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* BODY */}
          <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">

            {/* DATE + TYPE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Entry Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={form.entry_date}
                    onChange={(e) => set("entry_date", e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 outline-none transition focus:border-red-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Penalty Type
                </label>
                <select
                  value={form.penalty_type}
                  onChange={(e) => set("penalty_type", e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition focus:border-red-500 focus:bg-white"
                >
                  <option value="interest">Interest</option>
                  <option value="late_payment">Late Payment</option>
                  <option value="gst_penalty">GST Penalty</option>
                  <option value="tds_penalty">TDS Penalty</option>
                  <option value="bank_charge">Bank Charge</option>
                  <option value="bounce_charge">Bounce Charge</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* ENTITY */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Entity
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                {/* CHANGE 5: Updated entity dropdown to use entitiesList */}
                <select
                  value={form.entity}
                  onChange={(e) => set("entity", e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 outline-none transition focus:border-red-500 focus:bg-white"
                >
                  <option value="">Select Entity</option>
                  {entitiesList.map((entity) => (
                    <option key={entity.id} value={entity.entity_name}>
                      {entity.entity_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* BANK */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Select Bank <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Landmark className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                <select
                  value={form.bank_id}
                  onChange={(e) => set("bank_id", e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 outline-none transition focus:border-red-500 focus:bg-white"
                >
                  <option value="">Choose Bank</option>
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bank_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* AMOUNT */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  placeholder="Enter amount"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 outline-none transition focus:border-red-500 focus:bg-white"
                />
              </div>
            </div>

            {/* STATUS */}
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-700">
                Payment Status
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => set("status", "paid")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 font-medium transition ${
                    form.status === "paid"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Paid
                </button>

                <button
                  type="button"
                  onClick={() => set("status", "unpaid")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 font-medium transition ${
                    form.status === "unpaid"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <XCircle className="h-5 w-5" />
                  Unpaid
                </button>
              </div>
            </div>

            {/* PAID DATE — only when paid */}
            {form.status === "paid" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Paid Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={form.paid_date}
                    onChange={(e) => set("paid_date", e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 outline-none transition focus:border-red-500 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* REMARKS */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Remarks
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                <textarea
                  rows={3}
                  value={form.remarks}
                  onChange={(e) => set("remarks", e.target.value)}
                  placeholder="Add remarks..."
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 outline-none transition focus:border-red-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex gap-3 border-t border-gray-100 p-6">
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl border border-gray-300 py-3 font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || isIntern}
              className={`flex-1 rounded-2xl py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 ${
                isIntern ? "bg-red-300 cursor-not-allowed" : "bg-red-600"
              }`}
            >
              {loading ? "Saving..." : isIntern ? "Intern — View Only" : "Save Entry"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddInterestPenaltyModal;