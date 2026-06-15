import React, { useState, useEffect } from "react";
import supabase from "../lib/supabaseClient";
import {
  X,
  ArrowRight,
  CreditCard,
  Calendar,
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Building2,
  Tag,
  Layers,
  AlertTriangle,
  Info,
  ChevronDown,
  Eye,
} from "lucide-react";
import ViewPaymentModal from "./ViewPaymentModal";
import { usePerms } from "../context/PermissionsContext";

/* ─────────────────────────────────────────────
   Tiny helpers
───────────────────────────────────────────── */
const fmt = (v) =>
  `₹ ${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

const Label = ({ children, required }) => (
  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
    {children}
    {required && <span className="text-rose-500 ml-0.5">*</span>}
  </label>
);

const inputCls =
  "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all duration-200";

const selectCls =
  "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all duration-200 appearance-none cursor-pointer";

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const AddPaymentMadeModal = ({ isOpen, onClose, invoice, onSaved }) => {
  const { isIntern } = usePerms?.() || {};
  /* form state */
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [banks, setBanks] = useState([]);
  const [paymentType, setPaymentType] = useState("Invoice");
  const [bankId, setBankId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [isBillable, setIsBillable] = useState(false);

  /* manual invoice search */
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceResults, setInvoiceResults] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searching, setSearching] = useState(false);

  /* view modal */
  const [viewOpen, setViewOpen] = useState(false);
  const [lastSavedPayment, setLastSavedPayment] = useState(null);

  /* ── fetch banks ── */
  useEffect(() => {
    supabase
      .from("bank_master")
      .select("id, bank_name")
      .then(({ data }) => setBanks(data || []));
  }, []);

  /* ── reset on open ── */
  useEffect(() => {
    if (!isOpen) return;
    setAmount("");
    setDate("");
    setRemarks("");
    setLoading(false);
    setIsBillable(false);
    setInvoiceSearch("");
    setInvoiceResults([]);
    setLastSavedPayment(null);

    if (invoice) {
      setInvoiceNumber(invoice.invoice_number || invoice.id || "");
      setSelectedInvoice(invoice);
    } else {
      setInvoiceNumber("");
      setSelectedInvoice(null);
    }
  }, [isOpen, invoice]);

  /* ── invoice search ── */
  useEffect(() => {
    if (paymentType !== "Invoice" || !invoiceSearch || invoice) return;
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, receivable_amount, client_id, clients_master(client_name)"
        )
        .ilike("invoice_number", `%${invoiceSearch}%`)
        .limit(8);
      setInvoiceResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [invoiceSearch, paymentType, invoice]);

  if (!isOpen) return null;

  /* ── resolved values ── */
  const resolvedInvoiceId =
    selectedInvoice?.dbId || selectedInvoice?.id || invoice?.dbId || null;
  const resolvedInvoiceNumber =
    invoiceNumber || selectedInvoice?.invoice_number || "";
  const resolvedEntity =
    selectedInvoice?.entity || invoice?.entity || "Pvt Ltd";
  const resolvedBankId = bankId || invoice?.bank_id || null;
  const isPettyCash = paymentType === "Petty Cash";

  /* ── save handler ── */
  /* ── save handler ── */
  const handleSave = async () => {
    if (isIntern) return;
    if (!amount || !date) return alert("Amount and Date are required");
    if (paymentType === "Invoice" && !resolvedInvoiceId)
      return alert("Please select an invoice");
    if (!bankId) return alert("Please select a bank");

    setLoading(true);
    try {
      const numAmount = Number(amount);

      // 1. Create software entry FIRST

      // 2. Create payment_made record linked to software entry
      const { data: savedPayment, error: payError } = await supabase
        .from("payments_made")
        .insert([
          {
            // core fields
            invoice_id: paymentType === "Invoice" ? resolvedInvoiceId : null,
            invoice_number:
              paymentType === "Invoice" ? resolvedInvoiceNumber : null,
            payment_type: paymentType,
            petty_cash: isPettyCash,
            other_payment: paymentType === "Other",
            bank_id: resolvedBankId,
            amount: numAmount, // gross amount — NOT NULL, always > 0
            transfer_amount: numAmount, // same here — triggers read this first
            payment_date: date,
            remarks: remarks || null,
            is_billable: isBillable,
            client_name:
              selectedInvoice?.client_name || invoice?.client_name || null,
            expense_head: invoice?.pay_head || null,
            // REQUIRED for triggers to work correctly:
            // pay_head = "Petty Cash"  → handle_expense_petty_cash fires
            //                            → petty_cash_entries inserted
            //                            → petty_cash_master.current_balance increased
            pay_head: isPettyCash ? "Petty Cash" : null,
            // payment_source = "BANK"  → sync_payment_made_bank fires
            //                           → bank_entries debit created
            // payment_source = "CASH"  → sync_payment_made_bank SKIPS
            //                           → no bank entry (cash spend)
            payment_source: "BANK",
            // entity + description used in bank_entry remarks
            entity: resolvedEntity,
            payment_description: isPettyCash
              ? `Petty Cash top-up — ${date}`
              : remarks || null,
          },
        ])
        .select()
        .single();

      if (payError) throw payError;

      setLastSavedPayment(savedPayment);

      alert(
        isPettyCash
          ? "✅ Petty Cash topped up — bank debited & balance increased!"
          : isBillable
          ? "✅ Billable expense saved — outstanding updated!"
          : "✅ Payment Made recorded successfully"
      );

      // ✅ FIX: Call onSaved THEN onClose — in that order.
      // onSaved triggers fetchInvoices() in Dashboard (which re-queries the view).
      // We do NOT call fetchInvoiceDetails after onClose because the modal is
      // unmounted at that point and the local state update would be discarded.
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert("❌ Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* Build a preview payment object for View modal */
  const previewPayment = {
    amount: Number(amount) || 0,
    payment_date: date,
    payment_type: paymentType,
    bank_id: resolvedBankId,
    invoice_number: resolvedInvoiceNumber,
    invoice_id: resolvedInvoiceId,
    client_name: selectedInvoice?.client_name || invoice?.client_name || null,
    remarks,
    is_billable: isBillable,
    expense_head: invoice?.pay_head || null,
  };

  /* ────────────────── RENDER ────────────────── */
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[2px]">
        <div
          className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: "96vh" }}
        >
          {/* ── HEADER ── */}
          <div
            className="relative p-6 pb-5 flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="absolute bottom-0 left-12 w-16 h-16 bg-white/5 rounded-full translate-y-6" />

            <div className="relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                    <CreditCard size={16} className="text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Payment Made
                  </h2>
                </div>
                <p className="text-indigo-300 text-xs ml-10">
                  Record an outgoing payment from bank
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewOpen(true)}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <Eye size={13} className="text-white/80" />
                  <span className="text-white/80 text-xs font-semibold">
                    View
                  </span>
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X size={15} className="text-white/80" />
                </button>
              </div>
            </div>

            {/* Invoice badge (when passed from parent) */}
            {invoice && (
              <div className="relative mt-4 flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl p-3">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <FileText size={14} className="text-indigo-200" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-none">
                    {invoice.invoice_number || invoice.id}
                  </p>
                  {invoice.client_name && (
                    <p className="text-indigo-300 text-xs mt-0.5">
                      {invoice.client_name}
                    </p>
                  )}
                </div>
                {invoice.receivable_amount != null && (
                  <div className="ml-auto text-right">
                    <p className="text-[10px] text-indigo-400">Outstanding</p>
                    <p className="text-white font-bold text-sm">
                      {fmt(invoice.receivable_amount)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── BODY ── */}
          <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
            {/* ── Payment Type ── */}
            <div>
              <Label>Payment Type</Label>
              <div className="relative">
                <select
                  value={paymentType}
                  onChange={(e) => {
                    setPaymentType(e.target.value);
                    setSelectedInvoice(null);
                    setInvoiceSearch("");
                    setInvoiceResults([]);
                    if (e.target.value !== "Invoice") setIsBillable(false);
                  }}
                  className={selectCls}
                >
                  <option value="Invoice">Invoice Payment</option>
                  <option value="Petty Cash">Petty Cash</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* ── Invoice Search (no invoice prop) ── */}
            {paymentType === "Invoice" && !invoice && (
              <div>
                <Label required>Search Invoice</Label>
                {selectedInvoice ? (
                  <div className="bg-violet-50 border border-violet-200 rounded-2xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <FileText size={14} className="text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">
                        {selectedInvoice.invoice_number}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {selectedInvoice.clients_master?.client_name || "—"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedInvoice(null);
                        setInvoiceNumber("");
                        setInvoiceSearch("");
                      }}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      placeholder="Type invoice number to search…"
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      className={`${inputCls} pl-9`}
                    />
                    {searching && (
                      <p className="text-xs text-slate-400 mt-1.5 px-1 animate-pulse">
                        Searching…
                      </p>
                    )}
                    {invoiceResults.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl mt-1.5 overflow-hidden">
                        {invoiceResults.map((inv) => (
                          <button
                            key={inv.id}
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setInvoiceNumber(inv.invoice_number);
                              setInvoiceSearch(inv.invoice_number);
                              setInvoiceResults([]);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-violet-50 transition-colors text-sm border-b border-slate-100 last:border-0 flex items-center justify-between"
                          >
                            <div>
                              <p className="font-semibold text-slate-800">
                                {inv.invoice_number}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {inv.clients_master?.client_name || "—"}
                              </p>
                            </div>
                            <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                              {fmt(inv.receivable_amount || 0)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Invoice number readonly (when prop passed) ── */}
            {paymentType === "Invoice" && invoice && (
              <div>
                <Label>Invoice Number</Label>
                <div className="relative">
                  <FileText
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={resolvedInvoiceNumber}
                    readOnly
                    className={`${inputCls} pl-9 bg-slate-100 text-slate-500 cursor-not-allowed`}
                  />
                </div>
              </div>
            )}

            {/* ── Billable Toggle ── */}
            {paymentType === "Invoice" && (
              <div>
                <Label>Billing Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBillable(false)}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all duration-200 ${
                      !isBillable
                        ? "border-slate-700 bg-slate-800 shadow-lg shadow-slate-800/20"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <XCircle
                      size={20}
                      className={
                        !isBillable ? "text-slate-300" : "text-slate-400"
                      }
                    />
                    <span
                      className={`text-xs font-bold ${
                        !isBillable ? "text-white" : "text-slate-500"
                      }`}
                    >
                      Non-Billable
                    </span>
                    <span
                      className={`text-[10px] text-center leading-tight ${
                        !isBillable ? "text-slate-400" : "text-slate-400"
                      }`}
                    >
                      Internal expense, no client impact
                    </span>
                    {!isBillable && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsBillable(true)}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all duration-200 ${
                      isBillable
                        ? "border-violet-500 bg-violet-600 shadow-lg shadow-violet-600/30"
                        : "border-slate-200 bg-slate-50 hover:border-violet-200"
                    }`}
                  >
                    <CheckCircle
                      size={20}
                      className={
                        isBillable ? "text-violet-200" : "text-slate-400"
                      }
                    />
                    <span
                      className={`text-xs font-bold ${
                        isBillable ? "text-white" : "text-slate-500"
                      }`}
                    >
                      Billable
                    </span>
                    <span
                      className={`text-[10px] text-center leading-tight ${
                        isBillable ? "text-violet-300" : "text-slate-400"
                      }`}
                    >
                      Client owes more — updates outstanding
                    </span>
                    {isBillable && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-yellow-400" />
                    )}
                  </button>
                </div>

                {isBillable && (
                  <div className="mt-2 flex items-start gap-2 bg-violet-50 border border-violet-100 rounded-xl p-3">
                    <AlertTriangle
                      size={14}
                      className="text-violet-500 flex-shrink-0 mt-0.5"
                    />
                    <p className="text-xs text-violet-700 leading-relaxed">
                      <strong>Billable expense:</strong> The amount you enter
                      will be <strong>added to the invoice outstanding</strong>.
                      The client will owe more. Both your bank and the
                      receivable will reflect this.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Bank ── */}
            <div>
              <Label required>Select Bank</Label>
              <div className="relative">
                <Building2
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <select
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                  className={`${selectCls} pl-9`}
                >
                  <option value="">Choose bank account…</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* ── Amount + Date ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>Amount (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`${inputCls} pl-7`}
                  />
                </div>
              </div>
              <div>
                <Label required>Payment Date</Label>
                <div className="relative">
                  <Calendar
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>
            </div>

            {/* Amount preview */}
            {amount && Number(amount) > 0 && (
              <div
                className={`rounded-2xl p-3 flex items-center justify-between ${
                  isBillable
                    ? "bg-violet-50 border border-violet-100"
                    : "bg-emerald-50 border border-emerald-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers
                    size={14}
                    className={
                      isBillable ? "text-violet-500" : "text-emerald-500"
                    }
                  />
                  <span
                    className={`text-xs font-semibold ${
                      isBillable ? "text-violet-700" : "text-emerald-700"
                    }`}
                  >
                    {isBillable ? "Client will owe +" : "Bank debit —"}
                  </span>
                </div>
                <span
                  className={`text-base font-bold ${
                    isBillable ? "text-violet-700" : "text-emerald-700"
                  }`}
                >
                  {fmt(amount)}
                </span>
              </div>
            )}

            {/* ── Remarks ── */}
            <div>
              <Label>Remarks</Label>
              <div className="relative">
                <FileText
                  size={14}
                  className="absolute left-3 top-3 text-slate-400 pointer-events-none"
                />
                <textarea
                  placeholder="Optional notes…"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className={`${inputCls} pl-9 resize-none`}
                />
              </div>
            </div>

            {/* ── Info note ── */}
            {!isBillable && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <Info
                  size={14}
                  className="text-amber-500 flex-shrink-0 mt-0.5"
                />
                <p className="text-xs text-amber-700 leading-relaxed">
                  This is a <strong>non-billable</strong> outgoing payment. It
                  debits your bank but does <strong>not</strong> affect the
                  invoice outstanding amount. To charge a client, switch to{" "}
                  <strong>Billable</strong>.
                </p>
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="flex-shrink-0 px-5 pb-6 pt-3 border-t border-slate-100 flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || isIntern}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 ${
                isIntern
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : isBillable
                  ? "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/30"
                  : "bg-slate-800 hover:bg-slate-900 text-white shadow-lg shadow-slate-800/20"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  {isIntern
                    ? "Intern — View Only"
                    : isPettyCash
                    ? "Top Up Petty Cash"
                    : isBillable
                    ? "Save & Update Outstanding"
                    : "Save Payment"}
                  {!isIntern && <ArrowRight size={15} />}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── VIEW MODAL ── */}
      <ViewPaymentModal
        isOpen={viewOpen}
        onClose={() => setViewOpen(false)}
        payment={lastSavedPayment || previewPayment}
      />
    </>
  );
};

export default AddPaymentMadeModal;
