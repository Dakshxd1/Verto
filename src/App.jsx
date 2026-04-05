import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import InternalTeamDetails from "./components/InternalTeamDetails";
import AddExpenseDetailsModal from "./components/AddExpenseDetailsModal";
import AddExpenseDetailsManModal from "./components/AddExpenseDetailsManModal";

const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showCNBadDebtModal, setShowCNBadDebtModal] = useState(false);
  const [showBounceBackModal, setShowBounceBackModal] = useState(false);
  const [showStatutoryPayoutModal, setShowStatutoryPayoutModal] =
    useState(false);
  const [showInternalTeamModal, setShowInternalTeamModal] = useState(false);
  const [showExpenseDetailsModal, setShowExpenseDetailsModal] = useState(false);
  const [showExpenseDetailsManModal, setShowExpenseDetailsManModal] =
    useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(false);

  // Mock clients list (will be replaced with API data later)
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

  // Mock entities list
  const entities = ["Verto India Pvt Ltd", "Verto Global LLC", "Verto UK Ltd"];
  // Mock invoices list
  const invoices = [
    "INV-2023001",
    "INV-2023002",
    "INV-2023003",
    "INV-2023004",
    "INV-2023005",
  ];

  // Mock payment references list
  const paymentReferences = [
    "PI-AC-150123-01",
    "PI-GL-200123-01",
    "PI-SO-250123-01",
  ];

  // Navigation Items Configuration
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

  // Side Action Items
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
    <div className="flex h-screen bg-slate-50 text-gray-900 font-sans overflow-hidden selection:bg-blue-500/30">
      {/* --- SIDEBAR --- */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
        className="bg-white border-r border-gray-200 flex flex-col z-20 relative shadow-sm"
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

          {navItems.map((item, idx) => (
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
          ))}

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
                    } else if (action.label === "Add CN / Bad Debt") {
                      setShowCNBadDebtModal(true);
                    } else if (action.label === "Add Bounce Back") {
                      setShowBounceBackModal(true);
                    } else if (action.label === "Add Statutory Payout") {
                      setShowStatutoryPayoutModal(true);
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
                  <Plus
                    className={`w-3.5 h-3.5 flex-shrink-0 opacity-60 group-hover:opacity-100`}
                  />
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
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200 flex items-center justify-between px-8 z-10 sticky top-0 shadow-sm">
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
                <p className="text-sm font-medium text-gray-900">Admin User</p>
                <p className="text-xs text-gray-500">Finance Manager</p>
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
                    className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        Admin User
                      </p>
                      <p className="text-xs text-gray-500">admin@verto.com</p>
                    </div>
                    <button className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Settings className="w-4 h-4" />
                      <span>Account Settings</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Users className="w-4 h-4" />
                      <span>Manage Team</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Activity className="w-4 h-4" />
                      <span>Activity Log</span>
                    </button>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors">
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative z-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-7xl mx-auto"
            >
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
              {activeTab === "pl-client" && <ClientPL />}
              {activeTab === "internal-cost" && <InternalCost />}
              {activeTab === "internal-team" && <InternalTeamDetails />}
              {activeTab === "bank-reco" && <BankReco />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Add Payment Received Modal */}
      <AddPaymentReceivedModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoice={selectedInvoice}
        onPaymentSaved={() => setRefreshFlag(!refreshFlag)} // 🔥 PASS DATA
        clients={clients}
      />

      {/* Add Invoice Modal */}
      <AddInvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        clients={clients}
        entities={entities}
      />

      {/* Add CN/Bad Debt Modal */}
      <AddCNBadDebtModal
        isOpen={showCNBadDebtModal}
        onClose={() => setShowCNBadDebtModal(false)}
        invoices={invoices}
      />

      {/* Add Bounce Back Modal */}
      <AddBounceBackModal
        isOpen={showBounceBackModal}
        onClose={() => setShowBounceBackModal(false)}
        invoices={invoices}
        paymentReferences={paymentReferences}
      />

      {/* Add Statutory Payout Modal */}
      <AddStatutoryPayoutModal
        isOpen={showStatutoryPayoutModal}
        onClose={() => setShowStatutoryPayoutModal(false)}
        entities={entities}
      />

      {/* Add Internal Team Modal */}
      <AddInternalTeamModal
        isOpen={showInternalTeamModal}
        onClose={() => {
          setShowInternalTeamModal(false);
          setEditingEmployee(null);
        }}
        editingEmployee={editingEmployee}
      />

      {/* Add Expense Details Modal */}
      <AddExpenseDetailsModal
        isOpen={showExpenseDetailsModal}
        onClose={() => setShowExpenseDetailsModal(false)}
      />

      {/* Add Expense Details/Man Modal */}
      <AddExpenseDetailsManModal
        isOpen={showExpenseDetailsManModal}
        onClose={() => setShowExpenseDetailsManModal(false)}
      />
    </div>
  );
};

export default App;
