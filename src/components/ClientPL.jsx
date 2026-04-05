import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
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
  CartesianGrid,
  ComposedChart,
  Line
} from 'recharts';
import { 
  Search, 
  Download, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Info,
  Users,
  Wallet,
  TrendingUp,
  ArrowRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Plus,
  FileText,
  AlertCircle,
  Calendar,
  Building2,
  Percent,
  X
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/button';
import Badge from './ui/Badge';

// --- Mock Data Generator for Clientwise ---
const generateClientData = () => {
  const clients = ['ABC Corp', 'XYZ Industries', 'Global Tech', 'Smart Solutions', 'Prime Ventures', 'NextGen Labs'];
  const departments = ['Ops', 'Recruitment', 'Temp', 'Projects'];
  const months = ['Jan 2023', 'Feb 2023', 'Mar 2023', 'Apr 2023', 'May 2023', 'Jun 2023'];
  
  return months.map(month => {
    return clients.map(client => {
      const dept = departments[Math.floor(Math.random() * departments.length)];
      const invoiceValue = Math.floor(200000 + Math.random() * 800000);
      const vertoFee = Math.floor(invoiceValue * 0.12);
      const tds = Math.floor(vertoFee * 0.10);
      const vertoFeePostTds = vertoFee - tds;
      
      const maxExpense = vertoFeePostTds * 0.7;
      const totalExpense = Math.floor(maxExpense * (0.5 + Math.random() * 0.5));
      const moneyNotRecvd = Math.floor(invoiceValue * (Math.random() * 0.15));
      
      const profitPreTds = vertoFeePostTds - totalExpense;
      const profitPostTds = profitPreTds;
      const actualProfit = Math.floor(profitPostTds - (moneyNotRecvd * 0.12));
      
      return {
        id: `${month}-${client}`,
        month,
        department: dept,
        clientName: client,
        invoiceValue,
        vertoFeeEarned: vertoFee,
        tds,
        vertoFeePostTds,
        moneyNotRecvdAmt: moneyNotRecvd,
        totalExpense,
        profitPreTds,
        profitPostTds,
        actualProfit: Math.max(actualProfit, 10000),
        cnBadDebt: Math.random() > 0.9 ? Math.floor(invoiceValue * 0.02) : 0
      };
    });
  }).flat();
};

// --- Mock Data Generator for Statutory Payouts ---
const generateStatutoryData = () => {
  const clients = ['ABC Corp', 'XYZ Industries', 'Global Tech', 'Smart Solutions', 'Prime Ventures', 'NextGen Labs'];
  const statutoryTypes = ['GST', 'TDS', 'EPF', 'ESI', 'LWF', 'PF', 'Income Tax', 'Others'];
  const months = ['Jan 2023', 'Feb 2023', 'Mar 2023', 'Apr 2023', 'May 2023', 'Jun 2023'];
  
  const data = [];
  
  clients.forEach(client => {
    statutoryTypes.forEach(type => {
      if (Math.random() > 0.3) {
        const amountDue = Math.floor(50000 + Math.random() * 200000);
        const inputCredit = Math.floor(Math.random() > 0.5 ? Math.random() * amountDue * 0.3 : 0);
        const amountToBePaid = amountDue - inputCredit;
        const amountPaid = Math.random() > 0.2 ? amountToBePaid : Math.floor(amountToBePaid * (0.5 + Math.random() * 0.5));
        const difference = amountToBePaid - amountPaid;
        const hasPenalty = difference > 0 && Math.random() > 0.5;
        const penaltyAmount = hasPenalty ? Math.floor(difference * 0.18) : 0;
        
        data.push({
          id: `${client}-${type}-${months[0]}`,
          month: months[Math.floor(Math.random() * months.length)],
          entity: client,
          statutoryType: type,
          amountDue,
          inputCredit,
          amountToBePaid,
          amountPaid,
          difference,
          paymentDate: amountPaid > 0 ? '2023-02-15' : '',
          dueDate: '2023-02-10',
          delay: amountPaid > 0 ? 5 : 0,
          penalties: penaltyAmount,
          hasPenalty,
          remarks: hasPenalty ? 'Late payment penalty applied' : '',
          costBreakup: {
            ops: 40,
            temp: 20,
            recruitment: 20,
            projects: 15,
            others: 5
          }
        });
      }
    });
  });
  
  return data;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

const ClientPL = () => {
  const [data] = useState(() => generateClientData());
  const [statutoryData, setStatutoryData] = useState(() => generateStatutoryData());
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('All');
  const [vizType, setVizType] = useState('waterfall');
  const [viewMode, setViewMode] = useState('pnl');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const [showStatutoryModal, setShowStatutoryModal] = useState(false);
  const [statutoryForm, setStatutoryForm] = useState({
    entity: '',
    statutoryType: 'GST',
    month: '',
    totalDue: 0,
    totalPaid: 0,
    pendingDue: 0,
    hasPenalty: 'No',
    penaltyAmount: 0,
    remarks: '',
    costBreakup: { ops: 0, temp: 0, recruitment: 0, projects: 0, others: 0 }
  });

  let filteredData = viewMode === 'pnl' 
    ? data.filter(row => {
        const matchesSearch = row.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              row.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              row.month.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClient = clientFilter === 'All' || row.clientName === clientFilter;
        return matchesSearch && matchesClient;
      })
    : statutoryData.filter(row => {
        const matchesSearch = row.entity.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              row.statutoryType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              row.month.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClient = clientFilter === 'All' || row.entity === clientFilter;
        return matchesSearch && matchesClient;
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
  }, [searchTerm, clientFilter, viewMode]);

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

  const calculateCostTotal = () => {
    const { ops, temp, recruitment, projects, others } = statutoryForm.costBreakup;
    return ops + temp + recruitment + projects + others;
  };

  const handleStatutorySubmit = (e) => {
    e.preventDefault();
    const total = calculateCostTotal();
    if (total !== 100) {
      alert('Cost head breakup must total 100%');
      return;
    }
    
    const newRecord = {
      id: `${statutoryForm.entity}-${statutoryForm.statutoryType}-${Date.now()}`,
      month: statutoryForm.month,
      entity: statutoryForm.entity,
      statutoryType: statutoryForm.statutoryType,
      amountDue: parseInt(statutoryForm.totalDue),
      inputCredit: 0,
      amountToBePaid: parseInt(statutoryForm.totalDue),
      amountPaid: parseInt(statutoryForm.totalPaid),
      difference: parseInt(statutoryForm.pendingDue),
      paymentDate: statutoryForm.totalPaid > 0 ? new Date().toISOString().split('T')[0] : '',
      dueDate: '',
      delay: 0,
      penalties: statutoryForm.hasPenalty === 'Yes' ? parseInt(statutoryForm.penaltyAmount) : 0,
      hasPenalty: statutoryForm.hasPenalty === 'Yes',
      remarks: statutoryForm.remarks,
      costBreakup: statutoryForm.costBreakup
    };
    
    setStatutoryData([...statutoryData, newRecord]);
    setShowStatutoryModal(false);
    setStatutoryForm({
      entity: '',
      statutoryType: 'GST',
      month: '',
      totalDue: 0,
      totalPaid: 0,
      pendingDue: 0,
      hasPenalty: 'No',
      penaltyAmount: 0,
      remarks: '',
      costBreakup: { ops: 0, temp: 0, recruitment: 0, projects: 0, others: 0 }
    });
  };

  useEffect(() => {
    setStatutoryForm(prev => ({
      ...prev,
      pendingDue: prev.totalDue - prev.totalPaid
    }));
  }, [statutoryForm.totalDue, statutoryForm.totalPaid]);

  const clientAggregation = data.reduce((acc, row) => {
    if (!acc[row.clientName]) {
      acc[row.clientName] = {
        client: row.clientName,
        invoiceValue: 0,
        vertoFeeEarned: 0,
        vertoFeePostTds: 0,
        totalExpense: 0,
        profitPreTds: 0,
        profitPostTds: 0,
        actualProfit: 0,
        moneyNotRecvd: 0,
        count: 0
      };
    }
    acc[row.clientName].invoiceValue += row.invoiceValue;
    acc[row.clientName].vertoFeeEarned += row.vertoFeeEarned;
    acc[row.clientName].vertoFeePostTds += row.vertoFeePostTds;
    acc[row.clientName].totalExpense += row.totalExpense;
    acc[row.clientName].profitPreTds += row.profitPreTds;
    acc[row.clientName].profitPostTds += row.profitPostTds;
    acc[row.clientName].actualProfit += row.actualProfit;
    acc[row.clientName].moneyNotRecvd += row.moneyNotRecvdAmt;
    acc[row.clientName].count += 1;
    return acc;
  }, {});

  const vizData = Object.values(clientAggregation).sort((a, b) => b.actualProfit - a.actualProfit);
  const topClients = vizData.slice(0, 5);
  const otherProfit = vizData.slice(5).reduce((a, b) => a + b.actualProfit, 0);
  const pieData = otherProfit > 0 ? [...topClients, { client: 'Others', actualProfit: otherProfit }] : topClients;

  const formatCurrency = (val) => `₹ ${(val / 1000).toFixed(0)}K`;
  const formatCurrencyFull = (val) => `₹ ${val.toLocaleString('en-IN')}`;

  const getStatutoryTypeColor = (type) => {
    const colors = {
      'GST': 'bg-blue-100 text-blue-700',
      'TDS': 'bg-purple-100 text-purple-700',
      'EPF': 'bg-green-100 text-green-700',
      'ESI': 'bg-orange-100 text-orange-700',
      'LWF': 'bg-pink-100 text-pink-700',
      'PF': 'bg-indigo-100 text-indigo-700',
      'Income Tax': 'bg-red-100 text-red-700',
      'Others': 'bg-gray-100 text-gray-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm flex items-center justify-between space-x-4">
              <span className="flex items-center">
                <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                <span className="text-gray-600">{entry.name}</span>
              </span>
              <span className="font-mono font-medium">
                ₹ {(entry.value / 1000).toFixed(0)}K
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 pb-6">
      
      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('pnl')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'pnl' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>P&L Summary</span>
                </div>
              </button>
              <button
                onClick={() => setViewMode('statutory')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'statutory' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Statutory Payouts</span>
                </div>
              </button>
            </div>

            <div className="h-6 w-px bg-gray-300" />

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={viewMode === 'pnl' ? "Search Client, Dept or Month..." : "Search Entity, Type or Month..."}
                className="w-64 bg-gray-50 border border-gray-200 text-gray-900 pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <select 
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="All">All {viewMode === 'pnl' ? 'Clients' : 'Entities'}</option>
              {[...new Set(data.map(d => d.clientName))].sort().map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-3">
            {viewMode === 'statutory' && (
              <Button 
                onClick={() => setShowStatutoryModal(true)}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Statutory Payout</span>
              </Button>
            )}
            <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <div className="flex gap-4">
        
        {/* Full Width Table View */}
        <div className="flex-1 space-y-4">
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 flex items-center">
                {viewMode === 'pnl' ? (
                  <>
                    <Users className="w-4 h-4 mr-2 text-blue-600" />
                    Client-wise P&L Summary
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2 text-emerald-600" />
                    Statutory Payout Summary
                  </>
                )}
              </h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {filteredData.length} records
              </span>
            </div>
            
            <div className="overflow-auto max-h-[600px]">
              {viewMode === 'pnl' ? (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="p-3 w-24 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('month')}>
                        <div className="flex items-center justify-between">
                          <span>Month</span>
                          <SortIcon columnKey="month" />
                        </div>
                      </th>
                      <th className="p-3 w-24 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('department')}>
                        <div className="flex items-center justify-between">
                          <span>Department</span>
                          <SortIcon columnKey="department" />
                        </div>
                      </th>
                      <th className="p-3 w-32 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('clientName')}>
                        <div className="flex items-center justify-between">
                          <span>Client Name</span>
                          <SortIcon columnKey="clientName" />
                        </div>
                      </th>
                      <th className="p-3 text-right w-28 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('invoiceValue')}>
                        <div className="flex items-center justify-end space-x-2">
                          <span>Invoice Value</span>
                          <SortIcon columnKey="invoiceValue" />
                        </div>
                      </th>
                      <th className="p-3 text-right w-24 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('vertoFeeEarned')}>
                        <div className="flex items-center justify-end space-x-2">
                          <span>Verto Fee Earned</span>
                          <SortIcon columnKey="vertoFeeEarned" />
                        </div>
                      </th>
                      <th className="p-3 text-right w-20 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('tds')}>
                        <div className="flex items-center justify-end space-x-2">
                          <span>TDS</span>
                          <SortIcon columnKey="tds" />
                        </div>
                      </th>
                      <th className="p-3 text-right w-28 text-blue-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('vertoFeePostTds')}>
                        <div className="flex items-center justify-end space-x-2">
                          <span>Verto Fee post TDS</span>
                          <SortIcon columnKey="vertoFeePostTds" />
                        </div>
                      </th>
                      <th className="p-3 text-right w-28 text-amber-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('moneyNotRecvdAmt')}>
                        <div className="flex items-center justify-end space-x-2">
                          <span>Money Not Recvd Amt</span>
                          <SortIcon columnKey="moneyNotRecvdAmt" />
                        </div>
                      </th>
                      <th className="p-3 text-right w-24 text-rose-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('totalExpense')}>
                        <div className="flex items-center justify-end space-x-2">
                          <span>Total Expense (Client)</span>
                          <SortIcon columnKey="totalExpense" />
                        </div>
                      </th>
                      <th className="p-3 text-right w-28 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('profitPreTds')}>
                        <div className="flex items-center justify-end space-x-2">
                          <span>Profit Pre TDS</span>
                          <SortIcon columnKey="profitPreTds" />
                        </div>
                      </th>
                      <th className="p-3 text-right w-28 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('profitPostTds')}>
                        <div className="flex items-center justify-end space-x-2">
                          <span>Profit POST TDS</span>
                          <SortIcon columnKey="profitPostTds" />
                        </div>
                      </th>
                      <th className="p-3 text-right w-28 text-emerald-600 font-bold bg-emerald-50/50 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('actualProfit')}>
                        <div className="flex items-center justify-end space-x-2">
                          <span>Actual Profit</span>
                          <SortIcon columnKey="actualProfit" />
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
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-blue-50 transition-colors"
                      >
                        <td className="p-3 font-medium text-gray-900">{row.month}</td>
                        <td className="p-3"><Badge variant="secondary" className="text-xs">{row.department}</Badge></td>
                        <td className="p-3 font-medium text-blue-700">{row.clientName}</td>
                        <td className="p-3 text-right font-mono text-gray-600">{formatCurrency(row.invoiceValue)}</td>
                        <td className="p-3 text-right font-mono text-gray-600">{formatCurrency(row.vertoFeeEarned)}</td>
                        <td className="p-3 text-right font-mono text-rose-500">({formatCurrency(row.tds)})</td>
                        <td className="p-3 text-right font-mono font-medium text-blue-700 bg-blue-50/30">{formatCurrency(row.vertoFeePostTds)}</td>
                        <td className="p-3 text-right font-mono text-amber-600 bg-amber-50/30">({formatCurrency(row.moneyNotRecvdAmt)})</td>
                        <td className="p-3 text-right font-mono text-rose-600 bg-rose-50/30">({formatCurrency(row.totalExpense)})</td>
                        <td className="p-3 text-right font-mono text-gray-900">{formatCurrency(row.profitPreTds)}</td>
                        <td className="p-3 text-right font-mono text-gray-900">{formatCurrency(row.profitPostTds)}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">{formatCurrency(row.actualProfit)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-blue-100 font-semibold text-gray-900 border-t-2 border-blue-300">
                    <tr>
                      <td colSpan="3" className="p-3 text-right text-gray-900 text-base">TOTAL</td>
                      <td className="p-3 text-right font-mono text-gray-900 text-base">{formatCurrency(filteredData.reduce((sum, row) => sum + row.invoiceValue, 0))}</td>
                      <td className="p-3 text-right font-mono text-gray-900 text-base">{formatCurrency(filteredData.reduce((sum, row) => sum + row.vertoFeeEarned, 0))}</td>
                      <td className="p-3 text-right font-mono text-rose-600 text-base">({formatCurrency(filteredData.reduce((sum, row) => sum + row.tds, 0))})</td>
                      <td className="p-3 text-right font-mono font-medium text-blue-700 text-base">{formatCurrency(filteredData.reduce((sum, row) => sum + row.vertoFeePostTds, 0))}</td>
                      <td className="p-3 text-right font-mono text-amber-600 text-base">({formatCurrency(filteredData.reduce((sum, row) => sum + row.moneyNotRecvdAmt, 0))})</td>
                      <td className="p-3 text-right font-mono text-rose-600 text-base">({formatCurrency(filteredData.reduce((sum, row) => sum + row.totalExpense, 0))})</td>
                      <td className="p-3 text-right font-mono text-gray-900 text-base">{formatCurrency(filteredData.reduce((sum, row) => sum + row.profitPreTds, 0))}</td>
                      <td className="p-3 text-right font-mono text-gray-900 text-base">{formatCurrency(filteredData.reduce((sum, row) => sum + row.profitPostTds, 0))}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700 text-base">{formatCurrency(filteredData.reduce((sum, row) => sum + row.actualProfit, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="p-3 w-24 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('month')}>
                        <div className="flex items-center justify-between">
                          <span>Month</span>
                          <SortIcon columnKey="month" />
                        </div>
                      </th>
                      <th className="p-3 w-32 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('entity')}>
                        <div className="flex items-center justify-between">
                          <span>Entity</span>
                          <SortIcon columnKey="entity" />
                        </div>
                      </th>
                      <th className="p-3 w-32 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('statutoryType')}>
                        <div className="flex items-center justify-between">
                          <span>Statutory Header</span>
                          <SortIcon columnKey="statutoryType" />
                        </div>
                      </th>
                      <th className="p-3 text-right w-28 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('amountDue')}>
                        <div className="flex items-center justify-end space-x-2">
                          <span>Amount Due</span>
                          <SortIcon columnKey="amountDue" />
                        </div>
                      </th>
                      <th className="p-3 text-right w-24 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('inputCredit')}>
                        <div className="flex items-center justify-end space-x-2">
                          <span>Input Credit</span>
                          <SortIcon columnKey="inputCredit" />
                        </div>
                      </th>
                      <th className="p-3 text-right w-28 text-blue-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('amountToBePaid')}>
                        <div className="flex items-center justify-end space-x-2">
                          <span>Amount to be paid</span>
                          <SortIcon columnKey="amountToBePaid" />
                        </div>
                      </th>
                      <th className="p-3 text-right w-28 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('amountPaid')}>
                        <div className="flex items-center justify-end space-x-2">
                          <span>Amount paid</span>
                          <SortIcon columnKey="amountPaid" />
                        </div>
                      </th>
                      <th className="p-3 text-right w-24 text-rose-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('difference')}>
                        <div className="flex items-center justify-end space-x-2">
                          <span>Difference</span>
                          <SortIcon columnKey="difference" />
                        </div>
                      </th>
                      <th className="p-3 text-center w-28 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('paymentDate')}>
                        <div className="flex items-center justify-center space-x-2">
                          <span>Payment Date</span>
                          <SortIcon columnKey="paymentDate" />
                        </div>
                      </th>
                      <th className="p-3 text-right w-20 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('delay')}>
                        <div className="flex items-center justify-end space-x-2">
                          <span>Delay</span>
                          <SortIcon columnKey="delay" />
                        </div>
                      </th>
                      <th className="p-3 text-right w-24 text-red-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('penalties')}>
                        <div className="flex items-center justify-end space-x-2">
                          <span>Penalties</span>
                          <SortIcon columnKey="penalties" />
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
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-emerald-50 transition-colors"
                      >
                        <td className="p-3 font-medium text-gray-900">{row.month}</td>
                        <td className="p-3 font-medium text-blue-700">{row.entity}</td>
                        <td className="p-3">
                          <Badge className={`text-xs ${getStatutoryTypeColor(row.statutoryType)}`}>
                            {row.statutoryType}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-mono text-gray-600">{formatCurrency(row.amountDue)}</td>
                        <td className="p-3 text-right font-mono text-gray-600">{formatCurrency(row.inputCredit)}</td>
                        <td className="p-3 text-right font-mono font-medium text-blue-700 bg-blue-50/30">{formatCurrency(row.amountToBePaid)}</td>
                        <td className="p-3 text-right font-mono text-emerald-600">{formatCurrency(row.amountPaid)}</td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600">{formatCurrency(row.difference)}</td>
                        <td className="p-3 text-center text-sm text-gray-600">{row.paymentDate || '-'}</td>
                        <td className="p-3 text-right">
                          {row.delay > 0 ? (
                            <span className="text-amber-600 font-medium">{row.delay} days</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-red-600">
                          {row.penalties > 0 ? formatCurrency(row.penalties) : '-'}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
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
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* MODAL - Using Portal to render at document root */}
      {showStatutoryModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[99999]">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowStatutoryModal(false)}
          />
          
          {/* Modal Container */}
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center sticky top-0 z-10">
                <h3 className="text-lg font-bold flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Statutory Payout
                </h3>
                <button 
                  onClick={() => setShowStatutoryModal(false)} 
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleStatutorySubmit} className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entity</label>
                    <select 
                      required
                      value={statutoryForm.entity}
                      onChange={(e) => setStatutoryForm({...statutoryForm, entity: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select Entity</option>
                      {[...new Set(data.map(d => d.clientName))].sort().map(client => (
                        <option key={client} value={client}>{client}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statutory Payout</label>
                    <select 
                      value={statutoryForm.statutoryType}
                      onChange={(e) => setStatutoryForm({...statutoryForm, statutoryType: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {['GST', 'TDS', 'EPF', 'ESI', 'LWF', 'PF', 'Income Tax', 'Others'].map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">For The Month</label>
                  <input 
                    type="month"
                    required
                    value={statutoryForm.month}
                    onChange={(e) => setStatutoryForm({...statutoryForm, month: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Payment Details */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <Building2 className="w-4 h-4 mr-2" />
                    Payment Details
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Due</label>
                      <input 
                        type="number"
                        required
                        value={statutoryForm.totalDue}
                        onChange={(e) => setStatutoryForm({...statutoryForm, totalDue: parseInt(e.target.value) || 0})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Auto Collate"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Paid</label>
                      <input 
                        type="number"
                        value={statutoryForm.totalPaid}
                        onChange={(e) => setStatutoryForm({...statutoryForm, totalPaid: parseInt(e.target.value) || 0})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pending Due</label>
                      <input 
                        type="number"
                        readOnly
                        value={statutoryForm.pendingDue}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Penalty Section */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Penalty Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Any Interest/Penalties</label>
                      <select 
                        value={statutoryForm.hasPenalty}
                        onChange={(e) => setStatutoryForm({...statutoryForm, hasPenalty: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                    {statutoryForm.hasPenalty === 'Yes' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Penalty Amount</label>
                        <input 
                          type="number"
                          value={statutoryForm.penaltyAmount}
                          onChange={(e) => setStatutoryForm({...statutoryForm, penaltyAmount: parseInt(e.target.value) || 0})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Amount"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                    <textarea 
                      value={statutoryForm.remarks}
                      onChange={(e) => setStatutoryForm({...statutoryForm, remarks: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      rows="2"
                      placeholder="Enter remarks..."
                    />
                  </div>
                </div>

                {/* Cost Head Breakup */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <Percent className="w-4 h-4 mr-2" />
                      Cost Head Break Up for Penalties
                    </h4>
                    <span className={`text-sm font-bold ${calculateCostTotal() === 100 ? 'text-emerald-600' : 'text-red-600'}`}>
                      Total: {calculateCostTotal()}%
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
                            value={statutoryForm.costBreakup[head]}
                            onChange={(e) => setStatutoryForm({
                              ...statutoryForm,
                              costBreakup: {
                                ...statutoryForm.costBreakup,
                                [head]: parseInt(e.target.value) || 0
                              }
                            })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <span className="absolute right-3 top-2 text-gray-500">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {calculateCostTotal() !== 100 && (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Total must equal 100%
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
                  <button
                    type="button"
                    onClick={() => setShowStatutoryModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={calculateCostTotal() !== 100}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Save Statutory Payout
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ClientPL;