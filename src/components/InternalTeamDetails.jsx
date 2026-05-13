import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactDOM from "react-dom";
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
  Eye,
  Edit,
  X,
  Calendar,
  DollarSign,
  Briefcase,
} from "lucide-react";
import Card from "./ui/Card";
import Button from "./ui/button";
import Badge from "./ui/Badge";
import AddInternalTeamModal from "./AddInternalTeamModal";

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
  const itemsPerPage = 7;

  const isAnyModalOpen = !!selectedEmployee || isModalOpen;

  useEffect(() => {
    const loadTeamRoles = async () => {
      setRoleLoading(true);
      const { data: rolesData, error } = await supabase
        .from("user_roles")
        .select("email, role");
      if (error) {
        console.error("Error loading user_roles:", error);
        setTeamRoles([]);
      } else {
        setTeamRoles(rolesData ?? []);
      }
      setRoleLoading(false);
    };
    loadTeamRoles();
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
    if (error) {
      console.error("Error fetching employees:", error);
    } else {
      setData(employees || []);
    }
    setLoading(false);
  };

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
    const matchesSearch =
      row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.emp_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === "All" || row.department === deptFilter;
    const matchesStatus = statusFilter === "All" || row.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  if (sortConfig.key) {
    filteredData = [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortConfig.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
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

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronDown className="w-3 h-3 opacity-30" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronDown className="w-3 h-3 rotate-180" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  const formatCurrency = (val) => `₹ ${(val / 1000).toFixed(0)}K`;
  const formatCurrencyFull = (val) => `₹ ${val.toLocaleString("en-IN")}`;
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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
              className="bg-white border border-gray-200 text-gray-900 font-medium px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
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
              className="bg-white border border-gray-200 text-gray-900 font-medium px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
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

        <div className="overflow-auto max-h-150">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th
                  className="p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("department")}
                >
                  <div className="flex items-center justify-between">
                    <span>Department</span>
                    <SortIcon columnKey="department" />
                  </div>
                </th>
                <th
                  className="p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center justify-between">
                    <span>Name</span>
                    <SortIcon columnKey="name" />
                  </div>
                </th>
                <th
                  className="p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("designation")}
                >
                  <div className="flex items-center justify-between">
                    <span>Designation</span>
                    <SortIcon columnKey="designation" />
                  </div>
                </th>
                <th
                  className="p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("location")}
                >
                  <div className="flex items-center justify-between">
                    <span>Location</span>
                    <SortIcon columnKey="location" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-100 transition-colors">
                  <span>Email</span>
                </th>
                <th className="p-3 text-center cursor-pointer hover:bg-gray-100 transition-colors">
                  <span>Role</span>
                </th>
                <th
                  className="p-3 text-right cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("ctc")}
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>CTC</span>
                    <SortIcon columnKey="ctc" />
                  </div>
                </th>
                <th
                  className="p-3 text-right cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("variable")}
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>Variable</span>
                    <SortIcon columnKey="variable" />
                  </div>
                </th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody
              className={`text-sm divide-y divide-gray-100 transition-all duration-300 ${
                isAnyModalOpen
                  ? "opacity-20 blur-sm pointer-events-none select-none"
                  : "opacity-100 blur-none"
              }`}
            >
              {paginatedData.map((row, index) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="hover:bg-blue-50 transition-colors"
                >
                  {/* Department */}
                  <td className="p-3">
                    <Badge variant="secondary" className="text-xs font-semibold text-gray-900">
                      {row.department}
                    </Badge>
                  </td>

                  {/* Name */}
                  <td className="p-3 font-semibold text-gray-900">{row.name}</td>

                  {/* Designation */}
                  <td className="p-3 font-medium text-gray-900">{row.designation}</td>

                  {/* Location */}
                  <td className="p-3 font-medium text-gray-900">{row.location}</td>

                  {/* Email */}
                  <td className="p-3 font-medium text-gray-900 break-all">{row.email}</td>

                  {/* Role */}
                  <td className="p-3 text-center text-sm font-semibold text-gray-900">
                    {row.role || "employee"}
                  </td>

                  {/* CTC */}
                  <td className="p-3 text-right font-mono font-bold text-gray-900">
                    {formatCurrency(row.ctc)}
                  </td>

                  {/* Variable */}
                  <td className="p-3 text-right font-mono font-semibold text-gray-900">
                    {formatCurrency(row.variable)}
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedEmployee(row)}
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded text-xs border border-blue-200 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(row)}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded text-xs border border-amber-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          const confirmDelete = window.confirm(`Delete ${row.name}?`);
                          if (!confirmDelete) return;
                          const { error } = await supabase
                            .from("internal_team")
                            .delete()
                            .eq("id", row.id);
                          if (error) {
                            console.error(error);
                          } else {
                            fetchEmployees();
                          }
                        }}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded text-xs border border-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className={`p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between transition-all duration-300 ${
            isAnyModalOpen
              ? "opacity-20 blur-sm pointer-events-none select-none"
              : "opacity-100 blur-none"
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
            <span className="font-bold text-gray-900">{filteredData.length}</span>{" "}
            entries
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Employee Detail Modal */}
      {selectedEmployee &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-99999">
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
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center sticky top-0 z-10">
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
                      {[
                        { label: "Department", value: <Badge variant="secondary" className="font-semibold text-gray-900">{selectedEmployee.department}</Badge> },
                        { label: "Email", value: <span className="text-blue-700 font-mono font-semibold">{selectedEmployee.email}</span> },
                        { label: "Employee Code", value: <span className="text-blue-700 font-mono font-semibold">{selectedEmployee.emp_code}</span> },
                        {
                          label: "Status", value: (
                            <Badge className={selectedEmployee.status === "Active" ? "bg-emerald-100 text-emerald-800 font-semibold" : "bg-gray-100 text-gray-800 font-semibold"}>
                              {selectedEmployee.status}
                            </Badge>
                          )
                        },
                        { label: "Name", value: <span className="font-semibold text-gray-900">{selectedEmployee.name}</span> },
                        { label: "Father Name", value: <span className="font-semibold text-gray-900">{selectedEmployee.father_name}</span> },
                        { label: "Designation", value: <span className="font-semibold text-gray-900">{selectedEmployee.designation}</span> },
                        { label: "Location", value: <span className="font-semibold text-gray-900">{selectedEmployee.location}</span> },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</label>
                          <p className="text-sm mt-1">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Employment Details */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                      Employment Details
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Date of Birth", value: formatDate(selectedEmployee.dob) },
                        { label: "Date of Joining", value: formatDate(selectedEmployee.doj) },
                        { label: "Last Working Day", value: "-" },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</label>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Compensation Details */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <DollarSign className="w-4 h-4 mr-2 text-blue-600" />
                      Compensation Details
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "CTC", value: selectedEmployee.ctc },
                        { label: "PF", value: selectedEmployee.pf },
                        { label: "ESI", value: selectedEmployee.esi },
                        { label: "Bonus", value: selectedEmployee.bonus },
                        { label: "Variable", value: selectedEmployee.variable },
                        { label: "Other Component", value: selectedEmployee.other_component },
                        { label: "Reimbursement", value: selectedEmployee.reimbursement },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-white p-3 rounded-lg border border-gray-200">
                          <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</label>
                          <p className="text-lg font-bold text-gray-900 mt-1 font-mono">
                            {formatCurrencyFull(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cost Head Breakup */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-4">Cost Head Break Up</h4>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {[
                        { key: "os", label: "OS", desc: "Outsourcing" },
                        { key: "rec", label: "REC", desc: "Recruitment" },
                        { key: "temp", label: "TEMP", desc: "Temporary" },
                        { key: "projects", label: "PROJECTS", desc: "Project-Based" },
                        { key: "bd", label: "BD", desc: "Business Dev" },
                        { key: "hr", label: "HR", desc: "Human Resources" },
                        { key: "accts", label: "ACCTS", desc: "Accounts" },
                        { key: "admin", label: "ADMIN", desc: "Administration" },
                        { key: "others", label: "OTHERS", desc: "Others" },
                      ].map(({ key, label, desc }) => {
                        const val = selectedEmployee.cost_head_breakup?.[key] || 0;
                        return (
                          <div
                            key={key}
                            className={`bg-white border rounded-lg p-3 flex flex-col gap-1 ${val > 0 ? "border-blue-200" : "border-gray-200"}`}
                          >
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{label}</span>
                            <span className="text-xs text-gray-500">{desc}</span>
                            <span className={`text-lg font-bold font-mono mt-1 ${val > 0 ? "text-blue-700" : "text-gray-400"}`}>
                              {val}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {(() => {
                      const heads = ["os","rec","temp","projects","bd","hr","accts","admin","others"].map(k => ({ key: k }));
                      const colors = ["bg-blue-500","bg-indigo-500","bg-violet-500","bg-purple-500","bg-pink-500","bg-rose-500","bg-orange-500","bg-amber-500","bg-teal-500"];
                      const total = heads.reduce((s, h) => s + (selectedEmployee.cost_head_breakup?.[h.key] || 0), 0);
                      if (!total) return null;
                      return (
                        <div className="mt-3 h-2 rounded-full overflow-hidden bg-gray-100 flex">
                          {heads.map(({ key }, i) => {
                            const v = selectedEmployee.cost_head_breakup?.[key] || 0;
                            if (!v) return null;
                            return <div key={key} style={{ width: `${v}%` }} className={`h-full transition-all ${colors[i]}`} />;
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Client Focus */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-4">Client Focus</h4>
                    <div className="space-y-2">
                      {selectedEmployee.client_focus?.length ? (
                        selectedEmployee.client_focus.map((client, index) => (
                          <div key={index} className="flex justify-between bg-white p-3 rounded border border-gray-200">
                            <span className="font-semibold text-gray-900">{client.clientName}</span>
                            <span className="font-bold text-gray-900">{client.percentage}%</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">No client allocation</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>,
          document.body
        )}

      {/* Add/Edit Modal */}
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

export default InternalTeamDetails;