import React, { useState, useMemo, useCallback } from "react";
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
import PaymentMadeHistoryDrawer from "./PaymentMadeHistoryDrawer";
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
  .stat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
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
    font-size: 11px; font-weight: 600;
    letter-spacing: 0.07em; text-transform: uppercase;
    color: var(--c-text-secondary); margin-bottom: 6px;
  }
  .stat-value {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 32px; font-weight: 700;
    color: var(--c-text-primary);
    line-height: 1; margin-bottom: 10px;
    letter-spacing: -0.02em;
  }
  .stat-meta { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 500; }

  .filter-card {
    background: var(--c-surface);
    border-radius: var(--radius-xl);
    border: 1px solid var(--c-border);
    padding: 18px 20px;
    box-shadow: var(--shadow-sm);
  }

  .search-wrap { position: relative; flex: 1; max-width: 400px; }
  .search-input {
    width: 100%;
    background: #f9fafb;
    border: 1.5px solid var(--c-border);
    border-radius: var(--radius-md);
    padding: 9px 14px 9px 38px;
    font-size: 13.5px; font-family: 'DM Sans', sans-serif;
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

  .date-btn {
    display: flex; align-items: center; gap: 7px;
    background: #f9fafb;
    border: 1.5px solid var(--c-border);
    border-radius: var(--radius-md);
    padding: 9px 13px; font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    color: var(--c-text-secondary);
    cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;
    white-space: nowrap;
  }
  .date-btn.active, .date-btn:hover { border-color: var(--c-emerald); color: var(--c-emerald); background: #fff; }

  .date-dropdown {
    position: absolute; top: calc(100% + 8px); left: 0; z-index: 100;
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    padding: 20px; min-width: 280px;
  }
  .date-input {
    width: 100%; background: #f9fafb;
    border: 1.5px solid var(--c-border);
    border-radius: var(--radius-sm);
    padding: 8px 11px; font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    color: var(--c-text-primary);
    outline: none; transition: border-color 0.15s; box-sizing: border-box;
  }
  .date-input:focus { border-color: var(--c-emerald); background: #fff; }
  .input-label {
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--c-text-muted); margin-bottom: 6px; display: block;
  }
  .divider { border: none; border-top: 1px solid var(--c-border); margin: 14px 0; }

  .chip-group { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    padding: 5px 12px; border-radius: 20px;
    font-size: 12px; font-weight: 500; cursor: pointer;
    border: 1.5px solid transparent; transition: all 0.15s;
    background: #f3f4f6; color: #4b5563;
    font-family: 'DM Sans', sans-serif;
  }
  .chip:hover { background: #e5e7eb; }
  .chip.active-emerald { background: var(--c-emerald-light); color: var(--c-emerald); border-color: var(--c-emerald-mid); }
  .chip.active-blue    { background: var(--c-blue-light); color: var(--c-blue); border-color: #93c5fd; }
  .chip.active-purple  { background: var(--c-purple-light); color: var(--c-purple); border-color: #c4b5fd; }
  .chip.active-amber   { background: var(--c-amber-light); color: var(--c-amber); border-color: #fcd34d; }

  .filter-panel { margin-top: 16px; padding-top: 18px; border-top: 1px solid var(--c-border); }
  .filter-panel-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }

  .table-card {
    background: var(--c-surface);
    border-radius: var(--radius-xl);
    border: 1px solid var(--c-border);
    overflow: hidden; box-shadow: var(--shadow-sm);
  }
  .table-scroll { overflow-x: auto; max-height: 600px; overflow-y: auto; }
  .table-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
  .table-scroll::-webkit-scrollbar-track { background: transparent; }
  .table-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 99px; }
  .table-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }

  table.dash-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.dash-table thead { position: sticky; top: 0; z-index: 10; }
  table.dash-table thead tr { background: #f8f9fb; border-bottom: 2px solid var(--c-border); }
  table.dash-table th {
    padding: 13px 16px; font-size: 11px; font-weight: 700;
    letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--c-text-secondary); white-space: nowrap;
    cursor: pointer; user-select: none;
    transition: background 0.12s, color 0.12s;
  }
  table.dash-table th:hover { background: #f0f2f5; color: var(--c-text-primary); }
  table.dash-table tbody tr { border-bottom: 1px solid #f0f2f5; transition: background 0.1s; cursor: pointer; }
  table.dash-table tbody tr:hover { background: #f8fffe; }
  table.dash-table tbody tr.row-expanded { background: #f0fdf8; }
  table.dash-table tbody tr:last-child { border-bottom: none; }
  table.dash-table td { padding: 13px 16px; color: var(--c-text-primary); white-space: nowrap; }
  table.dash-table td.mono { font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 500; text-align: right; }
  table.dash-table td.center { text-align: center; }
  table.dash-table tfoot tr { background: #f8f9fb; border-top: 2px solid var(--c-border); }
  table.dash-table tfoot td { padding: 14px 16px; font-weight: 700; font-size: 13.5px; color: var(--c-text-primary); }
  table.dash-table tfoot td.mono { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 700; text-align: right; }

  .status-pill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .status-pill.paid     { background: var(--c-emerald-light); color: var(--c-emerald); }
  .status-pill.pending  { background: #fef3c7; color: #b45309; }
  .status-pill.overdue  { background: var(--c-rose-light); color: var(--c-rose); }
  .status-pill.fresh    { background: var(--c-blue-light); color: var(--c-blue); }
  .status-pill.ok       { background: var(--c-emerald-light); color: var(--c-emerald); }
  .status-pill.mismatch { background: var(--c-rose-light); color: var(--c-rose); }
  .status-pill.completed { background: var(--c-purple-light); color: var(--c-purple); }

  .delay-pill {
    display: inline-block; padding: 2px 9px; border-radius: 20px;
    font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 500;
  }
  .delay-pill.low  { background: #f0fdf4; color: #16a34a; }
  .delay-pill.med  { background: #fef3c7; color: #b45309; }
  .delay-pill.high { background: var(--c-rose-light); color: var(--c-rose); }

  .dept-pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 600; }
  .dept-pill.os     { background: var(--c-purple-light); color: var(--c-purple); }
  .dept-pill.normal { background: var(--c-blue-light); color: var(--c-blue); }

  .type-pill { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; }
  .type-pill.os     { background: var(--c-purple-light); color: var(--c-purple); }
  .type-pill.normal { background: #f3f4f6; color: #6b7280; }

  .expand-panel { padding: 20px 24px; background: #f8fffe; border-top: 1px solid var(--c-emerald-mid); }
  .expand-title {
    font-size: 11.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--c-emerald); margin-bottom: 14px;
    display: flex; align-items: center; gap: 6px;
  }
  .expand-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
  .action-card {
    background: #fff; border: 1px solid var(--c-border);
    border-radius: var(--radius-lg); padding: 16px; transition: box-shadow 0.15s;
  }
  .action-card:hover { box-shadow: var(--shadow-md); }
  .action-card-label {
    font-size: 10.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--c-text-muted); margin-bottom: 12px;
  }
  .action-btn {
    display: block; width: 100%; padding: 8px 12px;
    border-radius: var(--radius-sm); font-size: 12.5px; font-weight: 500;
    font-family: 'DM Sans', sans-serif; cursor: pointer; border: none;
    transition: all 0.15s; text-align: center; margin-bottom: 6px;
  }
  .action-btn:last-child { margin-bottom: 0; }
  .action-btn.view       { background: #eff6ff; color: var(--c-blue); }
  .action-btn.view:hover { background: #dbeafe; }
  .action-btn.edit       { background: #f9fafb; color: #374151; }
  .action-btn.edit:hover { background: #f3f4f6; }

  .filter-toggle-btn {
    position: relative;
    display: inline-flex; align-items: center; justify-content: center;
    width: 40px; height: 40px;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--c-border);
    background: #f9fafb; cursor: pointer;
    transition: all 0.15s; color: var(--c-text-secondary);
  }
  .filter-toggle-btn:hover { background: #fff; border-color: var(--c-emerald); color: var(--c-emerald); }
  .filter-toggle-btn.active { background: var(--c-emerald-light); border-color: var(--c-emerald); color: var(--c-emerald); }
  .filter-badge {
    position: absolute; top: -6px; right: -6px;
    width: 18px; height: 18px;
    background: var(--c-emerald); color: #fff;
    font-size: 10px; font-weight: 700; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }

  .export-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 18px; background: var(--c-emerald); color: #fff;
    border-radius: var(--radius-md); font-size: 13.5px; font-weight: 600;
    font-family: 'DM Sans', sans-serif; border: none; cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
    box-shadow: 0 2px 8px rgba(5,150,105,0.25);
  }
  .export-btn:hover { background: #047857; box-shadow: 0 4px 14px rgba(5,150,105,0.35); transform: translateY(-1px); }

  .empty-state { padding: 64px 24px; text-align: center; color: var(--c-text-muted); }
  .empty-state svg { opacity: 0.2; margin: 0 auto 14px; display: block; }

  .apply-btn {
    padding: 6px 14px; background: var(--c-emerald); color: #fff;
    border: none; border-radius: var(--radius-sm);
    font-size: 12px; font-weight: 600;
    font-family: 'DM Sans', sans-serif; cursor: pointer; transition: background 0.15s;
  }
  .apply-btn:hover { background: #047857; }
  .clear-link {
    background: none; border: none; font-size: 12px; font-weight: 500;
    color: var(--c-text-muted); cursor: pointer; padding: 0;
    font-family: 'DM Sans', sans-serif; transition: color 0.15s;
  }
  .clear-link:hover { color: var(--c-text-primary); }

  .range-input {
    flex: 1; background: #f9fafb;
    border: 1.5px solid var(--c-border);
    border-radius: var(--radius-sm);
    padding: 8px 11px; font-size: 13px;
    font-family: 'Space Grotesk', sans-serif;
    color: var(--c-text-primary); outline: none; transition: border-color 0.15s;
  }
  .range-input:focus { border-color: var(--c-emerald); background: #fff; }
  .range-input::placeholder { font-family: 'DM Sans', sans-serif; color: var(--c-text-muted); }

  .icon-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; border-radius: 8px;
    background: transparent; border: none; cursor: pointer;
    transition: background 0.12s; color: var(--c-text-muted);
  }
  .icon-btn:hover { background: #eff6ff; color: var(--c-blue); }
  .icon-btn.expand:hover { background: #f3f4f6; color: var(--c-text-primary); }

  .pagination-btn {
    padding: 6px 14px; border-radius: 20px;
    font-size: 12px; font-weight: 500; cursor: pointer;
    border: 1.5px solid transparent; transition: all 0.15s;
    background: #f3f4f6; color: #4b5563;
    font-family: 'DM Sans', sans-serif;
  }
  .pagination-btn:hover:not(:disabled) { background: #e5e7eb; }
  .pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .pagination-btn.active-emerald { background: var(--c-emerald-light); color: var(--c-emerald); border-color: var(--c-emerald-mid); }
`;

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
  // ✅ FIX 5: Removed mock data fallback — dbData starts empty
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
  const [showPaymentMadeHistory, setShowPaymentMadeHistory] = useState(false);
  const [paymentMadeHistoryInvoice, setPaymentMadeHistoryInvoice] =
    useState(null);

  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [minInvoiceValue, setMinInvoiceValue] = useState("");
  const [maxInvoiceValue, setMaxInvoiceValue] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Financial year: April = month 3 (0-indexed), so FY starts April
  const getCurrentFY = () => {
    const now = new Date();
    return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  };
  const [selectedFY, setSelectedFY] = useState(getCurrentFY);

  const fyStart = (fy) => new Date(fy, 3, 1);
  const fyEnd = (fy) => new Date(fy + 1, 2, 31, 23, 59, 59);
  const fyLabel = (fy) =>
    `FY ${String(fy).slice(2)}-${String(fy + 1).slice(2)}`;

  const fetchInvoices = useCallback(async () => {
    console.log("🔥 FETCH RUNNING...");
    const now = new Date();
    const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyFromDate = `${fy}-04-01`;
    const fyToDate = `${fy + 1}-03-31`;

    const { data: rows, error } = await supabase.rpc("get_dashboard_invoices", {
      p_date_from: fyFromDate,
      p_date_to: fyToDate,
      p_limit: 1000,
      p_offset: 0,
    });

    if (error) {
      console.error("Fetch error:", error);
      return;
    }

    const formatted = rows.map((row) => {
      const outstanding = Number(row.outstanding ?? 0);
      const receivableAmount = Number(
        row.receivable_amount ?? row.invoice_value ?? 0
      );

      return {
        dbId: row.id,
        id: row.invoice_number,
        invoice_number: row.invoice_number,
        client_name: row.client_name,
        dept_code: row.dept_code,
        entity_name: row.entity_name,
        ledger_name: row.ledger_name,
        invoice_date: row.invoice_date ?? "",
        expected_collection_date: row.expected_collection_date ?? "",
        impact_month: row.impact_month ?? "",
        invDate: row.invoice_date ?? "",
        invDateObj: row.invoice_date ? new Date(row.invoice_date) : new Date(),
        impactMonth: row.impact_month
          ? new Date(row.impact_month).toLocaleDateString("en-GB", {
              month: "short",
              year: "2-digit",
            })
          : "",
        pay: Number(row.pay ?? 0),
        pay_head: row.pay_head ?? "",
        verto_fee: Number(row.net_verto_fee ?? row.verto_fee ?? 0),
        gst: Number(row.net_gst ?? row.gst ?? 0),
        tds: Number(row.net_tds ?? row.tds ?? 0),
        invoice_value: Number(row.invoice_value ?? 0),
        receivable_amount: receivableAmount,
        totalReceived: Number(row.amount_received ?? 0),
        totalBillableExpenses: Number(row.total_billable_expense ?? 0),
        bounce: Number(row.total_bounce ?? 0),
        cnBadDebt: Number(row.cn_amount ?? 0),
        netReceived: Number(row.net_received ?? 0),
        dept: row.dept_name,
        client: row.client_name,
        entity: row.entity_name,
        invValue: Number(row.invoice_value ?? 0),
        vertoFee: Number(row.net_verto_fee ?? row.verto_fee ?? 0),
        notRecvd: outstanding,
        excessPayment: Number(row.excess_payment ?? 0),
        delayDays: Number(row.days_overdue ?? 0),
        osDiff: Number(row.os_amt_difference ?? 0),
        employee_count: row.employee_count ?? 0,
        gross_value: row.gross_value ?? 0,
        net_in_hand: row.net_in_hand ?? 0,
        co_pf: row.co_pf ?? 0,
        co_esi: row.co_esi ?? 0,
        lwf_tax: row.lwf_tax ?? 0,
        pt_tax: row.pt_tax ?? 0,
        other_ded: row.other_ded ?? 0,
        ctc: row.ctc ?? 0,
        is_completed: row.is_completed || false,
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

    setDbData(formatted);
  }, []);

  // ✅ FIX 6: fetchBanks null-safe with || []
  const fetchBanks = useCallback(async () => {
    const { data, error } = await supabase.from("bank_master").select("*");
    if (!error) setBanks(data || []);
  }, []);

  React.useEffect(() => {
    fetchInvoices();
    fetchBanks();
  }, []);

  React.useEffect(() => {
    window.refreshDashboard = fetchInvoices;
    window.refreshBanks = fetchBanks;
  }, [fetchInvoices, fetchBanks]);

  React.useEffect(() => {
    const channel = supabase
      .channel("realtime-all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments_received" },
        () => fetchInvoices()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments_made" },
        () => fetchInvoices()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "advance_payments" },
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInvoices]);

  // ✅ FIX 5: Removed mock data fallback — source = dbData only
  const departments = [...new Set(dbData.map((d) => d.dept).filter(Boolean))];
  const clients = [...new Set(dbData.map((d) => d.client).filter(Boolean))];
  const entities = [...new Set(dbData.map((d) => d.entity).filter(Boolean))];

  // ✅ FIX 5: Removed mock data fallback — sourceData = dbData only
  const filteredData = useMemo(() => {
    let sourceData = dbData;

    sourceData = sourceData.filter((row) =>
      showCompleted ? Boolean(row.is_completed) : !Boolean(row.is_completed)
    );

    let filtered = sourceData.filter((row) => {
      const matchesSearch =
        (row.client || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.dept || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.id || "").toLowerCase().includes(searchTerm.toLowerCase());

      const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
      const to = dateTo ? new Date(dateTo + "T23:59:59") : null;
      const matchesDateFrom = !from || row.invDateObj >= from;
      const matchesDateTo = !to || row.invDateObj <= to;
      const matchesFY =
        from || to
          ? true // custom date range is active — skip FY filter
          : row.invDateObj >= fyStart(selectedFY) &&
            row.invDateObj <= fyEnd(selectedFY);

      const matchesDept =
        selectedDepartments.length === 0 ||
        selectedDepartments.includes(row.dept);
      const matchesClient =
        selectedClients.length === 0 || selectedClients.includes(row.client);
      const matchesEntity =
        selectedEntities.length === 0 || selectedEntities.includes(row.entity);
      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(row.status);
      const matchesMinValue =
        !minInvoiceValue || row.invValue >= Number(minInvoiceValue);
      const matchesMaxValue =
        !maxInvoiceValue || row.invValue <= Number(maxInvoiceValue);

      return (
        matchesSearch &&
        matchesFY &&
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

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key] ?? 0;
        let bVal = b[sortConfig.key] ?? 0;
        if (sortConfig.key === "invDate") {
          aVal = a.invDateObj;
          bVal = b.invDateObj;
        }
        if (typeof aVal === "number" && typeof bVal === "number")
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        if (typeof aVal === "string" && typeof bVal === "string")
          return sortConfig.direction === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        if (aVal instanceof Date && bVal instanceof Date)
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        return 0;
      });
    }

    return filtered;
  }, [
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
    showCompleted,
    selectedFY,
  ]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    dateFrom,
    dateTo,
    selectedDepartments,
    selectedClients,
    selectedEntities,
    selectedStatuses,
    minInvoiceValue,
    maxInvoiceValue,
    showCompleted,
    selectedFY,
  ]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totals = useMemo(
    () =>
      filteredData.reduce(
        (acc, row) => ({
          invValue: acc.invValue + row.invValue,
          vertoFee: acc.vertoFee + row.vertoFee,
          notRecvd: acc.notRecvd + row.notRecvd,
          cnBadDebt: acc.cnBadDebt + row.cnBadDebt,
          gst: acc.gst + (row.gst || 0),
          tds: acc.tds + (row.tds || 0),
          osDiff: acc.osDiff + (row.osDiff || 0),
        }),
        {
          invValue: 0,
          vertoFee: 0,
          notRecvd: 0,
          cnBadDebt: 0,
          gst: 0,
          tds: 0,
          osDiff: 0,
        }
      ),
    [filteredData]
  );

  const toggleRow = (id) => setExpandedRow(expandedRow === id ? null : id);
  const handleSort = (key) =>
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey)
      return <ChevronDown className="w-3 h-3 opacity-30" />;
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
    if (array.includes(value)) setArray(array.filter((item) => item !== value));
    else setArray([...array, value]);
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
    const { data, error } = await supabase
      .from("invoice_finance_view")
      .select("*")
      .eq("id", row.dbId)
      .single();

    if (error) {
      alert("Failed to fetch invoice details");
      return;
    }

    setSelectedInvoiceData({ ...data, dbId: data.id });
    if (type === "CN") setShowCNBadDebtModal(true);
    else setShowInvoiceModal(true);
  };

  const delayClass = (d) => (d > 30 ? "high" : d > 0 ? "med" : "low");

  return (
    <div
      className="dash-root"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      <style>{dashboardStyles}</style>

      {/* ── Header Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="stat-value">₹{formatCurrency(totals.invValue)}</div>
          <div className="stat-meta" style={{ color: "#6b7280" }}>
            <span>{filteredData.length} invoices</span>
          </div>
        </motion.div>

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
                ? ((totals.vertoFee / totals.invValue) * 100).toFixed(2)
                : "0.00"}
              % of invoice value
            </span>
          </div>
        </motion.div>

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
                ? ((totals.notRecvd / totals.invValue) * 100).toFixed(2)
                : "0.00"}
              % of invoiced
            </span>
          </div>
        </motion.div>

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
        onSaved={() => fetchInvoices()}
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
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}
          >
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

            <div style={{ position: "relative" }}>
              <button
                className={`date-btn${dateFrom || dateTo ? " active" : ""}`}
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <Calendar size={14} />
                <span style={{ minWidth: 148 }}>{formatDateDisplay()}</span>
                <ChevronDown
                  size={13}
                  style={{
                    transition: "transform 0.2s",
                    transform: showDatePicker ? "rotate(180deg)" : "none",
                  }}
                />
              </button>
              <AnimatePresence>
                {showDatePicker && (
                  <motion.div
                    className="date-dropdown"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
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

          {/* FY navigation buttons + Active/Completed toggles */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setShowCompleted(false)}
              className={`chip ${!showCompleted ? "active-emerald" : ""}`}
            >
              Active Invoices
            </button>
            <button
              onClick={() => setShowCompleted(true)}
              className={`chip ${showCompleted ? "active-purple" : ""}`}
            >
              Completed Invoices
            </button>

            {/* FY Navigator */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginLeft: 8,
                background: "#f3f4f6",
                borderRadius: 20,
                padding: "3px 4px",
              }}
            >
              <button
                onClick={() => setSelectedFY((y) => y - 1)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 16,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                ‹
              </button>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#374151",
                  padding: "0 6px",
                  whiteSpace: "nowrap",
                }}
              >
                {fyLabel(selectedFY)}
              </span>
              <button
                onClick={() => setSelectedFY((y) => y + 1)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 16,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                ›
              </button>
            </div>
          </div>

          <button
            className="export-btn"
            onClick={() => exportToExcel(filteredData)}
          >
            <Download size={14} /> Export Excel
          </button>
        </div>

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
                    <Filter size={13} color="#059669" /> Advanced Filters
                  </span>
                  {activeFiltersCount > 0 && (
                    <button className="clear-link" onClick={clearAllFilters}>
                      Clear All ({activeFiltersCount})
                    </button>
                  )}
                </div>

                <div className="filter-panel-grid">
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
                  <div>
                    <span className="input-label">Status</span>
                    <div className="chip-group">
                      {["paid", "pending", "overdue", "fresh"].map((s) => (
                        <button
                          key={s}
                          className={`chip${
                            selectedStatuses.includes(s) ? " active-amber" : ""
                          }`}
                          onClick={() =>
                            toggleFilter(
                              selectedStatuses,
                              setSelectedStatuses,
                              s
                            )
                          }
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <span className="input-label">Invoice Value Range</span>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
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
                {[
                  ["invDate", "Invoice Date"],
                  ["impactMonth", "Impact Month"],
                  ["dept", "Department"],
                  ["client", "Client Name"],
                ].map(([key, label]) => (
                  <th key={key} onClick={() => handleSort(key)}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{label}</span>
                      <SortIcon columnKey={key} />
                    </div>
                  </th>
                ))}
                {[
                  ["invValue", "Invoice Value"],
                  ["vertoFee", "Verto Fee"],
                  ["notRecvd", "Not Recvd Amt"],
                ].map(([key, label]) => (
                  <th
                    key={key}
                    style={{ textAlign: "right" }}
                    onClick={() => handleSort(key)}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 6,
                      }}
                    >
                      <span>{label}</span>
                      <SortIcon columnKey={key} />
                    </div>
                  </th>
                ))}
                <th
                  style={{ textAlign: "center" }}
                  onClick={() => handleSort("delayDays")}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <span>Delay Days</span>
                    <SortIcon columnKey="delayDays" />
                  </div>
                </th>
                <th
                  style={{ textAlign: "right" }}
                  onClick={() => handleSort("osDiff")}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 6,
                    }}
                  >
                    <span>OS Amt Difference</span>
                    <SortIcon columnKey="osDiff" />
                  </div>
                </th>
                <th
                  style={{ textAlign: "right" }}
                  onClick={() => handleSort("cnBadDebt")}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 6,
                    }}
                  >
                    <span>CN / Bad Debt</span>
                    <SortIcon columnKey="cnBadDebt" />
                  </div>
                </th>
                <th onClick={() => handleSort("entity")}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
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
              {paginatedData.map((row, index) => (
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
                        color: row.notRecvd > 0 ? "#e11d48" : "#059669",
                      }}
                    >
                      {row.notRecvd > 0
                        ? `₹${formatCurrency(row.notRecvd)}`
                        : "✓ Paid"}
                    </td>
                    <td className="center">
                      <span
                        className={`delay-pill ${delayClass(row.delayDays)}`}
                      >
                        {row.delayDays}d
                      </span>
                    </td>
                    <td className="mono">
                      {row.osDiff === 0 ? (
                        <span style={{ color: "#d1d5db" }}>—</span>
                      ) : row.osDiff > 0 ? (
                        <span style={{ color: "#e11d48" }}>
                          ₹{formatCurrency(row.osDiff)}
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            background: "#f0fdf4",
                            color: "#16a34a",
                            border: "1px solid #bbf7d0",
                            borderRadius: 6,
                            padding: "1px 7px",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          ↑ ₹{formatCurrency(Math.abs(row.osDiff))} excess
                        </span>
                      )}
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
                    <td className="center">
                      <span
                        className={`type-pill ${
                          row.dept === "Outsourcing" ? "os" : "normal"
                        }`}
                      >
                        {row.dept === "Outsourcing" ? "OS" : "Normal"}
                      </span>
                    </td>
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
                    <td className="center">
                      {row.is_completed ? (
                        <span className="status-pill completed">Completed</span>
                      ) : row.gstMismatch || row.tdsMismatch ? (
                        <span className="status-pill mismatch">Mismatch</span>
                      ) : (
                        <span className="status-pill ok">Active</span>
                      )}
                    </td>
                    <td className="center">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                      >
                        <button
                          className="icon-btn"
                          title="View Ledger"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.ledgerInvoice = row;
                            window.setActiveTab?.("ledger");
                          }}
                        >
                          <Eye size={14} />
                        </button>
                        <button className="icon-btn expand">
                          {expandedRow === row.id ? (
                            <ChevronUp size={14} style={{ color: "#2563eb" }} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </motion.tr>

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

                              <div className="action-card">
                                <p className="action-card-label">
                                  Payment Made
                                </p>
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

                              <div className="action-card">
                                <p className="action-card-label">Bounce Back</p>
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

            {/* ✅ FIX 1: Wrap totals row in <tfoot> */}
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
                  className="mono"
                  style={{
                    textAlign: "right",
                    color: "#e11d48",
                    verticalAlign: "bottom",
                  }}
                >
                  {totals.osDiff > 0 ? (
                    `₹${formatCurrency(totals.osDiff)}`
                  ) : (
                    <span style={{ color: "#d1d5db" }}>—</span>
                  )}
                </td>
                <td className="mono" style={{ verticalAlign: "bottom" }}>
                  ₹{formatCurrency(totals.cnBadDebt)}
                </td>
                <td style={{ verticalAlign: "bottom" }} />
                <td
                  className="mono"
                  style={{
                    textAlign: "center",
                    color: "#059669",
                    verticalAlign: "bottom",
                    fontSize: 12,
                  }}
                >
                  ₹{formatCurrency(totals.gst)}
                </td>
                <td style={{ verticalAlign: "bottom" }} />
                <td
                  className="mono"
                  style={{
                    textAlign: "center",
                    color: "#059669",
                    verticalAlign: "bottom",
                    fontSize: 12,
                  }}
                >
                  ₹{formatCurrency(totals.tds)}
                </td>
                <td colSpan="3" />
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

      {/* ── Pagination ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          borderTop: "1px solid #e5e7eb",
          background: "#fff",
          borderRadius: "0 0 var(--radius-xl) var(--radius-xl)",
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          Showing page {currentPage} of {totalPages || 1}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className="pagination-btn"
          >
            Previous
          </button>

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            className="pagination-btn active-emerald"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
