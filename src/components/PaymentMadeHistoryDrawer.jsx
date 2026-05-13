import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import Card from "./ui/Card";
import { X, CreditCard, Calendar, Building2, Download, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";

const PaymentMadeHistoryDrawer = ({ invoice, isOpen, onClose }) => {
  const [payments, setPayments] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [exporting, setExporting] = useState(false);

  /* ────── Excel Export Function ────── */
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    /* ── Summary sheet ── */
    const summaryData = [
      ["PAYMENT MADE HISTORY — SUMMARY REPORT"],
      ["Generated On", new Date().toLocaleString("en-IN")],
      ["Invoice Number", invoice.id || invoice.invoice_number || "—"],
      [],
      ["OVERVIEW"],
      ["Total Transactions", payments.length],
      ["Total Amount Paid", totalPaid],
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs["!cols"] = [{ wch: 28 }, { wch: 22 }];

    const titleCell = summaryWs["A1"];
    if (titleCell) {
      titleCell.s = {
        font: { bold: true, sz: 14, color: { rgb: "7c3aed" } },
        fill: { fgColor: { rgb: "ede9fe" } },
      };
    }

    /* ── Detail sheet ── */
    const headers = [
      "#",
      "Payment Date",
      "Amount (₹)",
      "Bank Name",
      "Payment Ref",
      "Remarks",
    ];

    const detail = payments.map((p, i) => [
      i + 1,
      p.payment_date || "—",
      Number(p.amount_paid ?? 0),
      p.bank_name || "—",
      p.payment_ref || "—",
      p.remarks || "—",
    ]);

    const detailWs = XLSX.utils.aoa_to_sheet([headers, ...detail]);

    /* make details sheet the default visible tab */
    wb.Workbook = wb.Workbook || {};
    wb.Workbook.Views = [{ activeTab: 0 }];

    XLSX.utils.book_append_sheet(wb, detailWs, "Payment Details");
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    /* header row style */
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
      fill: { fgColor: { rgb: "7c3aed" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: { bottom: { style: "medium", color: { rgb: "7c3aed" } } },
    };

    headers.forEach((_, ci) => {
      const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
      if (!detailWs[addr]) detailWs[addr] = { v: headers[ci], t: "s" };
      detailWs[addr].s = headerStyle;
    });

    /* data row alternate shading + amount formatting */
    detail.forEach((row, ri) => {
      const isAlt = ri % 2 === 0;
      row.forEach((_, ci) => {
        const addr = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
        if (!detailWs[addr]) return;
        detailWs[addr].s = {
          fill: { fgColor: { rgb: isAlt ? "f5f3ff" : "FFFFFF" } },
          alignment: {
            horizontal: ci === 2 ? "right" : ci === 0 ? "center" : "left",
            vertical: "center",
          },
          font: {
            color: { rgb: ci === 2 ? "7c3aed" : "1E293B" },
            bold: ci === 2,
          },
          border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } },
        };
        if (ci === 2) detailWs[addr].z = "#,##0";
      });
    });

    /* totals row */
    const totalRow = detail.length + 1;
    const totalsData = ["", "TOTAL", totalPaid, "", "", ""];
    totalsData.forEach((v, ci) => {
      const addr = XLSX.utils.encode_cell({ r: totalRow, c: ci });
      detailWs[addr] = {
        v,
        t: typeof v === "number" ? "n" : "s",
        s: {
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
          fill: { fgColor: { rgb: "7c3aed" } },
          alignment: { horizontal: ci === 2 ? "right" : "left" },
          border: { top: { style: "medium", color: { rgb: "7c3aed" } } },
        },
      };
      if (ci === 2) detailWs[addr].z = "#,##0";
    });

    detailWs["!ref"] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: totalRow, c: 5 });
    detailWs["!cols"] = [
      { wch: 4 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 30 },
    ];
    detailWs["!rows"] = [{ hpt: 25 }];

    XLSX.utils.book_append_sheet(wb, detailWs, "Payment Details");

    const invoiceNum = invoice.id || invoice.invoice_number || "Invoice";
    XLSX.writeFile(
      wb,
      `Payment_Made_${invoiceNum}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const handleExport = () => {
    if (payments.length === 0) {
      alert("No payments to export");
      return;
    }
    setExporting(true);
    try {
      exportToExcel();
    } catch (error) {
      console.error("Payment made export failed:", error);
      alert("Export failed. Check console for details.");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!invoice || !isOpen) return;

    const fetchPayments = async () => {
      const { data, error } = await supabase
        .from("payment_made_view")
        .select("*")
        .eq("invoice_id", invoice.dbId);

      console.log("🔥 PAYMENT MADE INVOICE FULL:", invoice);
      console.log("🔥 USING DB ID:", invoice.dbId);

      if (error) {
        console.error("Payment made history error:", error);
        return;
      }

      setPayments(data || []);

      const total = (data || []).reduce(
        (sum, p) => sum + Number(p.amount_paid ?? 0),
        0
      );
      setTotalPaid(total);
    };

    fetchPayments();
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const formatCurrency = (val) => `₹ ${Number(val).toLocaleString("en-IN")}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/10" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto animate-slideIn">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Payment Made History</h2>
            <p className="text-xs text-gray-500">Invoice: {invoice.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting || payments.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export all payments to Excel"
            >
              {exporting ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              Export
            </button>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-gray-500 hover:text-gray-800" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-rose-50 border-rose-100">
            <Card.Content className="p-4">
              <p className="text-xs text-gray-600 uppercase">Total Paid Out</p>
              <p className="text-lg font-bold text-rose-600">
                {formatCurrency(totalPaid)}
              </p>
            </Card.Content>
          </Card>

          <Card className="bg-blue-50 border-blue-100">
            <Card.Content className="p-4">
              <p className="text-xs text-gray-600 uppercase">Transactions</p>
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
              No payments made recorded
            </div>
          )}

          {payments.map((p) => (
            <Card key={p.id} className="border-gray-200">
              <Card.Content className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(p.amount_paid ?? 0)}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center mt-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    {p.payment_date}
                  </p>
                  {p.payment_ref && (
                    <p className="text-xs text-gray-400">Ref: {p.payment_ref}</p>
                  )}
                  {p.bank_name && (
                    <p className="text-xs text-gray-400 flex items-center mt-0.5">
                      <Building2 className="w-3 h-3 mr-1" />
                      {p.bank_name}
                    </p>
                  )}
                </div>

                <div className="bg-rose-100 text-rose-600 p-2 rounded-lg">
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

export default PaymentMadeHistoryDrawer;