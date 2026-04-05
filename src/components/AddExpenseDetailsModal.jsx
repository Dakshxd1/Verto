import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { X, Plus, DollarSign, FileText, AlertCircle, Percent } from 'lucide-react';

const AddExpenseDetailsModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    expenseNature: 'Internal',
    clientName: '',
    entity: '',
    department: '',
    paymentRegularity: 'One Time',
    paymentHeader: '',
    monthOfExpense: '',
    paymentAmount: '',
    paymentDescription: '',
    dateOfPay: '',
    bankNameAccNo: '',
    // Cost Head Break Up
    costHeadBreakup: {
      ops: 0,
      temp: 0,
      recruitment: 0,
      projects: 0,
      others: 0
    },
    // Asset Purchase fields
    assetDescription: '',
    warrantyPeriod: '',
    currentStatus: 'In Use',
    issuedTo: '',
    // OS Client Break Up
    osClientBreakup: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCostHeadChange = (head, value) => {
    setFormData(prev => ({
      ...prev,
      costHeadBreakup: {
        ...prev.costHeadBreakup,
        [head]: parseInt(value) || 0
      }
    }));
  };

  const calculateCostTotal = () => {
    const { ops, temp, recruitment, projects, others } = formData.costHeadBreakup;
    return ops + temp + recruitment + projects + others;
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.expenseNature) newErrors.expenseNature = 'Expense Nature is required';
    if (formData.expenseNature === 'Client' && !formData.clientName) {
      newErrors.clientName = 'Client Name is required';
    }
    if (!formData.entity) newErrors.entity = 'Entity is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.paymentRegularity) newErrors.paymentRegularity = 'Payment Regularity is required';
    if (!formData.paymentHeader) newErrors.paymentHeader = 'Payment Header is required';
    if (!formData.monthOfExpense) newErrors.monthOfExpense = 'Month of Expense is required';
    if (!formData.paymentAmount) newErrors.paymentAmount = 'Payment Amount is required';
    if (!formData.dateOfPay) newErrors.dateOfPay = 'Date of Pay is required';
    
    const costTotal = calculateCostTotal();
    if (costTotal !== 100) {
      newErrors.costHeadBreakup = 'Cost head breakdown must total 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      console.log('Expense Details submitted:', formData);
      onClose();
      // Reset form
      setFormData({
        expenseNature: 'Internal',
        clientName: '',
        entity: '',
        department: '',
        paymentRegularity: 'One Time',
        paymentHeader: '',
        monthOfExpense: '',
        paymentAmount: '',
        paymentDescription: '',
        dateOfPay: '',
        bankNameAccNo: '',
        costHeadBreakup: { ops: 0, temp: 0, recruitment: 0, projects: 0, others: 0 },
        assetDescription: '',
        warrantyPeriod: '',
        currentStatus: 'In Use',
        issuedTo: '',
        osClientBreakup: ''
      });
      setErrors({});
    }
  };

  if (!isOpen) return null;

  const costTotal = calculateCostTotal();
  const isAssetPurchase = formData.paymentHeader === 'Asset Purchase';
  const isOSDepartment = formData.department === 'Ops';

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99999]">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-600 to-red-700 text-white flex justify-between items-center sticky top-0 z-10">
            <h3 className="text-lg font-bold flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Add Expense Details / Material
            </h3>
            <button 
              onClick={onClose} 
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Expense Information
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expense Nature <span className="text-red-500">*</span>
                  </label>
                  <select 
                    required
                    value={formData.expenseNature}
                    onChange={(e) => handleChange('expenseNature', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.expenseNature ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="Internal">Internal</option>
                    <option value="Client">Client</option>
                  </select>
                  {errors.expenseNature && <p className="text-xs text-red-500 mt-1">{errors.expenseNature}</p>}
                  <p className="text-xs text-gray-500 mt-1">In case client, dropdown option to choose client name</p>
                </div>

                {formData.expenseNature === 'Client' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name <span className="text-red-500">*</span>
                    </label>
                    <select 
                      required
                      value={formData.clientName}
                      onChange={(e) => handleChange('clientName', e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.clientName ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">Select Client</option>
                      <option value="Acme Corp">Acme Corp</option>
                      <option value="Globex">Globex</option>
                      <option value="Soylent">Soylent</option>
                      <option value="Initech">Initech</option>
                      <option value="Umbrella">Umbrella</option>
                    </select>
                    {errors.clientName && <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entity <span className="text-red-500">*</span>
                  </label>
                  <select 
                    required
                    value={formData.entity}
                    onChange={(e) => handleChange('entity', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.entity ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="">Select Entity</option>
                    <option value="Verto India Pvt Ltd">Verto India Pvt Ltd</option>
                    <option value="Verto Global LLC">Verto Global LLC</option>
                    <option value="Verto UK Ltd">Verto UK Ltd</option>
                  </select>
                  {errors.entity && <p className="text-xs text-red-500 mt-1">{errors.entity}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select 
                    required
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.department ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="">Select Department</option>
                    <option value="Common">Common</option>
                    <option value="Ops">Ops</option>
                    <option value="Temp">Temp</option>
                    <option value="Rec">Rec</option>
                    <option value="BD">BD</option>
                    <option value="Accts">Accts</option>
                    <option value="HR">HR</option>
                    <option value="Admin">Admin</option>
                    <option value="IT">IT</option>
                    <option value="Legal">Legal</option>
                    <option value="Projects">Projects</option>
                    <option value="Others">Others</option>
                  </select>
                  {errors.department && <p className="text-xs text-red-500 mt-1">{errors.department}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Regularity <span className="text-red-500">*</span>
                  </label>
                  <select 
                    required
                    value={formData.paymentRegularity}
                    onChange={(e) => handleChange('paymentRegularity', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.paymentRegularity ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="One Time">One Time</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Regular">Regular</option>
                  </select>
                  {errors.paymentRegularity && <p className="text-xs text-red-500 mt-1">{errors.paymentRegularity}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Header <span className="text-red-500">*</span>
                  </label>
                  <select 
                    required
                    value={formData.paymentHeader}
                    onChange={(e) => handleChange('paymentHeader', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.paymentHeader ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="">Select Payment Header</option>
                    <option value="Asset Purchase">Asset Purchase</option>
                    <option value="Repair">Repair</option>
                    <option value="Software">Software</option>
                    <option value="F&B">F&B</option>
                    <option value="HK">HK</option>
                    <option value="Stationery">Stationery</option>
                    <option value="Rental">Rental</option>
                    <option value="Water">Water</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Parking">Parking</option>
                    <option value="Donation">Donation</option>
                    <option value="Electrical Items">Electrical Items</option>
                    <option value="IT Child Parts">IT Child Parts</option>
                    <option value="Internet">Internet</option>
                    <option value="Mobile Bill">Mobile Bill</option>
                    <option value="Liaison">Liaison</option>
                    <option value="Others">Others</option>
                  </select>
                  {errors.paymentHeader && <p className="text-xs text-red-500 mt-1">{errors.paymentHeader}</p>}
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                Payment Details
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="text-red-600">Month of Expense</span> <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="month"
                    required
                    value={formData.monthOfExpense}
                    onChange={(e) => handleChange('monthOfExpense', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.monthOfExpense ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.monthOfExpense && <p className="text-xs text-red-500 mt-1">{errors.monthOfExpense}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number"
                    required
                    value={formData.paymentAmount}
                    onChange={(e) => handleChange('paymentAmount', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.paymentAmount ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Enter amount"
                  />
                  {errors.paymentAmount && <p className="text-xs text-red-500 mt-1">{errors.paymentAmount}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-blue-600">Payment Description</label>
                <textarea 
                  value={formData.paymentDescription}
                  onChange={(e) => handleChange('paymentDescription', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows="2"
                  placeholder="Enter payment description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Pay <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date"
                    required
                    value={formData.dateOfPay}
                    onChange={(e) => handleChange('dateOfPay', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.dateOfPay ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.dateOfPay && <p className="text-xs text-red-500 mt-1">{errors.dateOfPay}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name/Acct No</label>
                  <input 
                    type="text"
                    value={formData.bankNameAccNo}
                    onChange={(e) => handleChange('bankNameAccNo', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Bank details"
                  />
                </div>
              </div>
            </div>

            {/* Cost Head Break Up */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <Percent className="w-4 h-4 mr-2" />
                  Cost Head Break Up
                </h4>
                <span className={`text-sm font-bold ${costTotal === 100 ? 'text-emerald-600' : 'text-red-600'}`}>
                  Total: {costTotal}%
                </span>
              </div>
              
              <div className="grid grid-cols-5 gap-3">
                {['ops', 'temp', 'recruitment', 'projects', 'others'].map((head) => (
                  <div key={head}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{head}</label>
                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        value={formData.costHeadBreakup[head]}
                        onChange={(e) => handleCostHeadChange(head, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <span className="absolute right-3 top-2 text-gray-500">%</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {errors.costHeadBreakup && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.costHeadBreakup}
                </p>
              )}
            </div>

            {/* Asset Purchase Section */}
            {isAssetPurchase && (
              <div className="bg-blue-50 p-4 rounded-lg space-y-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900">Asset Purchase Details</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Description (including warranty period)
                  </label>
                  <textarea 
                    value={formData.assetDescription}
                    onChange={(e) => handleChange('assetDescription', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows="2"
                    placeholder="Describe the asset and warranty period..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Status of Stock
                    </label>
                    <select 
                      value={formData.currentStatus}
                      onChange={(e) => handleChange('currentStatus', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="In Use">In Use</option>
                      <option value="In Stock">In Stock</option>
                      <option value="Defective">Defective</option>
                      <option value="Disposed">Disposed</option>
                    </select>
                  </div>

                  {formData.currentStatus === 'In Use' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        If in Use: Issued to
                      </label>
                      <input 
                        type="text"
                        value={formData.issuedTo}
                        onChange={(e) => handleChange('issuedTo', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Employee name or ID"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* OS Client Break Up */}
            {isOSDepartment && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-3">In case of OS, Client break Up</h4>
                <textarea 
                  value={formData.osClientBreakup}
                  onChange={(e) => handleChange('osClientBreakup', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows="2"
                  placeholder="Enter client breakdown for OS department..."
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={costTotal !== 100}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Expense Details
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>,
    document.body
  );
};

export default AddExpenseDetailsModal;
