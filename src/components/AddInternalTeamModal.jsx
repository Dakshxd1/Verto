import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Users, Briefcase, DollarSign, Calendar, AlertCircle } from 'lucide-react';

const AddInternalTeamModal = ({ isOpen, onClose, editingEmployee }) => {
  const [formData, setFormData] = useState({
    entity: '',
    department: '',
    empCode: '',
    name: '',
    fatherName: '',
    designation: '',
    location: '',
    dob: '',
    doj: '',
    ctc: '',
    pf: '',
    esi: '',
    bonus: '',
    variable: '',
    otherComponent: '',
    reimbursement: '',
    costHeadBreakup: {
      os: 0,
      temp: 0,
      recruitment: 0,
      projects: 0,
      others: 0
    },
    clientFocus: [{ clientName: '', percentage: 0 }],
    lastWorkingDay: '',
    status: 'Active'
  });

  const [errors, setErrors] = useState({});

  // Populate form when editing, reset when adding new
  React.useEffect(() => {
    console.log('Modal opened, isOpen:', isOpen, 'editingEmployee:', editingEmployee);
    
    if (editingEmployee && isOpen) {
      console.log('Populating form with employee data:', editingEmployee);
      setFormData({
        entity: editingEmployee.entity || 'Verto India Pvt Ltd',
        department: editingEmployee.department || '',
        empCode: editingEmployee.empCode || '',
        name: editingEmployee.name || '',
        fatherName: editingEmployee.fatherName || '',
        designation: editingEmployee.designation || '',
        location: editingEmployee.location || '',
        dob: editingEmployee.dob || '',
        doj: editingEmployee.doj || '',
        ctc: String(editingEmployee.ctc || ''),
        pf: String(editingEmployee.pf || ''),
        esi: String(editingEmployee.esi || ''),
        bonus: String(editingEmployee.bonus || ''),
        variable: String(editingEmployee.variable || ''),
        otherComponent: String(editingEmployee.otherComponent || ''),
        reimbursement: String(editingEmployee.reimbursement || ''),
        costHeadBreakup: editingEmployee.costHeadBreakup || {
          os: 25,
          temp: 25,
          recruitment: 25,
          projects: 25,
          others: 0
        },
        clientFocus: editingEmployee.clientFocus || [{ clientName: '', percentage: 0 }],
        lastWorkingDay: editingEmployee.lastWorkingDay || '',
        status: editingEmployee.status || 'Active'
      });
    } else if (isOpen && !editingEmployee) {
      console.log('Resetting form for new entry');
      // Reset form for new entry
      setFormData({
        entity: '',
        department: '',
        empCode: '',
        name: '',
        fatherName: '',
        designation: '',
        location: '',
        dob: '',
        doj: '',
        ctc: '',
        pf: '',
        esi: '',
        bonus: '',
        variable: '',
        otherComponent: '',
        reimbursement: '',
        costHeadBreakup: {
          os: 0,
          temp: 0,
          recruitment: 0,
          projects: 0,
          others: 0
        },
        clientFocus: [{ clientName: '', percentage: 0 }],
        lastWorkingDay: '',
        status: 'Active'
      });
      setErrors({});
    }
  }, [editingEmployee, isOpen]);

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

  const handleClientFocusChange = (index, field, value) => {
    const updated = [...formData.clientFocus];
    updated[index][field] = field === 'percentage' ? (parseInt(value) || 0) : value;
    setFormData(prev => ({ ...prev, clientFocus: updated }));
  };

  const addClientFocus = () => {
    setFormData(prev => ({
      ...prev,
      clientFocus: [...prev.clientFocus, { clientName: '', percentage: 0 }]
    }));
  };

  const removeClientFocus = (index) => {
    setFormData(prev => ({
      ...prev,
      clientFocus: prev.clientFocus.filter((_, i) => i !== index)
    }));
  };

  const calculateCostTotal = () => {
    const { os, temp, recruitment, projects, others } = formData.costHeadBreakup;
    return os + temp + recruitment + projects + others;
  };

  const calculateClientFocusTotal = () => {
    return formData.clientFocus.reduce((sum, item) => sum + item.percentage, 0);
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.entity) newErrors.entity = 'Entity is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.empCode) newErrors.empCode = 'Employee/Temp Code is required';
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.designation) newErrors.designation = 'Designation is required';
    if (!formData.doj) newErrors.doj = 'Date of Joining is required';
    if (!formData.ctc) newErrors.ctc = 'CTC is required';
    
    const costTotal = calculateCostTotal();
    if (costTotal !== 100) {
      newErrors.costHeadBreakup = 'Cost head breakdown must total 100%';
    }

    const clientTotal = calculateClientFocusTotal();
    if (formData.clientFocus.some(c => c.clientName) && clientTotal !== 100) {
      newErrors.clientFocus = 'Client focus percentages must total 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      console.log('Form submitted:', formData);
      console.log('Editing mode:', !!editingEmployee);
      // Here you would typically save the data
      onClose();
    }
  };

  if (!isOpen) return null;

  const costTotal = calculateCostTotal();
  const clientTotal = calculateClientFocusTotal();

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
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center sticky top-0 z-10">
            <h3 className="text-lg font-bold flex items-center">
              <Users className="w-5 h-5 mr-2" />
              {editingEmployee ? 'Edit Internal Team Details' : 'Add Internal Team Details'}
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
                <Briefcase className="w-4 h-4 mr-2" />
                Basic Information
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
                    Department (Master) <span className="text-red-500">*</span>
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
                    <option value="Projects">Projects</option>
                    <option value="Others">Others</option>
                  </select>
                  {errors.department && <p className="text-xs text-red-500 mt-1">{errors.department}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emp Code/Temp Code <span className="text-red-500">*</span>
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
                    placeholder="Full Name"
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Father Name</label>
                  <input 
                    type="text"
                    value={formData.fatherName}
                    onChange={(e) => handleChange('fatherName', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Father's Name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input 
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DOB</label>
                  <input 
                    type="date"
                    value={formData.dob}
                    onChange={(e) => handleChange('dob', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Employment Details
              </h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DOJ <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date"
                    required
                    value={formData.doj}
                    onChange={(e) => handleChange('doj', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.doj ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.doj && <p className="text-xs text-red-500 mt-1">{errors.doj}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Working Day</label>
                  <input 
                    type="date"
                    value={formData.lastWorkingDay}
                    onChange={(e) => handleChange('lastWorkingDay', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Not Active">Not Active</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Compensation Details */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                Compensation Details
              </h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CTC <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number"
                    required
                    value={formData.ctc}
                    onChange={(e) => handleChange('ctc', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.ctc ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Annual CTC"
                  />
                  {errors.ctc && <p className="text-xs text-red-500 mt-1">{errors.ctc}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PF</label>
                  <input 
                    type="number"
                    value={formData.pf}
                    onChange={(e) => handleChange('pf', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="PF Amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ESI</label>
                  <input 
                    type="number"
                    value={formData.esi}
                    onChange={(e) => handleChange('esi', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ESI Amount"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bonus</label>
                  <input 
                    type="number"
                    value={formData.bonus}
                    onChange={(e) => handleChange('bonus', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Bonus"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Variable</label>
                  <input 
                    type="number"
                    value={formData.variable}
                    onChange={(e) => handleChange('variable', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Variable Pay"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Component</label>
                  <input 
                    type="number"
                    value={formData.otherComponent}
                    onChange={(e) => handleChange('otherComponent', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Other"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reimbursement</label>
                  <input 
                    type="number"
                    value={formData.reimbursement}
                    onChange={(e) => handleChange('reimbursement', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Reimbursement"
                  />
                </div>
              </div>
            </div>

            {/* Cost Head Break Up */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-gray-900">Cost Head Break Up</h4>
                <span className={`text-sm font-bold ${costTotal === 100 ? 'text-emerald-600' : 'text-red-600'}`}>
                  Total: {costTotal}%
                </span>
              </div>
              
              <div className="grid grid-cols-5 gap-3">
                {['os', 'temp', 'recruitment', 'projects', 'others'].map((head) => (
                  <div key={head}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{head}</label>
                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        value={formData.costHeadBreakup[head]}
                        onChange={(e) => handleCostHeadChange(head, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            {/* Client Name(s) and % Focus */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-gray-900">Client Name(s) and % Focus (Optional)</h4>
                <div className="flex items-center space-x-3">
                  <span className={`text-sm font-bold ${clientTotal === 100 || clientTotal === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    Total: {clientTotal}%
                  </span>
                  <button
                    type="button"
                    onClick={addClientFocus}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Client</span>
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                {formData.clientFocus.map((client, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-1">
                      <input 
                        type="text"
                        value={client.clientName}
                        onChange={(e) => handleClientFocusChange(index, 'clientName', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Client Name"
                      />
                    </div>
                    <div className="w-32">
                      <div className="relative">
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          value={client.percentage}
                          onChange={(e) => handleClientFocusChange(index, 'percentage', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                        <span className="absolute right-3 top-2 text-gray-500">%</span>
                      </div>
                    </div>
                    {formData.clientFocus.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeClientFocus(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {errors.clientFocus && (
                <p className="text-sm text-amber-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.clientFocus}
                </p>
              )}
            </div>

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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingEmployee ? 'Update Team Member' : 'Save Team Member'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>,
    document.body
  );
};

export default AddInternalTeamModal;
