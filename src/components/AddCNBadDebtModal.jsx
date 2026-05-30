import React, { useState, useEffect, useRef } from "react";
import supabase from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ArrowRight, AlertCircle, FileX, Eye, Trash2, Loader2,
  ChevronLeft, CheckCircle2, RefreshCcw, Building2, CreditCard,
  Hash, BadgeCheck, XCircle,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) => Number(v || 0).toLocaleString("en-IN");
const num = (v) => parseFloat(v || 0);

// ─── Invoice Detail Card shown after lookup ───────────────────────────────────
const InvoiceCard = ({ d }) => (
  <motion.div
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-3 rounded-xl border border-blue-200 bg-white shadow-sm overflow-hidden"
  >
    {/* top strip */}
    <div className="bg-blue-600 px-4 py-2 flex items-center justify-between">
      <span className="text-white text-xs font-bold tracking-wide">
        {d.invoiceNumber}
      </span>
      <div className="flex items-center gap-2">
        {d.bankName && (
          <span className="flex items-center gap-1 text-blue-100 text-[10px]">
            <Building2 className="w-3 h-3" /> {d.bankName}
          </span>
        )}
        <span className="bg-white/20 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
          {d.entity}
        </span>
      </div>
    </div>

    {/* client + dept row */}
    <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-4">
      <span className="text-xs font-semibold text-blue-900">{d.client}</span>
      <span className="text-[10px] text-blue-500">·</span>
      <span className="text-xs text-blue-700">{d.department}</span>
      <span className="text-[10px] text-blue-500">·</span>
      <span className="text-xs text-blue-500">{d.ledger}</span>
    </div>

    {/* amounts grid */}
    <div className="grid grid-cols-5 divide-x divide-gray-100 text-center">
      {[
        { label: "Pay", value: d.pay, color: "text-gray-800" },
        { label: "Verto Fee", value: d.vertoFee, color: "text-violet-600" },
        { label: "GST", value: d.gst, color: "text-amber-600" },
        { label: "TDS", value: d.tds, color: "text-rose-600" },
        { label: "Outstanding", value: d.amountPayable, color: "text-emerald-600" },
      ].map(({ label, value, color }) => (
        <div key={label} className="py-2.5 px-1">
          <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">{label}</p>
          <p className={`text-xs font-bold mt-0.5 ${color}`}>₹{fmt(value)}</p>
        </div>
      ))}
    </div>

    {/* existing CN row */}
    {d.cnAmount > 0 && (
      <div className="px-4 py-1.5 bg-violet-50 border-t border-violet-100 text-xs text-violet-700 font-medium">
        Existing CN/BD: ₹{fmt(d.cnAmount)} already applied
      </div>
    )}
  </motion.div>
);

// ─── Records Panel ────────────────────────────────────────────────────────────
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
        id, reference_no, invoice_number, type, amount,
        pay_cn, verto_fee_cn, gst_cn, tds_cn,
        issue_date, entity, bank_name, remarks, invoice_id,
        invoices ( invoice_number, client_id, clients_master ( client_name ) )
      `)
      .order("created_at", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleDelete = async (id) => {
    setConfirmId(null);
    setDeletingId(id);
    try {
      const { error } = await supabase.rpc("delete_cn_bad_debt_complete", { p_cn_id: id });
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

  const totalAmount = records.reduce((s, r) => s + num(r.amount), 0);

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
          <button onClick={onClose} className="flex items-center gap-1 text-violet-100 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-semibold">Back</span>
          </button>
          <div className="w-px h-4 bg-white/30" />
          <div>
            <h3 className="text-sm font-bold">CN / Bad Debt Records</h3>
            <p className="text-violet-200 text-xs">{records.length} total · ₹{fmt(totalAmount)}</p>
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
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <RefreshCcw className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No CN / Bad Debt records yet</p>
          </div>
        ) : (
          records.map((row) => {
            const clientName = row.invoices?.clients_master?.client_name || "—";
            const hasBreakdown = num(row.pay_cn) + num(row.verto_fee_cn) + num(row.gst_cn) + num(row.tds_cn) > 0;
            return (
              <div
                key={row.id}
                className={`bg-white border border-gray-100 rounded-xl shadow-sm transition-opacity overflow-hidden ${
                  deletingId === row.id ? "opacity-40 pointer-events-none" : ""
                }`}
              >
                {/* top bar */}
                <div className={`px-3.5 py-2 flex items-center justify-between ${
                  row.type === "Bad Debt" ? "bg-red-50 border-b border-red-100" : "bg-violet-50 border-b border-violet-100"
                }`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* USER-ENTERED REF NO — prominent */}
                    <span className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1 ${
                      row.type === "Bad Debt"
                        ? "bg-red-600 text-white"
                        : "bg-violet-600 text-white"
                    }`}>
                      <Hash className="w-3 h-3" />
                      {row.reference_no || row.id?.slice(0, 8) || "—"}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      row.type === "Bad Debt"
                        ? "bg-red-50 text-red-600 border-red-200"
                        : "bg-violet-50 text-violet-600 border-violet-200"
                    }`}>
                      {row.type}
                    </span>
                  </div>
                  <span className="font-bold text-gray-800 text-sm">₹{fmt(row.amount)}</span>
                </div>

                {/* body */}
                <div className="px-3.5 py-2.5">
                  {/* invoice + client */}
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-xs font-semibold text-gray-800">
                      {row.invoice_number || row.invoices?.invoice_number || "—"}
                    </span>
                    <span className="text-gray-300 text-xs">·</span>
                    <span className="text-xs text-gray-600">{clientName}</span>
                    {row.entity && (
                      <>
                        <span className="text-gray-300 text-xs">·</span>
                        <span className="text-[10px] text-gray-500">{row.entity}</span>
                      </>
                    )}
                    {row.bank_name && (
                      <>
                        <span className="text-gray-300 text-xs">·</span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                          <Building2 className="w-2.5 h-2.5" />{row.bank_name}
                        </span>
                      </>
                    )}
                  </div>

                  {/* breakdown chips */}
                  {hasBreakdown && (
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      {num(row.pay_cn) > 0 && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                          Pay ₹{fmt(row.pay_cn)}
                        </span>
                      )}
                      {num(row.verto_fee_cn) > 0 && (
                        <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded font-medium">
                          Verto ₹{fmt(row.verto_fee_cn)}
                        </span>
                      )}
                      {num(row.gst_cn) > 0 && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                          GST ₹{fmt(row.gst_cn)}
                        </span>
                      )}
                      {num(row.tds_cn) > 0 && (
                        <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-medium">
                          TDS ₹{fmt(row.tds_cn)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {row.issue_date && (
                        <span className="text-[10px] text-gray-400">
                          {new Date(row.issue_date).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </span>
                      )}
                      {row.remarks && (
                        <span className="text-[10px] text-gray-400 italic truncate max-w-[150px]">
                          {row.remarks}
                        </span>
                      )}
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
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
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
  const EMPTY = {
    invoiceOrRef:  "",
    optionType:    "CN",
    dateIssued:    "",
    referenceNo:   "",          // ← user enters this
    payCN:         "",
    vertoFeeCN:    "",
    gstCN:         "",
    tdsCN:         "",
    employeeCount: "",
    remarks:       "",
  };

  const [formData, setFormData]               = useState(EMPTY);
  const [errors, setErrors]                   = useState({});
  const [showErrors, setShowErrors]           = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [viewOpen, setViewOpen]               = useState(false);
  const [refStatus, setRefStatus]             = useState(null); // null | 'checking' | 'ok' | 'taken'
  const refCheckTimer                         = useRef(null);

  // ── Populate from editData ──────────────────────────────────────────────────
  useEffect(() => {
    if (editData && isOpen) {
      setFormData({
        invoiceOrRef:  editData.invoice_number || "",
        optionType:    editData.type || "CN",
        dateIssued:    editData.issue_date || "",
        referenceNo:   editData.reference_no || "",
        payCN:         editData.pay_cn || "",
        vertoFeeCN:    editData.verto_fee_cn || "",
        gstCN:         editData.gst_cn || "",
        tdsCN:         editData.tds_cn || "",
        employeeCount: editData.employee_count || "",
        remarks:       editData.remarks || "",
      });
    }
  }, [editData, isOpen]);

  const handleChange = (field, value) => {
    setFormData((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  };

  // ── Real-time reference_no uniqueness check ─────────────────────────────────
  useEffect(() => {
    const val = formData.referenceNo.trim();
    if (!val) { setRefStatus(null); return; }
    // If editing and ref hasn't changed, skip
    if (editData?.reference_no === val) { setRefStatus("ok"); return; }

    setRefStatus("checking");
    clearTimeout(refCheckTimer.current);
    refCheckTimer.current = setTimeout(async () => {
      const { count } = await supabase
        .from("credit_note_bad_debt")
        .select("id", { count: "exact", head: true })
        .eq("reference_no", val);
      setRefStatus(count > 0 ? "taken" : "ok");
    }, 400);

    return () => clearTimeout(refCheckTimer.current);
  }, [formData.referenceNo]);

  // ── Auto-populate invoice details ───────────────────────────────────────────
  useEffect(() => {
    const fetchDetails = async () => {
      if (!formData.invoiceOrRef) { setSelectedDetails(null); return; }

      let invoiceId = null;

      const { data: pay } = await supabase
        .from("payments_received")
        .select("invoice_id")
        .eq("payment_ref", formData.invoiceOrRef)
        .maybeSingle();
      if (pay?.invoice_id) invoiceId = pay.invoice_id;

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

      // Also fetch bank_name from invoice
      const { data: invRow } = await supabase
        .from("invoices")
        .select("bank_id, bank_master(bank_name)")
        .eq("id", invoiceId)
        .maybeSingle();

      const invoiceBase = num(data.pay) + num(data.verto_fee);
      const gstRate = invoiceBase ? num(data.gst) / invoiceBase : 0;
      const tdsRate = invoiceBase ? num(data.tds) / invoiceBase : 0;

      setSelectedDetails({
        invoice_id:    data.id,
        invoiceNumber: data.invoice_number,
        client:        data.client_name,
        ledger:        data.ledger_name,
        department:    data.dept_name,
        dept_code:     data.dept_code,
        entity:        data.entity_name,
        pay:           data.pay || 0,
        vertoFee:      data.verto_fee || 0,
        gst:           data.gst || 0,
        tds:           data.tds || 0,
        gstRate,
        tdsRate,
        originalAmount: data.receivable_amount || 0,
        amountPayable:  data.outstanding || 0,
        amountReceived: data.amount_received || 0,
        cnAmount:       data.cn_amount || 0,
        employeeCount:  data.employee_count || null,
        bankName:       invRow?.bank_master?.bank_name || null,
      });
    };
    fetchDetails();
  }, [formData.invoiceOrRef]);

  // ── Derived: total CN = sum of entered breakdown fields ─────────────────────
  const totalCN =
    num(formData.payCN) + num(formData.vertoFeeCN) +
    num(formData.gstCN) + num(formData.tdsCN);

  const impactOutstanding = selectedDetails
    ? Math.max(0, selectedDetails.amountPayable - totalCN)
    : null;

  // ── Validation ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedDetails) return;

    const baseCN = num(formData.payCN) + num(formData.vertoFeeCN);
    if (baseCN <= 0) return;

    const gstCN = +(baseCN * (selectedDetails.gstRate || 0)).toFixed(2);
    const tdsCN = +(baseCN * (selectedDetails.tdsRate || 0)).toFixed(2);

    setFormData((prev) => ({
      ...prev,
      gstCN: gstCN ? gstCN.toString() : "",
      tdsCN: tdsCN ? tdsCN.toString() : "",
    }));
  }, [formData.payCN, formData.vertoFeeCN, selectedDetails]);

  const validateForm = () => {
    const e = {};
    if (!formData.invoiceOrRef.trim())
      e.invoiceOrRef = "Invoice number or payment reference is required";
    if (!formData.referenceNo.trim())
      e.referenceNo = "Reference number is required";
    if (refStatus === "taken")
      e.referenceNo = "This reference number already exists";
    if (refStatus === "checking")
      e.referenceNo = "Wait for reference check to complete";
    if (!formData.dateIssued)
      e.dateIssued = "Date is required";
    if (totalCN <= 0)
      e.payCN = "Enter at least one amount (Pay / Verto Fee / GST / TDS)";
    // ── CHANGE 1: Max CN validation ──────────────────────────────────────
    if (selectedDetails && totalCN > (selectedDetails.pay + selectedDetails.vertoFee + selectedDetails.gst))
      e.payCN = `CN total ₹${fmt(totalCN)} cannot exceed invoice receivable ₹${fmt(selectedDetails.pay + selectedDetails.vertoFee + selectedDetails.gst)} (Pay + Verto Fee + GST — TDS is excluded)`;
    if (selectedDetails?.dept_code === "OS" && !formData.employeeCount)
      e.employeeCount = "Employee count required for Operations";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (loading) return;
    setShowErrors(true);
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("save_cn_bad_debt", {
        p_invoice_id:    selectedDetails.invoice_id,
        p_invoice_number: selectedDetails.invoiceNumber,
        p_type:          formData.optionType,
        p_issue_date:    formData.dateIssued,
        p_total_amount:  totalCN,
        p_reference_no:  formData.referenceNo.trim(),
        p_pay_cn:        num(formData.payCN),
        p_verto_fee_cn:  num(formData.vertoFeeCN),
        p_gst_cn:        num(formData.gstCN),
        p_tds_cn:        num(formData.tdsCN),
        p_entity:        selectedDetails.entity,
        p_employee_count:
          selectedDetails.dept_code === "OS"
            ? Number(formData.employeeCount)
            : null,
        p_remarks:   formData.remarks || "",
        p_bank_name: selectedDetails.bankName || null,
      });

      if (error) throw error;

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
    setFormData(EMPTY);
    setSelectedDetails(null);
    setErrors({});
    setShowErrors(false);
    setViewOpen(false);
    setRefStatus(null);
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

  // ── Ref status icon ─────────────────────────────────────────────────────────
  const RefIcon = () => {
    if (!formData.referenceNo.trim()) return null;
    if (refStatus === "checking")
      return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;
    if (refStatus === "ok")
      return <BadgeCheck className="w-4 h-4 text-emerald-500" />;
    if (refStatus === "taken")
      return <XCircle className="w-4 h-4 text-red-500" />;
    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────────
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
            <AnimatePresence>
              {viewOpen && <CNRecordsPanel onClose={() => setViewOpen(false)} />}
            </AnimatePresence>

            {/* Header */}
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
                    <Eye className="w-3.5 h-3.5" /> View Records
                  </button>
                  <button onClick={handleClose} className="text-violet-100 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Type toggle */}
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

                {/* Type banner */}
                <div className={`text-xs px-4 py-2.5 rounded-lg font-medium border ${
                  formData.optionType === "Bad Debt"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-violet-50 border-violet-200 text-violet-700"
                }`}>
                  {formData.optionType === "Bad Debt"
                    ? "⚠️ Bad Debt: Unrecoverable amount — permanently reduces outstanding. Cannot be reversed."
                    : "📄 Credit Note: Customer discount or adjustment — reduces amount payable."}
                </div>

                {/* ── Reference Details ── */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileX className="w-4 h-4" /> Reference Details
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Invoice / payment ref */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Invoice No. or Payment Ref <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        list="cn-ref-list"
                        readOnly={!!editData}
                        value={formData.invoiceOrRef}
                        onChange={(e) => handleChange("invoiceOrRef", e.target.value)}
                        className={`w-full bg-white border text-gray-900 px-3 py-2.5 rounded-lg focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-sm ${
                          showErrors && errors.invoiceOrRef ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="INV-2024001 or UI-120526-01"
                      />
                      <datalist id="cn-ref-list">
                        {invoices.map((v, i) => <option key={`inv-${i}`} value={v} />)}
                        {paymentReferences.map((v, i) => <option key={`ref-${i}`} value={v} />)}
                      </datalist>
                      <ErrorMsg field="invoiceOrRef" />
                      <p className="text-xs text-gray-500 mt-1">Auto-populates details below</p>
                    </div>

                    {/* User-entered reference no */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        CN / BD Reference No. <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.referenceNo}
                          onChange={(e) => handleChange("referenceNo", e.target.value.toUpperCase())}
                          className={`w-full bg-white border text-gray-900 px-3 py-2.5 pr-9 rounded-lg focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-sm font-mono ${
                            showErrors && errors.referenceNo
                              ? "border-red-500"
                              : refStatus === "ok"
                              ? "border-emerald-400"
                              : refStatus === "taken"
                              ? "border-red-400"
                              : "border-gray-300"
                          }`}
                          placeholder={formData.optionType === "Bad Debt" ? "BD-2024-001" : "CN-2024-001"}
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          <RefIcon />
                        </div>
                      </div>
                      {/* Inline status text */}
                      {refStatus === "ok" && formData.referenceNo.trim() && (
                        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                          <BadgeCheck className="w-3 h-3" /> Reference is available
                        </p>
                      )}
                      {refStatus === "taken" && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Already used — enter a different one
                        </p>
                      )}
                      <ErrorMsg field="referenceNo" />
                    </div>
                  </div>

                  {/* Auto-populated card */}
                  {selectedDetails && <InvoiceCard d={selectedDetails} />}
                </div>

                {/* ── Amount Breakdown ── */}
                <div className={`border-2 rounded-xl p-4 ${
                  formData.optionType === "Bad Debt"
                    ? "bg-red-50 border-red-200"
                    : "bg-violet-50 border-violet-200"
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-sm font-bold uppercase tracking-wider ${
                      formData.optionType === "Bad Debt" ? "text-red-900" : "text-violet-900"
                    }`}>
                      {formData.optionType} Amount Breakdown
                    </h3>
                    {totalCN > 0 && (
                      <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                        formData.optionType === "Bad Debt"
                          ? "bg-red-100 text-red-700"
                          : "bg-violet-100 text-violet-700"
                      }`}>
                        Total: ₹{fmt(totalCN)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Date */}
                    <div className="col-span-2 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Date of Issue <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={formData.dateIssued}
                          onChange={(e) => handleChange("dateIssued", e.target.value)}
                          className={`w-full bg-white border text-gray-900 px-3 py-2.5 rounded-lg focus:outline-none ${
                            showErrors && errors.dateIssued ? "border-red-500" : "border-gray-300"
                          }`}
                        />
                        <ErrorMsg field="dateIssued" />
                      </div>
                    </div>

                    {/* Pay CN */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Pay
                        {selectedDetails && (
                          <span className="ml-1 text-gray-400 font-normal normal-case">
                            (Invoice: ₹{fmt(selectedDetails.pay)})
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formData.payCN}
                        onChange={(e) => handleChange("payCN", e.target.value)}
                        className={`w-full bg-white border text-gray-900 px-3 py-2.5 rounded-lg focus:outline-none focus:border-violet-500 ${
                          showErrors && errors.payCN ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="₹ 0"
                      />
                    </div>

                    {/* Verto Fee CN */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Verto Fee
                        {selectedDetails && (
                          <span className="ml-1 text-gray-400 font-normal normal-case">
                            (Invoice: ₹{fmt(selectedDetails.vertoFee)})
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formData.vertoFeeCN}
                        onChange={(e) => handleChange("vertoFeeCN", e.target.value)}
                        className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2.5 rounded-lg focus:outline-none focus:border-violet-500"
                        placeholder="₹ 0"
                      />
                      <p className="text-[10px] text-violet-600 mt-1">Reduces Verto revenue</p>
                    </div>

                    {/* GST CN */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        GST
                        {selectedDetails && (
                          <span className="ml-1 text-gray-400 font-normal normal-case">
                            (Invoice: ₹{fmt(selectedDetails.gst)})
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formData.gstCN}
                        onChange={(e) => handleChange("gstCN", e.target.value)}
                        className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2.5 rounded-lg focus:outline-none focus:border-amber-400"
                        placeholder="₹ 0"
                      />
                      <p className="text-[10px] text-amber-600 mt-1">
                        Auto-calculated from invoice GST % on service fee + Verto Fee
                      </p>
                    </div>

                    {/* TDS CN */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        TDS
                        {selectedDetails && (
                          <span className="ml-1 text-gray-400 font-normal normal-case">
                            (Invoice: ₹{fmt(selectedDetails.tds)})
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formData.tdsCN}
                        onChange={(e) => handleChange("tdsCN", e.target.value)}
                        className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2.5 rounded-lg focus:outline-none focus:border-rose-400"
                        placeholder="₹ 0"
                      />
                      <p className="text-[10px] text-rose-600 mt-1">
                        Auto-calculated from invoice TDS % on service fee + Verto Fee
                      </p>
                    </div>
                  </div>

                  <ErrorMsg field="payCN" />

                  {/* Employee count for OS */}
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
                        className={`w-full bg-white border text-gray-900 px-3 py-2.5 rounded-lg ${
                          showErrors && errors.employeeCount ? "border-red-500" : "border-gray-300"
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
                    rows={2}
                    className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2.5 rounded-lg focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-sm"
                    placeholder="Reason for credit note or bad debt write-off..."
                  />
                </div>

                {/* Impact Summary */}
                {selectedDetails && totalCN > 0 && (
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
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Current Outstanding</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">₹{fmt(selectedDetails.amountPayable)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">{formData.optionType} Total</p>
                        <p className="text-lg font-bold text-violet-600 mt-1">− ₹{fmt(totalCN)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">New Outstanding</p>
                        <p className={`text-lg font-bold mt-1 ${impactOutstanding <= 0 ? "text-emerald-600" : "text-gray-900"}`}>
                          ₹{fmt(impactOutstanding)}
                        </p>
                        {impactOutstanding <= 0 && (
                          <p className="text-xs text-emerald-600 font-semibold mt-0.5">Invoice will be marked PAID</p>
                        )}
                      </div>
                    </div>
                    {(num(formData.gstCN) > 0 || num(formData.tdsCN) > 0) && (
                      <div className="mt-3 pt-3 border-t border-amber-200 flex items-center gap-4 text-xs">
                        {num(formData.gstCN) > 0 && (
                          <span className="text-amber-700 font-medium">
                            📋 GST liability ↓ ₹{fmt(formData.gstCN)}
                          </span>
                        )}
                        {num(formData.tdsCN) > 0 && (
                          <span className="text-amber-700 font-medium">
                            📋 TDS liability ↓ ₹{fmt(formData.tdsCN)}
                          </span>
                        )}
                      </div>
                    )}
                    {/* ── CHANGE 2: Live warning when CN exceeds receivable (excl. TDS) ── */}
                    {totalCN > (selectedDetails.pay + selectedDetails.vertoFee + selectedDetails.gst) && (
                      <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-700 font-semibold">
                          CN total exceeds invoice receivable (Pay + Verto Fee + GST = ₹{fmt(selectedDetails.pay + selectedDetails.vertoFee + selectedDetails.gst)}). TDS cannot be credited — reduce the amounts.
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2 italic">
                      ℹ️ CN / Bad Debt is a non-cash adjustment — affects software balance only, not bank balance.
                    </p>
                  </motion.div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  {/* ── CHANGE 3: Disable submit when over limit ── */}
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      refStatus === "taken" ||
                      refStatus === "checking" ||
                      (selectedDetails != null && totalCN > (selectedDetails.pay + selectedDetails.vertoFee + selectedDetails.gst))
                    }
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