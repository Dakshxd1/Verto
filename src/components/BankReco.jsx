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
  ArrowLeftRight,
  History,
  Trash2,
  Edit2,
} from "lucide-react";
import Card from "./ui/Card";
import Button from "./ui/button";
import Badge from "./ui/Badge";

// ─── BANK TRANSFER MODAL ───────────────────────────────────────────────────────
const BankTransferModal = ({
  isOpen,
  onClose,
  banks,
  onSaved,
  editData,
  entries,
}) => {
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
    const senderBankRows = entries.filter(
      (e) => e.bank_id === form.sender_bank_id
    );

    const currentBalance = senderBankRows.reduce((sum, e) => {
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
        // ── EDIT: just update the transfer record ──
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
        // ── NEW: insert transfer only — trg_bank_transfer handles bank_entries ──
        const referenceNo = "TRF-" + Date.now();

        const { error } = await supabase
          .from("bank_transfers")
          .insert([
            {
              transfer_date: form.transfer_date,
              amount: parseFloat(form.amount),
              sender_bank_id: form.sender_bank_id,
              receiver_bank_id: form.receiver_bank_id,
              remarks: form.remarks,
              reference_no: referenceNo,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        // trg_bank_transfer on bank_transfers automatically inserts:
        //   • debit  bank_entry for sender
        //   • credit bank_entry for receiver
        // No manual bank_entries inserts needed here.
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
              className="text-white/70 hover:text-white transition"
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
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-60"
            >
              {loading
                ? "Saving..."
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

// ─── BANK TRANSFER HISTORY DRAWER ─────────────────────────────────────────────
const BankTransferHistoryDrawer = ({
  isOpen,
  onClose,
  transfers,
  onEdit,
  onDelete,
}) => {
  const formatCurrency = (val = 0) =>
    `₹ ${Number(val).toLocaleString("en-IN")}`;

  return (
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
                className="text-white/70 hover:text-white transition"
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
                          {formatCurrency(t.amount)}
                        </p>
                        {t.reference_no && (
                          <p className="text-xs text-gray-400 font-mono mt-0.5">
                            {t.reference_no}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEdit(t)}
                          className="p-1.5 hover:bg-indigo-50 rounded-lg text-gray-400 hover:text-indigo-600 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(t.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                      <div className="flex-1 text-center">
                        <p className="text-xs text-gray-400 mb-1">From</p>
                        <div className="bg-rose-100 text-rose-700 rounded-lg px-2 py-1.5 text-xs font-semibold">
                          {t.sender_bank_name || "—"}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                      </div>
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
};

// ─── MAIN BANKRECO COMPONENT ───────────────────────────────────────────────────
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
  const [outstandingInvoices, setOutstandingInvoices] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [showEntryModal, setShowEntryModal] = useState(false);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showTransferHistory, setShowTransferHistory] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [interestPenalties, setInterestPenalties] = useState([]);
  const [editTransfer, setEditTransfer] = useState(null);

  const [newEntry, setNewEntry] = useState({
    entity: "",
    bank_id: "",
    dateOfBankBal: "",
    amount: "",
    remarks: "",
    entry_type: "manual_adjustment",
    transaction_mode: "credit",
  });

  // ─── FETCH FUNCTIONS ──────────────────────────────────────────────────────

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

    if (!error) {
      const uniqueEntries = [];
      const seen = new Set();

      (data || []).forEach((entry) => {
        const uniqueKey = `
            ${entry.reference_no || ""}
            -${entry.bank_id || ""}
            -${entry.amount || ""}
            -${entry.date || ""}
            -${entry.entry_type || ""}
          `;

        if (!seen.has(uniqueKey)) {
          seen.add(uniqueKey);
          uniqueEntries.push(entry);
        }
      });

      setEntries(uniqueEntries);
    }
  };

  const fetchSoftwareEntries = async () => {
    const { data, error } = await supabase
      .from("software_entries")
      .select("*")
      .order("date", { ascending: false });
    if (!error) setSoftwareEntries(data);
  };

  const fetchOutstandingInvoices = async () => {
    const { data, error } = await supabase
      .from("outstanding_invoice_view")
      .select("*");
    if (!error) {
      setOutstandingInvoices(data || []);
    }
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
      .select(
        `
        *,
        bank_master(bank_name)
      `
      )
      .order("entry_date", { ascending: false });

    if (!error) {
      setInterestPenalties(data || []);
    }
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
        projected_income: Number(row.projected_income || 0),
        projected_expense: Number(row.projected_expense || 0),
        net_flow: Number(row.net_flow || 0),
        projected_closing_balance: Number(row.projected_closing_balance || 0),
        opening_balance: Number(row.opening_balance || 0),
      }))
    );
  };

  const calculateSoftwareBalance = async (bankId) => {
    const { data: received } = await supabase
      .from("payments_received")
      .select("*")
      .eq("bank_id", bankId);

    const { data: made } = await supabase
      .from("payments_made")
      .select("*")
      .eq("bank_id", bankId);

    const { data: expenses } = await supabase
      .from("expenses")
      .select("*")
      .eq("bank_id", bankId);

    let credit = 0;
    let debit = 0;

    received?.forEach((r) => {
      credit += Number(r.amount_received || 0);
    });

    made?.forEach((m) => {
      debit += Number(m.transfer_amount || m.amount || 0);
    });

    expenses?.forEach((e) => {
      debit += Number(e.amount || 0);
    });

    return credit - debit;
  };

  // ─── BUILD BANK RECO DATA ─────────────────────────────────────────────────

  const buildBankRecoData = async () => {
    const grouped = {};

    entries.forEach((entry) => {
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

      const amt = Number(entry.amount || 0);

      if (String(entry.type).toLowerCase() === "debit") {
        grouped[key].asPerBankTotalBal -= Math.abs(amt);
      } else {
        grouped[key].asPerBankTotalBal += Math.abs(amt);
      }

      const flowType =
        entry.flow_type ||
        entry.category ||
        entry.payment_type ||
        entry.expense_type ||
        "";

      grouped[key].manualEntries.push({
        date: entry.date,
        entity: entry.entity || "Verto India Pvt Ltd",
        transactionLabel:
          flowType === "petty_cash"
            ? "Petty Cash"
            : flowType === "salary"
            ? "Salary Payout"
            : flowType === "expense"
            ? "Expense"
            : flowType === "travel"
            ? "Travel Expense"
            : flowType === "food"
            ? "Food Expense"
            : flowType === "penalty"
            ? "Interest / Penalty"
            : entry.entry_type === "payment_received"
            ? "Payment Received"
            : entry.entry_type === "payment_made"
            ? "Payment Made"
            : entry.entry_type === "employee_payout"
            ? "Employee Payout"
            : entry.entry_type === "statutory_payment"
            ? "Statutory Payment"
            : entry.entry_type === "interest_penalty"
            ? "Interest / Penalty"
            : entry.entry_type === "bank_transfer"
            ? "Bank Transfer"
            : entry.entry_type === "manual_adjustment"
            ? "Manual Entry"
            : "Other",
        amount:
          entry.type === "debit"
            ? -Math.abs(entry.amount)
            : Math.abs(entry.amount),
        remarks: entry.remarks,
      });
    });

    const sortedRows = Object.values(grouped).sort(
      (a, b) => new Date(a.month) - new Date(b.month)
    );

    const runningBankBalances = {};
    const runningSoftwareBalances = {};

    const finalData = await Promise.all(
      sortedRows.map(async (row) => {
        const bankId = row.bank_id;

        const previousBankBalance = runningBankBalances[bankId] || 0;
        const previousSoftwareBalance = runningSoftwareBalances[bankId] || 0;

        const currentSoftwareMovement = await calculateSoftwareBalance(bankId);
        const currentBankMovement = row.asPerBankTotalBal;

        row.asPerBankTotalBal = previousBankBalance + currentBankMovement;
        row.asPerSwTotalBal = previousSoftwareBalance + currentSoftwareMovement;

        runningBankBalances[bankId] = row.asPerBankTotalBal;
        runningSoftwareBalances[bankId] = row.asPerSwTotalBal;

        row.difference = row.asPerBankTotalBal - row.asPerSwTotalBal;
        row.remainingBalance = Math.abs(row.difference);
        row.status = row.difference < 50000 ? "reconciled" : "pending";

        return row;
      })
    );

    setBankData(finalData.reverse());
  };

  // ─── EFFECTS ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchBanks();
    fetchEntries();
    fetchSoftwareEntries();
    fetchOutstandingInvoices();
    fetchFundFlowProjection();
    fetchTransfers();
    fetchInterestPenalties();
  }, []);

  useEffect(() => {
    (async () => {
      await buildBankRecoData();
    })();
  }, [entries, softwareEntries, outstandingInvoices]);

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

  useEffect(() => {
    const channel = supabase
      .channel("bank-transfers-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bank_transfers" },
        () => fetchTransfers()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("payments-expenses-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments_made" },
        () => fetchEntries()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => fetchEntries()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  window.refreshBanks = fetchBanks;

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  const formatCurrency = (val = 0) => `₹ ${(Number(val) / 100000).toFixed(2)}L`;
  const formatCurrencyFull = (val = 0) =>
    `₹ ${Number(val).toLocaleString("en-IN")}`;

  // ─── TRANSFER HANDLERS ────────────────────────────────────────────────────

  const handleDeleteTransfer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transfer?"))
      return;
    const { error } = await supabase
      .from("bank_transfers")
      .delete()
      .eq("id", id);
    if (error) alert(error.message);
    else fetchTransfers();
  };

  const handleEditTransfer = (transfer) => {
    setEditTransfer(transfer);
    setShowTransferModal(true);
  };

  // ─── FILTERED / SORTED BANK DATA ──────────────────────────────────────────

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

  // ─── ADD BANK ENTRY ───────────────────────────────────────────────────────

  const handleAddEntry = async () => {
    if (!newEntry.bank_id || !newEntry.amount || !newEntry.dateOfBankBal) {
      alert("Fill all required fields");
      return;
    }

    const enteredAmount = parseFloat(newEntry.amount || 0);

    if (newEntry.transaction_mode === "total_update") {
      const bankEntries = entries.filter(
        (e) => String(e.bank_id) === String(newEntry.bank_id)
      );

      const currentBalance = bankEntries.reduce((sum, e) => {
        const amt = Number(e.amount || 0);
        return e.type === "debit" ? sum - amt : sum + amt;
      }, 0);

      const adjustment = enteredAmount - currentBalance;

      newEntry.amount = Math.abs(adjustment);
      newEntry.transaction_mode = adjustment >= 0 ? "credit" : "debit";
      newEntry.entry_type = "bank_balance_adjustment";
    }

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

    if (!newEntry.entry_type || newEntry.entry_type === "other") {
      finalEntryType = "manual_adjustment";
    }

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

  // ─── RENDER ───────────────────────────────────────────────────────────────

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
      />

      {/* ── Filter Bar ── */}
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
            <span>Export CSV</span>
          </Button>
        </div>
      </Card>

      {/* ── Main Content ── */}
      <div className="flex gap-4">
        {/* LEFT: Table */}
        <div className="flex-1 space-y-4">
          {activeView === "reco" ? (
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
                                      {formatCurrencyFull(row.asPerSwTotalBal)}
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
                                                <span>
                                                  {entry.amount >= 0
                                                    ? "+"
                                                    : "-"}
                                                  {formatCurrencyFull(
                                                    Math.abs(entry.amount)
                                                  )}
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
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-purple-50/50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-purple-600" />
                  Fund Flow Projection (5B) — Next 6 Months
                </h3>
                <Badge className="bg-purple-100 text-purple-700">
                  Projected
                </Badge>
              </div>

              <div className="overflow-x-auto" style={{ minHeight: "400px" }}>
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="p-4">Month</th>
                      <th className="p-4 text-right text-blue-700">
                        Opening Bal
                      </th>
                      <th className="p-4 text-right text-emerald-700">
                        Projected Income
                      </th>
                      <th className="p-4 text-right text-rose-700">
                        Projected Expense
                      </th>
                      <th className="p-4 text-right">Net Flow</th>
                      <th className="p-4 text-right text-purple-700 bg-purple-50 font-bold">
                        Projected Closing Bal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
                    {fundFlowData.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="p-8 text-center text-gray-400"
                        >
                          No projection data found. Check if invoices exist.
                        </td>
                      </tr>
                    ) : (
                      fundFlowData.map((row, index) => {
                        const income = Number(row.projected_income ?? 0);
                        const expense = Number(row.projected_expense ?? 0);
                        const netFlow = Number(row.net_flow ?? 0);
                        const openingBal = Number(row.opening_balance ?? 0);
                        const closingBal = Number(
                          row.projected_closing_balance ?? 0
                        );

                        const isCurrentMonth = row.full_date
                          ? new Date(row.full_date)
                              .toISOString()
                              .slice(0, 7) ===
                            new Date().toISOString().slice(0, 7)
                          : false;

                        return (
                          <motion.tr
                            key={`${row.month}-${index}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.04 }}
                            className={`hover:bg-purple-50 ${
                              isCurrentMonth
                                ? "bg-purple-50/60 font-medium"
                                : ""
                            }`}
                            style={{ height: "56px" }}
                          >
                            <td className="p-4 font-medium text-gray-900">
                              <div className="flex items-center gap-2">
                                {row.month}
                                {isCurrentMonth && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold"></span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-right font-mono text-blue-700">
                              {formatCurrency(openingBal)}
                            </td>
                            <td className="p-4 text-right font-mono text-emerald-700">
                              <span className="flex items-center justify-end">
                                <ArrowUpRight className="w-4 h-4 mr-1" />
                                {formatCurrency(income)}
                              </span>
                            </td>
                            <td className="p-4 text-right font-mono text-rose-700">
                              <span className="flex items-center justify-end">
                                <ArrowDownLeft className="w-4 h-4 mr-1" />
                                {formatCurrency(expense)}
                              </span>
                            </td>
                            <td
                              className={`p-4 text-right font-mono font-medium ${
                                netFlow >= 0
                                  ? "text-emerald-600"
                                  : "text-rose-600"
                              }`}
                            >
                              {netFlow >= 0 ? "+" : ""}
                              {formatCurrency(netFlow)}
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-purple-700 bg-purple-50/50 text-base">
                              {formatCurrency(closingBal)}
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
                          {selectedRow.month} •{" "}
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
                  <>
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
                        <div className="h-px bg-gray-200 my-2" />
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            Total Bank Balance
                          </span>
                          <span className="font-mono font-medium text-blue-600">
                            {(() => {
                              const latestBalances = {};
                              bankData.forEach((row) => {
                                const existing = latestBalances[row.bank_id];
                                if (
                                  !existing ||
                                  new Date(row.date) > new Date(existing.date)
                                ) {
                                  latestBalances[row.bank_id] = row;
                                }
                              });
                              return formatCurrency(
                                Object.values(latestBalances).reduce(
                                  (sum, row) =>
                                    sum + Number(row.asPerBankTotalBal || 0),
                                  0
                                )
                              );
                            })()}
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

                        <Button
                          className="w-full justify-start"
                          variant="outline"
                          size="sm"
                          onClick={() => {
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

                        <div className="pt-2 border-t border-blue-200 mt-2">
                          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <ArrowLeftRight className="w-3 h-3" />
                            Bank to Bank Transfer
                          </p>
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
                                      ₹
                                      {Number(t.amount).toLocaleString("en-IN")}
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
                  </>
                ) : (
                  <Card className="p-4 bg-purple-50 border-purple-200">
                    <h4 className="text-sm font-semibold text-purple-900 mb-3">
                      Projection Summary
                    </h4>
                    <p className="text-xs text-purple-700 mb-4">
                      Opening Balance rolls forward: each month's closing
                      becomes next month's opening.
                    </p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-purple-600">
                          This Month Opening
                        </span>
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
                          Month 6 Closing
                        </span>
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
                      <p className="text-xs font-semibold text-purple-800 uppercase tracking-wider">
                        Monthly Closing
                      </p>
                      {fundFlowData.map((row, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center"
                        >
                          <span className="text-xs text-purple-600">
                            {row.month}
                          </span>
                          <span
                            className={`font-mono text-xs font-semibold ${
                              Number(row.projected_closing_balance) >=
                              Number(row.opening_balance)
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }`}
                          >
                            {formatCurrency(row.projected_closing_balance)}
                          </span>
                        </div>
                      ))}
                      <div className="h-px bg-purple-200 my-1" />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-purple-600">
                          Months Projected
                        </span>
                        <span className="font-mono font-medium">
                          {fundFlowData.length}
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