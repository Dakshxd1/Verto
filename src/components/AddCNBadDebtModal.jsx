import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, AlertCircle, FileText } from "lucide-react";

const AddCNBadDebtModal = ({
  isOpen,
  onClose,
  invoices = [],
  editData, // ✅ ADD THIS
}) => {
  // Local form state
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    optionType: "CN", // CN or Bad Debt
    dateIssued: "",
    cnBadDebtAmount: "",
    employeeCount: "",
  });

  const [errors, setErrors] = useState({});
  const [showErrors, setShowErrors] = useState(false);
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState(null);

  // Single handleChange function
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // When invoice number changes, fetch invoice details
  useEffect(() => {
    const fetchInvoice = async () => {
      if (!formData.invoiceNumber) return;
  
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("invoice_number", formData.invoiceNumber)
        .single();
  
      if (error) {
        console.error(error);
        return;
      }
  
      setSelectedInvoiceDetails({
        client: data.client,
        department: data.department,
        invoiceValue: data.invoice_value,
        receivableAmount: data.receivable_amount,
        invoiceDate: data.invoice_date,
        entity: data.entity,
        id: data.id, // 🔥 IMPORTANT
      });
    };
  
    fetchInvoice();
  }, [formData.invoiceNumber, isOpen]);
  useEffect(() => {
    if (editData && isOpen) {
      setFormData({
        invoiceNumber: editData.id,
        optionType: editData.type,
        dateIssued: editData.date_issued,
        cnBadDebtAmount: editData.amount,
        employeeCount: editData.employee_count || "",
      });
    }
  }, [editData, isOpen]);

  // Auto-calculate receivable reduction
  const calculateNewReceivable = () => {
    if (!selectedInvoiceDetails || !formData.cnBadDebtAmount) return null;
    const newReceivable =
      selectedInvoiceDetails.receivableAmount -
      parseFloat(formData.cnBadDebtAmount);
    return newReceivable;
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.invoiceNumber.trim())
      newErrors.invoiceNumber = "Invoice number is required";
    if (!formData.optionType) newErrors.optionType = "Option type is required";
    if (!formData.dateIssued) newErrors.dateIssued = "Date issued is required";
    if (!formData.cnBadDebtAmount)
      newErrors.cnBadDebtAmount = "Amount is required";

    // Employee count is required only for OS department
    if (
      selectedInvoiceDetails?.department === "Operations" &&
      !formData.employeeCount
    ) {
      newErrors.employeeCount = "Employee count is required for OS department";
    }

    // Validate amount doesn't exceed receivable
    if (formData.cnBadDebtAmount && selectedInvoiceDetails) {
      const amount = parseFloat(formData.cnBadDebtAmount);
      if (amount > selectedInvoiceDetails.receivableAmount) {
        newErrors.cnBadDebtAmount = "Amount cannot exceed receivable amount";
      }
      if (amount <= 0) {
        newErrors.cnBadDebtAmount = "Amount must be greater than 0";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowErrors(true);
  
    if (!validateForm()) return;
  
    try {
      // 🔥 1. GET INVOICE
      const { data: inv, error: fetchError } = await supabase
        .from("invoices")
        .select("*")
        .eq("invoice_number", formData.invoiceNumber)
        .single();
  
      if (fetchError) throw fetchError;
  
      // 🔥 2. INSERT CN / BAD DEBT
      const { error } = await supabase.from("credit_notes_bad_debt").insert([
        {
          invoice_id: inv.id,
          invoice_number: formData.invoiceNumber,
          type: formData.optionType,
          date_issued: formData.dateIssued,
          amount: Number(formData.cnBadDebtAmount),
          entity: inv.entity,
          client: inv.client,
          employee_count: formData.employeeCount || null,
          remarks: formData.remarks || "",
        },
      ]);
  
      if (error) throw error;
  
      // 🔥 3. UPDATE INVOICE (CORE LOGIC)
      const newCN =
        (inv.cn_amount || 0) + Number(formData.cnBadDebtAmount);
  
      const newReceivable =
        inv.invoice_value - (inv.amount_received || 0) - newCN;
  
      let status = "partial";
      if (newReceivable <= 0) status = "paid";
  
      await supabase
        .from("invoices")
        .update({
          cn_amount: newCN,
          receivable_amount: newReceivable,
          status,
        })
        .eq("id", inv.id);
  
      // 🔥 4. SOFTWARE ENTRY (NEGATIVE)
      await supabase.from("software_entries").insert([
        {
          date: formData.dateIssued,
          amount: -Number(formData.cnBadDebtAmount),
          entity: inv.entity,
          remarks: formData.optionType + " Adjustment",
        },
      ]);
  
      alert("✅ CN / Bad Debt saved");
  
      resetForm();
      onClose();
    } catch (err) {
      alert("❌ " + err.message);
    }
  };
  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      invoiceNumber: "",
      optionType: "CN",
      dateIssued: "",
      cnBadDebtAmount: "",
      employeeCount: "",
    });
    setSelectedInvoiceDetails(null);
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

  const newReceivable = calculateNewReceivable();

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
            <div className="bg-gradient-to-r from-amber-600 to-orange-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    + ADD CREDIT NOTE OR BAD DEBT
                  </h2>
                  <p className="text-amber-100 text-sm mt-1">
                    Record credit note or bad debt against invoice
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-amber-100 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Invoice Selection */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-4 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Invoice Details
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Enter Invoice Number{" "}
                        <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        readOnly={!!editData}
                        list="invoices-list"
                        value={formData.invoiceNumber}
                        onChange={(e) =>
                          handleChange("invoiceNumber", e.target.value)
                        }
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                          showErrors && errors.invoiceNumber
                            ? "border-rose-500"
                            : "border-gray-300"
                        }`}
                        placeholder="INV-2023001"
                      />
                      <datalist id="invoices-list">
                        {invoices.map((invoice, idx) => (
                          <option key={idx} value={invoice} />
                        ))}
                      </datalist>
                      <ErrorMessage error={errors.invoiceNumber} />
                      <p className="text-xs text-gray-500 mt-1">
                        Rest details auto pop up
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Choose Option <span className="text-rose-600">*</span>
                      </label>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => handleChange("optionType", "CN")}
                          className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                            formData.optionType === "CN"
                              ? "bg-amber-600 text-white shadow-md"
                              : "bg-white text-gray-600 border border-gray-300"
                          }`}
                        >
                          CN
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChange("optionType", "Bad Debt")}
                          className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                            formData.optionType === "Bad Debt"
                              ? "bg-rose-600 text-white shadow-md"
                              : "bg-white text-gray-600 border border-gray-300"
                          }`}
                        >
                          Bad Debt
                        </button>
                      </div>
                      <ErrorMessage error={errors.optionType} />
                    </div>
                  </div>

                  {/* Auto-populated Invoice Details */}
                  {selectedInvoiceDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-blue-200"
                    >
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">
                            Client
                          </p>
                          <p className="font-semibold text-gray-900 mt-1">
                            {selectedInvoiceDetails.client}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">
                            Department
                          </p>
                          <p className="font-semibold text-gray-900 mt-1">
                            {selectedInvoiceDetails.department}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">
                            Entity
                          </p>
                          <p className="font-semibold text-gray-900 mt-1">
                            {selectedInvoiceDetails.entity}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">
                            Invoice Value
                          </p>
                          <p className="font-semibold text-gray-900 mt-1">
                            ₹{" "}
                            {selectedInvoiceDetails.invoiceValue.toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">
                            Current Receivable
                          </p>
                          <p className="font-semibold text-emerald-600 mt-1">
                            ₹{" "}
                            {selectedInvoiceDetails.receivableAmount.toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">
                            Invoice Date
                          </p>
                          <p className="font-semibold text-gray-900 mt-1">
                            {selectedInvoiceDetails.invoiceDate}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* CN/Bad Debt Details */}
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-4">
                    {formData.optionType} Details
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Date Issued <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.dateIssued}
                        onChange={(e) =>
                          handleChange("dateIssued", e.target.value)
                        }
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 ${
                          showErrors && errors.dateIssued
                            ? "border-rose-500"
                            : "border-gray-300"
                        }`}
                      />
                      <ErrorMessage error={errors.dateIssued} />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Enter CN / Bad Debt Amount{" "}
                        <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.cnBadDebtAmount}
                        onChange={(e) =>
                          handleChange("cnBadDebtAmount", e.target.value)
                        }
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 ${
                          showErrors && errors.cnBadDebtAmount
                            ? "border-rose-500"
                            : "border-gray-300"
                        }`}
                        placeholder="₹ 0"
                      />
                      <ErrorMessage error={errors.cnBadDebtAmount} />
                      <p className="text-xs text-gray-500 mt-1">
                        Amount would show in "Drop Down detailed menu of In-Out"
                        Table format
                      </p>
                    </div>
                  </div>

                  {/* Employee Count - Only for OS Department */}
                  {selectedInvoiceDetails?.department === "Operations" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4"
                    >
                      <div>
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
                          className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 ${
                            showErrors && errors.employeeCount
                              ? "border-rose-500"
                              : "border-gray-300"
                          }`}
                          placeholder="0"
                        />
                        <ErrorMessage error={errors.employeeCount} />
                        <p className="text-xs text-gray-500 mt-1">
                          This option comes if Department is OS
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Impact Summary */}
                {newReceivable !== null && formData.cnBadDebtAmount && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border-2 rounded-xl p-4 ${
                      newReceivable < 0
                        ? "bg-rose-50 border-rose-200"
                        : "bg-emerald-50 border-emerald-200"
                    }`}
                  >
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                      Impact Summary
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wider">
                          Current Receivable
                        </p>
                        <p className="text-lg font-bold text-gray-900 mt-1">
                          ₹{" "}
                          {selectedInvoiceDetails.receivableAmount.toLocaleString(
                            "en-IN"
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wider">
                          Deduction Amount
                        </p>
                        <p className="text-lg font-bold text-rose-600 mt-1">
                          - ₹{" "}
                          {parseFloat(formData.cnBadDebtAmount).toLocaleString(
                            "en-IN"
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wider">
                          New Receivable
                        </p>
                        <p
                          className={`text-lg font-bold mt-1 ${
                            newReceivable < 0
                              ? "text-rose-600"
                              : "text-emerald-600"
                          }`}
                        >
                          ₹ {newReceivable.toLocaleString("en-IN")}
                        </p>
                        {newReceivable < 0 && (
                          <p className="text-xs text-rose-600 mt-1 font-semibold">
                            Would show "Auto Red" if post deduction amount
                            become negative
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-3 italic">
                      The amount receivable would now show the subtracted value
                    </p>
                  </motion.div>
                )}

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
                    className="px-8 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-amber-500/30 flex items-center space-x-2"
                  >
                    <span>Save {formData.optionType}</span>
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

export default AddCNBadDebtModal;
