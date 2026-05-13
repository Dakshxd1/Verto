import React, { useState, useEffect } from "react";
import supabase from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, AlertCircle, Calculator } from "lucide-react";
import { useAuth } from "../context/AuthContext";
const customRound = (num) => {
  const decimal = num - Math.floor(num);
  return decimal >= 0.75 ? Math.ceil(num) : Math.floor(num);
};
const AddInvoiceModal = ({
  isOpen,
  onClose,
  clients = [],
  entities = [],
  selectedInvoice,
}) => {
  const { role } = useAuth();
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
    tdsPercent: "",
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
    setIsManualTds(false);

    console.log("🔥 EDIT DATA FULL:", selectedInvoice);

    const selectedBank = banks.find((b) => b.id === selectedInvoice.bank_id);

    setFormData((prev) => ({
      ...prev,

      invoiceEntity: selectedInvoice?.entity_name ?? "",
      department: selectedInvoice?.dept_code ?? "",
      client: selectedInvoice?.client_name ?? "",
      ledgerName: selectedInvoice?.ledger_name ?? "",
      payHead: selectedInvoice?.pay_head ?? "",

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
  const [isManualTds, setIsManualTds] = useState(false);

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

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (["pay", "vertoFee", "tdsPercent"].includes(field)) {
      setIsManualTds(false);
    }

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  useEffect(() => {
    const pay = parseFloat(formData.pay);
    const vertoFee = parseFloat(formData.vertoFee);
    const grossValue = parseFloat(formData.grossValue);

    if (isNaN(pay) || isNaN(vertoFee)) return;
    const dept = formData.department;

    const baseAmount = vertoFee + pay + (dept === "OS" ? grossValue : 0);

    const gst = baseAmount * 0.18;

    const tdsBase = pay + vertoFee + (dept === "OS" ? grossValue : 0);

    let tdsRate;

    if (formData.tdsPercent) {
      tdsRate = Number(formData.tdsPercent) / 100;
    } else {
      tdsRate = dept === "OS" ? 0.02 : 0.1;
    }

    const invoiceValue = baseAmount + gst;

    const totalBase = pay + vertoFee + (dept === "OS" ? grossValue : 0);

    const tds = totalBase * tdsRate;

    const finalTds = isManualTds ? Number(formData.tds) || 0 : tds;
    const receivable = invoiceValue - finalTds;

    const vertoFeePostTds =
      totalBase > 0 ? vertoFee - finalTds * (vertoFee / totalBase) : 0;

    setFormData((prev) => ({
      ...prev,
      gst: gst.toFixed(2),
      tds: isManualTds ? formData.tds : tds.toFixed(2),
      invoiceValue: customRound(invoiceValue),
      receivableRs: customRound(receivable),
      vertoFeePostTds: vertoFeePostTds.toFixed(2),
    }));
  }, [
    [
      formData.pay,
      formData.vertoFee,
      formData.grossValue,
      formData.department,
      formData.tdsPercent,
      formData.tds,
      isManualTds,
    ],
  ]);

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

  const validateForm = () => {
    const newErrors = {};

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

    if (formData.department === "OS") {
      if (!formData.employeeCount)
        newErrors.employeeCount = "Employee count is required";
      if (!formData.grossValue)
        newErrors.grossValue = "Gross value is required";
      if (!formData.netInHand) newErrors.netInHand = "Net in hand is required";
    }

    const tolerance = 50;

    const vertoFeeNum = Number(formData.vertoFee) || 0;
    const payNum = Number(formData.pay) || 0;
    const grossValueNum = Number(formData.grossValue) || 0;

    const base =
      vertoFeeNum + payNum + (formData.department === "OS" ? grossValueNum : 0);

    const expectedGST = 0.18 * base;

    const tdsBase =
      payNum + vertoFeeNum + (formData.department === "OS" ? grossValueNum : 0);

    const expectedTDS =
      tdsBase *
      (formData.tdsPercent
        ? Number(formData.tdsPercent) / 100
        : formData.department === "OS"
        ? 0.02
        : 0.1);

    const expectedInvoice = base + expectedGST;

    const gstMismatch =
      Math.abs(Number(formData.gst) - expectedGST) > tolerance;

    const tdsMismatch =
      Math.abs(Number(formData.tds) - expectedTDS) > tolerance;

    const invoiceMismatch =
      Math.abs(Number(formData.invoiceValue) - expectedInvoice) > tolerance;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return false;

    if (gstMismatch || tdsMismatch || invoiceMismatch) {
      const confirmSave = window.confirm(
        "⚠️ Values mismatch detected.\nDo you still want to continue?"
      );
      return confirmSave;
    }

    return true;
  };

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

    const expectedTDS =
      tdsBase *
      (formData.tdsPercent
        ? Number(formData.tdsPercent) / 100
        : formData.department === "OS"
        ? 0.02
        : 0.1);

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
    return `20${yy}-${mm}-01`;
  };

  useEffect(() => {
    if (!formData.invoiceDate || formData.department !== "OS") return;

    const invDate = new Date(formData.invoiceDate);

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

    try {
      let clientRow;

      if (!formData.client) {
        alert("❌ Client is required");
        return;
      }

      const { data: existingClient } = await supabase
        .from("clients_master")
        .select("id")
        .ilike("client_name", `%${formData.client}%`)
        .maybeSingle();

      clientRow = existingClient;

      if (!clientRow) {
        if (role !== "admin") {
          alert("❌ Only admin can create new client");
          return;
        }

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

      if (!clientRow || !deptRow || !entityRow) {
        alert("❌ Invalid master data. Check client/entity/department.");
        return;
      }

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
      let insertedInvoice = null;

      if (selectedInvoice) {
        console.log("🔥 UPDATE MODE");

        const res = await supabase
          .from("invoices")
          .update(payload)
          .eq("id", selectedInvoice.dbId);

        error = res.error;
      } else {
        console.log("🔥 INSERT MODE");

        const res = await supabase
          .from("invoices")
          .insert([payload])
          .select()
          .single();

        error = res.error;
        insertedInvoice = res.data;

        // ✅ LINK ADVANCE PAYMENT — runs only ONCE
        if (formData.refNoPaymentMade && insertedInvoice) {
          console.log(
            "🔥 SEARCHING ADVANCE PAYMENT:",
            formData.refNoPaymentMade
          );

          const { data: advancePayment, error: advanceError } = await supabase
            .from("advance_payments")
            .select("*")
            .eq("payment_ref", formData.refNoPaymentMade)
            .maybeSingle();

          console.log("ADVANCE PAYMENT:", advancePayment);

          if (advanceError) {
            console.log(advanceError);
          }

          if (advancePayment) {
            const { error: moveError } = await supabase
              .from("payments_received")
              .insert([
                {
                  invoice_id: insertedInvoice.id,
                  amount_received: advancePayment.amount,
                  payment_date: advancePayment.payment_date,
                  payment_ref: advancePayment.payment_ref,
                },
              ]);

            if (moveError) {
              console.log(moveError);
              alert("❌ Failed to link payment");
            } else {
              await supabase
                .from("advance_payments")
                .update({
                  linked_invoice_id: insertedInvoice.id,
                  is_adjusted: true,
                })
                .eq("id", advancePayment.id);

              console.log("✅ ADVANCE PAYMENT LINKED");

              alert(
                `✅ Advance Payment Linked Successfully\nRef: ${advancePayment.payment_ref}`
              );
            }
          }
        }
        // ✅ END OF ADVANCE PAYMENT LINKING — duplicate block removed
      }

      if (error) {
        console.error("DB Error:", error);
        alert("❌ Failed: " + error.message);
        return;
      }

      alert(selectedInvoice ? "✅ Invoice updated" : "✅ Invoice created");

      if (window.refreshClients) {
        window.refreshClients();
      }

      resetForm();
      onClose();
    } catch (err) {
      console.error("❌ Supabase error:", err);
      alert("❌ Unexpected error");
    }
  };

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

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const ErrorMessage = ({ error }) => {
    if (!showErrors || !error) return null;
    return (
      <div className="flex items-center mt-1 text-xs text-rose-500">
        <AlertCircle className="w-3 h-3 mr-1" />
        {error}
      </div>
    );
  };

  // ── shared input style helpers ──────────────────────────────────
  const inp =
    "w-full bg-white border text-gray-800 px-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder-gray-400";
  const inpNormal = `${inp} border-gray-200`;
  const inpErr    = `${inp} border-rose-400 bg-rose-50`;
  const inpAuto   =
    "w-full bg-blue-50 border border-blue-200 text-blue-700 px-3.5 py-2.5 rounded-lg text-sm font-mono font-semibold";

  const fi = (field) => (showErrors && errors[field] ? inpErr : inpNormal);

  // section card wrapper
  const card = "bg-white border border-gray-200 rounded-xl p-5 shadow-sm";

  // section title
  const sectionTitle = "text-[11px] font-bold text-blue-700 uppercase tracking-widest mb-4 flex items-center gap-2";

  // label
  const lbl = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
          >
            {/* ── Header ── */}
            <div
              className="px-7 py-5 text-white relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, #1d4ed8 0%, #1e40af 60%, #1e3a8a 100%)",
              }}
            >
              {/* decorative glow blob */}
              <div
                className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(147,197,253,0.25), transparent 70%)",
                }}
              />
              <div className="relative flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {selectedInvoice ? "✏️ Edit Invoice" : "+ Add Invoice"}
                  </h2>
                  <p className="text-blue-200 text-sm mt-0.5">
                    Create new invoice with auto-calculations
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/15 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ── Form Content ── */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-82px)] bg-gray-50/60">
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Basic Invoice Details */}
                <div className={card}>
                  <h3 className={sectionTitle}>
                    <span className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
                      <Calculator className="w-3 h-3 text-white" />
                    </span>
                    Basic Invoice Information
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={lbl}>
                        Invoice Entity <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.invoiceEntity}
                        onChange={(e) =>
                          handleChange("invoiceEntity", e.target.value)
                        }
                        className={fi("invoiceEntity")}
                      >
                        <option value="">Select Entity</option>
                        {entities.map((entity, idx) => (
                          <option key={idx} value={entity}>{entity}</option>
                        ))}
                      </select>
                      <ErrorMessage error={errors.invoiceEntity} />
                      <p className="text-xs text-gray-400 mt-1">PS/PVT/LLP</p>
                    </div>

                    <div>
                      <label className={lbl}>
                        Department <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.department}
                        onChange={(e) =>
                          handleChange("department", e.target.value)
                        }
                        className={fi("department")}
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.value} value={dept.value}>{dept.label}</option>
                        ))}
                      </select>
                      <ErrorMessage error={errors.department} />
                    </div>

                    <div>
                      <label className={lbl}>
                        Client <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        list="invoice-clients-list"
                        value={formData.client || ""}
                        onChange={(e) => handleChange("client", e.target.value)}
                        className={fi("client")}
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

                  <div className="mt-4">
                    <label className={lbl}>
                      Pay Head <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.payHead || ""}
                      onChange={(e) => handleChange("payHead", e.target.value)}
                      className={fi("payHead")}
                      placeholder="Enter Pay Head"
                    />
                    <ErrorMessage error={errors.payHead} />
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className={lbl}>
                        Ledger Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.ledgerName || ""}
                        readOnly={!!selectedInvoice}
                        onChange={(e) =>
                          handleChange("ledgerName", e.target.value)
                        }
                        className={
                          selectedInvoice
                            ? `${inpNormal} bg-gray-50 text-gray-500 cursor-default`
                            : fi("ledgerName")
                        }
                        placeholder="Ledger name"
                      />
                      <ErrorMessage error={errors.ledgerName} />
                    </div>

                    <div>
                      <label className={lbl}>
                        Invoice Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.invoiceDate || ""}
                        onChange={(e) =>
                          handleChange("invoiceDate", e.target.value)
                        }
                        className={fi("invoiceDate")}
                      />
                      <ErrorMessage error={errors.invoiceDate} />
                    </div>

                    <div>
                      <label className={lbl}>Impact Month</label>
                      <input
                        type="text"
                        value={formData.impactMonth || ""}
                        onChange={(e) =>
                          handleChange("impactMonth", e.target.value)
                        }
                        className={inpNormal}
                        placeholder="MM/YY (e.g. 04/26)"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Auto from Invoice Date
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financial Details */}
                <div className={card}>
                  <h3 className={sectionTitle}>
                    <span className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center shrink-0 text-white font-bold text-[10px]">
                      ₹
                    </span>
                    Financial Details &amp; Auto-Calculations
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={lbl}>
                        Invoice No <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.invoiceNo || ""}
                        onChange={(e) =>
                          handleChange("invoiceNo", e.target.value)
                        }
                        className={fi("invoiceNo")}
                        placeholder="INV-001"
                      />
                      <ErrorMessage error={errors.invoiceNo} />
                    </div>
                    <div>
                      <label className={lbl}>Pay (Service Charge)</label>
                      <input
                        type="number"
                        value={formData.pay || ""}
                        onChange={(e) => handleChange("pay", e.target.value)}
                        className={inpNormal}
                        placeholder="₹ 0"
                      />
                    </div>
                    <div>
                      <label className={lbl}>
                        Verto Fee <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.vertoFee || ""}
                        onChange={(e) =>
                          handleChange("vertoFee", e.target.value)
                        }
                        className={fi("vertoFee")}
                        placeholder="₹ 0"
                      />
                      <ErrorMessage error={errors.vertoFee} />
                    </div>
                    <div>
                      <label className={lbl}>GST 18%</label>
                      <input
                        type="number"
                        value={formData.gst || ""}
                        onChange={(e) => handleChange("gst", e.target.value)}
                        className={
                          gstMismatch
                            ? `${inp} border-red-400 bg-red-50`
                            : inpNormal
                        }
                        placeholder="Enter GST"
                      />
                      {gstMismatch && (
                        <p className="text-red-500 text-xs mt-1">
                          ❌ GST mismatch (Expected ₹ {expectedGST.toFixed(2)})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className={lbl}>Invoice Value</label>
                      <input
                        type="number"
                        value={formData.invoiceValue || ""}
                        onChange={(e) =>
                          handleChange("invoiceValue", e.target.value)
                        }
                        className={
                          invoiceMismatch
                            ? `${inp} border-red-400 bg-red-50 font-bold`
                            : `${inpNormal} font-bold`
                        }
                      />
                      {invoiceMismatch && (
                        <p className="text-red-500 text-xs mt-1">
                          ❌ Invoice mismatch (Expected ₹{" "}
                          {expectedInvoice.toFixed(2)})
                        </p>
                      )}
                    </div>

                    <div>
                      <label className={lbl}>TDS %</label>
                      <input
                        type="number"
                        value={formData.tdsPercent || ""}
                        onChange={(e) =>
                          handleChange("tdsPercent", e.target.value)
                        }
                        className={inpNormal}
                        placeholder="Enter %"
                      />
                    </div>

                    <div>
                      <label className={lbl}>TDS</label>
                      <input
                        type="number"
                        value={formData.tds || ""}
                        onChange={(e) => {
                          handleChange("tds", e.target.value);
                          setIsManualTds(true);
                        }}
                        className={
                          tdsMismatch
                            ? `${inp} border-red-400 bg-red-50`
                            : inpNormal
                        }
                      />
                      {tdsMismatch && (
                        <p className="text-red-500 text-xs mt-1">
                          ❌ TDS mismatch (Expected ₹ {expectedTDS.toFixed(2)})
                        </p>
                      )}
                    </div>

                    <div>
                      <label className={lbl}>Verto Fee (Post TDS)</label>
                      <input
                        type="text"
                        value={formData.vertoFeePostTds}
                        readOnly
                        className={inpAuto}
                        placeholder="Auto-calculated"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className={lbl}>Receivable Rs</label>
                      <input
                        type="text"
                        value={formData.receivableRs || ""}
                        readOnly
                        className={inpAuto}
                        placeholder="Auto-calculated"
                      />
                    </div>

                    <div>
                      <label className={lbl}>
                        Expected Collection Date{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.expectedCollectionDate || ""}
                        onChange={(e) =>
                          handleChange("expectedCollectionDate", e.target.value)
                        }
                        className={fi("expectedCollectionDate")}
                      />
                      <ErrorMessage error={errors.expectedCollectionDate} />
                      <p className="text-xs text-amber-500 mt-1">📌 Alert Ping</p>
                    </div>

                    <div>
                      <label className={lbl}>
                        Bank Name &amp; Acct No{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        list="banks-list"
                        value={formData.bankName || ""}
                        onChange={(e) =>
                          handleChange("bankName", e.target.value)
                        }
                        className={fi("bankName")}
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
                      <label className={lbl}>Invoice Description</label>
                      <textarea
                        value={formData.invoiceDescription}
                        onChange={(e) =>
                          handleChange("invoiceDescription", e.target.value)
                        }
                        rows={2}
                        className={`${inpNormal} resize-none`}
                        placeholder="Optional description"
                      />
                    </div>

                    <div>
                      <label className={lbl}>
                        Ref No of payment made against Invoice (If Any)
                      </label>
                      <textarea
                        value={formData.refNoPaymentMade}
                        onChange={(e) =>
                          handleChange("refNoPaymentMade", e.target.value)
                        }
                        rows={2}
                        className={`${inpNormal} resize-none`}
                        placeholder="e.g. PI-DD-120526-01"
                      />
                      <p className="text-xs text-amber-500 mt-1">
                        Enter advance payment ref to auto-link
                      </p>
                    </div>
                  </div>
                </div>

                {/* OS Department Extra Fields */}
                {formData.department === "OS" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={card}
                  >
                    <h3 className={sectionTitle}>
                      <span className="w-5 h-5 rounded-md bg-amber-500 flex items-center justify-center shrink-0 text-white font-bold text-[10px]">
                        OS
                      </span>
                      Extra Fields for OS Department
                    </h3>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className={lbl}>
                          Employee Count{" "}
                          <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={formData.employeeCount}
                          onChange={(e) =>
                            handleChange("employeeCount", e.target.value)
                          }
                          className={fi("employeeCount")}
                          placeholder="0"
                        />
                        <ErrorMessage error={errors.employeeCount} />
                      </div>

                      <div>
                        <label className={lbl}>
                          Gross Value <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={formData.grossValue}
                          onChange={(e) =>
                            handleChange("grossValue", e.target.value)
                          }
                          className={fi("grossValue")}
                          placeholder="₹ 0"
                        />
                        <ErrorMessage error={errors.grossValue} />
                      </div>

                      <div>
                        <label className={lbl}>
                          Net In Hand <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={formData.netInHand}
                          onChange={(e) =>
                            handleChange("netInHand", e.target.value)
                          }
                          className={fi("netInHand")}
                          placeholder="₹ 0"
                        />
                        <ErrorMessage error={errors.netInHand} />
                        <p className="text-xs text-rose-500 mt-1">
                          Gross Value - Co (discuss with Sunil)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div>
                        <label className={lbl}>Co PF = ER PF &amp; EE PF</label>
                        <input
                          type="number"
                          value={formData.coPF}
                          onChange={(e) => handleChange("coPF", e.target.value)}
                          className={inpNormal}
                          placeholder="₹ 0"
                        />
                        <p className="text-xs text-rose-500 mt-1">Gross Value - Co</p>
                      </div>

                      <div>
                        <label className={lbl}>Co ESI = ER ESIC + EE ESIC</label>
                        <input
                          type="number"
                          value={formData.coESI}
                          onChange={(e) =>
                            handleChange("coESI", e.target.value)
                          }
                          className={inpNormal}
                          placeholder="₹ 0"
                        />
                        <p className="text-xs text-rose-500 mt-1">Gross Value - Co</p>
                      </div>

                      <div>
                        <label className={lbl}>LWF Tax</label>
                        <input
                          type="number"
                          value={formData.lwfTax}
                          onChange={(e) =>
                            handleChange("lwfTax", e.target.value)
                          }
                          className={inpNormal}
                          placeholder="₹ 0"
                        />
                      </div>

                      <div>
                        <label className={lbl}>PT Tax</label>
                        <input
                          type="number"
                          value={formData.ptTax}
                          onChange={(e) =>
                            handleChange("ptTax", e.target.value)
                          }
                          className={inpNormal}
                          placeholder="₹ 0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className={lbl}>Other Ded</label>
                        <input
                          type="number"
                          value={formData.otherDed}
                          onChange={(e) =>
                            handleChange("otherDed", e.target.value)
                          }
                          className={inpNormal}
                          placeholder="₹ 0"
                        />
                      </div>

                      <div>
                        <label className={lbl}>(CTC)</label>
                        <input
                          type="text"
                          value={formData.ctc}
                          readOnly
                          className={inpAuto}
                          placeholder="Auto-calculated"
                        />
                        <p className="text-xs text-rose-500 mt-1">Gross Value - Co</p>
                      </div>

                      <div>
                        <label className={lbl}>Month of Payout</label>
                        <input
                          type="text"
                          value={formData.monthOfPayout}
                          onChange={(e) =>
                            handleChange("monthOfPayout", e.target.value)
                          }
                          className={inpNormal}
                          placeholder="e.g., Jan 2023"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className={lbl}>Statutory Payout Date by</label>
                        <input
                          type="date"
                          value={formData.statutoryPayoutDate}
                          onChange={(e) =>
                            handleChange("statutoryPayoutDate", e.target.value)
                          }
                          className={inpNormal}
                        />
                        <p className="text-xs text-amber-500 mt-1">📌 Alert Ping</p>
                      </div>

                      <div>
                        <label className={lbl}>
                          Verto Fee Payout Date by Client
                        </label>
                        <input
                          type="date"
                          value={formData.vertoFeePayoutDate}
                          onChange={(e) =>
                            handleChange("vertoFeePayoutDate", e.target.value)
                          }
                          className={inpNormal}
                        />
                        <p className="text-xs text-amber-500 mt-1">📌 Alert Ping</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-4 mt-4">
                      <div>
                        <label className={lbl}>
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
                          className={inpNormal}
                        />
                      </div>

                      <div>
                        <label className={lbl}>Expected Outflow "PF"</label>
                        <input
                          type="date"
                          value={formData.expectedOutflowPF}
                          onChange={(e) =>
                            handleChange("expectedOutflowPF", e.target.value)
                          }
                          className={inpNormal}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          As per master due date
                        </p>
                      </div>

                      <div>
                        <label className={lbl}>Expected Outflow "ESI"</label>
                        <input
                          type="date"
                          value={formData.expectedOutflowESI}
                          onChange={(e) =>
                            handleChange("expectedOutflowESI", e.target.value)
                          }
                          className={inpNormal}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          As per master due date
                        </p>
                      </div>

                      <div>
                        <label className={lbl}>Expected Outflow "GST"</label>
                        <input
                          type="date"
                          value={formData.expectedOutflowGST}
                          onChange={(e) =>
                            handleChange("expectedOutflowGST", e.target.value)
                          }
                          className={inpNormal}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          As per master due date
                        </p>
                      </div>

                      <div>
                        <label className={lbl}>
                          Expected Outflow "Tax Deducted"
                        </label>
                        <input
                          type="date"
                          value={formData.expectedOutflowTax}
                          onChange={(e) =>
                            handleChange("expectedOutflowTax", e.target.value)
                          }
                          className={inpNormal}
                        />
                        <p className="text-xs text-gray-400 mt-1">
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
                    className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-all hover:brightness-110"
                    style={{
                      background:
                        "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                      boxShadow: "0 4px 14px rgba(37,99,235,0.4)",
                    }}
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