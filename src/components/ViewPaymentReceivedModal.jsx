import React, { useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import {
  X,
  Eye,
  Search,
  Download,
  RefreshCw,
  Building2,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  TrendingUp,
  Layers,
  Users,
  ArrowDownCircle,
} from "lucide-react";

import supabase from "../lib/supabaseClient";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const fmt = (v) =>
  `₹ ${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const TypeBadge = ({ type }) => {
  const isInvoice = type === "invoice";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
        isInvoice
          ? "bg-emerald-100 text-emerald-700"
          : "bg-teal-100 text-teal-700"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isInvoice ? "bg-emerald-500" : "bg-teal-500"
        }`}
      />
      {isInvoice ? "Invoice" : "Advance"}
    </span>
  );
};

/* ─────────────────────────────────────────────
   Excel Export
───────────────────────────────────────────── */
const exportToExcel = (rows) => {
  const wb = XLSX.utils.book_new();

  const invoiceRows = rows.filter((r) => r._type === "invoice");
  const advanceRows = rows.filter((r) => r._type === "advance");
  const totalAmount = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const invoiceTotal = invoiceRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const advanceTotal = advanceRows.reduce((s, r) => s + Number(r.amount || 0), 0);

  /* ── Summary sheet ── */
  const summaryData = [
    ["PAYMENT RECEIVED — SUMMARY REPORT"],
    ["Generated On", new Date().toLocaleString("en-IN")],
    [],
    ["OVERVIEW"],
    ["Total Records",         rows.length],
    ["Total Amount Received", totalAmount],
    ["Invoice Payments",      invoiceTotal],
    ["Advance Payments",      advanceTotal],
    [],
    ["BREAKDOWN"],
    ["Invoice Payment Count", invoiceRows.length],
    ["Advance Payment Count", advanceRows.length],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 28 }, { wch: 22 }];
  if (summaryWs["A1"])
    summaryWs["A1"].s = {
      font:      { bold: true, sz: 16, color: { rgb: "064E3B" } },
      fill:      { fgColor: { rgb: "ECFDF5" } },
      alignment: { horizontal: "left" },
    };
  ["A4", "A10"].forEach((addr) => {
    if (summaryWs[addr])
      summaryWs[addr].s = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "059669" } },
      };
  });

  /* ── Detail sheet ── */
  const headers = [
    "#", "Type", "Payment Ref", "Invoice Number",
    "Client", "Ledger", "Entity", "Department",
    "Amount (₹)", "Payment Date", "Bank", "Remarks",
  ];

  const detail = rows.map((r, i) => [
    i + 1,
    r._type === "invoice" ? "Invoice" : "Advance",
    r.payment_ref     || "—",
    r.invoice_number  || "—",
    r.client_name     || "—",
    r.ledger_name     || "—",
    r.entity_name     || "—",
    r.department_name || "—",
    Number(r.amount || 0),
    fmtDate(r.payment_date),
    r.bank_name || "—",
    r.remarks   || "",
  ]);

  const detailWs = XLSX.utils.aoa_to_sheet([headers, ...detail]);

  const headerStyle = {
    font:      { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
    fill:      { fgColor: { rgb: "064E3B" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border:    { bottom: { style: "medium", color: { rgb: "10B981" } } },
  };
  headers.forEach((_, ci) => {
    const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
    if (!detailWs[addr]) detailWs[addr] = { v: headers[ci], t: "s" };
    detailWs[addr].s = headerStyle;
  });

  detail.forEach((row, ri) => {
    const isAlt = ri % 2 === 0;
    row.forEach((_, ci) => {
      const addr = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
      if (!detailWs[addr]) return;
      detailWs[addr].s = {
        fill:      { fgColor: { rgb: isAlt ? "ECFDF5" : "FFFFFF" } },
        alignment: {
          horizontal: ci === 8 ? "right" : ci === 0 ? "center" : "left",
          vertical:   "center",
        },
        font:   { color: { rgb: ci === 8 ? "064E3B" : "1E293B" }, bold: ci === 8 },
        border: { bottom: { style: "thin", color: { rgb: "A7F3D0" } } },
      };
      if (ci === 8) detailWs[addr].z = "#,##0";
    });
  });

  /* totals row */
  const totalRow = detail.length + 1;
  const totalsData = ["", "TOTAL", "", "", "", "", "", "", totalAmount, "", "", ""];
  totalsData.forEach((v, ci) => {
    const addr = XLSX.utils.encode_cell({ r: totalRow, c: ci });
    detailWs[addr] = {
      v,
      t: typeof v === "number" ? "n" : "s",
      s: {
        font:      { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
        fill:      { fgColor: { rgb: "064E3B" } },
        alignment: { horizontal: ci === 8 ? "right" : "left" },
        border:    { top: { style: "medium", color: { rgb: "10B981" } } },
      },
    };
    if (ci === 8) detailWs[addr].z = "#,##0";
  });

  detailWs["!ref"] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: totalRow, c: 11 });
  detailWs["!cols"] = [
    { wch: 4 },  { wch: 10 }, { wch: 18 }, { wch: 18 },
    { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 28 },
  ];
  detailWs["!rows"] = [{ hpt: 30 }];

  wb.Workbook = wb.Workbook || {};
  wb.Workbook.Views = [{ activeTab: 0 }];
  XLSX.utils.book_append_sheet(wb, detailWs, "Payment Details");
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
  XLSX.writeFile(wb, `Payments_Received_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const ViewPaymentReceivedModal = ({ isOpen, onClose, invoice }) => {
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [filterType, setFilterType] = useState("All");
  const [exporting, setExporting]   = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {

      // ── 1. Invoice payments ──────────────────────────────────
      let invQuery = supabase
        .from("payment_received_full_view")
        .select("*")
        .order("payment_date", { ascending: false });

      if (invoice?.id) {
        invQuery = invQuery.eq("invoice_id", invoice.id);
      }

      const { data: invData, error: invErr } = await invQuery;
      if (invErr) throw invErr;

      const invoiceRows = (invData || []).map((r) => ({
        _type:           "invoice",
        id:              r.id,
        payment_ref:     r.payment_ref,
        invoice_number:  r.invoice_number  || "",
        client_name:     r.client_name     || "",
        ledger_name:     r.ledger_name     || "",
        entity_name:     r.entity_name     || "",
        department_name: r.dept_name       || "",
        amount:          r.amount_received,
        payment_date:    r.payment_date,
        bank_name:       r.bank_name       || "",
        remarks:         r.remarks         || "",
      }));

      // ── 2. Advance payments (skip when scoped to a specific invoice) ──
      let advanceRows = [];
      if (!invoice) {

        // Fetch banks for name lookup
        const { data: banksData } = await supabase
          .from("bank_master")
          .select("id, bank_name");
        const banksMap = {};
        (banksData || []).forEach((b) => { banksMap[b.id] = b.bank_name; });

        // ✅ KEY FIX: filter at DB level — only unlinked advances
        const { data: advData, error: advErr } = await supabase
          .from("advance_payments")
          .select("*")
          .eq("is_adjusted", false)          // ← DB-level filter, not JS filter
          .order("payment_date", { ascending: false });

        if (advErr) throw advErr;

        advanceRows = (advData || []).map((r) => ({
          _type:           "advance",
          id:              r.id,
          payment_ref:     r.payment_ref,
          invoice_number:  "",               // unlinked → no invoice number
          client_name:     r.client_name     || "",
          ledger_name:     r.ledger_name     || "",
          entity_name:     r.entity_name     || "",
          department_name: r.department_name || "",
          amount:          r.amount,
          payment_date:    r.payment_date,
          bank_name:       banksMap[r.bank_id] || "",
          remarks:         r.remarks           || "",
        }));
      }

      setRows([...invoiceRows, ...advanceRows]);

    } catch (err) {
      console.error("fetchAll error:", err);
    } finally {
      setLoading(false);
    }
  }, [invoice]);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setFilterType("All");
      fetchAll();
    }
  }, [isOpen, fetchAll]);

  if (!isOpen) return null;

  /* ── filtered rows ── */
  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (r.payment_ref    || "").toLowerCase().includes(q) ||
      (r.invoice_number || "").toLowerCase().includes(q) ||
      (r.client_name    || "").toLowerCase().includes(q) ||
      (r.ledger_name    || "").toLowerCase().includes(q) ||
      (r.bank_name      || "").toLowerCase().includes(q) ||
      (r.remarks        || "").toLowerCase().includes(q);

    const matchType =
      filterType === "All" ||
      (filterType === "Invoice" && r._type === "invoice") ||
      (filterType === "Advance" && r._type === "advance");

    return matchSearch && matchType;
  });

  const totalAmount  = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);
  const invoiceTotal = filtered.filter((r) => r._type === "invoice").reduce((s, r) => s + Number(r.amount || 0), 0);
  const advanceTotal = filtered.filter((r) => r._type === "advance").reduce((s, r) => s + Number(r.amount || 0), 0);

  const handleExport = () => {
    setExporting(true);
    try {
      exportToExcel(filtered);
    } catch (error) {
      console.error("Payment received export failed:", error);
      alert("Export failed. Check console for details.");
    } finally {
      setExporting(false);
    }
  };

  /* ────────────────── RENDER via Portal ────────────────── */
  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ zIndex: 99999 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 40 }}
          className="bg-white w-full sm:max-w-5xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: "96vh" }}
        >
          {/* ── HEADER ── */}
          <div
            className="relative px-6 py-5 flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, #022c22 0%, #065f46 50%, #059669 100%)",
            }}
          >
            {/* decorative blobs */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full -translate-y-14 translate-x-14" />
            <div className="absolute bottom-0 left-20 w-20 h-20 bg-emerald-400/10 rounded-full translate-y-8" />

            <div className="relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                    <Eye size={18} className="text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Payment Received History
                  </h2>
                </div>
                <p className="text-emerald-300 text-xs ml-11">
                  {invoice
                    ? `Payments for ${invoice.invoice_number || "this invoice"}`
                    : "Invoice payments + pending advance payments"}
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
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X size={16} className="text-white/80" />
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div className="relative mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Records",          value: filtered.length,   icon: Layers         },
                { label: "Total Received",   value: fmt(totalAmount),  icon: TrendingUp     },
                { label: "Invoice Payments", value: fmt(invoiceTotal), icon: FileText       },
                { label: "Advance Pending",  value: fmt(advanceTotal), icon: ArrowDownCircle },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="bg-white/10 border border-white/15 rounded-2xl px-3 py-2.5 flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={12} className="text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-[9px] text-emerald-400 uppercase tracking-widest font-bold">
                      {label}
                    </p>
                    <p className="text-white text-xs font-bold leading-none mt-0.5">
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Invoice badge (when scoped to one invoice) */}
            {invoice && (
              <div className="relative mt-3 flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl p-3">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <FileText size={14} className="text-emerald-200" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-none">
                    {invoice.invoice_number || invoice.id}
                  </p>
                  {invoice.client_name && (
                    <p className="text-emerald-300 text-xs mt-0.5">
                      {invoice.client_name}
                    </p>
                  )}
                </div>
                {invoice.receivable_amount != null && (
                  <div className="ml-auto text-right">
                    <p className="text-[10px] text-emerald-400">Outstanding</p>
                    <p className="text-white font-bold text-sm">
                      {fmt(invoice.receivable_amount)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── FILTERS ── */}
          <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-slate-100 space-y-3 bg-white">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search ref, invoice, client, ledger, bank, remarks…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={12} className="text-slate-400" />
              {["All", "Invoice", "Advance"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    filterType === t
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* ── TABLE ── */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-9 h-9 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
                <p className="text-sm text-slate-400">Fetching payments…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <AlertCircle size={24} className="text-emerald-300" />
                </div>
                <p className="text-sm text-slate-500 font-medium">
                  No payment records found
                </p>
                <p className="text-xs text-slate-400">
                  Try adjusting filters or search
                </p>
              </div>
            ) : (
              <table className="min-w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {[
                      "Type", "Ref No.", "Invoice",
                      "Client", "Ledger",
                      "Entity / Dept", "Amount",
                      "Date", "Bank", "Remarks",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border-b border-emerald-900/20"
                        style={{ background: "#022c22", color: "#6ee7b7" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((r, index) => (
                    <tr
                      key={`${r._type}-${r.id}`}
                      className={`border-b border-emerald-100 hover:bg-emerald-50 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-emerald-50/30"
                      }`}
                    >
                      {/* Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <TypeBadge type={r._type} />
                      </td>

                      {/* Ref No */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                          {r.payment_ref || "—"}
                        </span>
                      </td>

                      {/* Invoice */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.invoice_number ? (
                          <div className="flex items-center gap-1.5">
                            <FileText size={11} className="text-slate-300" />
                            <span className="text-xs text-slate-700 font-semibold">
                              {r.invoice_number}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3 whitespace-nowrap max-w-[150px]">
                        <div>
                          <p className="font-semibold text-slate-800 text-xs truncate">
                            {r.client_name || "—"}
                          </p>
                          {r.ledger_name && (
                            <p className="text-[10px] text-slate-400 truncate">
                              {r.ledger_name}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Ledger */}
                      <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                        <span className="text-xs text-slate-500">
                          {r.ledger_name || "—"}
                        </span>
                      </td>

                      {/* Entity / Dept */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          {r.entity_name && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              {r.entity_name}
                            </span>
                          )}
                          {r.department_name && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {r.department_name}
                            </p>
                          )}
                          {!r.entity_name && !r.department_name && (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="font-bold text-emerald-700 text-sm">
                          {fmt(r.amount)}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-slate-300" />
                          <span className="text-xs text-slate-600">
                            {fmtDate(r.payment_date)}
                          </span>
                        </div>
                      </td>

                      {/* Bank */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={11} className="text-slate-300" />
                          <span className="text-xs text-slate-600">
                            {r.bank_name || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Remarks */}
                      <td className="px-4 py-3 max-w-[160px]">
                        <span
                          className="text-xs text-slate-500 truncate block"
                          title={r.remarks}
                        >
                          {r.remarks || (
                            <span className="text-slate-300">—</span>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Sticky totals footer */}
                <tfoot className="sticky bottom-0">
                  <tr style={{ background: "#022c22" }}>
                    <td colSpan={6} className="px-4 py-3">
                      <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest">
                        Total ({filtered.length} records)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-white text-base">
                        {fmt(totalAmount)}
                      </span>
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="flex-shrink-0 px-5 pb-6 pt-3 border-t border-slate-100 bg-white flex items-center gap-3">
            <button
              onClick={fetchAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold transition-all disabled:opacity-50 shadow-lg"
              style={{
                background: "linear-gradient(135deg, #065f46, #059669)",
                boxShadow:  "0 4px 14px rgba(5,150,105,0.3)",
              }}
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
              className="ml-auto px-6 py-2.5 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default ViewPaymentReceivedModal;