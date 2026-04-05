import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactDOM from 'react-dom';
import { 
  Search, 
  Download, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  Filter,
  Eye,
  Edit,
  X,
  Calendar,
  DollarSign,
  Briefcase
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/button';
import Badge from './ui/Badge';
import AddInternalTeamModal from './AddInternalTeamModal';

// Mock Data Generator
const generateTeamData = () => {
  const departments = ['Ops', 'Temp', 'Rec', 'BD', 'Accts', 'HR', 'Admin', 'IT', 'Projects'];
  const designations = ['Manager', 'Executive', 'Senior Executive', 'Team Lead', 'Associate', 'Consultant'];
  const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad'];
  const names = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Vikram Singh', 'Anita Desai', 'Rahul Verma', 'Pooja Gupta'];
  
  return Array.from({ length: 15 }).map((_, i) => {
    const ctc = Math.floor(300000 + Math.random() * 900000);
    return {
      id: `EMP${String(i + 1).padStart(3, '0')}`,
      department: departments[Math.floor(Math.random() * departments.length)],
      empCode: `EMP${String(i + 1).padStart(3, '0')}`,
      name: names[Math.floor(Math.random() * names.length)],
      fatherName: 'Father ' + names[Math.floor(Math.random() * names.length)].split(' ')[1],
      designation: designations[Math.floor(Math.random() * designations.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      dob: new Date(1985 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      doj: new Date(2018 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      ctc,
      pf: Math.floor(ctc * 0.12),
      esi: Math.floor(ctc * 0.0175),
      bonus: Math.floor(ctc * 0.08),
      variable: Math.floor(ctc * 0.15),
      otherComponent: Math.floor(ctc * 0.05),
      reimbursement: Math.floor(20000 + Math.random() * 30000),
      status: Math.random() > 0.2 ? 'Active' : 'Not Active'
    };
  });
};

const InternalTeamDetails = () => {
  const [data] = useState(() => generateTeamData());
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const itemsPerPage = 7;

  let filteredData = data.filter(row => {
    const matchesSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          row.empCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          row.designation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'All' || row.department === deptFilter;
    const matchesStatus = statusFilter === 'All' || row.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  // Apply sorting
  if (sortConfig.key) {
    filteredData = [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }

      return 0;
    });
  }

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, deptFilter, statusFilter]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronDown className="w-3 h-3 opacity-30" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronDown className="w-3 h-3 rotate-180" /> 
      : <ChevronDown className="w-3 h-3" />;
  };

  const formatCurrency = (val) => `₹ ${(val / 1000).toFixed(0)}K`;
  const formatCurrencyFull = (val) => `₹ ${val.toLocaleString('en-IN')}`;
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleEdit = (employee) => {
    console.log('handleEdit called with employee:', employee);
    setEditingEmployee(employee);
    setIsModalOpen(true);
    setSelectedEmployee(null);
  };

  return (
    <div className="space-y-4 pb-6">
      
      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Name, Code or Designation..." 
                className="w-80 bg-gray-50 border border-gray-200 text-gray-900 pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <select 
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Departments</option>
              <option value="Ops">Operations</option>
              <option value="Temp">Temp</option>
              <option value="Rec">Recruitment</option>
              <option value="BD">Business Development</option>
              <option value="Accts">Accounts</option>
              <option value="HR">HR</option>
              <option value="Admin">Admin</option>
              <option value="IT">IT</option>
              <option value="Projects">Projects</option>
            </select>

            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Not Active">Not Active</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" className="flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span>More Filters</span>
            </Button>
            <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <Users className="w-4 h-4 mr-2 text-blue-600" />
            Internal Team Details
          </h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {filteredData.length} team members
          </span>
        </div>
        
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="p-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('department')}>
                  <div className="flex items-center justify-between">
                    <span>Department</span>
                    <SortIcon columnKey="department" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center justify-between">
                    <span>Name</span>
                    <SortIcon columnKey="name" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('designation')}>
                  <div className="flex items-center justify-between">
                    <span>Designation</span>
                    <SortIcon columnKey="designation" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('location')}>
                  <div className="flex items-center justify-between">
                    <span>Location</span>
                    <SortIcon columnKey="location" />
                  </div>
                </th>
                <th className="p-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('ctc')}>
                  <div className="flex items-center justify-end space-x-2">
                    <span>CTC</span>
                    <SortIcon columnKey="ctc" />
                  </div>
                </th>
                <th className="p-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('variable')}>
                  <div className="flex items-center justify-end space-x-2">
                    <span>Variable</span>
                    <SortIcon columnKey="variable" />
                  </div>
                </th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
              {paginatedData.map((row, index) => (
                <motion.tr 
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="hover:bg-blue-50 transition-colors"
                >
                  <td className="p-3">
                    <Badge variant="secondary" className="text-xs">{row.department}</Badge>
                  </td>
                  <td className="p-3 font-medium text-gray-900">{row.name}</td>
                  <td className="p-3 text-gray-700">{row.designation}</td>
                  <td className="p-3 text-gray-600">{row.location}</td>
                  <td className="p-3 text-right font-mono font-medium text-gray-900">{formatCurrency(row.ctc)}</td>
                  <td className="p-3 text-right font-mono text-gray-600">{formatCurrency(row.variable)}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setSelectedEmployee(row)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-xs font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of <span className="font-medium">{filteredData.length}</span> entries
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Employee Detail Modal */}
      {selectedEmployee && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[99999]">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedEmployee(null)}
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
                <div>
                  <h3 className="text-lg font-bold flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Employee Details
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">{selectedEmployee.name} - {selectedEmployee.empCode}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(selectedEmployee)}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button 
                    onClick={() => setSelectedEmployee(null)} 
                    className="text-white/80 hover:text-white transition-colors p-2"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Briefcase className="w-4 h-4 mr-2 text-blue-600" />
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Department</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        <Badge variant="secondary">{selectedEmployee.department}</Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Employee Code</label>
                      <p className="text-sm font-medium text-blue-600 mt-1 font-mono">{selectedEmployee.empCode}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Status</label>
                      <p className="text-sm font-medium mt-1">
                        <Badge className={selectedEmployee.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
                          {selectedEmployee.status}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Name</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedEmployee.name}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Father Name</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedEmployee.fatherName}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Designation</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedEmployee.designation}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Location</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedEmployee.location}</p>
                    </div>
                  </div>
                </div>

                {/* Employment Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                    Employment Details
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Date of Birth</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(selectedEmployee.dob)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Date of Joining</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(selectedEmployee.doj)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Last Working Day</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">-</p>
                    </div>
                  </div>
                </div>

                {/* Compensation Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <DollarSign className="w-4 h-4 mr-2 text-blue-600" />
                    Compensation Details
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <label className="text-xs text-gray-500 uppercase tracking-wider">CTC</label>
                      <p className="text-lg font-bold text-gray-900 mt-1 font-mono">{formatCurrencyFull(selectedEmployee.ctc)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <label className="text-xs text-gray-500 uppercase tracking-wider">PF</label>
                      <p className="text-lg font-bold text-gray-900 mt-1 font-mono">{formatCurrencyFull(selectedEmployee.pf)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <label className="text-xs text-gray-500 uppercase tracking-wider">ESI</label>
                      <p className="text-lg font-bold text-gray-900 mt-1 font-mono">{formatCurrencyFull(selectedEmployee.esi)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Bonus</label>
                      <p className="text-lg font-bold text-gray-900 mt-1 font-mono">{formatCurrencyFull(selectedEmployee.bonus)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Variable</label>
                      <p className="text-lg font-bold text-gray-900 mt-1 font-mono">{formatCurrencyFull(selectedEmployee.variable)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Other Component</label>
                      <p className="text-lg font-bold text-gray-900 mt-1 font-mono">{formatCurrencyFull(selectedEmployee.otherComponent)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Reimbursement</label>
                      <p className="text-lg font-bold text-gray-900 mt-1 font-mono">{formatCurrencyFull(selectedEmployee.reimbursement)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>,
        document.body
      )}

      {/* Add/Edit Internal Team Modal */}
      <AddInternalTeamModal
        key={editingEmployee?.id || 'new'}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEmployee(null);
        }}
        editingEmployee={editingEmployee}
      />
    </div>
  );
};

export default InternalTeamDetails;
