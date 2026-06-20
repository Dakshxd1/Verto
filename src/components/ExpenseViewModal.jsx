import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { usePerms } from "../context/PermissionsContext";
import * as XLSX from "xlsx";
import { logExport, EXPORT_ACTIONS } from "../utils/Auditlog.js";
import {
  X,
  Loader2,
  Database,
  Search,
  Download,
  RefreshCw,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  TrendingDown,
  Users,
  Layers,
  Pencil,
  Save,
  Trash2,
  Upload,
  FileSpreadsheet,
  Package,
  ChevronDown,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import supabase from "../lib/supabaseClient";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmt = (v) =>
  `₹ ${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const BoolPill = ({ value, yesLabel = "YES", noLabel = "NO" }) =>
  value ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
      <CheckCircle size={10} /> {yesLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
      <XCircle size={10} /> {noLabel}
    </span>
  );

/* ─── Excel Export ─────────────────────────────────────────────────────────── */
const exportToExcel = (rows) => {
  const wb = XLSX.utils.book_new();
  const totalDue = rows.reduce((s, r) => s + Number(r.due_amount || 0), 0);
  const totalTds = rows.reduce((s, r) => s + Number(r.tds_amount || 0), 0);
  const totalTransfer = rows.reduce(
    (s, r) => s + Number(r.transfer_amount || 0),
    0
  );

  const headers = [
    "#",
    "Client",
    "Entity",
    "Department",
    "Pay Head",
    "Due Amount (₹)",
    "TDS (₹)",
    "Transfer (₹)",
    "Payment Date",
    "Bank",
    "Billable",
    "Cash",
    "Created At",
  ];
  const detail = rows.map((r, i) => [
    i + 1,
    r.client_name || "—",
    r.entity || "—",
    r.department || "—",
    r.pay_head || "—",
    Number(r.due_amount || 0),
    Number(r.tds_amount || 0),
    Number(r.transfer_amount || 0),
    fmtDate(r.payment_date),
    r.bank_name || "—",
    r.is_billable ? "Yes" : "No",
    r.petty_cash ? "Yes" : "No",
    fmtDate(r.created_at),
  ]);
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    ...detail,
    [
      "",
      "TOTAL",
      "",
      "",
      "",
      totalDue,
      totalTds,
      totalTransfer,
      "",
      "",
      "",
      "",
      "",
    ],
  ]);
  ws["!cols"] = [4, 20, 14, 16, 18, 14, 12, 14, 14, 20, 10, 10, 14].map(
    (w) => ({ wch: w })
  );
  XLSX.utils.book_append_sheet(wb, ws, "Expenses");
  XLSX.writeFile(wb, `Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`);
  logExport({
    action:      EXPORT_ACTIONS.EXCEL,
    category:    "Expense",
    description: `Downloaded Expenses Excel (${rows.length} records)`,
    meta:        { rows: rows.length },
  });
};

/* ─── Download Template ────────────────────────────────────────────────────── */
const downloadTemplate = () => {
  const wb = XLSX.utils.book_new();
  const headers = [
    "expense_nature", "client_name", "entity", "paid_to_type",
    "vendor_name", "emp_code", "department", "pay_head",
    "month_of_expense", "payment_description", "due_amount",
    "tds_amount", "payment_date", "payment_mode", "bank_name",
    "cost_ops", "cost_temp", "cost_recruitment", "cost_projects",
    "cost_others", "is_billable", "invoice_number",
    "asset_description", "asset_warranty", "asset_stock_status", "remarks",
  ];
  const sample = [
    [
      "Internal", "", "Verto", "Vendor", "ABC Supplies", "",
      "Admin", "Stationery", "2026-06", "Office supplies",
      "5000", "0", "2026-06-15", "bank", "HDFC Current",
      "100", "0", "0", "0", "0", "FALSE", "",
      "", "", "", "Monthly stationery",
    ],
    [
      "Client", "Acme Corp", "Verto", "Vendor", "XYZ Services", "",
      "Projects", "Consultant Fee", "2026-06", "Project consulting",
      "25000", "2500", "2026-06-10", "bank", "ICICI Current",
      "0", "0", "0", "100", "0", "TRUE", "INV-2026-001",
      "", "", "", "Client project expense",
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  ws["!cols"] = headers.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, `Expense_Bulk_Upload_Template.xlsx`);
};

/* ─── Confirm Delete Dialog ────────────────────────────────────────────────── */
const ConfirmDeleteDialog = ({ row, onConfirm, onCancel, isBulk }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999999] flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9 }}
      onClick={(e) => e.stopPropagation()}
      className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
    >
      <div className="flex items-center justify-center w-12 h-12 bg-rose-100 rounded-full mx-auto mb-4">
        <Trash2 className="w-6 h-6 text-rose-600" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 text-center">
        {isBulk ? "Delete Bulk Upload?" : "Delete Expense?"}
      </h3>
      <p className="text-sm text-gray-500 text-center mt-2">
        {isBulk
          ? `This will delete all ${row?.record_count || 0} records in this bulk upload. This action cannot be undone.`
          : "This will delete the payment record, bank entry, software entry and reverse any billable invoice impact."}
        <br />
        <span className="font-semibold text-gray-700 text-xs">
          {isBulk
            ? `${row?.bulk_upload_file_name} · ${row?.record_count} records`
            : `${row?.pay_head} · ${row?.department} · ${fmt(row?.due_amount)}`}
        </span>
      </p>
      <div className="flex gap-3 mt-6">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Yes, Delete
        </button>
      </div>
    </motion.div>
  </motion.div>
);

/* ─── Bulk Upload Modal ───────────────────────────────────────────────────── */
const BulkUploadModal = ({ open, onClose, onUploaded }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [toast, setToast] = useState(null);
  // Employee validation state
  const [empCodeErrors, setEmpCodeErrors] = useState([]);
  const [showEmpErrorModal, setShowEmpErrorModal] = useState(false);
  // Client validation state
  const [clientNameErrors, setClientNameErrors] = useState([]);
  const [showClientErrorModal, setShowClientErrorModal] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setErrors([]);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (json.length < 2) {
          setErrors(["File is empty or has no data rows."]);
          setPreview([]);
          return;
        }
        const headers = json[0].map((h) => String(h).toLowerCase().trim());
        const rows = json.slice(1).filter((r) => r.some((c) => c !== "" && c !== undefined && c !== null));
        const parsed = rows.map((row, idx) => {
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = row[i] !== undefined ? row[i] : "";
          });
          return { ...obj, _rowIndex: idx + 2 };
        });
        setPreview(parsed);
      } catch (err) {
        showToast("Failed to parse file: " + err.message, "error");
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleUpload = async () => {
    setUploading(true);
    setErrors([]);
    setEmpCodeErrors([]);
    setClientNameErrors([]);
    setShowEmpErrorModal(false);
    setShowClientErrorModal(false);

    try {
      // ── Step A: Validate employee codes ──
      const empCodesFromRows = preview
        .map((row) => row.emp_code?.trim())
        .filter(Boolean);

      if (empCodesFromRows.length > 0) {
        const { data: validEmployees } = await supabase
          .from("internal_team")
          .select("emp_code")
          .in("emp_code", empCodesFromRows);

        const validCodes = new Set((validEmployees || []).map((e) => e.emp_code?.toLowerCase()));
        const invalidEmpRows = [];

        preview.forEach((row, idx) => {
          if (row.emp_code?.trim()) {
            const code = row.emp_code.trim().toLowerCase();
            if (!validCodes.has(code)) {
              invalidEmpRows.push({
                rowIndex: idx + 2,
                empCode: row.emp_code.trim(),
                entity: row.entity,
                department: row.department,
                payHead: row.pay_head,
                dueAmount: row.due_amount,
              });
            }
          }
        });

        if (invalidEmpRows.length > 0) {
          setEmpCodeErrors(invalidEmpRows);
          setShowEmpErrorModal(true);
          setUploading(false);
          return;
        }
      }

      // ── Step B: Validate client names ──
      const clientNamesFromRows = preview
        .filter((row) => String(row.expense_nature || "").toLowerCase() === "client")
        .map((row) => row.client_name?.trim())
        .filter(Boolean);

      if (clientNamesFromRows.length > 0) {
        const { data: validClients } = await supabase
          .from("clients_master")
          .select("client_name");

        const validClientNames = new Set((validClients || []).map((c) => c.client_name?.toLowerCase()));
        const invalidClientRows = [];

        preview.forEach((row, idx) => {
          if (String(row.expense_nature || "").toLowerCase() === "client" && row.client_name?.trim()) {
            const name = row.client_name.trim().toLowerCase();
            if (!validClientNames.has(name)) {
              invalidClientRows.push({
                rowIndex: idx + 2,
                clientName: row.client_name.trim(),
                entity: row.entity,
                department: row.department,
                payHead: row.pay_head,
                dueAmount: row.due_amount,
              });
            }
          }
        });

        if (invalidClientRows.length > 0) {
          setClientNameErrors(invalidClientRows);
          setShowClientErrorModal(true);
          setUploading(false);
          return;
        }
      }

      // ── Step C: Proceed with upload ──
      const { data: { user } } = await supabase.auth.getUser();

      const rows = preview.map((row) => ({
        expense_nature:      row.expense_nature || "Internal",
        client_name:         row.client_name || null,
        entity:              row.entity,
        paid_to_type:        row.paid_to_type || "Vendor",
        vendor_name:         row.vendor_name || null,
        emp_code:            row.emp_code || null,
        employee_name:       row.employee_name || null,
        department:          row.department,
        pay_head:            row.pay_head,
        month_of_expense:    row.month_of_expense ? row.month_of_expense + "-01" : null,
        payment_description: row.payment_description || null,
        due_amount:          parseFloat(row.due_amount) || 0,
        tds_amount:          parseFloat(row.tds_amount) || 0,
        payment_date:        row.payment_date,
        payment_mode:        row.payment_mode || "bank",
        bank_name:           row.payment_mode?.toLowerCase() === "cash" ? null : (row.bank_name || null),
        cost_ops:            parseFloat(row.cost_ops) || 0,
        cost_temp:           parseFloat(row.cost_temp) || 0,
        cost_recruitment:    parseFloat(row.cost_recruitment) || 0,
        cost_projects:       parseFloat(row.cost_projects) || 0,
        cost_others:         parseFloat(row.cost_others) || 0,
        is_billable:         String(row.is_billable).toLowerCase() === "true" || row.is_billable === true,
        invoice_number:      row.invoice_number || null,
        asset_description:   row.asset_description || null,
        asset_warranty:      row.asset_warranty || null,
        asset_stock_status:  row.asset_stock_status || null,
        remarks:             row.remarks || null,
      }));

      const { data, error } = await supabase.rpc("bulk_insert_payments_made", {
        rows:         rows,
        p_file_name:  file.name,
        p_uploaded_by: user?.email || null,
      });

      if (error) throw error;

      const result = data || {};
      const inserted = result.inserted || 0;
      const skipped  = result.skipped  || 0;
      const rowErrors = result.errors  || [];

      if (rowErrors.length > 0) {
        setErrors(rowErrors.map((e) => ({
          row: e.row_index,
          errors: [e.reason],
        })));
      }

      if (inserted > 0) {
        showToast(
          skipped > 0
            ? `${inserted} inserted ✅ · ${skipped} skipped (see errors below)`
            : `Successfully uploaded ${inserted} records! Triggers fired — bank entries, projections & audit log created ✅`
        );
        onUploaded?.();
        if (skipped === 0) {
          setTimeout(() => {
            onClose();
            setFile(null);
            setPreview([]);
            setErrors([]);
          }, 1800);
        }
      } else {
        showToast(`All ${skipped} rows failed validation — nothing uploaded`, "error");
      }
    } catch (err) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999998] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Upload className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">Bulk Upload Expenses</h3>
                <p className="text-xs text-gray-500">Upload multiple expenses via Excel</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto p-6 space-y-4">
            {!file && (
              <div className="border-2 border-dashed border-orange-200 rounded-xl p-8 text-center bg-orange-50/50 hover:bg-orange-50 transition cursor-pointer"
                onClick={() => document.getElementById("bulk-file-input").click()}>
                <FileSpreadsheet className="w-12 h-12 text-orange-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">Click to upload Excel file</p>
                <p className="text-xs text-gray-400 mt-1">.xlsx or .xls format</p>
                <input id="bulk-file-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
              </div>
            )}

            {file && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <FileSpreadsheet className="w-8 h-8 text-emerald-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-500">{preview.length} rows detected</p>
                </div>
                <button onClick={() => { setFile(null); setPreview([]); setErrors([]); }}
                  className="text-xs text-rose-500 hover:text-rose-700 font-medium">Remove</button>
              </div>
            )}

            {errors.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 max-h-40 overflow-auto">
                <p className="text-sm font-bold text-rose-700 mb-2">Validation Errors:</p>
                {errors.map((err, i) => (
                  <div key={i} className="text-xs text-rose-600 mb-1">
                    Row {err.row}: {err.errors.join(", ")}
                  </div>
                ))}
              </div>
            )}

            {preview.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Preview ({preview.length} records)</p>
                <div className="border border-gray-200 rounded-lg overflow-auto max-h-64">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {["Entity", "Dept", "Pay Head", "Due", "TDS", "Date", "Mode"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-bold text-gray-600 border-b">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 20).map((row, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2">{row.entity}</td>
                          <td className="px-3 py-2">{row.department}</td>
                          <td className="px-3 py-2">{row.pay_head}</td>
                          <td className="px-3 py-2 text-right font-semibold">{fmt(row.due_amount)}</td>
                          <td className="px-3 py-2 text-right">{fmt(row.tds_amount)}</td>
                          <td className="px-3 py-2">{row.payment_date}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.payment_mode?.toLowerCase() === "cash" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                            }`}>{row.payment_mode || "bank"}</span>
                          </td>
                        </tr>
                      ))}
                      {preview.length > 20 && (
                        <tr><td colSpan={7} className="px-3 py-2 text-center text-gray-400 italic">... and {preview.length - 20} more rows</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
            <button onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition">
              <Download className="w-4 h-4" /> Download Template
            </button>
            <div className="flex gap-3">
              <button onClick={onClose}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleUpload} disabled={uploading || preview.length === 0}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Uploading..." : `Upload ${preview.length} Records`}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Employee Code Error Popup */}
      <AnimatePresence>
        {showEmpErrorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999999] flex items-center justify-center p-4"
            onClick={() => setShowEmpErrorModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-rose-100 bg-rose-50 rounded-t-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Invalid Employee Codes</h3>
                  <p className="text-xs text-rose-600">{empCodeErrors.length} row(s) have emp codes not found in the system</p>
                </div>
                <button
                  onClick={() => setShowEmpErrorModal(false)}
                  className="ml-auto p-2 hover:bg-rose-100 rounded-lg transition"
                >
                  <X className="w-4 h-4 text-rose-500" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-auto p-4">
                <p className="text-xs text-gray-500 mb-3">
                  These rows will be skipped. Please fix the emp codes in your Excel and re-upload.
                </p>
                <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-gray-600 border-b">Excel Row</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-600 border-b">Emp Code</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-600 border-b">Entity</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-600 border-b">Dept</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-600 border-b">Pay Head</th>
                      <th className="px-3 py-2 text-right font-bold text-gray-600 border-b">Due Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empCodeErrors.map((err, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-2 text-rose-600 font-bold">{err.rowIndex}</td>
                        <td className="px-3 py-2 font-mono font-bold text-rose-700">{err.empCode}</td>
                        <td className="px-3 py-2 text-gray-600">{err.entity || "—"}</td>
                        <td className="px-3 py-2 text-gray-600">{err.department || "—"}</td>
                        <td className="px-3 py-2 text-gray-600">{err.payHead || "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold">{fmt(err.dueAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                <button
                  onClick={() => setShowEmpErrorModal(false)}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition"
                >
                  Close & Fix
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client Name Error Popup */}
      <AnimatePresence>
        {showClientErrorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999999] flex items-center justify-center p-4"
            onClick={() => setShowClientErrorModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-amber-100 bg-amber-50 rounded-t-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Invalid Client Names</h3>
                  <p className="text-xs text-amber-700">{clientNameErrors.length} row(s) have client names not found in the system</p>
                </div>
                <button
                  onClick={() => setShowClientErrorModal(false)}
                  className="ml-auto p-2 hover:bg-amber-100 rounded-lg transition"
                >
                  <X className="w-4 h-4 text-amber-500" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-auto p-4">
                <p className="text-xs text-gray-500 mb-3">
                  These rows have <strong>expense_nature = "Client"</strong> but the client name doesn't exist in <code>clients_master</code>. Please fix and re-upload.
                </p>
                <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-gray-600 border-b">Excel Row</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-600 border-b">Client Name</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-600 border-b">Entity</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-600 border-b">Dept</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-600 border-b">Pay Head</th>
                      <th className="px-3 py-2 text-right font-bold text-gray-600 border-b">Due Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientNameErrors.map((err, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-2 text-amber-600 font-bold">{err.rowIndex}</td>
                        <td className="px-3 py-2 font-bold text-amber-700">{err.clientName}</td>
                        <td className="px-3 py-2 text-gray-600">{err.entity || "—"}</td>
                        <td className="px-3 py-2 text-gray-600">{err.department || "—"}</td>
                        <td className="px-3 py-2 text-gray-600">{err.payHead || "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold">{fmt(err.dueAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                <button
                  onClick={() => setShowClientErrorModal(false)}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition"
                >
                  Close & Fix
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className={`fixed bottom-6 right-6 z-[9999999] flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}>
          {toast.type === "error" ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
          {toast.msg}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

/* ─── Bulk Group Detail Modal ─────────────────────────────────────────────── */
const BulkGroupDetailModal = ({ open, onClose, bulkGroup, onRefresh }) => {
  const { canEdit, canDelete } = usePerms();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [banks, setBanks] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!open || !bulkGroup) return;
    fetchEntries();
    supabase.from("bank_master").select("id, bank_name").then(({ data }) => setBanks(data || []));
  }, [open, bulkGroup]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_made_view")
        .select("*")
        .eq("bulk_batch_id", bulkGroup.bulk_upload_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      showToast("Load failed: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editRow) return;
    setSavingEdit(true);
    try {
      const dueAmt = parseFloat(editForm.due_amount) || 0;
      const tdsAmt = parseFloat(editForm.tds_amount) || 0;
      const transAmt = Math.max(dueAmt - tdsAmt, 0);

      const { error } = await supabase
        .from("payments_made")
        .update({
          due_amount: dueAmt, tds_amount: tdsAmt, amount: dueAmt,
          transfer_amount: transAmt, payment_date: editForm.payment_date,
          bank_id: editForm.bank_id || null,
          payment_description: editForm.payment_description || null,
          remarks: editForm.remarks || null,
          department: editForm.department || null,
        })
        .eq("id", editRow.id);
      if (error) throw error;

      await fetchEntries();
      onRefresh?.();
      showToast("Entry updated ✅");
      setEditRow(null);
      setEditForm({});
    } catch (err) {
      showToast("Update failed: " + err.message, "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmRow) return;
    const id = confirmRow.id;
    setConfirmRow(null);
    setDeletingId(id);
    try {
      const { error } = await supabase.rpc("delete_payment_made_complete", { p_payment_id: id });
      if (error) throw error;
      await fetchEntries();
      onRefresh?.();
      showToast("Entry deleted ✅");
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const DEPT_OPTIONS = [
    "Common", "OS", "Temp", "Rec", "BD", "Accts", "HR", "Admin", "IT", "Legal", "Projects", "Others",
  ];

  if (!open || !bulkGroup) return null;

  const totalDue = entries.reduce((s, r) => s + Number(r.due_amount || 0), 0);
  const totalTds = entries.reduce((s, r) => s + Number(r.tds_amount || 0), 0);
  const totalTransfer = entries.reduce((s, r) => s + Number(r.transfer_amount || 0), 0);

  return ReactDOM.createPortal(
    <AnimatePresence>
      {confirmRow && (
        <ConfirmDeleteDialog row={confirmRow} onConfirm={handleDelete} onCancel={() => setConfirmRow(null)} />
      )}
      {toast && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className={`fixed bottom-6 right-6 z-[9999999] flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}>
          {toast.type === "error" ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
          {toast.msg}
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999999] flex items-center justify-center p-4"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-[98vw] h-[95vh] overflow-hidden flex flex-col">
          
          {/* Header - Indigo theme for bulk detail */}
          <div className="relative px-6 py-5 flex-shrink-0" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #3b5998 50%, #6366f1 100%)" }}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                    <Package size={18} className="text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Bulk Upload: {bulkGroup.bulk_upload_file_name}</h2>
                </div>
                <p className="text-indigo-200 text-xs ml-11">{entries.length} records · uploaded {fmtDate(bulkGroup.bulk_upload_date)}</p>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <X size={16} className="text-white/80" />
              </button>
            </div>
            {/* Stats */}
            <div className="relative mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Records", value: entries.length, icon: Layers },
                { label: "Due", value: fmt(totalDue), icon: TrendingDown },
                { label: "TDS", value: fmt(totalTds), icon: Users },
                { label: "Transfer", value: fmt(totalTransfer), icon: Building2 },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-white/10 border border-white/15 rounded-2xl px-3 py-2.5 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={12} className="text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-[9px] text-indigo-400 uppercase tracking-widest font-bold">{label}</p>
                    <p className="text-white text-xs font-bold leading-none mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Table - Same structure as main but with indigo accents */}
          <div className="flex-1 overflow-auto bg-slate-50">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
                <p className="text-sm text-slate-400">Fetching entries…</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <AlertCircle size={24} className="text-indigo-300" />
                <p className="text-sm text-slate-500 font-medium">No entries found</p>
              </div>
            ) : (
              <table className="min-w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {["#", "Client", "Entity", "Dept", "Pay Head", "Due", "TDS", "Transfer", "Date", "Bank", "Billable", "Cash", "Edit", "Delete"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border-b border-indigo-900/20"
                        style={{ background: "#1e3a5f", color: "#c7d2fe" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((row, index) => (
                    <React.Fragment key={row.id || index}>
                      <tr className={`border-b border-indigo-100 transition-colors ${
                        deletingId === row.id ? "opacity-30 pointer-events-none" : ""
                      } ${editRow?.id === row.id ? "bg-indigo-50/80" : index % 2 === 0 ? "bg-white hover:bg-indigo-50" : "bg-indigo-50/40 hover:bg-indigo-50"}`}>
                        
                        <td className="px-4 py-3 text-center text-xs text-slate-400 font-medium">{index + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><span className="font-semibold text-slate-800 text-xs">{row.client_name || "—"}</span></td>
                        <td className="px-4 py-3 whitespace-nowrap"><span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 text-[10px] font-bold">{row.entity || "—"}</span></td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">{row.department || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">{row.pay_head || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right"><span className="font-bold text-indigo-700 text-sm">{fmt(row.due_amount)}</span></td>
                        <td className="px-4 py-3 whitespace-nowrap text-right"><span className="text-xs font-semibold text-red-600">{fmt(row.tds_amount)}</span></td>
                        <td className="px-4 py-3 whitespace-nowrap text-right"><span className="text-xs font-semibold text-slate-700">{fmt(row.transfer_amount)}</span></td>
                        <td className="px-4 py-3 whitespace-nowrap"><div className="flex items-center gap-1.5"><Calendar size={11} className="text-slate-300" /><span className="text-xs text-slate-600">{fmtDate(row.payment_date)}</span></div></td>
                        <td className="px-4 py-3 whitespace-nowrap"><div className="flex items-center gap-1.5"><Building2 size={11} className="text-slate-300" /><span className="text-xs text-slate-600">{row.bank_name || "—"}</span></div></td>
                        <td className="px-4 py-3 whitespace-nowrap"><BoolPill value={row.is_billable} /></td>
                        <td className="px-4 py-3 whitespace-nowrap"><BoolPill value={row.petty_cash} yesLabel="CASH" noLabel="NO" /></td>
                        
                        {/* Edit */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {editRow?.id === row.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={handleSaveEdit} disabled={savingEdit}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-colors disabled:opacity-60">
                                {savingEdit ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Save
                              </button>
                              <button onClick={() => { setEditRow(null); setEditForm({}); }}
                                className="px-2 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-[11px] hover:bg-gray-50 transition-colors">✕</button>
                            </div>
                          ) : canEdit ? (
                            <button onClick={() => {
                              setEditRow(row);
                              setEditForm({
                                due_amount: row.due_amount, tds_amount: row.tds_amount || 0,
                                payment_date: row.payment_date, bank_id: row.bank_id,
                                department: row.department,
                                payment_description: row.payment_description || "",
                                remarks: row.remarks || "",
                              });
                            }} className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-semibold border border-indigo-200 transition-colors">
                              <Pencil size={10} /> Edit
                            </button>
                          ) : null}
                        </td>
                        
                        {/* Delete */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {deletingId === row.id ? <Loader2 size={14} className="animate-spin text-rose-400" /> : canDelete ? (
                            <button onClick={() => setConfirmRow(row)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-semibold border border-rose-200 transition-colors">
                              <Trash2 size={10} /> Delete
                            </button>
                          ) : null}
                        </td>
                      </tr>

                      {/* Inline Edit Form */}
                      {editRow?.id === row.id && (
                        <tr className="bg-indigo-50/90 border-b-2 border-indigo-300">
                          <td colSpan={2} />
                          <td className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">Due Amount</label>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-gray-400 text-xs">₹</span>
                              <input type="number" value={editForm.due_amount}
                                onChange={(e) => {
                                  const d = parseFloat(e.target.value) || 0;
                                  const t = parseFloat(editForm.tds_amount) || 0;
                                  setEditForm((f) => ({ ...f, due_amount: d, transfer_amount: Math.max(d - t, 0) }));
                                }}
                                className="w-full border-2 border-indigo-200 bg-white rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-indigo-800 outline-none focus:border-indigo-400" />
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">TDS</label>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-gray-400 text-xs">₹</span>
                              <input type="number" value={editForm.tds_amount}
                                onChange={(e) => {
                                  const t = parseFloat(e.target.value) || 0;
                                  const d = parseFloat(editForm.due_amount) || 0;
                                  setEditForm((f) => ({ ...f, tds_amount: t, transfer_amount: Math.max(d - t, 0) }));
                                }}
                                className="w-full border-2 border-indigo-200 bg-white rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-red-700 outline-none focus:border-indigo-400" />
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">Transfer (auto)</label>
                            <div className="border-2 border-gray-100 bg-gray-50 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600">
                              ₹ {Number(Math.max((parseFloat(editForm.due_amount) || 0) - (parseFloat(editForm.tds_amount) || 0), 0)).toLocaleString("en-IN")}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">Date</label>
                            <input type="date" value={editForm.payment_date}
                              onChange={(e) => setEditForm((f) => ({ ...f, payment_date: e.target.value }))}
                              className="w-full border-2 border-indigo-200 bg-white rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-indigo-400" />
                          </td>
                          <td className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">Bank</label>
                            <select value={editForm.bank_id || ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, bank_id: e.target.value }))}
                              className="w-full border-2 border-indigo-200 bg-white rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-indigo-400">
                              <option value="">Select bank</option>
                              {banks.map((b) => (<option key={b.id} value={b.id}>{b.bank_name}</option>))}
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">Department</label>
                            <select value={editForm.department || ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                              className="w-full border-2 border-indigo-200 bg-white rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-indigo-400">
                              <option value="">Select dept</option>
                              {DEPT_OPTIONS.map((d) => (<option key={d} value={d}>{d}</option>))}
                            </select>
                          </td>
                          <td colSpan={2} className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">Description / Remarks</label>
                            <input type="text" value={editForm.payment_description || editForm.remarks || ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, payment_description: e.target.value, remarks: e.target.value }))}
                              placeholder="Optional description..."
                              className="w-full border-2 border-indigo-200 bg-white rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-indigo-400" />
                          </td>
                          <td colSpan={4} />
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0">
                  <tr style={{ background: "#1e3a5f" }}>
                    <td colSpan={5} className="px-4 py-3">
                      <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest">Total ({entries.length})</span>
                    </td>
                    <td className="px-4 py-3 text-right"><span className="font-bold text-white text-base">{fmt(totalDue)}</span></td>
                    <td className="px-4 py-3 text-right"><span className="font-bold text-indigo-300 text-sm">{fmt(totalTds)}</span></td>
                    <td className="px-4 py-3 text-right"><span className="font-bold text-indigo-200 text-sm">{fmt(totalTransfer)}</span></td>
                    <td colSpan={6} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-slate-100 bg-white flex items-center gap-3">
            <button onClick={fetchEntries}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={onClose}
              className="ml-auto px-6 py-2.5 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Close</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

/* ─── Main Component ───────────────────────────────────────────────────────── */
const ExpenseViewModal = ({ open, onClose, onSaved }) => {
  const { canEdit, canDelete } = usePerms();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [filterBill, setFilterBill] = useState("All");
  const [filterCash, setFilterCash] = useState("All");
  const [exporting, setExporting] = useState(false);

  // Bulk upload state
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkGroups, setBulkGroups] = useState([]);
  const [bulkDetailOpen, setBulkDetailOpen] = useState(false);
  const [selectedBulkGroup, setSelectedBulkGroup] = useState(null);
  const [viewMode, setViewMode] = useState("all"); // "all" | "bulk"

  // ── Edit state ──────────────────────────────────────────────────────────────
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // ── Delete state ────────────────────────────────────────────────────────────
  const [confirmRow, setConfirmRow] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // ── Toast state ─────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);

  // ── Banks for edit dropdown ─────────────────────────────────────────────────
  const [banks, setBanks] = useState([]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setFilterBill("All");
    setFilterCash("All");
    setEditRow(null);
    setEditForm({});
    setConfirmRow(null);
    setViewMode("all");
    fetchExpenses();
    fetchBulkGroups();
    supabase
      .from("bank_master")
      .select("id, bank_name")
      .then(({ data }) => setBanks(data || []));
  }, [open]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      // Only non-bulk records in "All" view — new column is bulk_batch_id
      const { data, error } = await supabase
        .from("payment_made_view")
        .select("*")
        .is("bulk_batch_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      showToast("Load failed: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchBulkGroups = async () => {
    try {
      const { data, error } = await supabase.rpc("get_expense_bulk_batches");
      if (error) throw error;
      // Map RPC columns to the shape the UI expects
      setBulkGroups(
        (data || []).map((b) => ({
          bulk_upload_id: b.batch_id,
          bulk_upload_file_name: b.file_name,
          bulk_upload_date: b.upload_date,
          record_count: Number(b.record_count),
          total_due: Number(b.total_due),
          total_tds: Number(b.total_tds),
          total_transfer: Number(b.total_transfer),
          batch_code: b.batch_code,
          uploaded_by: b.uploaded_by,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch bulk groups:", err);
    }
  };

  const handleDeleteBulk = async (group) => {
    if (!group) return;
    setConfirmRow(null);
    try {
      setLoading(true);
      const { error } = await supabase.rpc("delete_payment_bulk_batch", {
        p_batch_id: group.bulk_upload_id,
      });
      if (error) throw error;
      await fetchBulkGroups();
      await fetchExpenses();
      window.refreshDashboard?.();
      showToast("Bulk upload deleted & all entries reversed ✅");
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const openBulkDetail = (group) => {
    setSelectedBulkGroup(group);
    setBulkDetailOpen(true);
  };

  if (!open) return null;

  /* ── Filtered rows ── */
  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      [r.client_name, r.entity, r.department, r.pay_head, r.bank_name].some(
        (v) => v?.toLowerCase().includes(q)
      );
    const matchBill =
      filterBill === "All" ||
      (filterBill === "Billable" && r.is_billable) ||
      (filterBill === "Non-Billable" && !r.is_billable);
    const matchCash =
      filterCash === "All" ||
      (filterCash === "Cash" && r.petty_cash) ||
      (filterCash === "Non-Cash" && !r.petty_cash);
    return matchSearch && matchBill && matchCash;
  });

  const totalDue = filtered.reduce((s, r) => s + Number(r.due_amount || 0), 0);
  const totalTransfer = filtered.reduce(
    (s, r) => s + Number(r.transfer_amount || 0),
    0
  );
  const totalTds = filtered.reduce((s, r) => s + Number(r.tds_amount || 0), 0);

  /* ── Delete handler ── */
  const handleDelete = async () => {
    if (!confirmRow) return;
    
    // Handle bulk group deletion
    if (confirmRow.bulk_upload_id && !confirmRow.id) {
      await handleDeleteBulk(confirmRow);
      return;
    }
    
    const id = confirmRow.id;
    setConfirmRow(null);
    setDeletingId(id);
    try {
      const { error } = await supabase.rpc("delete_payment_made_complete", {
        p_payment_id: id,
      });
      if (error) throw error;
      window.refreshDashboard?.();
      onSaved?.();
      await fetchExpenses();
      showToast("Expense deleted & ERP synced ✅");
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Edit save handler ── */
  const handleSaveEdit = async () => {
    if (!editRow) return;
    setSavingEdit(true);
    try {
      const dueAmt = parseFloat(editForm.due_amount) || 0;
      const tdsAmt = parseFloat(editForm.tds_amount) || 0;
      const transAmt = Math.max(dueAmt - tdsAmt, 0);

      const { error } = await supabase
        .from("payments_made")
        .update({
          due_amount: dueAmt,
          tds_amount: tdsAmt,
          amount: dueAmt,
          transfer_amount: transAmt,
          payment_date: editForm.payment_date,
          bank_id: editForm.bank_id || null,
          payment_description: editForm.payment_description || null,
          remarks: editForm.remarks || null,
          department: editForm.department || null,
        })
        .eq("id", editRow.id);
      if (error) throw error;

      window.refreshDashboard?.();
      onSaved?.();
      await fetchExpenses();
      showToast("Expense updated & bank synced ✅");
      setEditRow(null);
      setEditForm({});
    } catch (err) {
      showToast("Update failed: " + err.message, "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const DEPT_OPTIONS = [
    "Common",
    "OS",
    "Temp",
    "Rec",
    "BD",
    "Accts",
    "HR",
    "Admin",
    "IT",
    "Legal",
    "Projects",
    "Others",
  ];

  return ReactDOM.createPortal(
    <AnimatePresence>
      {/* Confirm delete dialog — renders above modal */}
      {confirmRow && (
        <ConfirmDeleteDialog
          row={confirmRow}
          onConfirm={handleDelete}
          onCancel={() => setConfirmRow(null)}
          isBulk={!!confirmRow.bulk_upload_id && !confirmRow.id}
        />
      )}

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`fixed bottom-6 right-6 z-[9999999] flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle size={14} />
          ) : (
            <CheckCircle size={14} />
          )}
          {toast.msg}
        </motion.div>
      )}

      <motion.div
        className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-[98vw] h-[95vh] overflow-hidden flex flex-col"
        >
          {/* ── HEADER ── */}
          <div
            className="relative px-6 py-5 flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, #431407 0%, #9a3412 50%, #ea580c 100%)",
            }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                    <Database size={18} className="text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Expense Database View
                  </h2>
                </div>
                <p className="text-orange-300 text-xs ml-11">
                  {viewMode === "all" ? filtered.length : bulkGroups.length} records · edit & delete inline
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-white/10 rounded-xl p-0.5 mr-2">
                  <button
                    onClick={() => setViewMode("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      viewMode === "all"
                        ? "bg-white text-orange-700"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    All Records
                  </button>
                  <button
                    onClick={() => setViewMode("bulk")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                      viewMode === "bulk"
                        ? "bg-white text-orange-700"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    <Package size={12} />
                    Bulk Uploads ({bulkGroups.length})
                  </button>
                </div>

                <button
                  onClick={() => {
                    setExporting(true);
                    try {
                      exportToExcel(viewMode === "all" ? filtered : []);
                    } finally {
                      setExporting(false);
                    }
                  }}
                  disabled={exporting || (viewMode === "all" && filtered.length === 0)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all disabled:opacity-40"
                >
                  {exporting ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}{" "}
                  Export
                </button>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X size={16} className="text-white/80" />
                </button>
              </div>
            </div>
            {/* Stats - only show for "all" mode */}
            {viewMode === "all" && (
              <div className="relative mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Records", value: filtered.length, icon: Layers },
                  { label: "Due", value: fmt(totalDue), icon: TrendingDown },
                  { label: "TDS", value: fmt(totalTds), icon: Users },
                  {
                    label: "Transfer",
                    value: fmt(totalTransfer),
                    icon: Building2,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="bg-white/10 border border-white/15 rounded-2xl px-3 py-2.5 flex items-center gap-2"
                  >
                    <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={12} className="text-orange-300" />
                    </div>
                    <div>
                      <p className="text-[9px] text-orange-400 uppercase tracking-widest font-bold">
                        {label}
                      </p>
                      <p className="text-white text-xs font-bold leading-none mt-0.5">
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── FILTERS ── */}
          <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-slate-100 space-y-3 bg-white">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder={viewMode === "all" ? "Search client, entity, department, pay head, bank…" : "Search bulk upload file name…"}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
                />
              </div>
              {/* Bulk Upload Button */}
              <button
                onClick={() => setBulkUploadOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition shadow-lg whitespace-nowrap"
              >
                <Upload size={14} /> Bulk Upload
              </button>
              {/* Template Button */}
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-orange-200 text-orange-700 text-sm font-semibold hover:bg-orange-50 transition whitespace-nowrap"
              >
                <FileSpreadsheet size={14} /> Template
              </button>
            </div>
            
            {/* Only show filters in "All" mode */}
            {viewMode === "all" && (
              <div className="flex items-center gap-2 flex-wrap">
                <Filter size={12} className="text-slate-400" />
                {["All", "Billable", "Non-Billable"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterBill(t)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                      filterBill === t
                        ? "bg-orange-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
                <div className="w-px h-4 bg-slate-200 mx-1" />
                {["All", "Cash", "Non-Cash"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterCash(t)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                      filterCash === t
                        ? "bg-red-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── TABLE / CONTENT ── */}
          <div className="flex-1 overflow-auto bg-slate-50">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-orange-200 border-t-orange-600 animate-spin" />
                <p className="text-sm text-slate-400">Fetching expenses…</p>
              </div>
            ) : viewMode === "bulk" ? (
              /* ─── BULK GROUPS VIEW ─── */
              <div className="p-4 space-y-3">
                {bulkGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
                    <Package size={32} className="text-slate-300" />
                    <p className="text-sm text-slate-500 font-medium">No bulk uploads found</p>
                  </div>
                ) : (
                  bulkGroups
                    .filter((g) => !search || g.bulk_upload_file_name?.toLowerCase().includes(search.toLowerCase()))
                    .map((group, index) => (
                      <div key={group.bulk_upload_id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50"
                          onClick={() => openBulkDetail(group)}>
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <FolderOpen size={18} className="text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">
                              {group.bulk_upload_file_name || "Untitled Upload"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {group.record_count} records · uploaded {fmtDate(group.bulk_upload_date)}
                              {group.uploaded_by && ` · by ${group.uploaded_by}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Live totals from RPC */}
                            <div className="hidden sm:flex flex-col items-end">
                              <span className="text-xs font-bold text-indigo-700">{fmt(group.total_due)}</span>
                              <span className="text-[10px] text-gray-400">Due · TDS {fmt(group.total_tds)}</span>
                            </div>
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                              {group.record_count} entries
                            </span>
                            <ChevronRight size={16} className="text-gray-400" />
                          </div>
                        </div>
                        {/* Inline actions */}
                        <div className="px-4 pb-3 flex items-center gap-2 border-t border-slate-100 pt-2">
                          <button
                            onClick={() => openBulkDetail(group)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition"
                          >
                            <Users size={12} /> View Details
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => setConfirmRow({ ...group, id: null })}
                              className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold transition"
                            >
                              <Trash2 size={12} /> Delete All ({group.record_count})
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            ) : filtered.length === 0 ? (
              /* ─── ALL RECORDS VIEW - Empty ─── */
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <AlertCircle size={24} className="text-orange-300" />
                <p className="text-sm text-slate-500 font-medium">
                  No expense records found
                </p>
              </div>
            ) : (
              /* ─── ALL RECORDS VIEW - Table ─── */
              <table className="min-w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {[
                      "#",
                      "Client",
                      "Entity",
                      "Dept",
                      "Pay Head",
                      "Due",
                      "TDS",
                      "Transfer",
                      "Date",
                      "Bank",
                      "Billable",
                      "Cash",
                      "Edit",
                      "Delete",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border-b border-orange-900/20"
                        style={{ background: "#431407", color: "#fed7aa" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, index) => (
                    <React.Fragment key={row.id || index}>
                      {/* ── Data row ── */}
                      <tr
                        className={`border-b border-orange-100 transition-colors ${
                          deletingId === row.id
                            ? "opacity-30 pointer-events-none"
                            : ""
                        } ${
                          editRow?.id === row.id
                            ? "bg-orange-50/80"
                            : index % 2 === 0
                            ? "bg-white hover:bg-orange-50"
                            : "bg-orange-50/40 hover:bg-orange-50"
                        }`}
                      >
                        <td className="px-4 py-3 text-center text-xs text-slate-400 font-medium">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 text-xs">
                            {row.client_name || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-orange-100 text-orange-800 text-[10px] font-bold">
                            {row.entity || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                          {row.department || "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                          {row.pay_head || "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="font-bold text-orange-700 text-sm">
                            {fmt(row.due_amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="text-xs font-semibold text-red-600">
                            {fmt(row.tds_amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="text-xs font-semibold text-slate-700">
                            {fmt(row.transfer_amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={11} className="text-slate-300" />
                            <span className="text-xs text-slate-600">
                              {fmtDate(row.payment_date)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={11} className="text-slate-300" />
                            <span className="text-xs text-slate-600">
                              {row.bank_name || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <BoolPill value={row.is_billable} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <BoolPill
                            value={row.petty_cash}
                            yesLabel="CASH"
                            noLabel="NO"
                          />
                        </td>

                        {/* Edit button */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {editRow?.id === row.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={handleSaveEdit}
                                disabled={savingEdit}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[11px] font-bold transition-colors disabled:opacity-60"
                              >
                                {savingEdit ? (
                                  <Loader2 size={10} className="animate-spin" />
                                ) : (
                                  <Save size={10} />
                                )}{" "}
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditRow(null);
                                  setEditForm({});
                                }}
                                className="px-2 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-[11px] hover:bg-gray-50 transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          ) : canEdit ? (
                            <button
                              onClick={() => {
                                setEditRow(row);
                                setEditForm({
                                  due_amount: row.due_amount,
                                  tds_amount: row.tds_amount || 0,
                                  payment_date: row.payment_date,
                                  bank_id: row.bank_id,
                                  department: row.department,
                                  payment_description:
                                    row.payment_description || "",
                                  remarks: row.remarks || "",
                                });
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-[11px] font-semibold border border-orange-200 transition-colors"
                            >
                              <Pencil size={10} /> Edit
                            </button>
                          ) : null}
                        </td>

                        {/* Delete button */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {deletingId === row.id ? (
                            <Loader2
                              size={14}
                              className="animate-spin text-rose-400"
                            />
                          ) : canDelete ? (
                            <button
                              onClick={() => setConfirmRow(row)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-semibold border border-rose-200 transition-colors"
                            >
                              <Trash2 size={10} /> Delete
                            </button>
                          ) : null}
                        </td>
                      </tr>

                      {/* ── Inline edit form row ── */}
                      {editRow?.id === row.id && (
                        <tr className="bg-orange-50/90 border-b-2 border-orange-300">
                          <td colSpan={2} />
                          {/* Due Amount */}
                          <td className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                              Due Amount
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-gray-400 text-xs">
                                ₹
                              </span>
                              <input
                                type="number"
                                value={editForm.due_amount}
                                onChange={(e) => {
                                  const d = parseFloat(e.target.value) || 0;
                                  const t =
                                    parseFloat(editForm.tds_amount) || 0;
                                  setEditForm((f) => ({
                                    ...f,
                                    due_amount: d,
                                    transfer_amount: Math.max(d - t, 0),
                                  }));
                                }}
                                className="w-full border-2 border-orange-200 bg-white rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-orange-800 outline-none focus:border-orange-400"
                              />
                            </div>
                          </td>
                          {/* TDS */}
                          <td className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                              TDS
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-gray-400 text-xs">
                                ₹
                              </span>
                              <input
                                type="number"
                                value={editForm.tds_amount}
                                onChange={(e) => {
                                  const t = parseFloat(e.target.value) || 0;
                                  const d =
                                    parseFloat(editForm.due_amount) || 0;
                                  setEditForm((f) => ({
                                    ...f,
                                    tds_amount: t,
                                    transfer_amount: Math.max(d - t, 0),
                                  }));
                                }}
                                className="w-full border-2 border-orange-200 bg-white rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-red-700 outline-none focus:border-orange-400"
                              />
                            </div>
                          </td>
                          {/* Transfer (auto) */}
                          <td className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                              Transfer (auto)
                            </label>
                            <div className="border-2 border-gray-100 bg-gray-50 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600">
                              ₹{" "}
                              {Number(
                                Math.max(
                                  (parseFloat(editForm.due_amount) || 0) -
                                    (parseFloat(editForm.tds_amount) || 0),
                                  0
                                )
                              ).toLocaleString("en-IN")}
                            </div>
                          </td>
                          {/* Date */}
                          <td className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                              Date
                            </label>
                            <input
                              type="date"
                              value={editForm.payment_date}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  payment_date: e.target.value,
                                }))
                              }
                              className="w-full border-2 border-orange-200 bg-white rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-orange-400"
                            />
                          </td>
                          {/* Bank */}
                          <td className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                              Bank
                            </label>
                            <select
                              value={editForm.bank_id || ""}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  bank_id: e.target.value,
                                }))
                              }
                              className="w-full border-2 border-orange-200 bg-white rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-orange-400"
                            >
                              <option value="">Select bank</option>
                              {banks.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.bank_name}
                                </option>
                              ))}
                            </select>
                          </td>
                          {/* Department */}
                          <td className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                              Department
                            </label>
                            <select
                              value={editForm.department || ""}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  department: e.target.value,
                                }))
                              }
                              className="w-full border-2 border-orange-200 bg-white rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-orange-400"
                            >
                              <option value="">Select dept</option>
                              {DEPT_OPTIONS.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </td>
                          {/* Description */}
                          <td colSpan={2} className="px-3 py-3">
                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                              Description / Remarks
                            </label>
                            <input
                              type="text"
                              value={
                                editForm.payment_description ||
                                editForm.remarks ||
                                ""
                              }
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  payment_description: e.target.value,
                                  remarks: e.target.value,
                                }))
                              }
                              placeholder="Optional description..."
                              className="w-full border-2 border-orange-200 bg-white rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-orange-400"
                            />
                          </td>
                          <td colSpan={4} />
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0">
                  <tr style={{ background: "#431407" }}>
                    <td colSpan={5} className="px-4 py-3">
                      <span className="text-[11px] font-bold text-orange-300 uppercase tracking-widest">
                        Total ({filtered.length})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-white text-base">
                        {fmt(totalDue)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-orange-300 text-sm">
                        {fmt(totalTds)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-orange-200 text-sm">
                        {fmt(totalTransfer)}
                      </span>
                    </td>
                    <td colSpan={6} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-slate-100 bg-white flex items-center gap-3">
            <button
              onClick={() => {
                fetchExpenses();
                fetchBulkGroups();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <button
              onClick={() => {
                setExporting(true);
                try {
                  exportToExcel(filtered);
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting || filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold transition-all disabled:opacity-50 shadow-lg"
              style={{
                background: "linear-gradient(135deg, #9a3412, #ea580c)",
              }}
            >
              {exporting ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}{" "}
              Download Excel
            </button>
            <button
              onClick={onClose}
              className="ml-auto px-6 py-2.5 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onUploaded={() => {
          fetchExpenses();
          fetchBulkGroups();
          onSaved?.();
          window.refreshDashboard?.();
        }}
      />

      {/* Bulk Group Detail Modal */}
      <BulkGroupDetailModal
        open={bulkDetailOpen}
        onClose={() => setBulkDetailOpen(false)}
        bulkGroup={selectedBulkGroup}
        onRefresh={() => {
          fetchExpenses();
          fetchBulkGroups();
          onSaved?.();
        }}
      />
    </AnimatePresence>,
    document.body
  );
};

export default ExpenseViewModal;
export { BulkUploadModal };