import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Edit2, Trash2, X, Save,
  TrendingUp, AlertCircle, CheckCircle2, Clock, Upload, FileSpreadsheet,
  Lock
} from "lucide-react";
import * as XLSX from "xlsx";
import supabase from "../../lib/supabaseClient";
import { usePerms } from "../../context/PermissionsContext";

const STATUS_OPTIONS = ["Pending", "Partially Paid", "Closed"];
const DEPT_OPTIONS = ["OS", "REC", "Common", "Temp", "Project", "Other"];

const emptyForm = {
  employee_name: "",
  department: "",
  date_of_advance: "",
  advance_amount: "",
  interest: "",
  paid_back: "",
  status: "Pending",
  remarks: "",
};

function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className={`rounded-2xl p-5 ${bg} flex items-center gap-4 shadow-sm border border-blue-100`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-blue-900">{value}</p>
      </div>
    </div>
  );
}

export default function EmployeeAdvanceTracker() {
  const { isIntern, role } = usePerms?.() || {};
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDept, setFilterDept] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchRecords();
    fetchEmployees();
  }, []);

  async function fetchRecords() {
    setLoading(true);
    const { data, error } = await supabase
      .from("employee_advance_tracker")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setRecords(data || []);
    setLoading(false);
  }

  async function fetchEmployees() {
    const { data } = await supabase
      .from("internal_team")
      .select("name, department")
      .order("name");
    if (data) setEmployees(data);
  }

  function openAdd() {
    setEditRecord(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(rec) {
    setEditRecord(rec);
    setForm({
      employee_name: rec.employee_name || "",
      department: rec.department || "",
      date_of_advance: rec.date_of_advance || "",
      advance_amount: rec.advance_amount || "",
      interest: rec.interest || "",
      paid_back: rec.paid_back || "",
      status: rec.status || "Pending",
      remarks: rec.remarks || "",
    });
    setShowModal(true);
  }

  // Pending Due = Amount + Interest - Paid Back
  function calcPendingDue(amount, interest, paidBack) {
    return Math.max(
      0,
      (parseFloat(amount) || 0) +
      (parseFloat(interest) || 0) -
      (parseFloat(paidBack) || 0)
    );
  }

  const isLocked = (dateStr) => {
    if (!dateStr) return false;
    const rowDate = new Date(dateStr);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 45);
    return rowDate < cutoff;
  };

  async function handleSave() {
    if (isIntern) return;
    if (!form.employee_name || !form.advance_amount) return;
    setSaving(true);

    const pending_due = calcPendingDue(form.advance_amount, form.interest, form.paid_back);

    const payload = {
      employee_name: form.employee_name,
      department: form.department,
      date_of_advance: form.date_of_advance || null,
      advance_amount: parseFloat(form.advance_amount) || 0,
      interest: parseFloat(form.interest) || 0,
      paid_back: parseFloat(form.paid_back) || 0,
      pending_due,
      status: form.status,
      remarks: form.remarks,
    };

    if (editRecord) {
      await supabase.from("employee_advance_tracker").update(payload).eq("id", editRecord.id);
    } else {
      await supabase.from("employee_advance_tracker").insert([payload]);
    }
    setSaving(false);
    setShowModal(false);
    fetchRecords();
  }

  async function handleDelete(id) {
    await supabase.from("employee_advance_tracker").delete().eq("id", id);
    setDeleteId(null);
    fetchRecords();
  }

  function handleEmployeeSelect(name) {
    const emp = employees.find((e) => e.name === name);
    setForm((f) => ({ ...f, employee_name: name, department: emp?.department || f.department }));
  }

  // ── Excel Upload ─────────────────────────────────────────────────────────
  // Reads rows where Payment Head column = "Loan-Advance" (case-insensitive)
  // Expected columns: Name, Department/Dept, Date, Amount, Interest, Paid Back, Status, Remarks
  async function handleExcelUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

      // Filter rows where Payment Head = "Loan-Advance"
      const loanRows = rows.filter((row) => {
        const ph = (
          row["Payment Head"] ||
          row["payment_head"] ||
          row["PaymentHead"] ||
          row["payment head"] ||
          ""
        ).toString().trim().toLowerCase();
        return ph === "loan-advance" || ph === "loan advance" || ph === "loanadvance";
      });

      if (loanRows.length === 0) {
        setUploadResult({ success: 0, skipped: 0, message: 'No rows found with Payment Head = "Loan-Advance"' });
        setUploading(false);
        e.target.value = "";
        return;
      }

      // Map to DB payload
      const payloads = loanRows.map((row) => {
        const amount   = parseFloat(row["Amount (LA)"] || row["Amount"] || row["amount"] || 0) || 0;
        const interest = parseFloat(row["Interest"] || row["interest"] || 0) || 0;
        const paidBack = parseFloat(row["Paid back"] || row["Paid Back"] || row["paid_back"] || 0) || 0;
        const pending_due = Math.max(0, amount + interest - paidBack);

        // Parse date — could be JS Date (cellDates:true) or string
        let date_of_advance = null;
        const rawDate =
          row["Date of Loan=Adv (LA)"] ||
          row["Date"] ||
          row["date"] ||
          row["Date of Advance"] || "";
        if (rawDate instanceof Date) {
          date_of_advance = rawDate.toISOString().slice(0, 10);
        } else if (rawDate) {
          // Try to parse string
          const parsed = new Date(rawDate);
          if (!isNaN(parsed)) date_of_advance = parsed.toISOString().slice(0, 10);
        }

        const rawStatus = (row["Status"] || row["status"] || "Pending").toString().trim();
        const status = STATUS_OPTIONS.includes(rawStatus) ? rawStatus : "Pending";

        return {
          employee_name: (row["Name"] || row["name"] || row["Employee Name"] || "").toString().trim(),
          department:    (row["Department"] || row["Dept"] || row["dept"] || row["department"] || "").toString().trim(),
          date_of_advance,
          advance_amount: amount,
          interest,
          paid_back: paidBack,
          pending_due,
          status,
          remarks: (row["Remarks"] || row["remarks"] || "").toString().trim(),
        };
      }).filter((r) => r.employee_name); // skip rows without a name

      if (payloads.length === 0) {
        setUploadResult({ success: 0, skipped: loanRows.length, message: "No valid rows with employee name found." });
        setUploading(false);
        e.target.value = "";
        return;
      }

      const { error } = await supabase.from("employee_advance_tracker").insert(payloads);
      if (error) throw error;

      setUploadResult({ success: payloads.length, skipped: loanRows.length - payloads.length, message: null });
      fetchRecords();
    } catch (err) {
      setUploadResult({ success: 0, skipped: 0, message: `Error: ${err.message}` });
    }

    setUploading(false);
    e.target.value = "";
  }

  const filtered = records.filter((r) => {
    const matchSearch =
      r.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.department?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || r.status === filterStatus;
    const matchDept = filterDept === "All" || r.department === filterDept;
    return matchSearch && matchStatus && matchDept;
  });

  const totalAdvanced = records.reduce((s, r) => s + (parseFloat(r.advance_amount) || 0), 0);
  const totalPending  = records.reduce((s, r) => s + (parseFloat(r.pending_due) || 0), 0);
  const openCount     = records.filter((r) => r.status !== "Closed").length;
  const closedCount   = records.filter((r) => r.status === "Closed").length;

  const fmt = (n) =>
    `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

  // Live pending due for modal
  const livePending = calcPendingDue(form.advance_amount, form.interest, form.paid_back);

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Advanced"    value={fmt(totalAdvanced)} icon={TrendingUp}   color="bg-blue-600"  bg="bg-blue-50" />
        <StatCard label="Total Pending Due" value={fmt(totalPending)}  icon={AlertCircle}  color="bg-blue-800"  bg="bg-blue-50" />
        <StatCard label="Open Cases"        value={openCount}          icon={Clock}        color="bg-blue-500"  bg="bg-blue-50" />
        <StatCard label="Closed Cases"      value={closedCount}        icon={CheckCircle2} color="bg-green-600" bg="bg-green-50" />
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-wrap flex-1">
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
              <input
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/40"
                placeholder="Search employee or dept…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2.5 text-sm border border-blue-200 rounded-xl bg-blue-50/40 text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select
              className="px-3 py-2.5 text-sm border border-blue-200 rounded-xl bg-blue-50/40 text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option value="All">All Departments</option>
              {DEPT_OPTIONS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            {/* Excel Upload */}
            {false && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleExcelUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold shadow transition-all disabled:opacity-60"
                >
                  {uploading ? (
                    <span className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 animate-pulse" /> Importing…</span>
                  ) : (
                    <><Upload className="w-4 h-4" /> Import Excel</>
                  )}
                </button>
              </>
            )}
            {false && (
              <button
                onClick={openAdd}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-xl text-sm font-semibold shadow hover:shadow-md hover:from-blue-800 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Advance
              </button>
            )}
          </div>
        </div>

        {/* Upload result message */}
        {uploadResult && (
          <div className={`mt-3 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between ${
            uploadResult.message ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"
          }`}>
            <span>
              {uploadResult.message
                ? uploadResult.message
                : `✅ ${uploadResult.success} record${uploadResult.success !== 1 ? "s" : ""} imported successfully${uploadResult.skipped > 0 ? `, ${uploadResult.skipped} skipped` : ""}.`}
            </span>
            <button onClick={() => setUploadResult(null)} className="ml-4 opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#1a3a6b] to-[#2563eb]">
                {["Employee", "Department", "Date", "Amount (LA)", "Interest", "Paid Back", "Pending Due", "Status", "Remarks", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-white font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-16 text-blue-400">Loading records…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-16 text-gray-400">No records found</td></tr>
              ) : (
                filtered.map((r, i) => {
                  const pendingDue = calcPendingDue(r.advance_amount, r.interest, r.paid_back);
                  return (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-blue-50 hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-semibold text-blue-900">{r.employee_name}</td>
                      <td className="px-4 py-3.5 text-gray-600">{r.department}</td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{r.date_of_advance}</td>
                      <td className="px-4 py-3.5 font-mono text-blue-800 font-semibold">{fmt(r.advance_amount)}</td>
                      <td className="px-4 py-3.5 font-mono text-orange-600 font-semibold">{fmt(r.interest)}</td>
                      <td className="px-4 py-3.5 font-mono text-green-700 font-semibold">{fmt(r.paid_back)}</td>
                      <td className="px-4 py-3.5 font-mono text-red-600 font-bold">{fmt(pendingDue)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          r.status === "Closed"          ? "bg-green-100 text-green-700" :
                          r.status === "Partially Paid"  ? "bg-yellow-100 text-yellow-700" :
                                                           "bg-red-100 text-red-600"
                        }`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 max-w-[140px] truncate">{r.remarks}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-2">
                          {isLocked(r.date_of_advance) && role !== "admin" ? (
                            <button
                              disabled
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed"
                              title="Locked — entries older than 45 days can only be edited by an Admin."
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!isIntern && (
                            isLocked(r.date_of_advance) && role !== "admin" ? (
                              <button
                                disabled
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed"
                                title="Locked — entries older than 45 days can only be deleted by an Admin."
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-[#1a3a6b] to-[#2563eb] px-6 py-4 flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">
                  {editRecord ? "Edit Advance Record" : "Add Employee Advance"}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-2 gap-4">
                {/* Employee Name */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">Employee Name *</label>
                  {employees.length > 0 ? (
                    <select
                      className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.employee_name}
                      onChange={(e) => handleEmployeeSelect(e.target.value)}
                    >
                      <option value="">Select Employee</option>
                      {employees.map((e) => <option key={e.name} value={e.name}>{e.name}</option>)}
                    </select>
                  ) : (
                    <input
                      className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.employee_name}
                      onChange={(e) => setForm((f) => ({ ...f, employee_name: e.target.value }))}
                      placeholder="Employee name"
                    />
                  )}
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">Department</label>
                  <select
                    className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.department}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  >
                    <option value="">Select Dept</option>
                    {DEPT_OPTIONS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">Date of Loan / Advance</label>
                  <input type="date" className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.date_of_advance} onChange={(e) => setForm((f) => ({ ...f, date_of_advance: e.target.value }))} />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">Amount (LA) *</label>
                  <input type="number" className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.advance_amount} onChange={(e) => setForm((f) => ({ ...f, advance_amount: e.target.value }))} placeholder="0.00" />
                </div>

                {/* Interest — manual */}
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">Interest (Manual)</label>
                  <input type="number" className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.interest} onChange={(e) => setForm((f) => ({ ...f, interest: e.target.value }))} placeholder="0.00" />
                </div>

                {/* Paid Back */}
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">Paid Back</label>
                  <input type="number" className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.paid_back} onChange={(e) => setForm((f) => ({ ...f, paid_back: e.target.value }))} placeholder="0.00" />
                </div>

                {/* Pending Due — AUTO */}
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">Pending Due (Auto)</label>
                  <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm font-bold text-red-600">
                    {fmt(livePending)}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">= Amount + Interest − Paid Back</p>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">Status</label>
                  <select className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>

                {/* Remarks */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">Remarks</label>
                  <textarea className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2} value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} placeholder="Optional notes…" />
                </div>
              </div>

              <div className="px-6 pb-6 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving || isIntern} className={`px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow hover:shadow-md disabled:opacity-60 ${
                  isIntern ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-gradient-to-r from-blue-700 to-blue-500 text-white"
                }`}>
                  <Save className="w-4 h-4" /> {saving ? "Saving…" : isIntern ? "View Only" : editRecord ? "Update" : "Save"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Record?</h3>
              <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteId(null)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold">Cancel</button>
                <button onClick={() => handleDelete(deleteId)} className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}