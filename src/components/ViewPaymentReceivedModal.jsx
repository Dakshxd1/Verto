import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { logExport, EXPORT_ACTIONS } from "../utils/Auditlog.js";
import { usePerms } from "../context/PermissionsContext";
import {
  X,
  Eye,
  Search,
  Download,
  RefreshCw,
  Building2,
  Calendar,
  FileText,
  AlertCircle,
  Filter,
  TrendingUp,
  Layers,
  ArrowDownCircle,
  Trash2,
  Edit3,
  BarChart2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  ChevronUp,
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

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const getMonthKey = (dateStr) => {
  if (!dateStr) return "Unknown";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const formatMonthKey = (key) => {
  if (key === "Unknown") return "Unknown";
  const [yr, mo] = key.split("-");
  return `${MONTH_NAMES[parseInt(mo, 10) - 1]} ${yr}`;
};

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
   Searchable Dropdown — Invoice · Client filter
───────────────────────────────────────────── */
const SearchableDropdown = ({ rows, value, onChange }) => {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef           = useRef(null);

  const options = useMemo(() => {
    const seen = new Set();
    const out  = [{ label: "All Payments", invoiceKey: "" }];
    rows.forEach((r) => {
      const key = r.invoice_number
        ? `inv:${r.invoice_number}`
        : `client:${r.client_name}`;
      if (!seen.has(key)) {
        seen.add(key);
        const label = r.invoice_number
          ? `${r.invoice_number}${r.client_name ? " · " + r.client_name : ""}`
          : r.client_name || "Unknown";
        out.push({ label, invoiceKey: key, isInvoice: !!r.invoice_number });
      }
    });
    return out;
  }, [rows]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selected = options.find((o) => o.invoiceKey === value);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pick = (opt) => { onChange(opt.invoiceKey); setQuery(""); setOpen(false); };

  return (
    <div className="relative w-72" ref={wrapRef}>
      <button
        type="button"
        onClick={() => { setOpen((p) => !p); setQuery(""); }}
        className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-left hover:border-emerald-400 transition-colors shadow-sm"
      >
        <Search size={12} className="text-slate-400 flex-shrink-0" />
        <span className={`flex-1 truncate font-semibold ${value ? "text-emerald-800" : "text-slate-500"}`}>
          {value ? selected?.label || "Selected" : "All Payments"}
        </span>
        <ChevronDown size={12} className={`text-slate-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type invoice no. or client…"
                  className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 text-black placeholder-slate-400"
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-xs text-slate-400 text-center">No matches found</p>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.invoiceKey}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); pick(opt); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-emerald-50 transition-colors border-b border-slate-50 last:border-0 ${opt.invoiceKey === value ? "bg-emerald-50" : ""}`}
                  >
                    {opt.invoiceKey === "" ? (
                      <span className="w-4 h-4 rounded-full bg-slate-200 flex-shrink-0" />
                    ) : opt.isInvoice ? (
                      <FileText size={12} className="text-emerald-500 flex-shrink-0" />
                    ) : (
                      <Building2 size={12} className="text-teal-500 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      {opt.invoiceKey === "" ? (
                        <span className="text-xs font-semibold text-slate-600">All Payments</span>
                      ) : (
                        <>
                          {opt.isInvoice && (
                            <span className="text-[10px] font-bold text-emerald-700 font-mono block leading-none">
                              {opt.label.split(" · ")[0]}
                            </span>
                          )}
                          <span className="text-xs text-slate-700 font-medium truncate block">
                            {opt.isInvoice ? opt.label.split(" · ").slice(1).join(" · ") : opt.label}
                          </span>
                        </>
                      )}
                    </div>
                    {opt.invoiceKey === value && <CheckCircle2 size={12} className="text-emerald-500 ml-auto flex-shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Sort Header
───────────────────────────────────────────── */
const SortTh = ({ label, field, sortField, sortDir, onSort }) => {
  const active = sortField === field;
  return (
    <th
      onClick={() => onSort(field)}
      className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border-b border-emerald-900/20 cursor-pointer select-none group"
      style={{ background: "#022c22", color: active ? "#34d399" : "#6ee7b7" }}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="opacity-60 group-hover:opacity-100 transition-opacity">
          {active
            ? sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />
            : <ArrowUpDown size={10} />}
        </span>
      </div>
    </th>
  );
};

/* ─────────────────────────────────────────────
   Excel Export — Payments Detail
───────────────────────────────────────────── */
const exportToExcel = (rows) => {
  const wb = XLSX.utils.book_new();
  const invoiceRows = rows.filter((r) => r._type === "invoice");
  const advanceRows = rows.filter((r) => r._type === "advance");
  const totalAmount = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const invoiceTotal = invoiceRows.reduce(
    (s, r) => s + Number(r.amount || 0),
    0
  );
  const advanceTotal = advanceRows.reduce(
    (s, r) => s + Number(r.amount || 0),
    0
  );

  const summaryData = [
    ["PAYMENT RECEIVED — SUMMARY REPORT"],
    ["Generated On", new Date().toLocaleString("en-IN")],
    [],
    ["OVERVIEW"],
    ["Total Records", rows.length],
    ["Total Amount Received", totalAmount],
    ["Invoice Payments", invoiceTotal],
    ["Advance Payments", advanceTotal],
    [],
    ["BREAKDOWN"],
    ["Invoice Payment Count", invoiceRows.length],
    ["Advance Payment Count", advanceRows.length],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 28 }, { wch: 22 }];

  const headers = [
    "#",
    "Type",
    "Payment Ref",
    "Invoice Number",
    "Client",
    "Ledger",
    "Entity",
    "Department",
    "Amount (₹)",
    "Payment Date",
    "Bank",
    "Remarks",
  ];
  const detail = rows.map((r, i) => [
    i + 1,
    r._type === "invoice" ? "Invoice" : "Advance",
    r.payment_ref || "—",
    r.invoice_number || "—",
    r.client_name || "—",
    r.ledger_name || "—",
    r.entity_name || "—",
    r.department_name || "—",
    Number(r.amount || 0),
    fmtDate(r.payment_date),
    r.bank_name || "—",
    r.remarks || "",
  ]);

  const detailWs = XLSX.utils.aoa_to_sheet([headers, ...detail]);
  detailWs["!cols"] = [
    { wch: 4 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 28 },
  ];

  XLSX.utils.book_append_sheet(wb, detailWs, "Payment Details");
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
  XLSX.writeFile(
    wb,
    `Payments_Received_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
  logExport({
    action:      EXPORT_ACTIONS.EXCEL,
    category:    "Payments",
    description: `Downloaded Payments Received Excel (${rows.length} records)`,
    meta:        { rows: rows.length },
  });
};

/* ─────────────────────────────────────────────
   Excel Export — Monthly Client Report
───────────────────────────────────────────── */
const exportMonthlyReport = (reportData) => {
  const wb = XLSX.utils.book_new();

  const headers = [
    "Month",
    "Client",
    "Invoice Payments (₹)",
    "Advance Received (₹)",
    "Total Received (₹)",
    "Invoiced Amount (₹)",
    "Pending Amount (₹)",
    "Invoice Count",
    "Advance Count",
  ];

  const rows = [];
  reportData.forEach(({ month, clients }) => {
    clients.forEach((c) => {
      rows.push([
        month,
        c.client_name,
        c.invoiceReceived,
        c.advanceReceived,
        c.totalReceived,
        c.totalInvoiced,
        c.pending,
        c.invoiceCount,
        c.advanceCount,
      ]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Monthly Client Report");
  XLSX.writeFile(
    wb,
    `Monthly_Client_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
  logExport({
    action:      EXPORT_ACTIONS.EXCEL,
    category:    "Reports",
    description: "Downloaded Monthly Client Report Excel",
  });
};

/* ─────────────────────────────────────────────
   Monthly Report Tab Component
───────────────────────────────────────────── */
const MonthlyReportTab = ({ rows, invoices }) => {
  const [expandedMonths, setExpandedMonths] = useState({});
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterClient, setFilterClient] = useState("");
  const [exporting, setExporting] = useState(false);

  // Build report: group payments by month → client
  const reportData = useMemo(() => {
    // Map invoiceId → invoiced amount from invoices list (if available)
    const invoiceAmtMap = {};
    (invoices || []).forEach((inv) => {
      invoiceAmtMap[inv.id] = Number(inv.receivable_amount || 0);
    });

    // Group rows
    const monthMap = {};

    rows.forEach((r) => {
      const mKey = getMonthKey(r.payment_date);
      if (!monthMap[mKey]) monthMap[mKey] = {};
      const cKey = r.client_name || "Unknown Client";
      if (!monthMap[mKey][cKey]) {
        monthMap[mKey][cKey] = {
          client_name: cKey,
          invoiceReceived: 0,
          advanceReceived: 0,
          totalInvoiced: 0,
          invoiceIds: new Set(),
          invoiceCount: 0,
          advanceCount: 0,
          payments: [],
        };
      }
      const bucket = monthMap[mKey][cKey];
      const amt = Number(r.amount || 0);

      if (r._type === "invoice") {
        bucket.invoiceReceived += amt;
        bucket.invoiceCount += 1;
        if (r.invoice_id && !bucket.invoiceIds.has(r.invoice_id)) {
          bucket.invoiceIds.add(r.invoice_id);
          bucket.totalInvoiced += invoiceAmtMap[r.invoice_id] || 0;
        }
      } else {
        bucket.advanceReceived += amt;
        bucket.advanceCount += 1;
      }
      bucket.payments.push(r);
    });

    // Sort months descending
    const sorted = Object.keys(monthMap)
      .sort((a, b) => b.localeCompare(a))
      .map((mKey) => {
        const clients = Object.values(monthMap[mKey])
          .sort(
            (a, b) =>
              b.invoiceReceived +
              b.advanceReceived -
              (a.invoiceReceived + a.advanceReceived)
          )
          .map((c) => ({
            ...c,
            totalReceived: c.invoiceReceived + c.advanceReceived,
            pending: Math.max(0, c.totalInvoiced - c.invoiceReceived),
          }));
        const monthTotal = clients.reduce((s, c) => s + c.totalReceived, 0);
        const monthInvoiced = clients.reduce((s, c) => s + c.totalInvoiced, 0);
        const monthPending = clients.reduce((s, c) => s + c.pending, 0);
        return {
          key: mKey,
          month: formatMonthKey(mKey),
          clients,
          monthTotal,
          monthInvoiced,
          monthPending,
        };
      });

    return sorted;
  }, [rows, invoices]);

  // Unique months for filter
  const allMonths = useMemo(() => reportData.map((r) => r.month), [reportData]);

  // Filtered
  const filtered = useMemo(() => {
    return reportData
      .filter((m) => filterMonth === "All" || m.month === filterMonth)
      .map((m) => ({
        ...m,
        clients: m.clients.filter(
          (c) =>
            !filterClient ||
            c.client_name.toLowerCase().includes(filterClient.toLowerCase())
        ),
      }))
      .filter((m) => m.clients.length > 0);
  }, [reportData, filterMonth, filterClient]);

  const toggleMonth = (key) =>
    setExpandedMonths((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleExport = () => {
    setExporting(true);
    try {
      exportMonthlyReport(filtered);
    } finally {
      setExporting(false);
    }
  };

  // Auto-expand first month
  useEffect(() => {
    if (filtered.length > 0) {
      setExpandedMonths({ [filtered[0].key]: true });
    }
  }, [filtered.length]);

  if (reportData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
          <BarChart2 size={24} className="text-emerald-300" />
        </div>
        <p className="text-sm text-slate-800 font-medium">
          No data to generate report
        </p>
        <p className="text-xs text-slate-500">
          Add payments to see monthly client-wise report
        </p>
      </div>
    );
  }

  // Grand totals
  const grandTotal = filtered.reduce((s, m) => s + m.monthTotal, 0);
  const grandPending = filtered.reduce((s, m) => s + m.monthPending, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-filters */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-slate-400" />
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 text-black bg-white focus:outline-none focus:border-emerald-500"
          >
            <option value="All">All Months</option>
            {allMonths.map((m, i) => (
              <option key={`${m || "month"}-${i}`} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Filter by client…"
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-black placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-44"
          />
        </div>

        <button
          onClick={handleExport}
          disabled={exporting || filtered.length === 0}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #065f46, #059669)" }}
        >
          {exporting ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <Download size={12} />
          )}
          Export Report
        </button>
      </div>

      {/* Grand summary bar */}
      <div className="flex-shrink-0 grid grid-cols-3 gap-0 border-b border-slate-200">
        {[
          {
            label: "Total Received",
            value: fmt(grandTotal),
            color: "text-emerald-700",
            bg: "bg-emerald-50",
          },
          {
            label: "Total Pending",
            value: fmt(grandPending),
            color: "text-rose-700",
            bg: "bg-rose-50",
          },
          {
            label: "Months Shown",
            value: filtered.length,
            color: "text-slate-700",
            bg: "bg-white",
          },
        ].map(({ label, value, color, bg }) => (
          <div
            key={label}
            className={`${bg} px-5 py-3 border-r last:border-r-0 border-slate-200`}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {label}
            </p>
            <p className={`text-lg font-bold ${color} leading-tight mt-0.5`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Month accordion list */}
      <div className="flex-1 overflow-auto">
        {filtered.map((monthData) => {
          const isOpen = !!expandedMonths[monthData.key];
          return (
            <div key={monthData.key} className="border-b border-slate-100">
              {/* Month header row */}
              <button
                onClick={() => toggleMonth(monthData.key)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  {isOpen ? (
                    <ChevronDown size={13} className="text-emerald-700" />
                  ) : (
                    <ChevronRight size={13} className="text-emerald-700" />
                  )}
                </div>
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <span className="font-bold text-sm text-black">
                    {monthData.month}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {monthData.clients.length} client
                    {monthData.clients.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                      Received
                    </p>
                    <p className="text-sm font-bold text-emerald-700">
                      {fmt(monthData.monthTotal)}
                    </p>
                  </div>
                  {monthData.monthPending > 0 && (
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                        Pending
                      </p>
                      <p className="text-sm font-bold text-rose-600">
                        {fmt(monthData.monthPending)}
                      </p>
                    </div>
                  )}
                </div>
              </button>

              {/* Expanded client table */}
              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/60">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        {[
                          "Client",
                          "Type Breakdown",
                          "Invoice Received",
                          "Advance Received",
                          "Total Received",
                          "Invoiced Amount",
                          "Pending",
                          "Status",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap bg-slate-100"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthData.clients.map((c, i) => {
                        const isPaid = c.totalInvoiced > 0 && c.pending === 0;
                        const isPartial =
                          c.totalInvoiced > 0 &&
                          c.pending > 0 &&
                          c.invoiceReceived > 0;
                        const isAdvOnly =
                          c.totalInvoiced === 0 && c.advanceReceived > 0;

                        return (
                          <tr
                            key={`${c.client_name}-${i}`}
                            className={`border-b border-slate-100 ${
                              i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                            } hover:bg-emerald-50/40 transition-colors`}
                          >
                            {/* Client */}
                            <td className="px-4 py-3 font-semibold text-black max-w-[160px]">
                              <p className="truncate" title={c.client_name}>
                                {c.client_name}
                              </p>
                            </td>

                            {/* Type breakdown badges */}
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                {c.invoiceCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold w-fit">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                    {c.invoiceCount} Invoice
                                  </span>
                                )}
                                {c.advanceCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[9px] font-bold w-fit">
                                    <span className="w-1 h-1 rounded-full bg-teal-500" />
                                    {c.advanceCount} Advance
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Invoice Received */}
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`font-bold ${
                                  c.invoiceReceived > 0
                                    ? "text-emerald-700"
                                    : "text-slate-400"
                                }`}
                              >
                                {c.invoiceReceived > 0
                                  ? fmt(c.invoiceReceived)
                                  : "—"}
                              </span>
                            </td>

                            {/* Advance Received */}
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`font-bold ${
                                  c.advanceReceived > 0
                                    ? "text-teal-700"
                                    : "text-slate-400"
                                }`}
                              >
                                {c.advanceReceived > 0
                                  ? fmt(c.advanceReceived)
                                  : "—"}
                              </span>
                            </td>

                            {/* Total Received */}
                            <td className="px-4 py-3 text-right">
                              <span className="font-extrabold text-sm text-emerald-800">
                                {fmt(c.totalReceived)}
                              </span>
                            </td>

                            {/* Invoiced Amount */}
                            <td className="px-4 py-3 text-right">
                              <span
                                className={
                                  c.totalInvoiced > 0
                                    ? "text-black font-semibold"
                                    : "text-slate-400"
                                }
                              >
                                {c.totalInvoiced > 0
                                  ? fmt(c.totalInvoiced)
                                  : "—"}
                              </span>
                            </td>

                            {/* Pending */}
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`font-bold ${
                                  c.pending > 0
                                    ? "text-rose-600"
                                    : "text-slate-400"
                                }`}
                              >
                                {c.pending > 0 ? fmt(c.pending) : "—"}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              {isPaid && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                                  <CheckCircle2 size={9} /> Paid
                                </span>
                              )}
                              {isPartial && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold">
                                  <Clock size={9} /> Partial
                                </span>
                              )}
                              {isAdvOnly && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[9px] font-bold">
                                  <ArrowDownCircle size={9} /> Advance
                                </span>
                              )}
                              {!isPaid && !isPartial && !isAdvOnly && (
                                <span className="text-slate-400 text-[9px]">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Month subtotal */}
                    <tfoot>
                      <tr
                        style={{ background: "#f0fdf4" }}
                        className="border-t-2 border-emerald-200"
                      >
                        <td className="px-4 py-2.5" colSpan={2}>
                          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-widest">
                            {monthData.month} Total
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-xs font-bold text-emerald-700">
                            {fmt(
                              monthData.clients.reduce(
                                (s, c) => s + c.invoiceReceived,
                                0
                              )
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-xs font-bold text-teal-700">
                            {fmt(
                              monthData.clients.reduce(
                                (s, c) => s + c.advanceReceived,
                                0
                              )
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-sm font-extrabold text-emerald-800">
                            {fmt(monthData.monthTotal)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-xs font-bold text-black">
                            {fmt(monthData.monthInvoiced)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-xs font-bold text-rose-600">
                            {monthData.monthPending > 0
                              ? fmt(monthData.monthPending)
                              : "—"}
                          </span>
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const ViewPaymentReceivedModal = ({ isOpen, onClose, invoice, onRefresh }) => {
  const { canEdit, canDelete, canExport } = usePerms();
  const [rows, setRows] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterKey, setFilterKey]   = useState("");
  const [sortField, setSortField]   = useState("payment_date");
  const [sortDir, setSortDir]       = useState("desc");
  const [exporting, setExporting]   = useState(false);
  const [activeTab, setActiveTab]   = useState("payments");

  // Edit state
  const [editingRow, setEditingRow] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirm state
  const [deletingRow, setDeletingRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast / error
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Fetch all payments ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
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
        _type: "invoice",
        id: r.id,
        invoice_id: r.invoice_id,
        payment_ref: r.payment_ref,
        invoice_number: r.invoice_number || "",
        client_name: r.client_name || "",
        ledger_name: r.ledger_name || "",
        entity_name: r.entity_name || "",
        department_name: r.dept_name || "",
        amount: r.amount_received,
        payment_date: r.payment_date,
        bank_name: r.bank_name || "",
        remarks: r.remarks || "",
      }));

      let advanceRows = [];
      let allInvoices = [];

      if (!invoice) {
        const { data: banksData } = await supabase
          .from("bank_master")
          .select("id, bank_name");
        const banksMap = {};
        (banksData || []).forEach((b) => {
          banksMap[b.id] = b.bank_name;
        });

        const { data: advData, error: advErr } = await supabase
          .from("advance_payments")
          .select("*")
          .eq("is_adjusted", false)
          .order("payment_date", { ascending: false });

        if (advErr) throw advErr;

        advanceRows = (advData || []).map((r) => ({
          _type: "advance",
          id: r.id,
          payment_ref: r.payment_ref,
          invoice_number: "",
          client_name: r.client_name || "",
          ledger_name: r.ledger_name || "",
          entity_name: r.entity_name || "",
          department_name: r.department_name || "",
          amount: r.amount,
          payment_date: r.payment_date,
          bank_name: banksMap[r.bank_id] || "",
          remarks: r.remarks || "",
        }));

        // Fetch invoices for pending calculation in monthly report
        const { data: invMaster } = await supabase
          .from("invoices")
          .select("id, receivable_amount");
        allInvoices = invMaster || [];
      }

      setRows([...invoiceRows, ...advanceRows]);
      setInvoices(allInvoices);
    } catch (err) {
      console.error("fetchAll error:", err);
      showToast("error", "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [invoice]);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setFilterType("All");
      setFilterKey("");
      setSortField("payment_date");
      setSortDir("desc");
      setEditingRow(null);
      setDeletingRow(null);
      setActiveTab("payments");
      fetchAll();
    }
  }, [isOpen, fetchAll]);

  /* ── Sort handler ── */
  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  /* ── EDIT: open panel ── */
  const startEdit = (row) => {
    setDeletingRow(null);
    setEditingRow(row);
    setEditAmount(String(row.amount || ""));
    setEditDate(row.payment_date?.slice(0, 10) || "");
    setEditRemarks(row.remarks || "");
  };

  /* ── EDIT: save ── */
  const handleSave = async () => {
    if (!editingRow) return;
    if (!editAmount || Number(editAmount) <= 0) {
      showToast("error", "Amount must be greater than 0");
      return;
    }
    if (!editDate) {
      showToast("error", "Please select a date");
      return;
    }

    setSaving(true);
    try {
      if (editingRow._type === "invoice") {
        const { error } = await supabase
          .from("payments_received")
          .update({
            amount_received: Number(editAmount),
            payment_date: editDate,
            remarks: editRemarks,
          })
          .eq("id", editingRow.id);
        if (error) throw error;
      } else if (editingRow._type === "advance") {
        const { error } = await supabase
          .from("advance_payments")
          .update({
            amount: Number(editAmount),
            payment_date: editDate,
            remarks: editRemarks,
          })
          .eq("id", editingRow.id);
        if (error) throw error;
      }

      showToast("success", "Payment updated successfully");
      setEditingRow(null);
      await fetchAll();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Edit error:", err);
      showToast("error", err.message || "Failed to update payment");
    } finally {
      setSaving(false);
    }
  };

  /* ── DELETE: confirm then delete ── */
  const handleDeleteConfirm = async () => {
    if (!deletingRow) return;
    setDeleting(true);
    try {
      if (deletingRow._type === "invoice") {
        const { error } = await supabase
          .from("payments_received")
          .delete()
          .eq("id", deletingRow.id);
        if (error) throw error;
      } else if (deletingRow._type === "advance") {
        const { error } = await supabase
          .from("advance_payments")
          .delete()
          .eq("id", deletingRow.id);
        if (error) throw error;
      }

      showToast("success", "Payment deleted");
      setDeletingRow(null);
      await fetchAll();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Delete error:", err);
      showToast("error", err.message || "Failed to delete payment");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Filtered + Sorted rows ── */
  const filtered = useMemo(() => {
    let out = rows.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (r.payment_ref || "").toLowerCase().includes(q) ||
        (r.invoice_number || "").toLowerCase().includes(q) ||
        (r.client_name || "").toLowerCase().includes(q) ||
        (r.ledger_name || "").toLowerCase().includes(q) ||
        (r.bank_name || "").toLowerCase().includes(q) ||
        (r.remarks || "").toLowerCase().includes(q);

      const matchType =
        filterType === "All" ||
        (filterType === "Invoice" && r._type === "invoice") ||
        (filterType === "Advance" && r._type === "advance");

      let matchKey = true;
      if (filterKey) {
        if (filterKey.startsWith("inv:"))
          matchKey = r.invoice_number === filterKey.slice(4);
        else if (filterKey.startsWith("client:"))
          matchKey = r.client_name === filterKey.slice(7);
      }

      return matchSearch && matchType && matchKey;
    });

    out = [...out].sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (sortField === "amount") { av = Number(av || 0); bv = Number(bv || 0); }
      else { av = (av || "").toString().toLowerCase(); bv = (bv || "").toString().toLowerCase(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return out;
  }, [rows, search, filterKey, filterType, sortField, sortDir]);

  if (!isOpen) return null;

  const totalAmount = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);
  const invoiceTotal = filtered
    .filter((r) => r._type === "invoice")
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const advanceTotal = filtered
    .filter((r) => r._type === "advance")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const handleExport = () => {
    setExporting(true);
    try {
      exportToExcel(filtered);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  /* ── Render ── */
  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ zIndex: 99999 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-6 right-6 z-[100000] px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg transition-all ${
              toast.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-rose-600 text-white"
            }`}
          >
            {toast.msg}
          </div>
        )}

        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 40 }}
          className="bg-white w-full sm:max-w-6xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
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

            {/* Stats */}
            <div className="relative mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Records", value: filtered.length, icon: Layers },
                {
                  label: "Total Received",
                  value: fmt(totalAmount),
                  icon: TrendingUp,
                },
                {
                  label: "Invoice Payments",
                  value: fmt(invoiceTotal),
                  icon: FileText,
                },
                {
                  label: "Advance Pending",
                  value: fmt(advanceTotal),
                  icon: ArrowDownCircle,
                },
              ].map(({ label, value, icon: Icon }, i) => (
                <div
                  key={`${label}-${i}`}
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

            {/* Invoice badge */}
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

          {/* ── TABS ── */}
          <div className="flex-shrink-0 flex items-center gap-1 px-5 pt-3 pb-0 bg-white border-b border-slate-200">
            {[
              { id: "payments", label: "Payment Details", icon: FileText },
              {
                id: "monthly",
                label: "Monthly Client Report",
                icon: BarChart2,
              },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all ${
                  activeTab === id
                    ? "border-emerald-600 text-emerald-700 bg-emerald-50/60"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* ── TAB CONTENT ── */}
          {activeTab === "payments" ? (
            <>
              {/* ── FILTERS ── */}
              <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-slate-100 space-y-3 bg-white">
                {/* Row 1: text search + searchable dropdown */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search ref, client, ledger, bank, remarks…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-black placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                  <SearchableDropdown rows={rows} value={filterKey} onChange={setFilterKey} />
                </div>
                {/* Row 2: type pills + clear + count */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter size={12} className="text-slate-400" />
                  {["All", "Invoice", "Advance"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                        filterType === t
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  {(filterKey || search) && (
                    <button
                      onClick={() => { setFilterKey(""); setSearch(""); }}
                      className="ml-2 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 transition-all flex items-center gap-1"
                    >
                      <X size={10} /> Clear Filters
                    </button>
                  )}
                  <span className="ml-auto text-[11px] text-slate-400 font-medium">
                    {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                  </span>
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
                    <p className="text-sm text-slate-800 font-medium">
                      No payment records found
                    </p>
                    <p className="text-xs text-slate-600">
                      Try adjusting filters or search
                    </p>
                  </div>
                ) : (
                  <table className="min-w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <SortTh label="Type"        field="invoice_number" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        <SortTh label="Ref No."     field="payment_ref"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        <SortTh label="Invoice"     field="invoice_number" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        <SortTh label="Client"      field="client_name"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        <SortTh label="Ledger"      field="ledger_name"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        <SortTh label="Entity/Dept" field="entity_name"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        <SortTh label="Amount"      field="amount"         sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        <SortTh label="Date"        field="payment_date"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        <SortTh label="Bank"        field="bank_name"      sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border-b border-emerald-900/20" style={{ background: "#022c22", color: "#6ee7b7" }}>Remarks</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border-b border-emerald-900/20" style={{ background: "#022c22", color: "#6ee7b7" }}>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filtered.map((r, index) => {
                        const isEditing =
                          editingRow?.id === r.id &&
                          editingRow?._type === r._type;
                        const isDeleting =
                          deletingRow?.id === r.id &&
                          deletingRow?._type === r._type;

                        return (
                          <React.Fragment key={`${r._type}-${r.id}`}>
                            <tr
                              className={`border-b border-emerald-100 transition-colors ${
                                isEditing
                                  ? "bg-emerald-50/80"
                                  : isDeleting
                                  ? "bg-rose-50/60"
                                  : index % 2 === 0
                                  ? "bg-white hover:bg-emerald-50"
                                  : "bg-emerald-50/30 hover:bg-emerald-50"
                              }`}
                            >
                              <td className="px-4 py-3 whitespace-nowrap">
                                <TypeBadge type={r._type} />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg">
                                  {r.payment_ref || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {r.invoice_number ? (
                                  <div className="flex items-center gap-1.5">
                                    <FileText
                                      size={11}
                                      className="text-slate-500"
                                    />
                                    <span className="text-xs text-black font-semibold">
                                      {r.invoice_number}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-xs">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap max-w-[150px]">
                                <div>
                                  <p className="font-semibold text-black text-xs truncate">
                                    {r.client_name || "—"}
                                  </p>
                                  {r.ledger_name && (
                                    <p className="text-[10px] text-slate-600 truncate">
                                      {r.ledger_name}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                                <span className="text-xs text-black">
                                  {r.ledger_name || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div>
                                  {r.entity_name && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                                      {r.entity_name}
                                    </span>
                                  )}
                                  {r.department_name && (
                                    <p className="text-[10px] text-black mt-0.5">
                                      {r.department_name}
                                    </p>
                                  )}
                                  {!r.entity_name && !r.department_name && (
                                    <span className="text-slate-400 text-xs">
                                      —
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <span className="font-bold text-emerald-800 text-sm">
                                  {fmt(r.amount)}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <Calendar
                                    size={11}
                                    className="text-slate-500"
                                  />
                                  <span className="text-xs text-black">
                                    {fmtDate(r.payment_date)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <Building2
                                    size={11}
                                    className="text-slate-500"
                                  />
                                  <span className="text-xs text-black">
                                    {r.bank_name || "—"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 max-w-[160px]">
                                <span
                                  className="text-xs text-black truncate block"
                                  title={r.remarks}
                                >
                                  {r.remarks || (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  {canEdit && (
                                    <button
                                      onClick={() =>
                                        isEditing
                                          ? setEditingRow(null)
                                          : startEdit(r)
                                      }
                                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        isEditing
                                          ? "bg-slate-100 text-slate-700"
                                          : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                      }`}
                                    >
                                      <Edit3 size={11} />
                                      {isEditing ? "Cancel" : "Edit"}
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      onClick={() =>
                                        isDeleting
                                          ? setDeletingRow(null)
                                          : setDeletingRow(r)
                                      }
                                      disabled={isEditing || deleting}
                                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        isDeleting
                                          ? "bg-slate-100 text-slate-700"
                                          : "bg-rose-100 text-rose-800 hover:bg-rose-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                      }`}
                                    >
                                      <Trash2 size={11} />
                                      {isDeleting ? "Cancel" : "Delete"}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Inline Edit Panel */}
                            {isEditing && (
                              <tr>
                                <td colSpan={11} className="p-0">
                                  <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-4">
                                    <p className="text-xs font-bold text-emerald-900 uppercase tracking-widest mb-3">
                                      Edit Payment — {r.payment_ref}
                                    </p>
                                    <div className="grid grid-cols-3 gap-4">
                                      <div>
                                        <label className="text-xs font-semibold text-black block mb-1">
                                          Amount (₹)
                                        </label>
                                        <input
                                          type="number"
                                          value={editAmount}
                                          onChange={(e) =>
                                            setEditAmount(e.target.value)
                                          }
                                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:border-emerald-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs font-semibold text-black block mb-1">
                                          Payment Date
                                        </label>
                                        <input
                                          type="date"
                                          value={editDate}
                                          onChange={(e) =>
                                            setEditDate(e.target.value)
                                          }
                                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:border-emerald-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs font-semibold text-black block mb-1">
                                          Remarks
                                        </label>
                                        <input
                                          type="text"
                                          value={editRemarks}
                                          onChange={(e) =>
                                            setEditRemarks(e.target.value)
                                          }
                                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:border-emerald-500"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-3 mt-4">
                                      <button
                                        onClick={() => setEditingRow(null)}
                                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-black hover:bg-slate-50"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2"
                                      >
                                        {saving && (
                                          <RefreshCw
                                            size={13}
                                            className="animate-spin"
                                          />
                                        )}
                                        {saving ? "Saving…" : "Save Changes"}
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}

                            {/* Inline Delete Confirm */}
                            {isDeleting && (
                              <tr>
                                <td colSpan={11} className="p-0">
                                  <div className="bg-rose-50 border-b border-rose-200 px-6 py-4 flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-bold text-rose-900">
                                        Delete this payment?
                                      </p>
                                      <p className="text-xs text-rose-800 mt-0.5">
                                        {fmt(r.amount)} ·{" "}
                                        {fmtDate(r.payment_date)} ·{" "}
                                        {r.payment_ref}
                                      </p>
                                      <p className="text-xs text-rose-700 mt-1">
                                        This will update the outstanding amount
                                        on the invoice.
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() => setDeletingRow(null)}
                                        className="px-4 py-2 border border-rose-300 rounded-lg text-sm text-rose-800 hover:bg-rose-100"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={handleDeleteConfirm}
                                        disabled={deleting}
                                        className="px-5 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 disabled:opacity-60 flex items-center gap-2"
                                      >
                                        {deleting && (
                                          <RefreshCw
                                            size={13}
                                            className="animate-spin"
                                          />
                                        )}
                                        {deleting ? "Deleting…" : "Yes, Delete"}
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>

                    {/* Totals footer */}
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
                        <td colSpan={4} />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </>
          ) : (
            /* ── MONTHLY REPORT TAB ── */
            <div className="flex-1 overflow-hidden flex flex-col">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-9 h-9 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
                  <p className="text-sm text-slate-400">Building report…</p>
                </div>
              ) : (
                <MonthlyReportTab rows={rows} invoices={invoices} />
              )}
            </div>
          )}

          {/* ── FOOTER ── */}
          <div className="flex-shrink-0 px-5 pb-6 pt-3 border-t border-slate-100 bg-white flex items-center gap-3">
            <button
              onClick={fetchAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-black text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            {canExport && (
              <button
                onClick={handleExport}
                disabled={exporting || filtered.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold transition-all disabled:opacity-50 shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #065f46, #059669)",
                  boxShadow: "0 4px 14px rgba(5,150,105,0.3)",
                }}
              >
                {exporting ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                Download Excel
              </button>
            )}
            <button
              onClick={onClose}
              className="ml-auto px-6 py-2.5 rounded-2xl border-2 border-slate-200 text-black text-sm font-semibold hover:bg-slate-50 transition-colors"
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