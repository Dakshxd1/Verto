import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import Card from "./ui/Card";
import { ArrowLeft, Calendar, TrendingUp, AlertCircle } from "lucide-react";

const LedgerPage = () => {
  const [ledger, setLedger] = useState([]);
  const [opening, setOpening] = useState(0);
  const [invoice, setInvoice] = useState(null);
  const [outstanding, setOutstanding] = useState(0);

  // 🔥 Get invoice from dashboard
  useEffect(() => {
    setInvoice(window.ledgerInvoice);
  }, []);

  useEffect(() => {
    if (!invoice) return;

    const fetchLedger = async () => {
      const { data: inv } = await supabase
        .from("invoices")
        .select("id, receivable_amount")
        .eq("id", invoice.dbId)
        .single();

      if (!inv) return;

      setOpening(inv.receivable_amount);

      const [payments, bounces, cns] = await Promise.all([
        supabase.from("payments_received").select("*").eq("invoice_id", invoice.dbId),
        supabase.from("bounce_back").select("*").eq("invoice_id", invoice.dbId),
        supabase.from("credit_note_bad_debt").select("*").eq("invoice_id", invoice.dbId),
      ]);

      let rows = [];

      payments.data?.forEach((p) =>
        rows.push({
          type: "Payment",
          amount: -Number(p.amount_received),
          date: p.payment_date,
        })
      );

      bounces.data?.forEach((b) =>
        rows.push({
          type: "Bounce",
          amount: +Number(b.amount),
          date: b.created_at,
        })
      );

      cns.data?.forEach((c) =>
        rows.push({
          type: "CN",
          amount: -Number(c.amount),
          date: c.created_at,
        })
      );

      rows.sort((a, b) => new Date(a.date) - new Date(b.date));

      let balance = inv.receivable_amount;

      const finalLedger = rows.map((r) => {
        balance += r.amount;
        return { ...r, balance };
      });

      setLedger(finalLedger);
      setOutstanding(balance); // 🔥 final balance
    };

    fetchLedger();
  }, [invoice]);

  const formatCurrency = (val) => `₹ ${Number(val).toLocaleString("en-IN")}`;

  if (!invoice) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* 🔥 HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.setActiveTab("dashboard")}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Ledger View
            </h1>
            <p className="text-xs text-gray-500">
              Invoice: {invoice.id}
            </p>
          </div>
        </div>
      </div>

      {/* 🔥 SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-blue-50 border-blue-100">
          <Card.Content className="p-4">
            <p className="text-xs text-gray-600 uppercase">
              Opening Balance
            </p>
            <p className="text-lg font-bold text-blue-600">
              {formatCurrency(opening)}
            </p>
          </Card.Content>
        </Card>

        <Card className="bg-purple-50 border-purple-100">
          <Card.Content className="p-4">
            <p className="text-xs text-gray-600 uppercase">
              Final Outstanding
            </p>
            <p className="text-lg font-bold text-purple-600">
              {formatCurrency(outstanding)}
            </p>
          </Card.Content>
        </Card>
      </div>

      {/* 🔥 LEDGER LIST */}
      <div className="space-y-3">

        {ledger.length === 0 && (
          <div className="text-center text-gray-400 py-10">
            No transactions found
          </div>
        )}

        {ledger.map((row, i) => (
          <Card key={i} className="border-gray-200">
            <Card.Content className="p-4 flex items-center justify-between">

              <div>
                <p className={`font-semibold ${
                  row.type === "Bounce"
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}>
                  {row.type === "Bounce" ? "+" : "-"} {formatCurrency(Math.abs(row.amount))}
                </p>

                <p className="text-xs text-gray-500 flex items-center mt-1">
                  <Calendar className="w-3 h-3 mr-1" />
                  {row.date}
                </p>

                <p className="text-xs text-gray-400">
                  {row.type}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-500">Balance</p>
                <p className="font-bold text-gray-900">
                  {formatCurrency(row.balance)}
                </p>
              </div>

              {/* ICON */}
              <div className={`p-2 rounded-lg ${
                row.type === "Bounce"
                  ? "bg-red-100"
                  : "bg-emerald-100"
              }`}>
                {row.type === "Bounce" ? (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                )}
              </div>

            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LedgerPage;