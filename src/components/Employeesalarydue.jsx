import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import {
  Search,
  Download,
  Upload,
  RefreshCw,
  X,
  Save,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Users,
  IndianRupee,
  AlertTriangle,
  Eye,
  Plus,
  Filter,
  Info,
} from "lucide-react";
import supabase from "../lib/supabaseClient";
import { usePerms } from "../context/PermissionsContext";
import { useAuth } from "../context/AuthContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inr = (v) =>
  "₹ " + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 });

const fmtMonth = (d) =>
  d
    ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : "—";

const toMonthDate = (ym) => {
  // ym = "2026-06" → "2026-06-01"
  if (!ym) return null;
  return ym.length === 7 ? ym + "-01" : ym;
};

const ITEMS_PER_PAGE = 15;

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ toast }) => (
  <AnimatePresence>
    {toast && (
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold text-white min-w-[260px] justify-center ${
          toast.type === "error" ? "bg-rose-500" : "bg-emerald-500"
        }`}
      >
        {toast.type === "error" ? (
          <AlertCircle className="w-4 h-4 shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        )}
        {toast.msg}
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Single Edit / Add Pop Card ───────────────────────────────────────────────
const SalaryDueCard = ({ row, onClose, onSaved, onDeleted, userEmail }) => {
  const { canEdit, canDelete } = usePerms();
  const isNew = !row.salary_due_record_id;

  const [form, setForm] = useState({
    salary_due: row.manual_salary_due ?? row.final_salary_due ?? "",
    remarks: row.manual_remarks ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);

  const hasOverride = !!row.salary_due_record_id;
  const diff =
    Number(form.salary_due || 0) - Number(row.system_calculated_due || 0);

  const handleSave = async () => {
    if (!form.salary_due) {
      setError("Salary due is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase.rpc("upsert_employee_salary_due", {
        p_emp_code: row.emp_code,
        p_due_month: row.due_month,
        p_salary_due: Number(form.salary_due),
        p_remarks: form.remarks || null,
        p_user_email: userEmail || null,
      });
      if (err) throw err;
      onSaved("Salary due saved");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!row.salary_due_record_id) return;
    setDeleting(true);
    setError(null);
    try {
      const { error: err } = await supabase.rpc("delete_employee_salary_due", {
        p_id: row.salary_due_record_id,
      });
      if (err) throw err;
      onDeleted("Override removed — reverted to system due");
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 24, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-0.5">
                Salary Due Override
              </p>
              <h3 className="text-lg font-black tracking-tight">
                {row.employee_name}
              </h3>
              <p className="text-indigo-200 text-xs mt-0.5">
                {row.emp_code} · {row.department} · {fmtMonth(row.due_month)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-white/15 hover:bg-white/25 rounded-xl transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* System vs Manual info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                System Due
              </p>
              <p className="text-xl font-black text-slate-800 font-mono">
                {inr(row.system_calculated_due)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                CTC + Variable
              </p>
            </div>
            <div
              className={`border rounded-2xl p-4 text-center ${
                hasOverride
                  ? "bg-amber-50 border-amber-200"
                  : "bg-indigo-50 border-indigo-200"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-500">
                {hasOverride ? "Manual Override" : "Final Due"}
              </p>
              <p
                className={`text-xl font-black font-mono ${
                  hasOverride ? "text-amber-700" : "text-indigo-700"
                }`}
              >
                {inr(row.final_salary_due)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {hasOverride ? "Overridden" : "= System Due"}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">
                Manual Salary Due <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm font-semibold">
                  ₹
                </span>
                <input
                  type="number"
                  value={form.salary_due}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, salary_due: e.target.value }));
                    setError(null);
                  }}
                  className="w-full pl-8 pr-4 py-2.5 border-2 border-gray-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm font-bold text-gray-800 outline-none transition-all"
                  placeholder="Enter amount"
                />
              </div>
              {/* Diff indicator */}
              {form.salary_due !== "" && form.salary_due !== null && (
                <p
                  className={`text-xs font-semibold mt-1.5 flex items-center gap-1 ${
                    diff < 0
                      ? "text-rose-500"
                      : diff > 0
                      ? "text-emerald-600"
                      : "text-gray-400"
                  }`}
                >
                  <Info className="w-3 h-3" />
                  {diff === 0
                    ? "Same as system due"
                    : diff > 0
                    ? `₹${Number(Math.abs(diff)).toLocaleString(
                        "en-IN"
                      )} above system due`
                    : `₹${Number(Math.abs(diff)).toLocaleString(
                        "en-IN"
                      )} below system due (LOP/deduction)`}
                </p>
              )}
              {error && (
                <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">
                Remarks{" "}
                <span className="text-gray-400 normal-case font-normal">
                  (optional)
                </span>
              </label>
              <textarea
                rows={2}
                value={form.remarks}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remarks: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 border-2 border-gray-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-gray-700 outline-none resize-none transition-all"
                placeholder="e.g. LOP 5 days, incentive added…"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {/* Delete override button (only if manual record exists) */}
            {canDelete && hasOverride && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border-2 border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Override
              </button>
            )}
            {confirmDelete && (
              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-all disabled:opacity-60"
                >
                  {deleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Confirm Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3.5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-500 text-xs font-bold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              {canEdit && !confirmDelete && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-60 transition-all"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? "Saving…" : "Save Override"}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Bulk Upload Result Modal ─────────────────────────────────────────────────
const BulkResultModal = ({ result, onClose }) => (
  <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.92, opacity: 0 }}
      className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
    >
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold">Bulk Upload Result</h3>
              <p className="text-slate-400 text-xs">
                Salary due overrides processed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`${
              result.added > 0 ? "bg-emerald-500" : "bg-white/10"
            } rounded-2xl p-3 text-center`}
          >
            <p className="text-2xl font-black text-white">{result.added}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">
              ✅ Saved
            </p>
          </div>
          <div
            className={`${
              result.failed > 0 ? "bg-rose-500" : "bg-white/10"
            } rounded-2xl p-3 text-center`}
          >
            <p className="text-2xl font-black text-white">{result.failed}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">
              ❌ Failed
            </p>
          </div>
        </div>
      </div>
      <div className="p-5 space-y-2 max-h-64 overflow-y-auto">
        {result.added > 0 && result.failed === 0 && (
          <div className="flex flex-col items-center py-6 gap-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="font-bold text-slate-800">
              {result.added} row{result.added !== 1 ? "s" : ""} saved
            </p>
          </div>
        )}
        {result.failedRows?.map((r, i) => (
          <div
            key={i}
            className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-xs text-rose-700"
          >
            <span className="font-bold">Row {r.row}:</span> {r.error}
          </div>
        ))}
      </div>
      <div className="px-5 pb-5">
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-bold text-sm hover:bg-slate-900 transition-all"
        >
          Done
        </button>
      </div>
    </motion.div>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function EmployeeSalaryDue({ onBack }) {
  const { canEdit, canDelete } = usePerms();
  const { user } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState(null); // for pop card
  const [bulkResult, setBulkResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Filters
  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [deptFilter, setDeptFilter] = useState("All");
  const [entityFilter, setEntityFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showOnlyOverrides, setShowOnlyOverrides] = useState(false);

  const excelRef = useRef(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("employee_salary_due_view")
        .select("*")
        .order("employee_name", { ascending: true });

      if (monthFilter) {
        q = q.eq("due_month", toMonthDate(monthFilter));
      }

      const { data, error } = await q;
      if (error) throw error;
      setRows(data || []);
      setPage(1);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [monthFilter, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived lists for filter dropdowns ───────────────────────────────────────
  const allDepts = useMemo(
    () => ["All", ...new Set(rows.map((r) => r.department).filter(Boolean))],
    [rows]
  );
  const allEntities = useMemo(
    () => ["All", ...new Set(rows.map((r) => r.entity).filter(Boolean))],
    [rows]
  );

  // ── Filtered rows ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const matchSearch =
        !q ||
        r.employee_name?.toLowerCase().includes(q) ||
        r.emp_code?.toLowerCase().includes(q);
      const matchDept = deptFilter === "All" || r.department === deptFilter;
      const matchEntity = entityFilter === "All" || r.entity === entityFilter;
      const matchOverride = !showOnlyOverrides || !!r.salary_due_record_id;
      return matchSearch && matchDept && matchEntity && matchOverride;
    });
  }, [rows, search, deptFilter, entityFilter, showOnlyOverrides]);

  // ── Pagination ────────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageData = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setPage(1);
  }, [search, deptFilter, entityFilter, showOnlyOverrides]);

  // ── KPIs ──────────────────────────────────────────────────────────────────────
  const kpis = useMemo(
    () => ({
      totalSystem: filtered.reduce(
        (s, r) => s + Number(r.system_calculated_due || 0),
        0
      ),
      totalFinal: filtered.reduce(
        (s, r) => s + Number(r.final_salary_due || 0),
        0
      ),
      overrideCount: filtered.filter((r) => !!r.salary_due_record_id).length,
      totalDiff: filtered.reduce(
        (s, r) =>
          s +
          Number(r.final_salary_due || 0) -
          Number(r.system_calculated_due || 0),
        0
      ),
    }),
    [filtered]
  );

  // ── Card close → refetch ──────────────────────────────────────────────────────
  const handleCardSaved = (msg) => {
    setSelectedRow(null);
    showToast(msg);
    fetchData();
  };
  const handleCardDeleted = (msg) => {
    setSelectedRow(null);
    showToast(msg);
    fetchData();
  };

  // ── Excel template download ───────────────────────────────────────────────────
  const downloadTemplate = () => {
    const headers = [
      "emp_code",
      "due_month (YYYY-MM)",
      "salary_due",
      "remarks",
    ];
    const samples = [
      ["VB01002", "2026-06", "75000", "LOP 3 days"],
      ["VB01130", "2026-06", "72450", ""],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...samples]);
    ws["!cols"] = [{ wch: 16 }, { wch: 22 }, { wch: 14 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, "Salary Due");
    XLSX.writeFile(wb, "salary_due_template.xlsx");
  };

  // ── Excel export (current view) ───────────────────────────────────────────────
  const exportData = () => {
    const headers = [
      "Emp Code",
      "Name",
      "Department",
      "Entity",
      "Month",
      "System Due (CTC+Var)",
      "Manual Override",
      "Final Salary Due",
      "Remarks",
      "Last Updated By",
    ];
    const dataRows = filtered.map((r) => [
      r.emp_code,
      r.employee_name,
      r.department,
      r.entity,
      fmtMonth(r.due_month),
      Number(r.system_calculated_due || 0),
      r.manual_salary_due !== null ? Number(r.manual_salary_due) : "",
      Number(r.final_salary_due || 0),
      r.manual_remarks || "",
      r.updated_by || "",
    ]);
    const totalsRow = [
      "TOTAL",
      "",
      "",
      "",
      "",
      kpis.totalSystem,
      "",
      kpis.totalFinal,
      "",
      "",
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows, totalsRow]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, "Salary Due");
    XLSX.writeFile(wb, `Salary_Due_${monthFilter}.xlsx`);
  };

  // ── Bulk Excel upload ─────────────────────────────────────────────────────────
  const handleExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (excelRef.current) excelRef.current.value = "";
    setBulkLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(ws, { raw: true, defval: "" });

      let added = 0;
      const failedRows = [];

      for (let i = 0; i < rawRows.length; i++) {
        const r = rawRows[i];
        const rowNum = i + 2;

        // Normalise column names (case-insensitive)
        const norm = {};
        Object.entries(r).forEach(([k, v]) => {
          norm[k.toLowerCase().replace(/[^a-z0-9]/g, "_")] = v;
        });

        const emp_code = String(norm.emp_code || "").trim();
        const monthRaw = String(
          norm.due_month_yyyy_mm_ || norm.due_month || norm.month || ""
        ).trim();
        const salaryRaw = norm.salary_due ?? norm.salary ?? "";
        const remarks = String(norm.remarks || "").trim();

        if (!emp_code) {
          failedRows.push({ row: rowNum, error: "emp_code is empty" });
          continue;
        }
        if (!monthRaw) {
          failedRows.push({ row: rowNum, error: "due_month is empty" });
          continue;
        }
        if (salaryRaw === "") {
          failedRows.push({ row: rowNum, error: "salary_due is empty" });
          continue;
        }

        const salary_due = parseFloat(salaryRaw);
        if (isNaN(salary_due)) {
          failedRows.push({
            row: rowNum,
            error: `salary_due "${salaryRaw}" is not a number`,
          });
          continue;
        }

        // due_month: accept "2026-06" or "2026-06-01"
        const due_month = monthRaw.length === 7 ? monthRaw + "-01" : monthRaw;

        try {
          const { error: rpcErr } = await supabase.rpc(
            "upsert_employee_salary_due",
            {
              p_emp_code: emp_code,
              p_due_month: due_month,
              p_salary_due: salary_due,
              p_remarks: remarks || null,
              p_user_email: user?.email || null,
            }
          );
          if (rpcErr) throw rpcErr;
          added++;
        } catch (err) {
          failedRows.push({ row: rowNum, error: err.message });
        }
      }

      setBulkResult({ added, failed: failedRows.length, failedRows });
      fetchData();
    } catch (err) {
      showToast("Failed to process Excel: " + err.message, "error");
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Month options ─────────────────────────────────────────────────────────────
  const monthOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 42; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      // Use val directly to avoid UTC timezone shift (IST is +5:30)
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      opts.push({ val, label });
    }
    return opts;
  }, []);

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-10">
      {/* ── PAGE HEADER ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          <div>
            <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-indigo-600" />
              Employee Salary Due
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              System-calculated vs manual override · Final due auto-resolves
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 bg-white text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
          >
            <Download className="w-4 h-4" /> Template
          </button>
          {canEdit && (
            <label
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all ${
                bulkLoading
                  ? "bg-gray-200 text-gray-500"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
              }`}
            >
              {bulkLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Bulk Upload
                </>
              )}
              <input
                ref={excelRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcel}
                disabled={bulkLoading}
                className="hidden"
              />
            </label>
          )}
          <button
            onClick={exportData}
            disabled={!filtered.length}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 disabled:opacity-40 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "System Total Due",
              value: inr(kpis.totalSystem),
              color: "blue",
            },
            {
              label: "Final Total Due",
              value: inr(kpis.totalFinal),
              color: "indigo",
            },
            {
              label: "Total Adjustment",
              value: (kpis.totalDiff >= 0 ? "+" : "") + inr(kpis.totalDiff),
              color:
                kpis.totalDiff < 0
                  ? "rose"
                  : kpis.totalDiff > 0
                  ? "emerald"
                  : "gray",
            },
            {
              label: "Manual Overrides",
              value: `${kpis.overrideCount} employees`,
              color: "amber",
            },
          ].map(({ label, value, color }) => {
            const colorMap = {
              blue: "bg-blue-50 border-blue-100 text-blue-800",
              indigo: "bg-indigo-50 border-indigo-100 text-indigo-800",
              rose: "bg-rose-50 border-rose-100 text-rose-700",
              emerald: "bg-emerald-50 border-emerald-100 text-emerald-800",
              amber: "bg-amber-50 border-amber-100 text-amber-800",
              gray: "bg-gray-50 border-gray-100 text-gray-700",
            };
            return (
              <div
                key={label}
                className={`border rounded-2xl px-5 py-4 ${colorMap[color]}`}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">
                  {label}
                </p>
                <p className="text-xl font-black font-mono">{value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FILTERS ── */}
      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
        {/* Month */}
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
        >
          {monthOptions.map((m) => (
            <option key={m.val} value={m.val}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or emp code…"
            className="pl-9 pr-3 py-2 w-48 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dept */}
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
        >
          {allDepts.map((d) => (
            <option key={d}>{d === "All" ? "All Depts" : d}</option>
          ))}
        </select>

        {/* Entity */}
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
        >
          {allEntities.map((e) => (
            <option key={e}>{e === "All" ? "All Entities" : e}</option>
          ))}
        </select>

        {/* Override toggle */}
        <button
          onClick={() => setShowOnlyOverrides((v) => !v)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all ${
            showOnlyOverrides
              ? "bg-amber-100 border-amber-300 text-amber-700"
              : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          {showOnlyOverrides ? "Showing overrides" : "Show overrides only"}
        </button>

        <span className="ml-auto text-xs text-gray-400 font-medium">
          {loading ? "Loading…" : `${filtered.length} employees`}
        </span>
      </div>

      {/* ── TABLE ── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Salary Due — {fmtMonth(toMonthDate(monthFilter))}
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{" "}
              Manual override
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />{" "}
              System due
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="text-sm">Loading salary data…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <Users className="w-10 h-10 opacity-20" />
            <p className="text-sm font-semibold">No records found</p>
            <p className="text-xs">Try changing month or clearing filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {[
                    "Emp Code",
                    "Name",
                    "Dept",
                    "CTC",
                    "Variable",
                    "System Due",
                    "Manual Override",
                    "Final Due",
                    "Remarks",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageData.map((row, i) => {
                  const hasOverride = !!row.salary_due_record_id;
                  const diff =
                    Number(row.final_salary_due) -
                    Number(row.system_calculated_due);
                  return (
                    <motion.tr
                      key={`${row.emp_code}-${row.due_month}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.015 }}
                      className={`hover:bg-indigo-50/30 transition-colors ${
                        hasOverride ? "bg-amber-50/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {row.emp_code}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                        {row.employee_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                          {row.department}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600 text-xs">
                        {inr(row.ctc)}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600 text-xs">
                        {inr(row.variable)}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700">
                        {inr(row.system_calculated_due)}
                      </td>
                      <td className="px-4 py-3">
                        {hasOverride ? (
                          <span className="font-mono font-bold text-amber-700">
                            {inr(row.manual_salary_due)}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold ${
                              hasOverride ? "text-amber-700" : "text-indigo-700"
                            }`}
                          >
                            {inr(row.final_salary_due)}
                          </span>
                          {diff !== 0 && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                diff < 0
                                  ? "bg-rose-100 text-rose-600"
                                  : "bg-emerald-100 text-emerald-600"
                              }`}
                            >
                              {diff > 0 ? "+" : ""}
                              {inr(Math.abs(diff)).replace("₹ ", "₹")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px] truncate">
                        {row.manual_remarks || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {canEdit && (
                          <button
                            onClick={() => setSelectedRow(row)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                              hasOverride
                                ? "bg-amber-100 hover:bg-amber-200 text-amber-700"
                                : "bg-indigo-100 hover:bg-indigo-200 text-indigo-700"
                            }`}
                          >
                            <Pencil className="w-3 h-3" />
                            {hasOverride ? "Edit" : "Override"}
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
              {/* Totals footer */}
              <tfoot>
                <tr className="bg-slate-800 text-white font-bold border-t-2 border-slate-600">
                  <td
                    className="px-4 py-3 text-[10px] uppercase tracking-widest text-white/70"
                    colSpan={5}
                  >
                    Total ({filtered.length} employees)
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {inr(kpis.totalSystem)}
                  </td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 font-mono text-sm text-emerald-300">
                    {inr(kpis.totalFinal)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > ITEMS_PER_PAGE && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-700">
                {(page - 1) * ITEMS_PER_PAGE + 1}
              </span>
              –
              <span className="font-semibold text-gray-700">
                {Math.min(page * ITEMS_PER_PAGE, filtered.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-gray-700">
                {filtered.length}
              </span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p;
                if (totalPages <= 7) p = i + 1;
                else if (page <= 4) p = i + 1;
                else if (page >= totalPages - 3) p = totalPages - 6 + i;
                else p = page - 3 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-xl text-xs font-semibold transition ${
                      page === p
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="font-semibold text-gray-700 mr-1">How it works:</span>
        <span>
          <span className="font-semibold text-gray-700">System Due</span> = CTC
          + Variable (from cost master)
        </span>
        <span className="text-amber-600">
          <span className="font-semibold">Manual Override</span> = Your entry
          (LOP, incentive, etc.)
        </span>
        <span className="text-indigo-600">
          <span className="font-semibold">Final Due</span> = Manual override if
          set, otherwise System Due
        </span>
        <span>
          Bulk upload format:{" "}
          <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
            emp_code | due_month (YYYY-MM) | salary_due | remarks
          </span>
        </span>
      </div>

      {/* ── POP CARD ── */}
      <AnimatePresence>
        {selectedRow && (
          <SalaryDueCard
            row={selectedRow}
            onClose={() => setSelectedRow(null)}
            onSaved={handleCardSaved}
            onDeleted={handleCardDeleted}
            userEmail={user?.email}
          />
        )}
      </AnimatePresence>

      {/* ── BULK RESULT MODAL ── */}
      <AnimatePresence>
        {bulkResult && (
          <BulkResultModal
            result={bulkResult}
            onClose={() => setBulkResult(null)}
          />
        )}
      </AnimatePresence>

      {/* ── TOAST ── */}
      <Toast toast={toast} />
    </div>
  );
}
