import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import Card from "./ui/Card";
import { X, CreditCard, Calendar } from "lucide-react";

const PaymentHistoryDrawer = ({ invoice, isOpen, onClose }) => {
  const [payments, setPayments] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    if (!invoice || !isOpen) return;

    const fetchPayments = async () => {
      const { data, error } = await supabase

        .from("payment_history_view")
        .select("*")
        .eq("invoice_id", invoice.dbId);
      console.log("🔥 INVOICE FULL:", invoice);
      console.log("🔥 USING DB ID:", invoice.dbId);

      if (error) {
        console.error("Payment history error:", error);
        return;
      }

      setPayments(data || []);

      const total = (data || []).reduce(
        (sum, p) => sum + Number(p.amount_received),
        0
      );
      setTotalPaid(total);
    };

    fetchPayments();
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const formatCurrency = (val) => `₹ ${val.toLocaleString("en-IN")}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/10" onClick={onClose} />
      {/* Drawer Panel */}
      <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto animate-slideIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Payment History</h2>
            <p className="text-xs text-gray-500">Invoice: {invoice.id}</p>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500 hover:text-gray-800" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-emerald-50 border-emerald-100">
            <Card.Content className="p-4">
              <p className="text-xs text-gray-600 uppercase">Total Paid</p>
              <p className="text-lg font-bold text-emerald-600">
                {formatCurrency(totalPaid)}
              </p>
            </Card.Content>
          </Card>

          <Card className="bg-blue-50 border-blue-100">
            <Card.Content className="p-4">
              <p className="text-xs text-gray-600 uppercase">Payments</p>
              <p className="text-lg font-bold text-blue-600">
                {payments.length}
              </p>
            </Card.Content>
          </Card>
        </div>

        {/* Payment List */}
        <div className="space-y-3">
          {payments.length === 0 && (
            <div className="text-center text-gray-400 py-10">
              No payments recorded
            </div>
          )}

          {payments.map((p) => (
            <Card key={p.id} className="border-gray-200">
              <Card.Content className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(p.amount_received)}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center mt-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    {p.payment_date}
                  </p>
                  <p className="text-xs text-gray-400">Ref: {p.payment_ref}</p>
                </div>

                <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                  <CreditCard className="w-4 h-4" />
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryDrawer;
