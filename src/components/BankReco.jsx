import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import Card from "./ui/Card";
import Button from "./ui/button";
import Badge from "./ui/Badge";

const BankReco = () => {
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
  const [selectedBank, setSelectedBank] = useState(null);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [showEntryModal, setShowEntryModal] = useState(false);

  const [newEntry, setNewEntry] = useState({
    entity: "",
    bank_id: "",
    dateOfBankBal: "",
    amount: "",
    remarks: "",
    entry_type: "other",
  });

  // ─── FETCH FUNCTIONS ───────────────────────────────────────────────────────

  const fetchBanks = async () => {
    const { data, error } = await supabase
      .from("bank_master")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setBanks(data);
  };

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from("bank_entries")
      .select("*, bank_master(bank_name)")
      .order("date", { ascending: false });
    if (!error) setEntries(data);
  };

  const fetchSoftwareEntries = async () => {
    const { data, error } = await supabase
      .from("software_entries")
      .select("*")
      .order("date", { ascending: false });
    if (!error) setSoftwareEntries(data);
  };

  // ✅ FIX 1 — correct column names matching master_cashflow_view
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
        projected_closing_balance
      `
      )
      .order("full_date", { ascending: true }); // ✅ sort by raw date

    if (error) {
      console.error("Fund Flow Error:", error);
      return;
    }
    console.log("Fund Flow Data:", data);
    setFundFlowData(data || []);
  };

  // ─── BUILD BANK RECO DATA ──────────────────────────────────────────────────

  const buildBankRecoData = () => {
    const grouped = {};

    entries.forEach((entry) => {
      if (!entry.bank_id) return; // skip null bank

      const month = new Date(entry.date).toISOString().slice(0, 7);
      const key = `${month}-${entry.bank_id}`;

      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          month,
          bank_id: entry.bank_id,
          bank_name: entry.bank_master?.bank_name || "N/A",
          date: entry.date,
          asPerBankTotalBal: 0,
          asPerSwTotalBal: 0,
          difference: 0,
          status: "pending",
          manualEntries: [],
        };
      }

      grouped[key].asPerBankTotalBal += Number(entry.amount);

      grouped[key].manualEntries.push({
        date: entry.date,
        entity: entry.entity || "Pvt Ltd",
        transactionLabel:
          entry.entry_type === "invoice"
            ? "Invoice Payment"
            : entry.entry_type === "petty_cash"
            ? "Petty Cash"
            : entry.entry_type === "payment_received"
            ? "Payment Received"
            : entry.entry_type === "payment_made"
            ? "Payment Made"
            : "Other",
        amount:
          entry.type === "debit"
            ? -Math.abs(entry.amount)
            : Math.abs(entry.amount),
        remarks: entry.remarks,
      });
    });

    const finalData = Object.values(grouped).map((row) => {
      const swTotal = softwareEntries
        .filter((s) => {
          const swMonth = new Date(s.date).toISOString().slice(0, 7);
          return swMonth === row.month && s.bank_id === row.bank_id;
        })
        .reduce((sum, s) => sum + Number(s.amount), 0);

      row.asPerSwTotalBal = swTotal;
      row.difference = row.asPerBankTotalBal - row.asPerSwTotalBal;
      row.remainingBalance = Math.abs(row.difference);
      row.status = Math.abs(row.difference) < 50000 ? "reconciled" : "pending";

      return row;
    });

    setBankData(finalData);
  };

  // ─── EFFECTS ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchBanks();
    fetchEntries();
    fetchSoftwareEntries();
    fetchFundFlowProjection();
  }, []);

  useEffect(() => {
    buildBankRecoData();
  }, [entries, softwareEntries]);

  useEffect(() => {
    if (bankData.length > 0 && !selectedRow) {
      setSelectedRow(bankData[0]);
      setRemainingBalance(
        Math.abs(
          (bankData[0]?.asPerBankTotalBal || 0) -
            (bankData[0]?.asPerSwTotalBal || 0)
        )
      );
    }
  }, [bankData]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("realtime-bank")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bank_entries" },
        () => fetchEntries()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("bank-master-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bank_master" },
        () => fetchBanks()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  window.refreshBanks = fetchBanks;

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  const formatCurrency = (val = 0) =>
    `₹ ${(Number(val) / 100000).toFixed(2)}L`;

  const formatCurrencyFull = (val = 0) =>
    `₹ ${Number(val).toLocaleString("en-IN")}`;

  // ✅ FIX 2 — compute income/expense/net from correct columns
  const getIncome = (row) =>
    (row.expected_receivable || 0) + (row.advance_payment || 0);

  const getExpense = (row) =>
    (row.salary_payout || 0) +
    (row.statutory_outflow || 0) +
    (row.other_expense || 0) +
    (row.petty_cash || 0);

  const getNetFlow = (row) =>
    getIncome(row) -
    getExpense(row) -
    (row.bounce_risk || 0) -
    (row.bad_debt_cn || 0);

  // ─── FILTERED / SORTED BANK DATA ──────────────────────────────────────────

  const filteredData = bankData
    .filter((row) => {
      const matchesSearch = row.month
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesMonth =
        monthFilter === "All" || row.month === monthFilter;
      return matchesSearch && matchesMonth;
    })
    .sort((a, b) => {
      if (sortType === "highDiff")
        return Math.abs(b.difference) - Math.abs(a.difference);
      if (sortType === "lowDiff")
        return Math.abs(a.difference) - Math.abs(b.difference);
      return 0;
    });

  // ─── ADD BANK ENTRY ────────────────────────────────────────────────────────

  const handleAddEntry = async () => {
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
        `Cannot enter more than remaining balance ₹${Math.abs(currentRemaining)}`
      );
      return;
    }

    const { error } = await supabase.from("bank_entries").insert([
      {
        bank_id: newEntry.bank_id,
        entity: newEntry.entity || "Pvt Ltd",
        amount: enteredAmount,
        date: newEntry.dateOfBankBal,
        remarks: newEntry.remarks || "",
        entry_type: newEntry.entry_type || "other",
        type: newEntry.entry_type === "payment_received" ? "credit" : "debit",
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

    setTimeout(() => {
      const updated = bankData.find((r) => r.id === selectedRow?.id);
      if (updated) {
        setSelectedRow(updated);
        setRemainingBalance(
          (updated.asPerBankTotalBal || 0) - (updated.asPerSwTotalBal || 0)
        );
      }
    }, 300);

    window.refreshDashboard?.();
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-6">

      {/* ── Filter Bar ── */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">

            {/* View toggle */}
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
                    placeholder="Search month..."
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

          {/* Export */}
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

      {/* ── Main Content ── */}
      <div className="flex gap-4">

        {/* LEFT: Table */}
        <div className="flex-1 space-y-4">

          {activeView === "reco" ? (
            /* ── BANK RECONCILIATION TABLE ── */
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <Landmark className="w-4 h-4 mr-2 text-blue-600" />
                  Bank Reconciliation (5A)
                </h3>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{filteredData.length} records</Badge>
                  <Badge className="bg-emerald-100 text-emerald-700">
                    {filteredData.filter((d) => d.status === "reconciled").length}{" "}
                    Reconciled
                  </Badge>
                </div>
              </div>

              <div
                className="overflow-x-auto"
                style={{ minHeight: "400px", maxHeight: "500px" }}
              >
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="p-4 w-24">Month</th>
                      <th className="p-4 w-28">Date</th>
                      <th className="p-4 w-32">Bank</th>
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
                        {/* Main Row */}
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
                          }}
                          className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                            selectedRow?.id === row.id ? "bg-blue-50" : ""
                          }`}
                          style={{ height: "56px" }}
                        >
                          <td className="p-4 font-medium text-gray-900">
                            {row.month}
                          </td>
                          {/* ✅ FIX — use row.date (from bank_entries, always a plain date string) */}
                          <td className="p-4 text-gray-600">
                            {row.date
                              ? new Date(row.date).toLocaleDateString("en-GB")
                              : "-"}
                          </td>
                          <td className="p-4 font-medium text-gray-700">
                            {row.bank_name}
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
                                Math.abs(row.difference) < 50000
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

                        {/* Expandable Row */}
                        <AnimatePresence>
                          {selectedRow?.id === row.id && (
                            <motion.tr
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <td colSpan="8" className="bg-blue-50 p-4">
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                  <div className="bg-white p-3 rounded-lg shadow">
                                    <p className="text-xs text-gray-500">Bank Balance</p>
                                    <p className="font-mono text-blue-700 font-bold">
                                      {formatCurrencyFull(row.asPerBankTotalBal)}
                                    </p>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg shadow">
                                    <p className="text-xs text-gray-500">Software Balance</p>
                                    <p className="font-mono text-emerald-700 font-bold">
                                      {formatCurrencyFull(row.asPerSwTotalBal)}
                                    </p>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg shadow">
                                    <p className="text-xs text-gray-500">Difference</p>
                                    <p
                                      className={`font-mono font-bold ${
                                        Math.abs(row.difference) < 50000
                                          ? "text-emerald-600"
                                          : "text-rose-600"
                                      }`}
                                    >
                                      {formatCurrencyFull(Math.abs(row.difference))}
                                    </p>
                                  </div>
                                </div>

                                {/* Entry breakdown */}
                                {row.manualEntries.length > 0 && (
                                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                      <thead className="bg-gray-50">
                                        <tr className="text-gray-500">
                                          <th className="p-2 text-left">Date</th>
                                          <th className="p-2 text-left">Flow Type</th>
                                          <th className="p-2 text-left">Remarks</th>
                                          <th className="p-2 text-right">Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {row.manualEntries.map((entry, idx) => (
                                          <tr key={idx}>
                                            <td className="p-2 text-gray-700">
                                              {new Date(entry.date).toLocaleDateString("en-GB")}
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
                                                <span>
                                                  {entry.amount >= 0 ? "+" : "-"}
                                                  {formatCurrencyFull(Math.abs(entry.amount))}
                                                </span>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
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

          ) : (
            /* ── FUND FLOW PROJECTION TABLE ── */
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-purple-50/50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-purple-600" />
                  Fund Flow Projection (5B)
                </h3>
                <Badge className="bg-purple-100 text-purple-700">Projected</Badge>
              </div>

              <div className="overflow-x-auto" style={{ minHeight: "400px" }}>
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="p-4">Month</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 text-right text-blue-700">Opening Bal</th>
                      <th className="p-4 text-right text-emerald-700">Projected Income</th>
                      <th className="p-4 text-right text-rose-700">Projected Expense</th>
                      <th className="p-4 text-right">Net Flow</th>
                      <th className="p-4 text-right text-purple-700 bg-purple-50 font-bold">
                        Projected Closing Bal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
                    {fundFlowData.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-gray-400">
                          No projection data found. Check if invoices exist.
                        </td>
                      </tr>
                    ) : (
                      fundFlowData.map((row, index) => {
                        const income = getIncome(row);
                        const expense = getExpense(row);
                        const netFlow = getNetFlow(row);

                        return (
                          <motion.tr
                            key={`${row.month}-${index}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.04 }}
                            className="hover:bg-purple-50"
                            style={{ height: "56px" }}
                          >
                            {/* ✅ FIX — formatted month from SQL */}
                            <td className="p-4 font-medium text-gray-900">
                              {row.month}
                            </td>

                            {/* ✅ FIX — use full_date for date display, not row.date */}
                            <td className="p-4 text-gray-600">
                              {row.full_date
                                ? new Date(row.full_date).toLocaleDateString("en-GB")
                                : "-"}
                            </td>

                            <td className="p-4 text-right font-mono text-blue-700">
                              {formatCurrency(row.opening_balance || 0)}
                            </td>

                            {/* ✅ FIX — income = receivable + advance */}
                            <td className="p-4 text-right font-mono text-emerald-700">
                              <span className="flex items-center justify-end">
                                <ArrowUpRight className="w-4 h-4 mr-1" />
                                {formatCurrency(income)}
                              </span>
                            </td>

                            {/* ✅ FIX — expense = salary + statutory + other + petty */}
                            <td className="p-4 text-right font-mono text-rose-700">
                              <span className="flex items-center justify-end">
                                <ArrowDownLeft className="w-4 h-4 mr-1" />
                                {formatCurrency(expense)}
                              </span>
                            </td>

                            {/* ✅ FIX — net flow calculated correctly */}
                            <td
                              className={`p-4 text-right font-mono font-medium ${
                                netFlow >= 0 ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {netFlow >= 0 ? "+" : ""}
                              {formatCurrency(netFlow)}
                            </td>

                            {/* ✅ FIX — correct column name */}
                            <td className="p-4 text-right font-mono font-bold text-purple-700 bg-purple-50/50 text-base">
                              {formatCurrency(row.projected_closing_balance || 0)}
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT: Side Panel */}
        <div className="w-80 shrink-0 space-y-4">
          <AnimatePresence mode="wait">

            {activeView === "reco" && selectedRow ? (
              /* ── SELECTED ROW DETAIL ── */
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
                        <h3 className="font-bold text-lg">Bank Reconciliation</h3>
                        <p className="text-blue-100 text-sm">
                          {selectedRow.month} •{" "}
                          {selectedRow.date
                            ? new Date(selectedRow.date).toLocaleDateString("en-GB")
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
                      <p className="text-sm text-blue-700 font-medium mb-1">As Per Bank</p>
                      <p className="text-xl font-bold font-mono text-blue-700">
                        {formatCurrencyFull(selectedRow.asPerBankTotalBal)}
                      </p>
                      <p className="text-xs text-blue-500 mt-1">Manual entry from bank statement</p>
                    </div>

                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <p className="text-sm text-emerald-700 font-medium mb-1">As Per Software</p>
                      <p className="text-xl font-bold font-mono text-emerald-700">
                        {formatCurrencyFull(selectedRow.asPerSwTotalBal)}
                      </p>
                      <p className="text-xs text-emerald-500 mt-1">Auto-fetched from software entries</p>
                    </div>

                    <div
                      className={`p-4 rounded-xl border ${
                        Math.abs(selectedRow.difference) < 50000
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-rose-50 border-rose-200"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-sm font-bold ${
                            Math.abs(selectedRow.difference) < 50000
                              ? "text-emerald-800"
                              : "text-rose-800"
                          }`}
                        >
                          Difference
                        </span>
                        <span
                          className={`text-2xl font-bold font-mono ${
                            Math.abs(selectedRow.difference) < 50000
                              ? "text-emerald-700"
                              : "text-rose-700"
                          }`}
                        >
                          {selectedRow.difference > 0 ? "+" : ""}
                          {formatCurrencyFull(Math.abs(selectedRow.difference))}
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
              <>
                {activeView === "reco" ? (
                  /* ── RECO SIDE PANEL (no row selected) ── */
                  <>
                    <Card className="p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-4">
                        Reconciliation Status
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2" />
                            <span className="text-sm text-gray-600">Reconciled</span>
                          </div>
                          <span className="font-mono font-medium text-emerald-600">
                            {bankData.filter((d) => d.status === "reconciled").length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
                            <span className="text-sm text-gray-600">Pending</span>
                          </div>
                          <span className="font-mono font-medium text-amber-600">
                            {bankData.filter((d) => d.status === "pending").length}
                          </span>
                        </div>
                        <div className="h-px bg-gray-200 my-2" />
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Total Bank Balance</span>
                          <span className="font-mono font-medium text-blue-600">
                            {formatCurrency(
                              bankData.reduce(
                                (sum, row) => sum + (row.asPerBankTotalBal || 0),
                                0
                              )
                            )}
                          </span>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 bg-blue-50 border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-900 mb-3">
                        Quick Actions
                      </h4>
                      <div className="space-y-2">
                        <select
                          className="w-full border p-2 rounded mb-2"
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
                        <Button
                          className="w-full justify-start"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!selectedRow && bankData.length > 0) {
                              const firstRow = bankData[0];
                              setSelectedRow(firstRow);
                              setRemainingBalance(firstRow.remainingBalance || 0);
                            }
                            setShowEntryModal(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Bank Entry
                        </Button>
                        <Button
                          className="w-full justify-start"
                          variant="outline"
                          size="sm"
                        >
                          <Filter className="w-4 h-4 mr-2" />
                          View Unreconciled
                        </Button>
                      </div>
                    </Card>
                  </>

                ) : (
                  /* ── PROJECTION SUMMARY SIDE PANEL ── */
                  <Card className="p-4 bg-purple-50 border-purple-200">
                    <h4 className="text-sm font-semibold text-purple-900 mb-3">
                      Projection Summary
                    </h4>
                    <p className="text-xs text-purple-700 mb-4">
                      Opening Balance + Receivable + Advance − Salary − Statutory −
                      Expenses − Risks
                    </p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-purple-600">Opening Balance</span>
                        <span className="font-mono font-medium">
                          {formatCurrency(
                            fundFlowData.length > 0
                              ? fundFlowData[0].opening_balance
                              : 0
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-purple-600">
                          Final Projected Balance
                        </span>
                        {/* ✅ FIX — correct field name */}
                        <span className="font-mono font-medium text-purple-700">
                          {fundFlowData.length > 0
                            ? formatCurrency(
                                fundFlowData[fundFlowData.length - 1]
                                  .projected_closing_balance
                              )
                            : "₹ 0"}
                        </span>
                      </div>
                      <div className="h-px bg-purple-200 my-1" />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-purple-600">Months Projected</span>
                        <span className="font-mono font-medium">{fundFlowData.length}</span>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

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