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
import BounceHistoryDrawer from "./BounceHistoryDrawer";
import CNHistoryDrawer from "./CNHistoryDrawer";
import PaymentMadeHistoryDrawer from "./PaymentHistoryDrawer";
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
  Eye,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import Button from "./ui/button";
import Card from "./ui/Card";
import Badge from "./ui/Badge";

// ─── Injected styles ────────────────────────────────────────────────────────
const dashboardStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne+Mono&family=Space+Grotesk:wght@400;500;600;700&display=swap');

  .dash-root {
    font-family: 'DM Sans', sans-serif;
    --c-bg: #f6f7f9;
    --c-surface: #ffffff;
    --c-border: #e8eaed;
    --c-border-strong: #d1d5db;
    --c-text-primary: #111827;
    --c-text-secondary: #6b7280;
    --c-text-muted: #9ca3af;
    --c-emerald: #059669;
    --c-emerald-light: #d1fae5;
    --c-emerald-mid: #a7f3d0;
    --c-blue: #2563eb;
    --c-blue-light: #dbeafe;
    --c-rose: #e11d48;
    --c-rose-light: #ffe4e6;
    --c-amber: #d97706;
    --c-amber-light: #fef3c7;
    --c-purple: #7c3aed;
    --c-purple-light: #ede9fe;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 20px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04);
    --shadow-lg: 0 12px 32px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04);
  }

  /* ── Stat Cards ── */
  .stat-card {
    background: var(--c-surface);
    border-radius: var(--radius-xl);
    border: 1px solid var(--c-border);
    padding: 24px;
    box-shadow: var(--shadow-sm);
    transition: box-shadow 0.2s ease, transform 0.2s ease;
    position: relative;
    overflow: hidden;
  }
  .stat-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }
  .stat-card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
  .stat-card.emerald::before { background: linear-gradient(90deg, #059669, #34d399); }
  .stat-card.blue::before    { background: linear-gradient(90deg, #2563eb, #60a5fa); }
  .stat-card.rose::before    { background: linear-gradient(90deg, #e11d48, #fb7185); }
  .stat-card.amber::before   { background: linear-gradient(90deg, #d97706, #fbbf24); }

  .stat-icon {
    width: 40px; height: 40px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 16px;
  }
  .stat-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--c-text-secondary);
    margin-bottom: 6px;
  }

  /* ✅ UPDATED — larger, bolder stat values using Space Grotesk */
  .stat-value {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 32px;
    font-weight: 700;
    color: var(--c-text-primary);
    line-height: 1;
    margin-bottom: 10px;
    letter-spacing: -0.02em;
  }

  .stat-meta {
    display: flex; align-items: center; gap: 5px;
    font-size: 12px; font-weight: 500;
  }

  /* ── Filter Card ── */
  .filter-card {
    background: var(--c-surface);
    border-radius: var(--radius-xl);
    border: 1px solid var(--c-border);
    padding: 18px 20px;
    box-shadow: var(--shadow-sm);
  }

  /* ── Search Input ── */
  .search-wrap {
    position: relative; flex: 1; max-width: 400px;
  }
  .search-input {
    width: 100%;
    background: #f9fafb;
    border: 1.5px solid var(--c-border);
    border-radius: var(--radius-md);
    padding: 9px 14px 9px 38px;
    font-size: 13.5px;
    font-family: 'DM Sans', sans-serif;
    color: var(--c-text-primary);
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
  }
  .search-input::placeholder { color: var(--c-text-muted); }
  .search-input:focus {
    border-color: var(--c-emerald);
    box-shadow: 0 0 0 3px rgba(5,150,105,0.10);
    background: #fff;
  }
  .search-icon {
    position: absolute; left: 11px; top: 50%;
    transform: translateY(-50%);
    color: var(--c-text-muted); pointer-events: none;
  }

  /* ── Date Button ── */
  .date-btn {
    display: flex; align-items: center; gap: 7px;
    background: #f9fafb;
    border: 1.5px solid var(--c-border);
    border-radius: var(--radius-md);
    padding: 9px 13px;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    color: var(--c-text-secondary);
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
    white-space: nowrap;
  }
  .date-btn.active, .date-btn:hover {
    border-color: var(--c-emerald);
    color: var(--c-emerald);
    background: #fff;
  }

  /* ── Date Picker Dropdown ── */
  .date-dropdown {
    position: absolute; top: calc(100% + 8px); left: 0; z-index: 100;
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    padding: 20px;
    min-width: 280px;
  }
  .date-input {
    width: 100%;
    background: #f9fafb;
    border: 1.5px solid var(--c-border);
    border-radius: var(--radius-sm);
    padding: 8px 11px;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    color: var(--c-text-primary);
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .date-input:focus { border-color: var(--c-emerald); background: #fff; }
  .input-label {
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--c-text-muted);
    margin-bottom: 6px; display: block;
  }
  .divider { border: none; border-top: 1px solid var(--c-border); margin: 14px 0; }

  /* ── Filter Chips ── */
  .chip-group { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px; font-weight: 500;
    cursor: pointer;
    border: 1.5px solid transparent;
    transition: all 0.15s;
    background: #f3f4f6; color: #4b5563;
    font-family: 'DM Sans', sans-serif;
  }
  .chip:hover { background: #e5e7eb; }
  .chip.active-emerald {
    background: var(--c-emerald-light);
    color: var(--c-emerald);
    border-color: var(--c-emerald-mid);
  }
  .chip.active-blue {
    background: var(--c-blue-light);
    color: var(--c-blue);
    border-color: #93c5fd;
  }
  .chip.active-purple {
    background: var(--c-purple-light);
    color: var(--c-purple);
    border-color: #c4b5fd;
  }
  .chip.active-amber {
    background: var(--c-amber-light);
    color: var(--c-amber);
    border-color: #fcd34d;
  }

  /* ── Filter Panel ── */
  .filter-panel {
    margin-top: 16px;
    padding-top: 18px;
    border-top: 1px solid var(--c-border);
  }
  .filter-panel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 20px;
  }

  /* ── Table Card ── */
  .table-card {
    background: var(--c-surface);
    border-radius: var(--radius-xl);
    border: 1px solid var(--c-border);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }
  .table-scroll {
    overflow-x: auto;
    max-height: 600px;
    overflow-y: auto;
  }
  .table-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
  .table-scroll::-webkit-scrollbar-track { background: transparent; }
  .table-scroll::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 99px;
  }
  .table-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }

  table.dash-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  table.dash-table thead {
    position: sticky; top: 0; z-index: 10;
  }
  table.dash-table thead tr {
    background: #f8f9fb;
    border-bottom: 2px solid var(--c-border);
  }
  table.dash-table th {
    padding: 13px 16px;
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--c-text-secondary);
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    transition: background 0.12s, color 0.12s;
  }
  table.dash-table th:hover {
    background: #f0f2f5;
    color: var(--c-text-primary);
  }
  table.dash-table tbody tr {
    border-bottom: 1px solid #f0f2f5;
    transition: background 0.1s;
    cursor: pointer;
  }
  table.dash-table tbody tr:hover { background: #f8fffe; }
  table.dash-table tbody tr.row-expanded { background: #f0fdf8; }
  table.dash-table tbody tr:last-child { border-bottom: none; }
  table.dash-table td {
    padding: 13px 16px;
    color: var(--c-text-primary);
    white-space: nowrap;
  }

  /* ✅ UPDATED — table numbers use Space Grotesk for readability */
  table.dash-table td.mono {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 13px;
    font-weight: 500;
    text-align: right;
  }
  table.dash-table td.center { text-align: center; }
  table.dash-table tfoot tr {
    background: #f8f9fb;
    border-top: 2px solid var(--c-border);
  }
  table.dash-table tfoot td {
    padding: 14px 16px;
    font-weight: 700;
    font-size: 13.5px;
    color: var(--c-text-primary);
  }
  table.dash-table tfoot td.mono {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 14px;
    font-weight: 700;
    text-align: right;
  }

  /* ── Pill Badges ── */
  .status-pill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .status-pill.paid    { background: var(--c-emerald-light); color: var(--c-emerald); }
  .status-pill.pending { background: #fef3c7; color: #b45309; }
  .status-pill.overdue { background: var(--c-rose-light); color: var(--c-rose); }
  .status-pill.fresh   { background: var(--c-blue-light); color: var(--c-blue); }
  .status-pill.ok      { background: var(--c-emerald-light); color: var(--c-emerald); }
  .status-pill.mismatch { background: var(--c-rose-light); color: var(--c-rose); }

  .delay-pill {
    display: inline-block;
    padding: 2px 9px;
    border-radius: 20px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 12px; font-weight: 500;
  }
  .delay-pill.low  { background: #f0fdf4; color: #16a34a; }
  .delay-pill.med  { background: #fef3c7; color: #b45309; }
  .delay-pill.high { background: var(--c-rose-light); color: var(--c-rose); }

  .dept-pill {
    display: inline-block;
    padding: 3px 10px; border-radius: 20px;
    font-size: 11.5px; font-weight: 600;
  }
  .dept-pill.os     { background: var(--c-purple-light); color: var(--c-purple); }
  .dept-pill.normal { background: var(--c-blue-light); color: var(--c-blue); }

  .type-pill {
    display: inline-block;
    padding: 2px 9px; border-radius: 20px;
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.04em;
  }
  .type-pill.os     { background: var(--c-purple-light); color: var(--c-purple); }
  .type-pill.normal { background: #f3f4f6; color: #6b7280; }

  /* ── Expanded Row Panel ── */
  .expand-panel {
    padding: 20px 24px;
    background: #f8fffe;
    border-top: 1px solid var(--c-emerald-mid);
  }
  .expand-title {
    font-size: 11.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--c-emerald); margin-bottom: 14px;
    display: flex; align-items: center; gap: 6px;
  }
  .expand-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
  }
  .action-card {
    background: #fff;
    border: 1px solid var(--c-border);
    border-radius: var(--radius-lg);
    padding: 16px;
    transition: box-shadow 0.15s;
  }
  .action-card:hover { box-shadow: var(--shadow-md); }
  .action-card-label {
    font-size: 10.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--c-text-muted); margin-bottom: 12px;
  }
  .action-btn {
    display: block; width: 100%;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    font-size: 12.5px; font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer; border: none;
    transition: all 0.15s; text-align: center;
    margin-bottom: 6px;
  }
  .action-btn:last-child { margin-bottom: 0; }
  .action-btn.view   { background: #eff6ff; color: var(--c-blue); }
  .action-btn.view:hover { background: #dbeafe; }
  .action-btn.edit   { background: #f9fafb; color: #374151; }
  .action-btn.edit:hover { background: #f3f4f6; }

  /* ── Filter Toggle ── */
  .filter-toggle-btn {
    position: relative;
    display: inline-flex; align-items: center; justify-content: center;
    width: 40px; height: 40px;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--c-border);
    background: #f9fafb;
    cursor: pointer;
    transition: all 0.15s;
    color: var(--c-text-secondary);
  }
  .filter-toggle-btn:hover {
    background: #fff;
    border-color: var(--c-emerald);
    color: var(--c-emerald);
  }
  .filter-toggle-btn.active {
    background: var(--c-emerald-light);
    border-color: var(--c-emerald);
    color: var(--c-emerald);
  }
  .filter-badge {
    position: absolute; top: -6px; right: -6px;
    width: 18px; height: 18px;
    background: var(--c-emerald);
    color: #fff; font-size: 10px; font-weight: 700;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }

  /* ── Export Button ── */
  .export-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 18px;
    background: var(--c-emerald);
    color: #fff;
    border-radius: var(--radius-md);
    font-size: 13.5px; font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    border: none; cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
    box-shadow: 0 2px 8px rgba(5,150,105,0.25);
  }
  .export-btn:hover {
    background: #047857;
    box-shadow: 0 4px 14px rgba(5,150,105,0.35);
    transform: translateY(-1px);
  }

  /* ── Empty State ── */
  .empty-state {
    padding: 64px 24px;
    text-align: center;
    color: var(--c-text-muted);
  }
  .empty-state svg {
    opacity: 0.2; margin: 0 auto 14px; display: block;
  }

  /* ── Small Buttons ── */
  .apply-btn {
    padding: 6px 14px;
    background: var(--c-emerald); color: #fff;
    border: none; border-radius: var(--radius-sm);
    font-size: 12px; font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer; transition: background 0.15s;
  }
  .apply-btn:hover { background: #047857; }
  .clear-link {
    background: none; border: none;
    font-size: 12px; font-weight: 500;
    color: var(--c-text-muted); cursor: pointer;
    padding: 0; font-family: 'DM Sans', sans-serif;
    transition: color 0.15s;
  }
  .clear-link:hover { color: var(--c-text-primary); }

  /* ── Range Inputs ── */
  .range-input {
    flex: 1;
    background: #f9fafb;
    border: 1.5px solid var(--c-border);
    border-radius: var(--radius-sm);
    padding: 8px 11px;
    font-size: 13px;
    font-family: 'Space Grotesk', sans-serif;
    color: var(--c-text-primary);
    outline: none; transition: border-color 0.15s;
  }
  .range-input:focus { border-color: var(--c-emerald); background: #fff; }
  .range-input::placeholder {
    font-family: 'DM Sans', sans-serif;
    color: var(--c-text-muted);
  }

  /* ── Icon Buttons ── */
  .icon-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; border-radius: 8px;
    background: transparent; border: none; cursor: pointer;
    transition: background 0.12s;
    color: var(--c-text-muted);
  }
  .icon-btn:hover { background: #eff6ff; color: var(--c-blue); }
  .icon-btn.expand:hover { background: #f3f4f6; color: var(--c-text-primary); }
`;

// ─── Mock Data Generator ─────────────────────────────────────────────────────
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
      invDateObj: randomDate,
      impactMonth:
        [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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

// ─── Dashboard Component ─────────────────────────────────────────────────────
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data] = useState(() => generateData(12));
  const [dbData, setDbData] = useState([]);
  const [banks, setBanks] = useState([]);
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
  const [showBounceHistory, setShowBounceHistory] = useState(false);
  const [showCNHistory, setShowCNHistory] = useState(false);

  // ✅ NEW — Payment Made History drawer state
  const [showPaymentMadeHistory, setShowPaymentMadeHistory] = useState(false);
  const [paymentMadeHistoryInvoice, setPaymentMadeHistoryInvoice] =
    useState(null);

  const fetchBanks = async () => {
    const { data, error } = await supabase.from("bank_master").select("*");
    if (!error) setBanks(data);
  };

  // Date range is empty on load — user selects manually

  // 🔥 Fetch invoices from Supabase
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

      const formatted = data.map((row) => {
        // ✅ Outstanding computed from SQL VIEW
        const outstanding = Number(row.outstanding ?? 0);

        // ✅ Receivable = invoice + billable expenses
        const receivableAmount = Number(
          row.receivable_amount ?? row.invoice_value ?? 0
        );

        return {
          // ── PRIMARY IDs ──
          dbId: row.id,
          id: row.invoice_number,
          invoice_number: row.invoice_number,

          // ── CLIENT / ENTITY ──
          client_name: row.client_name,
          dept_code: row.dept_code,
          entity_name: row.entity_name,
          ledger_name: row.ledger_name,

          // ── DATES ──
          invoice_date: row.invoice_date ?? "",
          expected_collection_date: row.expected_collection_date ?? "",
          impact_month: row.impact_month ?? "",

          invDate: row.invoice_date ?? "",
          invDateObj: row.invoice_date
            ? new Date(row.invoice_date)
            : new Date(),

          impactMonth: row.impact_month ?? "",

          // ── FINANCIAL ──
          pay: Number(row.pay ?? 0),
          pay_head: row.pay_head ?? "",

          verto_fee: Number(row.verto_fee ?? 0),
          gst: Number(row.gst ?? 0),
          tds: Number(row.tds ?? 0),

          invoice_value: Number(row.invoice_value ?? 0),

          receivable_amount: receivableAmount,

          // ── PAYMENT BREAKDOWN ──
          totalReceived: Number(row.total_paid ?? row.amount_received ?? 0),

          totalBillableExpenses: Number(row.total_billable_expenses ?? 0),

          bounce: Number(row.total_bounce ?? 0),

          cnBadDebt: Number(row.total_cn ?? 0),

          netReceived: Number(row.net_received ?? 0),

          // ── UI FIELDS ──
          dept: row.dept_name,
          client: row.client_name,
          entity: row.entity_name,

          invValue: Number(row.invoice_value ?? 0),

          vertoFee: Number(row.verto_fee ?? 0),

          // ✅ KEY FIX
          notRecvd: outstanding,

          delayDays: Number(row.delay_days ?? 0),

          // ── OS FIELDS ──
          employee_count: row.employee_count ?? 0,
          gross_value: row.gross_value ?? 0,
          net_in_hand: row.net_in_hand ?? 0,

          co_pf: row.co_pf ?? 0,
          co_esi: row.co_esi ?? 0,

          lwf_tax: row.lwf_tax ?? 0,
          pt_tax: row.pt_tax ?? 0,

          other_ded: row.other_ded ?? 0,
          ctc: row.ctc ?? 0,

          // ── STATUS ──
          status:
            outstanding <= 0
              ? "paid"
              : Number(row.delay_days ?? 0) > 30
              ? "overdue"
              : Number(row.delay_days ?? 0) > 0
              ? "pending"
              : "fresh",
        };
      });
      console.log("🔥 FORMATTED DATA:", formatted);

      setDbData(formatted);
    };

    // 🔥 Initial Fetch
    fetchInvoices();
    fetchBanks();

    // 🔥 Make global refresh available
    window.refreshDashboard = fetchInvoices;
    window.refreshBanks = fetchBanks;

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
  }, [refreshFlag]);

  // No filters auto-selected on load — user picks manually
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
  const entities = [...new Set(source.map((d) => d.entity).filter(Boolean))];
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
      })} – ${new Date(dateTo).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`;
    }
    return "Select Date Range";
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

  const handleEdit = async (type, row) => {
    console.log("🔥 CLICKED ROW:", row);

    // 🔥 FETCH FULL DATA FROM invoice_finance_view
    const { data, error } = await supabase
      .from("invoice_finance_view")
      .select("*")
      .eq("id", row.dbId)
      .single();

    if (error) {
      console.error("❌ Fetch error:", error);
      alert("Failed to fetch invoice details");
      return;
    }

    console.log("🔥 FULL EDIT DATA:", data);

    setSelectedInvoiceData({
      ...data,
      dbId: data.id,
    });

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
          bounce: Number(row.total_bounce || 0),
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

  const delayClass = (d) => (d > 30 ? "high" : d > 0 ? "med" : "low");

  return (
    <div className="dash-root" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{dashboardStyles}</style>

      {/* ── Header Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        {/* Total Invoiced */}
        <motion.div
          className="stat-card emerald"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <div className="stat-icon" style={{ background: "#d1fae5" }}>
            <FileText size={18} color="#059669" />
          </div>
          <div className="stat-label">Total Invoiced</div>
          <div className="stat-value">
            ₹{formatCurrency(totals.invValue)}
          </div>
          <div className="stat-meta" style={{ color: "#059669" }}>
            <ArrowUpRight size={13} />
            <span>+12% from last period</span>
          </div>
        </motion.div>

        {/* Verto Fees */}
        <motion.div
          className="stat-card blue"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <div className="stat-icon" style={{ background: "#dbeafe" }}>
            <TrendingUp size={18} color="#2563eb" />
          </div>
          <div className="stat-label">Verto Fees</div>
          <div className="stat-value" style={{ color: "#059669" }}>
            ₹{formatCurrency(totals.vertoFee)}
          </div>
          <div className="stat-meta" style={{ color: "#6b7280" }}>
            <span>
              {totals.invValue
                ? ((totals.vertoFee / totals.invValue) * 100).toFixed(1)
                : 0}
              % avg margin
            </span>
          </div>
        </motion.div>

        {/* Outstanding */}
        <motion.div
          className="stat-card rose"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <div className="stat-icon" style={{ background: "#ffe4e6" }}>
            <AlertCircle size={18} color="#e11d48" />
          </div>
          <div className="stat-label">Outstanding</div>
          <div className="stat-value" style={{ color: "#e11d48" }}>
            ₹{formatCurrency(totals.notRecvd)}
          </div>
          <div className="stat-meta" style={{ color: "#e11d48" }}>
            <ArrowDownLeft size={13} />
            <span>
              {totals.invValue
                ? ((totals.notRecvd / totals.invValue) * 100).toFixed(1)
                : 0}
              % of total
            </span>
          </div>
        </motion.div>

        {/* CN / Bad Debt */}
        <motion.div
          className="stat-card amber"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <div className="stat-icon" style={{ background: "#fef3c7" }}>
            <Clock size={18} color="#d97706" />
          </div>
          <div className="stat-label">CN / Bad Debt</div>
          <div className="stat-value" style={{ color: "#d97706" }}>
            ₹{formatCurrency(totals.cnBadDebt)}
          </div>
          <div className="stat-meta" style={{ color: "#6b7280" }}>
            <span>
              {filteredData.filter((d) => d.cnBadDebt > 0).length} invoices
              affected
            </span>
          </div>
        </motion.div>

      </div>

      <AgingReport />

      {/* ── All Drawers & Modals ── */}
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
        invoicesData={dbData}
      />
      <BounceHistoryDrawer
        invoice={historyInvoice}
        isOpen={showBounceHistory}
        onClose={() => setShowBounceHistory(false)}
      />
      <CNHistoryDrawer
        invoice={historyInvoice}
        isOpen={showCNHistory}
        onClose={() => setShowCNHistory(false)}
      />
      <AddInvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false);
          setSelectedInvoiceData(null);
        }}
        selectedInvoice={selectedInvoiceData}
        entities={entities}
        clients={clients}
      />

      {/* ✅ Payment Made History Drawer */}
      <PaymentMadeHistoryDrawer
        invoice={paymentMadeHistoryInvoice}
        isOpen={showPaymentMadeHistory}
        onClose={() => {
          setShowPaymentMadeHistory(false);
          setPaymentMadeHistoryInvoice(null);
        }}
      />

      {/* ── Filter Bar ── */}
      <div className="filter-card">
        <div
          className="flex flex-wrap items-center justify-between gap-4"
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>

            {/* Search */}
            <div className="search-wrap">
              <Search className="search-icon" size={15} />
              <input
                type="text"
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Client, Dept, or Invoice ID..."
              />
            </div>

            {/* Date Range Picker */}
            <div style={{ position: "relative" }}>
              <button
                className={`date-btn${dateFrom || dateTo ? " active" : ""}`}
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <Calendar size={14} />
                <span style={{ minWidth: 148 }}>
                  {formatDateDisplay()}
                </span>
                <ChevronDown
                  size={13}
                  style={{
                    transition: "transform 0.2s",
                    transform: showDatePicker ? "rotate(180deg)" : "none",
                  }}
                />
              </button>

              {/* Date Picker Dropdown */}
              <AnimatePresence>
                {showDatePicker && (
                  <motion.div
                    className="date-dropdown"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <span className="input-label">From Date</span>
                        <input
                          type="date"
                          className="date-input"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                      </div>
                      <div>
                        <span className="input-label">To Date</span>
                        <input
                          type="date"
                          className="date-input"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                      </div>
                    </div>

                    <hr className="divider" />

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <button
                        className="clear-link"
                        onClick={() => {
                          setDateFrom("");
                          setDateTo("");
                        }}
                      >
                        Clear
                      </button>
                      <button
                        className="apply-btn"
                        onClick={() => setShowDatePicker(false)}
                      >
                        Apply
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Filter Toggle Button */}
            <button
              className={`filter-toggle-btn${showFilters ? " active" : ""}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={15} />
              {activeFiltersCount > 0 && (
                <span className="filter-badge">{activeFiltersCount}</span>
              )}
            </button>
          </div>

          {/* Export Button */}
          <button
            className="export-btn"
            onClick={() => exportToExcel(filteredData)}
          >
            <Download size={14} />
            Export Excel
          </button>
        </div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: "hidden" }}
            >
              <div className="filter-panel">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: "#374151",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Filter size={13} color="#059669" />
                    Advanced Filters
                  </span>
                  {activeFiltersCount > 0 && (
                    <button className="clear-link" onClick={clearAllFilters}>
                      Clear All ({activeFiltersCount})
                    </button>
                  )}
                </div>

                <div className="filter-panel-grid">

                  {/* Department Filter */}
                  <div>
                    <span className="input-label">Department</span>
                    <div className="chip-group">
                      {departments.map((dept) => (
                        <button
                          key={dept}
                          className={`chip${
                            selectedDepartments.includes(dept)
                              ? " active-emerald"
                              : ""
                          }`}
                          onClick={() =>
                            toggleFilter(
                              selectedDepartments,
                              setSelectedDepartments,
                              dept
                            )
                          }
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Client Filter */}
                  <div>
                    <span className="input-label">Client</span>
                    <div className="chip-group">
                      {clients.map((client) => (
                        <button
                          key={client}
                          className={`chip${
                            selectedClients.includes(client)
                              ? " active-blue"
                              : ""
                          }`}
                          onClick={() =>
                            toggleFilter(
                              selectedClients,
                              setSelectedClients,
                              client
                            )
                          }
                        >
                          {client}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Entity Filter */}
                  <div>
                    <span className="input-label">Entity</span>
                    <div className="chip-group">
                      {entities.map((entity) => (
                        <button
                          key={entity}
                          className={`chip${
                            selectedEntities.includes(entity)
                              ? " active-purple"
                              : ""
                          }`}
                          onClick={() =>
                            toggleFilter(
                              selectedEntities,
                              setSelectedEntities,
                              entity
                            )
                          }
                        >
                          {entity ? entity.split(" ")[1] : "Unknown"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <span className="input-label">Status</span>
                    <div className="chip-group">
                      <button
                        className={`chip${
                          selectedStatuses.includes("paid")
                            ? " active-amber"
                            : ""
                        }`}
                        onClick={() =>
                          toggleFilter(
                            selectedStatuses,
                            setSelectedStatuses,
                            "paid"
                          )
                        }
                      >
                        Paid
                      </button>
                      <button
                        className={`chip${
                          selectedStatuses.includes("pending")
                            ? " active-amber"
                            : ""
                        }`}
                        onClick={() =>
                          toggleFilter(
                            selectedStatuses,
                            setSelectedStatuses,
                            "pending"
                          )
                        }
                      >
                        Pending
                      </button>
                      <button
                        className={`chip${
                          selectedStatuses.includes("overdue")
                            ? " active-amber"
                            : ""
                        }`}
                        onClick={() =>
                          toggleFilter(
                            selectedStatuses,
                            setSelectedStatuses,
                            "overdue"
                          )
                        }
                      >
                        Overdue
                      </button>
                      <button
                        className={`chip${
                          selectedStatuses.includes("fresh")
                            ? " active-amber"
                            : ""
                        }`}
                        onClick={() =>
                          toggleFilter(
                            selectedStatuses,
                            setSelectedStatuses,
                            "fresh"
                          )
                        }
                      >
                        Fresh
                      </button>
                    </div>
                  </div>

                  {/* Invoice Value Range */}
                  <div style={{ gridColumn: "span 2" }}>
                    <span className="input-label">Invoice Value Range</span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <input
                        type="number"
                        className="range-input"
                        value={minInvoiceValue}
                        onChange={(e) => setMinInvoiceValue(e.target.value)}
                        placeholder="Min (₹)"
                      />
                      <span style={{ color: "#9ca3af", fontSize: 13 }}>to</span>
                      <input
                        type="number"
                        className="range-input"
                        value={maxInvoiceValue}
                        onChange={(e) => setMaxInvoiceValue(e.target.value)}
                        placeholder="Max (₹)"
                      />
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Data Table ── */}
      <div className="table-card">
        <div className="table-scroll">
          <table className="dash-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("invDate")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Invoice Date</span>
                    <SortIcon columnKey="invDate" />
                  </div>
                </th>
                <th onClick={() => handleSort("impactMonth")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Impact Month</span>
                    <SortIcon columnKey="impactMonth" />
                  </div>
                </th>
                <th onClick={() => handleSort("dept")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Department</span>
                    <SortIcon columnKey="dept" />
                  </div>
                </th>
                <th onClick={() => handleSort("client")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Client Name</span>
                    <SortIcon columnKey="client" />
                  </div>
                </th>
                <th
                  style={{ textAlign: "right" }}
                  onClick={() => handleSort("invValue")}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                    <span>Invoice Value</span>
                    <SortIcon columnKey="invValue" />
                  </div>
                </th>
                <th
                  style={{ textAlign: "right" }}
                  onClick={() => handleSort("vertoFee")}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                    <span>Verto Fee</span>
                    <SortIcon columnKey="vertoFee" />
                  </div>
                </th>
                <th
                  style={{ textAlign: "right" }}
                  onClick={() => handleSort("notRecvd")}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                    <span>Not Recvd Amt</span>
                    <SortIcon columnKey="notRecvd" />
                  </div>
                </th>
                <th
                  style={{ textAlign: "center" }}
                  onClick={() => handleSort("delayDays")}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <span>Delay Days</span>
                    <SortIcon columnKey="delayDays" />
                  </div>
                </th>
                <th
                  style={{ textAlign: "right" }}
                  onClick={() => handleSort("osDiff")}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                    <span>OS Amt Difference</span>
                    <SortIcon columnKey="osDiff" />
                  </div>
                </th>
                <th
                  style={{ textAlign: "right" }}
                  onClick={() => handleSort("cnBadDebt")}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                    <span>CN / Bad Debt</span>
                    <SortIcon columnKey="cnBadDebt" />
                  </div>
                </th>
                <th onClick={() => handleSort("entity")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Invoice Entity</span>
                    <SortIcon columnKey="entity" />
                  </div>
                </th>
                <th style={{ textAlign: "center" }}>GST</th>
                <th style={{ textAlign: "center" }}>Type</th>
                <th style={{ textAlign: "center" }}>TDS</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredData.map((row, index) => (
                <React.Fragment key={row.id}>
                  <motion.tr
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={expandedRow === row.id ? "row-expanded" : ""}
                    onClick={(e) => {
                      if (e.target.closest("button")) return;
                      toggleRow(row.id);
                    }}
                  >
                    <td style={{ color: "#6b7280", fontSize: 12.5 }}>
                      {row.invDate}
                    </td>
                    <td style={{ color: "#374151" }}>{row.impactMonth}</td>
                    <td>
                      <span
                        className={`dept-pill ${
                          row.dept === "Outsourcing" ? "os" : "normal"
                        }`}
                      >
                        {row.dept}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{row.client}</td>
                    <td className="mono">
                      ₹{formatCurrency(row.invValue ?? 0)}
                    </td>
                    <td className="mono">₹{formatCurrency(row.vertoFee)}</td>
                    <td
                      className="mono"
                      style={{
                        color: row.notRecvd > 0 ? "#e11d48" : "inherit",
                      }}
                    >
                      ₹{formatCurrency(row.notRecvd)}
                    </td>
                    <td className="center">
                      <span
                        className={`delay-pill ${delayClass(row.delayDays)}`}
                      >
                        {row.delayDays}d
                      </span>
                    </td>
                    <td
                      className="mono"
                      style={{
                        color: row.osDiff >= 0 ? "#059669" : "#e11d48",
                      }}
                    >
                      {row.osDiff >= 0 ? "+" : ""}
                      {formatCurrency(row.osDiff)}
                    </td>
                    <td className="mono">
                      {row.cnBadDebt > 0 ? (
                        <span style={{ color: "#d97706" }}>
                          ₹{formatCurrency(row.cnBadDebt)}
                        </span>
                      ) : (
                        <span style={{ color: "#d1d5db" }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: "#6b7280" }}>
                      {row.entity}
                    </td>

                    {/* GST */}
                    <td className="center">
                      {row.gstMismatch ? (
                        <span className="text-red-600 font-bold">🔴</span>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            color: "#059669",
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          ₹ {row.gst ?? 0}
                        </span>
                      )}
                    </td>

                    {/* Type */}
                    <td className="center">
                      <span
                        className={`type-pill ${
                          row.dept === "Outsourcing" ? "os" : "normal"
                        }`}
                      >
                        {row.dept === "Outsourcing" ? "OS" : "Normal"}
                      </span>
                    </td>

                    {/* TDS */}
                    <td className="center">
                      {row.tdsMismatch ? (
                        <span className="text-red-600 font-bold">🔴</span>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            color: "#059669",
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          ₹ {row.tds ?? 0}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="center">
                      {row.gstMismatch || row.tdsMismatch ? (
                        <span className="status-pill mismatch">Mismatch</span>
                      ) : (
                        <span className="status-pill ok">OK</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="center">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                      >
                        {/* Ledger Button */}
                        <button
                          className="icon-btn"
                          title="View Ledger"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.ledgerInvoice = row;
                            window.setActiveTab("ledger");
                          }}
                        >
                          <Eye size={14} />
                        </button>

                        {/* Expand Button */}
                        <button className="icon-btn expand">
                          {expandedRow === row.id ? (
                            <ChevronUp
                              size={14}
                              style={{ color: "#2563eb" }}
                            />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </motion.tr>

                  {/* Expanded Details Row */}
                  <AnimatePresence>
                    {expandedRow === row.id && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <td
                          colSpan="16"
                          style={{
                            padding: 0,
                            borderBottom: "1px solid #e8eaed",
                          }}
                        >
                          <motion.div
                            initial={{ y: -10 }}
                            animate={{ y: 0 }}
                            className="expand-panel"
                          >
                            <div className="expand-title">
                              <FileText size={13} />
                              Invoice Details: {row.id}
                            </div>

                            <div className="expand-grid">

                              {/* Invoice Details */}
                              <div className="action-card">
                                <p className="action-card-label">
                                  Invoice Details
                                </p>
                                <button
                                  className="action-btn view"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailsInvoice(row);
                                    setShowInvoiceDetails(true);
                                  }}
                                >
                                  View
                                </button>
                                <button
                                  className="action-btn edit"
                                  onClick={async (e) => {
                                    e.stopPropagation();

                                    const { data, error } = await supabase
                                      .from("invoice_finance_view")
                                      .select("*")
                                      .eq("id", row.dbId)
                                      .single();

                                    if (error) {
                                      alert("Error fetching invoice");
                                      return;
                                    }

                                    setSelectedInvoiceData({
                                      ...data,
                                      dbId: data.id,
                                    });
                                    setShowInvoiceModal(true);
                                  }}
                                >
                                  Edit
                                </button>
                              </div>

                              {/* Payment Received */}
                              <div className="action-card">
                                <p className="action-card-label">
                                  Payment Received
                                </p>
                                <button
                                  className="action-btn view"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setHistoryInvoice(row);
                                    setShowPaymentHistory(true);
                                  }}
                                >
                                  View
                                </button>
                                <button
                                  className="action-btn edit"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedInvoice(row);
                                    setShowPaymentModal(true);
                                  }}
                                >
                                  Edit
                                </button>
                              </div>

                              {/* Payment Made */}
                              <div className="action-card">
                                <p className="action-card-label">
                                  Payment Made
                                </p>
                                {/* ✅ FIXED — opens PaymentMadeHistoryDrawer */}
                                <button
                                  className="action-btn view"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPaymentMadeHistoryInvoice(row);
                                    setShowPaymentMadeHistory(true);
                                  }}
                                >
                                  View
                                </button>
                                <button
                                  className="action-btn edit"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPaymentMadeInvoice({
                                      ...row,
                                      dbId: row.dbId || row.id,
                                      invoice_number:
                                        row.invoice_number || row.id,
                                      bank_id: row.bank_id || "",
                                      entity:
                                        row.entity ||
                                        row.entity_name ||
                                        "Pvt Ltd",
                                    });
                                    setShowPaymentMadeModal(true);
                                  }}
                                >
                                  Edit
                                </button>
                              </div>

                              {/* Bounce Back */}
                              <div className="action-card">
                                <p className="action-card-label">
                                  Bounce Back
                                </p>
                                <button
                                  className="action-btn view"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setHistoryInvoice(row);
                                    setShowBounceHistory(true);
                                  }}
                                >
                                  View
                                </button>
                                <button
                                  className="action-btn edit"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowBounceBackModal(true);
                                  }}
                                >
                                  Edit
                                </button>
                              </div>

                              {/* CN / Bad Debt */}
                              <div className="action-card">
                                <p className="action-card-label">
                                  CN / Bad Debt
                                </p>
                                <button
                                  className="action-btn view"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setHistoryInvoice(row);
                                    setShowCNHistory(true);
                                  }}
                                >
                                  View
                                </button>
                                <button
                                  className="action-btn edit"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedInvoiceData(row);
                                    setShowCNBadDebtModal(true);
                                  }}
                                >
                                  Edit
                                </button>
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

            <tfoot>
              <tr className="align-bottom">
                <td
                  colSpan="4"
                  style={{
                    textAlign: "right",
                    color: "#9ca3af",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    verticalAlign: "bottom",
                  }}
                >
                  TOTALS
                </td>
                <td className="mono" style={{ verticalAlign: "bottom" }}>
                  ₹{formatCurrency(totals.invValue)}
                </td>
                <td className="mono" style={{ verticalAlign: "bottom" }}>
                  ₹{formatCurrency(totals.vertoFee)}
                </td>
                <td
                  className="mono"
                  style={{ color: "#e11d48", verticalAlign: "bottom" }}
                >
                  ₹{formatCurrency(totals.notRecvd)}
                </td>
                <td
                  style={{
                    textAlign: "center",
                    color: "#d1d5db",
                    verticalAlign: "bottom",
                  }}
                >
                  —
                </td>
                <td
                  style={{
                    textAlign: "center",
                    color: "#d1d5db",
                    verticalAlign: "bottom",
                  }}
                >
                  —
                </td>
                <td className="mono" style={{ verticalAlign: "bottom" }}>
                  ₹{formatCurrency(totals.cnBadDebt)}
                </td>
                <td colSpan="6" />
              </tr>
            </tfoot>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="empty-state">
            <Search size={48} />
            <p style={{ fontSize: 14 }}>
              No records found matching your search criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;