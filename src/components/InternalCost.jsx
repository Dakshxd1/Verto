import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Download, 
  Upload, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Users
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/button';
import Badge from './ui/Badge';

// --- Mock Data Generator ---
const generateMainData = () => {
  const months = ['Jan 2023', 'Feb 2023', 'Mar 2023', 'Apr 2023', 'May 2023', 'Jun 2023'];
  const depts = ['Ops', 'Recruitment', 'Temp', 'Projects'];
  
  return months.map(month => {
    return depts.map(dept => {
      const ftEmp = Math.floor(5 + Math.random() * 20);
      const interns = Math.floor(0 + Math.random() * 5);
      const fixedCTC = ftEmp * Math.floor(40000 + Math.random() * 30000);
      const variableComp = Math.floor(fixedCTC * 0.15);
      const salaryDue = fixedCTC + variableComp;
      const salaryPaid = Math.floor(salaryDue * 0.95);
      const reimbPaid = Math.floor(ftEmp * 5000);
      const otherPayout = Math.floor(ftEmp * 2000);
      
      return {
        id: `${month}-${dept}`,
        month,
        dept,
        ftEmpNo: ftEmp,
        internsNo: interns,
        fixedCTC,
        variableComp,
        currentMonthSalaryDue: salaryDue,
        currentMonthSalaryPaid: salaryPaid,
        currentMonthReimbPaid: reimbPaid,
        variableOtherPayout: otherPayout,
        totalActualPayout: salaryPaid + reimbPaid + otherPayout
      };
    });
  }).flat();
};

const InternalCost = () => {
  const [data] = useState(() => generateMainData());
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const itemsPerPage = 7;

  const filteredData = data.filter(row => {
    const matchesSearch = row.dept.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          row.month.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'All' || row.dept === deptFilter;
    return matchesSearch && matchesDept;
  });

  // Apply sorting
  let sortedData = [...filteredData];
  if (sortConfig.key) {
    sortedData.sort((a, b) => {
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

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, deptFilter]);

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
                placeholder="Search Dept or Month..." 
                className="w-64 bg-gray-50 border border-gray-200 text-gray-900 pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <select 
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Departments</option>
              <option value="Ops">Operations</option>
              <option value="Recruitment">Recruitment</option>
              <option value="Temp">Temp Staffing</option>
              <option value="Projects">Projects</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" className="flex items-center space-x-2 text-emerald-600 border-emerald-200 bg-emerald-50">
              <Upload className="w-4 h-4" />
              <span>Excel Upload</span>
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
            Internal Team Cost Summary
          </h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {filteredData.length} records
          </span>
        </div>
        
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="p-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('month')}>
                  <div className="flex items-center justify-between">
                    <span>Month</span>
                    <SortIcon columnKey="month" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('dept')}>
                  <div className="flex items-center justify-between">
                    <span>Dept</span>
                    <SortIcon columnKey="dept" />
                  </div>
                </th>
                <th className="p-3 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('ftEmpNo')}>
                  <div className="flex items-center justify-center space-x-2">
                    <span>FT Emp No</span>
                    <SortIcon columnKey="ftEmpNo" />
                  </div>
                </th>
                <th className="p-3 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('internsNo')}>
                  <div className="flex items-center justify-center space-x-2">
                    <span>Interns No</span>
                    <SortIcon columnKey="internsNo" />
                  </div>
                </th>
                <th className="p-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('fixedCTC')}>
                  <div className="flex items-center justify-end space-x-2">
                    <span>Fixed CTC</span>
                    <SortIcon columnKey="fixedCTC" />
                  </div>
                </th>
                <th className="p-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('variableComp')}>
                  <div className="flex items-center justify-end space-x-2">
                    <span>Variable Component</span>
                    <SortIcon columnKey="variableComp" />
                  </div>
                </th>
                <th className="p-3 text-right text-amber-700 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('currentMonthSalaryDue')}>
                  <div className="flex items-center justify-end space-x-2">
                    <span>Current Month Salary Due</span>
                    <SortIcon columnKey="currentMonthSalaryDue" />
                  </div>
                </th>
                <th className="p-3 text-right text-emerald-700 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('currentMonthSalaryPaid')}>
                  <div className="flex items-center justify-end space-x-2">
                    <span>Current Month Salary Paid</span>
                    <SortIcon columnKey="currentMonthSalaryPaid" />
                  </div>
                </th>
                <th className="p-3 text-right text-blue-700 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('currentMonthReimbPaid')}>
                  <div className="flex items-center justify-end space-x-2">
                    <span>Current Month Reimb Paid</span>
                    <SortIcon columnKey="currentMonthReimbPaid" />
                  </div>
                </th>
                <th className="p-3 text-right text-purple-700 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('variableOtherPayout')}>
                  <div className="flex items-center justify-end space-x-2">
                    <span>Variable/Other payout</span>
                    <SortIcon columnKey="variableOtherPayout" />
                  </div>
                </th>
                <th className="p-3 text-right font-bold text-gray-900 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('totalActualPayout')}>
                  <div className="flex items-center justify-end space-x-2">
                    <span>Total Actual Payout</span>
                    <SortIcon columnKey="totalActualPayout" />
                  </div>
                </th>
                <th className="p-3 text-center">Entity</th>
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
                  <td className="p-3 font-medium text-gray-900">{row.month}</td>
                  <td className="p-3"><Badge variant="secondary" className="text-xs">{row.dept}</Badge></td>
                  <td className="p-3 text-center font-medium text-blue-600">{row.ftEmpNo}</td>
                  <td className="p-3 text-center text-gray-500">{row.internsNo}</td>
                  <td className="p-3 text-right font-mono text-gray-600">{formatCurrency(row.fixedCTC)}</td>
                  <td className="p-3 text-right font-mono text-gray-600">{formatCurrency(row.variableComp)}</td>
                  <td className="p-3 text-right font-mono text-amber-700">{formatCurrency(row.currentMonthSalaryDue)}</td>
                  <td className="p-3 text-right font-mono font-medium text-emerald-700">{formatCurrency(row.currentMonthSalaryPaid)}</td>
                  <td className="p-3 text-right font-mono text-blue-700">{formatCurrency(row.currentMonthReimbPaid)}</td>
                  <td className="p-3 text-right font-mono text-purple-700">{formatCurrency(row.variableOtherPayout)}</td>
                  <td className="p-3 text-right font-mono font-bold text-gray-900 bg-gray-100">{formatCurrency(row.totalActualPayout)}</td>
                  <td className="p-3 text-center text-xs text-gray-600">
                    <span className="text-xs text-gray-500">Click to see emp details</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot className="bg-blue-100 font-semibold text-gray-900 border-t-2 border-blue-300">
              <tr>
                <td colSpan="2" className="p-3 text-right text-gray-900 text-base">TOTAL</td>
                <td className="p-3 text-center font-mono text-gray-900 text-base">{sortedData.reduce((sum, row) => sum + row.ftEmpNo, 0)}</td>
                <td className="p-3 text-center font-mono text-gray-900 text-base">{sortedData.reduce((sum, row) => sum + row.internsNo, 0)}</td>
                <td className="p-3 text-right font-mono text-gray-900 text-base">{formatCurrency(sortedData.reduce((sum, row) => sum + row.fixedCTC, 0))}</td>
                <td className="p-3 text-right font-mono text-gray-900 text-base">{formatCurrency(sortedData.reduce((sum, row) => sum + row.variableComp, 0))}</td>
                <td className="p-3 text-right font-mono text-amber-700 text-base">{formatCurrency(sortedData.reduce((sum, row) => sum + row.currentMonthSalaryDue, 0))}</td>
                <td className="p-3 text-right font-mono font-medium text-emerald-700 text-base">{formatCurrency(sortedData.reduce((sum, row) => sum + row.currentMonthSalaryPaid, 0))}</td>
                <td className="p-3 text-right font-mono text-blue-700 text-base">{formatCurrency(sortedData.reduce((sum, row) => sum + row.currentMonthReimbPaid, 0))}</td>
                <td className="p-3 text-right font-mono text-purple-700 text-base">{formatCurrency(sortedData.reduce((sum, row) => sum + row.variableOtherPayout, 0))}</td>
                <td className="p-3 text-right font-mono font-bold text-gray-900 text-base">{formatCurrency(sortedData.reduce((sum, row) => sum + row.totalActualPayout, 0))}</td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedData.length)}</span> of <span className="font-medium">{sortedData.length}</span> entries
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
    </div>
  );
};

export default InternalCost;
