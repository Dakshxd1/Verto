import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, AlertCircle, FileCheck } from 'lucide-react';

const AddStatutoryPayoutModal = ({ isOpen, onClose, entities = [] }) => {
  // Local form state
  const [formData, setFormData] = useState({
    entity: '',
    statutoryPayoutType: 'GST',
    forTheMonth: '',
    totalDue: '',
    totalPaid: '',
    pendingDue: '',
    anyInterestPenalties: 'No',
    penaltyAmount: '',
    penaltyPercentage: '',
    remarks: '',
    // Cost head breakdown for penalties
    ops: '100',
    temp: '',
    recruitment: '',
    projects: '',
    others: ''
  });

  const [errors, setErrors] = useState({});
  const [showErrors, setShowErrors] = useState(false);

  // Statutory payout types
  const statutoryTypes = [
    { value: 'GST', label: 'GST' },
    { value: 'TDS', label: 'TDS' },
    { value: 'EPF', label: 'EPF' },
    { value: 'ESI', label: 'ESI' },
    { value: 'LWF', label: 'LWF' },
    { value: 'PF', label: 'PF' },
    { value: 'Income Tax', label: 'Income Tax' },
    { value: 'Others', label: 'Others' }
  ];

  // Single handleChange function
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Auto-calculate pending due
  useEffect(() => {
    const totalDue = parseFloat(formData.totalDue) || 0;
    const totalPaid = parseFloat(formData.totalPaid) || 0;
    const pendingDue = totalDue - totalPaid;
    
    setFormData(prev => ({ 
      ...prev, 
      pendingDue: pendingDue >= 0 ? pendingDue.toFixed(2) : '0.00'
    }));
  }, [formData.totalDue, formData.totalPaid]);

  // Calculate total percentage for cost head breakdown
  const calculateTotalPercentage = () => {
    const ops = parseFloat(formData.ops) || 0;
    const temp = parseFloat(formData.temp) || 0;
    const recruitment = parseFloat(formData.recruitment) || 0;
    const projects = parseFloat(formData.projects) || 0;
    const others = parseFloat(formData.others) || 0;
    
    return ops + temp + recruitment + projects + others;
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.entity) newErrors.entity = 'Entity is required';
    if (!formData.statutoryPayoutType) newErrors.statutoryPayoutType = 'Statutory payout type is required';
    if (!formData.forTheMonth.trim()) newErrors.forTheMonth = 'Month is required';
    if (!formData.totalDue) newErrors.totalDue = 'Total due is required';
    if (!formData.totalPaid) newErrors.totalPaid = 'Total paid is required';

    // Validate penalty fields if penalties exist
    if (formData.anyInterestPenalties === 'Yes') {
      if (!formData.penaltyAmount) newErrors.penaltyAmount = 'Penalty amount is required';
      if (!formData.penaltyPercentage) newErrors.penaltyPercentage = 'Penalty percentage is required';
      
      // Validate cost head breakdown totals to 100%
      const totalPercentage = calculateTotalPercentage();
      if (Math.abs(totalPercentage - 100) > 0.01) {
        newErrors.costHeadBreakdown = 'Cost head breakdown must total 100%';
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
    const submissionData = {
      ...formData,
      costHeadBreakdown: formData.anyInterestPenalties === 'Yes' ? {
        ops: parseFloat(formData.ops) || 0,
        temp: parseFloat(formData.temp) || 0,
        recruitment: parseFloat(formData.recruitment) || 0,
        projects: parseFloat(formData.projects) || 0,
        others: parseFloat(formData.others) || 0
      } : null,
      submittedAt: new Date().toISOString()
    };

    console.log('Statutory Payout Submitted:', submissionData);
    
    // TODO: Send to backend API when available
    // await api.saveStatutoryPayout(submissionData);

    // Reset form and close modal
    resetForm();
    onClose();
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      entity: '',
      statutoryPayoutType: 'GST',
      forTheMonth: '',
      totalDue: '',
      totalPaid: '',
      pendingDue: '',
      anyInterestPenalties: 'No',
      penaltyAmount: '',
      penaltyPercentage: '',
      remarks: '',
      ops: '100',
      temp: '',
      recruitment: '',
      projects: '',
      others: ''
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

  const totalPercentage = calculateTotalPercentage();

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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">+ ADD STATUTORY PAYOUT</h2>
                  <p className="text-cyan-100 text-sm mt-1">Record statutory compliance payments</p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-cyan-100 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Basic Details */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-4 flex items-center">
                    <FileCheck className="w-4 h-4 mr-2" />
                    Statutory Details
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Entity <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={formData.entity}
                        onChange={(e) => handleChange('entity', e.target.value)}
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                          showErrors && errors.entity ? 'border-rose-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select Entity</option>
                        {entities.map((entity, idx) => (
                          <option key={idx} value={entity}>{entity}</option>
                        ))}
                      </select>
                      <ErrorMessage error={errors.entity} />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Statutory Payout <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={formData.statutoryPayoutType}
                        onChange={(e) => handleChange('statutoryPayoutType', e.target.value)}
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                          showErrors && errors.statutoryPayoutType ? 'border-rose-500' : 'border-gray-300'
                        }`}
                      >
                        {statutoryTypes.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      <ErrorMessage error={errors.statutoryPayoutType} />
                      <p className="text-xs text-gray-500 mt-1">GST/TDS/EPF/ESI/LWF/PF/Income Tax/Others</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        For The Month <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.forTheMonth}
                        onChange={(e) => handleChange('forTheMonth', e.target.value)}
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                          showErrors && errors.forTheMonth ? 'border-rose-500' : 'border-gray-300'
                        }`}
                        placeholder="e.g., Jan 2023"
                      />
                      <ErrorMessage error={errors.forTheMonth} />
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider mb-4">
                    Payment Information
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Total Due <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.totalDue}
                        onChange={(e) => handleChange('totalDue', e.target.value)}
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                          showErrors && errors.totalDue ? 'border-rose-500' : 'border-gray-300'
                        }`}
                        placeholder="₹ 0"
                      />
                      <ErrorMessage error={errors.totalDue} />
                      <p className="text-xs text-gray-500 mt-1">Auto Collate</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Total Paid <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.totalPaid}
                        onChange={(e) => handleChange('totalPaid', e.target.value)}
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                          showErrors && errors.totalPaid ? 'border-rose-500' : 'border-gray-300'
                        }`}
                        placeholder="₹ 0"
                      />
                      <ErrorMessage error={errors.totalPaid} />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Pending Due
                      </label>
                      <input
                        type="text"
                        value={formData.pendingDue}
                        readOnly
                        className="w-full bg-gray-100 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-mono font-bold"
                        placeholder="Auto-calculated"
                      />
                      <p className="text-xs text-rose-600 mt-1">Auto-calculated</p>
                    </div>
                  </div>
                </div>

                {/* Interest/Penalties Section */}
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-4">
                    Interest / Penalties
                  </h3>
                  
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                      Any Interest / Penalties
                    </label>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => handleChange('anyInterestPenalties', 'Yes')}
                        className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                          formData.anyInterestPenalties === 'Yes'
                            ? 'bg-amber-600 text-white shadow-md'
                            : 'bg-white text-gray-600 border border-gray-300'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange('anyInterestPenalties', 'No')}
                        className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                          formData.anyInterestPenalties === 'No'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-white text-gray-600 border border-gray-300'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* If Yes - Show Penalty Details */}
                  {formData.anyInterestPenalties === 'Yes' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Amount of Penalty <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="number"
                            value={formData.penaltyAmount}
                            onChange={(e) => handleChange('penaltyAmount', e.target.value)}
                            className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 ${
                              showErrors && errors.penaltyAmount ? 'border-rose-500' : 'border-gray-300'
                            }`}
                            placeholder="₹ 0"
                          />
                          <ErrorMessage error={errors.penaltyAmount} />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Penalty Percentage <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="number"
                            value={formData.penaltyPercentage}
                            onChange={(e) => handleChange('penaltyPercentage', e.target.value)}
                            className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 ${
                              showErrors && errors.penaltyPercentage ? 'border-rose-500' : 'border-gray-300'
                            }`}
                            placeholder="0 %"
                          />
                          <ErrorMessage error={errors.penaltyPercentage} />
                        </div>
                      </div>

                      {/* Cost Head Break Up for Penalties */}
                      <div className="pt-4 border-t border-amber-300">
                        <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-3">
                          Cost Head Break Up for Penalties
                        </h4>
                        
                        <div className="grid grid-cols-5 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                              Ops
                            </label>
                            <input
                              type="number"
                              value={formData.ops}
                              onChange={(e) => handleChange('ops', e.target.value)}
                              className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                              placeholder="100"
                            />
                            <p className="text-xs text-gray-500 mt-1">100%</p>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                              Temp
                            </label>
                            <input
                              type="number"
                              value={formData.temp}
                              onChange={(e) => handleChange('temp', e.target.value)}
                              className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                              Recruitment
                            </label>
                            <input
                              type="number"
                              value={formData.recruitment}
                              onChange={(e) => handleChange('recruitment', e.target.value)}
                              className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                              Projects
                            </label>
                            <input
                              type="number"
                              value={formData.projects}
                              onChange={(e) => handleChange('projects', e.target.value)}
                              className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                              Others
                            </label>
                            <input
                              type="number"
                              value={formData.others}
                              onChange={(e) => handleChange('others', e.target.value)}
                              className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* Total Percentage Display */}
                        <div className="mt-3 p-3 bg-white rounded-lg border-2 border-amber-300">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">Total</span>
                            <span className={`text-lg font-bold ${
                              Math.abs(totalPercentage - 100) < 0.01 ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {totalPercentage.toFixed(2)}%
                            </span>
                          </div>
                          {showErrors && errors.costHeadBreakdown && (
                            <ErrorMessage error={errors.costHeadBreakdown} />
                          )}
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
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => handleChange('remarks', e.target.value)}
                    rows={3}
                    className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-sm"
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
                    className="px-8 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-cyan-500/30 flex items-center space-x-2"
                  >
                    <span>Save Statutory Payout</span>
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

export default AddStatutoryPayoutModal;
