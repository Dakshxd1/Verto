import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { X, Plus, Users, FileText, DollarSign } from 'lucide-react';

const AddExpenseDetailsManModal = ({ isOpen, onClose }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [formData, setFormData] = useState({
    // Internal Employee Fields
    entity: '',
    department: '',
    empCode: '',
    name: '',
    designation: '',
    paymentHeader: '',
    paymentAmount: '',
    paymentDescription: '',
    dateOfPay: '',
    bankNameAccNo: '',
    remarks: '',
    
    // OS Payout Fields
    invoiceAvailable: 'No',
    invoiceNumber: '',
    noOfEmployees: '',
    amountPaid: '',
    datePaid: '',
    bankDetails: '',
    osEntity: '',
    osDepartment: '',
    osClient: '',
    ledgerName: '',
    paymentDetails: '',
    payoutMonth: '',
    osNoOfEmployees: '',
    osAmountPaid: '',
    osDatePaid: '',
    osBankDetails: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (selectedOption === 'internal') {
      if (!formData.entity) newErrors.entity = 'Entity is required';
      if (!formData.department) newErrors.department = 'Department is required';
      if (!formData.empCode) newErrors.empCode = 'Emp Code is required';
      if (!formData.name) newErrors.name = 'Name is required';
      if (!formData.designation) newErrors.designation = 'Designation is required';
      if (!formData.paymentHeader) newErrors.paymentHeader = 'Payment Header is required';
      if (!formData.paymentAmount) newErrors.paymentAmount = 'Payment Amount is required';
      if (!formData.dateOfPay) newErrors.dateOfPay = 'Date of Pay is required';
    } else if (selectedOption === 'os') {
      if (formData.invoiceAvailable === 'Yes' && !formData.invoiceNumber) {
        newErrors.invoiceNumber = 'Invoice Number is required';
      }
      if (formData.invoiceAvailable === 'No') {
        if (!formData.osEntity) newErrors.osEntity = 'Entity is required';
        if (!formData.osDepartment) newErrors.osDepartment = 'Department is required';
        if (!formData.osClient) newErrors.osClient = 'Client is required';
        if (!formData.ledgerName) newErrors.ledgerName = 'Ledger Name is required';
        if (!formData.paymentDetails) newErrors.paymentDetails = 'Payment Details is required';
        if (!formData.payoutMonth) newErrors.payoutMonth = 'Payout Month is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      console.log('Expense Details/Man submitted:', { selectedOption, ...formData });
      onClose();
      // Reset form
      setSelectedOption(null);
      setFormData({
        entity: '', department: '', empCode: '', name: '', designation: '',
        paymentHeader: '', paymentAmount: '', paymentDescription: '',
        dateOfPay: '', bankNameAccNo: '', remarks: '',
        invoiceAvailable: 'No', invoiceNumber: '', noOfEmployees: '',
        amountPaid: '', datePaid: '', bankDetails: '',
        osEntity: '', osDepartment: '', osClient: '', ledgerName: '',
        paymentDetails: '', payoutMonth: '', osNoOfEmployees: '',
        osAmountPaid: '', osDatePaid: '', osBankDetails: ''
      });
      setErrors({});
    }
  };

  if (!isOpen) return null;

  const renderOptionSelection = () => (
    <div className="p-8 space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Select Expense Type</h3>
        <p className="text-gray-600">Choose the type of expense details you want to add</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedOption('internal')}
          className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl hover:border-blue-400 transition-all group"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-xl font-bold text-gray-900">Internal Employee</h4>
            <p className="text-sm text-gray-600 text-center">
              Add expense details for internal company employees
            </p>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedOption('os')}
          className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl hover:border-purple-400 transition-all group"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-xl font-bold text-gray-900">3rd Party / OS Payout</h4>
            <p className="text-sm text-gray-600 text-center">
              Add expense details for outsourced or 3rd party people
            </p>
          </div>
        </motion.button>
      </div>
    </div>
  );

  const renderInternalEmployeeForm = () => (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <h4 className="font-semibold text-gray-900 flex items-center">
          <Users className="w-4 h-4 mr-2" />
          Internal Employee Expense Details
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity <span className="text-red-500">*</span>
            </label>
            <select 
              required
              value={formData.entity}
              onChange={(e) => handleChange('entity', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.entity ? 'border-red-500' : 'border-gray-300'}`}
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
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.department ? 'border-red-500' : 'border-gray-300'}`}
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

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emp Code <span className="text-red-500">*</span>
            </label>
            <input 
              type="text"
              required
              value={formData.empCode}
              onChange={(e) => handleChange('empCode', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.empCode ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="EMP001"
            />
            {errors.empCode && <p className="text-xs text-red-500 mt-1">{errors.empCode}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input 
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Employee Name"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Designation <span className="text-red-500">*</span>
            </label>
            <input 
              type="text"
              required
              value={formData.designation}
              onChange={(e) => handleChange('designation', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.designation ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Job Title"
            />
            {errors.designation && <p className="text-xs text-red-500 mt-1">{errors.designation}</p>}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <h4 className="font-semibold text-gray-900 flex items-center">
          <DollarSign className="w-4 h-4 mr-2" />
          Payment Information
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Header <span className="text-red-500">*</span>
            </label>
            <select 
              required
              value={formData.paymentHeader}
              onChange={(e) => handleChange('paymentHeader', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.paymentHeader ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select Payment Header</option>
              <option value="Fixed Salary">Fixed Salary</option>
              <option value="Variable">Variable</option>
              <option value="Reimbursement">Reimbursement</option>
              <option value="Bonus">Bonus</option>
              <option value="Others">Others</option>
              <option value="Loan-Advance">Loan-Advance</option>
            </select>
            {errors.paymentHeader && <p className="text-xs text-red-500 mt-1">{errors.paymentHeader}</p>}
            <p className="text-xs text-gray-500 mt-1">Fixed Salary / Variable / Reimbursement / Bonus / Others / Loan-Advance</p>
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
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.paymentAmount ? 'border-red-500' : 'border-gray-300'}`}
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.dateOfPay ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.dateOfPay && <p className="text-xs text-red-500 mt-1">{errors.dateOfPay}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name/Acct No</label>
            <input 
              type="text"
              value={formData.bankNameAccNo}
              onChange={(e) => handleChange('bankNameAccNo', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Bank details"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
          <textarea 
            value={formData.remarks}
            onChange={(e) => handleChange('remarks', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="2"
            placeholder="Additional remarks..."
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setSelectedOption(null)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save Internal Employee Expense
        </button>
      </div>
    </form>
  );

  const renderOSPayoutForm = () => (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <h4 className="font-semibold text-gray-900 flex items-center">
          <FileText className="w-4 h-4 mr-2" />
          OS Payout Details
        </h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invoice Number Available <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input 
                type="radio"
                value="Yes"
                checked={formData.invoiceAvailable === 'Yes'}
                onChange={(e) => handleChange('invoiceAvailable', e.target.value)}
                className="mr-2"
              />
              <span>Yes</span>
            </label>
            <label className="flex items-center">
              <input 
                type="radio"
                value="No"
                checked={formData.invoiceAvailable === 'No'}
                onChange={(e) => handleChange('invoiceAvailable', e.target.value)}
                className="mr-2"
              />
              <span>No</span>
            </label>
          </div>
        </div>

        {formData.invoiceAvailable === 'Yes' && (
          <div className="bg-blue-50 p-4 rounded-lg space-y-4 border border-blue-200">
            <h5 className="font-semibold text-blue-900">Invoice Details</h5>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  value={formData.invoiceNumber}
                  onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.invoiceNumber ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="INV-001"
                />
                {errors.invoiceNumber && <p className="text-xs text-red-500 mt-1">{errors.invoiceNumber}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No of Employees</label>
                <input 
                  type="number"
                  value={formData.noOfEmployees}
                  onChange={(e) => handleChange('noOfEmployees', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Number of employees"
                />
                <p className="text-xs text-gray-500 mt-1">To link with Employees Paid when Invoice is Generated</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                <input 
                  type="number"
                  value={formData.amountPaid}
                  onChange={(e) => handleChange('amountPaid', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                />
                <p className="text-xs text-gray-500 mt-1">To link with Amount Paid when Invoice is Generated</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Paid</label>
                <input 
                  type="date"
                  value={formData.datePaid}
                  onChange={(e) => handleChange('datePaid', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank details (payout)</label>
              <input 
                type="text"
                value={formData.bankDetails}
                onChange={(e) => handleChange('bankDetails', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Bank account details"
              />
            </div>
          </div>
        )}

        {formData.invoiceAvailable === 'No' && (
          <div className="bg-purple-50 p-4 rounded-lg space-y-4 border border-purple-200">
            <h5 className="font-semibold text-purple-900">Manual Entry Details</h5>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entity <span className="text-red-500">*</span>
                </label>
                <select 
                  required
                  value={formData.osEntity}
                  onChange={(e) => handleChange('osEntity', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.osEntity ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select Entity</option>
                  <option value="Verto India Pvt Ltd">Verto India Pvt Ltd</option>
                  <option value="Verto Global LLC">Verto Global LLC</option>
                  <option value="Verto UK Ltd">Verto UK Ltd</option>
                </select>
                {errors.osEntity && <p className="text-xs text-red-500 mt-1">{errors.osEntity}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <select 
                  required
                  value={formData.osDepartment}
                  onChange={(e) => handleChange('osDepartment', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.osDepartment ? 'border-red-500' : 'border-gray-300'}`}
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
                {errors.osDepartment && <p className="text-xs text-red-500 mt-1">{errors.osDepartment}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client <span className="text-red-500">*</span>
                </label>
                <select 
                  required
                  value={formData.osClient}
                  onChange={(e) => handleChange('osClient', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.osClient ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select Client</option>
                  <option value="Acme Corp">Acme Corp</option>
                  <option value="Globex">Globex</option>
                  <option value="Soylent">Soylent</option>
                  <option value="Initech">Initech</option>
                  <option value="Umbrella">Umbrella</option>
                </select>
                {errors.osClient && <p className="text-xs text-red-500 mt-1">{errors.osClient}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ledger Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  value={formData.ledgerName}
                  onChange={(e) => handleChange('ledgerName', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.ledgerName ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Ledger name"
                />
                {errors.ledgerName && <p className="text-xs text-red-500 mt-1">{errors.ledgerName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Details <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  value={formData.paymentDetails}
                  onChange={(e) => handleChange('paymentDetails', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.paymentDetails ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Payment details"
                />
                {errors.paymentDetails && <p className="text-xs text-red-500 mt-1">{errors.paymentDetails}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payout for the Month <span className="text-red-500">*</span>
                </label>
                <input 
                  type="month"
                  required
                  value={formData.payoutMonth}
                  onChange={(e) => handleChange('payoutMonth', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.payoutMonth ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.payoutMonth && <p className="text-xs text-red-500 mt-1">{errors.payoutMonth}</p>}
                <p className="text-xs text-gray-500 mt-1">To link with Employees Paid when Invoice is Generated</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No of Employees</label>
                <input 
                  type="number"
                  value={formData.osNoOfEmployees}
                  onChange={(e) => handleChange('osNoOfEmployees', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Number of employees"
                />
                <p className="text-xs text-gray-500 mt-1">To link with Employees Paid when Invoice is Generated</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                <input 
                  type="number"
                  value={formData.osAmountPaid}
                  onChange={(e) => handleChange('osAmountPaid', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter amount"
                />
                <p className="text-xs text-gray-500 mt-1">To link with Amount Paid when Invoice is Generated</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Paid</label>
                <input 
                  type="date"
                  value={formData.osDatePaid}
                  onChange={(e) => handleChange('osDatePaid', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank details (payout)</label>
              <input 
                type="text"
                value={formData.osBankDetails}
                onChange={(e) => handleChange('osBankDetails', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Bank account details"
              />
            </div>

            <div className="bg-purple-100 p-3 rounded-lg">
              <p className="text-xs text-purple-900">
                <strong>Note:</strong> Generate Pay OUT ref NO - PO-021225-01 (Client Name code -DDMMYY- 01 ( No of Payment ref generated specific day against the client)
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setSelectedOption(null)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Save OS Payout Details
        </button>
      </div>
    </form>
  );

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99999]">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-700 text-white flex justify-between items-center sticky top-0 z-10">
            <h3 className="text-lg font-bold flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Add Expense Details / Man
            </h3>
            <button 
              onClick={onClose} 
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {!selectedOption && renderOptionSelection()}
          {selectedOption === 'internal' && renderInternalEmployeeForm()}
          {selectedOption === 'os' && renderOSPayoutForm()}
        </motion.div>
      </div>
    </div>,
    document.body
  );
};

export default AddExpenseDetailsManModal;
