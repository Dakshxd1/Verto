import React, { useState, useEffect, useRef, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowRight,
  AlertCircle,
  RefreshCcw,
  Eye,
  Trash2,
  Loader2,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";
import { usePerms } from "../context/PermissionsContext";

// ─── Inline View Panel ─────────────────────────────────────────────────────────
const BounceBackRecordsPanel = ({ onClose }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bounce_back")
      .select(
        `
        id,
        payment_ref,
        amount,
        bounce_date,
        remarks,
        bank_details,
        invoice_id,

        invoices (
          invoice_number
        )
      `
      )
      .order("bounce_date", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleDelete = async (id) => {
    setConfirmId(null);
    setDeletingId(id);
    try {
      const { error } = await supabase.rpc("delete_bounce_back_complete", {
        p_bounce_id: id,
      });
      if (error) throw error;
      window.refreshDashboard?.();
      showToast("Deleted & balances recalculated");
      await fetchRecords();
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const totalAmount = records.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "tween", duration: 0.25 }}
      className="absolute inset-0 bg-white z-10 flex flex-col rounded-2xl overflow-hidden"
    >
      {/* Panel Header */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-700 px-5 py-4 text-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-rose-100 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-semibold">Back</span>
          </button>
          <div className="w-px h-4 bg-white/30" />
          <div>
            <h3 className="text-sm font-bold">Bounce Back Records</h3>
            <p className="text-rose-200 text-xs">
              {records.length} total · ₹ {totalAmount.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-rose-100 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Records List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading...
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <RefreshCcw className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No bounce back records yet</p>
          </div>
        ) : (
          records.map((row) => (
            <div
              key={row.id}
              className={`bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm transition-opacity ${
                deletingId === row.id ? "opacity-40 pointer-events-none" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-semibold">
                      {row.payment_ref || "—"}
                    </span>
                    <span className="font-bold text-rose-600 text-sm">
                      ₹ {Number(row.amount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {row.bank_details || "—"}
                    {row.invoices?.invoice_number && (
                      <span className="text-gray-400">
                        {" "}
                        · {row.invoices.invoice_number}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {row.bounce_date && (
                      <span className="text-[10px] text-gray-400">
                        {new Date(row.bounce_date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    {row.bank_details && (
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                        {row.bank_details}
                      </span>
                    )}
                    {row.remarks && (
                      <span className="text-[10px] text-gray-400 italic truncate max-w-[120px]">
                        {row.remarks}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete / Confirm */}
                <div className="flex-shrink-0">
                  {deletingId === row.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                  ) : confirmId === row.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="px-2.5 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-2 py-1 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(row.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold border border-rose-100 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`absolute bottom-4 left-4 right-4 flex items-center gap-2 px-4 py-3 rounded-xl text-white text-xs font-semibold shadow-lg ${
              toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Main Modal ────────────────────────────────────────────────────────────────
const AddBounceBackModal = ({
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    invoiceOrPaymentRef: "",
    dateOfBounceBack: "",
    bounceBackAmount: "",
    employeeCount: "",
    remarks: "",
  });

  const [errors, setErrors] = useState({});
  const [showErrors, setShowErrors] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null); // extra info when a pay ref is picked
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState("");   // UUID – only for display
  const [selectedBankName, setSelectedBankName] = useState(""); // Text stored in bounce_back.bank_details
  const [viewOpen, setViewOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const suggestionsRef = useRef(null);
  const { canSave, canDelete, isIntern } = usePerms();

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    if (field === "invoiceOrPaymentRef") {
      searchReferences(value);
    }
  };

  // ── Live search against bounce_back_reference_search view ──────────────────
  const searchReferences = useCallback(async (query) => {
    if (!query || query.trim().length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSearchLoading(true);
    try {
      const { data } = await supabase
        .from("bounce_back_reference_search")
        .select("invoice_id, reference_value, reference_type, client_name")
        .ilike("reference_value", `%${query}%`)
        .limit(10);
      setSuggestions(data || []);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // ── When user clicks a suggestion row ──────────────────────────────────────
  const handleSelectSuggestion = (suggestion) => {
    setFormData((prev) => ({
      ...prev,
      invoiceOrPaymentRef: suggestion.reference_value,
    }));
    if (errors.invoiceOrPaymentRef)
      setErrors((prev) => ({ ...prev, invoiceOrPaymentRef: "" }));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // ── Close dropdown when clicking outside ───────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Auto-populate invoice details ──────────────────────────────────────────
  useEffect(() => {
    const fetchDetails = async () => {
      if (!formData.invoiceOrPaymentRef) {
        setSelectedDetails(null);
        setPaymentDetails(null);
        return;
      }

      let invoiceId = null;
      let paymentRow = null;

      // Try payment_ref first
      const { data: payment } = await supabase
        .from("payments_received")
        .select("invoice_id, bank_id, amount_received, payment_date, remarks")
        .eq("payment_ref", formData.invoiceOrPaymentRef)
        .maybeSingle();

      if (payment?.invoice_id) {
        invoiceId = payment.invoice_id;
        paymentRow = payment;

        // Fetch bank name for the payment
        if (payment.bank_id) {
          const { data: bm } = await supabase
            .from("bank_master")
            .select("bank_name")
            .eq("id", payment.bank_id)
            .maybeSingle();
          paymentRow = { ...payment, bank_name: bm?.bank_name || null };
        }

        setPaymentDetails(paymentRow);
      } else {
        setPaymentDetails(null);
        // Fall back to invoice_number
        const { data: inv } = await supabase
          .from("invoices")
          .select("id")
          .eq("invoice_number", formData.invoiceOrPaymentRef)
          .maybeSingle();
        invoiceId = inv?.id;
      }

      if (!invoiceId) {
        setSelectedDetails(null);
        return;
      }

      const { data } = await supabase
        .from("outstanding_invoice_view")
        .select("*")
        .eq("id", invoiceId)
        .maybeSingle();

      if (!data) {
        setSelectedDetails(null);
        return;
      }

      setSelectedDetails({
        invoice_id: data.id,
        bank_id: payment?.bank_id || null,
        invoiceNumber: data.invoice_number,
        invoiceDate: data.invoice_date,
        client: data.client_name,
        ledger: data.ledger_name,
        department: data.dept_name,
        entity: data.entity_name,
        payHead: data.pay_head,
        employeeCount: data.employee_count,
        status: data.calculated_status || data.status,
        agingBucket: data.aging_bucket,
        daysOverdue: data.days_overdue,
        receivableAmount: data.receivable_amount || 0,
        amountReceived: data.amount_received || 0,
        bounceAmount: data.bounce_amount || 0,
        netReceived: data.net_received || 0,
        originalAmount: data.receivable_amount || 0,
        amountPayable: data.outstanding || 0,
        bankBalance: 0,
      });
    };

    fetchDetails();
  }, [formData.invoiceOrPaymentRef]);

  // ── Load bank master for the dropdown ──────────────────────────────────────
  useEffect(() => {
    supabase
      .from("bank_master")
      .select("id, bank_name")
      .then(({ data }) => setBanks(data || []));
  }, []);

  const calculateImpact = () => {
    if (!selectedDetails || !formData.bounceBackAmount) return null;
    const bbAmount = parseFloat(formData.bounceBackAmount);
    return {
      newAmountPayable: selectedDetails.amountPayable + bbAmount,
      newBankBalance: (selectedDetails.bankBalance || 0) - bbAmount,
    };
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.invoiceOrPaymentRef.trim())
      newErrors.invoiceOrPaymentRef =
        "Invoice number or payment reference is required";
    if (!formData.dateOfBounceBack)
      newErrors.dateOfBounceBack = "Date of bounce back is required";
    if (!selectedBankId)
      newErrors.bankDetails = "Bank details are required";
    if (!formData.bounceBackAmount)
      newErrors.bounceBackAmount = "Bounce back amount is required";
    if (
      selectedDetails?.department === "Operations" &&
      !formData.employeeCount
    )
      newErrors.employeeCount =
        "Employee count is required for OS department";
    if (
      formData.bounceBackAmount &&
      parseFloat(formData.bounceBackAmount) <= 0
    )
      newErrors.bounceBackAmount = "Amount must be greater than 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setShowErrors(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // ------------------------------------------------------------------
      // Resolve bank_id for bank_entries / software_entries
      // Priority: invoice.bank_id → payment.bank_id → selected dropdown
      // ------------------------------------------------------------------
      let resolvedBankId = selectedDetails?.bank_id || selectedBankId;

      // If invoice had no bank_id, fall back to dropdown selection
      if (!resolvedBankId) resolvedBankId = selectedBankId;

      // ------------------------------------------------------------------
      // 1. Insert bounce_back
      //    bank_details = bank NAME (text), NOT bank_id (uuid)
      // ------------------------------------------------------------------
      const { data: insertedBounce, error } = await supabase
        .from("bounce_back")
        .insert([
          {
            invoice_id: selectedDetails?.invoice_id || null,
            payment_ref: formData.invoiceOrPaymentRef,
            amount: Number(formData.bounceBackAmount),
            bounce_date: formData.dateOfBounceBack,
            bank_details: selectedBankName, // ← TEXT name, not UUID
            remarks: formData.remarks,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // ------------------------------------------------------------------
      // 2. Bank entry (debit) — linked via bounce_back_id so delete cascades
      //    NOTE: amount stored as positive; type='debit' signals direction
      // ------------------------------------------------------------------
      if (resolvedBankId) {
        await supabase.from("bank_entries").insert([
          {
            bank_id:        resolvedBankId,
            amount:         Number(formData.bounceBackAmount),  // positive, type=debit
            date:           formData.dateOfBounceBack,
            type:           "debit",
            entry_type:     "bounce_back",
            remarks:        "Bounce Back",
            invoice_id:     selectedDetails?.invoice_id || null,
            bounce_back_id: insertedBounce.id,               // ← links for cascade delete
          },
        ]);

        // ----------------------------------------------------------------
        // 3. Software entry (debit) — also linked via bounce_back_id
        // ----------------------------------------------------------------
        await supabase.from("software_entries").insert([
          {
            bank_id:        resolvedBankId,
            amount:         Number(formData.bounceBackAmount),  // positive
            date:           formData.dateOfBounceBack,
            remarks:        "Bounce Back",
            invoice_id:     selectedDetails?.invoice_id || null,
            bounce_back_id: insertedBounce.id,               // ← links for cascade delete
          },
        ]);
      }

      // ------------------------------------------------------------------
      // 4. Recalculate invoice amount_received if invoice is linked
      // ------------------------------------------------------------------
      if (selectedDetails?.invoice_id) {
        const { data: inv } = await supabase
          .from("invoices")
          .select("amount_received")
          .eq("id", selectedDetails.invoice_id)
          .single();

        const newReceived = Math.max(
          0,
          (inv?.amount_received || 0) - Number(formData.bounceBackAmount)
        );

        await supabase
          .from("invoices")
          .update({ amount_received: newReceived })
          .eq("id", selectedDetails.invoice_id);
      }

      alert("✅ Bounce Back saved");
      window.refreshDashboard?.();
      resetForm();
      onClose();
    } catch (err) {
      alert("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      invoiceOrPaymentRef: "",
      dateOfBounceBack: "",
      bounceBackAmount: "",
      employeeCount: "",
      remarks: "",
    });
    setSelectedDetails(null);
    setPaymentDetails(null);
    setSelectedBankId("");
    setSelectedBankName("");
    setErrors({});
    setShowErrors(false);
    setViewOpen(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const ErrorMessage = ({ error }) => {
    if (!showErrors || !error) return null;
    return (
      <div className="flex items-center mt-1 text-xs text-rose-600">
        <AlertCircle className="w-3 h-3 mr-1" />
        {error}
      </div>
    );
  };

  const impact = calculateImpact();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden relative"
          >
            {/* ── Inline view panel slides over form ── */}
            <AnimatePresence>
              {viewOpen && (
                <BounceBackRecordsPanel onClose={() => setViewOpen(false)} />
              )}
            </AnimatePresence>

            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-rose-600 to-pink-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">+ ADD BOUNCE BACK</h2>
                  <p className="text-rose-100 text-sm mt-1">
                    Record payment bounce back details
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setViewOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold border border-white/30 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Records
                  </button>
                  <button
                    onClick={handleClose}
                    className="text-rose-100 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Form ── */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Reference Details */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-4 flex items-center">
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Reference Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 relative" ref={suggestionsRef}>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Enter Invoice Number or Payment Reference{" "}
                        <span className="text-rose-600">*</span>
                      </label>

                      {/* Input */}
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.invoiceOrPaymentRef}
                          onChange={(e) => handleChange("invoiceOrPaymentRef", e.target.value)}
                          onFocus={() => {
                            if (suggestions.length > 0) setShowSuggestions(true);
                          }}
                          autoComplete="off"
                          className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 pr-9 ${
                            showErrors && errors.invoiceOrPaymentRef
                              ? "border-rose-500"
                              : "border-gray-300"
                          }`}
                          placeholder="INV-2023001 or UI-040526-01"
                        />
                        {searchLoading && (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400 absolute right-3 top-3" />
                        )}
                      </div>

                      {/* Rich dropdown */}
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                          {suggestions.map((s, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelectSuggestion(s)}
                              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-sm font-semibold text-gray-800 truncate">
                                  {s.reference_value}
                                </span>
                                {s.client_name && (
                                  <span className="text-xs text-gray-400 truncate">
                                    · {s.client_name}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`ml-2 flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  s.reference_type === "invoice"
                                    ? "bg-blue-100 text-blue-600"
                                    : "bg-emerald-100 text-emerald-600"
                                }`}
                              >
                                {s.reference_type === "invoice" ? "Invoice" : "Pay Ref"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Linked invoice confirmation */}
                      {selectedDetails?.invoiceNumber && (
                        <div className="mt-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-xs font-medium">
                          ✅ Linked Invoice: {selectedDetails.invoiceNumber}
                        </div>
                      )}

                      <ErrorMessage error={errors.invoiceOrPaymentRef} />
                      <p className="text-xs text-gray-500 mt-1">Rest details auto pop up</p>
                    </div>
                  </div>

                  {selectedDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-blue-200 space-y-3"
                    >
                      {/* ── Payment Ref Sub-card (only when a pay ref was entered) ── */}
                      {paymentDetails && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">
                            Payment Reference Details
                          </p>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Payment Date</p>
                              <p className="font-semibold text-gray-900 text-xs mt-0.5">
                                {paymentDetails.payment_date
                                  ? new Date(paymentDetails.payment_date).toLocaleDateString("en-IN", {
                                      day: "2-digit", month: "short", year: "numeric",
                                    })
                                  : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Amount Received</p>
                              <p className="font-bold text-emerald-600 text-xs mt-0.5">
                                ₹ {Number(paymentDetails.amount_received || 0).toLocaleString("en-IN")}
                              </p>
                            </div>
                            {paymentDetails.bank_name && (
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Bank</p>
                                <p className="font-semibold text-gray-900 text-xs mt-0.5">
                                  {paymentDetails.bank_name}
                                </p>
                              </div>
                            )}
                            {paymentDetails.remarks && (
                              <div className="col-span-2">
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Remarks</p>
                                <p className="font-semibold text-gray-700 text-xs mt-0.5 truncate">
                                  {paymentDetails.remarks}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── Invoice Info Row ── */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Invoice No.</p>
                          <p className="font-mono font-bold text-gray-900 text-xs mt-0.5">
                            {selectedDetails.invoiceNumber}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Invoice Date</p>
                          <p className="font-semibold text-gray-900 text-xs mt-0.5">
                            {selectedDetails.invoiceDate
                              ? new Date(selectedDetails.invoiceDate).toLocaleDateString("en-IN", {
                                  day: "2-digit", month: "short", year: "numeric",
                                })
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Status</p>
                          <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            selectedDetails.status === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : selectedDetails.status === "overdue"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {selectedDetails.agingBucket || selectedDetails.status || "—"}
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Client</p>
                          <p className="font-semibold text-gray-900 text-xs mt-0.5 truncate">
                            {selectedDetails.client}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Department</p>
                          <p className="font-semibold text-gray-900 text-xs mt-0.5">
                            {selectedDetails.department}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Entity</p>
                          <p className="font-semibold text-gray-900 text-xs mt-0.5">
                            {selectedDetails.entity}
                          </p>
                        </div>
                        {selectedDetails.payHead && (
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Pay Head</p>
                            <p className="font-semibold text-gray-900 text-xs mt-0.5">
                              {selectedDetails.payHead}
                            </p>
                          </div>
                        )}
                        {selectedDetails.employeeCount > 0 && (
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Employee Count</p>
                            <p className="font-semibold text-gray-900 text-xs mt-0.5">
                              {selectedDetails.employeeCount}
                            </p>
                          </div>
                        )}
                        {selectedDetails.daysOverdue > 0 && (
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Days Overdue</p>
                            <p className="font-bold text-red-600 text-xs mt-0.5">
                              {selectedDetails.daysOverdue} days
                            </p>
                          </div>
                        )}
                      </div>

                      {/* ── Financial Summary Row ── */}
                      <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3">
                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-2">
                          Financial Summary
                        </p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Receivable Amount</p>
                            <p className="font-bold text-gray-900 text-sm mt-0.5">
                              ₹ {Number(selectedDetails.receivableAmount || 0).toLocaleString("en-IN")}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Amount Received</p>
                            <p className="font-bold text-emerald-600 text-sm mt-0.5">
                              ₹ {Number(selectedDetails.amountReceived || 0).toLocaleString("en-IN")}
                            </p>
                          </div>
                          {selectedDetails.bounceAmount > 0 && (
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Bounce Amount</p>
                              <p className="font-bold text-rose-600 text-sm mt-0.5">
                                ₹ {Number(selectedDetails.bounceAmount || 0).toLocaleString("en-IN")}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Net Received</p>
                            <p className="font-bold text-blue-600 text-sm mt-0.5">
                              ₹ {Number(selectedDetails.netReceived || 0).toLocaleString("en-IN")}
                            </p>
                          </div>
                          <div className="col-span-2 pt-1 border-t border-blue-200 mt-1">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Outstanding</p>
                            <p className={`font-bold text-lg mt-0.5 ${
                              selectedDetails.amountPayable > 0 ? "text-rose-600" : "text-emerald-600"
                            }`}>
                              ₹ {Number(selectedDetails.amountPayable || 0).toLocaleString("en-IN")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Bounce Back Details */}
                <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-rose-900 uppercase tracking-wider mb-4">
                    Bounce Back Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Date of Bounce Back{" "}
                        <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.dateOfBounceBack}
                        onChange={(e) =>
                          handleChange("dateOfBounceBack", e.target.value)
                        }
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 ${
                          showErrors && errors.dateOfBounceBack
                            ? "border-rose-500"
                            : "border-gray-300"
                        }`}
                      />
                      <ErrorMessage error={errors.dateOfBounceBack} />
                    </div>

                    {/* Bank selector — stores name in bank_details, id in selectedBankId for entries */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Bank Details <span className="text-rose-600">*</span>
                      </label>
                      <select
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 ${
                          showErrors && errors.bankDetails
                            ? "border-rose-500"
                            : "border-gray-300"
                        }`}
                        value={selectedBankId}
                        onChange={(e) => {
                          const chosenId = e.target.value;
                          const chosenBank = banks.find(
                            (b) => b.id === chosenId
                          );
                          setSelectedBankId(chosenId);
                          // Store the bank NAME as text in bounce_back.bank_details
                          setSelectedBankName(chosenBank?.bank_name || "");
                        }}
                      >
                        <option value="">Select Bank</option>
                        {banks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bank_name}
                          </option>
                        ))}
                      </select>
                      <ErrorMessage error={errors.bankDetails} />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                      Enter BB Amount <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.bounceBackAmount}
                      onChange={(e) =>
                        handleChange("bounceBackAmount", e.target.value)
                      }
                      className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 ${
                        showErrors && errors.bounceBackAmount
                          ? "border-rose-500"
                          : "border-gray-300"
                      }`}
                      placeholder="₹ 0"
                    />
                    <ErrorMessage error={errors.bounceBackAmount} />
                    <p className="text-xs text-gray-500 mt-1">
                      Amount would add up in Amount Payable details
                    </p>
                  </div>

                  {selectedDetails?.department === "Operations" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4"
                    >
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Enter Employee Count{" "}
                        <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.employeeCount}
                        onChange={(e) =>
                          handleChange("employeeCount", e.target.value)
                        }
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 ${
                          showErrors && errors.employeeCount
                            ? "border-rose-500"
                            : "border-gray-300"
                        }`}
                        placeholder="0"
                      />
                      <ErrorMessage error={errors.employeeCount} />
                      <p className="text-xs text-gray-500 mt-1">
                        Count of employees would auto add up
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Remarks */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Enter Remarks
                  </label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => handleChange("remarks", e.target.value)}
                    rows={3}
                    className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-sm"
                    placeholder="Additional remarks..."
                  />
                </div>

                {/* Impact Summary */}
                {impact && formData.bounceBackAmount && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4"
                  >
                    <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-3">
                      Impact Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wider">
                            Current Amount Payable
                          </p>
                          <p className="text-lg font-bold text-gray-900 mt-1">
                            ₹{" "}
                            {selectedDetails.amountPayable.toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wider">
                            Bounce Back Amount
                          </p>
                          <p className="text-lg font-bold text-rose-600 mt-1">
                            + ₹{" "}
                            {parseFloat(
                              formData.bounceBackAmount
                            ).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wider">
                            New Amount Payable
                          </p>
                          <p className="text-lg font-bold text-amber-600 mt-1">
                            ₹{" "}
                            {impact.newAmountPayable.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wider">
                            Current Bank Balance
                          </p>
                          <p className="text-lg font-bold text-gray-900 mt-1">
                            ₹{" "}
                            {(selectedDetails.bankBalance || 0).toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wider">
                            Deduction
                          </p>
                          <p className="text-lg font-bold text-rose-600 mt-1">
                            - ₹{" "}
                            {parseFloat(
                              formData.bounceBackAmount
                            ).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wider">
                            New Bank Balance
                          </p>
                          <p className="text-lg font-bold text-blue-600 mt-1">
                            ₹{" "}
                            {impact.newBankBalance.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-3 italic">
                      Also subtracted from Bank Balance details
                    </p>
                  </motion.div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  {canSave && (
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium shadow-lg shadow-rose-500/30 flex items-center space-x-2"
                    >
                      <span>{loading ? "Saving..." : "Save Bounce Back"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddBounceBackModal;