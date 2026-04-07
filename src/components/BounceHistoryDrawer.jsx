import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import Card from "./ui/Card";
import { X, AlertCircle, Calendar } from "lucide-react";

const BounceHistoryDrawer = ({ invoice, isOpen, onClose }) => {
  const [bounces, setBounces] = useState([]);
  const [totalBounce, setTotalBounce] = useState(0);

  useEffect(() => {
    if (!invoice || !isOpen) return;

    const fetchBounce = async () => {
      const { data, error } = await supabase
        .from("bounce_back")
        .select("*")
        .eq("invoice_id", invoice.dbId);

      if (error) {
        console.error("Bounce history error:", error);
        return;
      }

      setBounces(data || []);

      const total = (data || []).reduce(
        (sum, b) => sum + Number(b.amount),
        0
      );
      setTotalBounce(total);
    };

    fetchBounce();
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
            <h2 className="text-lg font-bold">Bounce History</h2>
            <p className="text-xs text-gray-500">Invoice: {invoice.id}</p>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="mb-6">
          <Card className="bg-red-50">
            <Card.Content className="p-4">
              <p className="text-xs">Total Bounce</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(totalBounce)}
              </p>
            </Card.Content>
          </Card>
        </div>

        {/* List */}
        {bounces.map((b) => (
          <Card key={b.id} className="mb-3">
            <Card.Content className="p-4 flex justify-between">
              <div>
                <p className="font-semibold text-red-600">
                  ₹ {b.amount}
                </p>
                <p className="text-xs text-gray-500 flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {b.created_at}
                </p>
              </div>

              <div className="bg-red-100 p-2 rounded">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BounceHistoryDrawer;