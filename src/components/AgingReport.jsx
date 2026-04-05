import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import Card from "./ui/Card";
import { AlertCircle } from "lucide-react";

const AgingReport = () => {
  const [buckets, setBuckets] = useState({
    b0_30: 0,
    b31_60: 0,
    b61_plus: 0,
  });

  const fetchAging = async () => {
    const { data, error } = await supabase
      .from("outstanding_invoice_view")
      .select("outstanding, delay_days");

    if (error) {
      console.error("Aging fetch error:", error);
      return;
    }

    let b0_30 = 0,
      b31_60 = 0,
      b61_plus = 0;

    data.forEach((inv) => {
      if (inv.delay_days <= 30) b0_30 += inv.outstanding;
      else if (inv.delay_days <= 60) b31_60 += inv.outstanding;
      else b61_plus += inv.outstanding;
    });

    setBuckets({ b0_30, b31_60, b61_plus });
  };

  useEffect(() => {
    fetchAging();
  }, []);

  const formatCurrency = (val) => `₹ ${val.toLocaleString("en-IN")}`;

  return (
    <Card className="bg-white border-gray-200">
      <Card.Content className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wider">
              Aging Report
            </p>
            <p className="text-sm text-gray-500">
              Outstanding by delay buckets
            </p>
          </div>
          <AlertCircle className="w-5 h-5 text-amber-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 0–30 */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <p className="text-xs text-gray-600 uppercase">0–30 Days</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">
              {formatCurrency(buckets.b0_30)}
            </p>
          </div>

          {/* 31–60 */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs text-gray-600 uppercase">31–60 Days</p>
            <p className="text-xl font-bold text-amber-600 mt-1">
              {formatCurrency(buckets.b31_60)}
            </p>
          </div>

          {/* 61+ */}
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
            <p className="text-xs text-gray-600 uppercase">61+ Days</p>
            <p className="text-xl font-bold text-rose-600 mt-1">
              {formatCurrency(buckets.b61_plus)}
            </p>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
};

export default AgingReport;