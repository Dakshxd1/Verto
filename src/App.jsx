import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import UserManagement from "./pages/UserManagement";
import LivePopup from "./components/LivePopup";
import supabase from "./lib/supabaseClient";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  DollarSign,
  CreditCard,
  Activity,
  Plus,
  LogOut,
  Settings,
  X,
  KeyRound,
  UserCog,
  ShieldCheck,
  Mail,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  Wallet,
} from "lucide-react";

// Import Components
import Dashboard from "./components/Dashboard";
import ProfitCenterPL from "./components/ProfitCenterPL";
import ClientPL from "./components/ClientPL";
import InternalCost from "./components/InternalCost";
import BankReco from "./components/BankReco";
import AddPaymentReceivedModal from "./components/AddPaymentReceivedModal";
import AddInvoiceModal from "./components/AddInvoiceModal";
import AddCNBadDebtModal from "./components/AddCNBadDebtModal";
import AddBounceBackModal from "./components/AddBounceBackModal";
import AddInternalTeamModal from "./components/AddInternalTeamModal";
import AddPaymentMadeModal from "./components/AddPaymentMadeModal";
import InternalTeamDetails from "./components/InternalTeamDetails";
import AddExpenseDetailsModal from "./components/AddExpenseDetailsModal";
import AddInterestPenaltyModal from "./components/AddInterestPenaltyModal";
import AddExpenseDetailsManModal from "./components/AddExpenseDetailsManModal";
import LedgerPage from "./components/LedgerPage";
import PettyCashPage from "./components/PettyCashPage";
import AdvanceCreditCardLockerPage from "./components/advance/Advancecreditcardlockerpage.jsx";
import AddAdvanceLoanModal from "./components/advance/Addadvanceloanmodal.jsx";
import AddCreditCardModal from "./components/advance/Addcreditcardmodal.jsx";
import AddStatutoryPayoutModal from "./components/AddStatutoryPayoutModal";

// ── Manage Team Modal ──────────────────────────────────────────────────────
const ManageTeamModal = ({ onClose, role }) => {
  const [activeSection, setActiveSection] = useState("team");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  const clearReset = () => {
    setResetEmail("");
    setResetResult(null);
  };

  const handleReset = async () => {
    const email = resetEmail.trim();
    if (!email) {
      setResetResult({
        success: false,
        error: "Please enter an email address.",
      });
      return;
    }
    setResetLoading(true);
    setResetResult(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("You are not logged in.");
      const response = await fetch(
        `https://exykcukcvjdkrlbmxzdx.supabase.co/functions/v1/reset-user-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email }),
        }
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || `Server error: ${response.status}`);
      setResetResult({
        success: true,
        newPassword: data.newPassword,
        email: data.email,
      });
    } catch (err) {
      setResetResult({ success: false, error: err.message });
    } finally {
      setResetLoading(false);
    }
  };

  const tabs = [
    { id: "team", label: "Team Members", icon: UserCog },
    { id: "reset", label: "Reset Password", icon: KeyRound },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 24 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-100"
        style={{
          boxShadow:
            "0 32px 80px -12px rgba(59,130,246,0.18), 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        {/* Header */}
        <div
          className="relative px-8 py-5 border-b border-gray-100 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)",
          }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="flex items-center justify-between relative">
            <div className="flex items-center space-x-4">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                  Team Management
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage users and access controls
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white/80 transition-all border border-transparent hover:border-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-8 pt-1 border-b border-gray-100 bg-white">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSection(tab.id);
                clearReset();
              }}
              className={`relative flex items-center space-x-2 px-5 py-4 text-sm font-semibold transition-all duration-200 -mb-px ${
                activeSection === tab.id
                  ? "text-blue-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {activeSection === tab.id && (
                <motion.div
                  layoutId="tabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[62vh] bg-gray-50/40">
          <AnimatePresence mode="wait">
            {activeSection === "team" && (
              <motion.div
                key="team"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2 }}
                className="p-8"
              >
                <UserManagement />
              </motion.div>
            )}
            {activeSection === "reset" && (
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="p-8"
              >
                <div className="max-w-md mx-auto space-y-5">
                  <div className="flex items-start space-x-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Enter the employee's email. A new random password will be
                      generated and <strong>immediately applied</strong> to
                      their account.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 tracking-wide uppercase">
                      Employee Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => {
                          setResetEmail(e.target.value);
                          setResetResult(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleReset()}
                        placeholder="employee@verto.com"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400 shadow-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    disabled={resetLoading || !resetEmail.trim()}
                    className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25"
                  >
                    {resetLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Generate &amp; Apply New Password</span>
                      </>
                    )}
                  </button>
                  <AnimatePresence>
                    {resetResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`rounded-2xl border p-5 ${
                          resetResult.success
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-rose-50 border-rose-200"
                        }`}
                      >
                        {resetResult.success ? (
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              </div>
                              <p className="text-sm font-bold text-emerald-800">
                                Password reset successfully!
                              </p>
                            </div>
                            <p className="text-xs text-emerald-700">
                              Account:{" "}
                              <span className="font-mono font-semibold">
                                {resetResult.email}
                              </span>
                            </p>
                            <div className="bg-white border-2 border-emerald-300 rounded-2xl px-5 py-4 shadow-sm">
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-semibold">
                                New Temporary Password
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xl font-bold tracking-widest text-gray-900 select-all">
                                  {resetResult.newPassword}
                                </span>
                                <button
                                  onClick={() =>
                                    navigator.clipboard?.writeText(
                                      resetResult.newPassword
                                    )
                                  }
                                  className="ml-3 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                  Copy
                                </button>
                              </div>
                            </div>
                            <div className="flex items-start space-x-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-amber-700">
                                This password is <strong>active now</strong>.
                                Share it securely.
                              </p>
                            </div>
                            <button
                              onClick={clearReset}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                            >
                              Reset another employee →
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start space-x-3">
                            <div className="w-7 h-7 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                              <AlertCircle className="w-4 h-4 text-rose-500" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-rose-800 mb-1">
                                Reset failed
                              </p>
                              <p className="text-xs text-rose-700">
                                {resetResult.error}
                              </p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-8 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Changes take effect immediately
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all font-semibold border border-gray-200 hover:border-gray-300"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Main App ──────────────────────────────────────────────────────────────
// ── Main App ──────────────────────────────────────────────────────────────
function App() {

  const getInitialTab = () => {

    const params = new URLSearchParams(window.location.search);

    const tab = params.get("tab");

    if (tab === "petty-cash") {
      return "petty-cash";
    }

    return "dashboard";
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentMadeModal, setShowPaymentMadeModal] = useState(false);
  const [paymentMadeInvoice, setPaymentMadeInvoice] = useState(null);
  const [showCNBadDebtModal, setShowCNBadDebtModal] = useState(false);
  const [showBounceBackModal, setShowBounceBackModal] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [showInternalTeamModal, setShowInternalTeamModal] = useState(false);
  const [showExpenseDetailsModal, setShowExpenseDetailsModal] = useState(false);
  const [showExpenseDetailsManModal, setShowExpenseDetailsManModal] =
    useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [showAdvanceLoanModal, setShowAdvanceLoanModal] = useState(false);
  const [showStatutoryModal, setShowStatutoryModal] = useState(false);
  const [showCreditCardModal, setShowCreditCardModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [banks, setBanks] = useState([]);
  const [loggedInEmployee, setLoggedInEmployee] = useState(null);

  const clients = [
    "Acme Corp",
    "Globex",
    "Soylent",
    "Initech",
    "Umbrella",
    "Massive",
    "Stark Ind",
    "Wayne Ent",
  ];
  useEffect(() => {
    fetchBanks();
  }, []);
  const fetchBanks = async () => {
    const { data } = await supabase.from("bank_master").select("*");
    setBanks(data || []);
  };
  useEffect(() => {
    window.setActiveTab = setActiveTab;
  }, []);
  const entities = ["Verto India Pvt Ltd", "Verto Global LLC", "Verto UK Ltd"];
  const invoices = [
    "INV-2023001",
    "INV-2023002",
    "INV-2023003",
    "INV-2023004",
    "INV-2023005",
  ];
  const paymentReferences = [
    "PI-AC-150123-01",
    "PI-GL-200123-01",
    "PI-SO-250123-01",
  ];

  const { user, role, loading, showLivePopup, setShowLivePopup } = useAuth();

  useEffect(() => {
    const checkMidnightLogout = async () => {
      if (typeof window === "undefined") return;

      const loginDate = localStorage.getItem("loginDate");
      const today = new Date().toDateString();

      if (loginDate && loginDate !== today) {
        await supabase.auth.signOut();
        localStorage.removeItem("loginDate");
        window.location.reload();
        return;
      }

      const now = new Date();
      const midnight = new Date(now);
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);
      const timeUntilMidnight = midnight.getTime() - now.getTime();

      const timeoutId = window.setTimeout(async () => {
        await supabase.auth.signOut();
        localStorage.removeItem("loginDate");
        window.location.reload();
      }, timeUntilMidnight);

      return () => window.clearTimeout(timeoutId);
    };

    checkMidnightLogout();
  }, [user]);

  useEffect(() => {
    if (user?.email) fetchLoggedInEmployee();
  }, [user]);
  const fetchLoggedInEmployee = async () => {
    const { data } = await supabase
      .from("internal_team")
      .select("name, designation, email")
      .eq("email", user.email)
      .maybeSingle();
    if (data) setLoggedInEmployee(data);
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
            <Activity className="text-white w-6 h-6" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  if (!user) return <Login />;

  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      desc: "Invoice tracking & overview",
    },
    {
      id: "pl-center",
      label: "P&L – Centerwise",
      icon: TrendingUp,
      desc: "Profit center analysis",
    },
    {
      id: "pl-client",
      label: "P&L – Clientwise",
      icon: Users,
      desc: "Client profitability",
    },
    {
      id: "internal-cost",
      label: "Internal Team Cost",
      icon: CreditCard,
      desc: "Payroll & team expenses",
    },
    {
      id: "internal-team",
      label: "Internal Team Details",
      icon: Users,
      desc: "Employee information",
    },
    {
      id: "bank-reco",
      label: "Bank & Fund Flow",
      icon: DollarSign,
      desc: "Reconciliation & projections",
    },
    {
      id: "advance-credit-locker",
      label: "Advance & CC Locker",
      icon: CreditCard,
      desc: "Advance tracker & credit cards",
    },
    {
      id: "petty-cash",
      label: "Petty Cash",
      icon: Wallet,
      desc: "Petty cash ledger & history",
    },
  ];

  // ── QUICK ACTIONS ────────────────────────────────────────────────────────
  const sideActions = [
    { label: "Add Invoice Details" },
    { label: "Add Payment Received" },
    { label: "Add Payment Made" },
    { label: "Add Bounce Back" },
    { label: "Add CN / Bad Debt" },
    { label: "Add Statutory Payout" },
    { label: "Add Expense / Material" },
    { label: "Add Expense / Man" },
    { label: "Interest or Penalties" },
    { label: "Internal Team Details" },
    { label: "Add Advance / Loan" },
    { label: "Add Credit Card" },
  ];

  const handleActionClick = (label) => {
    ({
      "Add Payment Received": () => setShowPaymentModal(true),
      "Add Invoice Details": () => setShowInvoiceModal(true),
      "Add Payment Made": () => {
        setShowPaymentMadeModal(true);
        setPaymentMadeInvoice(null);
      },
      "Add CN / Bad Debt": () => setShowCNBadDebtModal(true),
      "Add Bounce Back": () => setShowBounceBackModal(true),
      "Interest or Penalties": () => setShowPenaltyModal(true),
      "Add Advance / Loan": () => setShowAdvanceLoanModal(true),
      "Add Credit Card": () => setShowCreditCardModal(true),
      "Add Statutory Payout": () => setShowStatutoryModal(true),
      "Add Expense / Material": () => setShowExpenseDetailsModal(true),
      "Add Expense / Man": () => setShowExpenseDetailsManModal(true),
      "Internal Team Details": () => {
        setEditingEmployee(null);
        setShowInternalTeamModal(true);
      },
    })[label]?.();
  };

  const activeNav = navItems.find((n) => n.id === activeTab);

  return (
    <div className="flex h-screen flex-col md:flex-row bg-slate-50 text-gray-900 font-sans overflow-hidden selection:bg-blue-500/30">
      {/* ── SIDEBAR ── */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 272 : 76 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
        className="hidden md:flex flex-col z-20 relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg,#ffffff 0%,#f8faff 100%)",
          borderRight: "1px solid rgba(226,232,240,0.8)",
          boxShadow: "4px 0 24px -8px rgba(59,130,246,0.08)",
        }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-100 overflow-hidden flex-shrink-0">
          <div className="min-w-[44px] w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Activity className="text-white w-5 h-5" />
          </div>
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="ml-3 overflow-hidden"
              >
                <span
                  className="text-lg font-extrabold text-gray-900 whitespace-nowrap"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  VERTO
                </span>
                <p className="text-[10px] text-blue-500 uppercase tracking-widest font-semibold">
                  Financial Suite
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          className="flex-1 py-5 px-3 overflow-y-auto overflow-x-hidden"
          style={{ scrollbarWidth: "none" }}
        >
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-3"
              >
                Main Modules
              </motion.p>
            )}
          </AnimatePresence>

          {/* Nav Items */}
          <div className="space-y-1">
            {navItems.map((item) => {
              if (role === "manager" && item.id === "bank-reco") return null;
              if (role === "employee") return null;
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center px-3 py-2.5 rounded-2xl transition-all duration-200 group relative ${
                    isActive
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 shadow-sm"
                      : "text-gray-500 hover:bg-slate-100 hover:text-gray-800"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="navActiveBar"
                      className="absolute left-0 w-1 h-7 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-r-full"
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 30,
                      }}
                    />
                  )}
                  <div
                    className={`min-w-[24px] flex-shrink-0 ${
                      isActive
                        ? "text-blue-600"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                  </div>
                  <AnimatePresence>
                    {isSidebarOpen && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="ml-3 overflow-hidden text-left"
                      >
                        <span className="font-semibold text-sm whitespace-nowrap block leading-tight">
                          {item.label}
                        </span>
                        <span
                          className={`text-[10px] block leading-tight mt-0.5 ${
                            isActive ? "text-blue-400" : "text-gray-400"
                          }`}
                        >
                          {item.desc}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>

          {/* ── QUICK ACTIONS ── */}
          <div className="mt-6">
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2"
                >
                  Quick Actions
                </motion.p>
              )}
            </AnimatePresence>

            <div className="space-y-0.5">
              {sideActions.map((action, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ x: isSidebarOpen ? 3 : 0 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleActionClick(action.label)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium
                    text-gray-500 hover:text-gray-900 hover:bg-gray-100
                    transition-all duration-150 group
                    ${!isSidebarOpen ? "justify-center" : ""}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-blue-400 flex-shrink-0 transition-colors duration-150" />
                  <AnimatePresence>
                    {isSidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="whitespace-nowrap text-left flex-1 leading-tight"
                      >
                        {action.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-gray-100 flex-shrink-0">
          <button
            className={`w-full flex items-center px-3 py-2.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition-all ${
              !isSidebarOpen ? "justify-center" : "space-x-3"
            }`}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-medium whitespace-nowrap"
                >
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/4 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <header
          className="h-16 flex-shrink-0 bg-white/90 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-6 lg:px-8 z-10 sticky top-0"
          style={{
            boxShadow:
              "0 1px 0 rgba(0,0,0,0.04), 0 4px 16px -8px rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center space-x-3">
            {activeNav && (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center border border-blue-100">
                <activeNav.icon className="w-4 h-4 text-blue-600" />
              </div>
            )}
            <div>
              <motion.h1
                key={activeTab}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-base font-bold text-gray-900 leading-tight tracking-tight"
              >
                {activeNav?.label}
              </motion.h1>
              <p className="text-xs text-gray-400 leading-tight">
                {activeNav?.desc}
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-3 pl-3 pr-2 py-1.5 rounded-2xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all duration-200"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {loggedInEmployee?.name || "User"}
                </p>
                <p className="text-[10px] text-gray-400 leading-tight">
                  {loggedInEmployee?.designation || role}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25 flex-shrink-0">
                <span className="text-white text-sm font-bold">
                  {(loggedInEmployee?.name ||
                    user?.email ||
                    "U")[0].toUpperCase()}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                  showProfileMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden"
                  style={{
                    boxShadow:
                      "0 20px 60px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)",
                  }}
                >
                  <div className="px-4 py-3 border-b border-gray-50 bg-gradient-to-r from-blue-50/60 to-indigo-50/60">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">
                          {(loggedInEmployee?.name ||
                            user?.email ||
                            "U")[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {loggedInEmployee?.name || "User"}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full uppercase tracking-wide">
                        {loggedInEmployee?.designation || role}
                      </span>
                    </div>
                  </div>
                  <div className="py-1">
                    <button className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Settings className="w-4 h-4 text-gray-400" />
                      <span>Account Settings</span>
                    </button>
                    {role === "admin" && (
                      <button
                        onClick={() => {
                          setShowUserManagement(true);
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>Manage Team</span>
                      </button>
                    )}
                    <button className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <span>Activity Log</span>
                    </button>
                  </div>
                  <div className="border-t border-gray-100 pt-1">
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        window.location.reload();
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative z-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 16, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.99 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-7xl mx-auto"
            >
              {role !== "employee" ? (
                <>
                  {activeTab === "dashboard" && (
                    <Dashboard
                      refreshFlag={refreshFlag}
                      setShowInvoiceModal={setShowInvoiceModal}
                      setShowPaymentModal={setShowPaymentModal}
                      setShowCNBadDebtModal={setShowCNBadDebtModal}
                      setShowBounceBackModal={setShowBounceBackModal}
                      setSelectedInvoice={setSelectedInvoice}
                    />
                  )}
                  {activeTab === "pl-center" && <ProfitCenterPL />}
                  {activeTab === "ledger" && <LedgerPage />}
                  {activeTab === "pl-client" && <ClientPL />}
                  {activeTab === "internal-cost" && <InternalCost />}
                  {activeTab === "internal-team" && <InternalTeamDetails />}
                  {!(role === "manager" && activeTab === "bank-reco") &&
                    activeTab === "bank-reco" && <BankReco />}
                  {activeTab === "petty-cash" && <PettyCashPage />}
                  {activeTab === "advance-credit-locker" && (
                    <AdvanceCreditCardLockerPage />
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mb-4 border border-blue-100">
                    <Plus className="w-7 h-7 text-blue-400" />
                  </div>
                  <p className="text-base font-semibold text-gray-700">
                    Use Quick Actions
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Select an action from the sidebar to get started
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── MODALS ── */}
      <AddPaymentReceivedModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoice={selectedInvoice}
        onPaymentSaved={() => setRefreshFlag(!refreshFlag)}
        clients={clients}
      />
      <AddPaymentMadeModal
        isOpen={showPaymentMadeModal}
        onClose={() => setShowPaymentMadeModal(false)}
        invoice={paymentMadeInvoice}
        onSaved={() => setRefreshFlag(!refreshFlag)}
      />
      <AddInvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        clients={clients}
        entities={entities}
      />
      <AddCNBadDebtModal
        isOpen={showCNBadDebtModal}
        onClose={() => setShowCNBadDebtModal(false)}
        invoices={invoices}
      />
      <AddBounceBackModal
        isOpen={showBounceBackModal}
        onClose={() => setShowBounceBackModal(false)}
        invoices={invoices}
        paymentReferences={paymentReferences}
      />
      <AddInterestPenaltyModal
        isOpen={showPenaltyModal}
        onClose={() => setShowPenaltyModal(false)}
        banks={banks}
      />
      <AddInternalTeamModal
        isOpen={showInternalTeamModal}
        onClose={() => {
          setShowInternalTeamModal(false);
          setEditingEmployee(null);
        }}
        editingEmployee={editingEmployee}
      />
      <AddExpenseDetailsModal
        isOpen={showExpenseDetailsModal}
        onClose={() => setShowExpenseDetailsModal(false)}
        onSaved={() => setRefreshFlag(!refreshFlag)}
        editData={selectedExpense}
        invoice={selectedInvoice}
      />
      <AddExpenseDetailsManModal
        isOpen={showExpenseDetailsManModal}
        onClose={() => setShowExpenseDetailsManModal(false)}
      />
      <AddStatutoryPayoutModal
        isOpen={showStatutoryModal}
        onClose={() => setShowStatutoryModal(false)}
        entities={entities}
        banks={banks}
      />
      <AddAdvanceLoanModal
        isOpen={showAdvanceLoanModal}
        onClose={() => setShowAdvanceLoanModal(false)}
      />
      <AddCreditCardModal
        isOpen={showCreditCardModal}
        onClose={() => setShowCreditCardModal(false)}
      />

      <AnimatePresence>
        {showUserManagement && (
          <ManageTeamModal
            onClose={() => setShowUserManagement(false)}
            role={role}
          />
        )}
      </AnimatePresence>

      <LivePopup
        isOpen={showLivePopup}
        onClose={() => setShowLivePopup(false)}
      />
    </div>
  );
};

export default App;
