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
} from "lucide-react";

import supabase from "../lib/supabaseClient";

const AddInterestPenaltyModal = ({
  isOpen,
  onClose,
  banks = [],
}) => {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split("T")[0],

    penalty_type: "interest",

    bank_id: "",

    amount: "",

    remarks: "",

    status: "unpaid",

    paid_date: "",
  });

  const handleSave = async () => {
    if (!form.amount || !form.bank_id) {
      alert("Please fill all required fields");
      return;
    }

    if (Number(form.amount) <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("interest_penalties")
        .insert([
          {
            entry_date: form.entry_date,

            penalty_type: form.penalty_type,

            bank_id: form.bank_id,

            amount: Number(form.amount),

            remarks: form.remarks,

            status: form.status,

            paid_date:
              form.status === "paid"
                ? form.paid_date
                : null,
          },
        ]);

      if (error) throw error;

      alert("Interest / Penalty Added");

      setForm({
        entry_date: new Date()
          .toISOString()
          .split("T")[0],

        penalty_type: "interest",

        bank_id: "",

        amount: "",

        remarks: "",

        status: "unpaid",

        paid_date: "",
      });

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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* HEADER */}

          <div className="bg-gradient-to-r from-red-600 to-orange-500 p-5 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  Interest / Penalty
                </h2>

                <p className="text-red-100 text-sm">
                  Add financial penalties & interest
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="hover:bg-white/20 p-2 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* BODY */}

          <div className="p-6 space-y-5">

            {/* DATE */}

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Entry Date
              </label>

              <div className="relative">
                <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />

                <input
                  type="date"
                  value={form.entry_date}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      entry_date: e.target.value,
                    })
                  }
                  className="w-full pl-10 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* TYPE */}

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Penalty Type
              </label>

              <select
                value={form.penalty_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    penalty_type: e.target.value,
                  })
                }
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="interest">
                  Interest
                </option>

                <option value="late_payment">
                  Late Payment
                </option>

                <option value="gst_penalty">
                  GST Penalty
                </option>

                <option value="tds_penalty">
                  TDS Penalty
                </option>

                <option value="bank_charge">
                  Bank Charge
                </option>

                <option value="bounce_charge">
                  Bounce Charge
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </div>

            {/* BANK */}

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Bank
              </label>

              <div className="relative">
                <Landmark className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />

                <select
                  value={form.bank_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bank_id: e.target.value,
                    })
                  }
                  className="w-full pl-10 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">
                    Select Bank
                  </option>

                  {banks.map((bank) => (
                    <option
                      key={bank.id}
                      value={bank.id}
                    >
                      {bank.bank_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* AMOUNT */}

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Amount
              </label>

              <div className="relative">
                <IndianRupee className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />

                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: e.target.value,
                    })
                  }
                  placeholder="Enter Amount"
                  className="w-full pl-10 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* STATUS */}

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Status
              </label>

              <div className="grid grid-cols-2 gap-3">

                <button
                  onClick={() =>
                    setForm({
                      ...form,
                      status: "paid",
                    })
                  }
                  className={`border rounded-2xl p-4 flex items-center gap-2 justify-center font-semibold transition ${
                    form.status === "paid"
                      ? "bg-emerald-100 border-emerald-500 text-emerald-700"
                      : "bg-white"
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Paid
                </button>

                <button
                  onClick={() =>
                    setForm({
                      ...form,
                      status: "unpaid",
                    })
                  }
                  className={`border rounded-2xl p-4 flex items-center gap-2 justify-center font-semibold transition ${
                    form.status === "unpaid"
                      ? "bg-rose-100 border-rose-500 text-rose-700"
                      : "bg-white"
                  }`}
                >
                  <XCircle className="w-5 h-5" />
                  Unpaid
                </button>
              </div>
            </div>

            {/* PAID DATE */}

            {form.status === "paid" && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Paid Date
                </label>

                <input
                  type="date"
                  value={form.paid_date}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      paid_date: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}

            {/* REMARKS */}

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Remarks
              </label>

              <div className="relative">
                <FileText className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />

                <textarea
                  rows={3}
                  value={form.remarks}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      remarks: e.target.value,
                    })
                  }
                  placeholder="Enter remarks..."
                  className="w-full pl-10 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          {/* FOOTER */}

          <div className="p-6 pt-0 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 py-3 rounded-2xl font-semibold hover:bg-gray-100 transition"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-red-600 to-orange-500 text-white py-3 rounded-2xl font-semibold hover:opacity-90 transition"
            >
              {loading
                ? "Saving..."
                : "Save Entry"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddInterestPenaltyModal;