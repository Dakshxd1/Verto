import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import {
  X,
  Loader2,
  Database,
  Search,
  Download,
  RefreshCw,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  TrendingDown,
  Users,
  Layers,
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

const BoolPill = ({ value, yesLabel = "YES", noLabel = "NO" }) =>
  value ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
      <CheckCircle size={10} /> {yesLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
      <XCircle size={10} /> {noLabel}
    </span>
  );

/* ─────────────────────────────────────────────
   Excel Export
───────────────────────────────────────────── */
const exportToExcel = (rows) => {
  const wb = XLSX.utils.book_new();

  /* ── Summary sheet ── */
  const totalDue      = rows.reduce((s, r) => s + Number(r.due_amount || 0), 0);
  const totalTds      = rows.reduce((s, r) => s + Number(r.tds_amount || 0), 0);
  const totalTransfer = rows.reduce((s, r) => s + Number(r.transfer_amount || 0), 0);
  const billableCount = rows.filter((r) => r.is_billable).length;
  const cashCount     = rows.filter((r) => r.petty_cash).length;

  const summaryData = [
    ["EXPENSE DATABASE — SUMMARY REPORT"],
    ["Generated On", new Date().toLocaleString("en-IN")],
    [],
    ["OVERVIEW"],
    ["Total Records",          rows.length],
    ["Total Due Amount",       totalDue],
    ["Total TDS",              totalTds],
    ["Total Transfer Amount",  totalTransfer],
    [],
    ["BREAKDOWN"],
    ["Billable Expenses",      billableCount],
    ["Petty Cash Entries",     cashCount],
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 28 }, { wch: 22 }];
  if (summaryWs["A1"])
    summaryWs["A1"].s = {
      font:      { bold: true, sz: 16, color: { rgb: "7C2D12" } },
      fill:      { fgColor: { rgb: "FFF7ED" } },
      alignment: { horizontal: "left" },
    };
  ["A4", "A10"].forEach((addr) => {
    if (summaryWs[addr])
      summaryWs[addr].s = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "C2410C" } },
      };
  });

  /* ── Detail sheet ── */
  const headers = [
    "#", "Client", "Entity", "Department", "Pay Head",
    "Due Amount (₹)", "TDS (₹)", "Transfer (₹)",
    "Payment Date", "Bank", "Billable", "Petty Cash", "Created At",
  ];

  const detail = rows.map((r, i) => [
    i + 1,
    r.client_name || "—",
    r.entity || "—",
    r.department || "—",
    r.pay_head || "—",
    Number(r.due_amount || 0),
    Number(r.tds_amount || 0),
    Number(r.transfer_amount || 0),
    fmtDate(r.payment_date),
    r.bank_name || "—",
    r.is_billable ? "Yes" : "No",
    r.petty_cash ? "Yes" : "No",
    fmtDate(r.created_at),
  ]);

  const detailWs = XLSX.utils.aoa_to_sheet([headers, ...detail]);

  /* header row style */
  const headerStyle = {
    font:      { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
    fill:      { fgColor: { rgb: "7C2D12" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border:    { bottom: { style: "medium", color: { rgb: "EA580C" } } },
  };
  headers.forEach((_, ci) => {
    const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
    if (!detailWs[addr]) detailWs[addr] = { v: headers[ci], t: "s" };
    detailWs[addr].s = headerStyle;
  });

  /* data rows */
  const amountCols = [5, 6, 7];
  detail.forEach((row, ri) => {
    const isAlt = ri % 2 === 0;
    row.forEach((_, ci) => {
      const addr = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
      if (!detailWs[addr]) return;
      detailWs[addr].s = {
        fill:      { fgColor: { rgb: isAlt ? "FFF7ED" : "FFFFFF" } },
        alignment: {
          horizontal: amountCols.includes(ci) ? "right" : ci === 0 ? "center" : "left",
          vertical: "center",
        },
        font:  { color: { rgb: amountCols.includes(ci) ? "7C2D12" : "1E293B" }, bold: amountCols.includes(ci) },
        border:{ bottom: { style: "thin", color: { rgb: "FED7AA" } } },
      };
      if (amountCols.includes(ci)) detailWs[addr].z = "#,##0";
    });
  });

  /* totals row */
  const totalRow = detail.length + 1;
  const totalsData = ["", "TOTAL", "", "", "",
    totalDue, totalTds, totalTransfer,
    "", "", "", "", "",
  ];
  totalsData.forEach((v, ci) => {
    const addr = XLSX.utils.encode_cell({ r: totalRow, c: ci });
    detailWs[addr] = {
      v,
      t: typeof v === "number" ? "n" : "s",
      s: {
        font:      { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
        fill:      { fgColor: { rgb: "7C2D12" } },
        alignment: { horizontal: amountCols.includes(ci) ? "right" : "left" },
        border:    { top: { style: "medium", color: { rgb: "EA580C" } } },
      },
    };
    if (amountCols.includes(ci)) detailWs[addr].z = "#,##0";
  });

  detailWs["!ref"] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: totalRow, c: 12 });
  detailWs["!cols"] = [
    { wch: 4 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 18 },
    { wch: 14 }, { wch: 12 }, { wch: 14 },
    { wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 14 },
  ];
  detailWs["!rows"] = [{ hpt: 30 }];

  wb.Workbook = wb.Workbook || {};
  wb.Workbook.Views = [{ activeTab: 0 }];
  XLSX.utils.book_append_sheet(wb, detailWs, "Expense Details");
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
  XLSX.writeFile(wb, `Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const ExpenseViewModal = ({ open, onClose }) => {
  const [loading, setLoading]     = useState(false);
  const [rows, setRows]           = useState([]);
  const [search, setSearch]       = useState("");
  const [filterBill, setFilterBill] = useState("All");
  const [filterCash, setFilterCash] = useState("All");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setFilterBill("All");
    setFilterCash("All");
    fetchExpenses();
  }, [open]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_made_view")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) { console.error(error); return; }
      setRows(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  /* ── filtered rows ── */
  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (r.client_name  || "").toLowerCase().includes(q) ||
      (r.entity       || "").toLowerCase().includes(q) ||
      (r.department   || "").toLowerCase().includes(q) ||
      (r.pay_head     || "").toLowerCase().includes(q) ||
      (r.bank_name    || "").toLowerCase().includes(q);

    const matchBill =
      filterBill === "All" ||
      (filterBill === "Billable" && r.is_billable) ||
      (filterBill === "Non-Billable" && !r.is_billable);

    const matchCash =
      filterCash === "All" ||
      (filterCash === "Cash" && r.petty_cash) ||
      (filterCash === "Non-Cash" && !r.petty_cash);

    return matchSearch && matchBill && matchCash;
  });

  const totalDue      = filtered.reduce((s, r) => s + Number(r.due_amount || 0), 0);
  const totalTransfer = filtered.reduce((s, r) => s + Number(r.transfer_amount || 0), 0);
  const totalTds      = filtered.reduce((s, r) => s + Number(r.tds_amount || 0), 0);

  const handleExport = () => {
    setExporting(true);
    try {
      exportToExcel(filtered);
    } catch (error) {
      console.error("Expense export failed:", error);
      alert("Export failed. Check console for details.");
    } finally {
      setExporting(false);
    }
  };

  /* ─────────── RENDER ─────────── */
  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-[98vw] h-[95vh] overflow-hidden flex flex-col"
        >
          {/* ── HEADER ── */}
          <div
            className="relative px-6 py-5 flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #431407 0%, #9a3412 50%, #ea580c 100%)",
            }}
          >
            {/* blobs */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
            <div className="absolute bottom-0 left-20 w-24 h-24 bg-orange-400/10 rounded-full translate-y-10" />

            <div className="relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                    <Database size={18} className="text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Expense Database View
                  </h2>
                </div>
                <p className="text-orange-300 text-xs ml-11">
                  SQL-style expense table · {filtered.length} records shown
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  disabled={exporting || filtered.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all disabled:opacity-40"
                >
                  {exporting ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
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
                { label: "Records",       value: filtered.length,     icon: Layers     },
                { label: "Due Amount",    value: fmt(totalDue),        icon: TrendingDown },
                { label: "TDS",           value: fmt(totalTds),        icon: Users      },
                { label: "Transfer",      value: fmt(totalTransfer),   icon: Building2  },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="bg-white/10 border border-white/15 rounded-2xl px-3 py-2.5 flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={12} className="text-orange-300" />
                  </div>
                  <div>
                    <p className="text-[9px] text-orange-400 uppercase tracking-widest font-bold">{label}</p>
                    <p className="text-white text-xs font-bold leading-none mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── FILTERS ── */}
          <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-slate-100 space-y-3 bg-white">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search client, entity, department, pay head, bank…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={12} className="text-slate-400" />
              {["All", "Billable", "Non-Billable"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterBill(t)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    filterBill === t
                      ? "bg-orange-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
              <div className="w-px h-4 bg-slate-200 mx-1" />
              {["All", "Cash", "Non-Cash"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterCash(t)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    filterCash === t
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* ── TABLE ── */}
          <div className="flex-1 overflow-auto bg-slate-50">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-orange-200 border-t-orange-600 animate-spin" />
                <p className="text-sm text-slate-400">Fetching expenses…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center">
                  <AlertCircle size={24} className="text-orange-300" />
                </div>
                <p className="text-sm text-slate-500 font-medium">No expense records found</p>
                <p className="text-xs text-slate-400">Try adjusting filters or search</p>
              </div>
            ) : (
              <table className="min-w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {[
                      "#", "Client", "Entity", "Department", "Pay Head",
                      "Due Amount", "TDS", "Transfer",
                      "Payment Date", "Bank", "Billable", "Cash", "Created At",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border-b border-orange-900/20"
                        style={{ background: "#431407", color: "#fed7aa" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((row, index) => (
                    <tr
                      key={row.id || index}
                      className={`border-b border-orange-100 hover:bg-orange-50 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-orange-50/40"
                      }`}
                    >
                      {/* # */}
                      <td className="px-4 py-3 text-center text-xs text-slate-400 font-medium whitespace-nowrap">
                        {index + 1}
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 text-xs">{row.client_name || "—"}</span>
                      </td>

                      {/* Entity */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-orange-100 text-orange-800 text-[10px] font-bold">
                          {row.entity || "—"}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                        {row.department || "—"}
                      </td>

                      {/* Pay Head */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                        {row.pay_head || "—"}
                      </td>

                      {/* Due Amount */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="font-bold text-orange-700 text-sm">
                          {fmt(row.due_amount)}
                        </span>
                      </td>

                      {/* TDS */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-xs font-semibold text-red-600">
                          {fmt(row.tds_amount)}
                        </span>
                      </td>

                      {/* Transfer */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-xs font-semibold text-slate-700">
                          {fmt(row.transfer_amount)}
                        </span>
                      </td>

                      {/* Payment Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-slate-300" />
                          <span className="text-xs text-slate-600">{fmtDate(row.payment_date)}</span>
                        </div>
                      </td>

                      {/* Bank */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={11} className="text-slate-300" />
                          <span className="text-xs text-slate-600">{row.bank_name || "—"}</span>
                        </div>
                      </td>

                      {/* Billable */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <BoolPill value={row.is_billable} />
                      </td>

                      {/* Cash */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <BoolPill value={row.petty_cash} yesLabel="CASH" noLabel="NO" />
                      </td>

                      {/* Created At */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-400">{fmtDate(row.created_at)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Sticky totals footer */}
                <tfoot className="sticky bottom-0">
                  <tr style={{ background: "#431407" }}>
                    <td colSpan={5} className="px-4 py-3">
                      <span className="text-[11px] font-bold text-orange-300 uppercase tracking-widest">
                        Total ({filtered.length} records)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-white text-base">{fmt(totalDue)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-orange-300 text-sm">{fmt(totalTds)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-orange-200 text-sm">{fmt(totalTransfer)}</span>
                    </td>
                    <td colSpan={5} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-slate-100 bg-white flex items-center gap-3">
            <button
              onClick={fetchExpenses}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold transition-all disabled:opacity-50 shadow-lg"
              style={{ background: "linear-gradient(135deg, #9a3412, #ea580c)", boxShadow: "0 4px 14px rgba(234,88,12,0.3)" }}
            >
              {exporting ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
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

export default ExpenseViewModal;