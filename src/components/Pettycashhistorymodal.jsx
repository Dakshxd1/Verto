import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "../lib/supabaseClient";
import * as XLSX from "xlsx";
import { logExport, EXPORT_ACTIONS } from "../utils/auditLog";
import {
  X, Search, Download, SlidersHorizontal, ChevronUp, ChevronDown,
  TrendingUp, TrendingDown, Loader2, Wallet, Filter, Eye, EyeOff,
  RefreshCw,
} from "lucide-react";

// ─── COLUMN DEFINITIONS ───────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: "entry_date",   label: "Date" },
  { key: "type",         label: "Type" },
  { key: "amount",       label: "Amount" },
  { key: "header",       label: "Header" },
  { key: "department",   label: "Department" },
  { key: "cost_ops",     label: "Ops %" },
  { key: "cost_temp",    label: "Temp %" },
  { key: "cost_recruitment", label: "Rec %" },
  { key: "cost_projects",    label: "Projects %" },
  { key: "cost_others",  label: "Others %" },
  { key: "entry_mode",   label: "Mode" },
  { key: "remarks",      label: "Remarks" },
];

const DEFAULT_VISIBLE = [
  "entry_date","type","amount","header","department",
  "cost_ops","cost_temp","cost_recruitment","cost_projects","cost_others","remarks",
];

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"2-digit" })
  : "—";

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const PettyCashHistoryModal = ({ open, onClose, selectedBox }) => {
  const [entries, setEntries]             = useState([]);
  const [loading, setLoading]             = useState(false);

  // Column selector
  const [visibleCols, setVisibleCols]     = useState(DEFAULT_VISIBLE);
  const [colPanelOpen, setColPanelOpen]   = useState(false);

  // Filters
  const [search, setSearch]               = useState("");
  const [typeFilter, setTypeFilter]       = useState("all"); // all | debit | credit
  const [dateFrom, setDateFrom]           = useState("");
  const [dateTo, setDateTo]               = useState("");

  // Sorting
  const [sortKey, setSortKey]             = useState("entry_date");
  const [sortDir, setSortDir]             = useState("desc");

  // ── Load entries ──
  const loadEntries = async () => {
    if (!selectedBox) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("petty_cash_entries")
        .select("*")
        .eq("petty_cash_id", selectedBox.id)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error("History load error:", err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (open) loadEntries();
  }, [open, selectedBox]);

  // ── Sort handler ──
  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ── Filtered + sorted rows ──
  const rows = useMemo(() => {
    let data = [...entries];

    if (typeFilter !== "all") data = data.filter((e) => e.type === typeFilter);
    if (dateFrom)             data = data.filter((e) => e.entry_date >= dateFrom);
    if (dateTo)               data = data.filter((e) => e.entry_date <= dateTo);

    if (search.trim()) {
      const kw = search.toLowerCase();
      data = data.filter((e) =>
        (e.header || "").toLowerCase().includes(kw) ||
        (e.department || "").toLowerCase().includes(kw) ||
        (e.remarks || "").toLowerCase().includes(kw) ||
        String(e.amount || "").includes(kw)
      );
    }

    data.sort((a, b) => {
      let av = a[sortKey] ?? "";
      let bv = b[sortKey] ?? "";
      if (sortKey === "amount") { av = Number(av); bv = Number(bv); }
      else { av = String(av); bv = String(bv); }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return data;
  }, [entries, typeFilter, dateFrom, dateTo, search, sortKey, sortDir]);

  // ── Summary stats ──
  const totalIn  = rows.filter(e=>e.type==="credit").reduce((s,e)=>s+Number(e.amount||0),0);
  const totalOut = rows.filter(e=>e.type==="debit").reduce((s,e)=>s+Number(e.amount||0),0);

  // ── Excel export ──
  const exportExcel = () => {
    const visibleDefs = ALL_COLUMNS.filter((c) => visibleCols.includes(c.key));
    const exportRows = rows.map((e) => {
      const row = {};
      visibleDefs.forEach((c) => {
        if (c.key === "entry_date") row[c.label] = fmtDate(e[c.key]);
        else if (c.key === "amount") row[c.label] = Number(e[c.key] || 0);
        else row[c.label] = e[c.key] ?? "";
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Petty Cash");

    // Auto column width
    const maxWidths = {};
    exportRows.forEach((row) => {
      Object.entries(row).forEach(([k, v]) => {
        maxWidths[k] = Math.max(maxWidths[k] || k.length, String(v).length);
      });
    });
    ws["!cols"] = Object.values(maxWidths).map((w) => ({ wch: Math.min(w + 2, 40) }));

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `petty_cash_${selectedBox?.cash_name || "history"}_${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click();
    logExport({
      action:      EXPORT_ACTIONS.EXCEL,
      category:    "Petty Cash",
      description: `Downloaded Petty Cash History — ${selectedBox?.cash_name || ""}`,
      meta:        { cash_name: selectedBox?.cash_name },
    });
    URL.revokeObjectURL(url);
  };

  const toggleCol = (key) => {
    setVisibleCols((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const SortIcon = ({ colKey }) => {
    if (sortKey !== colKey) return <ChevronUp className="w-3 h-3 text-gray-300 inline ml-1" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-violet-500 inline ml-1" />
      : <ChevronDown className="w-3 h-3 text-violet-500 inline ml-1" />;
  };

  const renderCell = (row, key) => {
    switch (key) {
      case "entry_date": return <span className="font-mono text-xs">{fmtDate(row.entry_date)}</span>;
      case "type":
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold
            ${row.type === "credit" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
            {row.type === "credit" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {row.type === "credit" ? "In" : "Out"}
          </span>
        );
      case "amount":
        return (
          <span className={`font-semibold ${row.type === "credit" ? "text-emerald-600" : "text-red-500"}`}>
            {row.type === "credit" ? "+" : "−"}{fmt(row.amount)}
          </span>
        );
      case "entry_mode":
        return (
          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide
            ${row.entry_mode === "CASH_RECEIVED" ? "bg-emerald-50 text-emerald-600"
            : row.entry_mode === "EXPENSE"        ? "bg-red-50 text-red-600"
            : "bg-gray-100 text-gray-500"}`}>
            {row.entry_mode || "—"}
          </span>
        );
      case "cost_ops":
      case "cost_temp":
      case "cost_recruitment":
      case "cost_projects":
      case "cost_others":
        return <span className="text-xs text-gray-600">{row[key] > 0 ? `${row[key]}%` : "—"}</span>;
      default:
        return <span className="text-xs text-gray-700 max-w-[160px] truncate block">{row[key] || "—"}</span>;
    }
  };

  if (!open) return null;

  const visibleDefs = ALL_COLUMNS.filter((c) => visibleCols.includes(c.key));

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <motion.div
        initial={{ opacity:0, scale:0.97, y:16 }}
        animate={{ opacity:1, scale:1, y:0 }}
        exit={{ opacity:0, scale:0.97, y:16 }}
        transition={{ duration:0.2 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-700 rounded-t-2xl text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl"><Wallet className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold text-lg">Petty Cash History</h3>
              <p className="text-violet-200 text-xs">
                {selectedBox?.cash_name} — {rows.length} entries
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadEntries}
              className="p-2 rounded-lg hover:bg-white/20 transition" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={exportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition">
              <Download className="w-4 h-4" />Export Excel
            </button>
            <button onClick={() => setColPanelOpen((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition border border-white/30">
              <SlidersHorizontal className="w-4 h-4" />Columns
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/20 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Column selector panel (slide down) ── */}
        <AnimatePresence>
          {colPanelOpen && (
            <motion.div
              initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
              exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }}
              className="overflow-hidden border-b border-gray-100 flex-shrink-0"
            >
              <div className="px-6 py-4 bg-gray-50">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Toggle Columns — only selected columns export to Excel
                </p>
                <div className="flex flex-wrap gap-2">
                  {ALL_COLUMNS.map((col) => (
                    <button key={col.key} type="button" onClick={() => toggleCol(col.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition
                        ${visibleCols.includes(col.key)
                          ? "bg-violet-100 text-violet-700 border-violet-300"
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                      {visibleCols.includes(col.key) ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {col.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 mt-3">
                  <button onClick={() => setVisibleCols(ALL_COLUMNS.map(c=>c.key))}
                    className="text-xs text-violet-600 hover:underline">Show all</button>
                  <button onClick={() => setVisibleCols(DEFAULT_VISIBLE)}
                    className="text-xs text-violet-600 hover:underline">Reset default</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Filters bar ── */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap bg-white flex-shrink-0">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search header, dept, remarks, amount..."
              className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { val:"all",    label:"All" },
              { val:"credit", label:"Cash In" },
              { val:"debit",  label:"Expense" },
            ].map((t) => (
              <button key={t.val} onClick={() => setTypeFilter(t.val)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition
                  ${typeFilter === t.val ? "bg-white text-violet-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 w-[130px]" />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 w-[130px]" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="text-xs text-rose-500 hover:text-rose-700">Clear</button>
            )}
          </div>
        </div>

        {/* ── Summary strip ── */}
        <div className="px-6 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-6 text-xs flex-shrink-0">
          <span className="text-gray-500">Showing <strong className="text-gray-800">{rows.length}</strong> of {entries.length} entries</span>
          <span className="text-emerald-600 font-semibold">Total In: {fmt(totalIn)}</span>
          <span className="text-red-500 font-semibold">Total Out: {fmt(totalOut)}</span>
          <span className="text-violet-700 font-semibold">Net: {fmt(totalIn - totalOut)}</span>
        </div>

        {/* ── Table ── */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                {visibleDefs.map((col) => (
                  <th key={col.key}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-violet-600 hover:bg-violet-50 transition select-none"
                    onClick={() => handleSort(col.key)}>
                    {col.label}<SortIcon colKey={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={visibleDefs.length} className="text-center py-16 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading history...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleDefs.length} className="text-center py-16 text-gray-400">
                    <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No entries match your filters</p>
                    <button onClick={() => { setSearch(""); setTypeFilter("all"); setDateFrom(""); setDateTo(""); }}
                      className="text-xs text-violet-600 hover:underline mt-2">Clear all filters</button>
                  </td>
                </tr>
              ) : rows.map((row, i) => (
                <tr key={row.id}
                  className={`border-b border-gray-50 hover:bg-violet-50/30 transition
                    ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}
                    ${row.type === "credit" ? "border-l-2 border-l-emerald-300" : "border-l-2 border-l-red-300"}`}>
                  {visibleDefs.map((col) => (
                    <td key={col.key} className="px-4 py-2.5">
                      {renderCell(row, col.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-gray-500">
            {visibleCols.length} of {ALL_COLUMNS.length} columns visible • Excel export uses visible columns only
          </span>
          <button onClick={onClose}
            className="px-5 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PettyCashHistoryModal;