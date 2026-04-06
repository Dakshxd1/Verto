import React, { useState, useMemo } from "react";
import supabase from "../lib/supabaseClient";
import AgingReport from "./AgingReport";
import PaymentHistoryDrawer from "./PaymentHistoryDrawer";
import InvoiceDetailsDrawer from "./InvoiceDetailsDrawer";
import AddPaymentMadeModal from "./AddPaymentMadeModal";
import { exportToExcel } from "../utils/exportExcel";
import { motion, AnimatePresence } from "framer-motion";
import AddInvoiceModal from "./AddInvoiceModal";
import AddCNBadDebtModal from "./AddCNBadDebtModal";
import {
  Search,
  Calendar,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Edit3,
  History,
} from "lucide-react";
import Button from "./ui/button";
import Card from "./ui/Card";
import Badge from "./ui/Badge";

// Mock Data Generator
const generateData = (count = 10) => {
  const departments = ["Operations", "Sales", "Finance", "HR", "IT"];
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
  const entities = ["Verto India Pvt Ltd", "Verto Global LLC", "Verto UK Ltd"];

  return Array.from({ length: count }).map((_, i) => {
    const invValue = Math.floor(15000 + Math.random() * 50000);
    const vertoFee = Math.floor(invValue * 0.08);
    const received =
      Math.random() > 0.3
        ? Math.floor(invValue * (0.5 + Math.random() * 0.5))
        : 0;
    const notRecvd = invValue - received;
    const delayDays = notRecvd > 0 ? Math.floor(Math.random() * 45) : 0;

    const randomDate = new Date(
      2023,
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1
    );

    return {
      id: `INV-${2023000 + i}`,
      invDate: randomDate.toLocaleDateString("en-GB"),
      invDateObj: randomDate, // Store as Date object for filtering
      impactMonth:
        [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ][Math.floor(Math.random() * 12)] + " 2023",
      dept: departments[Math.floor(Math.random() * departments.length)],
      client: clients[Math.floor(Math.random() * clients.length)],
      invValue,
      vertoFee,
      notRecvd,
      delayDays,
      osDiff: Math.floor(Math.random() * 1000) - 200,
      cnBadDebt: Math.random() > 0.9 ? Math.floor(Math.random() * 5000) : 0,
      entity: entities[Math.floor(Math.random() * entities.length)],
      status:
        notRecvd === 0
          ? "paid"
          : delayDays > 30
          ? "overdue"
          : delayDays > 0
          ? "pending"
          : "fresh",
    };
  });
};

const Dashboard = ({
  refreshFlag,
  setShowPaymentModal,
  setShowBounceBackModal,
  setSelectedInvoice,
}) => {
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRangePreset, setDateRangePreset] = useState("12months");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data] = useState(() => generateData(12));
  const [dbData, setDbData] = useState([]);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [historyInvoice, setHistoryInvoice] = useState(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [detailsInvoice, setDetailsInvoice] = useState(null);
  const [showPaymentMadeModal, setShowPaymentMadeModal] = useState(false);
  const [paymentMadeInvoice, setPaymentMadeInvoice] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showCNBadDebtModal, setShowCNBadDebtModal] = useState(false);

  // Initialize date range to last 12 months on component mount
  React.useEffect(() => {
    const today = new Date();
    const twelveMonthsAgo = new Date(
      today.getFullYear(),
      today.getMonth() - 12,
      today.getDate()
    );
    setDateFrom(twelveMonthsAgo.toISOString().split("T")[0]);
    setDateTo(today.toISOString().split("T")[0]);
  }, []);

  // 🔥 Fetch invoices from Supabase (SAFE ADD)
  // 🔹 Fetch invoices from Supabase
  React.useEffect(() => {
    let channel;

    const fetchInvoices = async () => {
      console.log("🔥 FETCH RUNNING...");
      const { data, error } = await supabase
        .from("outstanding_invoice_view")
        .select("*")
        .order("invoice_date", { ascending: false });

      if (error) {
        console.error("Fetch error:", error);
        return;
      }
      console.log("🔥 FULL DB DATA:", data);
      console.log("🔥 FIRST ROW:", data?.[0]);

      if (error) {
        console.error("Fetch error:", error);
        return;
      }

      const formatted = data.map((row) => ({
        // 🔑 PRIMARY KEYS
        dbId: row.id,
        id: row.invoice_number,

        // 📅 DATES
        invDate: row.invoice_date,
        invDateObj: row.invoice_date ? new Date(row.invoice_date) : new Date(),
        impactMonth: row.impact_month,
        expected_collection_date: row.expected_collection_date,

        // 🏢 MASTER DATA
        dept: row.dept_name,
        department:
          row.dept_code === "OS" || row.dept_name === "Outsourcing"
            ? "OS"
            : "REC", // 🔥 REQUIRED FOR EDIT
        client: row.client_name,
        entity: row.entity_name,

        // 💰 FINANCIAL (REC + COMMON)
        invValue: Number(row.invoice_value || 0),
        vertoFee: Number(row.verto_fee || 0),
        gst: Number(row.gst || 0),
        tds: Number(row.tds || 0),
        notRecvd: Number(row.outstanding || 0),
        delayDays: Number(row.delay_days || 0),
        cnBadDebt: Number(row.total_cn || 0),
        osDiff: Number(row.os_diff || 0),

        // 🧾 OS DATA (🔥 THIS WAS MISSING BEFORE)
        employee_count: row.employee_count,
        gross_value: row.gross_value,
        net_in_hand: row.net_in_hand,
        co_pf: row.co_pf,
        co_esi: row.co_esi,
        lwf_tax: row.lwf_tax,
        pt_tax: row.pt_tax,
        other_ded: row.other_ded,
        ctc: row.ctc,

        // 🚦 STATUS LOGIC
        status:
          row.outstanding === 0
            ? "paid"
            : row.delay_days > 30
            ? "overdue"
            : row.delay_days > 0
            ? "pending"
            : "fresh",
      }));
      console.log("🔥 FORMATTED DATA:", formatted);

      setDbData(formatted);
    };

    // 🔥 Initial Fetch
    fetchInvoices();

    // 🔥 Make global refresh available
    window.refreshDashboard = fetchInvoices;

    // 🔥 Realtime listener
    channel = supabase
      .channel("realtime-all")

      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments_received" },
        () => fetchInvoices()
      )

      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bounce_back" },
        () => fetchInvoices()
      )

      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bank_entries" },
        () => fetchInvoices()
      )

      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "software_entries" },
        () => fetchInvoices()
      )

      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        () => fetchInvoices()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "credit_note_bad_debt" },
        () => fetchInvoices()
      )

      .subscribe();

    // 🔥 Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [refreshFlag]); // 🔥 THIS TRIGGERS REFRESH
  // Filter states
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [minInvoiceValue, setMinInvoiceValue] = useState("");
  const [maxInvoiceValue, setMaxInvoiceValue] = useState("");

  // Get unique values for filters
  const source = dbData.length ? dbData : data;
  const departments = [...new Set(source.map((d) => d.dept))];
  const clients = [...new Set(source.map((d) => d.client))];
  const entities = [...new Set(source.map((d) => d.entity))];
  const statuses = ["paid", "pending", "overdue", "fresh"];

  const filteredData = useMemo(() => {
    let sourceData = dbData.length > 0 ? dbData : data;
    let filtered = sourceData.filter((row) => {
      // Search filter
      const matchesSearch =
        (row.client || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.dept || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.id || "").toLowerCase().includes(searchTerm.toLowerCase());

      // Date range filter - using the stored Date object
      const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
      const to = dateTo ? new Date(dateTo + "T23:59:59") : null;

      const matchesDateFrom = !from || row.invDateObj >= from;
      const matchesDateTo = !to || row.invDateObj <= to;
      // Department filter
      const matchesDept =
        selectedDepartments.length === 0 ||
        selectedDepartments.includes(row.dept);

      // Client filter
      const matchesClient =
        selectedClients.length === 0 || selectedClients.includes(row.client);

      // Entity filter
      const matchesEntity =
        selectedEntities.length === 0 || selectedEntities.includes(row.entity);

      // Status filter
      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(row.status);

      // Invoice value range filter
      const matchesMinValue =
        !minInvoiceValue || row.invValue >= Number(minInvoiceValue);
      const matchesMaxValue =
        !maxInvoiceValue || row.invValue <= Number(maxInvoiceValue);

      return (
        matchesSearch &&
        matchesDateFrom &&
        matchesDateTo &&
        matchesDept &&
        matchesClient &&
        matchesEntity &&
        matchesStatus &&
        matchesMinValue &&
        matchesMaxValue
      );
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key] ?? 0;
        let bVal = b[sortConfig.key] ?? 0;

        // Handle date sorting
        if (sortConfig.key === "invDate") {
          aVal = a.invDateObj;
          bVal = b.invDateObj;
        }

        // Handle numeric sorting
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }

        // Handle string sorting
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortConfig.direction === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        // Handle date sorting
        if (aVal instanceof Date && bVal instanceof Date) {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }

        return 0;
      });
    }

    return filtered;
  }, [
    data,
    dbData,
    searchTerm,
    dateFrom,
    dateTo,
    selectedDepartments,
    selectedClients,
    selectedEntities,
    selectedStatuses,
    minInvoiceValue,
    maxInvoiceValue,
    sortConfig,
  ]);

  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, row) => ({
        invValue: acc.invValue + row.invValue,
        vertoFee: acc.vertoFee + row.vertoFee,
        notRecvd: acc.notRecvd + row.notRecvd,
        cnBadDebt: acc.cnBadDebt + row.cnBadDebt,
      }),
      { invValue: 0, vertoFee: 0, notRecvd: 0, cnBadDebt: 0 }
    );
  }, [filteredData]);

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronDown className="w-3 h-3 opacity-30" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined || isNaN(val)) return "0";
    return Number(val).toLocaleString("en-IN");
  };
  const formatDateDisplay = () => {
    if (dateFrom && dateTo) {
      return `${new Date(dateFrom).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      })} - ${new Date(dateTo).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`;
    }
    return "Select Date Range";
  };

  const handleDateRangePreset = (preset) => {
    const today = new Date();
    let fromDate;

    setDateRangePreset(preset);

    switch (preset) {
      case "6months":
        fromDate = new Date(
          today.getFullYear(),
          today.getMonth() - 6,
          today.getDate()
        );
        break;
      case "12months":
        fromDate = new Date(
          today.getFullYear(),
          today.getMonth() - 12,
          today.getDate()
        );
        break;
      case "2years":
        fromDate = new Date(
          today.getFullYear() - 2,
          today.getMonth(),
          today.getDate()
        );
        break;
      case "manual":
        // Don't auto-set dates for manual entry
        return;
      default:
        fromDate = new Date(
          today.getFullYear(),
          today.getMonth() - 12,
          today.getDate()
        );
    }

    setDateFrom(fromDate.toISOString().split("T")[0]);
    setDateTo(today.toISOString().split("T")[0]);
  };

  const toggleFilter = (array, setArray, value) => {
    if (array.includes(value)) {
      setArray(array.filter((item) => item !== value));
    } else {
      setArray([...array, value]);
    }
  };

  const clearAllFilters = () => {
    setSelectedDepartments([]);
    setSelectedClients([]);
    setSelectedEntities([]);
    setSelectedStatuses([]);
    setMinInvoiceValue("");
    setMaxInvoiceValue("");
    setDateFrom("");
    setDateTo("");
    setSearchTerm("");
  };

  const activeFiltersCount =
    selectedDepartments.length +
    selectedClients.length +
    selectedEntities.length +
    selectedStatuses.length +
    (minInvoiceValue ? 1 : 0) +
    (maxInvoiceValue ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  // 🔥 ADD PAYMENT FUNCTION
  // ✅ GLOBAL BUTTON HANDLERS (FIX: buttons will work)
  const handleView = (type, row) => {
    console.log("VIEW:", type, row);
    alert(`Viewing ${type} for ${row.id}`);
  };

  const handleEdit = (type, row) => {
    console.log("🔥 FULL ROW DATA:", row);

    setSelectedInvoiceData(row);

    if (type === "CN") {
      setShowCNBadDebtModal(true);
    } else {
      setShowInvoiceModal(true);
    }
  };

  const addPayment = async (invoice, amount) => {
    const { error } = await supabase.from("payments_received").insert([
      {
        invoice_id: invoice.dbId,
        amount_received: amount,
        payment_date: new Date().toISOString().split("T")[0],
        payment_ref: "UI-" + Date.now(),
      },
    ]);

    if (error) {
      console.error("Payment error:", error);
    } else {
      console.log("✅ Payment added");

      // 🔄 Refresh data
      const { data, error: fetchError } = await supabase
        .from("outstanding_invoice_view")
        .select("*")
        .order("invoice_date", { ascending: false });

      if (!fetchError) {
        const formatted = data.map((row) => ({
          dbId: row.id,
          id: row.invoice_number,
          invDate: row.invoice_date,
          invDateObj: new Date(row.invoice_date),
          impactMonth: row.impact_month,
          dept: row.dept_name,
          client: row.client_name,
          invValue: row.invoice_value,
          vertoFee: 0,
          notRecvd: row.outstanding,
          delayDays: row.delay_days,
          ledger_name: row.ledger_name,
          osDiff:
            row.dept_name === "Outsourcing"
              ? row.invoice_value - row.receivable_amount
              : 0,
          cnBadDebt: Number(row.total_cn || 0),
          bounce: Number(row.total_bounce || 0), // ✅ ADD THIS
          osDiff: Number(row.os_diff || 0),
          entity: row.entity_name,
          status:
            row.outstanding === 0
              ? "paid"
              : row.delay_days > 30
              ? "overdue"
              : row.delay_days > 0
              ? "pending"
              : "fresh",
        }));

        setDbData(formatted);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <Card.Content className="pt-6">
            <p className="text-xs text-gray-600 uppercase tracking-wider">
              Total Invoiced
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(totals.invValue)}
            </p>
            <div className="flex items-center mt-2 text-xs text-emerald-600">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              <span>+12% from last period</span>
            </div>
          </Card.Content>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <Card.Content className="pt-6">
            <p className="text-xs text-gray-600 uppercase tracking-wider">
              Verto Fees
            </p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {formatCurrency(totals.vertoFee)}
            </p>
            <div className="flex items-center mt-2 text-xs text-gray-500">
              <span>
                {totals.invValue
                  ? ((totals.vertoFee / totals.invValue) * 100).toFixed(1)
                  : 0}
                % avg margin
              </span>
            </div>
          </Card.Content>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-white border-rose-100">
          <Card.Content className="pt-6">
            <p className="text-xs text-gray-600 uppercase tracking-wider">
              Outstanding
            </p>
            <p className="text-2xl font-bold text-rose-600 mt-1">
              {formatCurrency(totals.notRecvd)}
            </p>
            <div className="flex items-center mt-2 text-xs text-rose-600">
              <ArrowDownLeft className="w-3 h-3 mr-1" />
              <span>
                {totals.invValue
                  ? ((totals.notRecvd / totals.invValue) * 100).toFixed(1)
                  : 0}
                % of total
              </span>
            </div>
          </Card.Content>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <Card.Content className="pt-6">
            <p className="text-xs text-gray-600 uppercase tracking-wider">
              CN / Bad Debt
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {formatCurrency(totals.cnBadDebt)}
            </p>
            <div className="flex items-center mt-2 text-xs text-gray-500">
              <span>
                {filteredData.filter((d) => d.cnBadDebt > 0).length} invoices
                affected
              </span>
            </div>
          </Card.Content>
        </Card>
      </div>
      <AgingReport />
      {/* ✅ STEP 5 — RENDER DRAWER HERE */}
      <PaymentHistoryDrawer
        invoice={historyInvoice}
        isOpen={showPaymentHistory}
        onClose={() => setShowPaymentHistory(false)}
      />
      <InvoiceDetailsDrawer
        invoice={detailsInvoice}
        isOpen={showInvoiceDetails}
        onClose={() => setShowInvoiceDetails(false)}
      />
      <AddPaymentMadeModal
        isOpen={showPaymentMadeModal}
        onClose={() => setShowPaymentMadeModal(false)}
        invoice={paymentMadeInvoice}
        onSaved={() => window.refreshDashboard?.()}
      />
      <AddCNBadDebtModal
        isOpen={showCNBadDebtModal}
        onClose={() => setShowCNBadDebtModal(false)}
        editData={selectedInvoiceData}
        invoices={dbData.map((d) => d.id)}
        invoicesData={dbData} // ✅ IMPORTANT
      />
      <AddInvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false);
          setSelectedInvoiceData(null);
        }}
        selectedInvoice={selectedInvoiceData}
      />

      {/* Filter Bar */}
      <Card className="p-4 bg-white border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Client, Dept, or Invoice ID..."
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`flex items-center space-x-2 bg-white border rounded-xl px-3 py-2.5 text-sm transition-all ${
                  dateFrom || dateTo
                    ? "border-emerald-500 text-emerald-600"
                    : "border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span className="min-w-[140px] text-left">
                  {formatDateDisplay()}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    showDatePicker ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Date Picker Dropdown */}
              <AnimatePresence>
                {showDatePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full mt-2 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 min-w-[320px]"
                  >
                    <div className="space-y-3">
                      {/* Quick Presets */}
                      <div>
                        <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">
                          Quick Select
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleDateRangePreset("6months")}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              dateRangePreset === "6months"
                                ? "bg-emerald-500 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            Last 6 Months
                          </button>
                          <button
                            onClick={() => handleDateRangePreset("12months")}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              dateRangePreset === "12months"
                                ? "bg-emerald-500 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            Last 12 Months
                          </button>
                          <button
                            onClick={() => handleDateRangePreset("2years")}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              dateRangePreset === "2years"
                                ? "bg-emerald-500 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            Last 2 Years
                          </button>
                        </div>
                      </div>

                      {/* Manual Date Inputs */}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-gray-600 uppercase tracking-wider mb-1.5 block">
                              From Date
                            </label>
                            <input
                              type="date"
                              value={dateFrom}
                              onChange={(e) => {
                                setDateFrom(e.target.value);
                                setDateRangePreset("manual");
                              }}
                              className="w-full bg-gray-50 border border-gray-300 text-gray-900 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 uppercase tracking-wider mb-1.5 block">
                              To Date
                            </label>
                            <input
                              type="date"
                              value={dateTo}
                              onChange={(e) => {
                                setDateTo(e.target.value);
                                setDateRangePreset("manual");
                              }}
                              className="w-full bg-gray-50 border border-gray-300 text-gray-900 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setDateFrom("");
                            setDateTo("");
                            setDateRangePreset("12months");
                          }}
                          className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => setShowDatePicker(false)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-lg transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>

          <Button
            onClick={() => exportToExcel(filteredData)}
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </Button>
        </div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                    <Filter className="w-4 h-4 mr-2 text-emerald-500" />
                    Advanced Filters
                  </h3>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-xs text-gray-600 hover:text-gray-900"
                    >
                      Clear All ({activeFiltersCount})
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Department Filter */}
                  <div>
                    <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">
                      Department
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {departments.map((dept) => (
                        <button
                          key={dept}
                          onClick={() =>
                            toggleFilter(
                              selectedDepartments,
                              setSelectedDepartments,
                              dept
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedDepartments.includes(dept)
                              ? "bg-emerald-500 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Client Filter */}
                  <div>
                    <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">
                      Client
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {clients.map((client) => (
                        <button
                          key={client}
                          onClick={() =>
                            toggleFilter(
                              selectedClients,
                              setSelectedClients,
                              client
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedClients.includes(client)
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {client}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Entity Filter */}
                  <div>
                    <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">
                      Entity
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {entities.map((entity) => (
                        <button
                          key={entity}
                          onClick={() =>
                            toggleFilter(
                              selectedEntities,
                              setSelectedEntities,
                              entity
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedEntities.includes(entity)
                              ? "bg-purple-500 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {entity.split(" ")[1]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">
                      Status
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {statuses.map((status) => (
                        <button
                          key={status}
                          onClick={() =>
                            toggleFilter(
                              selectedStatuses,
                              setSelectedStatuses,
                              status
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                            selectedStatuses.includes(status)
                              ? "bg-amber-500 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Invoice Value Range */}
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">
                      Invoice Value Range
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        value={minInvoiceValue}
                        onChange={(e) => setMinInvoiceValue(e.target.value)}
                        placeholder="Min (₹)"
                        className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="number"
                        value={maxInvoiceValue}
                        onChange={(e) => setMaxInvoiceValue(e.target.value)}
                        placeholder="Max (₹)"
                        className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-100 text-gray-700 text-xs uppercase tracking-wider border-b-2 border-gray-300">
                <th
                  className="p-4 font-semibold cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort("invDate")}
                >
                  <div className="flex items-center justify-between">
                    <span>Invoice Date</span>
                    <SortIcon columnKey="invDate" />
                  </div>
                </th>
                <th
                  className="p-4 font-semibold cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort("impactMonth")}
                >
                  <div className="flex items-center justify-between">
                    <span>Impact Month</span>
                    <SortIcon columnKey="impactMonth" />
                  </div>
                </th>
                <th
                  className="p-4 font-semibold cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort("dept")}
                >
                  <div className="flex items-center justify-between">
                    <span>Department</span>
                    <SortIcon columnKey="dept" />
                  </div>
                </th>
                <th
                  className="p-4 font-semibold cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort("client")}
                >
                  <div className="flex items-center justify-between">
                    <span>Client Name</span>
                    <SortIcon columnKey="client" />
                  </div>
                </th>
                <th
                  className="p-4 font-semibold text-right cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort("invValue")}
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>Invoice Value</span>
                    <SortIcon columnKey="invValue" />
                  </div>
                </th>
                <th
                  className="p-4 font-semibold text-right cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort("vertoFee")}
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>Verto Fee</span>
                    <SortIcon columnKey="vertoFee" />
                  </div>
                </th>
                <th
                  className="p-4 font-semibold text-right cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort("notRecvd")}
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>Not Recvd Amt</span>
                    <SortIcon columnKey="notRecvd" />
                  </div>
                </th>
                <th
                  className="p-4 font-semibold text-center cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort("delayDays")}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>Delay Days</span>
                    <SortIcon columnKey="delayDays" />
                  </div>
                </th>
                <th
                  className="p-4 font-semibold text-right cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort("osDiff")}
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>OS Amt Difference</span>
                    <SortIcon columnKey="osDiff" />
                  </div>
                </th>
                <th
                  className="p-4 font-semibold text-right cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort("cnBadDebt")}
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>CN/Bad Debt</span>
                    <SortIcon columnKey="cnBadDebt" />
                  </div>
                </th>
                <th
                  className="p-4 font-semibold cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort("entity")}
                >
                  <div className="flex items-center justify-between">
                    <span>Invoice Entity</span>
                    <SortIcon columnKey="entity" />
                  </div>
                </th>
                <th className="p-4 font-semibold text-center">GST</th>
                <th className="p-4 text-center">Type</th>
                <th className="p-4 font-semibold text-center">TDS</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700 divide-y divide-gray-400">
              {filteredData.map((row, index) => (
                <React.Fragment key={row.id}>
                  <motion.tr
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer group ${
                      expandedRow === row.id ? "bg-blue-50" : ""
                    }`}
                    onClick={(e) => {
                      if (e.target.closest("button")) return; // ✅ allow button clicks
                      toggleRow(row.id);
                    }}
                  >
                    <td className="p-4 text-gray-600">{row.invDate}</td>
                    <td className="p-4 text-gray-700">{row.impactMonth}</td>
                    <td className="p-4">
                      <Badge
                        className={`text-xs ${
                          row.dept === "Outsourcing"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {row.dept}
                      </Badge>
                    </td>
                    <td className="p-4 font-medium text-gray-900">
                      {row.client}
                    </td>
                    <td className="p-4 text-right font-mono text-gray-900">
                      {formatCurrency(row.invValue ?? 0)}
                    </td>
                    <td className="p-4 text-right font-mono text-gray-900">
                      {formatCurrency(row.vertoFee)}
                    </td>
                    <td className="p-4 text-right font-mono text-gray-900">
                      {formatCurrency(row.notRecvd)}
                    </td>
                    <td className="p-4 text-center">
                      <Badge
                        variant={
                          row.delayDays > 30
                            ? "destructive"
                            : row.delayDays > 0
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {row.delayDays}d
                      </Badge>
                    </td>
                    <td className="p-4 text-right font-mono text-gray-900">
                      {row.osDiff >= 0 ? "+" : ""}
                      {formatCurrency(row.osDiff)}
                    </td>
                    <td className="p-4 text-right font-mono text-gray-900">
                      {row.cnBadDebt > 0 ? (
                        formatCurrency(row.cnBadDebt)
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-gray-600">{row.entity}</td>
                    {/* GST */}
                    <td className="p-4 text-center">
                      {row.gstMismatch ? (
                        <span className="text-red-600 font-bold">🔴</span>
                      ) : (
                        <span className="text-green-600">₹ {row.gst ?? 0}</span>
                      )}
                    </td>

                    {/* TYPE */}
                    <td className="p-4 text-center">
                      {row.dept === "Outsourcing" ? (
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                          OS
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                          Normal
                        </span>
                      )}
                    </td>

                    {/* TDS */}
                    <td className="p-4 text-center">
                      {row.tdsMismatch ? (
                        <span className="text-red-600 font-bold">🔴</span>
                      ) : (
                        <span className="text-green-600">₹ {row.tds ?? 0}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {row.gstMismatch || row.tdsMismatch ? (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                          Mismatch
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        {expandedRow === row.id ? (
                          <ChevronUp className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                        )}
                      </button>
                    </td>
                  </motion.tr>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedRow === row.id && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <td
                          colSpan="15"
                          className="p-0 border-b border-gray-200"
                        >
                          <motion.div
                            initial={{ y: -10 }}
                            animate={{ y: 0 }}
                            className="p-6 bg-gray-50"
                          >
                            <div className="mb-4">
                              <h3 className="text-blue-600 font-semibold flex items-center text-sm uppercase tracking-wider">
                                <FileText className="w-4 h-4 mr-2" />
                                Invoice Details: {row.id}
                              </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                              {/* Add Invoice Details */}
                              <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <p className="text-xs text-gray-600 uppercase mb-3 font-semibold">
                                  Invoice Details
                                </p>
                                <div className="space-y-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDetailsInvoice(row);
                                      setShowInvoiceDetails(true);
                                    }}
                                    className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-sm font-medium"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedInvoiceData(row);
                                      setShowInvoiceModal(true);
                                    }}
                                    className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>

                              {/* Add Payment Received */}
                              <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <p className="text-xs text-gray-600 uppercase mb-3 font-semibold">
                                  Payment Received
                                </p>
                                <div className="space-y-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setHistoryInvoice(row);
                                      setShowPaymentHistory(true);
                                    }}
                                    className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-sm font-medium"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedInvoice(row);
                                      setShowPaymentModal(true);
                                    }}
                                    className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>

                              {/* Add Payment Made */}
                              <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <p className="text-xs text-gray-600 uppercase mb-3 font-semibold">
                                  Payment Made
                                </p>
                                <div className="space-y-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleView("Payment Made", row);
                                    }}
                                    className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-sm font-medium"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPaymentMadeInvoice(row);
                                      setShowPaymentMadeModal(true);
                                    }}
                                    className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>

                              {/* Add Bounce Back */}
                              <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <p className="text-xs text-gray-600 uppercase mb-3 font-semibold">
                                  Bounce Back
                                </p>
                                <div className="space-y-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleView("Bounce Back", row);
                                    }}
                                    className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-sm font-medium"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowBounceBackModal(true);
                                    }}
                                    className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>

                              {/* Add CN / Bad Debt */}
                              <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <p className="text-xs text-gray-600 uppercase mb-3 font-semibold">
                                  CN / Bad Debt
                                </p>
                                <div className="space-y-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleView("CN / Bad Debt", row);
                                    }}
                                    className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-sm font-medium"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedInvoiceData(row);
                                      setShowCNBadDebtModal(true);
                                    }}
                                    className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-semibold text-gray-900 border-t-2 border-gray-300">
              <tr className="align-bottom">
                <td
                  colSpan="4"
                  className="p-4 text-right text-gray-900 text-base align-bottom"
                >
                  TOTALS
                </td>
                <td className="p-4 text-right font-mono text-gray-900 text-base align-bottom">
                  {formatCurrency(totals.invValue)}
                </td>
                <td className="p-4 text-right font-mono text-gray-900 text-base align-bottom">
                  {formatCurrency(totals.vertoFee)}
                </td>
                <td className="p-4 text-right font-mono text-gray-900 text-base align-bottom">
                  {formatCurrency(totals.notRecvd)}
                </td>
                <td className="p-4 text-center text-gray-400 align-bottom">
                  -
                </td>
                <td className="p-4 text-center text-gray-400 align-bottom">
                  -
                </td>
                <td className="p-4 text-right font-mono text-gray-900 text-base align-bottom">
                  {formatCurrency(totals.cnBadDebt)}
                </td>
                <td className="p-4 text-center text-gray-400 align-bottom">
                  -
                </td>
                <td className="p-4 align-bottom"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No records found matching your search criteria</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
