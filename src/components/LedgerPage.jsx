import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import { usePerms } from "../context/PermissionsContext";
import { exportInvoiceLedgerXlsx, exportInvoicePDF } from "../utils/Invoiceexport";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  CreditCard,
  FileX,
  ArrowLeftRight,
  Trash2,
  CheckCircle2,
  Users,
  ChevronDown,
  ChevronUp,
  FileDown,
  FileSpreadsheet,
  Lock,
  Wallet,
  Receipt,
  BadgeCheck,
  BarChart3,
  Shield,
  ArrowUpCircle,
  ArrowDownCircle,
  FileText,
  Clock,
} from "lucide-react";

// ─── TYPE CONFIG ───────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  "TDS Deducted": {
    icon: TrendingDown,
    color: "text-orange-600",
    bg: "bg-orange-100",
    badge: "bg-orange-100 text-orange-700",
    border: "#fed7aa",
    sign: "−",
    rowClass: "tds",
  },
  "Payment Received": {
    icon: ArrowDownCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    badge: "bg-emerald-100 text-emerald-700",
    border: "#a7f3d0",
    sign: "−",
    rowClass: "payment-received",
  },
  "Bounce Back": {
    icon: RefreshCw,
    color: "text-rose-600",
    bg: "bg-rose-100",
    badge: "bg-rose-100 text-rose-700",
    border: "#fecdd3",
    sign: "+",
    rowClass: "bounce-back",
  },
  "Credit Note / Bad Debt": {
    icon: FileX,
    color: "text-amber-600",
    bg: "bg-amber-100",
    badge: "bg-amber-100 text-amber-700",
    border: "#fde68a",
    sign: "−",
    rowClass: "credit-note",
  },
  "Billable Expense": {
    icon: TrendingUp,
    color: "text-indigo-600",
    bg: "bg-indigo-100",
    badge: "bg-indigo-100 text-indigo-700",
    border: "#c7d2fe",
    sign: "+",
    rowClass: "billable",
  },
  "Payment Made": {
    icon: CreditCard,
    color: "text-gray-500",
    bg: "bg-gray-100",
    badge: "bg-gray-100 text-gray-600",
    border: "#e5e7eb",
    sign: "—",
    rowClass: "payment-made",
  },
};

const isLocked = (invoiceDate) => {
  if (!invoiceDate) return false;
  const date = new Date(invoiceDate);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 45);
  cutoff.setHours(0, 0, 0, 0);
  return date < cutoff;
};

// ─── DELETE CONFIRMATION MODAL ─────────────────────────────────────────────────
const DeleteModal = ({ invoiceId, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-red-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-red-100">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 text-base">Delete Invoice</h2>
          <p className="text-xs text-gray-500">This cannot be undone</p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-2">
        You are about to permanently delete:
      </p>
      <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4 space-y-1 text-xs text-red-700 font-medium">
        <p>
          🧾 Invoice <span className="font-bold">{invoiceId}</span>
        </p>
        <p>💳 All Payments Received & Made</p>
        <p>🔄 Bounce Back entries</p>
        <p>📝 Credit Notes / Bad Debt</p>
        <p>🏦 Bank & Petty Cash entries</p>
        <p>💾 Software entries</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50 font-medium"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2.5 text-sm text-white bg-red-600 rounded-xl hover:bg-red-700 transition disabled:opacity-50 font-medium flex items-center justify-center gap-2"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          {loading ? "Deleting..." : "Delete Forever"}
        </button>
      </div>
    </div>
  </div>
);

// ─── OS PAYOUTS SECTION ────────────────────────────────────────────────────────
const OSPayoutsSection = ({ osPayouts, netInHand }) => {
  const [expanded, setExpanded] = useState(true);

  const fmt = (val) => `₹ ${Number(val || 0).toLocaleString("en-IN")}`;
  const fmtDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    return isNaN(date)
      ? d
      : date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  if (!osPayouts || osPayouts.length === 0) return null;

  let balance = netInHand;
  const rows = osPayouts.map((p) => {
    const bbAmt = Number(p.bounce_back_amount || 0);
    const netPaid = Math.max(
      Number(p.amount_paid || 0) - bbAmt - Number(p.income_tax_deducted || 0),
      0
    );
    balance -= netPaid;
    return { ...p, bbAmt, netPaid, runningBalance: balance };
  });

  const totalPaid = rows.reduce((s, r) => s + r.netPaid, 0);
  const leftAmount = netInHand - totalPaid;
  const paidPct =
    netInHand > 0 ? Math.min((totalPaid / netInHand) * 100, 100) : 0;

  return (
    <div className="mt-6 rounded-2xl border-2 border-violet-200 bg-violet-50/40 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-violet-50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-100">
            <Users className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-left">
            <p className="font-bold text-violet-800 text-sm">
              3rd Party OS Payouts
            </p>
            <p className="text-xs text-violet-500">
              {osPayouts.length} payout{osPayouts.length !== 1 ? "s" : ""} ·
              Against Net-in-Hand
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-violet-500 mb-0.5">Left Balance</p>
            <p
              className={`font-bold text-sm ${
                leftAmount <= 0 ? "text-emerald-600" : "text-violet-700"
              }`}
            >
              {fmt(leftAmount)}
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-violet-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-violet-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3">
          <div className="flex items-center justify-between bg-white border border-violet-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
              <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
                Net in Hand (Opening)
              </span>
            </div>
            <span className="font-bold text-violet-700 text-sm">
              {fmt(netInHand)}
            </span>
          </div>

          <div className="bg-white border border-violet-100 rounded-xl px-4 py-3">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Paid out so far</span>
              <span className="font-semibold text-violet-700">
                {paidPct.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-2 bg-violet-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${paidPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-2">
              <span className="text-rose-600 font-medium">
                Paid: {fmt(totalPaid)}
              </span>
              <span
                className={`font-medium ${
                  leftAmount <= 0 ? "text-emerald-600" : "text-violet-700"
                }`}
              >
                Left: {fmt(leftAmount)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {rows.map((row, i) => (
              <div
                key={i}
                className="bg-white border border-violet-100 rounded-xl p-4 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-semibold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                      {row.pay_head || "OS Payout"}
                    </span>
                    {row.income_tax_deducted > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        TDS: {fmt(row.income_tax_deducted)}
                      </span>
                    )}
                    {row.bbAmt > 0 && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        ↩ BB: {fmt(row.bbAmt)}
                      </span>
                    )}
                  </div>

                  <p className="text-base font-bold text-rose-600">
                    − {fmt(row.netPaid)}
                  </p>

                  <div className="text-xs text-gray-400 mt-0.5 space-y-0.5">
                    <p>Gross Paid: {fmt(row.amount_paid)}</p>
                    {row.bbAmt > 0 && (
                      <p className="text-emerald-600 font-medium">
                        ↩ Bounce Back: +{fmt(row.bbAmt)}
                      </p>
                    )}
                    {row.income_tax_deducted > 0 && (
                      <p>TDS: −{fmt(row.income_tax_deducted)}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {fmtDate(row.payment_date)}
                    </span>
                    {row.payout_ref_no && (
                      <span className="text-xs text-gray-400 font-mono">
                        {row.payout_ref_no}
                      </span>
                    )}
                  </div>

                  {(row.payment_details || row.remarks) && (
                    <p className="text-xs text-gray-500 mt-1.5 truncate">
                      💬 {row.payment_details || row.remarks}
                    </p>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400 mb-0.5">Balance Left</p>
                  <p
                    className={`font-bold text-sm ${
                      row.runningBalance <= 0
                        ? "text-emerald-600"
                        : "text-violet-700"
                    }`}
                  >
                    {fmt(row.runningBalance)}
                  </p>
                  {row.runningBalance < 0 && (
                    <p className="text-xs text-emerald-500 mt-0.5">Overpaid</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div
            className={`flex items-center justify-between rounded-xl px-4 py-3 border-2 ${
              leftAmount <= 0
                ? "bg-emerald-50 border-emerald-200"
                : "bg-violet-100 border-violet-200"
            }`}
          >
            <span
              className={`text-xs font-bold uppercase tracking-wide ${
                leftAmount <= 0 ? "text-emerald-700" : "text-violet-800"
              }`}
            >
              {leftAmount < 0
                ? "⚠️ Over Disbursed"
                : leftAmount === 0
                ? "✅ Fully Disbursed"
                : "Remaining to Disburse"}
            </span>
            <span
              className={`font-bold text-base ${
                leftAmount <= 0 ? "text-emerald-700" : "text-violet-800"
              }`}
            >
              {fmt(leftAmount)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
const LedgerPage = () => {
  const { isAdmin } = usePerms();
  const [ledger, setLedger] = useState([]);
  const [opening, setOpening] = useState(0);
  const [invoice, setInvoice] = useState(null);
  const [outstanding, setOutstanding] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [netInHand, setNetInHand] = useState(0);
  const [osPayouts, setOsPayouts] = useState([]);
  const [invoiceTds, setInvoiceTds] = useState(0);
  const [exportLoading, setExportLoading] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(null);

  const [invoiceEmpCount, setInvoiceEmpCount] = useState(0);
  const [osEmpPaid, setOsEmpPaid] = useState(0);
  const [osEmpBB, setOsEmpBB] = useState(0);
  const [cnEmpCount, setCnEmpCount] = useState(0);

  useEffect(() => {
    setInvoice(window.ledgerInvoice || null);
  }, []);

  useEffect(() => {
    if (!invoice?.dbId) return;
    fetchLedger();
  }, [invoice]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .select(
          `id, invoice_value, receivable_amount, invoice_number, is_completed, net_in_hand, tds, invoice_date, employee_count`
        )
        .eq("id", invoice.dbId)
        .single();

      if (invErr || !inv) {
        console.error("Invoice fetch error:", invErr);
        return;
      }

      setOpening(inv.invoice_value);
      setNetInHand(Number(inv.net_in_hand || 0));
      setIsCompleted(inv.is_completed || false);
      setInvoiceTds(Number(inv.tds || 0));
      setInvoiceDate(inv.invoice_date || null);
      setInvoiceEmpCount(Number(inv.employee_count || 0));

      const [
        { data: payments },
        { data: paymentsMade },
        { data: osPayoutsData },
        { data: bounces },
        { data: cns },
      ] = await Promise.all([
        supabase
          .from("payments_received")
          .select("*")
          .eq("invoice_id", invoice.dbId)
          .order("payment_date", { ascending: true }),

        supabase
          .from("payments_made")
          .select("*")
          .eq("invoice_id", invoice.dbId)
          .order("payment_date", { ascending: true }),

        supabase
          .from("os_payouts")
          .select("*")
          .eq("invoice_id", invoice.dbId)
          .order("payment_date", { ascending: true }),

        supabase
          .from("bounce_back")
          .select("*")
          .eq("invoice_id", invoice.dbId)
          .order("bounce_date", { ascending: true }),

        supabase
          .from("credit_note_bad_debt")
          .select("*")
          .eq("invoice_id", invoice.dbId)
          .order("issue_date", { ascending: true }),
      ]);

      setOsPayouts(osPayoutsData || []);

      const osEmpPaidTotal = (osPayoutsData || []).reduce(
        (s, p) => s + Number(p.employee_count || 0), 0
      );

      const osEmpBBTotal = (osPayoutsData || []).reduce((s, p) => {
        const gross = Number(p.amount_paid || 0);
        const bb = Number(p.bounce_back_amount || 0);
        const emp = Number(p.employee_count || 0);
        if (gross <= 0 || bb <= 0) return s;
        return s + Math.round((bb / gross) * emp);
      }, 0);

      const cnEmpTotal = (cns || []).reduce(
        (s, c) => s + Number(c.employee_count || 0), 0
      );

      setOsEmpPaid(osEmpPaidTotal);
      setOsEmpBB(osEmpBBTotal);
      setCnEmpCount(cnEmpTotal);

      let rows = [];

      payments?.forEach((p) =>
        rows.push({
          type: "Payment Received",
          amount: -Number(p.amount_received || 0),
          date: p.payment_date,
          ref: p.payment_ref,
          remarks: null,
        })
      );

      paymentsMade?.forEach((p) => {
        const amt = Number(p.transfer_amount || p.amount || 0);
        rows.push({
          type: p.is_billable ? "Billable Expense" : "Payment Made",
          amount: p.is_billable ? +amt : 0,
          displayAmount: amt,
          date: p.payment_date,
          ref: null,
          remarks: p.payment_description || p.expense_remarks || p.remarks,
          expenseHead: p.pay_head,
          isBillable: p.is_billable,
        });
      });

      osPayoutsData?.forEach((p) => {
        const bbAmt = Number(p.bounce_back_amount || 0);
        const netAmount =
          Number(p.amount_paid || 0) -
          bbAmt -
          Number(p.income_tax_deducted || 0);
        if (p.is_billable) {
          rows.push({
            type: "Billable Expense",
            amount: +Math.max(netAmount, 0),
            displayAmount: Math.max(netAmount, 0),
            date: p.payment_date,
            ref: p.payout_ref_no || null,
            remarks: p.payment_details || p.remarks,
            expenseHead: p.pay_head,
            isBillable: true,
            isOsPayout: true,
            bbAmt,
          });
        }
      });

      bounces?.forEach((b) =>
        rows.push({
          type: "Bounce Back",
          amount: +Number(b.amount || 0),
          date: b.bounce_date || b.created_at,
          ref: b.payment_ref,
          remarks: b.remarks,
        })
      );

      cns?.forEach((c) =>
        rows.push({
          type: "Credit Note / Bad Debt",
          amount: -Number(c.amount || 0),
          date: c.issue_date || c.created_at,
          ref: null,
          remarks: c.remarks,
        })
      );

      if (Number(inv.tds || 0) > 0) {
        rows.push({
          type: "TDS Deducted",
          amount: -Number(inv.tds),
          date: inv.invoice_date || rows[0]?.date || new Date().toISOString(),
          ref: null,
          remarks: `TDS deducted at source — ₹${Number(inv.tds).toLocaleString(
            "en-IN"
          )}`,
          isTds: true,
        });
      }

      rows.sort((a, b) => new Date(a.date) - new Date(b.date));

      let balance = inv.invoice_value;
      const finalLedger = rows.map((r) => {
        balance += r.amount;
        return { ...r, balance };
      });

      setLedger(finalLedger);
      setOutstanding(balance);
    } catch (err) {
      console.error("Ledger error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getOsPaidTotal = () => {
    return osPayouts.reduce(
      (s, p) =>
        s +
        Math.max(
          Number(p.amount_paid || 0) -
            Number(p.bounce_back_amount || 0) -
            Number(p.income_tax_deducted || 0),
          0
        ),
      0
    );
  };

  const handleCompleteInvoice = async () => {
    if (!invoice?.dbId) return;
    setCompleteLoading(true);
    try {
      const rpc = isCompleted ? "uncomplete_invoice" : "complete_invoice";
      const { error } = await supabase.rpc(rpc, { p_invoice_id: invoice.dbId });
      if (error) throw error;
      setIsCompleted(!isCompleted);
      await fetchLedger();
      if (window.refreshDashboard) await window.refreshDashboard();
      alert(
        isCompleted
          ? "Invoice moved back to active."
          : "Invoice marked completed."
      );
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setCompleteLoading(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice?.dbId) return;
    setDeleteLoading(true);
    try {
      let invoiceDbId = invoice.dbId;
      if (!invoiceDbId && invoice.id) {
        const { data } = await supabase
          .from("invoices")
          .select("id")
          .eq("invoice_number", invoice.id)
          .single();
        invoiceDbId = data?.id;
      }
      if (!invoiceDbId) throw new Error("Could not resolve invoice ID");
      const { error } = await supabase.rpc("delete_invoice_complete", {
        p_invoice_id: invoiceDbId,
      });
      if (error) throw error;
      setShowDeleteModal(false);
      window.ledgerInvoice = null;
      if (window.refreshDashboard) await window.refreshDashboard();
      window.setActiveTab?.("dashboard");
    } catch (err) {
      console.error("Delete invoice error:", err);
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const fmt = (val) => `₹ ${Number(val || 0).toLocaleString("en-IN")}`;

  const fmtDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    return isNaN(date)
      ? d
      : date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  const handleExcelDownload = async () => {
    if (!invoice?.dbId) return;
    setExportLoading(true);
    try {
      const { data: inv } = await supabase
        .from("invoices").select("*").eq("id", invoice.dbId).single();

      const [
        { data: clientRow },
        { data: entityRow },
        { data: deptRow },
        { data: paymentsRaw },
        { data: osPayoutsRaw },
        { data: cnsRaw },
        { data: bbRaw },
      ] = await Promise.all([
        inv?.client_id
          ? supabase.from("clients_master").select("client_name").eq("id", inv.client_id).maybeSingle()
          : Promise.resolve({ data: null }),
        inv?.entity_id
          ? supabase.from("entity_master").select("entity_name").eq("id", inv.entity_id).maybeSingle()
          : Promise.resolve({ data: null }),
        inv?.department_id
          ? supabase.from("departments_master").select("dept_name").eq("id", inv.department_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("payments_received").select("*").eq("invoice_id", invoice.dbId).order("payment_date"),
        supabase.from("os_payouts").select("*").eq("invoice_id", invoice.dbId).order("payment_date"),
        supabase.from("credit_note_bad_debt").select("*").eq("invoice_id", invoice.dbId).order("issue_date"),
        supabase.from("bounce_back").select("*").eq("invoice_id", invoice.dbId).order("bounce_date"),
      ]);

      exportInvoiceLedgerXlsx({
        invoiceData: {
          ...(inv || {}),
          invoice_number: inv?.invoice_number || invoice.id,
          client_name: clientRow?.client_name || "",
          entity_name: entityRow?.entity_name || "",
          dept_name: deptRow?.dept_name || "",
        },
        ledgerRows: ledger,
        osPayouts: osPayoutsRaw || [],
        paymentsRaw: paymentsRaw || [],
        cnsRaw: cnsRaw || [],
        bbRaw: bbRaw || [],
      });
    } catch (err) {
      console.error("Excel export error:", err);
      alert("Export failed: " + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handlePdfDownload = async () => {
    if (!invoice?.dbId) return;
    setExportLoading(true);
    try {
      const { data: inv } = await supabase
        .from("invoices").select("*").eq("id", invoice.dbId).single();

      const [{ data: clientRow }, { data: entityRow }, { data: deptRow }] = await Promise.all([
        inv?.client_id
          ? supabase.from("clients_master").select("client_name").eq("id", inv.client_id).maybeSingle()
          : Promise.resolve({ data: null }),
        inv?.entity_id
          ? supabase.from("entity_master").select("entity_name").eq("id", inv.entity_id).maybeSingle()
          : Promise.resolve({ data: null }),
        inv?.department_id
          ? supabase.from("departments_master").select("dept_name").eq("id", inv.department_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      exportInvoicePDF({
        invoiceData: {
          ...(inv || {}),
          invoice_number: inv?.invoice_number || invoice.id,
          client_name: clientRow?.client_name || "",
          entity_name: entityRow?.entity_name || "",
          dept_name: deptRow?.dept_name || "",
        },
        outstanding,
        ledgerRows: ledger,
      });
    } catch (err) {
      console.error("PDF export error:", err);
      alert("PDF failed: " + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  if (!invoice) return null;

  const totalCN = ledger
    .filter(r => r.type === "Credit Note / Bad Debt")
    .reduce((s, r) => s + Math.abs(r.amount), 0);

  const totalOsNet = osPayouts.reduce((s, p) =>
    s + Math.max(
      Number(p.amount_paid || 0)
      - Number(p.bounce_back_amount || 0)
      - Number(p.income_tax_deducted || 0),
      0
    ), 0
  );

  const totalOsBB = osPayouts.reduce((s, p) =>
    s + Number(p.bounce_back_amount || 0), 0
  );

  const netEmployee = opening - totalCN - totalOsNet;
  const netEmpLeft = invoiceEmpCount - osEmpPaid + osEmpBB - cnEmpCount;
  const osPaidTotal = getOsPaidTotal();
  const leftToPay = netInHand - osPaidTotal;

  const enhancedStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
    
    .ledger-root { font-family: 'Inter', sans-serif; }
    
    .summary-card {
      position: relative; overflow: hidden;
      background: #ffffff; border-radius: 18px;
      border: 1px solid #e5e7eb; padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .summary-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0;
      height: 3px; border-radius: 18px 18px 0 0;
      transition: height 0.3s ease;
    }
    .summary-card:hover::before { height: 5px; }
    .summary-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.03);
      transform: translateY(-3px);
    }
    .summary-card.blue::before { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
    .summary-card.emerald::before { background: linear-gradient(90deg, #059669, #34d399); }
    .summary-card.violet::before { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
    .summary-card.rose::before { background: linear-gradient(90deg, #e11d48, #fb7185); }
    .summary-card.amber::before { background: linear-gradient(90deg, #d97706, #fbbf24); }
    .summary-card.orange::before { background: linear-gradient(90deg, #ea580c, #fb923c); }
    .summary-card.sky::before { background: linear-gradient(90deg, #0ea5e9, #38bdf8); }
    
    .ledger-row {
      background: #ffffff; border-radius: 16px;
      border: 1px solid #e5e7eb; padding: 20px; margin-bottom: 12px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative; overflow: hidden;
    }
    .ledger-row::before {
      content: ''; position: absolute; left: 0; top: 0; bottom: 0;
      width: 3px; border-radius: 16px 0 0 16px;
      transition: width 0.3s ease;
    }
    .ledger-row:hover::before { width: 6px; }
    .ledger-row:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.03);
      transform: translateX(4px); border-color: #d1d5db;
    }
    .ledger-row.tds::before { background: linear-gradient(180deg, #ea580c, #fb923c); }
    .ledger-row.payment-received::before { background: linear-gradient(180deg, #059669, #34d399); }
    .ledger-row.bounce-back::before { background: linear-gradient(180deg, #e11d48, #fb7185); }
    .ledger-row.credit-note::before { background: linear-gradient(180deg, #d97706, #fbbf24); }
    .ledger-row.billable::before { background: linear-gradient(180deg, #4f46e5, #818cf8); }
    .ledger-row.payment-made::before { background: linear-gradient(180deg, #6b7280, #9ca3af); }
    
    .icon-hover {
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .ledger-row:hover .icon-hover {
      transform: scale(1.15) rotate(5deg);
    }
    
    .amount-hover {
      transition: transform 0.2s ease;
    }
    .ledger-row:hover .amount-hover {
      transform: scale(1.05);
    }
    
    .kpi-card {
      background: #ffffff; border-radius: 16px;
      border: 1px solid #e5e7eb; padding: 20px; text-align: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative; overflow: hidden;
    }
    .kpi-card::after {
      content: ''; position: absolute; bottom: 0; left: 0; right: 0;
      height: 2px; border-radius: 0 0 16px 16px;
      transition: height 0.3s ease, opacity 0.3s ease;
      opacity: 0.6;
    }
    .kpi-card:hover::after { height: 4px; opacity: 1; }
    .kpi-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); transform: translateY(-2px); }
    .kpi-card.blue::after { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
    .kpi-card.emerald::after { background: linear-gradient(90deg, #059669, #34d399); }
    .kpi-card.violet::after { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
    .kpi-card.amber::after { background: linear-gradient(90deg, #d97706, #fbbf24); }
    .kpi-card.rose::after { background: linear-gradient(90deg, #e11d48, #fb7185); }
    .kpi-card.sky::after { background: linear-gradient(90deg, #0ea5e9, #38bdf8); }
    
    .kpi-value {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 24px; font-weight: 700; line-height: 1;
      margin-bottom: 6px; transition: transform 0.3s ease;
    }
    .kpi-card:hover .kpi-value { transform: scale(1.05); }
    
    .page-header {
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border-radius: 18px; border: 1px solid #e2e8f0;
      padding: 20px 24px; margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
    }
    
    .btn-enhanced {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px; border-radius: 12px;
      font-size: 13px; font-weight: 600;
      font-family: 'Inter', sans-serif; border: none;
      cursor: pointer; transition: all 0.2s ease;
      position: relative; overflow: hidden;
    }
    .btn-enhanced:active { transform: scale(0.96); }
    .btn-enhanced:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    
    .icon-btn-enhanced {
      width: 40px; height: 40px; border-radius: 12px;
      display: inline-flex; align-items: center; justify-content: center;
      border: 1.5px solid #e5e7eb; background: #f9fafb;
      color: #6b7280; cursor: pointer; transition: all 0.2s ease;
    }
    .icon-btn-enhanced:hover {
      border-color: #3b82f6; color: #3b82f6;
      background: #eff6ff; transform: translateY(-1px);
    }
    .icon-btn-enhanced:active { transform: scale(0.95); }
  `;

  return (
    <div className="ledger-root p-6 max-w-3xl mx-auto">
      <style>{enhancedStyles}</style>

      {showDeleteModal && (
        <DeleteModal
          invoiceId={invoice.id}
          onConfirm={handleDeleteInvoice}
          onCancel={() => setShowDeleteModal(false)}
          loading={deleteLoading}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.setActiveTab?.("dashboard")}
            className="icon-btn-enhanced"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Ledger View
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
              Invoice: <span className="font-semibold font-mono text-gray-700">{invoice.id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(() => {
            const rowLocked = isLocked(invoiceDate);
            const lockedByDate = rowLocked && !isAdmin;
            return (
              <button
                onClick={() => { if (!lockedByDate) handleCompleteInvoice(); }}
                disabled={completeLoading || lockedByDate}
                title={lockedByDate ? "Locked — entries older than 45 days can only be edited by an Admin." : undefined}
                className={`btn-enhanced ${lockedByDate ? "bg-gray-400 cursor-not-allowed" : isCompleted ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"} text-white`}
              >
                {lockedByDate ? <Lock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {lockedByDate ? "Locked" : completeLoading ? "Updating..." : isCompleted ? "Move To Active" : "Mark Complete"}
              </button>
            );
          })()}

          <button
            onClick={fetchLedger}
            disabled={loading}
            className="icon-btn-enhanced"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handlePdfDownload}
            disabled={exportLoading || loading}
            className="btn-enhanced bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FileDown className="w-4 h-4" />
            {exportLoading ? "..." : "PDF"}
          </button>

          <button
            onClick={handleExcelDownload}
            disabled={exportLoading || loading}
            className="btn-enhanced bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exportLoading ? "..." : "Excel"}
          </button>

          {(() => {
            const rowLocked = isLocked(invoiceDate);
            const lockedByDate = rowLocked && !isAdmin;
            return (
              <button
                onClick={() => { if (!lockedByDate) setShowDeleteModal(true); }}
                disabled={deleteLoading || lockedByDate}
                className={`btn-enhanced ${lockedByDate ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"} text-white`}
              >
                {lockedByDate ? <Lock className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                {lockedByDate ? "Locked" : "Delete"}
              </button>
            );
          })()}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SUMMARY CARDS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div
        className={`grid gap-4 mb-6 ${
          invoiceTds > 0 ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        <div className="summary-card blue">
          <div className="p-3 rounded-xl mb-3 inline-block" style={{ background: "#dbeafe" }}>
            <Wallet className="w-5 h-5" style={{ color: "#3b82f6" }} />
          </div>
          <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#6b7280" }}>
            Opening Balance
          </div>
          <div className="text-3xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#1e40af" }}>
            {fmt(opening)}
          </div>
          <div className="text-xs font-medium flex items-center gap-1" style={{ color: "#9ca3af" }}>
            <BarChart3 className="w-3 h-3" />
            Invoice value (original)
          </div>
        </div>

        {invoiceTds > 0 && (
          <div className="summary-card orange">
            <div className="p-3 rounded-xl mb-3 inline-block" style={{ background: "#ffedd5" }}>
              <Receipt className="w-5 h-5" style={{ color: "#ea580c" }} />
            </div>
            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#6b7280" }}>
              TDS Deducted
            </div>
            <div className="text-3xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#c2410c" }}>
              − {fmt(invoiceTds)}
            </div>
            <div className="text-xs font-medium flex items-center gap-1" style={{ color: "#9ca3af" }}>
              <Shield className="w-3 h-3" />
              Deducted at source by client
            </div>
          </div>
        )}

        <div className={`summary-card ${outstanding <= 0 ? "emerald" : "violet"}`}>
          <div className="p-3 rounded-xl mb-3 inline-block" style={{ background: outstanding <= 0 ? "#d1fae5" : "#ede9fe" }}>
            <BadgeCheck className="w-5 h-5" style={{ color: outstanding <= 0 ? "#059669" : "#7c3aed" }} />
          </div>
          <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#6b7280" }}>
            Final Outstanding
          </div>
          <div className="text-3xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: outstanding <= 0 ? "#047857" : "#6d28d9" }}>
            {fmt(Math.max(outstanding, 0))}
          </div>
          <div className="text-xs font-medium flex items-center gap-1" style={{ color: outstanding <= 0 ? "#10b981" : "#8b5cf6" }}>
            {outstanding <= 0 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {outstanding <= 0 ? "Fully paid" : "Amount still owed"}
          </div>
        </div>
      </div>

      {/* ── Employee Count KPI ── */}
      {invoiceEmpCount > 0 && (
        <div className="mb-6 bg-gradient-to-br from-sky-50 to-indigo-50 border-2 border-sky-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-sky-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Employee Count Summary
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="kpi-card sky">
              <p className="text-xs text-gray-500 mb-1">Invoice Emp</p>
              <p className="kpi-value" style={{ color: "#0284c7" }}>{invoiceEmpCount}</p>
              <p className="text-xs text-sky-400 mt-0.5">Billed to client</p>
            </div>

            <div className="kpi-card violet">
              <p className="text-xs text-gray-500 mb-1">OS Paid</p>
              <p className="kpi-value" style={{ color: "#7c3aed" }}>
                − {osEmpPaid}
              </p>
              {osEmpBB > 0 && (
                <p className="text-xs text-emerald-500 mt-0.5">↩ BB: +{osEmpBB}</p>
              )}
              <p className="text-xs text-violet-400 mt-0.5">Salaries disbursed</p>
            </div>

            <div className="kpi-card amber">
              <p className="text-xs text-gray-500 mb-1">CN Emp</p>
              <p className="kpi-value" style={{ color: "#d97706" }}>
                {cnEmpCount > 0 ? `− ${cnEmpCount}` : "—"}
              </p>
              <p className="text-xs text-amber-400 mt-0.5">Credit noted out</p>
            </div>

            <div className={`kpi-card ${netEmpLeft === 0 ? "emerald" : netEmpLeft > 0 ? "amber" : "rose"}`}>
              <p className="text-xs text-gray-500 mb-1 font-semibold">Net Emp Left</p>
              <p className="kpi-value" style={{ color: netEmpLeft === 0 ? "#059669" : netEmpLeft > 0 ? "#d97706" : "#e11d48" }}>
                {netEmpLeft}
              </p>
              <p className="text-xs mt-0.5" style={{ color: netEmpLeft === 0 ? "#10b981" : netEmpLeft > 0 ? "#f59e0b" : "#fb7185" }}>
                {netEmpLeft === 0 ? "✅ All paid"
                : netEmpLeft > 0 ? "Pending payout"
                : "⚠️ Over-disbursed"}
              </p>
            </div>
          </div>

          <p className="text-xs text-sky-400 mt-3 text-center font-mono">
            {invoiceEmpCount} (billed)
            {osEmpPaid > 0 ? ` − ${osEmpPaid} (OS paid)` : ""}
            {osEmpBB > 0 ? ` + ${osEmpBB} (BB)` : ""}
            {cnEmpCount > 0 ? ` − ${cnEmpCount} (CN)` : ""}
            {" "}= {netEmpLeft} left
          </p>
        </div>
      )}

      {/* ── Net Employee KPI ── */}
      <div className="mb-6 bg-gradient-to-br from-sky-50 to-indigo-50 border-2 border-sky-200 rounded-2xl p-5">
        <p className="text-xs font-bold text-sky-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
          Net Employee Summary
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="kpi-card sky">
            <p className="text-xs text-gray-500 mb-1">Invoice Value</p>
            <p className="kpi-value" style={{ color: "#0284c7", fontSize: "20px" }}>{fmt(opening)}</p>
          </div>

          <div className="kpi-card amber">
            <p className="text-xs text-gray-500 mb-1">− CN / Bad Debt</p>
            <p className="kpi-value" style={{ color: "#d97706", fontSize: "20px" }}>− {fmt(totalCN)}</p>
          </div>

          <div className="kpi-card violet">
            <p className="text-xs text-gray-500 mb-1">− OS Paid Net</p>
            <p className="kpi-value" style={{ color: "#7c3aed", fontSize: "20px" }}>− {fmt(totalOsNet)}</p>
            {totalOsBB > 0 && (
              <p className="text-xs text-emerald-500 mt-0.5">↩ BB incl. {fmt(totalOsBB)}</p>
            )}
          </div>

          <div className={`kpi-card ${netEmployee >= 0 ? "emerald" : "rose"}`}>
            <p className="text-xs text-gray-500 mb-1 font-semibold">Net Employee</p>
            <p className="kpi-value" style={{ color: netEmployee >= 0 ? "#059669" : "#e11d48", fontSize: "20px" }}>
              {fmt(netEmployee)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">After deductions</p>
          </div>
        </div>

        <p className="text-xs text-sky-500 mt-3 text-center font-mono">
          {fmt(opening)} − {fmt(totalCN)} (CN) − {fmt(totalOsNet)} (OS) = {fmt(netEmployee)}
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* NET IN HAND SUMMARY */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {netInHand > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="summary-card violet">
            <div className="p-3 rounded-xl mb-3 inline-block" style={{ background: "#ede9fe" }}>
              <Wallet className="w-5 h-5" style={{ color: "#7c3aed" }} />
            </div>
            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#6b7280" }}>
              Net in Hand
            </div>
            <div className="text-2xl font-bold mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#6d28d9" }}>
              {fmt(netInHand)}
            </div>
            <div className="text-xs font-medium" style={{ color: "#8b5cf6" }}>Total to disburse</div>
          </div>

          <div className="summary-card rose">
            <div className="p-3 rounded-xl mb-3 inline-block" style={{ background: "#ffe4e6" }}>
              <ArrowUpCircle className="w-5 h-5" style={{ color: "#e11d48" }} />
            </div>
            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#6b7280" }}>
              OS Paid Out
            </div>
            <div className="text-2xl font-bold mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#be123c" }}>
              {fmt(osPaidTotal)}
            </div>
            <div className="text-xs font-medium" style={{ color: "#fb7185" }}>3rd party paid</div>
          </div>

          <div className={`summary-card ${leftToPay <= 0 ? "emerald" : "amber"}`}>
            <div className="p-3 rounded-xl mb-3 inline-block" style={{ background: leftToPay <= 0 ? "#d1fae5" : "#fef3c7" }}>
              <ArrowDownCircle className="w-5 h-5" style={{ color: leftToPay <= 0 ? "#059669" : "#d97706" }} />
            </div>
            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#6b7280" }}>
              Left to Pay
            </div>
            <div className="text-2xl font-bold mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: leftToPay <= 0 ? "#047857" : "#b45309" }}>
              {fmt(leftToPay)}
            </div>
            <div className="text-xs font-medium" style={{ color: leftToPay < 0 ? "#ef4444" : leftToPay === 0 ? "#10b981" : "#f59e0b" }}>
              {leftToPay < 0 ? "Excess Paid" : leftToPay === 0 ? "Fully Disbursed" : "Pending Disbursal"}
            </div>
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <span
            key={type}
            className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.badge}`}
          >
            {cfg.sign !== "—" ? cfg.sign : ""} {type}
          </span>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* INVOICE LEDGER ROWS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-40" />
          <p>Loading ledger...</p>
        </div>
      ) : ledger.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-gray-50 rounded-2xl">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No transactions found</p>
          <p className="text-sm mt-1">
            Payments and adjustments will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ledger.map((row, i) => {
            const cfg = TYPE_CONFIG[row.type] || TYPE_CONFIG["Payment Made"];
            const Icon = cfg.icon;
            const isNoEffect = row.amount === 0;
            const rowClass = cfg.rowClass || "payment-made";

            return (
              <div
                key={i}
                className={`ledger-row ${rowClass}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="icon-hover p-2.5 rounded-xl flex-shrink-0" style={{ background: cfg.bg.replace('bg-', '#') === cfg.bg ? '#f3f4f6' : undefined }}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}
                      >
                        {row.type}
                      </span>
                      {row.isBillable && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                          Billable
                        </span>
                      )}
                      {row.isOsPayout && (
                        <span className="text-xs bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-medium">
                          OS Payout
                        </span>
                      )}
                      {row.bbAmt > 0 && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                          ↩ BB
                        </span>
                      )}
                    </div>

                    {isNoEffect ? (
                      <div className="space-y-1">
                        <p className="text-xl font-bold text-rose-600 amount-hover">
                          - {fmt(row.displayAmount)}
                        </p>
                        <p className="text-sm text-gray-500 italic">
                          No effect on outstanding
                        </p>
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 border border-rose-100">
                          <ArrowLeftRight className="w-3 h-3 text-rose-500" />
                          <span className="text-xs font-medium text-rose-600">
                            Bank Deduction
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p
                        className={`text-base font-bold amount-hover ${
                          row.amount < 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {row.amount > 0 ? "+" : ""}
                        {fmt(Math.abs(row.amount))}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(row.date)}
                      </span>
                      {row.ref && (
                        <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded">
                          {row.ref}
                        </span>
                      )}
                      {row.expenseHead && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {row.expenseHead}
                        </span>
                      )}
                    </div>

                    {row.remarks && (
                      <p className="text-xs text-gray-500 mt-1.5 truncate">
                        💬 {row.remarks}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400 mb-0.5">Balance</p>
                    <p
                      className={`font-bold text-base amount-hover ${
                        row.balance <= 0 ? "text-emerald-600" : "text-gray-900"
                      }`}
                    >
                      {fmt(Math.max(row.balance, 0))}
                    </p>
                    {row.balance < 0 && (
                      <p className="text-xs text-emerald-500 mt-0.5">
                        Overpaid
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── OS PAYOUTS DEDICATED SECTION ── */}
      <OSPayoutsSection osPayouts={osPayouts} netInHand={netInHand} />

      {/* ── Footer Summary ── */}
      {ledger.length > 0 && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Received</p>
              <p className="font-bold text-emerald-600">
                {fmt(
                  ledger
                    .filter((r) => r.type === "Payment Received")
                    .reduce((s, r) => s + Math.abs(r.amount), 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Bounced</p>
              <p className="font-bold text-rose-600">
                {fmt(
                  ledger
                    .filter((r) => r.type === "Bounce Back")
                    .reduce((s, r) => s + r.amount, 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Credit Notes</p>
              <p className="font-bold text-amber-600">
                {fmt(
                  ledger
                    .filter((r) => r.type === "Credit Note / Bad Debt")
                    .reduce((s, r) => s + Math.abs(r.amount), 0)
                )}
              </p>
            </div>
            {invoiceTds > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">TDS Deducted</p>
                <p className="font-bold text-orange-600">− {fmt(invoiceTds)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LedgerPage;