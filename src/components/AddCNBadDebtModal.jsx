import React, { useState, useEffect } from "react";
import supabase from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowRight,
  AlertCircle,
  FileX,
  Eye,
  Trash2,
  Loader2,
  ChevronLeft,
  CheckCircle2,
  RefreshCcw,
} from "lucide-react";

// ─── Inline Records Panel ──────────────────────────────────────────────────────
const CNRecordsPanel = ({ onClose }) => {
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId]   = useState(null);
  const [toast, setToast]           = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("credit_note_bad_debt")
      .select(`
        id,
        reference_no,
        invoice_number,
        type,
        amount,
        issue_date,
        entity,
        remarks,
        invoice_id,
        invoices ( invoice_number )
      `)
      .order("issue_date", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleDelete = async (id) => {
    setConfirmId(null);
    setDeletingId(id);
    try {
      const { error } = await supabase.rpc("delete_cn_bad_debt_complete", {
        p_cn_id: id,
      });
      if (error) throw error;
      window.refreshDashboard?.();
      showToast("Deleted & balances recalculated");
      await fetchRecords();
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const totalAmount = records.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "tween", duration: 0.25 }}
      className="absolute inset-0 bg-white z-10 flex flex-col rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-5 py-4 text-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-violet-100 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-semibold">Back</span>
          </button>
          <div className="w-px h-4 bg-white/30" />
          <div>
            <h3 className="text-sm font-bold">CN / Bad Debt Records</h3>
            <p className="text-violet-200 text-xs">
              {records.length} total · ₹ {totalAmount.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-violet-100 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading...
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <RefreshCcw className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No CN / Bad Debt records yet</p>
          </div>
        ) : (
          records.map((row) => (
            <div
              key={row.id}
              className={`bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm transition-opacity ${
                deletingId === row.id ? "opacity-40 pointer-events-none" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-semibold">
                      {row.reference_no || row.id?.slice(0, 8) || "—"}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        row.type === "Bad Debt"
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-violet-50 text-violet-600 border-violet-200"
                      }`}
                    >
                      {row.type}
                    </span>
                    <span className="font-bold text-violet-600 text-sm">
                      ₹ {Number(row.amount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {row.invoice_number || row.invoices?.invoice_number || "—"}
                    {row.entity && (
                      <span className="text-gray-400"> · {row.entity}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {row.issue_date && (
                      <span className="text-[10px] text-gray-400">
                        {new Date(row.issue_date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    {row.remarks && (
                      <span className="text-[10px] text-gray-400 italic truncate max-w-[140px]">
                        {row.remarks}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <div className="flex-shrink-0">
                  {deletingId === row.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                  ) : confirmId === row.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-2 py-1 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(row.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold border border-red-100 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`absolute bottom-4 left-4 right-4 flex items-center gap-2 px-4 py-3 rounded-xl text-white text-xs font-semibold shadow-lg ${
              toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Main Modal ────────────────────────────────────────────────────────────────
const AddCNBadDebtModal = ({
  isOpen,
  onClose,
  invoices = [],
  paymentReferences = [],
  editData,
}) => {
  const [formData, setFormData] = useState({
    invoiceOrRef:  "",
    optionType:    "CN",
    dateIssued:    "",
    cnAmount:      "",
    employeeCount: "",
    remarks:       "",
  });

  const [errors, setErrors]                     = useState({});
  const [showErrors, setShowErrors]             = useState(false);
  const [selectedDetails, setSelectedDetails]   = useState(null);
  const [loading, setLoading]                   = useState(false);
  const [viewOpen, setViewOpen]                 = useState(false);

  // ── Populate from editData ───────────────────────────────────────────────────
  useEffect(() => {
    if (editData && isOpen) {
      setFormData({
        invoiceOrRef:  editData.invoice_number || "",
        optionType:    editData.type || "CN",
        dateIssued:    editData.issue_date || "",
        cnAmount:      editData.amount || "",
        employeeCount: editData.employee_count || "",
        remarks:       editData.remarks || "",
      });
    }
  }, [editData, isOpen]);

  const handleChange = (field, value) => {
    setFormData((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  };

  // ── Auto-populate invoice / payment ref details ──────────────────────────────
  useEffect(() => {
    const fetchDetails = async () => {
      if (!formData.invoiceOrRef) { setSelectedDetails(null); return; }

      let invoiceId = null;

      // Try payment_ref first
      const { data: pay } = await supabase
        .from("payments_received")
        .select("invoice_id")
        .eq("payment_ref", formData.invoiceOrRef)
        .maybeSingle();
      if (pay?.invoice_id) invoiceId = pay.invoice_id;

      // Fallback: try invoice_number
      if (!invoiceId) {
        const { data: inv } = await supabase
          .from("invoices")
          .select("id")
          .eq("invoice_number", formData.invoiceOrRef)
          .maybeSingle();
        invoiceId = inv?.id;
      }

      if (!invoiceId) { setSelectedDetails(null); return; }

      const { data } = await supabase
        .from("outstanding_invoice_view")
        .select("*")
        .eq("id", invoiceId)
        .maybeSingle();

      if (!data) { setSelectedDetails(null); return; }

      setSelectedDetails({
        invoice_id:     data.id,
        invoiceNumber:  data.invoice_number,
        client:         data.client_name,
        ledger:         data.ledger_name,
        department:     data.dept_name,
        dept_code:      data.dept_code,
        entity:         data.entity_name,
        originalAmount: data.receivable_amount || 0,
        amountPayable:  data.outstanding || 0,
        amountReceived: data.amount_received || 0,
        cnAmount:       data.cn_amount || 0,
        employeeCount:  data.employee_count || null,
      });
    };
    fetchDetails();
  }, [formData.invoiceOrRef]);

  // ── Validation ───────────────────────────────────────────────────────────────
  const validateForm = () => {
    const e = {};
    if (!formData.invoiceOrRef.trim())
      e.invoiceOrRef = "Invoice number or payment reference is required";
    if (!formData.dateIssued)
      e.dateIssued = "Date is required";
    if (!formData.cnAmount)
      e.cnAmount = "Amount is required";
    if (formData.cnAmount && parseFloat(formData.cnAmount) <= 0)
      e.cnAmount = "Amount must be greater than 0";
    if (selectedDetails?.dept_code === "OS" && !formData.employeeCount)
      e.employeeCount = "Employee count required for Operations";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (loading) return;
    setLoading(true);
    setShowErrors(true);

    if (!validateForm()) { setLoading(false); return; }

    try {
      const amount = Number(formData.cnAmount);

      // 1. Insert credit_note_bad_debt — capture id for linking
      const { data: insertedCN, error: cnError } = await supabase
        .from("credit_note_bad_debt")
        .insert([
          {
            invoice_id:     selectedDetails.invoice_id,
            invoice_number: selectedDetails.invoiceNumber,
            type:           formData.optionType,
            issue_date:     formData.dateIssued,
            amount,
            entity:         selectedDetails.entity,
            employee_count:
              selectedDetails.dept_code === "OS"
                ? Number(formData.employeeCount)
                : null,
            remarks: formData.remarks || "",
          },
        ])
        .select()
        .single();

      if (cnError) throw cnError;

      // 2. Software entry — linked via cn_bad_debt_id (NON-CASH, no bank entry)
      const { error: seError } = await supabase
        .from("software_entries")
        .insert([
          {
            date:           formData.dateIssued,
            amount:         -amount,
            entity:         selectedDetails.entity,
            remarks:        formData.optionType + " Adjustment",
            invoice_id:     selectedDetails.invoice_id,
            cn_bad_debt_id: insertedCN.id,
          },
        ]);
      if (seError) throw seError;

      // 3. Recalculate invoice cn_amount
      const { data: inv } = await supabase
        .from("invoices")
        .select("cn_amount")
        .eq("id", selectedDetails.invoice_id)
        .single();

      const newCNTotal = (inv?.cn_amount || 0) + amount;

      // 4. Derive new status
      const newOutstanding =
        selectedDetails.originalAmount -
        selectedDetails.amountReceived -
        newCNTotal;

      const newStatus =
        newOutstanding <= 0
          ? "paid"
          : selectedDetails.amountReceived > 0
          ? "partial"
          : "pending";

      await supabase
        .from("invoices")
        .update({ cn_amount: newCNTotal, status: newStatus })
        .eq("id", selectedDetails.invoice_id);

      // 5. Refresh dashboard
      window.refreshDashboard?.();

      alert("✅ " + formData.optionType + " saved successfully");
      resetForm();
      onClose();
    } catch (err) {
      alert("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      invoiceOrRef:  "",
      optionType:    "CN",
      dateIssued:    "",
      cnAmount:      "",
      employeeCount: "",
      remarks:       "",
    });
    setSelectedDetails(null);
    setErrors({});
    setShowErrors(false);
    setViewOpen(false);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const ErrorMsg = ({ field }) => {
    if (!showErrors || !errors[field]) return null;
    return (
      <div className="flex items-center mt-1 text-xs text-red-500">
        <AlertCircle className="w-3 h-3 mr-1 shrink-0" />
        {errors[field]}
      </div>
    );
  };

  // Impact preview
  const impactOutstanding =
    selectedDetails && formData.cnAmount
      ? Math.max(0, selectedDetails.amountPayable - parseFloat(formData.cnAmount || 0))
      : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden relative"
          >
            {/* Inline records panel slides over */}
            <AnimatePresence>
              {viewOpen && (
                <CNRecordsPanel onClose={() => setViewOpen(false)} />
              )}
            </AnimatePresence>

            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">+ ADD CN / BAD DEBT</h2>
                  <p className="text-violet-100 text-sm mt-1">
                    Record credit note or bad debt write-off
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setViewOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold border border-white/30 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Records
                  </button>
                  <button
                    onClick={handleClose}
                    className="text-violet-100 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Form ── */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Type Toggle */}
                <div className="flex gap-3">
                  {["CN", "Bad Debt"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleChange("optionType", t)}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                        formData.optionType === t
                          ? t === "Bad Debt"
                            ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-200"
                            : "bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200"
                          : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {t === "CN" ? "📄 Credit Note" : "⚠️ Bad Debt"}
                    </button>
                  ))}
                </div>

                {/* Type description banner */}
                <div
                  className={`text-xs px-4 py-2.5 rounded-lg font-medium border ${
                    formData.optionType === "Bad Debt"
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-violet-50 border-violet-200 text-violet-700"
                  }`}
                >
                  {formData.optionType === "Bad Debt"
                    ? "⚠️ Bad Debt: Unrecoverable amount — permanently reduces outstanding. Cannot be reversed."
                    : "📄 Credit Note: Customer discount or adjustment — reduces amount payable."}
                </div>

                {/* Reference Details */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileX className="w-4 h-4" />
                    Reference Details
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                      Invoice Number or Payment Reference{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      list="cn-ref-list"
                      readOnly={!!editData}
                      value={formData.invoiceOrRef}
                      onChange={(e) => handleChange("invoiceOrRef", e.target.value)}
                      className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 ${
                        showErrors && errors.invoiceOrRef
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="INV-2024001 or UI-120526-01"
                    />
                    <datalist id="cn-ref-list">
                      {invoices.map((v, i) => (
                        <option key={`inv-${i}`} value={v} />
                      ))}
                      {paymentReferences.map((v, i) => (
                        <option key={`ref-${i}`} value={v} />
                      ))}
                    </datalist>
                    <ErrorMsg field="invoiceOrRef" />
                    <p className="text-xs text-gray-500 mt-1">
                      Details auto populate from invoice or payment reference
                    </p>
                  </div>

                  {/* Auto-populated invoice details */}
                  {selectedDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 pt-4 border-t border-blue-200 grid grid-cols-3 gap-4 text-sm"
                    >
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Client</p>
                        <p className="font-semibold text-gray-900 mt-0.5">{selectedDetails.client}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Department</p>
                        <p className="font-semibold text-gray-900 mt-0.5">{selectedDetails.department}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Entity</p>
                        <p className="font-semibold text-gray-900 mt-0.5">{selectedDetails.entity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Receivable</p>
                        <p className="font-semibold text-gray-900 mt-0.5">
                          ₹ {selectedDetails.originalAmount.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Outstanding</p>
                        <p className="font-semibold text-emerald-600 mt-0.5">
                          ₹ {selectedDetails.amountPayable.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Existing CN</p>
                        <p className="font-semibold text-violet-600 mt-0.5">
                          ₹ {selectedDetails.cnAmount.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* CN / Bad Debt Details */}
                <div
                  className={`border-2 rounded-xl p-4 ${
                    formData.optionType === "Bad Debt"
                      ? "bg-red-50 border-red-200"
                      : "bg-violet-50 border-violet-200"
                  }`}
                >
                  <h3
                    className={`text-sm font-bold uppercase tracking-wider mb-4 ${
                      formData.optionType === "Bad Debt"
                        ? "text-red-900"
                        : "text-violet-900"
                    }`}
                  >
                    {formData.optionType} Details
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Date */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Date of Issue <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.dateIssued}
                        onChange={(e) => handleChange("dateIssued", e.target.value)}
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none ${
                          showErrors && errors.dateIssued
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      <ErrorMsg field="dateIssued" />
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        {formData.optionType} Amount{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formData.cnAmount}
                        onChange={(e) => handleChange("cnAmount", e.target.value)}
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none ${
                          showErrors && errors.cnAmount
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="₹ 0"
                      />
                      <ErrorMsg field="cnAmount" />
                      <p className="text-xs text-gray-500 mt-1">
                        Will reduce outstanding by this amount
                      </p>
                    </div>
                  </div>

                  {/* Employee Count (OS dept only) */}
                  {selectedDetails?.dept_code === "OS" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4"
                    >
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Employee Count <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.employeeCount}
                        onChange={(e) => handleChange("employeeCount", e.target.value)}
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg ${
                          showErrors && errors.employeeCount
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="0"
                      />
                      <ErrorMsg field="employeeCount" />
                    </motion.div>
                  )}
                </div>

                {/* Remarks */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Remarks
                  </label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => handleChange("remarks", e.target.value)}
                    rows={3}
                    className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-sm"
                    placeholder="Reason for credit note or bad debt write-off..."
                  />
                </div>

                {/* Impact Summary */}
                {impactOutstanding !== null && formData.cnAmount && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4"
                  >
                    <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-3">
                      Impact Summary
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">
                          Current Outstanding
                        </p>
                        <p className="text-lg font-bold text-gray-900 mt-1">
                          ₹ {selectedDetails.amountPayable.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">
                          {formData.optionType} Reduction
                        </p>
                        <p className="text-lg font-bold text-violet-600 mt-1">
                          − ₹ {parseFloat(formData.cnAmount).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">
                          New Outstanding
                        </p>
                        <p
                          className={`text-lg font-bold mt-1 ${
                            impactOutstanding <= 0
                              ? "text-emerald-600"
                              : "text-gray-900"
                          }`}
                        >
                          ₹ {impactOutstanding.toLocaleString("en-IN")}
                        </p>
                        {impactOutstanding <= 0 && (
                          <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                            Invoice will be marked PAID
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3 italic">
                      ℹ️ CN / Bad Debt is a non-cash adjustment — affects software
                      balance only, not bank balance.
                    </p>
                  </motion.div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-8 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium shadow-lg flex items-center gap-2 ${
                      formData.optionType === "Bad Debt"
                        ? "bg-red-600 hover:bg-red-700 shadow-red-200"
                        : "bg-violet-600 hover:bg-violet-700 shadow-violet-200"
                    }`}
                  >
                    <span>{loading ? "Saving..." : `Save ${formData.optionType}`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddCNBadDebtModal;