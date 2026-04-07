import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import Card from "./ui/Card";
import { X, FileText, Calendar } from "lucide-react";

const CNHistoryDrawer = ({ invoice, isOpen, onClose }) => {
  const [cns, setCns] = useState([]);
  const [totalCN, setTotalCN] = useState(0);

  useEffect(() => {
    if (!invoice || !isOpen) return;

    const fetchCN = async () => {
      const { data, error } = await supabase
        .from("credit_note_bad_debt")
        .select("*")
        .eq("invoice_id", invoice.dbId);

      if (error) {
        console.error("CN error:", error);
        return;
      }

      setCns(data || []);

      const total = (data || []).reduce(
        (sum, c) => sum + Number(c.amount),
        0
      );
      setTotalCN(total);
    };

    fetchCN();
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const formatCurrency = (val) => `₹ ${val.toLocaleString("en-IN")}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/10" onClick={onClose} />

      <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold">CN / Bad Debt</h2>
            <p className="text-xs text-gray-500">Invoice: {invoice.id}</p>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="mb-6">
          <Card className="bg-orange-50">
            <Card.Content className="p-4">
              <p className="text-xs">Total CN</p>
              <p className="text-lg font-bold text-orange-600">
                {formatCurrency(totalCN)}
              </p>
            </Card.Content>
          </Card>
        </div>

        {/* List */}
        {cns.map((c) => (
          <Card key={c.id} className="mb-3">
            <Card.Content className="p-4 flex justify-between">
              <div>
                <p className="font-semibold text-orange-600">
                  ₹ {c.amount}
                </p>
                <p className="text-xs text-gray-500 flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {c.created_at}
                </p>
              </div>

              <div className="bg-orange-100 p-2 rounded">
                <FileText className="w-4 h-4 text-orange-600" />
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CNHistoryDrawer;