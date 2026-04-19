import React, { useState, useEffect } from "react";
import supabase from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, AlertCircle } from "lucide-react";

const AddPaymentReceivedModal = ({
  isOpen,
  onClose,
  invoice,
  clients = [],
  onPaymentSaved, // 🔥 new prop
}) => {
  // Local form state
  const [formData, setFormData] = useState({
    bankId: "", // ✅ ADD THIS
    invoiceAvailable: "Yes",
    invoiceNumber: "",
    amountReceived: "",
    dateReceived: "",
    bankDetails: "",
    entity: "",
    department: "",
    client: "",
    ledgerName: "",
    paymentDescription: "",
    payoutMonth: "",
    bankDetailsPayout: "",
    remarks: "",
  });

  React.useEffect(() => {
    if (invoice && isOpen) {
      setFormData((prev) => ({
        ...prev,
        invoiceNumber: invoice.id, // 🔥 auto fill
      }));
    }
  }, [invoice, isOpen]);

  const [errors, setErrors] = useState({});
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const [banks, setBanks] = useState([]);

  useEffect(() => {
    const fetchBanks = async () => {
      const { data } = await supabase
        .from("bank_master")
        .select("id, bank_name");

      console.log("BANKS:", data); // 🔥 DEBUG

      setBanks(data || []);
    };

    fetchBanks();
  }, []);

  React.useEffect(() => {
    const fetchInvoiceDetails = async () => {
      if (!formData.invoiceNumber) {
        setInvoiceDetails(null);
        return;
      }

      const { data, error } = await supabase
        .from("outstanding_invoice_view") // ✅ USE VIEW (VERY IMPORTANT)
        .select("*")
        .eq("invoice_number", formData.invoiceNumber)
        .maybeSingle();

      if (error) {
        console.error("❌ Fetch error:", error);
        return;
      }

      if (data) {
        setInvoiceDetails(data);

        // 🔥 AUTO FILL
        setFormData((prev) => ({
          ...prev,
          client: data.client_name || "",
          ledgerName: data.ledger_name || "",
          entity: data.entity_name || "",
          department: data.dept_name || "",
        }));
      } else {
        setInvoiceDetails(null);
      }
    };

    fetchInvoiceDetails();
  }, [formData.invoiceNumber]);

  // Single handleChange function
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Generate PayIn reference number
  const generatePayInReference = (clientName, date) => {
    // Extract client code (first 2 letters, uppercase)
    const clientCode = clientName.substring(0, 2).toUpperCase();

    // Format date as DDMMYY
    const dateObj = new Date(date);
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = String(dateObj.getFullYear()).slice(-2);
    const dateStr = `${day}${month}${year}`;

    // Get sequence number from localStorage
    const storageKey = `payInSeq_${clientCode}_${dateStr}`;
    const currentSeq = parseInt(localStorage.getItem(storageKey) || "0", 10);
    const nextSeq = currentSeq + 1;
    const seqStr = String(nextSeq).padStart(2, "0");

    // Update localStorage
    localStorage.setItem(storageKey, String(nextSeq));

    return `PI-${clientCode}-${dateStr}-${seqStr}`;
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    if (!formData.bankId) {
      newErrors.bankId = "Bank is required";
    }
    if (formData.invoiceAvailable === "Yes") {
      if (!formData.invoiceNumber.trim())
        newErrors.invoiceNumber = "Invoice number is required";
      if (!formData.amountReceived)
        newErrors.amountReceived = "Amount is required";
      if (!formData.dateReceived) newErrors.dateReceived = "Date is required";
      if (!formData.bankDetails.trim())
        newErrors.bankDetails = "Bank details are required";
    } else {
      if (!formData.entity) newErrors.entity = "Entity is required";
      if (!formData.department) newErrors.department = "Department is required";
      if (!formData.client.trim()) newErrors.client = "Client is required";
      if (!formData.ledgerName.trim())
        newErrors.ledgerName = "Ledger name is required";
      if (!formData.paymentDescription.trim())
        newErrors.paymentDescription = "Payment description is required";
      if (!formData.amountReceived)
        newErrors.amountReceived = "Amount is required";
      if (!formData.payoutMonth.trim())
        newErrors.payoutMonth = "Payout month is required";
      if (!formData.dateReceived) newErrors.dateReceived = "Date is required";
      if (!formData.bankDetailsPayout.trim())
        newErrors.bankDetailsPayout = "Bank details are required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowErrors(true);

    if (!validateForm()) {
      return;
    }

    // Generate PayIn reference for "No" scenario
    let payInReference = "";
    if (formData.invoiceAvailable === "No") {
      payInReference = generatePayInReference(
        formData.client,
        formData.dateReceived
      );
    }

    // Prepare submission data
    const submissionData = {
      ...formData,
      payInReference:
        formData.invoiceAvailable === "No" ? payInReference : null,
      submittedAt: new Date().toISOString(),
    };

    try {
      // 🔥 CHECK REMAINING AMOUNT
      const remaining = Number(invoiceDetails?.outstanding || 0);
      const enteredAmount = Number(formData.amountReceived);

      console.log("REMAINING:", remaining);
      console.log("ENTERED:", enteredAmount);

      if (enteredAmount > remaining) {
        alert(`❌ Payment cannot exceed remaining amount (₹ ${remaining})`);
        return;
      }
      const { error: paymentError } = await supabase
        .from("payments_received")
        .insert([
          {
            invoice_id: invoiceDetails?.id || null,
            amount_received: Number(formData.amountReceived),
            payment_date: formData.dateReceived,
            payment_ref:
              formData.invoiceAvailable === "No"
                ? payInReference
                : `UI-${new Date()
                    .toLocaleDateString("en-GB")
                    .replace(/\//g, "")}-${Math.floor(Math.random() * 100)
                    .toString()
                    .padStart(2, "0")}`,
          },
        ]);

      if (paymentError) throw paymentError;

      // 🔥🔥 ADD THIS BLOCK HERE (IMPORTANT)

      // 🔥 BANK ENTRY
      const { error: bankError } = await supabase.from("bank_entries").insert([
        {
          bank_id: formData.bankId,
          entity: formData.entity || "Pvt Ltd",
          amount: Number(formData.amountReceived),
          date: formData.dateReceived,
          type: "credit",
          remarks: formData.bankDetails || "Payment Received",
          reference_no: "BNK-" + Date.now(),

          // 🔥 ADD THIS (VERY IMPORTANT)
          invoice_id: invoiceDetails?.id || null,
        },
      ]);

      if (bankError) throw bankError;

      alert("✅ Payment saved successfully");

      // 🔥 STEP 10.3 — TRIGGER DASHBOARD REFRESH
      if (onPaymentSaved) onPaymentSaved();

      resetForm();
      onClose();
    } catch (err) {
      console.error("FULL ERROR:", err);
      alert("❌ " + err.message);
    }

    // TODO: Send to backend API when available
    // await api.savePaymentReceived(submissionData);

    // Reset form and close modal
    resetForm();
    onClose();
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      invoiceAvailable: "Yes",
      invoiceNumber: "",
      amountReceived: "",
      dateReceived: "",
      bankDetails: "",
      entity: "",
      department: "",
      client: "",
      ledgerName: "",
      paymentDescription: "",
      payoutMonth: "",
      bankDetailsPayout: "",
      remarks: "",
    });
    setErrors({});
    setShowErrors(false);
  };

  // Handle modal close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Render error message
  const ErrorMessage = ({ error }) => {
    if (!showErrors || !error) return null;
    return (
      <div className="flex items-center mt-1 text-xs text-rose-600">
        <AlertCircle className="w-3 h-3 mr-1" />
        {error}
      </div>
    );
  };

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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">ADD PAYMENT RECEIVED</h2>
                  <p className="text-emerald-100 text-sm mt-1">
                    Record incoming payment details
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-emerald-100 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Invoice Available Section */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Invoice Number Available
                    </label>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => handleChange("invoiceAvailable", "Yes")}
                        className={`px-6 py-2 rounded-lg font-medium transition-all ${
                          formData.invoiceAvailable === "Yes"
                            ? "bg-emerald-600 text-white shadow-md"
                            : "bg-white text-gray-600 border border-gray-300"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange("invoiceAvailable", "No")}
                        className={`px-6 py-2 rounded-lg font-medium transition-all ${
                          formData.invoiceAvailable === "No"
                            ? "bg-rose-600 text-white shadow-md"
                            : "bg-white text-gray-600 border border-gray-300"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* If Yes - Invoice Details */}
                  {formData.invoiceAvailable === "Yes" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pt-4 border-t border-blue-200"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Invoice Number{" "}
                            <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.invoiceNumber}
                            readOnly={false}
                            onChange={(e) =>
                              handleChange("invoiceNumber", e.target.value)
                            }
                            className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                              showErrors && errors.invoiceNumber
                                ? "border-rose-500"
                                : "border-gray-300"
                            }`}
                            placeholder="INV-2023001"
                          />
                          {invoiceDetails && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                              <p>
                                <b>Client:</b> {invoiceDetails.client_name}
                              </p>
                              <p>
                                <b>Ledger:</b> {invoiceDetails.ledger_name}
                              </p>
                              <p>
                                <b>Entity:</b> {invoiceDetails.entity_name}
                              </p>
                            </div>
                          )}
                          <ErrorMessage error={errors.invoiceNumber} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-2">
                            Select Bank <span className="text-rose-600">*</span>
                          </label>
                          <select
                            value={formData.bankId}
                            onChange={(e) =>
                              handleChange("bankId", e.target.value)
                            }
                            className="w-full border px-3 py-2 rounded"
                          >
                            <option value="">Select Bank</option>

                            {banks.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.bank_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Amount Received{" "}
                            <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="number"
                            value={formData.amountReceived}
                            onChange={(e) =>
                              handleChange("amountReceived", e.target.value)
                            }
                            className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                              showErrors && errors.amountReceived
                                ? "border-rose-500"
                                : "border-gray-300"
                            }`}
                            placeholder="₹ 0"
                          />
                          <ErrorMessage error={errors.amountReceived} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Date Received{" "}
                            <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="date"
                            value={formData.dateReceived}
                            onChange={(e) =>
                              handleChange("dateReceived", e.target.value)
                            }
                            className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                              showErrors && errors.dateReceived
                                ? "border-rose-500"
                                : "border-gray-300"
                            }`}
                          />
                          <ErrorMessage error={errors.dateReceived} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Bank Details{" "}
                            <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.bankDetails}
                            onChange={(e) =>
                              handleChange("bankDetails", e.target.value)
                            }
                            className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                              showErrors && errors.bankDetails
                                ? "border-rose-500"
                                : "border-gray-300"
                            }`}
                            placeholder="Bank account details"
                          />
                          <ErrorMessage error={errors.bankDetails} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* If No - Alternative Details */}
                  {formData.invoiceAvailable === "No" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pt-4 border-t border-blue-200"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Entity <span className="text-rose-600">*</span>
                          </label>
                          <select
                            value={formData.entity}
                            onChange={(e) =>
                              handleChange("entity", e.target.value)
                            }
                            className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                              showErrors && errors.entity
                                ? "border-rose-500"
                                : "border-gray-300"
                            }`}
                          >
                            <option value="">Select Entity</option>
                            <option value="Verto India Pvt Ltd">
                              Verto India Pvt Ltd
                            </option>
                            <option value="Verto Global LLC">
                              Verto Global LLC
                            </option>
                            <option value="Verto UK Ltd">Verto UK Ltd</option>
                          </select>
                          <ErrorMessage error={errors.entity} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Department <span className="text-rose-600">*</span>
                          </label>
                          <select
                            value={formData.department}
                            onChange={(e) =>
                              handleChange("department", e.target.value)
                            }
                            className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                              showErrors && errors.department
                                ? "border-rose-500"
                                : "border-gray-300"
                            }`}
                          >
                            <option value="">Select Department</option>
                            <option value="Operations">Operations</option>
                            <option value="Sales">Sales</option>
                            <option value="Finance">Finance</option>
                            <option value="HR">HR</option>
                            <option value="IT">IT</option>
                          </select>
                          <ErrorMessage error={errors.department} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Client <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            list="clients-list"
                            value={formData.client}
                            onChange={(e) =>
                              handleChange("client", e.target.value)
                            }
                            className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                              showErrors && errors.client
                                ? "border-rose-500"
                                : "border-gray-300"
                            }`}
                            placeholder="Type or select client"
                          />
                          <datalist id="clients-list">
                            {clients.map((client, idx) => (
                              <option key={idx} value={client} />
                            ))}
                          </datalist>
                          <ErrorMessage error={errors.client} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Ledger Name <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.ledgerName}
                            onChange={(e) =>
                              handleChange("ledgerName", e.target.value)
                            }
                            className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                              showErrors && errors.ledgerName
                                ? "border-rose-500"
                                : "border-gray-300"
                            }`}
                            placeholder="Ledger name"
                          />
                          <ErrorMessage error={errors.ledgerName} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Payment Description{" "}
                          <span className="text-rose-600">*</span>
                        </label>
                        <textarea
                          value={formData.paymentDescription}
                          onChange={(e) =>
                            handleChange("paymentDescription", e.target.value)
                          }
                          rows={3}
                          className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                            showErrors && errors.paymentDescription
                              ? "border-rose-500"
                              : "border-gray-300"
                          }`}
                          placeholder="Enter payment description"
                        />
                        <ErrorMessage error={errors.paymentDescription} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Amount Received{" "}
                            <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="number"
                            value={formData.amountReceived}
                            onChange={(e) =>
                              handleChange("amountReceived", e.target.value)
                            }
                            className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                              showErrors && errors.amountReceived
                                ? "border-rose-500"
                                : "border-gray-300"
                            }`}
                            placeholder="₹ 0"
                          />
                          <ErrorMessage error={errors.amountReceived} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Payout for the Month{" "}
                            <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.payoutMonth}
                            onChange={(e) =>
                              handleChange("payoutMonth", e.target.value)
                            }
                            className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                              showErrors && errors.payoutMonth
                                ? "border-rose-500"
                                : "border-gray-300"
                            }`}
                            placeholder="e.g., Jan 2023"
                          />
                          <ErrorMessage error={errors.payoutMonth} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Date Received{" "}
                            <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="date"
                            value={formData.dateReceived}
                            onChange={(e) =>
                              handleChange("dateReceived", e.target.value)
                            }
                            className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                              showErrors && errors.dateReceived
                                ? "border-rose-500"
                                : "border-gray-300"
                            }`}
                          />
                          <ErrorMessage error={errors.dateReceived} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Bank Details (payout){" "}
                            <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.bankDetailsPayout}
                            onChange={(e) =>
                              handleChange("bankDetailsPayout", e.target.value)
                            }
                            className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                              showErrors && errors.bankDetailsPayout
                                ? "border-rose-500"
                                : "border-gray-300"
                            }`}
                            placeholder="Bank details"
                          />
                          <ErrorMessage error={errors.bankDetailsPayout} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Remarks Section */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Remarks
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    {formData.invoiceAvailable === "Yes"
                      ? "To link with Amount Paid when Invoice is Generated"
                      : "Auto-generated format: PI-[ClientCode]-[DDMMYY]-[SequenceNo]"}
                  </p>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => handleChange("remarks", e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm"
                    placeholder="Additional remarks..."
                  />
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-emerald-500/30 flex items-center space-x-2"
                  >
                    <span>Save</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddPaymentReceivedModal;
