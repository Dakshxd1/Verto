import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AddBankModal from "./AddBankModal";
import AddEntryModal from "./AddEntryModal";
import supabase from "../lib/supabaseClient";
import {
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  Landmark,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Plus,
  Filter,
  ArrowLeftRight,
  History,
  Trash2,
  Edit2,
  Calendar,
  BarChart2,
  Clock,
  SplitSquareHorizontal,
  ChevronRight,
  TrendingDown,
  Layers,
  Zap,
} from "lucide-react";
import Card from "./ui/Card";
import Button from "./ui/button";
import Badge from "./ui/Badge";
import { usePerms } from "../context/PermissionsContext";

// ─── PERIOD CONFIG ─────────────────────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { key: "weekly", label: "Weekly", days: 7, icon: Zap, color: "indigo" },
  {
    key: "15days",
    label: "15 Days",
    days: 15,
    icon: SplitSquareHorizontal,
    color: "sky",
  },
  { key: "25days", label: "25 Days", days: 25, icon: Clock, color: "violet" },
  {
    key: "monthly",
    label: "Monthly",
    days: 30,
    icon: Calendar,
    color: "purple",
  },
];

const COLOR_MAP = {
  indigo: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-700",
    badge: "bg-indigo-100 text-indigo-700",
    btn: "bg-indigo-600 hover:bg-indigo-700",
  },
  sky: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-700",
    badge: "bg-sky-100 text-sky-700",
    btn: "bg-sky-600 hover:bg-sky-700",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    badge: "bg-violet-100 text-violet-700",
    btn: "bg-violet-600 hover:bg-violet-700",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    badge: "bg-purple-100 text-purple-700",
    btn: "bg-purple-600 hover:bg-purple-700",
  },
};

// ─── HELPERS ───────────────────────────────────────────────────────────────────
const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};
const fmtShort = (d) =>
  d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
const fmtLakh = (v = 0) => `₹ ${(Number(v) / 100000).toFixed(2)}L`;
const fmtFull = (v = 0) => `₹ ${Math.round(Number(v)).toLocaleString("en-IN")}`;

// ─── BUILD PERIOD BUCKETS ──────────────────────────────────────────────────────
const buildPeriodBuckets = (rawRows, periodDays) => {
  if (!rawRows || rawRows.length === 0) return [];

  const sorted = [...rawRows].sort(
    (a, b) => new Date(a.full_date) - new Date(b.full_date)
  );
  const today = new Date();
  // Start from the earliest row in your data, not today
  const firstDate = new Date(sorted[0].full_date);
  const start = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  // End 6 months after the latest row
  const lastDate = new Date(sorted[sorted.length - 1].full_date);
  const end = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 0);

  const buckets = [];
  let cursor = new Date(start);
  let runningBalance = Number(sorted[0].opening_balance || 0);

  while (cursor <= end) {
    const bucketStart = new Date(cursor);
    let bucketEnd;

    if (periodDays === 30) {
      bucketEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    } else {
      bucketEnd = addDays(cursor, periodDays - 1);
    }

    const rowsInBucket = sorted.filter((r) => {
      const d = new Date(r.full_date);
      return d >= bucketStart && d <= bucketEnd;
    });

    const sum = (key) =>
      rowsInBucket.reduce((s, r) => s + Number(r[key] || 0), 0);

    const income = sum("projected_income");
    const expense = sum("projected_expense");
    const netFlow = income - expense;

    const openingBalance = runningBalance;
    const closingBalance = openingBalance + netFlow;
    runningBalance = closingBalance;

    let label;
    if (periodDays === 7) label = `Week of ${fmtShort(bucketStart)}`;
    else if (periodDays === 30)
      label = bucketStart.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      });
    else label = `${fmtShort(bucketStart)} – ${fmtShort(bucketEnd)}`;

    buckets.push({
      label,
      startDate: bucketStart,
      endDate: bucketEnd,
      income,
      expense,
      netFlow,
      openingBalance,
      closingBalance,
      rowCount: rowsInBucket.length,
      breakdown: {
        expected_receivable: sum("expected_receivable"),
        advance_payment: sum("advance_payment"),
        salary_payout: sum("salary_payout"),
        statutory_outflow: sum("statutory_outflow"),
        other_expense: sum("other_expense"),
        petty_cash: sum("petty_cash"),
        bounce_risk: sum("bounce_risk"),
        bad_debt_cn: sum("bad_debt_cn"),
      },
    });

    if (periodDays === 30) {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    } else {
      cursor = addDays(bucketEnd, 1);
    }
  }

  return buckets;
};

// ─── FUND FLOW PROJECTION PANEL ────────────────────────────────────────────────
const FundFlowProjectionPanel = ({ fundFlowData }) => {
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [expandedRow, setExpandedRow] = useState(null);
  const [viewMode, setViewMode] = useState("combined");

  const periodCfg = PERIOD_OPTIONS.find((p) => p.key === selectedPeriod);
  const colors = COLOR_MAP[periodCfg.color];

  const buckets = useMemo(
    () => buildPeriodBuckets(fundFlowData, periodCfg.days),
    [fundFlowData, selectedPeriod]
  );

  const totalIncome = buckets.reduce((s, b) => s + b.income, 0);
  const totalExpense = buckets.reduce((s, b) => s + b.expense, 0);
  const totalNet = totalIncome - totalExpense;
  const maxBar = Math.max(
    ...buckets.map((b) => Math.max(b.income, b.expense)),
    1
  );

  const showIncome = viewMode === "combined" || viewMode === "income";
  const showExpense = viewMode === "combined" || viewMode === "expense";
  const showNet = viewMode === "combined";

  return (
    <div className="space-y-4">
      {/* ── Header card ── */}
      <Card className={`p-4 ${colors.bg} ${colors.border} border`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3
              className={`font-bold text-base ${colors.text} flex items-center gap-2`}
            >
              <TrendingUp className="w-4 h-4" />
              Fund Flow Projection
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Select a period to analyse cash flow
            </p>
          </div>

          {/* Period pills */}
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-inner border border-gray-100">
            {PERIOD_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = selectedPeriod === opt.key;
              const c = COLOR_MAP[opt.color];
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    setSelectedPeriod(opt.key);
                    setExpandedRow(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    active
                      ? `${c.btn} text-white shadow-md`
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* View mode pills */}
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-inner border border-gray-100">
            {[
              {
                id: "combined",
                label: "All",
                icon: Layers,
                activeClass: `${colors.btn} text-white shadow-md`,
              },
              {
                id: "income",
                label: "Income",
                icon: ArrowUpRight,
                activeClass: "bg-emerald-600 text-white shadow-md",
              },
              {
                id: "expense",
                label: "Expense",
                icon: ArrowDownLeft,
                activeClass: "bg-rose-600 text-white shadow-md",
              },
            ].map(({ id, label, icon: Icon, activeClass }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === id
                    ? activeClass
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            {
              label: "Total Income",
              value: totalIncome,
              textCls: "text-emerald-700",
              bgCls: "bg-emerald-50 border-emerald-200",
            },
            {
              label: "Total Expense",
              value: totalExpense,
              textCls: "text-rose-700",
              bgCls: "bg-rose-50 border-rose-200",
            },
            {
              label: "Net Flow",
              value: totalNet,
              textCls: totalNet >= 0 ? "text-emerald-700" : "text-rose-700",
              bgCls: "bg-white border-gray-200",
            },
          ].map(({ label, value, textCls, bgCls }) => (
            <div key={label} className={`rounded-xl border p-3 ${bgCls}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {label}
              </p>
              <p
                className={`text-lg font-extrabold font-mono ${textCls} leading-tight mt-0.5`}
              >
                {fmtLakh(value)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {fmtFull(value)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Mini bar chart ── */}
      {buckets.length > 0 && (
        <Card className="p-4 overflow-x-auto">
          <div
            className="flex items-end gap-1 min-w-max"
            style={{ height: 64 }}
          >
            {buckets.map((b, i) => {
              const incH = Math.round((b.income / maxBar) * 56) || 2;
              const expH = Math.round((b.expense / maxBar) * 56) || 2;
              const isActive = expandedRow === i;
              return (
                <div
                  key={i}
                  title={b.label}
                  onClick={() => setExpandedRow(isActive ? null : i)}
                  className={`flex items-end gap-0.5 cursor-pointer group ${
                    isActive ? "opacity-100" : "opacity-80 hover:opacity-100"
                  }`}
                  style={{ minWidth: 28 }}
                >
                  {showIncome && (
                    <div
                      className="w-3 rounded-t transition-all"
                      style={{
                        height: incH,
                        background: isActive ? "#059669" : "#34d399",
                      }}
                    />
                  )}
                  {showExpense && (
                    <div
                      className="w-3 rounded-t transition-all"
                      style={{
                        height: expH,
                        background: isActive ? "#e11d48" : "#fb7185",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" />
              Income
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <span className="w-2 h-2 rounded-sm bg-rose-400 inline-block" />
              Expense
            </span>
            <span className="text-[10px] text-gray-400 ml-auto">
              Click a bar to expand that row
            </span>
          </div>
        </Card>
      )}

      {/* ── Main table ── */}
      <Card className="overflow-hidden">
        <div
          className={`p-4 border-b ${colors.bg} ${colors.border} border-b flex justify-between items-center`}
        >
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            {React.createElement(periodCfg.icon, {
              className: `w-4 h-4 ${colors.text}`,
            })}
            {periodCfg.label} Projection — {buckets.length} periods
          </h3>
          <Badge className={colors.badge}>{periodCfg.label}</Badge>
        </div>

        <div className="overflow-x-auto" style={{ maxHeight: 520 }}>
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="p-4 w-5" />
                <th className="p-4">Period</th>
                <th className="p-4 text-right text-blue-700">Opening Bal</th>
                {showIncome && (
                  <th className="p-4 text-right text-emerald-700">Income</th>
                )}
                {showExpense && (
                  <th className="p-4 text-right text-rose-700">Expense</th>
                )}
                {showNet && <th className="p-4 text-right">Net Flow</th>}
                <th className={`p-4 text-right font-bold ${colors.text}`}>
                  Closing Bal
                </th>
                <th className="p-4 text-center">Trend</th>
              </tr>
            </thead>

            <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
              {buckets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-10 text-center text-gray-400">
                    <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No projection data. Make sure invoices / payouts exist in
                    your database.
                  </td>
                </tr>
              ) : (
                buckets.map((b, i) => {
                  const isExpanded = expandedRow === i;
                  const isGrowth = b.closingBalance >= b.openingBalance;
                  const pct =
                    b.openingBalance !== 0
                      ? Math.abs(
                          ((b.closingBalance - b.openingBalance) /
                            Math.abs(b.openingBalance)) *
                            100
                        )
                      : 0;

                  return (
                    <React.Fragment key={i}>
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => setExpandedRow(isExpanded ? null : i)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded ? colors.bg : "hover:bg-gray-50"
                        }`}
                        style={{ height: 52 }}
                      >
                        <td className="pl-4">
                          <ChevronRight
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          />
                        </td>

                        <td className="p-4 font-medium text-gray-900">
                          {b.label}
                          {b.rowCount > 0 && (
                            <span className="ml-2 text-[10px] text-gray-400">
                              ({b.rowCount} days)
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-right font-mono text-blue-700">
                          {fmtLakh(b.openingBalance)}
                        </td>

                        {showIncome && (
                          <td className="p-4 text-right font-mono text-emerald-700">
                            <span className="flex items-center justify-end gap-1">
                              <ArrowUpRight className="w-3 h-3" />
                              {fmtLakh(b.income)}
                            </span>
                          </td>
                        )}

                        {showExpense && (
                          <td className="p-4 text-right font-mono text-rose-700">
                            <span className="flex items-center justify-end gap-1">
                              <ArrowDownLeft className="w-3 h-3" />
                              {fmtLakh(b.expense)}
                            </span>
                          </td>
                        )}

                        {showNet && (
                          <td
                            className={`p-4 text-right font-mono font-semibold ${
                              b.netFlow >= 0
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }`}
                          >
                            {b.netFlow >= 0 ? "+" : ""}
                            {fmtLakh(b.netFlow)}
                          </td>
                        )}

                        <td
                          className={`p-4 text-right font-mono font-bold text-base ${colors.text}`}
                        >
                          {fmtLakh(b.closingBalance)}
                        </td>

                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isGrowth
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {isGrowth ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {pct.toFixed(1)}%
                          </span>
                        </td>
                      </motion.tr>

                      {/* ── Expanded breakdown ── */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <td
                              colSpan="8"
                              className={`px-6 py-4 ${colors.bg} border-b ${colors.border}`}
                            >
                              <div className="grid grid-cols-2 gap-6">
                                {showIncome && (
                                  <div>
                                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                      <ArrowUpRight className="w-3.5 h-3.5" />{" "}
                                      Income Breakdown
                                    </p>
                                    <div className="space-y-2">
                                      {[
                                        {
                                          label: "Expected Receivables",
                                          key: "expected_receivable",
                                        },
                                        {
                                          label: "Advance Payments",
                                          key: "advance_payment",
                                        },
                                      ].map(({ label, key }) => (
                                        <div
                                          key={key}
                                          className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-emerald-100"
                                        >
                                          <span className="text-xs text-gray-600">
                                            {label}
                                          </span>
                                          <span className="text-xs font-bold font-mono text-emerald-700">
                                            {fmtFull(b.breakdown[key])}
                                          </span>
                                        </div>
                                      ))}
                                      <div className="flex items-center justify-between bg-emerald-100 rounded-lg px-3 py-2 border border-emerald-200">
                                        <span className="text-xs font-bold text-emerald-900">
                                          Total Income
                                        </span>
                                        <span className="text-sm font-extrabold font-mono text-emerald-800">
                                          {fmtFull(b.income)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {showExpense && (
                                  <div>
                                    <p className="text-xs font-bold text-rose-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                      <ArrowDownLeft className="w-3.5 h-3.5" />{" "}
                                      Expense Breakdown
                                    </p>
                                    <div className="space-y-2">
                                      {[
                                        {
                                          label: "Salary Payout",
                                          key: "salary_payout",
                                        },
                                        {
                                          label: "Statutory Outflow",
                                          key: "statutory_outflow",
                                        },
                                        {
                                          label: "Other Expenses",
                                          key: "other_expense",
                                        },
                                        {
                                          label: "Petty Cash",
                                          key: "petty_cash",
                                        },
                                        {
                                          label: "Bounce Risk",
                                          key: "bounce_risk",
                                        },
                                        {
                                          label: "Bad Debt / CN",
                                          key: "bad_debt_cn",
                                        },
                                      ].map(({ label, key }) => (
                                        <div
                                          key={key}
                                          className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-rose-100"
                                        >
                                          <span className="text-xs text-gray-600">
                                            {label}
                                          </span>
                                          <span className="text-xs font-bold font-mono text-rose-700">
                                            {fmtFull(b.breakdown[key])}
                                          </span>
                                        </div>
                                      ))}
                                      <div className="flex items-center justify-between bg-rose-100 rounded-lg px-3 py-2 border border-rose-200">
                                        <span className="text-xs font-bold text-rose-900">
                                          Total Expense
                                        </span>
                                        <span className="text-sm font-extrabold font-mono text-rose-800">
                                          {fmtFull(b.expense)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-200">
                                <div className="text-center flex-1">
                                  <p className="text-[10px] text-gray-400 font-bold uppercase">
                                    Opening
                                  </p>
                                  <p className="text-sm font-bold font-mono text-blue-700">
                                    {fmtFull(b.openingBalance)}
                                  </p>
                                </div>
                                <div
                                  className={`text-center flex-1 px-2 py-1 rounded-lg ${
                                    b.netFlow >= 0
                                      ? "bg-emerald-50"
                                      : "bg-rose-50"
                                  }`}
                                >
                                  <p className="text-[10px] text-gray-400 font-bold uppercase">
                                    Net Flow
                                  </p>
                                  <p
                                    className={`text-sm font-bold font-mono ${
                                      b.netFlow >= 0
                                        ? "text-emerald-700"
                                        : "text-rose-700"
                                    }`}
                                  >
                                    {b.netFlow >= 0 ? "+" : ""}
                                    {fmtFull(b.netFlow)}
                                  </p>
                                </div>
                                <div className="text-center flex-1">
                                  <p className="text-[10px] text-gray-400 font-bold uppercase">
                                    Closing
                                  </p>
                                  <p
                                    className={`text-sm font-bold font-mono ${colors.text}`}
                                  >
                                    {fmtFull(b.closingBalance)}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {buckets.length > 0 && (
              <tfoot className="sticky bottom-0">
                <tr className="bg-gray-900 text-white text-xs font-bold">
                  <td />
                  <td className="px-4 py-3 uppercase tracking-wider text-gray-300">
                    Grand Total ({buckets.length} periods)
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-blue-300">
                    {fmtLakh(buckets[0]?.openingBalance || 0)}
                  </td>
                  {showIncome && (
                    <td className="px-4 py-3 text-right font-mono text-emerald-300">
                      {fmtLakh(totalIncome)}
                    </td>
                  )}
                  {showExpense && (
                    <td className="px-4 py-3 text-right font-mono text-rose-300">
                      {fmtLakh(totalExpense)}
                    </td>
                  )}
                  {showNet && (
                    <td
                      className={`px-4 py-3 text-right font-mono ${
                        totalNet >= 0 ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {totalNet >= 0 ? "+" : ""}
                      {fmtLakh(totalNet)}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right font-mono text-base text-purple-300">
                    {fmtLakh(buckets[buckets.length - 1]?.closingBalance || 0)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─── BANK TRANSFER MODAL ────────────────────────────────────────────────────────
const BankTransferModal = ({
  isOpen,
  onClose,
  banks,
  onSaved,
  editData,
  entries,
}) => {
  const { isIntern } = usePerms?.() || {};
  const [form, setForm] = useState({
    transfer_date: new Date().toISOString().split("T")[0],
    amount: "",
    sender_bank_id: "",
    receiver_bank_id: "",
    remarks: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setForm({
        transfer_date: editData.transfer_date || "",
        amount: editData.amount || "",
        sender_bank_id: editData.sender_bank_id || "",
        receiver_bank_id: editData.receiver_bank_id || "",
        remarks: editData.remarks || "",
      });
    } else {
      setForm({
        transfer_date: new Date().toISOString().split("T")[0],
        amount: "",
        sender_bank_id: "",
        receiver_bank_id: "",
        remarks: "",
      });
    }
  }, [editData, isOpen]);

  const handleSave = async () => {
    if (isIntern) return;
    if (
      !form.transfer_date ||
      !form.amount ||
      !form.sender_bank_id ||
      !form.receiver_bank_id
    ) {
      alert("Please fill all required fields");
      return;
    }
    if (form.sender_bank_id === form.receiver_bank_id) {
      alert("Sender and receiver bank cannot be the same");
      return;
    }
    if (parseFloat(form.amount) <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    // ✅ STEP 6: Fix bank_id type mismatch — cast both to string for comparison
    const senderRows = entries.filter(
      (e) => String(e.bank_id) === String(form.sender_bank_id)
    );
    const currentBalance = senderRows.reduce((sum, e) => {
      const amt = Number(e.amount || 0);
      return e.type === "debit" ? sum - amt : sum + amt;
    }, 0);
    if (parseFloat(form.amount) > currentBalance) {
      alert(
        `Insufficient Balance. Available: ₹${currentBalance.toLocaleString(
          "en-IN"
        )}`
      );
      return;
    }

    setLoading(true);
    try {
      if (editData?.id) {
        const { error } = await supabase
          .from("bank_transfers")
          .update({
            transfer_date: form.transfer_date,
            amount: parseFloat(form.amount),
            sender_bank_id: form.sender_bank_id,
            receiver_bank_id: form.receiver_bank_id,
            remarks: form.remarks,
          })
          .eq("id", editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("bank_transfers")
          .insert([
            {
              transfer_date: form.transfer_date,
              amount: parseFloat(form.amount),
              sender_bank_id: form.sender_bank_id,
              receiver_bank_id: form.receiver_bank_id,
              remarks: form.remarks,
              reference_no: "TRF-" + Date.now(),
            },
          ])
          .select()
          .single();
        if (error) throw error;
      }
      onSaved?.();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">
                  {editData ? "Edit Transfer" : "Bank to Bank Transfer"}
                </h3>
                <p className="text-indigo-100 text-xs">
                  Internal fund movement
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                Date *
              </label>
              <input
                type="date"
                value={form.transfer_date}
                onChange={(e) =>
                  setForm({ ...form, transfer_date: e.target.value })
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                Amount (₹) *
              </label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="Enter amount"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  From Bank *
                </label>
                <select
                  value={form.sender_bank_id}
                  onChange={(e) =>
                    setForm({ ...form, sender_bank_id: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-rose-50"
                >
                  <option value="">Select bank</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-5 flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  To Bank *
                </label>
                <select
                  value={form.receiver_bank_id}
                  onChange={(e) =>
                    setForm({ ...form, receiver_bank_id: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-emerald-50"
                >
                  <option value="">Select bank</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                Remarks
              </label>
              <input
                type="text"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="Optional note..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="px-5 pb-5 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || isIntern}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60 ${
                isIntern
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {loading
                ? "Saving…"
                : isIntern
                ? "View Only"
                : editData
                ? "Update Transfer"
                : "Save Transfer"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── BANK TRANSFER HISTORY DRAWER ──────────────────────────────────────────────
const BankTransferHistoryDrawer = ({
  isOpen,
  onClose,
  transfers,
  onEdit,
  onDelete,
  isIntern,
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black z-40"
          onClick={onClose}
        />
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col"
        >
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Transfer History</h3>
                <p className="text-indigo-100 text-xs">
                  {transfers.length} transfers found
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {transfers.length === 0 ? (
              <div className="text-center text-gray-400 py-16">
                <ArrowLeftRight className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No transfers recorded yet</p>
              </div>
            ) : (
              transfers.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">
                        {t.transfer_date
                          ? new Date(t.transfer_date).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : "-"}
                      </p>
                      <p className="font-bold text-lg text-gray-900">
                        ₹ {Number(t.amount).toLocaleString("en-IN")}
                      </p>
                      {t.reference_no && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {t.reference_no}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!isIntern && (
                        <button
                          onClick={() => onEdit(t)}
                          className="p-1.5 hover:bg-indigo-50 rounded-lg text-gray-400 hover:text-indigo-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {!isIntern && (
                        <button
                          onClick={() => onDelete(t.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                    <div className="flex-1 text-center">
                      <p className="text-xs text-gray-400 mb-1">From</p>
                      <div className="bg-rose-100 text-rose-700 rounded-lg px-2 py-1.5 text-xs font-semibold">
                        {t.sender_bank_name || "—"}
                      </div>
                    </div>
                    <ArrowLeftRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 text-center">
                      <p className="text-xs text-gray-400 mb-1">To</p>
                      <div className="bg-emerald-100 text-emerald-700 rounded-lg px-2 py-1.5 text-xs font-semibold">
                        {t.receiver_bank_name || "—"}
                      </div>
                    </div>
                  </div>
                  {t.remarks && (
                    <p className="text-xs text-gray-500 mt-2 pl-1">
                      💬 {t.remarks}
                    </p>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ─── MAIN BANKRECO COMPONENT ────────────────────────────────────────────────────
const BankReco = () => {
  const { isIntern } = usePerms?.() || {};
  const [bankData, setBankData] = useState([]);
  const [fundFlowData, setFundFlowData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("All");
  const [activeView, setActiveView] = useState("reco");
  const [sortType, setSortType] = useState("none");
  const [banks, setBanks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [softwareEntries, setSoftwareEntries] = useState([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showTransferHistory, setShowTransferHistory] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [interestPenalties, setInterestPenalties] = useState([]);
  const [editTransfer, setEditTransfer] = useState(null);
  const [futureEntries, setFutureEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({
    entity: "",
    bank_id: "",
    dateOfBankBal: "",
    amount: "",
    remarks: "",
    entry_type: "manual_adjustment",
    transaction_mode: "credit",
  });

  // ─── FETCH ─────────────────────────────────────────────────────────────────
  const fetchBanks = async () => {
    const { data, error } = await supabase
      .from("bank_master")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setBanks(data || []);
  };

  // ✅ STEP 1: Fix deduplication — use e.id instead of composite key
  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from("bank_entries")
      .select(
        `
        *,
        bank_master(bank_name)
      `
      )
      .eq("is_deleted", false)
      .neq("entry_type", "projection_pending")
      .order("date", { ascending: false });

    if (!error) {
      const seen = new Set();
      const unique = [];

      (data || []).forEach((e) => {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          unique.push(e);
        }
      });

      setEntries(unique);
    }
  };

  const fetchSoftwareEntries = async () => {
    const { data, error } = await supabase
      .from("software_entries")
      .select("*")
      .order("date", { ascending: false });
    if (!error) setSoftwareEntries(data || []);
  };

  const fetchOutstandingInvoices = async () => {
    const { data, error } = await supabase
      .from("outstanding_invoice_view")
      .select("*");
    if (!error) setOutstandingInvoices(data || []);
  };

  const fetchTransfers = async () => {
    const { data, error } = await supabase
      .from("bank_transfer_view")
      .select("*")
      .order("transfer_date", { ascending: false });
    if (!error) setTransfers(data || []);
  };

  const fetchInterestPenalties = async () => {
    const { data, error } = await supabase
      .from("interest_penalties")
      .select("*, bank_master(bank_name)")
      .order("entry_date", { ascending: false });
    if (!error) setInterestPenalties(data || []);
  };

  const fetchFundFlowProjection = async () => {
    const { data, error } = await supabase
      .from("master_cashflow_view")
      .select(
        `
        month,
        full_date,
        opening_balance,
        expected_receivable,
        advance_payment,
        salary_payout,
        statutory_outflow,
        other_expense,
        petty_cash,
        bounce_risk,
        bad_debt_cn,
        projected_income,
        projected_expense,
        net_flow,
        projected_closing_balance
      `
      )
      .order("full_date", { ascending: true });

    if (error) {
      console.error("Fund Flow Error:", error);
      return;
    }

    setFundFlowData(
      (data || []).map((row) => ({
        ...row,
        opening_balance: Number(row.opening_balance || 0),
        expected_receivable: Number(row.expected_receivable || 0),
        advance_payment: Number(row.advance_payment || 0),
        salary_payout: Number(row.salary_payout || 0),
        statutory_outflow: Number(row.statutory_outflow || 0),
        other_expense: Number(row.other_expense || 0),
        petty_cash: Number(row.petty_cash || 0),
        bounce_risk: Number(row.bounce_risk || 0),
        bad_debt_cn: Number(row.bad_debt_cn || 0),
        projected_income: Number(row.projected_income || 0),
        projected_expense: Number(row.projected_expense || 0),
        net_flow: Number(row.net_flow || 0),
        projected_closing_balance: Number(row.projected_closing_balance || 0),
      }))
    );
  };

  const fetchFutureEntries = async (bankId) => {
    const { data, error } = await supabase
      .from("future_bank_projection_view")
      .select("*")
      .eq("bank_id", bankId)
      .order("expected_date", { ascending: true });

    if (!error) {
      setFutureEntries(data || []);
    }
  };

  // ✅ STEP 2: Replace async DB-calling calculateSoftwareBalance with sync version
  const calculateSoftwareBalance = (bankId, openingBalance = 0) => {
    const bankSw = softwareEntries.filter(
      (e) => String(e.bank_id) === String(bankId) && !e.is_deleted
    );
    const movement = bankSw.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return openingBalance + movement;
  };

  // ✅ STEP 3: Replace entire buildBankRecoData — now sync, per-bank, uses opening_balance
  const buildBankRecoData = () => {
    // ── 1. Build opening_balance map from bank_master ──
    const openingMap = {};
    banks.forEach((b) => {
      openingMap[b.id] = Number(b.opening_balance || 0);
    });

    // ── 2. Compute total bank balance per bank (opening + all movements) ──
    const bankMovement = {};
    entries.forEach((e) => {
      if (!e.bank_id) return;
      const id = e.bank_id;
      if (!bankMovement[id]) bankMovement[id] = 0;
      const amt = Number(e.amount || 0);
      bankMovement[id] += e.type === "debit" ? -Math.abs(amt) : Math.abs(amt);
    });

    // ── 3. Compute total SW balance per bank (opening + all movements) ──
    const swMovement = {};
    softwareEntries.forEach((e) => {
      if (!e.bank_id || e.is_deleted) return;
      const id = e.bank_id;
      if (!swMovement[id]) swMovement[id] = 0;
      swMovement[id] += Number(e.amount || 0);
    });

    // ── 4. Build one row per bank ──
    const rows = banks.map((bank) => {
      const opening = Number(bank.opening_balance || 0);
      const bankBal = opening + (bankMovement[bank.id] || 0);
      const swBal = opening + (swMovement[bank.id] || 0);
      const diff = bankBal - swBal;

      // Collect all entries for this bank for the detail panel
      const bankEntries = entries.filter(
        (e) => String(e.bank_id) === String(bank.id)
      );

      const manualEntries = bankEntries.map((e) => {
        const flowType = e.flow_type || "";
        return {
          date: e.date,
          entity: e.entity || "Verto India Pvt Ltd",
          transactionLabel:
            flowType === "petty_cash"
              ? "Petty Cash"
              : flowType === "salary"
              ? "Salary Payout"
              : flowType === "statutory"
              ? "Statutory Payment"
              : flowType === "penalty"
              ? "Interest / Penalty"
              : flowType === "expense"
              ? "Expense"
              : flowType === "travel"
              ? "Travel Expense"
              : flowType === "food"
              ? "Food Expense"
              : e.entry_type === "payment_received"
              ? "Payment Received"
              : e.entry_type === "payment_made"
              ? "Payment Made"
              : e.entry_type === "employee_payout"
              ? "Employee Payout"
              : e.entry_type === "statutory_payment"
              ? "Statutory Payment"
              : e.entry_type === "interest_penalty"
              ? "Interest / Penalty"
              : e.entry_type === "bank_transfer"
              ? "Bank Transfer"
              : e.entry_type === "manual_adjustment"
              ? "Manual Entry"
              : e.entry_type === "advance_payment"
              ? "Advance Payment"
              : e.entry_type === "unidentified_credit"
              ? "Unidentified Credit"
              : "Other",
          amount: e.type === "debit" ? -Math.abs(e.amount) : Math.abs(e.amount),
          remarks: e.remarks,
        };
      });

      // Reconciling items: entries in bank with no SW mirror
      const unreconciledItems = bankEntries.filter(
        (e) =>
          e.source_id &&
          !softwareEntries.some(
            (s) =>
              s.source_table === e.source_table &&
              String(s.source_id) === String(e.source_id) &&
              !s.is_deleted
          )
      );

      return {
        id: bank.id,
        bank_id: bank.id,
        bank_name: bank.bank_name,
        date: bankEntries[0]?.date || null,
        month: bankEntries[0]?.date
          ? new Date(bankEntries[0].date).toISOString().slice(0, 7)
          : "",
        asPerBankTotalBal: bankBal,
        asPerSwTotalBal: swBal,
        difference: diff,
        remainingBalance: Math.abs(diff),
        // ✅ FIXED: reconciled = difference < ₹1 (not ₹50,000)
        status: Math.abs(diff) < 1 ? "reconciled" : "pending",
        manualEntries,
        unreconciledItems,
      };
    });

    setBankData(rows);
  };

  // ─── EFFECTS ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchBanks();
    fetchEntries();
    fetchSoftwareEntries();
    fetchOutstandingInvoices();
    fetchFundFlowProjection();
    fetchTransfers();
    fetchInterestPenalties();
  }, []);

  // ✅ STEP 4: Fix useEffect — remove async wrapper, add banks as dependency
  useEffect(() => {
    if (banks.length > 0) buildBankRecoData();
  }, [entries, softwareEntries, banks]);

  useEffect(() => {
    const ch = supabase
      .channel("realtime-bank")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bank_entries" },
        () => fetchEntries()
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);
  useEffect(() => {
    const ch = supabase
      .channel("bank-master-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bank_master" },
        () => fetchBanks()
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);
  useEffect(() => {
    const ch = supabase
      .channel("bank-transfers-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bank_transfers" },
        () => fetchTransfers()
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);
  useEffect(() => {
    const ch = supabase
      .channel("payments-expenses-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments_made" },
        () => {
          fetchEntries();
          fetchFundFlowProjection();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => {
          fetchEntries();
          fetchFundFlowProjection();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments_received" },
        () => fetchFundFlowProjection()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employee_expense_payouts" },
        () => fetchFundFlowProjection()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "statutory_payments" },
        () => fetchFundFlowProjection()
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  window.refreshBanks = fetchBanks;

  // ─── HELPERS ───────────────────────────────────────────────────────────────
  const formatCurrency = (val = 0) => `₹ ${(Number(val) / 100000).toFixed(2)}L`;
  const formatCurrencyFull = (val = 0) =>
    `₹ ${Number(val).toLocaleString("en-IN")}`;

  // ─── TRANSFER HANDLERS ─────────────────────────────────────────────────────
  const handleDeleteTransfer = async (id) => {
    if (isIntern) return;
    if (!window.confirm("Delete this transfer?")) return;
    const { error } = await supabase
      .from("bank_transfers")
      .delete()
      .eq("id", id);
    if (error) alert(error.message);
    else fetchTransfers();
  };
  const handleEditTransfer = (t) => {
    setEditTransfer(t);
    setShowTransferModal(true);
  };

  // ─── FILTERED DATA ─────────────────────────────────────────────────────────
  const filteredData = bankData
    .filter((row) => {
      const matchSearch =
        (row.month || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.bank_name || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchMonth = monthFilter === "All" || row.month === monthFilter;
      return matchSearch && matchMonth;
    })
    .sort((a, b) => {
      if (sortType === "highDiff")
        return Math.abs(b.difference) - Math.abs(a.difference);
      if (sortType === "lowDiff")
        return Math.abs(a.difference) - Math.abs(b.difference);
      return 0;
    });

  // ✅ STEP 5: Fix stale selectedRow update — just clear it instead of setTimeout
  const handleAddEntry = async () => {
    if (isIntern) return;
    if (!newEntry.bank_id || !newEntry.amount || !newEntry.dateOfBankBal) {
      alert("Fill all required fields");
      return;
    }
    const enteredAmount = parseFloat(newEntry.amount || 0);
    if (enteredAmount <= 0) {
      alert("Amount must be greater than 0");
      return;
    }
    if (!selectedRow) {
      alert("No month selected. Please select a row first.");
      return;
    }

    const currentRemaining =
      (selectedRow?.asPerBankTotalBal || 0) -
      (selectedRow?.asPerSwTotalBal || 0);
    if (enteredAmount > Math.abs(currentRemaining)) {
      alert(
        `Cannot enter more than remaining balance ₹${Math.abs(
          currentRemaining
        )}`
      );
      return;
    }

    let finalAmount = enteredAmount;
    let finalType = newEntry.transaction_mode || "credit";
    let finalEntryType = newEntry.entry_type || "manual_adjustment";
    if (!newEntry.entry_type || newEntry.entry_type === "other")
      finalEntryType = "manual_adjustment";

    if (newEntry.transaction_mode === "total_update") {
      const bankEntries = entries.filter(
        (e) => String(e.bank_id) === String(newEntry.bank_id)
      );
      const currentBalance = bankEntries.reduce((sum, e) => {
        const amt = Math.abs(Number(e.amount || 0));
        return String(e.type).toLowerCase() === "debit" ? sum - amt : sum + amt;
      }, 0);
      const adjustment = enteredAmount - currentBalance;
      finalAmount = Math.abs(adjustment);
      finalType = adjustment >= 0 ? "credit" : "debit";
      finalEntryType = "bank_balance_adjustment";
    }

    const { error } = await supabase.from("bank_entries").insert([
      {
        bank_id: newEntry.bank_id,
        entity: newEntry.entity || "Verto India Pvt Ltd",
        amount: finalAmount,
        date: newEntry.dateOfBankBal || new Date().toISOString().split("T")[0],
        remarks: newEntry.remarks || "",
        entry_type: finalEntryType,
        type: finalType,
        reference_no: "BNK-" + Date.now(),
      },
    ]);
    if (error) {
      alert(error.message);
      return;
    }

    setShowEntryModal(false);
    setNewEntry({
      entity: "",
      bank_id: "",
      dateOfBankBal: "",
      amount: "",
      remarks: "",
      entry_type: "other",
    });
    await fetchEntries();
    await fetchSoftwareEntries();
    await fetchFundFlowProjection();

    // selectedRow will auto-update via bankData state change after fetchEntries completes
    // Just clear it so the user sees fresh data when they re-select
    setSelectedRow(null);

    window.refreshDashboard?.();
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-6">
      <BankTransferModal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setEditTransfer(null);
        }}
        banks={banks}
        editData={editTransfer}
        entries={entries}
        onSaved={async () => {
          await fetchTransfers();
          await fetchEntries();
          await fetchSoftwareEntries();
          buildBankRecoData();
          setEditTransfer(null);
        }}
      />
      <BankTransferHistoryDrawer
        isOpen={showTransferHistory}
        onClose={() => setShowTransferHistory(false)}
        transfers={transfers}
        onEdit={handleEditTransfer}
        onDelete={handleDeleteTransfer}
        isIntern={isIntern}
      />

      {/* ── Filter bar ── */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveView("reco")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeView === "reco"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Bank Reconciliation
              </button>
              <button
                onClick={() => setActiveView("projection")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeView === "projection"
                    ? "bg-white text-purple-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Fund Flow Projection
              </button>
            </div>
            {activeView === "reco" && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search month or bank…"
                    className="w-48 bg-gray-50 border border-gray-200 text-gray-900 pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <select
                  value={sortType}
                  onChange={(e) => setSortType(e.target.value)}
                  className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm"
                >
                  <option value="none">Sort</option>
                  <option value="highDiff">High Difference</option>
                  <option value="lowDiff">Low Difference</option>
                </select>
              </>
            )}
          </div>
          <Button
            onClick={() => {
              const csv = bankData
                .map(
                  (d) =>
                    `${d.month},${d.date},${d.asPerBankTotalBal},${d.asPerSwTotalBal},${d.difference}`
                )
                .join("\n");
              const blob = new Blob(
                [["Month,Date,Bank,Software,Difference\n", csv].join("")],
                { type: "text/csv" }
              );
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = "bank_reconciliation.csv";
              link.click();
            }}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </Card>

      {/* ── Main content ── */}
      {activeView === "projection" ? (
        <FundFlowProjectionPanel fundFlowData={fundFlowData} />
      ) : (
        <div className="flex gap-4">
          {/* LEFT: Reco table */}
          <div className="flex-1 space-y-4">
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <Landmark className="w-4 h-4 mr-2 text-blue-600" />
                  Bank Reconciliation (5A)
                </h3>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {filteredData.length} records
                  </Badge>
                  <Badge className="bg-emerald-100 text-emerald-700">
                    {
                      filteredData.filter((d) => d.status === "reconciled")
                        .length
                    }{" "}
                    Reconciled
                  </Badge>
                </div>
              </div>
              <div
                className="overflow-x-auto"
                style={{ minHeight: 400, maxHeight: 500 }}
              >
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="p-4 w-24">Bank</th>
                      <th className="p-4 w-28">Date</th>
                      <th className="p-4 text-right w-36 text-blue-700">
                        As Per Bank
                      </th>
                      <th className="p-4 text-right w-36 text-emerald-700">
                        As Per S/w
                      </th>
                      <th className="p-4 text-right w-28 font-bold">
                        Difference
                      </th>
                      <th className="p-4 text-center w-28">Status</th>
                      <th className="p-4 text-center w-20">View</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
                    {filteredData.map((row, index) => (
                      <React.Fragment key={row.id}>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.01 }}
                          onClick={() => {
                            setSelectedRow(row);
                            setRemainingBalance(
                              (row.asPerBankTotalBal || 0) -
                                (row.asPerSwTotalBal || 0)
                            );
                            fetchFutureEntries(row.bank_id);
                          }}
                          className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                            selectedRow?.id === row.id ? "bg-blue-50" : ""
                          }`}
                          style={{ height: 56 }}
                        >
                          <td className="p-4 font-medium text-gray-900">
                            {row.bank_name}
                          </td>
                          <td className="p-4 text-gray-600">
                            {row.date
                              ? new Date(row.date).toLocaleDateString("en-GB")
                              : "-"}
                          </td>
                          <td className="p-4 text-right font-mono text-blue-700">
                            {formatCurrency(row.asPerBankTotalBal)}
                          </td>
                          <td className="p-4 text-right font-mono text-emerald-700">
                            {formatCurrency(row.asPerSwTotalBal)}
                          </td>
                          <td className="p-4 text-right">
                            <span
                              className={`font-mono font-bold ${
                                Math.abs(row.difference) < 1
                                  ? "text-emerald-600"
                                  : "text-rose-600"
                              }`}
                            >
                              {row.difference > 0 ? "+" : ""}
                              {formatCurrency(Math.abs(row.difference))}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {row.status === "reconciled" ? (
                              <Badge className="bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Reconciled
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {selectedRow?.id === row.id ? (
                              <ChevronUp className="w-5 h-5 text-blue-600" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </td>
                        </motion.tr>

                        <AnimatePresence>
                          {selectedRow?.id === row.id && (
                            <motion.tr
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <td colSpan="7" className="bg-blue-50 p-4">
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                  {[
                                    {
                                      label: "Bank Balance",
                                      value: row.asPerBankTotalBal,
                                      cls: "text-blue-700",
                                    },
                                    {
                                      label: "Software Balance",
                                      value: row.asPerSwTotalBal,
                                      cls: "text-emerald-700",
                                    },
                                    {
                                      label: "Difference",
                                      value: Math.abs(row.difference),
                                      cls:
                                        Math.abs(row.difference) < 1
                                          ? "text-emerald-600"
                                          : "text-rose-600",
                                    },
                                  ].map(({ label, value, cls }) => (
                                    <div
                                      key={label}
                                      className="bg-white p-3 rounded-lg shadow"
                                    >
                                      <p className="text-xs text-gray-500">
                                        {label}
                                      </p>
                                      <p
                                        className={`font-mono font-bold ${cls}`}
                                      >
                                        {formatCurrencyFull(value)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                                {row.manualEntries.length > 0 && (
                                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                      <thead className="bg-gray-50">
                                        <tr className="text-gray-500">
                                          <th className="p-2 text-left">
                                            Date
                                          </th>
                                          <th className="p-2 text-left">
                                            Flow Type
                                          </th>
                                          <th className="p-2 text-left">
                                            Remarks
                                          </th>
                                          <th className="p-2 text-right">
                                            Amount
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {row.manualEntries.map((entry, idx) => (
                                          <tr key={idx}>
                                            <td className="p-2 text-gray-700">
                                              {new Date(
                                                entry.date
                                              ).toLocaleDateString("en-GB")}
                                            </td>
                                            <td className="p-2">
                                              <Badge
                                                variant="secondary"
                                                className={`text-xs font-semibold ${
                                                  entry.amount >= 0
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-rose-100 text-rose-700"
                                                }`}
                                              >
                                                {entry.transactionLabel}
                                              </Badge>
                                            </td>
                                            <td className="p-2 text-gray-500">
                                              {entry.remarks || "-"}
                                            </td>
                                            <td
                                              className={`p-2 text-right font-mono font-bold ${
                                                entry.amount >= 0
                                                  ? "text-emerald-600"
                                                  : "text-rose-600"
                                              }`}
                                            >
                                              <div className="flex items-center justify-end gap-1">
                                                {entry.amount >= 0 ? (
                                                  <ArrowDownLeft className="w-3 h-3" />
                                                ) : (
                                                  <ArrowUpRight className="w-3 h-3" />
                                                )}
                                                {entry.amount >= 0 ? "+" : "-"}
                                                {formatCurrencyFull(
                                                  Math.abs(entry.amount)
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* ✅ STEP 7: Add unreconciled items breakdown */}
                                {row.unreconciledItems?.length > 0 && (
                                  <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-3">
                                    <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2">
                                      ⚠️ {row.unreconciledItems.length}{" "}
                                      Unmirrored Bank Entries (causing gap)
                                    </p>
                                    <div className="space-y-1">
                                      {row.unreconciledItems.map((e) => (
                                        <div
                                          key={e.id}
                                          className="flex justify-between text-xs bg-white rounded px-2 py-1 border border-rose-100"
                                        >
                                          <span className="text-gray-600">
                                            {e.entry_type} ·{" "}
                                            {new Date(
                                              e.date
                                            ).toLocaleDateString("en-GB")}
                                          </span>
                                          <span
                                            className={`font-mono font-bold ${
                                              e.type === "debit"
                                                ? "text-rose-600"
                                                : "text-emerald-600"
                                            }`}
                                          >
                                            {e.type === "debit" ? "-" : "+"}₹
                                            {Number(e.amount).toLocaleString(
                                              "en-IN"
                                            )}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* ─── Pending Payment Action Center ─── */}
                                <Card className="p-4 mt-4 border border-amber-200 bg-amber-50">
                                  <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-amber-800 flex items-center gap-2">
                                      <Clock className="w-4 h-4" />
                                      Pending Payment Action Center
                                    </h3>
                                    <Badge className="bg-amber-100 text-amber-700">
                                      {futureEntries.length} Pending
                                    </Badge>
                                  </div>
                                  <div className="space-y-3">
                                    {futureEntries.length === 0 && (
                                      <div className="text-center text-gray-400 py-6">
                                        No pending payments for this bank
                                      </div>
                                    )}
                                    {futureEntries.map((item) => (
                                      <div
                                        key={item.id}
                                        className="bg-white rounded-xl border border-amber-100 p-4"
                                      >
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <p className="font-bold text-gray-900">
                                              {item.category}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                              {item.expected_date}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                              {item.remarks}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-bold text-rose-700">
                                              ₹{" "}
                                              {Number(
                                                item.amount
                                              ).toLocaleString("en-IN")}
                                            </p>
                                            <Badge
                                              className={
                                                item.due_status === "overdue"
                                                  ? "bg-red-100 text-red-700 mt-2"
                                                  : "bg-amber-100 text-amber-700 mt-2"
                                              }
                                            >
                                              {item.due_status}
                                            </Badge>
                                          </div>
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                          {!isIntern && (
                                            <button
                                              onClick={async () => {
                                                await supabase.rpc(
                                                  "complete_projection",
                                                  {
                                                    p_projection_id: item.id,
                                                  }
                                                );
                                                fetchFutureEntries(
                                                  selectedRow.bank_id
                                                );
                                                fetchEntries();
                                                fetchSoftwareEntries();
                                                fetchFundFlowProjection();
                                              }}
                                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                                            >
                                              DONE
                                            </button>
                                          )}
                                          {!isIntern && (
                                            <button
                                              onClick={async () => {
                                                await supabase.rpc(
                                                  "delete_projection_complete",
                                                  {
                                                    p_projection_id: item.id,
                                                  }
                                                );
                                                fetchFutureEntries(
                                                  selectedRow.bank_id
                                                );
                                              }}
                                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
                                            >
                                              DELETE
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </Card>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* RIGHT: Side panel */}
          <div className="w-80 shrink-0 space-y-4">
            <AnimatePresence mode="wait">
              {selectedRow ? (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Card className="border-blue-200 shadow-lg overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg">
                            Bank Reconciliation
                          </h3>
                          <p className="text-blue-100 text-sm">
                            {selectedRow.bank_name} •{" "}
                            {selectedRow.date
                              ? new Date(selectedRow.date).toLocaleDateString(
                                  "en-GB"
                                )
                              : "-"}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedRow(null)}
                          className="text-blue-200 hover:text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto">
                      <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center">
                        <Wallet className="w-3 h-3 mr-1" /> Balance Comparison
                      </h4>
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <p className="text-sm text-blue-700 font-medium mb-1">
                          As Per Bank
                        </p>
                        <p className="text-xl font-bold font-mono text-blue-700">
                          {formatCurrencyFull(selectedRow.asPerBankTotalBal)}
                        </p>
                        <p className="text-xs text-blue-500 mt-1">
                          Manual entry from bank statement
                        </p>
                      </div>
                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <p className="text-sm text-emerald-700 font-medium mb-1">
                          As Per Software
                        </p>
                        <p className="text-xl font-bold font-mono text-emerald-700">
                          {formatCurrencyFull(selectedRow.asPerSwTotalBal)}
                        </p>
                        <p className="text-xs text-emerald-500 mt-1">
                          Auto-fetched from software entries
                        </p>
                      </div>
                      <div
                        className={`p-4 rounded-xl border ${
                          Math.abs(selectedRow.difference) < 1
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-rose-50 border-rose-200"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span
                            className={`text-sm font-bold ${
                              Math.abs(selectedRow.difference) < 1
                                ? "text-emerald-800"
                                : "text-rose-800"
                            }`}
                          >
                            Difference
                          </span>
                          <span
                            className={`text-2xl font-bold font-mono ${
                              Math.abs(selectedRow.difference) < 1
                                ? "text-emerald-700"
                                : "text-rose-700"
                            }`}
                          >
                            {selectedRow.difference > 0 ? "+" : ""}
                            {formatCurrencyFull(
                              Math.abs(selectedRow.difference)
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2 pt-2">
                        <Button className="flex-1" variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        {selectedRow.status !== "reconciled" && (
                          <Button
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            size="sm"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Reconcile
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Card className="p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">
                      Reconciliation Status
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2" />
                          <span className="text-sm text-gray-600">
                            Reconciled
                          </span>
                        </div>
                        <span className="font-mono font-medium text-emerald-600">
                          {
                            bankData.filter((d) => d.status === "reconciled")
                              .length
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
                          <span className="text-sm text-gray-600">Pending</span>
                        </div>
                        <span className="font-mono font-medium text-amber-600">
                          {
                            bankData.filter((d) => d.status === "pending")
                              .length
                          }
                        </span>
                      </div>
                      <div className="h-px bg-gray-200 my-2" />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          Total Bank Balance
                        </span>
                        <span className="font-mono font-medium text-blue-600">
                          {(() => {
                            const latest = {};
                            bankData.forEach((row) => {
                              const ex = latest[row.bank_id];
                              if (!ex || new Date(row.date) > new Date(ex.date))
                                latest[row.bank_id] = row;
                            });
                            return formatCurrency(
                              Object.values(latest).reduce(
                                (s, r) => s + Number(r.asPerBankTotalBal || 0),
                                0
                              )
                            );
                          })()}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-blue-50 border-blue-200 mt-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3">
                      Quick Actions
                    </h4>
                    <div className="space-y-2">
                      <select
                        className="w-full border border-blue-200 p-2 rounded-lg mb-2 bg-white text-sm"
                        onChange={(e) => {
                          const bank = banks.find(
                            (b) => String(b.id) === e.target.value
                          );
                          setSelectedBank(bank);
                        }}
                      >
                        <option value="">Select Bank</option>
                        {banks.map((b) => (
                          <option key={b.id} value={String(b.id)}>
                            {b.bank_name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mb-2">
                        Select a row to enable entry
                      </p>
                      {!isIntern && (
                        <Button
                          className="w-full justify-start"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!selectedRow && bankData.length > 0) {
                              const first = bankData[0];
                              setSelectedRow(first);
                              setRemainingBalance(first.remainingBalance || 0);
                            }
                            setShowEntryModal(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Bank Entry
                        </Button>
                      )}
                      <div className="pt-2 border-t border-blue-200 mt-2">
                        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <ArrowLeftRight className="w-3 h-3" />
                          Bank to Bank Transfer
                        </p>
                        {!isIntern && (
                          <Button
                            className="w-full justify-start bg-indigo-600 hover:bg-indigo-700 text-white border-0 mb-2"
                            size="sm"
                            onClick={() => {
                              setEditTransfer(null);
                              setShowTransferModal(true);
                            }}
                          >
                            <ArrowLeftRight className="w-4 h-4 mr-2" />
                            New Transfer
                          </Button>
                        )}
                        <Button
                          className="w-full justify-start"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowTransferHistory(true)}
                        >
                          <History className="w-4 h-4 mr-2" />
                          History
                          {transfers.length > 0 && (
                            <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs rounded-full px-2 py-0.5 font-semibold">
                              {transfers.length}
                            </span>
                          )}
                        </Button>
                        {transfers.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {transfers.slice(0, 2).map((t) => (
                              <div
                                key={t.id}
                                className="bg-white rounded-lg p-2 border border-indigo-100 text-xs"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-gray-500">
                                    {t.transfer_date
                                      ? new Date(
                                          t.transfer_date
                                        ).toLocaleDateString("en-GB", {
                                          day: "2-digit",
                                          month: "short",
                                        })
                                      : "-"}
                                  </span>
                                  <span className="font-mono font-semibold text-indigo-700">
                                    ₹{Number(t.amount).toLocaleString("en-IN")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-gray-600">
                                  <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded text-xs truncate max-w-[80px]">
                                    {t.sender_bank_name || "—"}
                                  </span>
                                  <ArrowLeftRight className="w-3 h-3 flex-shrink-0 text-gray-400" />
                                  <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-xs truncate max-w-[80px]">
                                    {t.receiver_bank_name || "—"}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {transfers.length > 2 && (
                              <button
                                onClick={() => setShowTransferHistory(true)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 w-full text-center py-1"
                              >
                                +{transfers.length - 2} more transfers →
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        className="w-full justify-start mt-1"
                        variant="outline"
                        size="sm"
                      >
                        <Filter className="w-4 h-4 mr-2" />
                        View Unreconciled
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      <AddEntryModal
        isOpen={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        newEntry={newEntry}
        setNewEntry={setNewEntry}
        onSave={handleAddEntry}
        banks={banks}
        remainingBalance={
          selectedRow
            ? selectedRow.asPerBankTotalBal - selectedRow.asPerSwTotalBal
            : 0
        }
      />
    </div>
  );
};

export default BankReco;
