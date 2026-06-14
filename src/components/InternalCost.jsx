import { logExport, EXPORT_ACTIONS } from '../utils/auditLog';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import supabase from "../lib/supabaseClient";
import {
  Search,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  X,
  Building2,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  BarChart3,
} from "lucide-react";
import Card from "./ui/Card";
import Button from "./ui/button";
import Badge from "./ui/Badge";

// ─── Helpers ───────────────────────────────────────────────────────────────────
const inr = (v) => Number(v || 0).toLocaleString("en-IN");
const inrK = (v) => {
  const n = Number(v || 0);
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
};
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const fmt = (y, m) => `${MONTH_NAMES[m - 1]} ${y}`;

// Pay heads that map to salary/reimb/variable
const SALARY_HEADS = ["fixed salary", "salary", "basic salary"];
const REIMB_HEADS = ["reimbursement", "reimb"];
const VARIABLE_HEADS = ["variable", "arrear bonus", "bonus", "others", "other"];

const isMatch = (payHead, list) =>
  list.some((h) => payHead?.toLowerCase().trim() === h.toLowerCase());

// Dept name → dept code mapping (departments_master -> internal_team)
// departments_master.dept_name = "Operations", "Recruitment" etc
// internal_team.department     = "OS", "Rec" etc
const DEPT_NAME_TO_CODE = {
  operations: "OS",
  recruitment: "Rec",
  temporary: "Temp",
  projects: "Projects",
  common: "Common",
  others: "Others",
  "business development": "BD",
  accounts: "Accts",
  hr: "HR",
  admin: "Admin",
  it: "IT",
};
const normDept = (name) =>
  DEPT_NAME_TO_CODE[name?.toLowerCase()?.trim()] || name || "";

// ─── Generate last 12 months ──────────────────────────────────────────────────
const getLast12Months = () => {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return months;
};

// ─── Variance Chip ─────────────────────────────────────────────────────────────
const VarianceChip = ({ due, paid }) => {
  if (!due) return <span className="text-gray-300 text-xs">—</span>;
  const diff = paid - due;
  const pct = due ? Math.abs((diff / due) * 100).toFixed(1) : 0;
  if (Math.abs(diff) < 1)
    return (
      <span className="text-xs text-emerald-600 font-semibold">✓ Matched</span>
    );
  if (diff < 0)
    return (
      <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full font-semibold">
        −{pct}%
      </span>
    );
  return (
    <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full font-semibold">
      +{pct}%
    </span>
  );
};

// ─── Employee Detail Drawer ────────────────────────────────────────────────────
const EmpDetailDrawer = ({ rows, month, dept, onClose }) => {
  if (!rows?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden mx-4"
      >
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-white font-bold text-base">
              {dept} — {month}
            </h3>
            <p className="text-blue-200 text-xs mt-0.5">
              {rows.length} employee{rows.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
                <th className="px-4 py-2.5 text-left">Name</th>
                <th className="px-4 py-2.5 text-right">CTC</th>
                <th className="px-4 py-2.5 text-right">Variable</th>
                <th className="px-4 py-2.5 text-right">PF</th>
                <th className="px-4 py-2.5 text-right">ESI</th>
                <th className="px-4 py-2.5 text-right">Total Cost</th>
                <th className="px-4 py-2.5 text-left">Client Focus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((emp, i) => (
                <tr key={i} className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{emp.name}</p>
                    <p className="text-gray-400 text-[10px]">{emp.entity}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">
                    ₹{inr(emp.ctc)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-purple-600">
                    ₹{inr(emp.variable)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">
                    ₹{inr(emp.pf)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">
                    ₹{inr(emp.esi)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                    ₹{inr(emp.total_employee_cost)}
                  </td>
                  <td className="px-4 py-3">
                    {emp.client_focus?.filter((c) => c.clientName)?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {emp.client_focus
                          .filter((c) => c.clientName)
                          .map((c, ci) => (
                            <span
                              key={ci}
                              className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-full font-semibold"
                            >
                              {c.clientName} {c.percentage}%
                            </span>
                          ))}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-[10px]">
                        No client
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Part A+B Cost Logic Drawer ─────────────────────────────────────────────────
const CostLogicDrawer = ({ row, onClose }) => {
  if (!row) return null;
  const deptCosts = [
    { label: "Ops", cost: row.ops_cost, pct: row.ops_pct },
    { label: "Rec", cost: row.rec_cost, pct: row.rec_pct },
    { label: "Temp", cost: row.temp_cost, pct: row.temp_pct },
    { label: "Projects", cost: row.projects_cost, pct: row.projects_pct },
  ].filter((d) => d.pct > 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold">Costing Logic</h3>
            <p className="text-indigo-200 text-xs mt-0.5">
              {row.dept} — {row.month}
            </p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Total Cost */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
              Total Employee Cost
            </p>
            <p className="text-2xl font-black text-indigo-900 font-mono">
              ₹{inr(row.total_employee_cost)}
            </p>
            <p className="text-xs text-indigo-500 mt-1">
            CTC + Variable + PF + ESI + Bonus + Reimb + Other
            </p>
          </div>

          {/* Part A */}
          <div>
            <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
              Part A — Department Split
            </p>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">
                      Dept
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">
                      %
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-500 uppercase">
                      Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deptCosts.map((d, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-semibold text-gray-800">
                        {d.label}
                      </td>
                      <td className="px-4 py-2.5 text-center text-indigo-700 font-bold">
                        {d.pct}%
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-gray-900">
                        ₹{inr(d.cost)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-4 py-2.5 text-gray-700">Total</td>
                    <td className="px-4 py-2.5 text-center text-emerald-700">
                      100%
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-900">
                      ₹{inr(row.total_employee_cost)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Part B2 — client focus */}
          {row.empRows?.some(
            (e) => e.client_focus?.filter((c) => c.clientName)?.length > 0
          ) && (
            <div>
              <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                Part B2 — Client Split (Specific Allocation)
              </p>
              <div className="space-y-2">
                {row.empRows.map((emp, ei) => {
                  const clients =
                    emp.client_focus?.filter((c) => c.clientName) || [];
                  if (!clients.length) return null;
                  return (
                    <div
                      key={ei}
                      className="border border-gray-200 rounded-xl overflow-hidden"
                    >
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <p className="text-xs font-bold text-gray-700">
                          {emp.name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Total Cost: ₹{inr(emp.total_employee_cost)}
                        </p>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {clients.map((c, ci) => {
                          const clientCost =
                            (Number(emp.total_employee_cost) * c.percentage) /
                            100;
                          return (
                            <div
                              key={ci}
                              className="flex justify-between px-4 py-2 text-xs"
                            >
                              <span className="font-semibold text-gray-700">
                                {c.clientName}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-indigo-600 font-bold">
                                  {c.percentage}%
                                </span>
                                <span className="font-mono font-bold text-gray-900">
                                  ₹{inr(clientCost)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const InternalCost = () => {
  const [loading, setLoading] = useState(true);
  const [costViewData, setCostViewData] = useState([]);
  const [payoutData, setPayoutData] = useState([]);
  const [entities, setEntities] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [entityFilter, setEntityFilter] = useState("All");
  const [monthRange, setMonthRange] = useState({ from: "", to: "" });
  const [sortConfig, setSortConfig] = useState({
    key: "month_date",
    direction: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Drawer state
  const [empDrawer, setEmpDrawer] = useState(null);
  const [costDrawer, setCostDrawer] = useState(null);

  // Excel upload state
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // ── Fetch data ────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const months = getLast12Months();
      const minYear = months[0].year;
      const minMonth = months[0].month;
      const maxYear = months[months.length - 1].year;
      const maxMonth = months[months.length - 1].month;

      // Fetch internal_team_cost_view — last 12 months only
      // View now generates from Jan 2023 to current month
      const fromDate = `${minYear}-${String(minMonth).padStart(2, "0")}-01`;
      const toDate = `${maxYear}-${String(maxMonth).padStart(2, "0")}-28`;

      const { data: costRows, error: costErr } = await supabase
        .from("internal_team_cost_view")
        .select("*")
        .gte("month_date", fromDate)
        .lte("month_date", toDate)
        .order("sel_year", { ascending: false })
        .order("sel_month", { ascending: false });

      if (costErr) throw costErr;
      setCostViewData(costRows || []);

      // Fetch employee_expense_payouts for same period
      // Include dept_code via departments_master for correct matching
      const { data: payouts, error: payErr } = await supabase
        .from("employee_expense_payouts")
        .select(
          `
          emp_code, pay_head, net_payment, payment_amount, month_of_pay,
          department_id,
          departments_master ( dept_name, dept_code )
        `
        )
        .gte("month_of_pay", fromDate)
        .lte("month_of_pay", toDate);

      if (payErr) throw payErr;
      setPayoutData(payouts || []);

      // Distinct entities
      const { data: entData } = await supabase
        .from("internal_team")
        .select("entity");
      const uniqueEntities = [
        ...new Set((entData || []).map((e) => e.entity).filter(Boolean)),
      ];
      setEntities(uniqueEntities);
    } catch (err) {
      console.error("InternalCost fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Aggregate data by month + dept ────────────────────────────────────────────
  const tableData = useMemo(() => {
    if (!costViewData.length) return [];

    // Group cost view by month + dept
    const grouped = {};
    costViewData.forEach((row) => {
      const key = `${row.sel_year}-${row.sel_month}-${row.department}`;
      if (!grouped[key]) {
        grouped[key] = {
          key,
          month: fmt(row.sel_year, row.sel_month),
          month_date: new Date(row.sel_year, row.sel_month - 1, 1),
          sel_year: row.sel_year,
          sel_month: row.sel_month,
          dept: row.department,
          entity: row.entity,
          empRows: [],
          ftEmpNo: 0,
          internsNo: 0,
          fixedCTC: 0,
          variableComp: 0,
          total_employee_cost: 0,
          ops_cost: 0,
          rec_cost: 0,
          temp_cost: 0,
          projects_cost: 0,
          ops_pct: 0,
          rec_pct: 0,
          temp_pct: 0,
          projects_pct: 0,
          salaryDue: 0,
          salaryPaid: 0,
          reimbPaid: 0,
          variableOtherPaid: 0,
          totalActualPayout: 0,
        };
      }
      const g = grouped[key];
      g.empRows.push(row);
      g.ftEmpNo += 1;
      g.fixedCTC += Number(row.ctc || 0);
      g.variableComp += Number(row.variable || 0);
      g.total_employee_cost += Number(row.total_employee_cost || 0);
      g.ops_cost += Number(row.ops_cost || 0);
      g.rec_cost += Number(row.rec_cost || 0);
      g.temp_cost += Number(row.temp_cost || 0);
      g.projects_cost += Number(row.projects_cost || 0);
      g.salaryDue += Number(row.ctc || 0) + Number(row.variable || 0);
    });

    // Add dept % averages
    Object.values(grouped).forEach((g) => {
      if (g.total_employee_cost > 0) {
        g.ops_pct = Math.round((g.ops_cost / g.total_employee_cost) * 100);
        g.rec_pct = Math.round((g.rec_cost / g.total_employee_cost) * 100);
        g.temp_pct = Math.round((g.temp_cost / g.total_employee_cost) * 100);
        g.projects_pct = Math.round(
          (g.projects_cost / g.total_employee_cost) * 100
        );
      }
    });

    // Match payouts by month + dept (using normDept to convert dept_name → dept code)
    payoutData.forEach((p) => {
      if (!p.month_of_pay) return;
      const d = new Date(p.month_of_pay);
      const yr = d.getFullYear();
      const mo = d.getMonth() + 1;

      // Convert departments_master.dept_name ("Recruitment") → internal_team code ("Rec")
      const deptCode = normDept(p.departments_master?.dept_name || "");
      const key = `${yr}-${mo}-${deptCode}`;
      const g = grouped[key];
      if (!g) return;

      const net = Number(p.net_payment || p.payment_amount || 0);
      if (isMatch(p.pay_head, SALARY_HEADS)) g.salaryPaid += net;
      else if (isMatch(p.pay_head, REIMB_HEADS)) g.reimbPaid += net;
      else if (isMatch(p.pay_head, VARIABLE_HEADS)) g.variableOtherPaid += net;
    });

    // Compute totalActualPayout
    Object.values(grouped).forEach((g) => {
      g.totalActualPayout = g.salaryPaid + g.reimbPaid + g.variableOtherPaid;
    });

    return Object.values(grouped);
  }, [costViewData, payoutData]);

  // ── Filter + Sort ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let d = [...tableData];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      d = d.filter(
        (r) =>
          r.dept?.toLowerCase().includes(q) ||
          r.month?.toLowerCase().includes(q) ||
          r.entity?.toLowerCase().includes(q)
      );
    }
    if (deptFilter !== "All") d = d.filter((r) => r.dept === deptFilter);
    if (entityFilter !== "All") d = d.filter((r) => r.entity === entityFilter);

    if (monthRange.from) {
      const from = new Date(monthRange.from);
      d = d.filter((r) => r.month_date >= from);
    }
    if (monthRange.to) {
      const to = new Date(monthRange.to);
      d = d.filter((r) => r.month_date <= to);
    }

    if (sortConfig.key) {
      d.sort((a, b) => {
        const av = a[sortConfig.key],
          bv = b[sortConfig.key];
        if (av instanceof Date && bv instanceof Date)
          return sortConfig.direction === "asc" ? av - bv : bv - av;
        if (typeof av === "number" && typeof bv === "number")
          return sortConfig.direction === "asc" ? av - bv : bv - av;
        if (typeof av === "string" && typeof bv === "string")
          return sortConfig.direction === "asc"
            ? av.localeCompare(bv)
            : bv.localeCompare(av);
        return 0;
      });
    }

    return d;
  }, [tableData, searchTerm, deptFilter, entityFilter, monthRange, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, deptFilter, entityFilter, monthRange]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ── Totals row ─────────────────────────────────────────────────────────────────
  const totals = useMemo(
    () => ({
      ftEmpNo: filtered.reduce((s, r) => s + r.ftEmpNo, 0),
      fixedCTC: filtered.reduce((s, r) => s + r.fixedCTC, 0),
      variableComp: filtered.reduce((s, r) => s + r.variableComp, 0),
      salaryDue: filtered.reduce((s, r) => s + r.salaryDue, 0),
      salaryPaid: filtered.reduce((s, r) => s + r.salaryPaid, 0),
      reimbPaid: filtered.reduce((s, r) => s + r.reimbPaid, 0),
      variableOtherPaid: filtered.reduce((s, r) => s + r.variableOtherPaid, 0),
      totalActualPayout: filtered.reduce((s, r) => s + r.totalActualPayout, 0),
      total_employee_cost: filtered.reduce(
        (s, r) => s + r.total_employee_cost,
        0
      ),
    }),
    [filtered]
  );

  // ── Sort handler ───────────────────────────────────────────────────────────────
  const handleSort = (key) =>
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));

  const SortIcon = ({ k }) => {
    if (sortConfig.key !== k)
      return <ChevronDown className="w-3 h-3 opacity-30 flex-shrink-0" />;
    return sortConfig.direction === "asc" ? (
      <ChevronDown className="w-3 h-3 rotate-180 text-blue-500 flex-shrink-0" />
    ) : (
      <ChevronDown className="w-3 h-3 text-blue-500 flex-shrink-0" />
    );
  };

  // ── Excel export ───────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = filtered.map((r) => ({
      Month: r.month,
      Department: r.dept,
      Entity: r.entity || "",
      "FT Employees": r.ftEmpNo,
      "Fixed CTC (₹)": r.fixedCTC,
      "Variable Component (₹)": r.variableComp,
      "Total Employee Cost (₹)": r.total_employee_cost,
      "Salary Due (₹)": r.salaryDue,
      "Salary Paid (₹)": r.salaryPaid,
      "Reimb Paid (₹)": r.reimbPaid,
      "Variable/Other Paid (₹)": r.variableOtherPaid,
      "Total Actual Payout (₹)": r.totalActualPayout,
      "Ops Cost (₹)": r.ops_cost,
      "Rec Cost (₹)": r.rec_cost,
      "Temp Cost (₹)": r.temp_cost,
      "Projects Cost (₹)": r.projects_cost,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0] || {}).map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Internal Cost");
    XLSX.writeFile(
      wb,
      `Internal_Cost_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    logExport({
      action:      EXPORT_ACTIONS.EXCEL,
      category:    "Internal Cost",
      description: "Downloaded Internal Cost Excel",
      meta:        { rows: rows.length },
    });
  };

  // ── Part B1 Template Download ─────────────────────────────────────────────────
  const downloadB1Template = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Data template
    const dataRows = [
      ["month", "client_name", "department", "no_of_emp", "percent_alloc"],
      ["2026-05", "TCS", "Operations", 2500, 63.82],
      ["2026-05", "Infosys", "Operations", 900, 22.98],
      ["2026-05", "Wipro", "Operations", 300, 7.66],
      ["2026-05", "TCS", "Recruitment", "", 40.0],
      ["2026-05", "Infosys", "Recruitment", "", 60.0],
      ["2026-05", "TCS", "Temporary", "", 50.0],
      ["2026-05", "Infosys", "Temporary", "", 50.0],
    ];
    const ws = XLSX.utils.aoa_to_sheet(dataRows);
    ws["!cols"] = [
      { wch: 12 }, // month
      { wch: 20 }, // client_name
      { wch: 18 }, // department
      { wch: 14 }, // no_of_emp
      { wch: 16 }, // percent_alloc
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Part B1 Upload");

    // Sheet 2: Instructions
    const instrRows = [
      ["PART B1 MONTHLY CLIENT ALLOCATION — INSTRUCTIONS"],
      [""],
      ["COLUMN", "REQUIRED?", "DESCRIPTION"],
      ["month", "YES", "Format: YYYY-MM  e.g. 2026-05 for May 2026"],
      [
        "client_name",
        "YES",
        "Must match EXACTLY with client name in Verto system (case-insensitive)",
      ],
      [
        "department",
        "YES",
        "Must be one of: Operations / Recruitment / Temporary / Projects / Others",
      ],
      [
        "no_of_emp",
        "OPTIONAL",
        "Headcount allocated to this client. Used to auto-calc % if percent_alloc is blank",
      ],
      [
        "percent_alloc",
        "OPTIONAL",
        "Direct % allocation e.g. 63.82. If blank, system calculates from no_of_emp",
      ],
      [""],
      ["RULES:"],
      [
        "1.",
        "Each month + department combination should total 100% across all clients",
      ],
      ["2.", "Either no_of_emp OR percent_alloc must be provided (or both)"],
      [
        "3.",
        "If only no_of_emp given → % = (client_emp / total_dept_emp) × 100",
      ],
      ["4.", "If percent_alloc given → that % is used directly"],
      [
        "5.",
        "Uploading same month + client + dept again OVERWRITES previous entry",
      ],
      [
        "6.",
        "Leave rows for clients with 0 allocation (system ignores 0% entries)",
      ],
      [""],
      ["VALID DEPARTMENTS:"],
      ["Operations", "Recruitment", "Temporary", "Projects", "Others"],
      [""],
      ["EXAMPLE:"],
      ["month", "client_name", "department", "no_of_emp", "percent_alloc"],
      ["2026-05", "TCS", "Operations", 2500, ""],
      ["2026-05", "Infosys", "Operations", 900, ""],
      ["→ System calculates: TCS = 2500/(2500+900) = 73.5%,  Infosys = 26.5%"],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instrRows);
    wsInstr["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 65 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, "Instructions");

    XLSX.writeFile(wb, "Part_B1_Upload_Template.xlsx");
    logExport({
      action:      EXPORT_ACTIONS.TEMPLATE,
      category:    "Internal Cost",
      description: "Downloaded Part B1 Upload Template",
      meta:        { file: "Part_B1_Upload_Template.xlsx" },
    });
  };

  // ── Part B1 Excel Upload ───────────────────────────────────────────────────────
  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    setUploadResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { raw: true, defval: "" });

      // Expected columns: month (YYYY-MM), client_name, department, no_of_emp, percent_alloc
      let added = 0,
        failed = 0,
        failedRows = [];

      // Fetch master data for lookups
      const { data: clients } = await supabase
        .from("clients_master")
        .select("id, client_name");
      const { data: depts } = await supabase
        .from("departments_master")
        .select("id, dept_name");
      const clientMap = Object.fromEntries(
        (clients || []).map((c) => [c.client_name?.toLowerCase(), c.id])
      );
      const deptMap = Object.fromEntries(
        (depts || []).map((d) => [d.dept_name?.toLowerCase(), d.id])
      );

      for (const row of rows) {
        try {
          const monthStr = String(row.month || "").trim();
          const clientName = String(row.client_name || row.client || "").trim();
          const deptName = String(row.department || row.dept || "").trim();
          const noOfEmp = parseInt(row.no_of_emp || row.employees || 0);
          const pct = parseFloat(row.percent_alloc || row.percentage || 0);

          if (!monthStr || !clientName || !deptName)
            throw new Error("Missing month/client/dept");

          const clientId = clientMap[clientName.toLowerCase()];
          const deptId = deptMap[deptName.toLowerCase()];
          if (!clientId) throw new Error(`Client "${clientName}" not found`);
          if (!deptId) throw new Error(`Dept "${deptName}" not found`);

          const monthDate = new Date(monthStr + "-01");
          if (isNaN(monthDate)) throw new Error(`Invalid month "${monthStr}"`);

          const { error } = await supabase.rpc(
            "upsert_client_cost_allocation",
            {
              p_month: monthDate.toISOString().slice(0, 10),
              p_department_id: deptId,
              p_client_id: clientId,
              p_no_of_emp: noOfEmp,
              p_percent_alloc: pct,
              p_allocation_type: "bandwidth",
            }
          );
          if (error) throw error;
          added++;
        } catch (err) {
          failed++;
          failedRows.push({
            row: JSON.stringify(row).slice(0, 80),
            reason: err.message,
          });
        }
      }
      setUploadResult({ added, failed, failedRows });
    } catch (err) {
      setUploadResult({
        added: 0,
        failed: 1,
        failedRows: [{ row: "file", reason: err.message }],
      });
    } finally {
      setUploading(false);
    }
  };

  // ─── Stat cards ───────────────────────────────────────────────────────────────
  const StatCard = ({ label, value, sub, color }) => (
    <div
      className={`bg-white rounded-xl border p-4 ${color || "border-gray-200"}`}
    >
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-xl font-black text-gray-900 mt-1 font-mono">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Employees"
          value={totals.ftEmpNo}
          sub="Active this period"
          color="border-blue-200"
        />
        <StatCard
          label="Total Salary Due"
          value={inrK(totals.salaryDue)}
          sub="Sum of CTC"
          color="border-amber-200"
        />
        <StatCard
          label="Total Salary Paid"
          value={inrK(totals.salaryPaid)}
          sub="From payouts"
          color="border-emerald-200"
        />
        <StatCard
          label="Total Employee Cost"
          value={inrK(totals.total_employee_cost)}
          sub="CTC+Variable+PF+ESI+Bonus+Reimb"
          color="border-indigo-200"
        />
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search dept, month, entity…"
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Dept Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-white border border-gray-200 text-gray-800 font-medium px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="All">All Departments</option>
            {[...new Set(tableData.map((r) => r.dept))]
              .filter(Boolean)
              .sort()
              .map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
          </select>

          {/* Entity Filter */}
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-white border border-gray-200 text-gray-800 font-medium px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="All">All Entities</option>
            {entities.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>

          {/* Month range */}
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={monthRange.from}
              onChange={(e) =>
                setMonthRange((p) => ({
                  ...p,
                  from: e.target.value ? e.target.value + "-01" : "",
                }))
              }
              className="bg-white border border-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="month"
              value={monthRange.to}
              onChange={(e) =>
                setMonthRange((p) => ({
                  ...p,
                  to: e.target.value ? e.target.value + "-01" : "",
                }))
              }
              className="bg-white border border-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Refresh */}
            <button
              onClick={fetchData}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>

            {/* Part B1 Template Download */}
            <button
              onClick={downloadB1Template}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 transition"
              title="Download Part B1 upload template with instructions"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>B1 Template</span>
            </button>

            {/* Part B1 Excel Upload */}
            <label
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer transition border ${
                uploading
                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{uploading ? "Uploading…" : "Part B1 Upload"}</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>

            {/* Export */}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Upload Result */}
        <AnimatePresence>
          {uploadResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm ${
                  uploadResult.failed > 0
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-emerald-50 border-emerald-200 text-emerald-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  {uploadResult.failed > 0 ? (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="font-semibold">
                    {uploadResult.added} uploaded · {uploadResult.failed} failed
                  </span>
                  {uploadResult.failedRows?.length > 0 && (
                    <span className="text-xs opacity-70">
                      ({uploadResult.failedRows[0]?.reason})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setUploadResult(null)}
                  className="opacity-60 hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Internal Team Cost Summary
          </h3>
          <div className="flex items-center gap-2">
            {loading && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            )}
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {filtered.length} records
            </span>
          </div>
        </div>

        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                {[
                  { k: "month_date", label: "Month", align: "left" },
                  { k: "dept", label: "Dept", align: "left" },
                  { k: "ftEmpNo", label: "FT Emp", align: "center" },
                  { k: "fixedCTC", label: "Fixed CTC", align: "right" },
                  { k: "variableComp", label: "Variable", align: "right" },
                  {
                    k: "salaryDue",
                    label: "Salary Due",
                    align: "right",
                    color: "text-amber-700",
                  },
                  {
                    k: "salaryPaid",
                    label: "Salary Paid",
                    align: "right",
                    color: "text-emerald-700",
                  },
                  {
                    k: "reimbPaid",
                    label: "Reimb Paid",
                    align: "right",
                    color: "text-blue-700",
                  },
                  {
                    k: "variableOtherPaid",
                    label: "Var/Other",
                    align: "right",
                    color: "text-purple-700",
                  },
                  {
                    k: "totalActualPayout",
                    label: "Total Payout",
                    align: "right",
                    color: "text-gray-900",
                  },
                ].map(({ k, label, align, color }) => (
                  <th
                    key={k}
                    className={`p-3 cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap ${
                      color || ""
                    } text-${align}`}
                    onClick={() => handleSort(k)}
                  >
                    <div
                      className={`flex items-center gap-1 ${
                        align === "right"
                          ? "justify-end"
                          : align === "center"
                          ? "justify-center"
                          : ""
                      }`}
                    >
                      <span>{label}</span>
                      <SortIcon k={k} />
                    </div>
                  </th>
                ))}
                <th className="p-3 text-center text-gray-500 whitespace-nowrap">
                  Entity
                </th>
                <th className="p-3 text-center text-gray-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading && !tableData.length ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading data…</span>
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="py-16 text-center text-gray-400 text-sm"
                  >
                    No records found for selected filters
                  </td>
                </tr>
              ) : (
                paginated.map((row, idx) => (
                  <motion.tr
                    key={row.key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-blue-50/50 transition-colors"
                  >
                    <td className="p-3 font-semibold text-gray-900 whitespace-nowrap">
                      {row.month}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="secondary"
                        className="text-xs font-semibold"
                      >
                        {row.dept}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-bold text-blue-700 text-sm">
                        {row.ftEmpNo}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-gray-700">
                      {inrK(row.fixedCTC)}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-600">
                      {inrK(row.variableComp)}
                    </td>
                    <td className="p-3 text-right font-mono text-amber-700 font-semibold">
                      {inrK(row.salaryDue)}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-700 font-semibold">
                      <div>
                        {inrK(row.salaryPaid)}
                        <div className="mt-0.5">
                          <VarianceChip
                            due={row.salaryDue}
                            paid={row.salaryPaid}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-blue-700">
                      {inrK(row.reimbPaid)}
                    </td>
                    <td className="p-3 text-right font-mono text-purple-700">
                      {inrK(row.variableOtherPaid)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-gray-900 bg-gray-50">
                      {inrK(row.totalActualPayout)}
                    </td>
                    <td className="p-3 text-center text-xs text-gray-500">
                      {row.entity || "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View employees */}
                        <button
                          onClick={() => setEmpDrawer(row)}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition"
                          title="View employees"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {/* View costing logic */}
                        <button
                          onClick={() => setCostDrawer(row)}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition"
                          title="Costing logic (Part A+B)"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>

            {/* Totals row */}
            {filtered.length > 0 && (
              <tfoot className="bg-blue-50 border-t-2 border-blue-200 sticky bottom-0">
                <tr className="font-bold text-gray-900">
                  <td
                    colSpan={2}
                    className="p-3 text-right text-xs text-gray-600 uppercase tracking-wider"
                  >
                    TOTAL ({filtered.length} rows)
                  </td>
                  <td className="p-3 text-center font-mono text-blue-700">
                    {totals.ftEmpNo}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {inrK(totals.fixedCTC)}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {inrK(totals.variableComp)}
                  </td>
                  <td className="p-3 text-right font-mono text-amber-700">
                    {inrK(totals.salaryDue)}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-700">
                    {inrK(totals.salaryPaid)}
                  </td>
                  <td className="p-3 text-right font-mono text-blue-700">
                    {inrK(totals.reimbPaid)}
                  </td>
                  <td className="p-3 text-right font-mono text-purple-700">
                    {inrK(totals.variableOtherPaid)}
                  </td>
                  <td className="p-3 text-right font-mono text-gray-900 bg-blue-100">
                    {inrK(totals.totalActualPayout)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing{" "}
            <span className="font-bold text-gray-900">
              {Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length)}
            </span>{" "}
            to{" "}
            <span className="font-bold text-gray-900">
              {Math.min(currentPage * itemsPerPage, filtered.length)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-gray-900">{filtered.length}</span>{" "}
            entries
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pn;
                if (totalPages <= 5) pn = i + 1;
                else if (currentPage <= 3) pn = i + 1;
                else if (currentPage >= totalPages - 2) pn = totalPages - 4 + i;
                else pn = currentPage - 2 + i;
                return (
                  <button
                    key={pn}
                    onClick={() => setCurrentPage(pn)}
                    className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                      currentPage === pn
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {pn}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || totalPages === 0}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Drawers */}
      <AnimatePresence>
        {empDrawer && (
          <EmpDetailDrawer
            rows={empDrawer.empRows}
            month={empDrawer.month}
            dept={empDrawer.dept}
            onClose={() => setEmpDrawer(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {costDrawer && (
          <CostLogicDrawer
            row={costDrawer}
            onClose={() => setCostDrawer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default InternalCost;
