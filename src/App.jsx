import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import UserManagement from "./pages/UserManagement";
import supabase from "./lib/supabaseClient";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  DollarSign,
  CreditCard,
  Activity,
  Plus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  X,
  KeyRound,
  UserCog,
  ShieldCheck,
  Mail,
  RefreshCw,
  AlertCircle,
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
import AddStatutoryPayoutModal from "./components/AddStatutoryPayoutModal";
import AddInternalTeamModal from "./components/AddInternalTeamModal";
import AddPaymentMadeModal from "./components/AddPaymentMadeModal";
import InternalTeamDetails from "./components/InternalTeamDetails";
import AddExpenseDetailsModal from "./components/AddExpenseDetailsModal";
import AddInterestPenaltyModal from "./components/AddInterestPenaltyModal";
import AddExpenseDetailsManModal from "./components/AddExpenseDetailsManModal";
import LedgerPage from "./components/LedgerPage";

// ── Manage Team Modal ────────────────────────────────────────────────────────
const ManageTeamModal = ({ onClose, role }) => {
  const [activeSection, setActiveSection] = useState("team");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  // resetResult: { success: bool, newPassword?: string, email?: string, error?: string }

  const clearReset = () => {
    setResetEmail("");
    setResetResult(null);
  };

  // ── Calls the Supabase Edge Function ─────────────────────────────────────
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
      // Get the logged-in admin's JWT
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

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Team Management
              </h2>
              <p className="text-xs text-gray-500">
                Manage users and access controls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-100 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSection(tab.id);
                clearReset();
              }}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 -mb-px ${
                activeSection === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          <AnimatePresence mode="wait">
            {/* ── Team Members tab ── */}
            {activeSection === "team" && (
              <motion.div
                key="team"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.18 }}
                className="p-6"
              >
                <UserManagement />
              </motion.div>
            )}

            {/* ── Reset Password tab ── */}
            {activeSection === "reset" && (
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
                className="p-6"
              >
                <div className="max-w-md mx-auto space-y-5">
                  {/* Info banner */}
                  <div className="flex items-start space-x-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <KeyRound className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Enter the employee's email. A new random password will be
                      generated and <strong>immediately applied</strong> to
                      their account. Share it with them so they can log in.
                    </p>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Employee Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => {
                          setResetEmail(e.target.value);
                          setResetResult(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleReset()}
                        placeholder="employee@verto.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                  </div>

                  {/* Reset Button */}
                  <button
                    onClick={handleReset}
                    disabled={resetLoading || !resetEmail.trim()}
                    className="w-full flex items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {resetLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Resetting password…</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Generate &amp; Apply New Password</span>
                      </>
                    )}
                  </button>

                  {/* Result */}
                  <AnimatePresence>
                    {resetResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`rounded-xl border p-4 ${
                          resetResult.success
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-rose-50 border-rose-200"
                        }`}
                      >
                        {resetResult.success ? (
                          <div className="space-y-3">
                            {/* Success header */}
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              </div>
                              <p className="text-sm font-semibold text-emerald-800">
                                Password reset successfully!
                              </p>
                            </div>

                            <p className="text-xs text-emerald-700">
                              Account:{" "}
                              <span className="font-mono font-medium">
                                {resetResult.email}
                              </span>
                            </p>

                            {/* Password display box */}
                            <div className="bg-white border-2 border-emerald-300 rounded-xl px-4 py-3">
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                                New Temporary Password
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-lg font-bold tracking-widest text-gray-900 select-all">
                                  {resetResult.newPassword}
                                </span>
                                <button
                                  onClick={() =>
                                    navigator.clipboard?.writeText(
                                      resetResult.newPassword
                                    )
                                  }
                                  className="ml-3 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                  Copy
                                </button>
                              </div>
                            </div>

                            {/* Warning */}
                            <div className="flex items-start space-x-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-amber-700">
                                This password is <strong>active now</strong>.
                                Share it securely with the employee. Ask them to
                                change it after logging in.
                              </p>
                            </div>

                            {/* Reset again */}
                            <button
                              onClick={clearReset}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Reset another employee →
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-rose-800 mb-1">
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

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Main App ─────────────────────────────────────────────────────────────────
const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
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
  const [showStatutoryModal, setShowStatutoryModal] = useState(false);
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

  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (user?.email) {
      fetchLoggedInEmployee();
    }
  }, [user]);

  const fetchLoggedInEmployee = async () => {
    const { data } = await supabase
      .from("internal_team")
      .select("name, designation, email")
      .eq("email", user.email)
      .maybeSingle();

    if (data) {
      setLoggedInEmployee(data);
    }
  };

  console.log(
    "App.jsx - User:",
    user?.email,
    "Role:",
    role,
    "Loading:",
    loading
  );

  if (loading) return <div>Loading...</div>;
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
      label: "P&L - Centerwise",
      icon: TrendingUp,
      desc: "Profit center analysis",
    },
    {
      id: "pl-client",
      label: "P&L - Clientwise",
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
  ];

  const sideActions = [
    { label: "Add Invoice Details", color: "blue" },
    { label: "Add Payment Received", color: "emerald" },
    { label: "Add Payment Made", color: "rose" },
    { label: "Add Bounce Back", color: "amber" },
    { label: "Add CN / Bad Debt", color: "purple" },
    { label: "Add Statutory Payout", color: "cyan" },
    { label: "Add Expense Details / Material", color: "orange" },
    { label: "Add Expense Details / Man", color: "indigo" },
    { label: "Interest or Penalties", color: "red" },
    { label: "Internal Team Details", color: "pink" },
  ];

  const getColorClass = (color) => {
    const colors = {
      blue: "hover:text-blue-600 hover:bg-blue-50 text-gray-600",
      emerald: "hover:text-emerald-600 hover:bg-emerald-50 text-gray-600",
      rose: "hover:text-rose-600 hover:bg-rose-50 text-gray-600",
      amber: "hover:text-amber-600 hover:bg-amber-50 text-gray-600",
      purple: "hover:text-purple-600 hover:bg-purple-50 text-gray-600",
      cyan: "hover:text-cyan-600 hover:bg-cyan-50 text-gray-600",
      orange: "hover:text-orange-600 hover:bg-orange-50 text-gray-600",
      indigo: "hover:text-indigo-600 hover:bg-indigo-50 text-gray-600",
      red: "hover:text-red-600 hover:bg-red-50 text-gray-600",
      pink: "hover:text-pink-600 hover:bg-pink-50 text-gray-600",
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="flex h-screen md:h-screen flex-col md:flex-row bg-slate-50 text-gray-900 font-sans overflow-hidden selection:bg-blue-500/30">
      {/* --- SIDEBAR --- */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
        className="hidden md:flex bg-white border-r border-gray-200 flex flex-col z-20 relative shadow-sm"
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200 overflow-hidden">
          <div className="min-w-[40px] w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Activity className="text-white w-5 h-5" />
          </div>
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="ml-3 overflow-hidden"
              >
                <span className="text-xl font-bold tracking-tight text-gray-900 whitespace-nowrap">
                  VERTO
                </span>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Financial Suite
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-hide">
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-3"
              >
                Main Modules
              </motion.div>
            )}
          </AnimatePresence>

          {navItems.map((item) => {
            if (role === "manager" && item.id === "bank-reco") return null;
            if (role === "employee") return null;

            return (
              <motion.button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group relative mb-1 ${
                  activeTab === item.id
                    ? "bg-blue-50 text-blue-600 shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <div
                  className={`min-w-[24px] ${
                    activeTab === item.id
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
                      className="overflow-hidden text-left"
                    >
                      <span className="font-medium text-sm whitespace-nowrap block">
                        {item.label}
                      </span>
                      <span
                        className={`text-[10px] block leading-tight ${
                          activeTab === item.id
                            ? "text-blue-500"
                            : "text-gray-500"
                        }`}
                      >
                        {item.desc}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 w-1 h-8 bg-blue-600 rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}

          {/* Quick Actions Section */}
          <div className="mt-8">
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-3"
                >
                  Quick Actions
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1 px-1">
              {sideActions.map((action, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (action.label === "Add Payment Received") {
                      setShowPaymentModal(true);
                    } else if (action.label === "Add Invoice Details") {
                      setShowInvoiceModal(true);
                    } else if (action.label === "Add Payment Made") {
                      setShowPaymentMadeModal(true);
                      setPaymentMadeInvoice(null);
                    } else if (action.label === "Add CN / Bad Debt") {
                      setShowCNBadDebtModal(true);
                    } else if (action.label === "Add Bounce Back") {
                      setShowBounceBackModal(true);
                    } else if (action.label === "Interest or Penalties") {
                      setShowPenaltyModal(true);
                    } else if (action.label === "Add Statutory Payout") {
                      setShowStatutoryModal(true);
                    } else if (
                      action.label === "Add Expense Details / Material"
                    ) {
                      setShowExpenseDetailsModal(true);
                    } else if (action.label === "Add Expense Details / Man") {
                      setShowExpenseDetailsManModal(true);
                    } else if (action.label === "Internal Team Details") {
                      setEditingEmployee(null);
                      setShowInternalTeamModal(true);
                    }
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-xs ${getColorClass(
                    action.color
                  )} ${!isSidebarOpen && "justify-center"}`}
                >
                  <Plus className="w-3.5 h-3.5 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                  <AnimatePresence>
                    {isSidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="font-medium whitespace-nowrap overflow-hidden text-left"
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
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors ${
              !isSidebarOpen && "justify-center"
            }`}
          >
            <Settings className="w-4 h-4" />
            {isSidebarOpen && <span className="text-xs">Settings</span>}
          </button>
        </div>
      </motion.aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-gray-50">
        {/* Ambient Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 -left-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>

        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-8 z-10 sticky top-0 shadow-sm">
          <div>
            <motion.h1
              key={activeTab}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-semibold text-gray-900"
            >
              {navItems.find((n) => n.id === activeTab)?.label}
            </motion.h1>
            <p className="text-xs text-gray-500">
              {navItems.find((n) => n.id === activeTab)?.desc}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 relative">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {loggedInEmployee?.name || "User"}
                </p>
                <p className="text-xs text-gray-500">
                  {loggedInEmployee?.designation || role}
                </p>
                <p className="text-[10px] text-gray-400">{user?.email}</p>
              </div>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-blue-500 border-2 border-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
              ></button>

              {/* Profile Dropdown Menu */}
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {loggedInEmployee?.name || "User"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {loggedInEmployee?.designation || role}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {user?.email}
                      </p>
                    </div>

                    <button className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Settings className="w-4 h-4" />
                      <span>Account Settings</span>
                    </button>

                    {role === "admin" && (
                      <button
                        onClick={() => {
                          setShowUserManagement(true);
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        <span>Manage Team</span>
                      </button>
                    )}

                    <button className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Activity className="w-4 h-4" />
                      <span>Activity Log</span>
                    </button>

                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={async () => {
                          await supabase.auth.signOut();
                          window.location.reload();
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-4 sm:p-6 lg:p-8 relative z-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
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
                </>
              ) : (
                <div className="text-center text-gray-500 py-10">
                  Use Quick Actions from sidebar
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Modals ── */}
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

      <AddStatutoryPayoutModal
        isOpen={showStatutoryModal}
        onClose={() => setShowStatutoryModal(false)}
        entities={entities}
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

      {/* ── Unified Manage Team Modal ── */}
      <AnimatePresence>
        {showUserManagement && (
          <ManageTeamModal
            onClose={() => setShowUserManagement(false)}
            role={role}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
