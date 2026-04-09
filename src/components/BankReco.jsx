import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AddBankModal from "./AddBankModal";
import AddEntryModal from "./AddEntryModal";
import supabase from "../lib/supabaseClient";
import {
  Search,
  Download,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Landmark,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Plus,
  Filter,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
} from "recharts";
import Card from "./ui/Card";
import Button from "./ui/button";
import Badge from "./ui/Badge";

// --- Mock Data Generators ---
const generateBankData = () => {
  const months = [
    "Jan 2023",
    "Feb 2023",
    "Mar 2023",
    "Apr 2023",
    "May 2023",
    "Jun 2023",
    "Jul 2023",
    "Aug 2023",
    "Sep 2023",
    "Oct 2023",
    "Nov 2023",
    "Dec 2023",
  ];
  const entities = ["Verto India Pvt Ltd", "Verto Global LLC", "Verto UK Ltd"];
  const bankCodes = ["IDFC01", "HDFC01", "IDFC02", "HDFC02"];

  return months.map((month) => {
    const date = new Date(2023, months.indexOf(month), 28)

      .toISOString()
      .split("T")[0];
    const bankBal = Math.floor(5000000 + Math.random() * 3000000);
    const swBal = bankBal + Math.floor(Math.random() * 200000 - 100000);
    const difference = bankBal - swBal;

    return {
      id: month,
      month,
      date,
      asPerBankTotalBal: bankBal,
      asPerSwTotalBal: swBal,
      difference,
      status: Math.abs(difference) < 50000 ? "reconciled" : "pending",
      manualEntries: entities.map((entity, idx) => ({
        entity,
        bankCode: bankCodes[idx % bankCodes.length],
        dateOfBankBal: date,
        amount: Math.floor(bankBal / 3 + Math.random() * 100000),
        remarks:
          Math.abs(difference) < 50000 ? "Matched" : "Reconciliation required",
      })),
    };
  });
};

const generateFundFlowData = (bankData) => {
  if (!bankData || bankData.length === 0) return []; // ✅ FIX

  const lastBankBal = bankData[bankData.length - 1]?.asPerSwTotalBal || 0;

  const projections = [];
  let currentBal = lastBankBal;
  const months = [
    "Jul 2023",
    "Aug 2023",
    "Sep 2023",
    "Oct 2023",
    "Nov 2023",
    "Dec 2023",
  ];

  for (let i = 0; i < 6; i++) {
    const projectedIncome = Math.floor(2000000 + Math.random() * 1000000);
    const projectedExpense = Math.floor(1500000 + Math.random() * 800000);
    currentBal = currentBal + projectedIncome - projectedExpense;

    projections.push({
      month: months[i],
      date: new Date(2023, 6 + i, 15).toISOString().split("T")[0],
      asPerSwProjBal: currentBal,
      projectedIncome,
      projectedExpense,
      netFlow: projectedIncome - projectedExpense,
    });
  }

  return projections;
};

const COLORS = {
  bank: "#3b82f6",
  software: "#10b981",
  difference: "#f59e0b",
  projection: "#8b5cf6",
  income: "#10b981",
  expense: "#ef4444",
};

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
  const [selectedBank, setSelectedBank] = useState(null);
  const [remainingBalance, setRemainingBalance] = useState(0);

  const [showEntryModal, setShowEntryModal] = useState(false);

  const [newEntry, setNewEntry] = useState({
    entity: "",
    bank_id: "", // ✅ ADD THIS
    dateOfBankBal: "",
    amount: "",
    remarks: "",
  });
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
  const [softwareEntries, setSoftwareEntries] = useState([]);

  const fetchSoftwareEntries = async () => {
    const { data, error } = await supabase
      .from("software_entries")
      .select("*")
      .order("date", { ascending: false });

    if (!error) setSoftwareEntries(data);
  };
  const buildBankRecoData = () => {
    const grouped = {};

    entries.forEach((entry) => {
      // ❌ SKIP NULL BANK (VERY IMPORTANT FIX)
      if (!entry.bank_id) return;

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
        entity: entry.entity || "Pvt Ltd",
        bankCode: entry.bank_master?.bank_name || "N/A",
        amount: entry.amount,
        remarks: entry.remarks,
      });
    });
    const finalData = Object.values(grouped).map((row) => {
      // ✅ calculate software balance for same month
      const swTotal = softwareEntries
        .filter((s) => {
          const swMonth = new Date(s.date).toISOString().slice(0, 7);
          return (
            swMonth === row.month && s.bank_id === row.bank_id // 🔥 IMPORTANT
          );
        })
        .reduce((sum, s) => sum + Number(s.amount), 0);

      // ✅ assign real software balance
      row.asPerSwTotalBal = swTotal;

      // ✅ real difference
      row.difference = row.asPerBankTotalBal - row.asPerSwTotalBal;
      // ✅ Remaining balance = difference
      row.remainingBalance = Math.abs(row.difference);

      // ✅ real status
      row.status = Math.abs(row.difference) < 50000 ? "reconciled" : "pending";

      return row;
    });
    setBankData(finalData);
  };

  useEffect(() => {
    if (bankData.length > 0 && !selectedRow) {
      setSelectedRow(bankData[0]);
    }
  }, [bankData]);

  useEffect(() => {
    fetchBanks();
    fetchEntries();
    fetchSoftwareEntries();
  }, []);
  useEffect(() => {
    buildBankRecoData();
  }, [entries, softwareEntries]);
  window.refreshBanks = fetchBanks;
  useEffect(() => {
    const channel = supabase
      .channel("realtime-bank")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bank_entries" },
        () => {
          fetchEntries();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const deleteBank = async (id) => {
    if (!window.confirm("Delete bank?")) return;

    const { error } = await supabase.from("bank_master").delete().eq("id", id);

    if (!error) fetchBanks();
  };
  useEffect(() => {
    const channel = supabase
      .channel("bank-master-change")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bank_master" },
        () => {
          fetchBanks();
        }
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
        () => {
          fetchBanks();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);
  useEffect(() => {
    if (bankData.length > 0) {
      setFundFlowData(generateFundFlowData(bankData));
    }
  }, [bankData]);

  useEffect(() => {
    if (bankData.length > 0 && !selectedRow) {
      setSelectedRow(bankData[0]); // ✅ AUTO SELECT FIRST ROW
      console.log("AUTO SELECT RUNNING", bankData[0]);
      setRemainingBalance(
        (bankData[0]?.asPerBankTotalBal || 0) -
          (bankData[0]?.asPerSwTotalBal || 0)
      );
    }
  }, [bankData]);

  const filteredData = bankData
    .filter((row) => {
      const matchesSearch = row.month
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesMonth = monthFilter === "All" || row.month === monthFilter;
      return matchesSearch && matchesMonth;
    })
    .sort((a, b) => {
      if (sortType === "highDiff")
        return Math.abs(b.difference) - Math.abs(a.difference);
      if (sortType === "lowDiff")
        return Math.abs(a.difference) - Math.abs(b.difference);
      return 0;
    });

  const formatCurrency = (val) => `₹ ${(val / 100000).toFixed(2)}L`;
  const formatCurrencyFull = (val) => `₹ ${val.toLocaleString("en-IN")}`;

  const latestDate = bankData.length
    ? Math.max(...bankData.map((r) => new Date(r.date).getTime()))
    : 0;

  const lastBalance = bankData
    .filter((r) => new Date(r.date).getTime() === latestDate)
    .reduce((sum, r) => sum + (r.asPerBankTotalBal || 0), 0);

  const handleAddEntry = async () => {
    if (!newEntry.bank_id || !newEntry.amount || !newEntry.dateOfBankBal) {
      alert("Fill all fields");
      return;
    }
    if (!newEntry.bank_id) {
      alert("Please select bank");
      return;
    }

    if (Number(newEntry.amount) <= 0) {
      alert("Amount must be greater than 0");
      return;
    }
    const enteredAmount = parseFloat(newEntry.amount || 0);

    // ❌ Prevent invalid
    if (enteredAmount <= 0) {
      alert("Amount must be greater than 0");
      return;
    }
    if (!remainingBalance || remainingBalance <= 0) {
      alert("No remaining balance available");
      return;
    }
    if (!selectedRow) {
      alert("No month selected. Please refresh.");
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

    const { error } = await supabase.from("bank_entries").insert([
      {
        bank_id: newEntry.bank_id,
        entity: newEntry.entity || "Pvt Ltd",
        amount: enteredAmount,
        date: newEntry.dateOfBankBal,
        remarks: newEntry.remarks || "",
        type: enteredAmount >= 0 ? "credit" : "debit", // ✅ FIX
        reference_no: "BNK-" + Date.now(), // ✅ ADD THIS
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setShowEntryModal(false);

    setNewEntry({
      entity: "",
      bank_id: "", // ✅ ADD THIS
      dateOfBankBal: "",
      amount: "",
      remarks: "",
    });
    console.log("Remaining:", selectedRow?.remainingBalance);
    console.log("Entered:", newEntry.amount);

    await fetchEntries();
    await fetchSoftwareEntries();

    setTimeout(() => {
      const updated = bankData.find((r) => r.id === selectedRow?.id);

      if (updated) {
        const newRemaining =
          (updated.asPerBankTotalBal || 0) - (updated.asPerSwTotalBal || 0);

        setSelectedRow(updated);
        setRemainingBalance(newRemaining);
      }
    }, 300);

    window.refreshDashboard?.();
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Filter Bar */}
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
            <span>Export Excel</span>
          </Button>
        </div>
      </Card>

      {/* Main Content - TALLER TABLE */}
      <div className="flex gap-4">
        {/* LEFT: Tall Table Area */}
        <div className="flex-1 space-y-4">
          {activeView === "reco" ? (
            <>
              {/* Bank Reco Table - INCREASED HEIGHT */}
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
                    <Badge
                      variant="default"
                      className="bg-emerald-100 text-emerald-700"
                    >
                      {
                        filteredData.filter((d) => d.status === "reconciled")
                          .length
                      }{" "}
                      Reconciled
                    </Badge>
                  </div>
                </div>

                {/* TALL TABLE - min-height increased to show more rows */}
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
                          As Per Bank Total Bal
                        </th>
                        <th className="p-4 text-right w-36 text-emerald-700">
                          As per S/w Total Bal
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
                          {/* MAIN ROW */}
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.01 }}
                            onClick={() => {
                              setSelectedRow(row);

                              const remaining =
                                (row.asPerBankTotalBal || 0) -
                                (row.asPerSwTotalBal || 0);

                              setRemainingBalance(remaining);
                            }}
                            className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                              selectedRow?.id === row.id ? "bg-blue-50" : ""
                            }`}
                            style={{ height: "56px" }}
                          >
                            <td className="p-4 font-medium text-gray-900">
                              {row.month}
                            </td>
                            <td className="p-4 text-gray-600">{row.date}</td>
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

                          {/* EXPANDABLE ROW */}
                          <AnimatePresence>
                            {selectedRow?.id === row.id && (
                              <motion.tr
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <td colSpan="7" className="bg-blue-50 p-4">
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-white p-3 rounded-lg shadow">
                                      <p className="text-xs text-gray-500">
                                        Bank Balance
                                      </p>
                                      <p className="font-mono text-blue-700 font-bold">
                                        {formatCurrencyFull(
                                          row.asPerBankTotalBal
                                        )}
                                      </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-lg shadow">
                                      <p className="text-xs text-gray-500">
                                        Software Balance
                                      </p>
                                      <p className="font-mono text-emerald-700 font-bold">
                                        {formatCurrencyFull(
                                          row.asPerSwTotalBal
                                        )}
                                      </p>
                                    </div>

                                    <div className="bg-white p-3 rounded-lg shadow">
                                      <p className="text-xs text-gray-500">
                                        Difference
                                      </p>
                                      <p
                                        className={`font-mono font-bold ${
                                          Math.abs(row.difference) < 50000
                                            ? "text-emerald-600"
                                            : "text-rose-600"
                                        }`}
                                      >
                                        {formatCurrencyFull(
                                          Math.abs(row.difference)
                                        )}
                                      </p>
                                    </div>
                                  </div>
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
            </>
          ) : (
            <>
              {/* Fund Flow Table - INCREASED HEIGHT */}
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-purple-50/50 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-purple-600" />
                    Fund Flow Projection (5B) - Next 60 Days
                  </h3>
                  <Badge
                    variant="secondary"
                    className="bg-purple-100 text-purple-700"
                  >
                    Projected
                  </Badge>
                </div>

                <div className="overflow-x-auto" style={{ minHeight: "400px" }}>
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        <th className="p-4 w-24">Month</th>
                        <th className="p-4 w-28">Date</th>
                        <th className="p-4 text-right w-32 text-emerald-700">
                          Projected Income
                        </th>
                        <th className="p-4 text-right w-32 text-rose-700">
                          Projected Expense
                        </th>
                        <th className="p-4 text-right w-28">Net Flow</th>
                        <th className="p-4 text-right w-36 font-bold text-purple-700 bg-purple-50">
                          As per S/w Proj Bal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
                      {fundFlowData.map((row, index) => (
                        <motion.tr
                          key={row.month}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-purple-50"
                          style={{ height: "56px" }}
                        >
                          <td className="p-4 font-medium text-gray-900">
                            {row.month}
                          </td>
                          <td className="p-4 text-gray-600">{row.date}</td>
                          <td className="p-4 text-right font-mono text-emerald-700 text-base">
                            <span className="flex items-center justify-end">
                              <ArrowUpRight className="w-4 h-4 mr-1" />
                              {formatCurrency(row.projectedIncome)}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono text-rose-700 text-base">
                            <span className="flex items-center justify-end">
                              <ArrowDownLeft className="w-4 h-4 mr-1" />
                              {formatCurrency(row.projectedExpense)}
                            </span>
                          </td>
                          <td
                            className={`p-4 text-right font-mono font-medium text-base ${
                              row.netFlow > 0
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }`}
                          >
                            {row.netFlow > 0 ? "+" : ""}
                            {formatCurrency(row.netFlow)}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-purple-700 bg-purple-50/50 text-lg">
                            {formatCurrency(row.asPerSwProjBal)}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* RIGHT: Fixed width side panel */}
        <div className="w-80 shrink-0 space-y-4">
          <AnimatePresence mode="wait">
            {activeView === "reco" && selectedRow ? (
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
                          {selectedRow.month} • {selectedRow.date}
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
                    {/* Balance Comparison */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center">
                        <Wallet className="w-3 h-3 mr-1" /> Balance Comparison
                      </h4>

                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-blue-700 font-medium">
                            As Per Bank
                          </span>
                        </div>
                        <p className="text-xl font-bold font-mono text-blue-700">
                          {formatCurrencyFull(selectedRow.asPerBankTotalBal)}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Manual entry from bank statement
                        </p>
                      </div>

                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-emerald-700 font-medium">
                            As Per Software
                          </span>
                        </div>
                        <p className="text-xl font-bold font-mono text-emerald-700">
                          {formatCurrencyFull(selectedRow.asPerSwTotalBal)}
                        </p>
                        <p className="text-xs text-emerald-600 mt-1">
                          Auto-fetched for date entered
                        </p>
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
                            {formatCurrencyFull(
                              Math.abs(selectedRow.difference)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Manual Entry Breakdown */}
                    <div className="space-y-3 pt-2 border-t border-gray-200">
                      <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center">
                        <Landmark className="w-3 h-3 mr-1" /> Bankwise Breakup
                      </h4>

                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr className="text-gray-500">
                              <th className="p-2 text-left">Entity</th>
                              <th className="p-2 text-left">Bank</th>
                              <th className="p-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {selectedRow.manualEntries.map((entry, idx) => (
                              <tr key={idx}>
                                <td className="p-2 text-gray-700 text-xs">
                                  {entry.entity.replace("Verto ", "")}
                                </td>
                                <td className="p-2">
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {entry.bankCode}
                                  </Badge>
                                </td>
                                <td className="p-2 text-right font-mono">
                                  {formatCurrencyFull(entry.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex space-x-2">
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
                  <>
                    <Card className="p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-4">
                        Reconciliation Status
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
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
                            <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                            <span className="text-sm text-gray-600">
                              Pending
                            </span>
                          </div>
                          <span className="font-mono font-medium text-amber-600">
                            {
                              bankData.filter((d) => d.status === "pending")
                                .length
                            }
                          </span>
                        </div>
                        <div className="h-px bg-gray-200 my-2"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            Last Bank Balance
                          </span>
                          <span className="font-mono font-medium text-blue-600">
                            {formatCurrency(
                              bankData.reduce(
                                (sum, row) =>
                                  sum + (row.asPerBankTotalBal || 0),
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
                            console.log("SELECTED ROW:", selectedRow);
                            if (!selectedRow && bankData.length > 0) {
                              const firstRow = bankData[0];

                              setSelectedRow(firstRow);
                              setRemainingBalance(
                                firstRow.remainingBalance || 0
                              );
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
                  <Card className="p-4 bg-purple-50 border-purple-200">
                    <h4 className="text-sm font-semibold text-purple-900 mb-3">
                      Projection Summary
                    </h4>
                    <p className="text-xs text-purple-700 mb-4">
                      Formula: Last date Bank Bal + (Projected Income -
                      Projected Expense)
                    </p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-purple-600">
                          Starting Balance
                        </span>
                        <span className="font-mono font-medium">
                          {formatCurrency(
                            bankData.reduce(
                              (sum, row) => sum + (row.asPerBankTotalBal || 0),
                              0
                            )
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-purple-600">
                          6-Month Projection
                        </span>
                        <span className="font-mono font-medium text-purple-700">
                          {formatCurrency(
                            fundFlowData.length > 0
                              ? formatCurrency(
                                  fundFlowData[fundFlowData.length - 1]
                                    .asPerSwProjBal
                                )
                              : "₹ 0"
                          )}
                        </span>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
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
