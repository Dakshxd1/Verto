import React, { useState, useEffect } from "react";
import supabase from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { X, Landmark, AlertCircle, ArrowRight } from "lucide-react";

const AddBankModal = ({ isOpen, onClose, selectedBank, onSave }) => {
  const [formData, setFormData] = useState({
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branchName: "",
    openingBalance: "",
  });

  const [errors, setErrors] = useState({});
  const [showErrors, setShowErrors] = useState(false);

  // 🔹 Prefill when editing
  useEffect(() => {
    if (selectedBank) {
      setFormData({
        bankName: selectedBank.bank_name || "",
        accountNumber: selectedBank.account_number || "",
        ifscCode: selectedBank.ifsc_code || "",
        branchName: selectedBank.branch_name || "",
        openingBalance: selectedBank.opening_balance || "",
      });
    }
  }, [selectedBank]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.bankName.trim())
      newErrors.bankName = "Bank name is required";
    if (!formData.accountNumber.trim())
      newErrors.accountNumber = "Account number is required";
    if (!formData.ifscCode.trim())
      newErrors.ifscCode = "IFSC code is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowErrors(true);

    if (!validateForm()) return;

    const payload = {
      bank_name: formData.bankName,
      account_number: formData.accountNumber,
      ifsc_code: formData.ifscCode,
      branch_name: formData.branchName,
      opening_balance: Number(formData.openingBalance) || 0,
    };

    try {
      let error;

      if (selectedBank) {
        const res = await supabase
          .from("bank_master")
          .update(payload)
          .eq("id", selectedBank.id);

        error = res.error;
      } else {
        const res = await supabase.from("bank_master").insert([payload]);
        error = res.error;
      }

      if (error) {
        alert("❌ Failed: " + error.message);
        return;
      }

      alert(selectedBank ? "✅ Bank updated" : "✅ Bank added");

      if (onSave) onSave(payload); // 🔥 send data back

      resetForm();
      onClose();
    } catch (err) {
      console.error(err);
      alert("❌ Unexpected error");
    }
  };

  const resetForm = () => {
    setFormData({
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      branchName: "",
      openingBalance: "",
    });
    setErrors({});
    setShowErrors(false);
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={handleClose}
        >
          <motion.div
            className="bg-white rounded-xl w-full max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-indigo-600 text-white flex justify-between">
              <h2>{selectedBank ? "Edit Bank" : "Add Bank"}</h2>
              <button onClick={handleClose}>
                <X />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <input
                placeholder="Bank Name"
                value={formData.bankName}
                onChange={(e) => handleChange("bankName", e.target.value)}
                className="w-full border p-2"
              />
              <ErrorMessage error={errors.bankName} />

              <input
                placeholder="Account Number"
                value={formData.accountNumber}
                onChange={(e) =>
                  handleChange("accountNumber", e.target.value)
                }
                className="w-full border p-2"
              />
              <ErrorMessage error={errors.accountNumber} />

              <input
                placeholder="IFSC"
                value={formData.ifscCode}
                onChange={(e) => handleChange("ifscCode", e.target.value)}
                className="w-full border p-2"
              />
              <ErrorMessage error={errors.ifscCode} />

              <input
                placeholder="Branch"
                value={formData.branchName}
                onChange={(e) => handleChange("branchName", e.target.value)}
                className="w-full border p-2"
              />

              <input
                type="number"
                placeholder="Opening Balance"
                value={formData.openingBalance}
                onChange={(e) =>
                  handleChange("openingBalance", e.target.value)
                }
                className="w-full border p-2"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={handleClose}>
                  Cancel
                </button>

                <button className="bg-indigo-600 text-white px-4 py-2 rounded">
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddBankModal;