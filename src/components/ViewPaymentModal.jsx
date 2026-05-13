import React, { useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import * as XLSX from "xlsx";
import {
  X,
  Download,
  Eye,
  Search,
  Calendar,
  Building2,
  FileText,
  CreditCard,
  CheckCircle,
  XCircle,
  TrendingDown,
  RefreshCw,
  ChevronDown,
  Filter,
  AlertCircle,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const fmt = (v) =>
  `₹ ${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const TYPE_COLORS = {
  Invoice:    { bg: "bg-indigo-50",  text: "text-indigo-700",  dot: "bg-indigo-400"  },
  "Petty Cash": { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"   },
  Other:      { bg: "bg-slate-100", text: "text-slate-600",  dot: "bg-slate-400"  },
};

const Badge = ({ type }) => {
  const c = TYPE_COLORS[type] || TYPE_COLORS.Other;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {type}
    </span>
  );
};

const BillablePill = ({ v }) =>
  v ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">
      <CheckCircle size={10} /> Billable
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
      <XCircle size={10} /> Non-Bill
    </span>
  );

/* ─────────────────────────────────────────────
   Excel Export
───────────────────────────────────────────── */
const exportToExcel = (rows) => {
  const wb = XLSX.utils.book_new();

  /* ── Summary sheet ── */
  const totalAmount   = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const billableSum   = rows.filter((r) => r.is_billable).reduce((s, r) => s + Number(r.amount || 0), 0);
  const nonBillable   = totalAmount - billableSum;
  const invoiceCount  = rows.filter((r) => r.payment_type === "Invoice").length;
  const pettyCash     = rows.filter((r) => r.payment_type === "Petty Cash").length;
  const otherCount    = rows.filter((r) => r.payment_type === "Other").length;

  const summaryData = [
    ["PAYMENT MADE — SUMMARY REPORT"],
    ["Generated On", new Date().toLocaleString("en-IN")],
    [],
    ["OVERVIEW"],
    ["Total Records",      rows.length],
    ["Total Amount Paid",  totalAmount],
    ["Billable Amount",    billableSum],
    ["Non-Billable Amount",nonBillable],
    [],
    ["PAYMENT TYPE BREAKDOWN"],
    ["Invoice Payments",   invoiceCount],
    ["Petty Cash",         pettyCash],
    ["Other Payments",     otherCount],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);

  /* column widths */
  summaryWs["!cols"] = [{ wch: 28 }, { wch: 22 }];

  /* styles via cell metadata */
  const titleCell = summaryWs["A1"];
  if (titleCell) {
    titleCell.s = {
      font:      { bold: true, sz: 16, color: { rgb: "312E81" } },
      fill:      { fgColor: { rgb: "EEF2FF" } },
      alignment: { horizontal: "left" },
    };
  }
  ["A4", "A10"].forEach((addr) => {
    if (summaryWs[addr])
      summaryWs[addr].s = { font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "312E81" } } };
  });

/* ── Detail sheet ── */
  const headers = [
    "#",
    "Payment Date",
    "Payment Type",
    "Invoice Number",
    "Client Name",
    "Bank",
    "Amount (₹)",
    "Billable",
    "Transfer Amount (₹)",
    "Remarks",
  ];

  const detail = rows.map((r, i) => [
    i + 1,
    fmtDate(r.payment_date),
    r.payment_type || "—",
    r.invoice_number || "—",
    r.client_name || "—",
    r.bank_master?.bank_name || "—",
    Number(r.amount || 0),
    r.is_billable ? "Yes" : "No",
    Number(r.transfer_amount || 0),
    r.remarks || "",
  ]);

  const detailWs = XLSX.utils.aoa_to_sheet([headers, ...detail]);

  /* make details sheet the default visible tab */
  wb.Workbook = wb.Workbook || {};
  wb.Workbook.Views = [{ activeTab: 0 }];

  /* header row style */
  const headerStyle = {
    font:      { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
    fill:      { fgColor: { rgb: "1E1B4B" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      bottom: { style: "medium", color: { rgb: "6366F1" } },
    },
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
        fill: { fgColor: { rgb: isAlt ? "F5F3FF" : "FFFFFF" } },
        alignment: {
          horizontal: ci === 6 || ci === 8 ? "right" : ci === 0 ? "center" : "left",
          vertical: "center",
        },
        font: {
          color: { rgb: ci === 6 ? "312E81" : "1E293B" },
          bold: ci === 6,
        },
        border: {
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        },
      };
      /* number format for amount cols */
      if (ci === 6 || ci === 8) {
        detailWs[addr].z = '#,##0';
      }
    });
  });

  /* totals row */
  const totalRow = detail.length + 1;
  const totalsData = ["", "TOTAL", "", "", "", "", totalAmount, "", billableSum, ""];
  totalsData.forEach((v, ci) => {
    const addr = XLSX.utils.encode_cell({ r: totalRow, c: ci });
    detailWs[addr] = {
      v,
      t: typeof v === "number" ? "n" : "s",
      s: {
        font:      { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
        fill:      { fgColor: { rgb: "312E81" } },
        alignment: { horizontal: ci === 6 || ci === 8 ? "right" : "left" },
        border:    { top: { style: "medium", color: { rgb: "6366F1" } } },
      },
    };
    if (ci === 6 || ci === 8) detailWs[addr].z = '#,##0';
  });

  detailWs["!ref"] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: totalRow, c: 9 });
  detailWs["!cols"] = [
    { wch: 4 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 22 },
    { wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 30 },
  ];
  detailWs["!rows"] = [{ hpt: 30 }]; // header row height

  XLSX.utils.book_append_sheet(wb, detailWs, "Payment Details");
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  XLSX.writeFile(wb, `Payments_Made_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const ViewPaymentModal = ({ isOpen, onClose, invoice }) => {
  const [payments, setPayments]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState("");
  const [filterType, setFilterType]   = useState("All");
  const [filterBill, setFilterBill]   = useState("All");
  const [exporting, setExporting]     = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("payments_made")
      .select("*, bank_master(bank_name)")
      .order("payment_date", { ascending: false });

    if (invoice?.id)             q = q.eq("invoice_id", invoice.id);
    else if (invoice?.invoice_number) q = q.eq("invoice_number", invoice.invoice_number);

    const { data, error } = await q;
    if (!error) setPayments(data || []);
    setLoading(false);
  }, [invoice]);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setFilterType("All");
      setFilterBill("All");
      fetchPayments();
    }
  }, [isOpen, fetchPayments]);

  if (!isOpen) return null;

  /* ── filtered rows ── */
  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (p.invoice_number || "").toLowerCase().includes(q) ||
      (p.client_name || "").toLowerCase().includes(q) ||
      (p.remarks || "").toLowerCase().includes(q) ||
      (p.bank_master?.bank_name || "").toLowerCase().includes(q);

    const matchType = filterType === "All" || p.payment_type === filterType;
    const matchBill =
      filterBill === "All" ||
      (filterBill === "Billable" && p.is_billable) ||
      (filterBill === "Non-Billable" && !p.is_billable);

    return matchSearch && matchType && matchBill;
  });

  const totalShown = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);

  const handleExport = () => {
    setExporting(true);
    try {
      exportToExcel(filtered);
    } catch (error) {
      console.error("Payment export failed:", error);
      alert("Export failed. Check console for details.");
    } finally {
      setExporting(false);
    }
  };

  /* ────────────────── RENDER ────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[2px]">
      <div
        className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "96vh" }}
      >
        {/* ── HEADER ── */}
        <div
          className="relative p-6 pb-5 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%)" }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
          <div className="absolute bottom-0 left-16 w-20 h-20 bg-indigo-500/10 rounded-full translate-y-8" />

          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                  <Eye size={16} className="text-white" />
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">Payment History</h2>
              </div>
              <p className="text-indigo-300 text-xs ml-10">
                {invoice
                  ? `Payments for ${invoice.invoice_number || "this invoice"}`
                  : "All outgoing payments"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                disabled={exporting || filtered.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all disabled:opacity-40"
              >
                {exporting ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                Export Excel
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X size={15} className="text-white/80" />
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="relative mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Records",      value: filtered.length,  icon: FileText   },
              { label: "Total Paid",   value: fmt(totalShown),  icon: TrendingDown },
              { label: "Billable",
                value: filtered.filter((r) => r.is_billable).length + " items",
                icon: CheckCircle },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="bg-white/10 border border-white/15 rounded-2xl px-3 py-2.5 flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={12} className="text-indigo-300" />
                </div>
                <div>
                  <p className="text-[9px] text-indigo-400 uppercase tracking-widest font-bold">{label}</p>
                  <p className="text-white text-xs font-bold leading-none mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FILTERS ── */}
        <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-slate-100 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search invoice, client, bank, remarks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
            />
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={12} className="text-slate-400" />
            {["All", "Invoice", "Petty Cash", "Other"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                  filterType === t
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
            <div className="w-px h-4 bg-slate-200 mx-1" />
            {["All", "Billable", "Non-Billable"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterBill(t)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                  filterBill === t
                    ? "bg-violet-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── TABLE ── */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
              <p className="text-sm text-slate-400">Fetching payments…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <AlertCircle size={20} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 font-medium">No payments found</p>
              <p className="text-xs text-slate-400">Try adjusting filters or search</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr>
                  {["Date", "Type", "Invoice / Client", "Bank", "Amount", "Billable", "Remarks"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-slate-100 hover:bg-indigo-50/40 transition-colors ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    }`}
                  >
                    {/* Date */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-300" />
                        <span className="text-slate-600 text-xs">{fmtDate(p.payment_date)}</span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <Badge type={p.payment_type || "Other"} />
                    </td>

                    {/* Invoice / Client */}
                    <td className="px-4 py-3 max-w-[160px]">
                      {p.invoice_number ? (
                        <div>
                          <p className="font-semibold text-slate-800 text-xs truncate">{p.invoice_number}</p>
                          {p.client_name && (
                            <p className="text-[10px] text-slate-400 truncate">{p.client_name}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Bank */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={11} className="text-slate-300" />
                        <span className="text-xs text-slate-600">{p.bank_master?.bank_name || "—"}</span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="font-bold text-indigo-700 text-sm">{fmt(p.amount)}</span>
                    </td>

                    {/* Billable */}
                    <td className="px-4 py-3">
                      <BillablePill v={p.is_billable} />
                    </td>

                    {/* Remarks */}
                    <td className="px-4 py-3 max-w-[160px]">
                      <span className="text-xs text-slate-500 truncate block" title={p.remarks}>
                        {p.remarks || <span className="text-slate-300">—</span>}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Totals footer */}
              <tfoot className="sticky bottom-0 bg-indigo-900 border-t-2 border-indigo-600">
                <tr>
                  <td colSpan={4} className="px-4 py-3">
                    <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest">
                      Total ({filtered.length} records)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-white text-base">{fmt(totalShown)}</span>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="flex-shrink-0 px-5 pb-6 pt-3 border-t border-slate-100 flex items-center gap-3">
          <button
            onClick={fetchPayments}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20"
          >
            {exporting ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Download size={13} />
            )}
            Download Excel
          </button>
          <button
            onClick={onClose}
            className="ml-auto flex-1 max-w-[120px] py-2.5 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors text-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewPaymentModal;