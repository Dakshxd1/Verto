import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import supabase from "../lib/supabaseClient";
import { usePerms } from "../context/PermissionsContext";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Loader2,
  Search,
  FileText,
  FileSpreadsheet,
  Users,
  IndianRupee,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  FileDown,
  RefreshCw,
  AlertTriangle,
  FolderOpen,
  X,
  CheckCircle2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { printSalarySlip, downloadBulkSlipsZip } from "../utils/salarySlip";
import { logExport, EXPORT_ACTIONS } from "../utils/auditLog";

const ExpenseRecordsView = ({ onClose }) => {
  const { canEdit, canDelete, canExport } = usePerms();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [bulkFolders, setBulkFolders] = useState([]);
  const [singleRecords, setSingleRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [viewTab, setViewTab] = useState("bulk"); // "bulk" | "single"
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [expandedRows, setExpandedRows] = useState([]);
  const [expandingId, setExpandingId] = useState(null);
  const [deletingBatchId, setDeletingBatchId] = useState(null);
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState(null);
  const [toast, setToast] = useState(null);
  const [slipLoading, setSlipLoading] = useState(null); // batchId or rowId being processed

  // =====================================================
  // TOAST
  // =====================================================
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // =====================================================
  // FETCH DATA
  // =====================================================
  const fetchRecords = async () => {
    setLoading(true);
    try {
      // ── Fetch bulk groups ──
      const { data: bulkData, error: bulkErr } = await supabase
        .from("employee_expense_payouts")
        .select(
          "bulk_batch_id, bulk_batch_code, bulk_file_name, bulk_upload_date, net_payment, payment_amount, income_tax_deducted"
        )
        .eq("entry_type", "bulk")
        .not("bulk_batch_id", "is", null)
        .order("bulk_upload_date", { ascending: false });

      if (!bulkErr && bulkData) {
        const grouped = {};
        bulkData.forEach((row) => {
          const key = row.bulk_batch_id;
          if (!grouped[key]) {
            grouped[key] = {
              batchId: key,
              batchCode: row.bulk_batch_code || `BATCH_${key}`,
              fileName: row.bulk_file_name || "Unknown File",
              uploadDate: row.bulk_upload_date,
              count: 0,
              totalAmount: 0,
              totalTax: 0,
              totalNet: 0,
            };
          }
          grouped[key].count++;
          grouped[key].totalAmount += Number(row.payment_amount || 0);
          grouped[key].totalTax += Number(row.income_tax_deducted || 0);
          grouped[key].totalNet += Number(row.net_payment || 0);
        });

        setBulkFolders(
          Object.values(grouped).sort(
            (a, b) =>
              new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0)
          )
        );
      }

      // ── Fetch single records ──
      const { data: singleData, error: singleErr } = await supabase
        .from("employee_expense_payouts")
        .select(
          `
          *,
          entity_master(entity_name),
          departments_master(dept_name)
        `
        )
        .eq("entry_type", "single")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!singleErr && singleData) {
        setSingleRecords(singleData);
      }

      setRecords([
        ...(singleData || []),
        ...(bulkData || []).map((r) => ({ ...r, _isBulk: true })),
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // =====================================================
  // EXPAND BATCH
  // =====================================================
  const loadBatch = async (batchId) => {
    setExpandingId(batchId);
    try {
      const { data } = await supabase
        .from("employee_expense_payouts")
        .select(
          `
          *,
          entity_master(entity_name),
          departments_master(dept_name)
        `
        )
        .eq("bulk_batch_id", batchId)
        .order("emp_code", { ascending: true });

      setExpandedRows(data || []);
      setExpandedBatch(batchId);
    } catch (err) {
      console.error("Load batch error:", err);
    } finally {
      setExpandingId(null);
    }
  };

  const collapseBatch = () => {
    setExpandedBatch(null);
    setExpandedRows([]);
  };

  // =====================================================
  // DELETE BATCH
  // =====================================================
  const deleteBatch = async (batchId) => {
    setDeletingBatchId(batchId);
    try {
      const { error: payoutErr } = await supabase
        .from("employee_expense_payouts")
        .delete()
        .eq("bulk_batch_id", batchId);

      if (payoutErr) throw payoutErr;

      await supabase
        .from("bulk_upload_batches")
        .delete()
        .eq("id", batchId);

      setConfirmDeleteBatch(null);
      if (expandedBatch === batchId) collapseBatch();
      showToast("Batch deleted successfully");
      fetchRecords();
      window.refreshDashboard?.();
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setDeletingBatchId(null);
    }
  };

  // =====================================================
  // DELETE SINGLE
  // =====================================================
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this record?"
    );
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.rpc("delete_employee_expense_complete", {
        p_payout_id: id,
      });
      if (error) throw error;
      setSingleRecords((prev) => prev.filter((item) => item.id !== id));
      showToast("Deleted Successfully");
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
    }
  };

  // =====================================================
  // EDIT
  // =====================================================
  const startEdit = (row) => {
    setEditingId(row.id);
    setEditData({
      payment_amount: row.payment_amount,
      income_tax_deducted: row.income_tax_deducted,
      remarks: row.remarks || "",
      payment_description: row.payment_description || "",
    });
  };

  // =====================================================
  // UPDATE
  // =====================================================
  const handleUpdate = async () => {
    try {
      const newAmount = parseFloat(editData.payment_amount);
      const newTax = parseFloat(editData.income_tax_deducted);
      const { error } = await supabase
        .from("employee_expense_payouts")
        .update({
          payment_amount: newAmount,
          income_tax_deducted: newTax,
          net_payment: newAmount - newTax,
          payment_description: editData.payment_description,
          remarks: editData.remarks,
        })
        .eq("id", editingId);

      if (error) throw error;
      showToast("Updated Successfully");
      setEditingId(null);
      fetchRecords();
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
    }
  };

  // =====================================================
  // EXPORT BATCH (Excel)
  // =====================================================
  const exportBatch = async (batchId) => {
    try {
      const { data } = await supabase
        .from("employee_expense_payouts")
        .select("*")
        .eq("bulk_batch_id", batchId)
        .order("emp_code", { ascending: true });

      if (!data?.length) {
        alert("No records to export");
        return;
      }

      const headers = [
        "Emp Code",
        "Employee Name",
        "Designation",
        "Pay Head",
        "Payment Amount",
        "Income Tax",
        "Net Payment",
        "Bank",
        "Date of Pay",
        "Remarks",
      ];

      const rows = data.map((r) => [
        r.emp_code || "",
        r.employee_name || "",
        r.designation || "",
        r.pay_head || "",
        r.payment_amount || 0,
        r.income_tax_deducted || 0,
        r.net_payment || 0,
        r.bank_name || "",
        r.date_of_pay || "",
        r.remarks || "",
      ]);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws["!cols"] = headers.map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(wb, ws, "Bulk Upload");
      XLSX.writeFile(
        wb,
        `bulk_export_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      logExport({
        action:      EXPORT_ACTIONS.EXCEL,
        category:    "Expense",
        description: `Downloaded Bulk Expense Excel (${data.length} employees)`,
        meta:        { batch_id: batchId, rows: data.length },
      });
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  };

  // =====================================================
  // DOWNLOAD BATCH SLIPS (ZIP)
  // =====================================================
  const downloadBatchSlips = async (folder) => {
    setSlipLoading(folder.batchId);
    try {
      // Always fetch full data with joins for slip generation
      const { data, error } = await supabase
        .from("employee_expense_payouts")
        .select(
          `
          *,
          entity_master(entity_name),
          departments_master(dept_name)
        `
        )
        .eq("bulk_batch_id", folder.batchId)
        .order("emp_code", { ascending: true });

      if (error) throw error;
      if (!data?.length) {
        showToast("No records found", "error");
        return;
      }

      await downloadBulkSlipsZip(data, folder.batchCode || folder.batchId);
      logExport({
        action:      EXPORT_ACTIONS.ZIP,
        category:    "Expense",
        description: `Downloaded Bulk Salary Slips ZIP — ${folder.batchCode} (${data.length} employees)`,
        meta:        { batch_code: folder.batchCode, count: data.length },
      });
      showToast(`${data.length} slips downloaded as ZIP`);
    } catch (err) {
      console.error(err);
      showToast("Slip download failed: " + err.message, "error");
    } finally {
      setSlipLoading(null);
    }
  };

  // =====================================================
  // SINGLE SLIP DOWNLOAD
  // =====================================================
  const handleSingleSlip = (row) => {
    setSlipLoading(row.id);
    try {
      printSalarySlip(row);
      logExport({
        action:       EXPORT_ACTIONS.SALARY_SLIP,
        category:     "Expense",
        description:  `Downloaded Salary Slip — ${row.employee_name || row.emp_code}`,
        reference_no: row.emp_code || null,
        meta:         { emp_code: row.emp_code, pay_head: row.pay_head },
      });
      showToast("Salary slip opened for printing/saving");
    } catch (err) {
      showToast("Slip generation failed", "error");
    } finally {
      setTimeout(() => setSlipLoading(null), 800);
    }
  };

  // =====================================================
  // FILTER
  // =====================================================
  const filteredBulkFolders = bulkFolders.filter(
    (f) =>
      f.batchCode?.toLowerCase().includes(search.toLowerCase()) ||
      f.fileName?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSingleRecords = singleRecords.filter((r) => {
    const text = `
      ${r.emp_code}
      ${r.employee_name}
      ${r.pay_head}
      ${r.payment_description}
    `.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  // =====================================================
  // STATS
  // =====================================================
  const totalBulkCount = bulkFolders.reduce((s, f) => s + f.count, 0);
  const totalSingleCount = singleRecords.length;
  const totalRecords = totalBulkCount + totalSingleCount;

  const totalBulkAmount = bulkFolders.reduce((s, f) => s + f.totalAmount, 0);
  const totalSingleAmount = filteredSingleRecords.reduce(
    (s, r) => s + (parseFloat(r.payment_amount) || 0),
    0
  );
  const totalAmount = totalBulkAmount + totalSingleAmount;

  const totalBulkTax = bulkFolders.reduce((s, f) => s + f.totalTax, 0);
  const totalSingleTax = filteredSingleRecords.reduce(
    (s, r) => s + (parseFloat(r.income_tax_deducted) || 0),
    0
  );
  const totalTax = totalBulkTax + totalSingleTax;

  const netPayout = totalAmount - totalTax;

  const formatINR = (val) => `₹ ${Number(val).toLocaleString("en-IN")}`;

  const fmtDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const fmtDateTime = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="fixed inset-0 z-[999999] bg-[#f7f8fb] overflow-auto font-sans">
      {/* ── HEADER ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#eef3fa] hover:bg-[#dde9f7] flex items-center justify-center text-[#1e3a5f] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-[#0f172a] text-[17px] font-semibold tracking-tight">
              Employee Expense Records
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {bulkFolders.length} bulk batch{bulkFolders.length !== 1 ? "es" : ""} · {totalSingleCount} manual
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* TAB SWITCHER */}
          <div className="flex bg-[#f0f2f5] rounded-lg p-0.5">
            {[
              { key: "bulk", label: "Bulk Uploads" },
              { key: "single", label: "Manual" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setViewTab(tab.key);
                  collapseBatch();
                }}
                className={`px-4 py-1.5 rounded-md text-[11.5px] font-semibold transition-all ${
                  viewTab === tab.key
                    ? "bg-white text-[#1e3a5f] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchRecords}
            className="w-9 h-9 rounded-xl bg-[#eef3fa] hover:bg-[#dde9f7] flex items-center justify-center text-[#1e3a5f] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* SEARCH */}
          <div className="relative w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search batch, employee, pay head…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 bg-[#f7f8fb] border border-slate-200 rounded-xl pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="px-6 pt-5 grid grid-cols-4 gap-3">
        {[
          { label: "Total Records", value: totalRecords, mono: false },
          { label: "Total Amount", value: formatINR(totalAmount), mono: true },
          { label: "Tax Deducted", value: formatINR(totalTax), mono: true },
          { label: "Net Payout", value: formatINR(netPayout), mono: true },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-slate-200 rounded-xl px-5 py-3.5"
          >
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
              {s.label}
            </p>
            <p
              className={`text-[20px] font-semibold text-[#0f172a] mt-1 ${
                s.mono ? "font-mono" : ""
              }`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div className="px-6 pt-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-[#1e3a5f] animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">

            {/* ─────────────────────────────────────────────────────────
                BULK UPLOAD FOLDERS
            ───────────────────────────────────────────────────────── */}
            {viewTab === "bulk" && (
              <>
                {filteredBulkFolders.length > 0 ? (
                  filteredBulkFolders.map((folder) => (
                    <div
                      key={folder.batchId}
                      className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                        expandedBatch === folder.batchId
                          ? "border-emerald-300 shadow-lg shadow-emerald-100/50"
                          : "border-slate-200 hover:border-emerald-200"
                      }`}
                    >
                      {/* Folder Card Header */}
                      <div
                        className={`px-5 py-4 cursor-pointer transition-colors ${
                          expandedBatch === folder.batchId
                            ? "bg-emerald-50/30"
                            : "hover:bg-slate-50"
                        }`}
                        onClick={() =>
                          expandedBatch === folder.batchId
                            ? collapseBatch()
                            : loadBatch(folder.batchId)
                        }
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            {/* Folder Icon */}
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                expandedBatch === folder.batchId
                                  ? "bg-emerald-100 text-emerald-600"
                                  : "bg-[#eef3fa] text-[#1e3a5f]"
                              }`}
                            >
                              {expandedBatch === folder.batchId ? (
                                <FolderOpen className="w-5 h-5" />
                              ) : (
                                <FileSpreadsheet className="w-5 h-5" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h4 className="font-semibold text-[#0f172a] text-sm">
                                  {folder.batchCode}
                                </h4>
                                <span className="text-[10px] bg-[#eef3fa] text-[#1e3a5f] px-2 py-0.5 rounded-full font-semibold">
                                  Bulk Upload
                                </span>
                              </div>

                              <p className="text-xs text-slate-500 mt-1 truncate">
                                📄 {folder.fileName}
                              </p>

                              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2">
                                <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                  <Users className="w-3 h-3 text-slate-400" />
                                  <span className="font-semibold">{folder.count}</span>{" "}
                                  employees
                                </span>
                                <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                  <IndianRupee className="w-3 h-3 text-slate-400" />
                                  <span className="font-semibold text-emerald-700">
                                    ₹{Number(folder.totalNet).toLocaleString("en-IN")}
                                  </span>
                                  <span className="text-slate-400">net</span>
                                </span>
                                {folder.totalTax > 0 && (
                                  <span className="flex items-center gap-1.5 text-[11px] text-amber-600">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span className="font-semibold">
                                      ₹{Number(folder.totalTax).toLocaleString("en-IN")}
                                    </span>{" "}
                                    tax
                                  </span>
                                )}
                                <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {fmtDateTime(folder.uploadDate)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0 ml-4">

                            {/* ── BULK SLIP DOWNLOAD (ZIP) ── */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadBatchSlips(folder);
                              }}
                              disabled={slipLoading === folder.batchId}
                              className={`h-8 px-3 rounded-lg border flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${
                                slipLoading === folder.batchId
                                  ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                                  : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                              }`}
                              title="Download all salary slips as ZIP"
                            >
                              {slipLoading === folder.batchId ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <FileDown className="w-3 h-3" />
                              )}
                              {slipLoading === folder.batchId
                                ? "Packing…"
                                : "Slips ZIP"}
                            </button>

                            {/* ── EXCEL EXPORT ── */}
                            {canExport && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportBatch(folder.batchId);
                                }}
                                className="w-8 h-8 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                                title="Export to Excel"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* ── DELETE BATCH ── */}
                            {canDelete && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteBatch(
                                    confirmDeleteBatch === folder.batchId
                                      ? null
                                      : folder.batchId
                                  );
                                }}
                                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                                  deletingBatchId === folder.batchId
                                    ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                                    : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                }`}
                                title="Delete batch"
                                disabled={deletingBatchId === folder.batchId}
                              >
                                {deletingBatchId === folder.batchId ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {/* Expand chevron */}
                            <div className="text-slate-400">
                              {expandingId === folder.batchId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : expandedBatch === folder.batchId ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Confirm Delete */}
                        {confirmDeleteBatch === folder.batchId && (
                          <div
                            className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-xs font-semibold text-red-700">
                              Delete all {folder.count} records in this batch?
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => deleteBatch(folder.batchId)}
                                className="px-3 py-1.5 bg-red-600 text-white text-[11px] font-semibold rounded-lg hover:bg-red-700"
                              >
                                Yes, Delete
                              </button>
                              <button
                                onClick={() => setConfirmDeleteBatch(null)}
                                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[11px] font-semibold rounded-lg hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Expanded Rows */}
                      {expandedBatch === folder.batchId && (
                        <div className="border-t border-emerald-100 overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-emerald-50/50 border-b border-emerald-100">
                                {[
                                  "Emp Code",
                                  "Employee",
                                  "Dept",
                                  "Pay Head",
                                  "Amount",
                                  "Tax",
                                  "Net",
                                  "Description",
                                  "Bank",
                                  "Date",
                                  "Remarks",
                                  "Slip",
                                ].map((h) => (
                                  <th
                                    key={h}
                                    className={`px-3 py-2.5 text-[10px] font-medium text-emerald-800 uppercase tracking-wide whitespace-nowrap ${
                                      h === "Slip" ? "text-center" : "text-left"
                                    }`}
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {expandedRows.map((row) => (
                                <tr
                                  key={row.id}
                                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                >
                                  <td className="px-3 py-2.5">
                                    <span className="font-mono text-[11px] font-medium bg-[#eef3fa] text-[#1e3a5f] px-2.5 py-1 rounded-md">
                                      {row.emp_code}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 font-medium text-[#0f172a] text-xs whitespace-nowrap">
                                    {row.employee_name}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md whitespace-nowrap">
                                      {row.departments_master?.dept_name || "—"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-500 text-[11px] whitespace-nowrap">
                                    {row.pay_head}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono text-[11px] font-medium text-[#0f172a]">
                                    ₹{Number(row.payment_amount).toLocaleString("en-IN")}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono text-[11px] text-amber-700">
                                    ₹{Number(row.income_tax_deducted).toLocaleString("en-IN")}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-emerald-700">
                                    ₹{Number(row.net_payment).toLocaleString("en-IN")}
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-500 text-[11px] max-w-[150px] truncate">
                                    {row.payment_description || "—"}
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-500 text-[10px] whitespace-nowrap">
                                    {row.bank_name || "—"}
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-500 text-[11px] whitespace-nowrap">
                                    {fmtDate(row.date_of_pay)}
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-400 text-[10px] max-w-[120px] truncate italic">
                                    {row.remarks || "—"}
                                  </td>
                                  {/* ── Per-row slip button ── */}
                                  <td className="px-3 py-2.5 text-center">
                                    <button
                                      onClick={() => handleSingleSlip(row)}
                                      disabled={slipLoading === row.id}
                                      className={`h-7 px-2.5 rounded-lg border flex items-center gap-1 text-[10px] font-semibold mx-auto transition-colors ${
                                        slipLoading === row.id
                                          ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                                          : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                                      }`}
                                      title="Download salary slip"
                                    >
                                      {slipLoading === row.id ? (
                                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                      ) : (
                                        <FileDown className="w-2.5 h-2.5" />
                                      )}
                                      Slip
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="px-5 py-2.5 bg-emerald-50/30 border-t border-emerald-100 flex items-center justify-between">
                            <p className="text-[11px] text-emerald-700 font-medium">
                              {expandedRows.length} employee{expandedRows.length !== 1 ? "s" : ""} in this batch
                            </p>
                            <button
                              onClick={collapseBatch}
                              className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800"
                            >
                              Collapse ↑
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 opacity-50" />
                    </div>
                    <p className="text-sm">
                      {search ? "No matching batches found" : "No bulk uploads yet"}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ─────────────────────────────────────────────────────────
                SINGLE / MANUAL RECORDS
            ───────────────────────────────────────────────────────── */}
            {viewTab === "single" && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#f7f8fb] border-b border-slate-200">
                        {[
                          "Emp Code",
                          "Employee",
                          "Department",
                          "Pay Head",
                          "Amount",
                          "Tax",
                          "Description",
                          "Remarks",
                          "Slip",
                          "Actions",
                        ].map((h) => (
                          <th
                            key={h}
                            className={`px-4 py-3 text-[11.5px] font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap ${
                              h === "Actions" || h === "Slip"
                                ? "text-center"
                                : "text-left"
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {filteredSingleRecords.map((row, idx) => (
                        <tr
                          key={row.id}
                          className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                            idx === filteredSingleRecords.length - 1
                              ? "border-b-0"
                              : ""
                          }`}
                        >
                          {/* Emp Code */}
                          <td className="px-4 py-3">
                            <span className="font-mono text-[12px] font-medium bg-[#eef3fa] text-[#1e3a5f] px-2.5 py-1 rounded-md">
                              {row.emp_code}
                            </span>
                          </td>

                          {/* Employee Name */}
                          <td className="px-4 py-3 font-medium text-[#0f172a] whitespace-nowrap">
                            {row.employee_name}
                          </td>

                          {/* Department */}
                          <td className="px-4 py-3">
                            <span className="text-[11.5px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md whitespace-nowrap">
                              {row.departments_master?.dept_name}
                            </span>
                          </td>

                          {/* Pay Head */}
                          <td className="px-4 py-3 text-slate-500 text-[12.5px] whitespace-nowrap">
                            {row.pay_head}
                          </td>

                          {/* Amount — editable */}
                          <td className="px-4 py-3">
                            {editingId === row.id ? (
                              <input
                                value={editData.payment_amount}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    payment_amount: e.target.value,
                                  })
                                }
                                className="w-[110px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all"
                              />
                            ) : (
                              <span className="font-mono font-medium text-[#0f172a]">
                                ₹ {Number(row.payment_amount).toLocaleString("en-IN")}
                              </span>
                            )}
                          </td>

                          {/* Tax — editable */}
                          <td className="px-4 py-3">
                            {editingId === row.id ? (
                              <input
                                value={editData.income_tax_deducted}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    income_tax_deducted: e.target.value,
                                  })
                                }
                                className="w-[100px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all"
                              />
                            ) : (
                              <span className="font-mono text-amber-700 text-[12.5px]">
                                ₹ {Number(row.income_tax_deducted).toLocaleString("en-IN")}
                              </span>
                            )}
                          </td>

                          {/* Description — editable */}
                          <td className="px-4 py-3">
                            {editingId === row.id ? (
                              <input
                                value={editData.payment_description}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    payment_description: e.target.value,
                                  })
                                }
                                className="w-[200px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all"
                              />
                            ) : (
                              <span className="text-slate-500 text-[12.5px] max-w-[180px] truncate block">
                                {row.payment_description}
                              </span>
                            )}
                          </td>

                          {/* Remarks — editable */}
                          <td className="px-4 py-3">
                            {editingId === row.id ? (
                              <input
                                value={editData.remarks}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    remarks: e.target.value,
                                  })
                                }
                                className="w-[160px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all"
                              />
                            ) : (
                              <span className="text-slate-400 text-xs italic">
                                {row.remarks || "—"}
                              </span>
                            )}
                          </td>

                          {/* ── SINGLE SLIP BUTTON ── */}
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleSingleSlip(row)}
                              disabled={slipLoading === row.id}
                              className={`h-7 px-2.5 rounded-lg border flex items-center gap-1 text-[10px] font-semibold mx-auto transition-colors ${
                                slipLoading === row.id
                                  ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                                  : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                              }`}
                              title="Download salary slip"
                            >
                              {slipLoading === row.id ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <FileDown className="w-2.5 h-2.5" />
                              )}
                              Slip
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              {editingId === row.id ? (
                                <button
                                  onClick={handleUpdate}
                                  className="h-[30px] px-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                                >
                                  Save
                                </button>
                              ) : (
                                canEdit && (
                                  <button
                                    onClick={() => startEdit(row)}
                                    className="w-8 h-8 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 flex items-center justify-center hover:bg-amber-100 transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}

                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(row.id)}
                                  className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Empty state */}
                {!filteredSingleRecords.length && (
                  <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                      <FileText className="w-5 h-5 opacity-50" />
                    </div>
                    <p className="text-sm">
                      {search ? "No matching records found" : "No manual entries yet"}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-slate-100 px-5 py-2.5 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Showing{" "}
                    <span className="bg-[#eef3fa] text-[#1e3a5f] font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                      {filteredSingleRecords.length}
                    </span>{" "}
                    records
                  </div>
                  <div className="text-[11px] text-slate-300">Manual entries</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999999]">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-semibold ${
              toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {toast.msg}
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-white/70 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseRecordsView;