import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { 
  Search, 
  Calendar, 
  Download, 
  Filter, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  Info,
  Building2,
  Wallet,
  TrendingUp,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/button';
import Badge from './ui/Badge';

// --- Mock Data Generator ---
const generatePLData = () => {
  const departments = ['Ops', 'Recruitment', 'Temp', 'Sales', 'Support'];
  const months = ['Jan 2023', 'Feb 2023', 'Mar 2023', 'Apr 2023', 'May 2023', 'Jun 2023'];
  
  return months.map(month => {
    return departments.map(dept => {
      const totalInv = Math.floor(50000 + Math.random() * 200000);
      const vertoFee = Math.floor(totalInv * 0.12);
      const tds = Math.floor(vertoFee * 0.10);
      const vertoPostTds = vertoFee - tds;
      const moneyNotRecvd = Math.floor(totalInv * (Math.random() * 0.4));
      const vertoFeeRecvd = Math.floor(vertoPostTds * (moneyNotRecvd > 0 ? 0.6 : 1));
      const monthlyExp = Math.floor(vertoFeeRecvd * 0.6);
      const profitPreTds = vertoFeeRecvd - monthlyExp;
      const profitPostTds = profitPreTds; // Simplified
      const actualProfit = profitPostTds - Math.floor(Math.random() * 5000); // Random adjustments
      
      return {
        id: `${month}-${dept}`,
        month,
        dept,
        totalInv,
        vertoFee,
        tds,
        vertoPostTds,
        moneyNotRecvd,
        vertoFeeRecvd,
        monthlyExp,
        profitPreTds,
        profitPostTds,
        actualProfit,
        dedicatedResExp: Math.floor(monthlyExp * 0.7),
        sharedResExp: Math.floor(monthlyExp * 0.2),
        otherExp: Math.floor(monthlyExp * 0.1),
        cnBadDebt: Math.random() > 0.8 ? Math.floor(totalInv * 0.05) : 0
      };
    });
  }).flat();
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const ProfitCenterPL = () => {
  const [data] = useState(() => generatePLData());
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const itemsPerPage = 7;

  // Filter Logic
  let filteredData = data.filter(row => {
    const matchesSearch = row.dept.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          row.month.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'All' || row.dept === deptFilter;
    return matchesSearch && matchesDept;
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
  }, [searchTerm, deptFilter]);

  // Aggregate for Charts
  const deptSummary = filteredData.reduce((acc, curr) => {
    if (!acc[curr.dept]) acc[curr.dept] = { name: curr.dept, value: 0, profit: 0 };
    acc[curr.dept].value += curr.totalInv;
    acc[curr.dept].profit += curr.actualProfit;
    return acc;
  }, {});

  const chartData = Object.values(deptSummary);

  const formatCurrency = (val) => `₹ ${(val / 1000).toFixed(0)}K`;

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
      ? <ChevronUp className="w-3 h-3" /> 
      : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <div className="space-y-4 pb-6">
      
      {/* Top Filter Bar */}
      <Card className="p-4 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Dept or Month..." 
                className="w-64 bg-gray-50 border border-gray-200 text-gray-900 pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
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
              <option value="Sales">Sales</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" className="flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </Button>
            <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Content Split */}
      <div className="flex gap-4">
        
        {/* Full Width Data Table */}
        <div className="flex-1 space-y-4">
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                Profit & Loss Summary
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
                        <span>Department</span>
                        <SortIcon columnKey="dept" />
                      </div>
                    </th>
                    <th className="p-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('totalInv')}>
                      <div className="flex items-center justify-end space-x-2">
                        <span>Total Invoice Value</span>
                        <SortIcon columnKey="totalInv" />
                      </div>
                    </th>
                    <th className="p-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('vertoFee')}>
                      <div className="flex items-center justify-end space-x-2">
                        <span>Verto Fee Earned</span>
                        <SortIcon columnKey="vertoFee" />
                      </div>
                    </th>
                    <th className="p-3 text-right text-rose-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('tds')}>
                      <div className="flex items-center justify-end space-x-2">
                        <span>Less: TDS</span>
                        <SortIcon columnKey="tds" />
                      </div>
                    </th>
                    <th className="p-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('vertoPostTds')}>
                      <div className="flex items-center justify-end space-x-2">
                        <span>Fee Post TDS</span>
                        <SortIcon columnKey="vertoPostTds" />
                      </div>
                    </th>
                    <th className="p-3 text-right text-amber-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('moneyNotRecvd')}>
                      <div className="flex items-center justify-end space-x-2">
                        <span>Less: Money Not Received</span>
                        <SortIcon columnKey="moneyNotRecvd" />
                      </div>
                    </th>
                    <th className="p-3 text-right text-blue-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('vertoFeeRecvd')}>
                      <div className="flex items-center justify-end space-x-2">
                        <span>Verto Fee Received</span>
                        <SortIcon columnKey="vertoFeeRecvd" />
                      </div>
                    </th>
                    <th className="p-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('monthlyExp')}>
                      <div className="flex items-center justify-end space-x-2">
                        <span>Monthly Expenses</span>
                        <SortIcon columnKey="monthlyExp" />
                      </div>
                    </th>
                    <th className="p-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('profitPreTds')}>
                      <div className="flex items-center justify-end space-x-2">
                        <span>Profit Pre TDS</span>
                        <SortIcon columnKey="profitPreTds" />
                      </div>
                    </th>
                    <th className="p-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('profitPostTds')}>
                      <div className="flex items-center justify-end space-x-2">
                        <span>Profit Post TDS</span>
                        <SortIcon columnKey="profitPostTds" />
                      </div>
                    </th>
                    <th className="p-3 text-right text-emerald-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('actualProfit')}>
                      <div className="flex items-center justify-end space-x-2">
                        <span>Actual Profit</span>
                        <SortIcon columnKey="actualProfit" />
                      </div>
                    </th>
                    <th className="p-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('dedicatedResExp')}>
                      <div className="flex items-center justify-end space-x-2">
                        <span>Dedicated Resources Exp</span>
                        <SortIcon columnKey="dedicatedResExp" />
                      </div>
                    </th>
                    <th className="p-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('sharedResExp')}>
                      <div className="flex items-center justify-end space-x-2">
                        <span>Shared Resources Exp</span>
                        <SortIcon columnKey="sharedResExp" />
                      </div>
                    </th>
                    <th className="p-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('otherExp')}>
                      <div className="flex items-center justify-end space-x-2">
                        <span>Other Exp</span>
                        <SortIcon columnKey="otherExp" />
                      </div>
                    </th>
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
                      <td className="p-3">
                        <Badge variant="secondary" className="text-xs">{row.dept}</Badge>
                      </td>
                      <td className="p-3 text-right font-mono">{formatCurrency(row.totalInv)}</td>
                      <td className="p-3 text-right font-mono text-gray-900">{formatCurrency(row.vertoFee)}</td>
                      <td className="p-3 text-right font-mono text-rose-600">-{formatCurrency(row.tds)}</td>
                      <td className="p-3 text-right font-mono text-gray-900">{formatCurrency(row.vertoPostTds)}</td>
                      <td className="p-3 text-right font-mono text-amber-600">-{formatCurrency(row.moneyNotRecvd)}</td>
                      <td className="p-3 text-right font-mono font-medium text-blue-600">{formatCurrency(row.vertoFeeRecvd)}</td>
                      <td className="p-3 text-right font-mono text-gray-900">{formatCurrency(row.monthlyExp)}</td>
                      <td className="p-3 text-right font-mono text-gray-900">{formatCurrency(row.profitPreTds)}</td>
                      <td className="p-3 text-right font-mono text-gray-900">{formatCurrency(row.profitPostTds)}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">{formatCurrency(row.actualProfit)}</td>
                      <td className="p-3 text-right font-mono text-gray-600">{formatCurrency(row.dedicatedResExp)}</td>
                      <td className="p-3 text-right font-mono text-gray-600">{formatCurrency(row.sharedResExp)}</td>
                      <td className="p-3 text-right font-mono text-gray-600">{formatCurrency(row.otherExp)}</td>
                    </motion.tr>
                  ))}
                </tbody>
                <tfoot className="bg-blue-100 font-semibold text-gray-900 border-t-2 border-blue-300">
                  <tr>
                    <td colSpan="2" className="p-3 text-right text-gray-900 text-base">TOTAL</td>
                    <td className="p-3 text-right font-mono text-gray-900 text-base">{formatCurrency(filteredData.reduce((sum, row) => sum + row.totalInv, 0))}</td>
                    <td className="p-3 text-right font-mono text-gray-900 text-base">{formatCurrency(filteredData.reduce((sum, row) => sum + row.vertoFee, 0))}</td>
                    <td className="p-3 text-right font-mono text-rose-600 text-base">-{formatCurrency(filteredData.reduce((sum, row) => sum + row.tds, 0))}</td>
                    <td className="p-3 text-right font-mono text-gray-900 text-base">{formatCurrency(filteredData.reduce((sum, row) => sum + row.vertoPostTds, 0))}</td>
                    <td className="p-3 text-right font-mono text-amber-600 text-base">-{formatCurrency(filteredData.reduce((sum, row) => sum + row.moneyNotRecvd, 0))}</td>
                    <td className="p-3 text-right font-mono font-medium text-blue-600 text-base">{formatCurrency(filteredData.reduce((sum, row) => sum + row.vertoFeeRecvd, 0))}</td>
                    <td className="p-3 text-right font-mono text-gray-900 text-base">{formatCurrency(filteredData.reduce((sum, row) => sum + row.monthlyExp, 0))}</td>
                    <td className="p-3 text-right font-mono text-gray-900 text-base">{formatCurrency(filteredData.reduce((sum, row) => sum + row.profitPreTds, 0))}</td>
                    <td className="p-3 text-right font-mono text-gray-900 text-base">{formatCurrency(filteredData.reduce((sum, row) => sum + row.profitPostTds, 0))}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700 text-base">{formatCurrency(filteredData.reduce((sum, row) => sum + row.actualProfit, 0))}</td>
                    <td className="p-3 text-right font-mono text-gray-600 text-base">{formatCurrency(filteredData.reduce((sum, row) => sum + row.dedicatedResExp, 0))}</td>
                    <td className="p-3 text-right font-mono text-gray-600 text-base">{formatCurrency(filteredData.reduce((sum, row) => sum + row.sharedResExp, 0))}</td>
                    <td className="p-3 text-right font-mono text-gray-600 text-base">{formatCurrency(filteredData.reduce((sum, row) => sum + row.otherExp, 0))}</td>
                  </tr>
                </tfoot>
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
        </div>
      </div>
    </div>
  );
};

export default ProfitCenterPL;




