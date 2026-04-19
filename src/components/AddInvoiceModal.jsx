import React, { useState, useEffect } from "react";
import supabase from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, AlertCircle, Calculator } from "lucide-react";

const AddInvoiceModal = ({
  isOpen,
  onClose,
  clients = [],
  entities = [],
  selectedInvoice,
}) => {
  // Local form state
  const [formData, setFormData] = useState({
    invoiceEntity: "",
    department: "",
    payHead: "",
    client: "",
    ledgerName: "",
    invoiceDate: "",
    impactMonth: "",
    invoiceNo: "",
    pay: "",
    vertoFee: "",
    gst: "",
    invoiceValue: "",
    tds: "",
    vertoFeePostTds: "",
    receivableRs: "",
    expectedCollectionDate: "",
    bankName: "",
    invoiceDescription: "",
    refNoPaymentMade: "",
    // OS Department specific fields
    employeeCount: "",
    grossValue: "",
    netInHand: "",
    coPF: "",
    coESI: "",
    lwfTax: "",
    ptTax: "",
    otherDed: "",
    ctc: "",
    monthOfPayout: "",
    statutoryPayoutDate: "",
    vertoFeePayoutDate: "",
    expectedOutflowInHand: "",
    expectedOutflowPF: "",
    expectedOutflowESI: "",
    expectedOutflowGST: "",
    expectedOutflowTax: "",
  });

  useEffect(() => {
    const fetchLedger = async () => {
      if (!selectedInvoice || !formData.client) return;

      const { data } = await supabase
        .from("clients_master")
        .select("ledger_name")
        .ilike("client_name", `%${formData.client}%`)
        .maybeSingle();

      if (data) {
        setFormData((prev) => ({
          ...prev,
          ledgerName: data.ledger_name || "",
        }));
      }
    };

    fetchLedger();
  }, [formData.client, selectedInvoice]);

  const [banks, setBanks] = useState([]);

  useEffect(() => {
    if (!selectedInvoice || banks.length === 0) return;

    console.log("🔥 EDIT DATA FULL:", selectedInvoice);

    const selectedBank = banks.find((b) => b.id === selectedInvoice.bank_id);

    setFormData((prev) => ({
      ...prev,

      // ✅ SIMPLE DIRECT VALUES (NO FIND)
      invoiceEntity: selectedInvoice?.entity_name ?? "",
      department: selectedInvoice?.dept_code ?? "",
      client: selectedInvoice?.client_name ?? "",
      ledgerName: selectedInvoice?.ledger_name ?? "",
      payHead: selectedInvoice?.pay_head ?? "",

      // ✅ BANK FIX
      bankName: selectedBank?.bank_name ?? "",

      invoiceDate: selectedInvoice?.invoice_date ?? "",

      impactMonth: selectedInvoice?.impact_month
        ? selectedInvoice.impact_month.slice(5, 7) +
          "/" +
          selectedInvoice.impact_month.slice(2, 4)
        : "",

      expectedCollectionDate: selectedInvoice?.expected_collection_date ?? "",

      invoiceNo: selectedInvoice?.invoice_number ?? "",

      pay: selectedInvoice?.pay ?? "",
      vertoFee: selectedInvoice?.verto_fee ?? "",

      gst: selectedInvoice?.gst ?? "",
      tds: selectedInvoice?.tds ?? "",
      invoiceValue: selectedInvoice?.invoice_value ?? "",
      receivableRs: selectedInvoice?.receivable_amount ?? "",

      // OS fields
      employeeCount: selectedInvoice?.employee_count ?? "",
      grossValue: selectedInvoice?.gross_value ?? "",
      netInHand: selectedInvoice?.net_in_hand ?? "",
      coPF: selectedInvoice?.co_pf ?? "",
      coESI: selectedInvoice?.co_esi ?? "",
      lwfTax: selectedInvoice?.lwf_tax ?? "",
      ptTax: selectedInvoice?.pt_tax ?? "",
      otherDed: selectedInvoice?.other_ded ?? "",
      ctc: selectedInvoice?.ctc ?? "",
    }));
  }, [selectedInvoice, banks]);

  const [errors, setErrors] = useState({});
  const [showErrors, setShowErrors] = useState(false);

  // Department options
  const departments = [
    { value: "OS", label: "OS (Operations)" },
    { value: "REC", label: "REC (Recruitment)" },
    { value: "TEMP", label: "TEMP (Temporary)" },
    { value: "PROJ", label: "PROJ (Projects)" },
    { value: "OTH", label: "OTH (Others)" },
  ];

  useEffect(() => {
    const fetchBanks = async () => {
      const { data } = await supabase
        .from("bank_master")
        .select("id, bank_name");

      setBanks(data || []);
    };

    fetchBanks();
  }, []);

  // Single handleChange function
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // 🔥 AUTO FETCH LEDGER NAME BASED ON CLIENT

  // Auto-calculate GST, Invoice Value, TDS, Verto Fee Post TDS
  useEffect(() => {

    if (selectedInvoice) return;
    
    const pay = parseFloat(formData.pay);
    const vertoFee = parseFloat(formData.vertoFee);
    const grossValue = parseFloat(formData.grossValue);
    
    if (isNaN(pay) || isNaN(vertoFee)) return; // 🚨 STOP if invalid
    const dept = formData.department;
    

    // ✅ TOTAL BASE
    const baseAmount = vertoFee + pay + (dept === "OS" ? grossValue : 0);

    // ✅ GST
    const gst = baseAmount * 0.18;

    // ✅ TDS BASE (FIXED)
    const tdsBase = pay + vertoFee + (dept === "OS" ? grossValue : 0);

    // ✅ RATE
    const tdsRate = dept === "OS" ? 0.02 : 0.1;

    // ✅ INVOICE VALUE
    const invoiceValue = baseAmount + gst;

    // ✅ POST TDS (ONLY PAY)
    // ✅ TOTAL BASE
    const totalBase = pay + vertoFee + (dept === "OS" ? grossValue : 0);

    // ✅ TDS
    const tds = totalBase * tdsRate;

    // ✅ RECEIVABLE
    const receivable = invoiceValue - tds;

    // ✅ PROPORTIONAL VERT0 SHARE
    const vertoFeePostTds =
      totalBase > 0 ? vertoFee - tds * (vertoFee / totalBase) : 0;

    setFormData((prev) => ({
      ...prev,
      gst: gst.toFixed(2),
      tds: tds.toFixed(2),
      invoiceValue: invoiceValue.toFixed(2),
      receivableRs: receivable.toFixed(2),
      vertoFeePostTds: vertoFeePostTds.toFixed(2),
    }));
  }, [
    formData.pay,
    formData.vertoFee,
    formData.grossValue,
    formData.department,
  ]);
  // Auto-calculate CTC for OS department
  useEffect(() => {
    if (formData.department === "OS") {
      const netInHand = parseFloat(formData.netInHand) || 0;
      const coPF = parseFloat(formData.coPF) || 0;
      const coESI = parseFloat(formData.coESI) || 0;
      const lwfTax = parseFloat(formData.lwfTax) || 0;
      const ptTax = parseFloat(formData.ptTax) || 0;
      const otherDed = parseFloat(formData.otherDed) || 0;

      const ctc = netInHand + coPF + coESI + lwfTax + ptTax + otherDed;
      setFormData((prev) => ({ ...prev, ctc: ctc.toFixed(2) }));
    }
  }, [
    formData.netInHand,
    formData.coPF,
    formData.coESI,
    formData.lwfTax,
    formData.ptTax,
    formData.otherDed,
    formData.department,
  ]);

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Common required fields
    if (!formData.invoiceEntity) newErrors.invoiceEntity = "Entity is required";
    if (!formData.department) newErrors.department = "Department is required";
    if (!formData.client.trim()) newErrors.client = "Client is required";
    if (!formData.ledgerName.trim())
      newErrors.ledgerName = "Ledger name is required";
    if (!formData.invoiceDate)
      newErrors.invoiceDate = "Invoice date is required";
    if (!formData.invoiceNo.trim())
      newErrors.invoiceNo = "Invoice number is required";
    if (!formData.vertoFee) newErrors.vertoFee = "Verto fee is required";
    if (!formData.pay) newErrors.pay = "Pay is required";
    if (!formData.expectedCollectionDate)
      newErrors.expectedCollectionDate = "Expected collection date is required";
    if (!formData.bankName.trim()) newErrors.bankName = "Bank name is required";

    // OS Department specific validations
    if (formData.department === "OS") {
      if (!formData.employeeCount)
        newErrors.employeeCount = "Employee count is required";
      if (!formData.grossValue)
        newErrors.grossValue = "Gross value is required";
      if (!formData.netInHand) newErrors.netInHand = "Net in hand is required";
    }

    // ✅ GLOBAL MISMATCH LOGIC
    const tolerance = 50;

    const vertoFeeNum = Number(formData.vertoFee) || 0;
    const payNum = Number(formData.pay) || 0;
    const grossValueNum = Number(formData.grossValue) || 0;

    const base =
      vertoFeeNum + payNum + (formData.department === "OS" ? grossValueNum : 0);

    const expectedGST = 0.18 * base;

    const tdsBase =
      payNum + vertoFeeNum + (formData.department === "OS" ? grossValueNum : 0);

    const expectedTDS = tdsBase * (formData.department === "OS" ? 0.02 : 0.1);

    const expectedInvoice = base + expectedGST;

    const gstMismatch =
      Math.abs(Number(formData.gst) - expectedGST) > tolerance;

    const tdsMismatch =
      Math.abs(Number(formData.tds) - expectedTDS) > tolerance;

    const invoiceMismatch =
      Math.abs(Number(formData.invoiceValue) - expectedInvoice) > tolerance;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return false;

    // 🔥 ALSO CHECK MISMATCH HERE
    if (gstMismatch || tdsMismatch || invoiceMismatch) {
      const confirmSave = window.confirm(
        "⚠️ Values mismatch detected.\nDo you still want to continue?"
      );
      return confirmSave;
    }

    return true;
  };
  // 🔥 ADD THIS ABOVE COMPONENT (GLOBAL CALCULATION)
  const getMismatchData = (formData) => {
    const tolerance = 50;

    const vertoFeeNum = Number(formData.vertoFee) || 0;
    const payNum = Number(formData.pay) || 0;
    const grossValueNum = Number(formData.grossValue) || 0;

    const base =
      vertoFeeNum + payNum + (formData.department === "OS" ? grossValueNum : 0);

    const expectedGST = 0.18 * base;

    const tdsBase =
      payNum + vertoFeeNum + (formData.department === "OS" ? grossValueNum : 0);

    const expectedTDS = tdsBase * (formData.department === "OS" ? 0.02 : 0.1);

    const expectedInvoice = base + expectedGST;

    const gstMismatch =
      Math.abs(Number(formData.gst) - expectedGST) > tolerance;

    const tdsMismatch =
      Math.abs(Number(formData.tds) - expectedTDS) > tolerance;

    const invoiceMismatch =
      Math.abs(Number(formData.invoiceValue) - expectedInvoice) > tolerance;

    return {
      gstMismatch,
      tdsMismatch,
      invoiceMismatch,
      expectedGST,
      expectedTDS,
      expectedInvoice,
    };
  };
  // 🔥 ADD THIS HERE (after getMismatchData function ends)
  const {
    gstMismatch,
    tdsMismatch,
    invoiceMismatch,
    expectedGST,
    expectedTDS,
    expectedInvoice,
  } = getMismatchData(formData);

  const formatImpactMonth = (val) => {
    if (!val) return null;

    const [mm, yy] = val.split("/");

    return `20${yy}-${mm}-01`; // correct format
  };

  useEffect(() => {
    if (!formData.invoiceDate || formData.department !== "OS") return;

    const invDate = new Date(formData.invoiceDate);

    // Next month
    const nextMonth = new Date(invDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const year = nextMonth.getFullYear();
    const month = nextMonth.getMonth();

    const pfDate = new Date(year, month, 15);
    const gstDate = new Date(year, month, 21);
    const taxDate = new Date(year, month, 7);

    setFormData((prev) => ({
      ...prev,
      expectedOutflowPF: pfDate.toISOString().split("T")[0],
      expectedOutflowESI: pfDate.toISOString().split("T")[0],
      expectedOutflowGST: gstDate.toISOString().split("T")[0],
      expectedOutflowTax: taxDate.toISOString().split("T")[0],
    }));
  }, [formData.invoiceDate, formData.department]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowErrors(true);

    if (!validateForm()) return;
    if (!formData.payHead.trim()) {
      alert("❌ Pay Head is required");
      return;
    }

    try {
      console.log("🔥 FORM DATA:", formData);

      // 🔹 Get master IDs
      let { data: clientRow } = await supabase
        .from("clients_master")
        .select("id")
        .eq("client_name", formData.client)
        .maybeSingle();

      // ✅ If client does NOT exist → CREATE it
      if (!clientRow) {
        const { data: newClient, error: insertError } = await supabase
          .from("clients_master")
          .insert([
            {
              client_name: formData.client,
              ledger_name: formData.ledgerName || formData.client,
            },
          ])
          .select()
          .single();

        if (insertError) {
          alert("❌ Failed to create new client");
          return;
        }

        clientRow = newClient;
      }

      const { data: deptRow } = await supabase
        .from("departments_master")
        .select("id")
        .eq("dept_code", formData.department?.trim())
        .maybeSingle();

      const { data: entityRow } = await supabase
        .from("entity_master")
        .select("id")
        .ilike("entity_name", `%${formData.invoiceEntity}%`)
        .maybeSingle();

      console.log("DEBUG CHECK 👉");
      console.log("CLIENT INPUT:", formData.client);
      console.log("DEPT INPUT:", formData.department);
      console.log("ENTITY INPUT:", formData.invoiceEntity);

      console.log("CLIENT ROW:", clientRow);
      console.log("DEPT ROW:", deptRow);
      console.log("ENTITY ROW:", entityRow);
      console.log("ENTITY:", selectedInvoice.entity_name);
      console.log("ENTITY LIST:", entities);

      // 🚨 Validate master data
      if (!clientRow || !deptRow || !entityRow) {
        alert("❌ Invalid master data. Check client/entity/department.");
        return;
      }

      // 🚫 Duplicate check ONLY for NEW invoice
      if (!selectedInvoice) {
        const { data: existing } = await supabase
          .from("invoices")
          .select("id")
          .eq("invoice_number", formData.invoiceNo)
          .maybeSingle();

        if (existing) {
          alert("❌ Invoice number already exists");
          return;
        }
      }

      // 🚨 Mismatch validation
      if (gstMismatch || tdsMismatch || invoiceMismatch) {
        const confirmSave = window.confirm(
          "⚠️ Values mismatch detected.\nDo you still want to save?"
        );

        if (!confirmSave) return;
      }

      const selectedBank = banks.find((b) => b.bank_name === formData.bankName);

      if (!selectedBank || !selectedBank.id) {
        alert("❌ Invalid Bank Selected");
        return;
      }

      // 📦 Common data
      const payload = {
        invoice_number: formData.invoiceNo,
        client_id: clientRow.id,
        department_id: deptRow.id,
        entity_id: entityRow.id,
        invoice_date: formData.invoiceDate,
        impact_month: formatImpactMonth(formData.impactMonth),
        pay_head: formData.payHead,
        bank_id: selectedBank.id,
        pay: Number(formData.pay),

        verto_fee: Number(formData.vertoFee),
        gst: Number(formData.gst),
        invoice_value: Number(formData.invoiceValue),
        tds: Number(formData.tds),
        receivable_amount: Number(formData.receivableRs),
        expected_collection_date: formData.expectedCollectionDate,

        // ✅ OS fields
        employee_count: Number(formData.employeeCount) || 0,
        gross_value: Number(formData.grossValue) || 0,
        net_in_hand: Number(formData.netInHand) || 0,
        co_pf: Number(formData.coPF) || 0,
        co_esi: Number(formData.coESI) || 0,
        lwf_tax: Number(formData.lwfTax) || 0,
        pt_tax: Number(formData.ptTax) || 0,
        other_ded: Number(formData.otherDed) || 0,
        ctc: Number(formData.ctc) || 0,
      };

      let error;

      // 🔥 ✅ MAIN LOGIC (INSERT vs UPDATE)
      if (selectedInvoice) {
        console.log("🔥 UPDATE MODE");

        const res = await supabase
          .from("invoices")
          .update(payload)
          .eq("id", selectedInvoice.dbId);

        error = res.error;
      } else {
        console.log("🔥 INSERT MODE");

        const res = await supabase.from("invoices").insert([payload]);
        error = res.error;
      }

      // ❌ Error handling
      if (error) {
        console.error("DB Error:", error);
        alert("❌ Failed: " + error.message);
        return;
      }

      // ✅ Success
      alert(selectedInvoice ? "✅ Invoice updated" : "✅ Invoice created");

      // 🔄 Refresh dashboard
      if (window.refreshClients) {
        window.refreshClients(); // reload client list globally
      }

      // 🔄 Reset + close
      resetForm();
      onClose();
    } catch (err) {
      console.error("❌ Supabase error:", err);
      alert("❌ Unexpected error");
    }
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      invoiceEntity: "",
      department: "",
      client: "",
      ledgerName: "",
      invoiceDate: "",
      impactMonth: "",
      payHead: "",
      invoiceNo: "",
      pay: "",
      gst: "",
      invoiceValue: "",
      tds: "",
      vertoFeePostTds: "",
      receivableRs: "",
      expectedCollectionDate: "",
      bankName: "",
      invoiceDescription: "",
      refNoPaymentMade: "",
      employeeCount: "",
      grossValue: "",
      netInHand: "",
      coPF: "",
      coESI: "",
      lwfTax: "",
      ptTax: "",
      otherDed: "",
      ctc: "",
      monthOfPayout: "",
      statutoryPayoutDate: "",
      vertoFeePayoutDate: "",
      expectedOutflowInHand: "",
      expectedOutflowPF: "",
      expectedOutflowESI: "",
      expectedOutflowGST: "",
      expectedOutflowTax: "",
    });
    setErrors({});
    setShowErrors(false);
  };

  // Handle modal close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Render error message
  const ErrorMessage = ({ error }) => {
    if (!showErrors || !error) return null;
    return (
      <div className="flex items-center mt-1 text-xs text-rose-600">
        <AlertCircle className="w-3 h-3 mr-1" />
        {error}
      </div>
    );
  };

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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedInvoice ? "✏️ Edit Invoice" : "+ Add Invoice"}
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">
                    Create new invoice with auto-calculations
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-blue-100 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Invoice Details */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-4 flex items-center">
                    <Calculator className="w-4 h-4 mr-2" />
                    Basic Invoice Information
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Invoice Entity <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={formData.invoiceEntity}
                        onChange={(e) =>
                          handleChange("invoiceEntity", e.target.value)
                        }
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                          showErrors && errors.invoiceEntity
                            ? "border-rose-500"
                            : "border-gray-300"
                        }`}
                      >
                        <option value="">Select Entity</option>
                        {entities.map((entity, idx) => (
                          <option key={idx} value={entity}>
                            {entity}
                          </option>
                        ))}
                      </select>
                      <ErrorMessage error={errors.invoiceEntity} />
                      <p className="text-xs text-gray-500 mt-1">PS/PVT/LLP</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Department <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={formData.department}
                        onChange={(e) =>
                          handleChange("department", e.target.value)
                        }
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                          showErrors && errors.department
                            ? "border-rose-500"
                            : "border-gray-300"
                        }`}
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.value} value={dept.value}>
                            {dept.label}
                          </option>
                        ))}
                      </select>
                      <ErrorMessage error={errors.department} />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Client <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        list="invoice-clients-list"
                        value={formData.client || ""}
                        onChange={(e) => handleChange("client", e.target.value)}
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                          showErrors && errors.client
                            ? "border-rose-500"
                            : "border-gray-300"
                        }`}
                        placeholder="Type or select"
                      />
                      <datalist id="invoice-clients-list">
                        {clients.map((client, idx) => (
                          <option key={idx} value={client} />
                        ))}
                      </datalist>
                      <ErrorMessage error={errors.client} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                      Pay Head <span className="text-rose-600">*</span>
                    </label>

                    <input
                      type="text"
                      value={formData.payHead || ""}
                      onChange={(e) => handleChange("payHead", e.target.value)}
                      className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg ${
                        showErrors && errors.payHead
                          ? "border-rose-500"
                          : "border-gray-300"
                      }`}
                      placeholder="Enter Pay Head"
                    />

                    <ErrorMessage error={errors.payHead} />
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Ledger Name <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.ledgerName || ""}
                        readOnly={!!selectedInvoice}
                        onChange={(e) =>
                          handleChange("ledgerName", e.target.value)
                        }
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                          showErrors && errors.ledgerName
                            ? "border-rose-500"
                            : "border-gray-300"
                        }`}
                        placeholder="Ledger name"
                      />
                      <ErrorMessage error={errors.ledgerName} />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Invoice Date <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.invoiceDate || ""}
                        onChange={(e) =>
                          handleChange("invoiceDate", e.target.value)
                        }
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                          showErrors && errors.invoiceDate
                            ? "border-rose-500"
                            : "border-gray-300"
                        }`}
                      />
                      <ErrorMessage error={errors.invoiceDate} />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Impact Month
                      </label>
                      <input
                        type="text"
                        value={formData.impactMonth || ""}
                        onChange={(e) =>
                          handleChange("impactMonth", e.target.value)
                        }
                        className="w-full bg-white border border-gray-300 px-4 py-2.5 rounded-lg"
                        placeholder="MM/YY (e.g. 04/26)"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Auto from Invoice Date
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financial Details */}
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider mb-4">
                    Financial Details & Auto-Calculations
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Invoice No <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.invoiceNo || ""}
                        onChange={(e) =>
                          handleChange("invoiceNo", e.target.value)
                        }
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                          showErrors && errors.invoiceNo
                            ? "border-rose-500"
                            : "border-gray-300"
                        }`}
                        placeholder="INV-001"
                      />
                      <ErrorMessage error={errors.invoiceNo} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-2">
                        Pay (Service Charge)
                      </label>
                      <input
                        type="number"
                        value={formData.pay || ""}
                        onChange={(e) => handleChange("pay", e.target.value)}
                        className="w-full border px-4 py-2 rounded-lg"
                        placeholder="₹ 0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Verto Fee <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.vertoFee || ""}
                        onChange={(e) =>
                          handleChange("vertoFee", e.target.value)
                        }
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                          showErrors && errors.vertoFee
                            ? "border-rose-500"
                            : "border-gray-300"
                        }`}
                        placeholder="₹ 0"
                      />
                      <ErrorMessage error={errors.vertoFee} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        GST 18%
                      </label>

                      <input
                        type="number"
                        value={formData.gst || ""}
                        onChange={(e) => handleChange("gst", e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-lg font-mono ${
                          gstMismatch
                            ? "border-red-500 bg-red-50"
                            : "border-gray-300 bg-white"
                        }`}
                        placeholder="Enter GST"
                      />
                      {gstMismatch && (
                        <p className="text-red-500 text-xs mt-1">
                          ❌ GST mismatch (Expected ₹ {expectedGST.toFixed(2)})
                        </p>
                      )}
                    </div>{" "}
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Invoice Value
                      </label>
                      <input
                        type="number"
                        value={formData.invoiceValue || ""}
                        onChange={(e) =>
                          handleChange("invoiceValue", e.target.value)
                        }
                        className={`w-full px-4 py-2.5 rounded-lg font-bold ${
                          invoiceMismatch
                            ? "border-red-500 bg-red-50"
                            : "border-gray-300 bg-white"
                        }`}
                      />

                      {invoiceMismatch && (
                        <p className="text-red-500 text-xs mt-1">
                          ❌ Invoice mismatch (Expected ₹{" "}
                          {expectedInvoice.toFixed(2)})
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        TDS
                      </label>
                      <input
                        type="number"
                        value={formData.tds || ""}
                        onChange={(e) => handleChange("tds", e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-lg font-mono ${
                          tdsMismatch
                            ? "border-red-500 bg-red-50"
                            : "border-gray-300 bg-white"
                        }`}
                      />

                      {tdsMismatch && (
                        <p className="text-red-500 text-xs mt-1">
                          ❌ TDS mismatch (Expected ₹ {expectedTDS.toFixed(2)})
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Verto Fee (Post TDS)
                      </label>
                      <input
                        type="text"
                        value={formData.vertoFeePostTds}
                        readOnly
                        className="w-full bg-emerald-100 border border-emerald-300 text-emerald-700 px-4 py-2.5 rounded-lg font-mono font-bold"
                        placeholder="Auto-calculated"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Receivable Rs
                      </label>
                      <input
                        type="text"
                        value={formData.receivableRs || ""}
                        readOnly
                        className="w-full bg-gray-100 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-mono"
                        placeholder="Auto-calculated"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Expected Collection Date{" "}
                        <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.expectedCollectionDate || ""}
                        onChange={(e) =>
                          handleChange("expectedCollectionDate", e.target.value)
                        }
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                          showErrors && errors.expectedCollectionDate
                            ? "border-rose-500"
                            : "border-gray-300"
                        }`}
                      />
                      <ErrorMessage error={errors.expectedCollectionDate} />
                      <p className="text-xs text-amber-600 mt-1">Alert Ping</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Bank Name & Acct No{" "}
                        <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        list="banks-list"
                        value={formData.bankName || ""}
                        onChange={(e) =>
                          handleChange("bankName", e.target.value)
                        }
                        className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                          showErrors && errors.bankName
                            ? "border-rose-500"
                            : "border-gray-300"
                        }`}
                        placeholder="Type or select"
                      />
                      <datalist id="banks-list">
                        {banks.map((bank) => (
                          <option key={bank.id} value={bank.bank_name} />
                        ))}
                      </datalist>
                      <ErrorMessage error={errors.bankName} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Invoice Description
                      </label>
                      <textarea
                        value={formData.invoiceDescription}
                        onChange={(e) =>
                          handleChange("invoiceDescription", e.target.value)
                        }
                        rows={2}
                        className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="Optional description"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        Ref No of payment made against Invoice (If Any)
                      </label>
                      <textarea
                        value={formData.refNoPaymentMade}
                        onChange={(e) =>
                          handleChange("refNoPaymentMade", e.target.value)
                        }
                        rows={2}
                        className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="Optional reference"
                      />
                    </div>
                  </div>
                </div>

                {/* OS Department Extra Fields */}
                {formData.department === "OS" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4"
                  >
                    <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-4">
                      Extra Fields for OS Department
                    </h3>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Employee Count{" "}
                          <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="number"
                          value={formData.employeeCount}
                          onChange={(e) =>
                            handleChange("employeeCount", e.target.value)
                          }
                          className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 ${
                            showErrors && errors.employeeCount
                              ? "border-rose-500"
                              : "border-gray-300"
                          }`}
                          placeholder="0"
                        />
                        <ErrorMessage error={errors.employeeCount} />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Gross Value <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="number"
                          value={formData.grossValue}
                          onChange={(e) =>
                            handleChange("grossValue", e.target.value)
                          }
                          className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 ${
                            showErrors && errors.grossValue
                              ? "border-rose-500"
                              : "border-gray-300"
                          }`}
                          placeholder="₹ 0"
                        />
                        <ErrorMessage error={errors.grossValue} />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Net In Hand <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="number"
                          value={formData.netInHand}
                          onChange={(e) =>
                            handleChange("netInHand", e.target.value)
                          }
                          className={`w-full bg-white border text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 ${
                            showErrors && errors.netInHand
                              ? "border-rose-500"
                              : "border-gray-300"
                          }`}
                          placeholder="₹ 0"
                        />
                        <ErrorMessage error={errors.netInHand} />
                        <p className="text-xs text-rose-600 mt-1">
                          Gross Value - Co (discuss with Sunil)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Co PF = ER PF & EE PF
                        </label>
                        <input
                          type="number"
                          value={formData.coPF}
                          onChange={(e) => handleChange("coPF", e.target.value)}
                          className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                          placeholder="₹ 0"
                        />
                        <p className="text-xs text-rose-600 mt-1">
                          Gross Value - Co
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Co ESI = ER ESIC + EE ESIC
                        </label>
                        <input
                          type="number"
                          value={formData.coESI}
                          onChange={(e) =>
                            handleChange("coESI", e.target.value)
                          }
                          className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                          placeholder="₹ 0"
                        />
                        <p className="text-xs text-rose-600 mt-1">
                          Gross Value - Co
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          LWF Tax
                        </label>
                        <input
                          type="number"
                          value={formData.lwfTax}
                          onChange={(e) =>
                            handleChange("lwfTax", e.target.value)
                          }
                          className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                          placeholder="₹ 0"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          PT Tax
                        </label>
                        <input
                          type="number"
                          value={formData.ptTax}
                          onChange={(e) =>
                            handleChange("ptTax", e.target.value)
                          }
                          className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                          placeholder="₹ 0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Other Ded
                        </label>
                        <input
                          type="number"
                          value={formData.otherDed}
                          onChange={(e) =>
                            handleChange("otherDed", e.target.value)
                          }
                          className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                          placeholder="₹ 0"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          (CTC)
                        </label>
                        <input
                          type="text"
                          value={formData.ctc}
                          readOnly
                          className="w-full bg-amber-100 border border-amber-300 text-amber-700 px-4 py-2.5 rounded-lg font-mono font-bold"
                          placeholder="Auto-calculated"
                        />
                        <p className="text-xs text-rose-600 mt-1">
                          Gross Value - Co
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Month of Payout
                        </label>
                        <input
                          type="text"
                          value={formData.monthOfPayout}
                          onChange={(e) =>
                            handleChange("monthOfPayout", e.target.value)
                          }
                          className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                          placeholder="e.g., Jan 2023"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Statutory Payout Date by
                        </label>
                        <input
                          type="date"
                          value={formData.statutoryPayoutDate}
                          onChange={(e) =>
                            handleChange("statutoryPayoutDate", e.target.value)
                          }
                          className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        />
                        <p className="text-xs text-amber-600 mt-1">
                          Alert Ping
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Verto Fee Payout Date by Client
                        </label>
                        <input
                          type="date"
                          value={formData.vertoFeePayoutDate}
                          onChange={(e) =>
                            handleChange("vertoFeePayoutDate", e.target.value)
                          }
                          className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        />
                        <p className="text-xs text-amber-600 mt-1">
                          Alert Ping
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-4 mt-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Expected Outflow "In hand"
                        </label>
                        <input
                          type="date"
                          value={formData.expectedOutflowInHand}
                          onChange={(e) =>
                            handleChange(
                              "expectedOutflowInHand",
                              e.target.value
                            )
                          }
                          className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Expected Outflow "PF"
                        </label>
                        <input
                          type="date"
                          value={formData.expectedOutflowPF}
                          onChange={(e) =>
                            handleChange("expectedOutflowPF", e.target.value)
                          }
                          className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          As per master due date
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Expected Outflow "ESI"
                        </label>
                        <input
                          type="date"
                          value={formData.expectedOutflowESI}
                          onChange={(e) =>
                            handleChange("expectedOutflowESI", e.target.value)
                          }
                          className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          As per master due date
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Expected Outflow "GST"
                        </label>
                        <input
                          type="date"
                          value={formData.expectedOutflowGST}
                          onChange={(e) =>
                            handleChange("expectedOutflowGST", e.target.value)
                          }
                          className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          As per master due date
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                          Expected Outflow "Tax Deducted"
                        </label>
                        <input
                          type="date"
                          value={formData.expectedOutflowTax}
                          onChange={(e) =>
                            handleChange("expectedOutflowTax", e.target.value)
                          }
                          className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          As per master due date
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/30 flex items-center space-x-2"
                  >
                    <span>Save Invoice</span>
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

export default AddInvoiceModal;
