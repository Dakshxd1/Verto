import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import Card from "./ui/Card";
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
} from "lucide-react";

// ─── TYPE CONFIG ───────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  "TDS Deducted": {
    icon: TrendingDown,
    color: "text-orange-600",
    bg: "bg-orange-100",
    badge: "bg-orange-100 text-orange-700",
    sign: "-",
  },
  "Payment Received": {
    icon: TrendingDown,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    badge: "bg-emerald-100 text-emerald-700",
    sign: "-",
  },
  "Bounce Back": {
    icon: RefreshCw,
    color: "text-rose-600",
    bg: "bg-rose-100",
    badge: "bg-rose-100 text-rose-700",
    sign: "+",
  },
  "Credit Note / Bad Debt": {
    icon: FileX,
    color: "text-amber-600",
    bg: "bg-amber-100",
    badge: "bg-amber-100 text-amber-700",
    sign: "-",
  },
  "Billable Expense": {
    icon: TrendingUp,
    color: "text-indigo-600",
    bg: "bg-indigo-100",
    badge: "bg-indigo-100 text-indigo-700",
    sign: "+",
  },
  "Payment Made": {
    icon: CreditCard,
    color: "text-gray-500",
    bg: "bg-gray-100",
    badge: "bg-gray-100 text-gray-600",
    sign: "—",
  },
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

  // CHANGE 1: Build running balance — now deducts bounce_back_amount correctly
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

  // CHANGE 1: totalPaid now uses rows with BB deduction
  const totalPaid = rows.reduce((s, r) => s + r.netPaid, 0);
  const leftAmount = netInHand - totalPaid;
  const paidPct =
    netInHand > 0 ? Math.min((totalPaid / netInHand) * 100, 100) : 0;

  return (
    <div className="mt-6 rounded-2xl border-2 border-violet-200 bg-violet-50/40 overflow-hidden">
      {/* Section Header */}
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
          {/* Net-in-Hand Opening */}
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

          {/* Progress bar */}
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

          {/* Individual Payout Rows */}
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

                  {/* CHANGE 2: Updated payout row display — shows BB as green credit */}
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

                {/* Running Balance */}
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

          {/* Final Left Amount */}
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

  // ── Get invoice from global state ──
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
          `id, invoice_value, receivable_amount, invoice_number, is_completed, net_in_hand, tds`
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

      // ── Store OS payouts separately for dedicated section ──
      setOsPayouts(osPayoutsData || []);

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

      // NOTE: OS Payouts are shown in their own dedicated section below,
      // but billable ones still affect the invoice outstanding balance.
      // Now correctly deducts bounce_back_amount when calculating netAmount.
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
            bbAmt, // store for display if needed
          });
        }
        // Non-billable OS payouts do NOT appear in invoice ledger
        // They are tracked separately in the OS Payouts section
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

      // Inject TDS deduction as a ledger row (reduces outstanding like a payment)
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

  // ── Helper: Calculate OS paid total with bounce back deduction ──
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

  // ── COMPLETE/UNCOMPLETE INVOICE ─────────────────────────────────────────────
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

  // ── DELETE INVOICE ──────────────────────────────────────────────────────────
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

  // ── EXPORT HANDLERS ─────────────────────────────────────────────────────────
  // These do their own isolated fetch — completely separate from fetchLedger
  // so they can never affect the main ledger view or cause "No transactions" bug.

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

  // CHANGE 3: Pre-calculate OS Paid Total with BB deduction (used in summary cards)
  const osPaidTotal = getOsPaidTotal();
  const leftToPay = netInHand - osPaidTotal;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <DeleteModal
          invoiceId={invoice.id}
          onConfirm={handleDeleteInvoice}
          onCancel={() => setShowDeleteModal(false)}
          loading={deleteLoading}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.setActiveTab?.("dashboard")}
            className="p-2 rounded-xl hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ledger View</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Invoice: <span className="font-semibold">{invoice.id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCompleteInvoice}
            disabled={completeLoading}
            className={`flex items-center gap-2 px-3 py-2 text-sm text-white rounded-xl transition disabled:opacity-50 ${
              isCompleted
                ? "bg-amber-500 hover:bg-amber-600"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {completeLoading
              ? "Updating..."
              : isCompleted
              ? "Move To Active"
              : "Mark Complete"}
          </button>

          <button
            onClick={fetchLedger}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handlePdfDownload}
            disabled={exportLoading || loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown className="w-4 h-4" />
            {exportLoading ? "..." : "PDF"}
          </button>

          <button
            onClick={handleExcelDownload}
            disabled={exportLoading || loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exportLoading ? "..." : "Excel"}
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={deleteLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-red-600 rounded-xl hover:bg-red-700 transition disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete Invoice
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div
        className={`grid gap-4 mb-6 ${
          invoiceTds > 0 ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">
            Opening Balance
          </p>
          <p className="text-2xl font-bold text-blue-700">{fmt(opening)}</p>
          <p className="text-xs text-blue-400 mt-1">Invoice value (original)</p>
        </div>

        {invoiceTds > 0 && (
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
            <p className="text-xs text-orange-600 font-semibold uppercase tracking-wider mb-1">
              TDS Deducted
            </p>
            <p className="text-2xl font-bold text-orange-700">
              − {fmt(invoiceTds)}
            </p>
            <p className="text-xs text-orange-400 mt-1">
              Deducted at source by client
            </p>
          </div>
        )}

        <div
          className={`rounded-2xl p-4 border ${
            outstanding <= 0
              ? "bg-emerald-50 border-emerald-100"
              : "bg-purple-50 border-purple-100"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
              outstanding <= 0 ? "text-emerald-600" : "text-purple-600"
            }`}
          >
            Final Outstanding
          </p>
          <p
            className={`text-2xl font-bold ${
              outstanding <= 0 ? "text-emerald-700" : "text-purple-700"
            }`}
          >
            {fmt(Math.max(outstanding, 0))}
          </p>
          <p
            className={`text-xs mt-1 ${
              outstanding <= 0 ? "text-emerald-400" : "text-purple-400"
            }`}
          >
            {outstanding <= 0 ? "✅ Fully paid" : "Amount still owed"}
          </p>
        </div>
      </div>

      {/* ── Net in Hand Summary (show for any OS invoice, even before payouts) ── */}
      {/* ✅ FIX: Changed condition from osPayouts.length > 0 to netInHand > 0 */}
      {netInHand > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-3 text-center">
            <p className="text-xs text-violet-600 font-semibold uppercase tracking-wider mb-1">
              Net in Hand
            </p>
            <p className="text-lg font-bold text-violet-700">
              {fmt(netInHand)}
            </p>
            <p className="text-xs text-violet-400 mt-0.5">Total to disburse</p>
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-center">
            <p className="text-xs text-rose-600 font-semibold uppercase tracking-wider mb-1">
              OS Paid Out
            </p>
            <p className="text-lg font-bold text-rose-700">
              {fmt(osPaidTotal)}
            </p>
            <p className="text-xs text-rose-400 mt-0.5">3rd party paid</p>
          </div>
          <div
            className={`rounded-2xl p-3 text-center border ${
              leftToPay <= 0
                ? "bg-emerald-50 border-emerald-100"
                : "bg-amber-50 border-amber-100"
            }`}
          >
            <p
              className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                leftToPay <= 0 ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              Left to Pay
            </p>
            <p
              className={`text-lg font-bold ${
                leftToPay <= 0 ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {fmt(leftToPay)}
            </p>
            <p
              className={`text-xs mt-0.5 ${
                leftToPay < 0
                  ? "text-red-500"
                  : leftToPay === 0
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}
            >
              {leftToPay < 0
                ? "Excess Paid"
                : leftToPay === 0
                ? "Fully Disbursed"
                : "Pending Disbursal"}
            </p>
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

      {/* ── Invoice Ledger Rows ── */}
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

            return (
              <div
                key={i}
                className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${cfg.bg}`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}
                      >
                        {row.type}
                      </span>
                      {row.isBillable && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          Billable
                        </span>
                      )}
                      {row.isOsPayout && (
                        <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                          OS Payout
                        </span>
                      )}
                      {row.bbAmt > 0 && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          ↩ BB
                        </span>
                      )}
                    </div>

                    {isNoEffect ? (
                      <div className="space-y-1">
                        <p className="text-xl font-bold text-rose-600">
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
                        className={`text-base font-bold ${
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
                        <span className="text-xs text-gray-400 font-mono">
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
                      className={`font-bold text-base ${
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