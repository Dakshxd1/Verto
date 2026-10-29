import React from "react";
import { Calendar, X } from "lucide-react";
import * as XLSX from "xlsx";

// Add >= from / <= to on a date column (dates are plain YYYY-MM-DD, no timezone shift)
export const applyRange = (query, column, range) => {
  let q = query;
  if (range?.from) q = q.gte(column, range.from);
  if (range?.to) q = q.lte(column, range.to);
  return q;
};

// Fetch past the 1000-row API cap. buildQuery must return a NEW query each call
// and should end with a stable order (add .order("id") as tie-breaker).
export const fetchAllRows = async (buildQuery, pageSize = 1000) => {
  let all = [];
  let start = 0;
  for (;;) {
    const { data, error } = await buildQuery().range(start, start + pageSize - 1);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < pageSize) break;
    start += pageSize;
  }
  return all;
};

export const rangeTag = (range) =>
  range?.from || range?.to
    ? `_${range.from || "start"}_to_${range.to || "latest"}`
    : "";

export const rangeText = (range) =>
  range?.from || range?.to
    ? ` [${range.from || "start"} to ${range.to || "latest"}]`
    : "";

export const writeXlsx = (headers, rows, sheetName, fileName) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
};

const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const lastDay = (y, m) => new Date(y, m + 1, 0).getDate();

const getPresets = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const ly = m === 0 ? y - 1 : y;
  const lm = m === 0 ? 11 : m - 1;
  const fy = m >= 3 ? y : y - 1; // Indian FY: Apr–Mar
  return [
    { label: "This month", from: ymd(y, m, 1), to: ymd(y, m, lastDay(y, m)) },
    { label: "Last month", from: ymd(ly, lm, 1), to: ymd(ly, lm, lastDay(ly, lm)) },
    { label: "This FY", from: ymd(fy, 3, 1), to: ymd(fy + 1, 2, 31) },
  ];
};

const DateRangeFilter = ({ from, to, onChange, label = "Date" }) => {
  const invalid = from && to && from > to;
  const box =
    "h-9 border border-slate-200 bg-white text-slate-800 rounded-lg px-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]";
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar className="w-4 h-4 text-slate-400" />
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </span>
      <input
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => onChange({ from: e.target.value, to })}
        className={box}
        aria-label="Start date"
      />
      <span className="text-xs text-slate-400">to</span>
      <input
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => onChange({ from, to: e.target.value })}
        className={box}
        aria-label="End date"
      />
      {getPresets().map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => onChange({ from: p.from, to: p.to })}
          className="h-9 px-3 rounded-lg border border-slate-200 bg-[#f7f8fb] text-[11px] font-semibold text-slate-600 hover:bg-[#eef3fa]"
        >
          {p.label}
        </button>
      ))}
      {(from || to) && (
        <button
          type="button"
          onClick={() => onChange({ from: "", to: "" })}
          className="h-9 w-9 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center"
          title="Clear dates"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {invalid && (
        <span className="text-xs text-rose-600">Start date is after end date</span>
      )}
    </div>
  );
};

export default DateRangeFilter;