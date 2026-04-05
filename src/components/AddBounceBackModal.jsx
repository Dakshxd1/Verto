import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, AlertCircle, RefreshCcw } from 'lucide-react';

const AddBounceBackModal = ({ isOpen, onClose, invoices = [], paymentReferences = [] }) => {
  // Local form state
  const [formData, setFormData] = useState({
    invoiceOrPaymentRef: '',
    dateOfBounceBack: '',
    bankDetails: '',
    bounceBackAmount: '',
    employeeCount: '',
    remarks: ''
  });

  const [errors, setErrors] = useState({});
  const [showErrors, setShowErrors] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);

  // Single handleChange function
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // When invoice/payment reference changes, fetch details
  useEffect(() => {
    if (formData.invoiceOrPaymentRef) {
      // TODO: Replace with actual API call to fetch invoice/payment details
      // For now, simulate fetching details
      const mockDetails = {
        client: 'Acme Corp',
        department: 'Operations',
        entity: 'Verto India Pvt Ltd',
        originalAmount: 45000,
        amountPayable: 42000,
        bankBalance: 150000,
        invoiceDate: '15/01/2023'
      };
      setSelectedDetails(mockDetails);
    } else {
      setSelectedDetails(null);
    }
  }, [formData.invoiceOrPaymentRef]);

  // Calculate new amounts after bounce back
  const calculateImpact = () => {
    if (!selectedDetails || !formData.bounceBackAmount) return null;
    
    const bbAmount = parseFloat(formData.bounceBackAmount);
    const newAmountPayable = selectedDetails.amountPayable + bbAmount;
    const newBankBalance = selectedDetails.bankBalance - bbAmount;
    
    return {
      newAmountPayable,
      newBankBalance
    };
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.invoiceOrPaymentRef.trim()) newErrors.invoiceOrPaymentRef = 'Invoice number or payment reference is required';
    if (!formData.dateOfBounceBack) newErrors.dateOfBounceBack = 'Date of bounce back is required';
    if (!formData.bankDetails.trim()) newErrors.bankDetails = 'Bank details are required';
    if (!formData.bounceBackAmount) newErrors.bounceBackAmount = 'Bounce back amount is required';
    
    // Employee count is required only for OS department
    if (selectedDetails?.department === 'Operations' && !formData.employeeCount) {
      newErrors.employeeCount = 'Employee count is required for OS department';
    }

    // Validate amount
    if (formData.bounceBackAmount) {
      const amount = parseFloat(formData.bounceBackAmount);
      if (amount <= 0) {
        newErrors.bounceBackAmount = 'Amount must be greater than 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setShowErrors(true);

    if (!validateForm()) {
      return;
    }

    // Prepare submission data
    const impact = calculateImpact();
    const submissionData = {
      ...formData,
      selectedDetails,
      impact,
      submittedAt: new Date().toISOString()
    };

    console.log('Bounce Back Submitted:', submissionData);
    
    // TODO: Send to backend API when available
    // await api.saveBounceBack(submissionData);

    // Reset form and close modal
    resetForm();
    onClose();
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      invoiceOrPaymentRef: '',
      dateOfBounceBack: '',
      bankDetails: '',
      bounceBackAmount: '',
      employeeCount: '',
      remarks: ''
    });
    setSelectedDetails(null);
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-600 to-pink-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">+ ADD BOUNCE BACK</h2>
                  <p className="text-rose-100 text-sm mt-1">Record payment bounce back details</p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-rose-100 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Invoice/Payment Reference Selection */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-4 flex items-center">
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Reference Details
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Enter Invoice Number or Payment Reference <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        list="references-list"
                        value={formData.invoiceOrPaymentRef}
                        onChange={(e) => handleChange('invoiceOrPaymentRef', e.target.value)}
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                          showErrors && errors.invoiceOrPaymentRef ? 'border-rose-500' : 'border-gray-300'
                        }`}
                        placeholder="INV-2023001 or PI-AC-150123-01"
                      />
                      <datalist id="references-list">
                        {invoices.map((invoice, idx) => (
                          <option key={`inv-${idx}`} value={invoice} />
                        ))}
                        {paymentReferences.map((ref, idx) => (
                          <option key={`ref-${idx}`} value={ref} />
                        ))}
                      </datalist>
                      <ErrorMessage error={errors.invoiceOrPaymentRef} />
                      <p className="text-xs text-gray-500 mt-1">Rest details auto pop up</p>
                    </div>
                  </div>

                  {/* Auto-populated Details */}
                  {selectedDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-blue-200"
                    >
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Client</p>
                          <p className="font-semibold text-gray-900 mt-1">{selectedDetails.client}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Department</p>
                          <p className="font-semibold text-gray-900 mt-1">{selectedDetails.department}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Entity</p>
                          <p className="font-semibold text-gray-900 mt-1">{selectedDetails.entity}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Original Amount</p>
                          <p className="font-semibold text-gray-900 mt-1">₹ {selectedDetails.originalAmount.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Current Amount Payable</p>
                          <p className="font-semibold text-emerald-600 mt-1">₹ {selectedDetails.amountPayable.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Bank Balance</p>
                          <p className="font-semibold text-blue-600 mt-1">₹ {selectedDetails.bankBalance.toLocaleString('en-IN')}</p>
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
                        Date of Bounce Back <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.dateOfBounceBack}
                        onChange={(e) => handleChange('dateOfBounceBack', e.target.value)}
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 ${
                          showErrors && errors.dateOfBounceBack ? 'border-rose-500' : 'border-gray-300'
                        }`}
                      />
                      <ErrorMessage error={errors.dateOfBounceBack} />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Bank Details <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.bankDetails}
                        onChange={(e) => handleChange('bankDetails', e.target.value)}
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 ${
                          showErrors && errors.bankDetails ? 'border-rose-500' : 'border-gray-300'
                        }`}
                        placeholder="Bank account details"
                      />
                      <ErrorMessage error={errors.bankDetails} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Enter BB Amount <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.bounceBackAmount}
                        onChange={(e) => handleChange('bounceBackAmount', e.target.value)}
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 ${
                          showErrors && errors.bounceBackAmount ? 'border-rose-500' : 'border-gray-300'
                        }`}
                        placeholder="₹ 0"
                      />
                      <ErrorMessage error={errors.bounceBackAmount} />
                      <p className="text-xs text-gray-500 mt-1">
                        Amount would add up in Amount Payable details
                      </p>
                    </div>
                  </div>

                  {/* Employee Count - Only for OS Department */}
                  {selectedDetails?.department === 'Operations' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Enter Employee Count <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="number"
                          value={formData.employeeCount}
                          onChange={(e) => handleChange('employeeCount', e.target.value)}
                          className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 ${
                            showErrors && errors.employeeCount ? 'border-rose-500' : 'border-gray-300'
                          }`}
                          placeholder="0"
                        />
                        <ErrorMessage error={errors.employeeCount} />
                        <p className="text-xs text-gray-500 mt-1">
                          This option comes if Department is OS and count of employees would auto add up
                        </p>
                      </div>
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
                    onChange={(e) => handleChange('remarks', e.target.value)}
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
                          <p className="text-xs text-gray-600 uppercase tracking-wider">Current Amount Payable</p>
                          <p className="text-lg font-bold text-gray-900 mt-1">
                            ₹ {selectedDetails.amountPayable.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wider">Bounce Back Amount</p>
                          <p className="text-lg font-bold text-rose-600 mt-1">
                            + ₹ {parseFloat(formData.bounceBackAmount).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wider">New Amount Payable</p>
                          <p className="text-lg font-bold text-amber-600 mt-1">
                            ₹ {impact.newAmountPayable.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wider">Current Bank Balance</p>
                          <p className="text-lg font-bold text-gray-900 mt-1">
                            ₹ {selectedDetails.bankBalance.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wider">Deduction</p>
                          <p className="text-lg font-bold text-rose-600 mt-1">
                            - ₹ {parseFloat(formData.bounceBackAmount).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wider">New Bank Balance</p>
                          <p className="text-lg font-bold text-blue-600 mt-1">
                            ₹ {impact.newBankBalance.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-3 italic">
                      Also subtracted from Bank Balance details
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
                    className="px-8 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-rose-500/30 flex items-center space-x-2"
                  >
                    <span>Save Bounce Back</span>
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

export default AddBounceBackModal;
