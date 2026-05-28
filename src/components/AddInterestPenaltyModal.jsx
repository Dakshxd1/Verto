import React, { useState } from "react";
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
} from "lucide-react";

import supabase from "../lib/supabaseClient";

const ENTITIES = [
  "Verto India Pvt Ltd",
  "Verto Global LLC",
  "Verto UK Ltd",
];

const EMPTY_FORM = {
  entry_date: new Date().toISOString().split("T")[0],
  penalty_type: "interest",
  entity: "Verto India Pvt Ltd",
  bank_id: "",
  amount: "",
  remarks: "",
  status: "unpaid",
  paid_date: "",
};

const AddInterestPenaltyModal = ({ isOpen, onClose, banks = [] }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
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
          className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        >
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
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-100 transition"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
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
                <select
                  value={form.entity}
                  onChange={(e) => set("entity", e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 outline-none transition focus:border-red-500 focus:bg-white"
                >
                  {ENTITIES.map((e) => (
                    <option key={e} value={e}>
                      {e}
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
              disabled={loading}
              className="flex-1 rounded-2xl bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddInterestPenaltyModal;