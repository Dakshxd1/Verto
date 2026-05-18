import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Building2, CreditCard, ChevronRight, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import EmployeeAdvanceTracker from "./Employeeadvancetracker";
import ClientAdvanceTracker from "./Clientadvancetracker";
import CreditCardTracker from "./CreditCardTracker";

const tabs = [
  {
    id: "employee",
    label: "Employee Advance / Loan",
    icon: Users,
    desc: "Track internal loans & recoveries",
    color: "from-[#1a3a6b] to-[#2563eb]",
    accent: "#2563eb",
    light: "#eff6ff",
    border: "#bfdbfe",
  },
  {
    id: "client",
    label: "Client Advance Tracker",
    icon: Building2,
    desc: "Monitor client advances & dues",
    color: "from-[#7c2d12] to-[#ea580c]",
    accent: "#ea580c",
    light: "#fff7ed",
    border: "#fed7aa",
  },
  {
    id: "credit",
    label: "Credit Card Locker",
    icon: CreditCard,
    desc: "Card bills, expenses & tracking",
    color: "from-[#78350f] to-[#b45309]",
    accent: "#b45309",
    light: "#fffbeb",
    border: "#fde68a",
  },
];

export default function AdvanceCreditCardLockerPage() {
  const [activeTab, setActiveTab] = useState("employee");
  const active = tabs.find((t) => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`bg-gradient-to-r ${active.color} px-8 py-6 shadow-lg`}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-1"
          >
            <active.icon className="w-7 h-7 text-white opacity-90" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Advance & Credit Card Locker
            </h1>
          </motion.div>
          <p className="text-white/70 text-sm ml-10">
            Manage advances, loans & credit card records
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2.5 px-6 py-4 text-sm font-semibold transition-all duration-200 border-b-[3px] ${
                  activeTab === tab.id
                    ? "text-gray-900 border-current"
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                }`}
                style={activeTab === tab.id ? { borderColor: tab.accent, color: tab.accent } : {}}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t"
                    style={{ background: tab.accent }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "employee" && <EmployeeAdvanceTracker />}
            {activeTab === "client" && <ClientAdvanceTracker />}
            {activeTab === "credit" && <CreditCardTracker />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}