import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactDOM from "react-dom";
import * as XLSX from "xlsx";
import { logExport, EXPORT_ACTIONS } from "../utils/Auditlog.js";
import { useAuth } from "../context/AuthContext";
import supabase from "../lib/supabaseClient";
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  Filter,
  Edit,
  X,
  Calendar,
  DollarSign,
  Briefcase,
  History,
  Loader2,
} from "lucide-react";
import Card from "./ui/Card";
import Button from "./ui/button";
import Badge from "./ui/Badge";
import AddInternalTeamModal from "./AddInternalTeamModal";

// ── 4 keys only — must match DB jsonb and AddInternalTeamModal exactly ──────
const COST_HEAD_KEYS = [
  { key: "ops", label: "Ops", desc: "Operations" },
  { key: "temp", label: "Temp", desc: "Temporary" },
  { key: "rec", label: "Rec", desc: "Recruitment" },
  { key: "projects", label: "Projects", desc: "Project-Based" },
];

// Normalise any legacy 9-key breakup to 4 keys
const normCostHead = (raw) => ({
  ops: Number(raw?.ops || raw?.OS || 0),
  temp: Number(raw?.temp || 0),
  rec: Number(raw?.rec || 0),
  projects: Number(raw?.projects || 0),
});

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

const SEGMENT_COLORS = [
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
];

/* ─────────────────────────────────────────────
   Excel Export
───────────────────────────────────────────── */
const exportToExcel = (mergedData, formatDate) => {
  const maxClients = mergedData.reduce(
    (max, row) => Math.max(max, row.client_focus?.length || 0),
    0
  );
  const getGrossValue = (row) => {
    if (row.gross_value && Number(row.gross_value) > 0)
      return Number(row.gross_value);
    return (
      (Number(row.ctc) || 0) +
      (Number(row.pf) || 0) +
      (Number(row.esi) || 0) +
      (Number(row.bonus) || 0) +
      (Number(row.other_component) || 0) +
      (Number(row.reimbursement) || 0)
    );
  };

  const exportRows = mergedData.map((row) => {
    const norm = normCostHead(row.cost_head_breakup);
    const base = {
      "Emp Code": row.emp_code || "",
      Name: row.name || "",
      "Father Name": row.father_name || "",
      Email: row.email || "",
      Department: row.department || "",
      Designation: row.designation || "",
      Location: row.location || "",
      Role: row.role || "employee",
      Status: row.status || "",
      "Date of Birth": row.dob ? formatDate(row.dob) : "",
      "Date of Joining": row.doj ? formatDate(row.doj) : "",
      "Fixed Salary / CTC (₹)": row.ctc || 0,
      "PF (₹)": row.pf || 0,
      "ESI (₹)": row.esi || 0,
      "Bonus (₹)": row.bonus || 0,
      "Variable (₹)": row.variable || 0,
      "Other Component (₹)": row.other_component || 0,
      "Reimbursement (₹)": row.reimbursement || 0,
      "Gross Value (₹)": getGrossValue(row),
      "Cost Head - Ops (%)": norm.ops,
      "Cost Head - Temp (%)": norm.temp,
      "Cost Head - Rec (%)": norm.rec,
      "Cost Head - Projects (%)": norm.projects,
    };
    for (let i = 0; i < maxClients; i++) {
      const client = row.client_focus?.[i];
      base[`Client ${i + 1} Name`] = client?.clientName || "";
      base[`Client ${i + 1} %`] = client?.percentage ?? "";
    }
    return base;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const headers = Object.keys(exportRows[0] || {});
  worksheet["!cols"] = headers.map((h) => ({
    wch: Math.max(h.length + 2, 14),
  }));
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Internal Team");
  XLSX.writeFile(
    workbook,
    `Internal_Team_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
  logExport({
    action:      EXPORT_ACTIONS.EXCEL,
    category:    "Internal Cost",
    description: "Downloaded Internal Team Excel",
  });
};

/* ─────────────────────────────────────────────
   Cost Bar — 4-key version
───────────────────────────────────────────── */
const CostBar = ({ breakup }) => {
  const norm = normCostHead(breakup);
  const total = COST_HEAD_KEYS.reduce((s, h) => s + (norm[h.key] || 0), 0);
  if (!total) return null;
  return (
    <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-gray-100 flex">
      {COST_HEAD_KEYS.map(({ key }, i) => {
        const v = norm[key] || 0;
        if (!v) return null;
        return (
          <div
            key={key}
            style={{ width: `${v}%` }}
            className={`h-full transition-all ${SEGMENT_COLORS[i % 4]}`}
          />
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const InternalTeamDetails = () => {
  const { role } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [teamRoles, setTeamRoles] = useState([]);
  const [roleLoading, setRoleLoading] = useState(true);
  const [costHistory, setCostHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const itemsPerPage = 7;
  const isAnyModalOpen = !!selectedEmployee || isModalOpen;

  useEffect(() => {
    const load = async () => {
      setRoleLoading(true);
      const { data: rolesData, error } = await supabase
        .from("user_roles")
        .select("email, role");
      if (!error) setTeamRoles(rolesData ?? []);
      setRoleLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data: employees, error } = await supabase
      .from("internal_team")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setData(employees || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!selectedEmployee?.id) {
      setCostHistory([]);
      return;
    }
    setHistoryLoading(true);
    supabase
      .from("internal_team_cost_history")
      .select("*")
      .eq("employee_id", selectedEmployee.id)
      .order("effective_year", { ascending: false })
      .order("effective_month", { ascending: false })
      .then(({ data: histData, error }) => {
        setCostHistory(!error && histData ? histData : []);
        setHistoryLoading(false);
      });
  }, [selectedEmployee?.id]);

  const mergedData = useMemo(() => {
    if (!teamRoles.length) return data;
    return data.map((row) => {
      const match = teamRoles.find((item) => item.email === row.email);
      return {
        ...row,
        role: match?.role ?? row.role,
        email: match?.email ?? row.email,
      };
    });
  }, [data, teamRoles]);

  let filteredData = mergedData.filter((row) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      row.name?.toLowerCase().includes(q) ||
      row.emp_code?.toLowerCase().includes(q) ||
      row.designation?.toLowerCase().includes(q) ||
      row.email?.toLowerCase().includes(q) ||
      row.role?.toLowerCase().includes(q);
    const matchDept = deptFilter === "All" || row.department === deptFilter;
    const matchStatus = statusFilter === "All" || row.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  if (sortConfig.key) {
    filteredData = [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key],
        bVal = b[sortConfig.key];
      if (typeof aVal === "number" && typeof bVal === "number")
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      if (typeof aVal === "string" && typeof bVal === "string")
        return sortConfig.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      return 0;
    });
  }

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, deptFilter, statusFilter]);

  const handleSort = (key) =>
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey)
      return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortConfig.direction === "asc" ? (
      <ChevronDown className="w-3 h-3 rotate-180" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
  
    if (num >= 100000) {
      return `₹ ${(num / 1000).toFixed(0)}K`;
    }
  
    return `₹ ${(num / 1000).toFixed(1)}K`;
  };
  const formatCurrencyFull = (val) => `₹ ${(val || 0).toLocaleString("en-IN")}`;
  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getGrossValue = (row) => {
    if (row.gross_value && Number(row.gross_value) > 0)
      return Number(row.gross_value);
    return (
      (Number(row.ctc) || 0) +
      (Number(row.pf) || 0) +
      (Number(row.esi) || 0) +
      (Number(row.bonus) || 0) +
      (Number(row.other_component) || 0) +
      (Number(row.reimbursement) || 0)
    );
  };

  const handleEdit = (employee) => {
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
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
              className="bg-white border border-gray-200 text-gray-900 font-medium px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Departments</option>
              {[
                "OS",
                "Temp",
                "Rec",
                "BD",
                "Accts",
                "HR",
                "Admin",
                "IT",
                "Projects",
                "Common",
                "Others",
              ].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-gray-200 text-gray-900 font-medium px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Not Active">Not Active</option>
            </select>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => exportToExcel(mergedData, formatDate)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
            >
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

        <div className="overflow-auto max-h-150">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                {[
                  { key: "department", label: "Department" },
                  { key: "name", label: "Name" },
                  { key: "designation", label: "Designation" },
                  { key: "location", label: "Location" },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    className="p-3 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort(key)}
                  >
                    <div className="flex items-center justify-between">
                      <span>{label}</span>
                      <SortIcon columnKey={key} />
                    </div>
                  </th>
                ))}
                <th className="p-3">Email</th>
                <th className="p-3 text-center">Role</th>
                <th
                  className="p-3 text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("gross_value")}
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>Gross Value / Month</span>
                    <SortIcon columnKey="gross_value" />
                  </div>
                </th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody
              className={`text-sm divide-y divide-gray-100 transition-all duration-300 ${
                isAnyModalOpen
                  ? "opacity-20 blur-sm pointer-events-none select-none"
                  : ""
              }`}
            >
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading…</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-16 text-center text-gray-400 text-sm"
                  >
                    No team members found
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-blue-50 transition-colors"
                  >
                    <td className="p-3">
                      <Badge
                        variant="secondary"
                        className="text-xs font-semibold text-gray-900"
                      >
                        {row.department}
                      </Badge>
                    </td>
                    <td className="p-3 font-semibold text-gray-900">
                      {row.name}
                    </td>
                    <td className="p-3 font-medium text-gray-900">
                      {row.designation}
                    </td>
                    <td className="p-3 font-medium text-gray-900">
                      {row.location || "—"}
                    </td>
                    <td className="p-3 font-medium text-gray-900 break-all">
                      {row.email || "—"}
                    </td>
                    <td className="p-3 text-center text-sm font-semibold text-gray-900">
                      {row.role || "employee"}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-gray-900">
                      {formatCurrency(getGrossValue(row))}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedEmployee(row)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded text-xs border border-blue-200"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(row)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded text-xs border border-amber-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Delete ${row.name}?`)) return;
                            const { error } = await supabase
                              .from("internal_team")
                              .delete()
                              .eq("id", row.id);
                            if (!error) fetchEmployees();
                          }}
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded text-xs border border-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className={`p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between transition-all duration-300 ${
            isAnyModalOpen
              ? "opacity-20 blur-sm pointer-events-none select-none"
              : ""
          }`}
        >
          <div className="text-sm text-gray-800 font-medium">
            Showing{" "}
            <span className="font-bold text-gray-900">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-gray-900">
              {Math.min(currentPage * itemsPerPage, filteredData.length)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-gray-900">
              {filteredData.length}
            </span>{" "}
            entries
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2)
                  pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* ── Employee Detail View Modal ── */}
      {selectedEmployee &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[99999]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedEmployee(null)}
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
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center sticky top-0 z-10 rounded-t-xl">
                  <div>
                    <h3 className="text-lg font-bold flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Employee Details
                    </h3>
                    <p className="text-blue-100 text-sm mt-1">
                      {selectedEmployee.name} — {selectedEmployee.emp_code}
                    </p>
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
                      className="text-white/80 hover:text-white p-2"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Basic Info */}
                  <ViewSection
                    icon={<Briefcase className="w-4 h-4" />}
                    title="Basic Information"
                  >
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        {
                          label: "Department",
                          value: (
                            <Badge
                              variant="secondary"
                              className="font-semibold text-gray-900"
                            >
                              {selectedEmployee.department}
                            </Badge>
                          ),
                        },
                        {
                          label: "Emp Code",
                          value: (
                            <span className="text-blue-700 font-mono font-semibold">
                              {selectedEmployee.emp_code}
                            </span>
                          ),
                        },
                        {
                          label: "Status",
                          value: (
                            <Badge
                              className={
                                selectedEmployee.status === "Active"
                                  ? "bg-emerald-100 text-emerald-800 font-semibold"
                                  : "bg-gray-100 text-gray-800 font-semibold"
                              }
                            >
                              {selectedEmployee.status}
                            </Badge>
                          ),
                        },
                        {
                          label: "Name",
                          value: (
                            <span className="font-semibold text-gray-900">
                              {selectedEmployee.name}
                            </span>
                          ),
                        },
                        {
                          label: "Father Name",
                          value: (
                            <span className="font-semibold text-gray-900">
                              {selectedEmployee.father_name || "—"}
                            </span>
                          ),
                        },
                        {
                          label: "Designation",
                          value: (
                            <span className="font-semibold text-gray-900">
                              {selectedEmployee.designation}
                            </span>
                          ),
                        },
                        {
                          label: "Location",
                          value: (
                            <span className="font-semibold text-gray-900">
                              {selectedEmployee.location || "—"}
                            </span>
                          ),
                        },
                        {
                          label: "Entity",
                          value: (
                            <span className="font-semibold text-gray-900">
                              {selectedEmployee.entity || "—"}
                            </span>
                          ),
                        },
                        {
                          label: "Email",
                          value: (
                            <span className="text-blue-700 font-mono font-semibold">
                              {selectedEmployee.email || "—"}
                            </span>
                          ),
                        },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                            {label}
                          </label>
                          <p className="text-sm mt-1">{value}</p>
                        </div>
                      ))}
                    </div>
                  </ViewSection>

                  {/* Employment */}
                  <ViewSection
                    icon={<Calendar className="w-4 h-4" />}
                    title="Employment Details"
                  >
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        {
                          label: "Date of Birth",
                          value: formatDate(selectedEmployee.dob),
                        },
                        {
                          label: "Date of Joining",
                          value: formatDate(selectedEmployee.doj),
                        },
                        {
                          label: "Last Working Day",
                          value: formatDate(selectedEmployee.last_working_day),
                        },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                            {label}
                          </label>
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ViewSection>

                  {/* Compensation */}
                  <ViewSection
                    icon={<DollarSign className="w-4 h-4" />}
                    title="Compensation Details (Monthly)"
                  >
                    <div className="bg-blue-600 text-white rounded-xl p-4 mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider">
                          Total Gross Value
                        </p>
                        <p className="text-3xl font-bold font-mono mt-1">
                          {formatCurrencyFull(getGrossValue(selectedEmployee))}
                        </p>
                        <p className="text-blue-300 text-xs mt-1">
                          Fixed Salary + PF + ESI + Bonus + Other +
                          Reimbursement
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider">
                          Variable (separate)
                        </p>
                        <p className="text-xl font-bold font-mono mt-1">
                          {formatCurrencyFull(selectedEmployee.variable)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          label: "Fixed Salary (CTC)",
                          value: selectedEmployee.ctc,
                          highlight: true,
                        },
                        { label: "PF", value: selectedEmployee.pf },
                        { label: "ESI", value: selectedEmployee.esi },
                        { label: "Bonus", value: selectedEmployee.bonus },
                        {
                          label: "Other Component",
                          value: selectedEmployee.other_component,
                        },
                        {
                          label: "Reimbursement",
                          value: selectedEmployee.reimbursement,
                        },
                      ].map(({ label, value, highlight }) => (
                        <div
                          key={label}
                          className={`p-3 rounded-lg border ${
                            highlight
                              ? "bg-indigo-50 border-indigo-200"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                            {label}
                          </label>
                          <p
                            className={`text-lg font-bold mt-1 font-mono ${
                              highlight ? "text-indigo-700" : "text-gray-900"
                            }`}
                          >
                            {formatCurrencyFull(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ViewSection>

                  {/* Cost Head Breakup — 4 keys */}
                  <ViewSection title="Current Cost Head Break Up">
                    <p className="text-xs text-gray-500 -mt-2 mb-3">
                      Default allocation effective from DOJ (
                      {formatDate(selectedEmployee.doj)})
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {COST_HEAD_KEYS.map(({ key, label, desc }) => {
                        const norm = normCostHead(
                          selectedEmployee.cost_head_breakup
                        );
                        const val = norm[key] || 0;
                        return (
                          <div
                            key={key}
                            className={`bg-white border rounded-lg p-3 flex flex-col gap-1 ${
                              val > 0 ? "border-blue-200" : "border-gray-200"
                            }`}
                          >
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                              {label}
                            </span>
                            <span className="text-xs text-gray-500">
                              {desc}
                            </span>
                            <span
                              className={`text-lg font-bold font-mono mt-1 ${
                                val > 0 ? "text-blue-700" : "text-gray-400"
                              }`}
                            >
                              {val}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <CostBar breakup={selectedEmployee.cost_head_breakup} />
                  </ViewSection>

                  {/* Cost Shift History */}
                  <ViewSection
                    icon={<History className="w-4 h-4" />}
                    title="Cost Head Shift History"
                    badge={
                      costHistory.length > 0 && (
                        <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          {costHistory.length} shift
                          {costHistory.length !== 1 ? "s" : ""}
                        </span>
                      )
                    }
                  >
                    {historyLoading ? (
                      <div className="flex items-center space-x-2 text-sm text-gray-500 py-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Loading…</span>
                      </div>
                    ) : costHistory.length === 0 ? (
                      <p className="text-sm text-gray-400 italic py-2">
                        No cost shift history. Use Edit to add shifts.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-100 text-gray-600 font-semibold uppercase tracking-wider">
                              <th className="px-3 py-2.5 text-left border-b border-gray-200 sticky left-0 bg-gray-100 z-10">
                                Period
                              </th>
                              {COST_HEAD_KEYS.map((h) => (
                                <th
                                  key={h.key}
                                  className="px-3 py-2.5 text-center border-b border-gray-200"
                                >
                                  <div>{h.label}</div>
                                  <div className="text-[9px] font-normal text-gray-400 normal-case">
                                    {h.desc}
                                  </div>
                                </th>
                              ))}
                              <th className="px-3 py-2.5 text-center border-b border-gray-200">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {costHistory.map((row, idx) => {
                              const norm = normCostHead(row.cost_head_breakup);
                              const total = COST_HEAD_KEYS.reduce(
                                (s, h) => s + (norm[h.key] || 0),
                                0
                              );
                              return (
                                <tr
                                  key={row.id}
                                  className={
                                    idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                                  }
                                >
                                  <td
                                    className={`px-3 py-2.5 font-semibold text-gray-900 sticky left-0 z-10 ${
                                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                                    }`}
                                  >
                                    <div className="flex items-center space-x-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                      <span>
                                        {MONTH_NAMES[row.effective_month - 1]}{" "}
                                        {row.effective_year}
                                      </span>
                                    </div>
                                  </td>
                                  {COST_HEAD_KEYS.map((h) => {
                                    const v = norm[h.key] || 0;
                                    return (
                                      <td
                                        key={h.key}
                                        className={`px-3 py-2.5 text-center font-mono font-bold ${
                                          v > 0
                                            ? "text-indigo-700 bg-indigo-50/60"
                                            : "text-gray-300"
                                        }`}
                                      >
                                        {v > 0 ? `${v}%` : "—"}
                                      </td>
                                    );
                                  })}
                                  <td
                                    className={`px-3 py-2.5 text-center font-mono font-bold ${
                                      total === 100
                                        ? "text-emerald-700"
                                        : "text-red-500"
                                    }`}
                                  >
                                    {total}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </ViewSection>

                  {/* Client Focus */}
                  <ViewSection title="Client Focus">
                    <div className="space-y-2">
                      {selectedEmployee.client_focus?.filter(
                        (c) => c.clientName
                      ).length ? (
                        selectedEmployee.client_focus
                          .filter((c) => c.clientName)
                          .map((client, i) => (
                            <div
                              key={i}
                              className="flex justify-between bg-white p-3 rounded border border-gray-200"
                            >
                              <span className="font-semibold text-gray-900">
                                {client.clientName}
                              </span>
                              <span className="font-bold text-gray-900">
                                {client.percentage}%
                              </span>
                            </div>
                          ))
                      ) : (
                        <p className="text-gray-500 text-sm">
                          No client allocation
                        </p>
                      )}
                    </div>
                  </ViewSection>
                </div>
              </motion.div>
            </div>
          </div>,
          document.body
        )}

      {/* Add / Edit Modal */}
      <AddInternalTeamModal
        key={editingEmployee?.id || "new"}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEmployee(null);
        }}
        editingEmployee={editingEmployee}
        onSaved={fetchEmployees}
      />
    </div>
  );
};

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */
const ViewSection = ({ icon, title, subtitle, badge, children }) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <div className="flex items-center space-x-2 mb-4">
      {icon && <span className="text-blue-600">{icon}</span>}
      <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
      {badge && <span>{badge}</span>}
    </div>
    {subtitle && <p className="text-xs text-gray-500 -mt-3 mb-3">{subtitle}</p>}
    {children}
  </div>
);

export default InternalTeamDetails;
