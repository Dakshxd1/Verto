import React, { useState, useEffect } from "react";
import supabase from "../lib/supabaseClient";
import { X, ArrowRight, CreditCard, Calendar, FileText } from "lucide-react";
import Card from "./ui/Card";

const AddPaymentMadeModal = ({ isOpen, onClose, invoice, onSaved }) => {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setDate("");
      setRemarks("");
    }
  }, [isOpen]);

  if (!isOpen || !invoice) return null;

  const handleSave = async () => {
    if (!amount || !date) {
      alert("❌ Amount and Date required");
      return;
    }

    const { error } = await supabase.from("payments_made").insert([
      {
        invoice_id: invoice.dbId,
        amount: Number(amount),
        payment_date: date,
        remarks,
      },
    ]);

    if (error) {
      console.error(error);
      alert("❌ Failed to save payment made");
      return;
    }

    alert("✅ Payment Made saved");

    if (onSaved) onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* 🔹 Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CreditCard size={18} /> Payment Made
              </h2>
              <p className="text-xs text-purple-100 mt-1">
                Record outgoing payment
              </p>
            </div>
            <button onClick={onClose}>
              <X className="hover:text-gray-200" />
            </button>
          </div>
        </div>

        {/* 🔹 Invoice Info Card */}
        <div className="p-4">
          <Card className="bg-purple-50 border-purple-100">
            <Card.Content className="p-3">
              <p className="text-xs text-gray-600 uppercase">Invoice</p>
              <p className="font-semibold text-gray-900">{invoice.id}</p>
            </Card.Content>
          </Card>
        </div>

        {/* 🔹 Form */}
        <div className="px-4 pb-4 space-y-4">

          {/* Amount */}
          <div>
            <label className="text-xs text-gray-600 uppercase mb-1 block">
              Amount
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-2.5 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs text-gray-600 uppercase mb-1 block">
              Payment Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-2.5 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="text-xs text-gray-600 uppercase mb-1 block">
              Remarks
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea
                placeholder="Optional notes"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-2.5 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>
        </div>

        {/* 🔹 Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 shadow-lg shadow-purple-500/30"
          >
            Save <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPaymentMadeModal;