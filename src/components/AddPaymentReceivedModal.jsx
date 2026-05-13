import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import supabase from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, AlertCircle, Copy, CheckCircle, Eye } from "lucide-react";
import ViewPaymentReceivedModal from "./ViewPaymentReceivedModal";

const AddPaymentReceivedModal = ({
  isOpen,
  onClose,
  invoice,
  clients = [],
  onPaymentSaved,
}) => {
  const [formData, setFormData] = useState({
    bankId: "",
    invoiceAvailable: "Yes",
    invoiceNumber: "",
    amountReceived: "",
    dateReceived: "",
    entity: "",
    department: "",
    client: "",
    ledgerName: "",
    paymentDescription: "",
    payoutMonth: "",
    remarks: "",
  });

  const [savedRef, setSavedRef] = useState("");
  const [showRefModal, setShowRefModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState({});
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const [banks, setBanks] = useState([]);
  const [saving, setSaving] = useState(false);

  /* ── View modal state ── */
  const [viewOpen, setViewOpen] = useState(false);

  // ── Fetch banks ──────────────────────────────────────────────
  useEffect(() => {
    const fetchBanks = async () => {
      const { data } = await supabase
        .from("bank_master")
        .select("id, bank_name");
      setBanks(data || []);
    };
    fetchBanks();
  }, []);

  // ── Pre-fill invoice number AND bank from prop ───────────────
  useEffect(() => {
    if (invoice && isOpen) {
      setFormData((prev) => ({
        ...prev,
        invoiceNumber: invoice.invoice_number || "",
        bankId: invoice.bank_id || prev.bankId || "",
      }));
    }
  }, [invoice, isOpen]);

  // ── Fetch invoice details when invoice number changes ────────
  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      const num = formData.invoiceNumber?.trim();
      if (!num) {
        setInvoiceDetails(null);
        return;
      }

      const { data, error } = await supabase
        .from("outstanding_invoice_view")
        .select("*")
        .eq("invoice_number", num)
        .maybeSingle();

      if (error) {
        console.error("Fetch invoice error:", error);
        setInvoiceDetails(null);
        return;
      }

      if (data) {
        setInvoiceDetails(data);
        setFormData((prev) => ({
          ...prev,
          client:     data.client_name  || "",
          ledgerName: data.ledger_name  || "",
          entity:     data.entity_name  || "",
          department: data.dept_name    || "",
          bankId: prev.bankId || data.bank_id || "",
        }));
      } else {
        setInvoiceDetails(null);
      }
    };

    fetchInvoiceDetails();
  }, [formData.invoiceNumber]);

  // ── Field change handler ─────────────────────────────────────
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // ── Generate advance payment ref ─────────────────────────────
  const generatePayInReference = (clientName, date) => {
    const clientCode = (clientName || "XX").substring(0, 2).toUpperCase();
    const dateObj = new Date(date);
    const day   = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year  = String(dateObj.getFullYear()).slice(-2);
    const dateStr = `${day}${month}${year}`;

    const storageKey = `payInSeq_${clientCode}_${dateStr}`;
    const currentSeq = parseInt(localStorage.getItem(storageKey) || "0", 10);
    const nextSeq    = currentSeq + 1;
    localStorage.setItem(storageKey, String(nextSeq));

    return `PI-${clientCode}-${dateStr}-${String(nextSeq).padStart(2, "0")}`;
  };

  // ── Validation ───────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};

    if (!formData.bankId)          newErrors.bankId          = "Bank is required";
    if (!formData.amountReceived)  newErrors.amountReceived  = "Amount is required";
    if (!formData.dateReceived)    newErrors.dateReceived    = "Date is required";

    if (formData.invoiceAvailable === "Yes") {
      if (!formData.invoiceNumber.trim())
        newErrors.invoiceNumber = "Invoice number is required";
      if (formData.invoiceNumber.trim() && !invoiceDetails)
        newErrors.invoiceNumber = "Invoice not found — check the number";
    } else {
      if (!formData.entity)
        newErrors.entity = "Entity is required";
      if (!formData.department)
        newErrors.department = "Department is required";
      if (!formData.client.trim())
        newErrors.client = "Client is required";
      if (!formData.ledgerName.trim())
        newErrors.ledgerName = "Ledger name is required";
      if (!formData.paymentDescription.trim())
        newErrors.paymentDescription = "Payment description is required";
      if (!formData.payoutMonth.trim())
        newErrors.payoutMonth = "Payout month is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowErrors(true);
    if (!validateForm()) return;

    setSaving(true);
    try {
      let confirmedRef = "";

      if (formData.invoiceAvailable === "Yes") {
        const remaining = Number(invoiceDetails?.outstanding || 0);
        const entered   = Number(formData.amountReceived);

        if (entered <= 0) {
          alert("Amount must be greater than 0");
          setSaving(false);
          return;
        }
        if (entered > remaining) {
          alert(
            `Payment cannot exceed remaining amount (₹ ${remaining.toLocaleString("en-IN")})`
          );
          setSaving(false);
          return;
        }

        const { data: paymentData, error: paymentError } = await supabase
          .from("payments_received")
          .insert([{
            invoice_id:      invoiceDetails.id,
            amount_received: entered,
            payment_date:    formData.dateReceived,
            bank_id:         formData.bankId,
          }])
          .select("payment_ref, bank_id")
          .single();

        if (paymentError) throw paymentError;

        if (formData.bankId && invoiceDetails?.id) {
          await supabase
            .from("invoices")
            .update({ bank_id: formData.bankId })
            .eq("id", invoiceDetails.id);
        }

        confirmedRef = paymentData?.payment_ref || "Saved";

      } else {
        const payInReference = generatePayInReference(
          formData.client,
          formData.dateReceived
        );

        const { data: advanceData, error: advanceError } = await supabase
          .from("advance_payments")
          .insert([{
            payment_ref:     payInReference,
            client_name:     formData.client,
            ledger_name:     formData.ledgerName,
            entity_name:     formData.entity,
            department_name: formData.department,
            amount:          Number(formData.amountReceived),
            payment_date:    formData.dateReceived,
            bank_id:         formData.bankId,
            remarks:         formData.remarks || "Advance Payment",
          }])
          .select("payment_ref")
          .single();

        if (advanceError) throw advanceError;

        confirmedRef = advanceData?.payment_ref || payInReference;

        const { error: bankError } = await supabase
          .from("bank_entries")
          .insert([{
            bank_id:      formData.bankId,
            date:         formData.dateReceived,
            amount:       Number(formData.amountReceived),
            type:         "credit",
            flow_type:    "advance_payment",
            entity:       formData.entity || "Verto India Pvt Ltd",
            remarks:      `Advance Payment - ${formData.client}`,
            entry_type:   "advance_payment",
            reference_no: confirmedRef,
          }]);

        if (bankError) {
          console.warn("Bank entry warning (non-fatal):", bankError.message);
        }
      }

      if (onPaymentSaved) onPaymentSaved();
      setSavedRef(confirmedRef);
      setShowRefModal(true);

    } catch (err) {
      console.error("Payment save error:", err);
      alert("Error saving payment: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Reset / close ────────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      bankId: "",
      invoiceAvailable: "Yes",
      invoiceNumber: "",
      amountReceived: "",
      dateReceived: "",
      entity: "",
      department: "",
      client: "",
      ledgerName: "",
      paymentDescription: "",
      payoutMonth: "",
      remarks: "",
    });
    setErrors({});
    setShowErrors(false);
    setInvoiceDetails(null);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleRefModalClose = () => {
    setShowRefModal(false);
    setSavedRef("");
    setCopied(false);
    resetForm();
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(savedRef).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Error message component ──────────────────────────────────
  const ErrorMessage = ({ error }) => {
    if (!showErrors || !error) return null;
    return (
      <div className="flex items-center mt-1 text-xs text-rose-600">
        <AlertCircle className="w-3 h-3 mr-1" />
        {error}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ zIndex: 9999 }}
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
            >
              {/* ── Header ── */}
              <div
                className="relative p-6 text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #022c22 0%, #065f46 50%, #059669 100%)",
                }}
              >
                {/* blobs */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
                <div className="absolute bottom-0 left-10 w-16 h-16 bg-emerald-400/10 rounded-full translate-y-6" />

                <div className="relative flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">
                      ADD PAYMENT RECEIVED
                    </h2>
                    <p className="text-emerald-300 text-xs mt-0.5">
                      Record incoming payment details
                    </p>
                  </div>

                  {/* ── View + Close ── */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
                    >
                      <Eye size={13} />
                      View
                    </button>
                    <button
                      onClick={handleClose}
                      className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4 text-white/80" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Form ── */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Invoice Available toggle */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Invoice Number Available
                      </label>
                      <div className="flex space-x-3">
                        {["Yes", "No"].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleChange("invoiceAvailable", val)}
                            className={`px-6 py-2 rounded-lg font-medium transition-all ${
                              formData.invoiceAvailable === val
                                ? val === "Yes"
                                  ? "bg-emerald-600 text-white shadow-md"
                                  : "bg-rose-600 text-white shadow-md"
                                : "bg-white text-gray-600 border border-gray-300"
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ── YES: Invoice payment ── */}
                    {formData.invoiceAvailable === "Yes" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-4 pt-4 border-t border-blue-200"
                      >
                        <div className="grid grid-cols-2 gap-4">

                          {/* Invoice Number */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                              Invoice Number <span className="text-rose-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={formData.invoiceNumber}
                              onChange={(e) => handleChange("invoiceNumber", e.target.value)}
                              className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                                showErrors && errors.invoiceNumber
                                  ? "border-rose-500"
                                  : "border-gray-300"
                              }`}
                              placeholder="INV-001"
                            />
                            {invoiceDetails && (
                              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs space-y-0.5">
                                <p><b>Client:</b> {invoiceDetails.client_name}</p>
                                <p><b>Ledger:</b> {invoiceDetails.ledger_name}</p>
                                <p>
                                  <b>Outstanding:</b>{" "}
                                  ₹{Number(invoiceDetails.outstanding || 0).toLocaleString("en-IN")}
                                </p>
                                {invoiceDetails.bank_id && (
                                  <p className="text-amber-600">
                                    <b>Invoice Bank:</b> pre-filled below
                                  </p>
                                )}
                              </div>
                            )}
                            <ErrorMessage error={errors.invoiceNumber} />
                          </div>

                          {/* Bank */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                              Payment Received In Bank <span className="text-rose-600">*</span>
                            </label>
                            <select
                              value={formData.bankId}
                              onChange={(e) => handleChange("bankId", e.target.value)}
                              className={`w-full border text-gray-900 px-3 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 ${
                                showErrors && errors.bankId
                                  ? "border-rose-500"
                                  : "border-gray-300"
                              }`}
                            >
                              <option value="">Select Bank</option>
                              {banks.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.bank_name}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-400 mt-1">
                              Select the bank where payment was received
                            </p>
                            <ErrorMessage error={errors.bankId} />
                          </div>

                          {/* Amount */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                              Amount Received <span className="text-rose-600">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={formData.amountReceived}
                              onChange={(e) => handleChange("amountReceived", e.target.value)}
                              className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 ${
                                showErrors && errors.amountReceived
                                  ? "border-rose-500"
                                  : "border-gray-300"
                              }`}
                              placeholder="₹ 0"
                            />
                            {invoiceDetails && formData.amountReceived && (
                              <p className={`text-xs mt-1 ${
                                Number(formData.amountReceived) >
                                Number(invoiceDetails.outstanding || 0)
                                  ? "text-rose-600"
                                  : "text-emerald-600"
                              }`}>
                                {Number(formData.amountReceived) >
                                Number(invoiceDetails.outstanding || 0)
                                  ? `⚠ Exceeds outstanding by ₹${(
                                      Number(formData.amountReceived) -
                                      Number(invoiceDetails.outstanding || 0)
                                    ).toLocaleString("en-IN")}`
                                  : `✓ ₹${(
                                      Number(invoiceDetails.outstanding || 0) -
                                      Number(formData.amountReceived)
                                    ).toLocaleString("en-IN")} will remain outstanding`}
                              </p>
                            )}
                            <ErrorMessage error={errors.amountReceived} />
                          </div>

                          {/* Date */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                              Date Received <span className="text-rose-600">*</span>
                            </label>
                            <input
                              type="date"
                              value={formData.dateReceived}
                              onChange={(e) => handleChange("dateReceived", e.target.value)}
                              className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 ${
                                showErrors && errors.dateReceived
                                  ? "border-rose-500"
                                  : "border-gray-300"
                              }`}
                            />
                            <ErrorMessage error={errors.dateReceived} />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* ── NO: Advance payment ── */}
                    {formData.invoiceAvailable === "No" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-4 pt-4 border-t border-blue-200"
                      >
                        <div className="grid grid-cols-2 gap-4">

                          {/* Entity */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                              Entity <span className="text-rose-600">*</span>
                            </label>
                            <select
                              value={formData.entity}
                              onChange={(e) => handleChange("entity", e.target.value)}
                              className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 ${
                                showErrors && errors.entity
                                  ? "border-rose-500"
                                  : "border-gray-300"
                              }`}
                            >
                              <option value="">Select Entity</option>
                              <option>Verto India Pvt Ltd</option>
                              <option>Verto Global LLC</option>
                              <option>Verto UK Ltd</option>
                            </select>
                            <ErrorMessage error={errors.entity} />
                          </div>

                          {/* Department */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                              Department <span className="text-rose-600">*</span>
                            </label>
                            <select
                              value={formData.department}
                              onChange={(e) => handleChange("department", e.target.value)}
                              className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 ${
                                showErrors && errors.department
                                  ? "border-rose-500"
                                  : "border-gray-300"
                              }`}
                            >
                              <option value="">Select Department</option>
                              <option>Operations</option>
                              <option>Sales</option>
                              <option>Finance</option>
                              <option>HR</option>
                              <option>IT</option>
                            </select>
                            <ErrorMessage error={errors.department} />
                          </div>

                          {/* Client */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                              Client <span className="text-rose-600">*</span>
                            </label>
                            <input
                              type="text"
                              list="clients-list"
                              value={formData.client}
                              onChange={(e) => handleChange("client", e.target.value)}
                              className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 ${
                                showErrors && errors.client
                                  ? "border-rose-500"
                                  : "border-gray-300"
                              }`}
                              placeholder="Type or select client"
                            />
                            <datalist id="clients-list">
                              {clients.map((c, i) => (
                                <option key={i} value={c} />
                              ))}
                            </datalist>
                            <ErrorMessage error={errors.client} />
                          </div>

                          {/* Ledger Name */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                              Ledger Name <span className="text-rose-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={formData.ledgerName}
                              onChange={(e) => handleChange("ledgerName", e.target.value)}
                              className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 ${
                                showErrors && errors.ledgerName
                                  ? "border-rose-500"
                                  : "border-gray-300"
                              }`}
                              placeholder="Ledger name"
                            />
                            <ErrorMessage error={errors.ledgerName} />
                          </div>
                        </div>

                        {/* Payment Description */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Payment Description <span className="text-rose-600">*</span>
                          </label>
                          <textarea
                            value={formData.paymentDescription}
                            onChange={(e) => handleChange("paymentDescription", e.target.value)}
                            rows={3}
                            className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 ${
                              showErrors && errors.paymentDescription
                                ? "border-rose-500"
                                : "border-gray-300"
                            }`}
                            placeholder="Enter payment description"
                          />
                          <ErrorMessage error={errors.paymentDescription} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">

                          {/* Amount */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                              Amount Received <span className="text-rose-600">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={formData.amountReceived}
                              onChange={(e) => handleChange("amountReceived", e.target.value)}
                              className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 ${
                                showErrors && errors.amountReceived
                                  ? "border-rose-500"
                                  : "border-gray-300"
                              }`}
                              placeholder="₹ 0"
                            />
                            <ErrorMessage error={errors.amountReceived} />
                          </div>

                          {/* Payout Month */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                              Payout for the Month <span className="text-rose-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={formData.payoutMonth}
                              onChange={(e) => handleChange("payoutMonth", e.target.value)}
                              className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 ${
                                showErrors && errors.payoutMonth
                                  ? "border-rose-500"
                                  : "border-gray-300"
                              }`}
                              placeholder="e.g., Jan 2026"
                            />
                            <ErrorMessage error={errors.payoutMonth} />
                          </div>

                          {/* Date */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                              Date Received <span className="text-rose-600">*</span>
                            </label>
                            <input
                              type="date"
                              value={formData.dateReceived}
                              onChange={(e) => handleChange("dateReceived", e.target.value)}
                              className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 ${
                                showErrors && errors.dateReceived
                                  ? "border-rose-500"
                                  : "border-gray-300"
                              }`}
                            />
                            <ErrorMessage error={errors.dateReceived} />
                          </div>

                          {/* Bank */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                              Payment Received In Bank <span className="text-rose-600">*</span>
                            </label>
                            <select
                              value={formData.bankId}
                              onChange={(e) => handleChange("bankId", e.target.value)}
                              className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 ${
                                showErrors && errors.bankId
                                  ? "border-rose-500"
                                  : "border-gray-300"
                              }`}
                            >
                              <option value="">Select Bank</option>
                              {banks.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.bank_name}
                                </option>
                              ))}
                            </select>
                            <ErrorMessage error={errors.bankId} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Remarks */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                      Remarks
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      {formData.invoiceAvailable === "Yes"
                        ? "Any notes about this payment"
                        : "Auto-generated reference: PI-[ClientCode]-[DDMMYY]-[Seq]"}
                    </p>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => handleChange("remarks", e.target.value)}
                      rows={2}
                      className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 text-sm"
                      placeholder="Additional remarks..."
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium"
                    >
                      Cancel
                    </button>

                    {/* ── View button in footer ── */}
                    <button
                      type="button"
                      onClick={() => setViewOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition-colors"
                    >
                      <Eye size={14} />
                      View History
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl transition-colors font-medium shadow-lg shadow-emerald-500/30 flex items-center space-x-2"
                    >
                      <span>{saving ? "Saving..." : "Save Payment"}</span>
                      {!saving && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>

                </form>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Payment ref confirmation modal ── */}
        {showRefModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ zIndex: 99998 }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 30 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-9 h-9 text-emerald-600" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-1">
                Payment Saved!
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {savedRef.startsWith("PI-")
                  ? "Use this reference when creating the invoice later."
                  : "Payment has been recorded successfully."}
              </p>

              {savedRef && (
                <div className="bg-emerald-50 border-2 border-dashed border-emerald-400 rounded-xl px-5 py-4 mb-5">
                  <p className="text-xs text-emerald-600 uppercase tracking-widest font-semibold mb-2">
                    {savedRef.startsWith("PI-")
                      ? "Advance Payment Reference"
                      : "Payment Reference"}
                  </p>
                  <p className="text-2xl font-mono font-bold text-emerald-700 tracking-wider break-all">
                    {savedRef}
                  </p>
                </div>
              )}

              {savedRef.startsWith("PI-") && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
                  📌 Note this reference. Enter it in the{" "}
                  <b>Ref No Payment Made</b> field when creating the invoice.
                </p>
              )}

              <button
                onClick={handleCopy}
                className={`w-full mb-3 px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  copied
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {copied ? (
                  <><CheckCircle className="w-4 h-4" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy Reference</>
                )}
              </button>

              <button
                onClick={handleRefModalClose}
                className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── View Payment Received Modal — rendered via portal at document.body ── */}
      {ReactDOM.createPortal(
        <ViewPaymentReceivedModal
          isOpen={viewOpen}
          onClose={() => setViewOpen(false)}
          invoice={invoice}
        />,
        document.body
      )}
    </>
  );
};

export default AddPaymentReceivedModal;