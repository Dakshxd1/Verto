import React, { useState, useEffect, useRef } from "react";
import supabase from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { usePerms } from "../context/PermissionsContext";
import {
  X,
  ArrowRight,
  AlertCircle,
  Calculator,
  Search,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const customRound = (num) => {
  const decimal = num - Math.floor(num);
  return decimal >= 0.75 ? Math.ceil(num) : Math.floor(num);
};

const ClientSearchInput = ({
  value,
  onChange,
  clients,
  role,
  className,
  error,
}) => {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value || "");
  const wrapRef = useRef(null);

  useEffect(() => {
    setInputVal(value || "");
  }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = clients.filter((c) =>
    c.client_name.toLowerCase().includes(inputVal.toLowerCase())
  );
  const exactMatch = clients.some(
    (c) => c.client_name.toLowerCase() === inputVal.toLowerCase()
  );
  const showCreate =
    role === "admin" && inputVal.trim().length > 0 && !exactMatch;

  const pick = (name) => {
    setInputVal(name);
    onChange(name);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (inputVal.length > 0) setOpen(true);
          }}
          placeholder="Type to search or add client…"
          className={`${className} pl-9`}
        />
      </div>
      {open && (filtered.length > 0 || showCreate) && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                pick(c.client_name);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm text-gray-800 border-b border-gray-100 last:border-0 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              {c.client_name}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                pick(inputVal.trim());
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm font-semibold text-blue-700 flex items-center gap-2 border-t border-gray-100"
            >
              <Plus className="w-4 h-4 text-blue-600 flex-shrink-0" />
              Create new client &ldquo;{inputVal.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
      {exactMatch && inputVal.trim() && (
        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Existing client
        </p>
      )}
      {showCreate && !open && (
        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
          <Plus className="w-3 h-3" /> New client — will be created on save
        </p>
      )}
    </div>
  );
};

const AddInvoiceModal = ({
  isOpen,
  onClose,
  clients = [],
  selectedInvoice,
}) => {
  const { role } = useAuth();
  const [entitiesList, setEntitiesList] = useState([]);
  const { canSave, isIntern } = usePerms();
  
  // State for ref dropdown
  const [availableRefs, setAvailableRefs] = useState([]);
  const [refSearchQuery, setRefSearchQuery] = useState("");
  const [showRefDropdown, setShowRefDropdown] = useState(false);
  const refDropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    invoiceEntity: "",
    department: "",
    payHead: "",
    employeeName: "",
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
    refNoPaymentMade: [""],
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

  const [isManualTds, setIsManualTds] = useState(false);
  const [isManualGst, setIsManualGst] = useState(false);
  const [isManualReceivable, setIsManualReceivable] = useState(false);

  const [banks, setBanks] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [errors, setErrors] = useState({});
  const [showErrors, setShowErrors] = useState(false);

  const departments = [
    { value: "OS", label: "OS (Operations)" },
    { value: "REC", label: "REC (Recruitment)" },
    { value: "TEMP", label: "TEMP (Temporary)" },
    { value: "PROJ", label: "PROJ (Projects)" },
    { value: "OTH", label: "OTH (Others)" },
  ];

  const fetchMasters = async () => {
    const [banksRes, clientsRes, entitiesRes] = await Promise.all([
      supabase.from("bank_master").select("id, bank_name"),
      supabase
        .from("clients_master")
        .select("id, client_name, ledger_name")
        .order("client_name"),
      supabase
        .from("entity_master")
        .select("id, entity_name")
        .order("entity_name"),
    ]);
    if (!banksRes.error) setBanks(banksRes.data || []);
    if (!clientsRes.error) setClientsList(clientsRes.data || []);
    if (!entitiesRes.error) setEntitiesList(entitiesRes.data || []);
  };

  // Fetch available refs
  const fetchAvailableRefs = async () => {
    const [catRes, apRes] = await Promise.all([
      // CA- refs: client advance — money given TO client (red — outflow)
      // Show only Pending or Partially Paid (not Closed = fully recovered)
      supabase
        .from("client_advance_tracker")
        .select("ref_no, client_name, amount, date, status, paid_back, pending_due")
        .not("status", "eq", "Closed")
        .order("date", { ascending: false }),
      // PR- refs from advance_payments: client paid advance before invoice (green — inflow)
      // Show only not yet adjusted
      supabase
        .from("advance_payments")
        .select("payment_ref, client_name, amount, payment_date, is_adjusted")
        .eq("is_adjusted", false)
        .order("payment_date", { ascending: false }),
    ]);

    // CA- refs — red (outflow: advance GIVEN to client, needs to be recovered)
    const caRefs = (catRes.data || []).map((r) => ({
      ref: r.ref_no,
      client_name: r.client_name,
      amount: r.amount,
      date: r.date,
      flow: "out",                  // red — money went out
      type: "Client Advance",
      label: "CA",
      status: r.status,
      pending_due: r.pending_due,
      paid_back: r.paid_back,
    }));

    // PR- refs from advance_payments — green (inflow: client paid advance)
    const prRefs = (apRes.data || []).map((r) => ({
      ref: r.payment_ref,
      client_name: r.client_name,
      amount: r.amount,
      date: r.payment_date,
      flow: "in",                   // green — money came in
      type: "Payment Advance",
      label: "PR",
      status: "Available",
      pending_due: r.amount,
      paid_back: 0,
    }));

    setAvailableRefs([...caRefs, ...prRefs]);
  };

  useEffect(() => {
    if (isOpen) {
      fetchMasters();
      fetchAvailableRefs();
    }
  }, [isOpen]);

  // Close ref dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (refDropdownRef.current && !refDropdownRef.current.contains(e.target)) {
        setShowRefDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const mergedClients = React.useMemo(() => {
    const map = new Map();
    clients.forEach((name) => {
      if (typeof name === "string")
        map.set(name.toLowerCase(), { id: name, client_name: name });
    });
    clientsList.forEach((c) => map.set(c.client_name.toLowerCase(), c));
    return Array.from(map.values()).sort((a, b) =>
      a.client_name.localeCompare(b.client_name)
    );
  }, [clients, clientsList]);

  // Auto-fetch ledger when client changes
  useEffect(() => {
    if (!formData.client) return;
    const match = clientsList.find(
      (c) => c.client_name.toLowerCase() === formData.client.toLowerCase()
    );
    if (match?.ledger_name) {
      setFormData((prev) => ({ ...prev, ledgerName: match.ledger_name }));
    }
  }, [formData.client, clientsList]);

  // Populate form on edit — wait for banks to load
  useEffect(() => {
    if (!selectedInvoice || banks.length === 0) return;
    setIsManualTds(false);
    setIsManualGst(false);
    setIsManualReceivable(false);

    const selectedBank =
      banks.find((b) => b.id === selectedInvoice.bank_id) ||
      banks.find((b) => b.bank_name === selectedInvoice.bank_name);

    setFormData((prev) => ({
      ...prev,
      invoiceEntity: selectedInvoice?.entity_name ?? "",
      department: selectedInvoice?.dept_code ?? "",
      employeeName: selectedInvoice?.employee_name ?? "",
      client: selectedInvoice?.client_name ?? "",
      ledgerName: selectedInvoice?.ledger_name ?? "",
      payHead: selectedInvoice?.pay_head ?? "",
      bankName: selectedBank?.bank_name ?? selectedInvoice?.bank_name ?? "",
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
      refNoPaymentMade:
        selectedInvoice?.advance_ref_nos?.length > 0
          ? selectedInvoice.advance_ref_nos
          : [""],
    }));
  }, [selectedInvoice, banks]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (["pay", "vertoFee", "tdsPercent", "grossValue"].includes(field)) {
      setIsManualTds(false);
      if (["pay", "vertoFee", "grossValue"].includes(field)) {
        setIsManualGst(false);
      }
    }
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Core auto-calculation
  useEffect(() => {
    const pay = parseFloat(formData.pay);
    const vertoFee = parseFloat(formData.vertoFee);
    const grossValue = parseFloat(formData.grossValue) || 0;
    if (isNaN(pay) || isNaN(vertoFee)) return;

    const dept = formData.department;
    const isOS = dept === "OS";
    const baseAmount = vertoFee + pay;
    const tdsBase = pay + vertoFee;
    const gstCalc = baseAmount * 0.18;

    let tdsRate;
    if (formData.tdsPercent) {
      tdsRate = Number(formData.tdsPercent) / 100;
    } else {
      tdsRate = isOS ? 0.02 : 0.1;
    }

    const tdsCalc = tdsBase * tdsRate;
    const finalTds = isManualTds ? Number(formData.tds) || 0 : tdsCalc;
    const vertoFeePostTds =
      tdsBase > 0 ? vertoFee - finalTds * (vertoFee / tdsBase) : 0;

    if (isOS) {
      const finalGst = isManualGst ? Number(formData.gst) || 0 : gstCalc;
      const invoiceCalc = baseAmount + finalGst;
      const invoiceValueNum = isManualReceivable
        ? Number(formData.invoiceValue) || 0
        : invoiceCalc;
      const receivableCalc = invoiceValueNum - finalTds;
      const finalReceivable = isManualReceivable
        ? Number(formData.receivableRs) || 0
        : receivableCalc;

      setFormData((prev) => ({
        ...prev,
        gst: isManualGst ? prev.gst : gstCalc.toFixed(2),
        tds: isManualTds ? prev.tds : tdsCalc.toFixed(2),
        invoiceValue: isManualReceivable
          ? prev.invoiceValue
          : customRound(invoiceCalc),
        receivableRs: isManualReceivable
          ? prev.receivableRs
          : isNaN(receivableCalc)
          ? ""
          : customRound(receivableCalc),
        vertoFeePostTds: vertoFeePostTds.toFixed(2),
      }));
    } else {
      const invoiceValue = baseAmount + gstCalc;
      const receivable = invoiceValue - finalTds;

      setFormData((prev) => ({
        ...prev,
        gst: gstCalc.toFixed(2),
        tds: isManualTds ? prev.tds : tdsCalc.toFixed(2),
        invoiceValue: customRound(invoiceValue),
        receivableRs: customRound(receivable),
        vertoFeePostTds: vertoFeePostTds.toFixed(2),
      }));
    }
  }, [
    formData.pay,
    formData.vertoFee,
    formData.grossValue,
    formData.department,
    formData.tdsPercent,
    formData.tds,
    formData.invoiceValue,
    isManualTds,
    isManualGst,
    isManualReceivable,
  ]);

  // OS CTC auto-calc
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

  // OS outflow dates
  useEffect(() => {
    if (!formData.invoiceDate || formData.department !== "OS") return;
    const invDate = new Date(formData.invoiceDate);
    const year = invDate.getFullYear();
    const month = invDate.getMonth();
    const nextMonth = new Date(invDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextYear = nextMonth.getFullYear();
    const nextMon = nextMonth.getMonth();
    const fmt = (y, m, d) =>
      `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    setFormData((prev) => ({
      ...prev,
      expectedOutflowPF: fmt(year, month, 15),
      expectedOutflowESI: fmt(year, month, 15),
      expectedOutflowGST: fmt(nextYear, nextMon, 20),
      expectedOutflowTax: fmt(nextYear, nextMon, 7),
    }));
  }, [formData.invoiceDate, formData.department]);

  const getMismatchData = (fd) => {
    const tolerance = 50;
    const vertoFeeNum = Number(fd.vertoFee) || 0;
    const payNum = Number(fd.pay) || 0;
    const isOS = fd.department === "OS";
    const base = vertoFeeNum + payNum;
    const expectedGST = 0.18 * base;
    const tdsBase = payNum + vertoFeeNum;
    const tdsRate = fd.tdsPercent
      ? Number(fd.tdsPercent) / 100
      : isOS
      ? 0.02
      : 0.1;
    const expectedTDS = tdsBase * tdsRate;
    const expectedInvoice = base + expectedGST;
    const invoiceValueNum = Number(fd.invoiceValue) || 0;
    const expectedReceivable = isOS
      ? invoiceValueNum - Number(fd.tds || expectedTDS)
      : expectedInvoice - Number(fd.tds || expectedTDS);
    return {
      gstMismatch: Math.abs(Number(fd.gst) - expectedGST) > tolerance,
      tdsMismatch: Math.abs(Number(fd.tds) - expectedTDS) > tolerance,
      invoiceMismatch: isOS
        ? false
        : Math.abs(Number(fd.invoiceValue) - expectedInvoice) > tolerance,
      receivableMismatch: isOS
        ? Math.abs(Number(fd.receivableRs) - expectedReceivable) > tolerance
        : false,
      expectedGST,
      expectedTDS,
      expectedInvoice,
      expectedReceivable,
    };
  };

  const mismatch = getMismatchData(formData);
  const {
    gstMismatch,
    tdsMismatch,
    invoiceMismatch,
    receivableMismatch,
    expectedGST,
    expectedTDS,
    expectedInvoice,
    expectedReceivable,
  } = mismatch;
  const hasMismatch =
    gstMismatch ||
    tdsMismatch ||
    invoiceMismatch ||
    (formData.department === "OS" && receivableMismatch);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.invoiceEntity) newErrors.invoiceEntity = "Entity is required";
    if (!formData.department) newErrors.department = "Department is required";
    if (
      ["REC", "TEMP"].includes(formData.department) &&
      !formData.employeeName.trim()
    ) {
      newErrors.employeeName = "Employee name is required for REC/TEMP";
    }
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
      if (!formData.invoiceValue)
        newErrors.invoiceValue = "Invoice value is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatImpactMonth = (val) => {
    if (!val) return null;
    const [mm, yy] = val.split("/");
    return `20${yy}-${mm}-01`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowErrors(true);
    if (!validateForm()) return;

    try {
      if (!formData.client) {
        alert("❌ Client is required");
        return;
      }

      // Parse refs from the refNoPaymentMade field
      const refs = Array.isArray(formData.refNoPaymentMade)
        ? formData.refNoPaymentMade.filter((r) => r.trim())
        : formData.refNoPaymentMade
        ? [formData.refNoPaymentMade].filter((r) => r.trim())
        : [];

      const { data: existingClient } = await supabase
        .from("clients_master")
        .select("id")
        .ilike("client_name", `%${formData.client}%`)
        .maybeSingle();

      let clientRow = existingClient;

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
        await fetchMasters();
        if (window.refreshClients) window.refreshClients();
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

      if (hasMismatch) {
        const isOS = formData.department === "OS";
        let mismatchDetails = "⚠️ Values mismatch detected:\n\n";
        if (gstMismatch)
          mismatchDetails += `• GST: Entered ₹${Number(formData.gst).toFixed(
            2
          )} | Expected ₹${expectedGST.toFixed(2)}\n`;
        if (tdsMismatch)
          mismatchDetails += `• TDS: Entered ₹${Number(formData.tds).toFixed(
            2
          )} | Expected ₹${expectedTDS.toFixed(2)}\n`;
        if (invoiceMismatch)
          mismatchDetails += `• Invoice Value: Entered ₹${Number(
            formData.invoiceValue
          ).toFixed(2)} | Expected ₹${expectedInvoice.toFixed(2)}\n`;
        if (isOS && receivableMismatch)
          mismatchDetails += `• Receivable: Entered ₹${Number(
            formData.receivableRs
          ).toFixed(2)} | Expected ₹${expectedReceivable.toFixed(2)}\n`;
        mismatchDetails += "\nDo you still want to save?";
        if (!window.confirm(mismatchDetails)) return;
      }

      const selectedBank = banks.find((b) => b.bank_name === formData.bankName);
      if (!selectedBank || !selectedBank.id) {
        alert("❌ Invalid Bank Selected");
        return;
      }

      // Base payload — all editable fields
      const payload = {
        invoice_number: formData.invoiceNo,
        employee_name: formData.employeeName || null,
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
        advance_ref_nos: refs.length > 0 ? refs : [],
      };

      let error;
      let insertedInvoice = null;

      if (selectedInvoice) {
        const { receivable_amount, ...editableFields } = payload;
        const res = await supabase
          .from("invoices")
          .update(editableFields)
          .eq("id", selectedInvoice.dbId);
        error = res.error;

        // Link NEW advance_payments (PI- refs) on edit
        // CA- refs are handled by DB trigger automatically
        if (!error && refs.length > 0) {
          const oldRefs = Array.isArray(selectedInvoice?.advance_ref_nos)
            ? selectedInvoice.advance_ref_nos
            : [];
          const newRefs = refs.filter((r) => r.trim() && !oldRefs.includes(r));

          for (const ref of newRefs) {
            // Fetch advance payment — including already-adjusted ones
            const { data: advancePayment } = await supabase
              .from("advance_payments")
              .select("*")
              .eq("payment_ref", ref)
              .maybeSingle();

              if (!advancePayment) {
                if (ref.startsWith("CA-")) {
                  // CA- refs are handled by DB trigger via client_advance_tracker
                  // No JS action needed here
                  continue;
                }
                alert(`⚠️ Ref "${ref}" not found in advance payments`);
                continue;
              }

            // Block only if linked to a DIFFERENT invoice
            if (
              advancePayment.linked_invoice_id &&
              advancePayment.linked_invoice_id !== selectedInvoice.dbId
            ) {
              alert(`⚠️ Ref "${ref}" is already linked to a different invoice`);
              continue;
            }

            // Check if payments_received row already exists for this invoice + ref
            const { data: existingPR } = await supabase
              .from("payments_received")
              .select("id")
              .eq("invoice_id", selectedInvoice.dbId)
              .eq("payment_ref", ref)
              .maybeSingle();

            if (existingPR) {
              // Already linked — just make sure advance_payments is marked correctly
              await supabase
                .from("advance_payments")
                .update({
                  linked_invoice_id: selectedInvoice.dbId,
                  is_adjusted: true,
                })
                .eq("id", advancePayment.id);
              alert(`ℹ️ Ref "${ref}" was already linked — confirmed.`);
              continue;
            }

            // Insert into payments_received
            const { error: prErr } = await supabase
              .from("payments_received")
              .insert([
                {
                  invoice_id: selectedInvoice.dbId,
                  amount_received: advancePayment.amount,
                  payment_date: advancePayment.payment_date,
                  payment_ref: advancePayment.payment_ref,
                },
              ]);

            if (prErr) {
              alert(`❌ Failed to link ref "${ref}": ${prErr.message}`);
            } else {
              await supabase
                .from("advance_payments")
                .update({
                  linked_invoice_id: selectedInvoice.dbId,
                  is_adjusted: true,
                })
                .eq("id", advancePayment.id);
              alert(`✅ Advance payment "${ref}" linked successfully`);
            }
            // CA- refs: handled automatically by DB trigger — no action needed here
          }
        }
      } else {
        const res = await supabase
          .from("invoices")
          .insert([payload])
          .select()
          .single();
        error = res.error;
        insertedInvoice = res.data;

        // Link advance payment if ref provided (keep this existing logic)
        if (refs.length > 0 && insertedInvoice) {
          for (const ref of refs) {
            const { data: advancePayment, error: advanceError } = await supabase
              .from("advance_payments")
              .select("*")
              .eq("payment_ref", ref)
              .maybeSingle();

            if (advanceError) console.log(advanceError);

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
                alert(
                  `✅ Advance Payment Linked Successfully\nRef: ${advancePayment.payment_ref}`
                );
              }
            }
          }
        }

        // ══════════════════════════════════════════════════════════════
        // LINK CLIENT ADVANCE TRACKER REF → OS PAYOUTS
        // THIS BLOCK HAS BEEN DELETED - DB TRIGGER HANDLES IT NOW
        // ══════════════════════════════════════════════════════════════
      }

      if (error) {
        console.error("DB Error:", error);
        alert("❌ Failed: " + error.message);
        return;
      }

      alert(selectedInvoice ? "✅ Invoice updated" : "✅ Invoice created");
      if (window.refreshClients) window.refreshClients();
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
      employeeName: "",
      client: "",
      ledgerName: "",
      invoiceDate: "",
      impactMonth: "",
      payHead: "",
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
      refNoPaymentMade: [""],
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
    setIsManualTds(false);
    setIsManualGst(false);
    setIsManualReceivable(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const inp =
    "w-full bg-white border text-gray-800 px-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder-gray-400";
  const inpNormal = `${inp} border-gray-200`;
  const inpErr = `${inp} border-rose-400 bg-rose-50`;
  const inpAuto =
    "w-full bg-blue-50 border border-blue-200 text-blue-700 px-3.5 py-2.5 rounded-lg text-sm font-mono font-semibold";

  const fi = (field) => (showErrors && errors[field] ? inpErr : inpNormal);
  const card = "bg-white border border-gray-200 rounded-xl p-5 shadow-sm";
  const sectionTitle =
    "text-[11px] font-bold text-blue-700 uppercase tracking-widest mb-4 flex items-center gap-2";
  const lbl =
    "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

  const ErrorMessage = ({ error }) => {
    if (!showErrors || !error) return null;
    return (
      <div className="flex items-center mt-1 text-xs text-rose-500">
        <AlertCircle className="w-3 h-3 mr-1" />
        {error}
      </div>
    );
  };

  const MismatchHint = ({ show, expected, label }) => {
    if (!show) return null;
    return (
      <p className="text-amber-600 text-xs mt-1 flex items-center gap-1">
        <AlertCircle className="w-3 h-3 shrink-0" />
        {label} mismatch — Expected ₹{Number(expected).toFixed(2)}
      </p>
    );
  };

  const isOS = formData.department === "OS";

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
            {/* Header */}
            <div
              className="px-7 py-5 text-white relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, #1d4ed8 0%, #1e40af 60%, #1e3a8a 100%)",
              }}
            >
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
                    {isOS
                      ? "OS mode — Invoice Value is manual; GST auto-fills, both overridable"
                      : "Create new invoice with auto-calculations"}
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

            {/* Form */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-82px)] bg-gray-50/60">
              <form onSubmit={handleSubmit} className="space-y-4">
                {isIntern && (
                  <div
                    style={{
                      background: "#f3e8ff",
                      border: "1px solid #a855f7",
                      borderRadius: "0.75rem",
                      padding: "0.75rem 1rem",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "#6b21a8",
                        margin: 0,
                      }}
                    >
                      <strong>Training Mode</strong> — You can explore this form
                      but cannot save changes.
                    </p>
                  </div>
                )}
                {isOS && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                    <div>
                      <span className="font-semibold">OS Invoice mode</span>
                      {" — "}
                      GST auto-fills but is editable · TDS auto from TDS% but
                      overridable ·{" "}
                      <span className="font-semibold">
                        Invoice Value must be entered manually
                      </span>
                      {" · "}Receivable auto-calculates from Invoice Value − TDS
                      but is overridable.
                    </div>
                  </motion.div>
                )}

                {/* Section 1: Basic Info */}
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
                        {entitiesList.map((entity) => (
                          <option key={entity.id} value={entity.entity_name}>
                            {entity.entity_name}
                          </option>
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
                          <option key={dept.value} value={dept.value}>
                            {dept.label}
                          </option>
                        ))}
                      </select>
                      <ErrorMessage error={errors.department} />
                    </div>

                    <div>
                      <label className={lbl}>
                        Client <span className="text-rose-500">*</span>
                        {role === "admin" && (
                          <span className="ml-1 text-blue-500 normal-case font-normal">
                            (admin can add new)
                          </span>
                        )}
                      </label>
                      <ClientSearchInput
                        value={formData.client || ""}
                        onChange={(v) => handleChange("client", v)}
                        clients={mergedClients}
                        role={role}
                        className={fi("client")}
                        error={showErrors && errors.client}
                      />
                      <ErrorMessage error={errors.client} />
                    </div>
                  </div>

                  {["REC", "TEMP"].includes(formData.department) && (
                    <div className="mt-4">
                      <label className={lbl}>
                        Employee Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.employeeName || ""}
                        onChange={(e) =>
                          handleChange("employeeName", e.target.value)
                        }
                        className={fi("employeeName")}
                        placeholder="Enter Employee Name"
                      />
                      <ErrorMessage error={errors.employeeName} />
                    </div>
                  )}

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
                        onChange={(e) =>
                          handleChange("ledgerName", e.target.value)
                        }
                        className={fi("ledgerName")}
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

                {/* Section 2: Financial Details */}
                <div className={card}>
                  <h3 className={sectionTitle}>
                    <span className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center shrink-0 text-white font-bold text-[10px]">
                      ₹
                    </span>
                    Financial Details &amp;{" "}
                    {isOS
                      ? "Partial Auto-Calculations (OS)"
                      : "Auto-Calculations"}
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
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className={lbl}>
                        GST 18%
                        {isOS && (
                          <span className="ml-1 text-amber-600 normal-case font-normal">
                            (auto-fill · editable)
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        value={formData.gst || ""}
                        onChange={(e) => {
                          handleChange("gst", e.target.value);
                          if (isOS) setIsManualGst(true);
                        }}
                        className={
                          gstMismatch
                            ? `${inp} border-amber-400 bg-amber-50`
                            : inpNormal
                        }
                        placeholder="Enter GST"
                      />
                      <MismatchHint
                        show={gstMismatch}
                        expected={expectedGST}
                        label="GST"
                      />
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
                      <label className={lbl}>
                        TDS{" "}
                        <span className="ml-1 text-gray-400 normal-case font-normal">
                          (auto · overridable)
                        </span>
                      </label>
                      <input
                        type="number"
                        value={formData.tds || ""}
                        onChange={(e) => {
                          handleChange("tds", e.target.value);
                          setIsManualTds(true);
                        }}
                        className={
                          tdsMismatch
                            ? `${inp} border-amber-400 bg-amber-50`
                            : inpNormal
                        }
                      />
                      <MismatchHint
                        show={tdsMismatch}
                        expected={expectedTDS}
                        label="TDS"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className={lbl}>
                        Invoice Value
                        {isOS && (
                          <span className="ml-1 text-rose-500 normal-case font-normal">
                            * (enter manually)
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        value={formData.invoiceValue || ""}
                        onChange={(e) =>
                          handleChange("invoiceValue", e.target.value)
                        }
                        className={
                          showErrors && errors.invoiceValue
                            ? inpErr
                            : invoiceMismatch
                            ? `${inp} border-amber-400 bg-amber-50 font-bold`
                            : `${inpNormal} font-bold`
                        }
                        placeholder={
                          isOS ? "₹ Enter manually" : "₹ Auto-calculated"
                        }
                      />
                      <ErrorMessage error={errors.invoiceValue} />
                      <MismatchHint
                        show={invoiceMismatch}
                        expected={expectedInvoice}
                        label="Invoice Value"
                      />
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

                    <div>
                      <label className={lbl}>
                        Receivable Rs
                        {isOS && (
                          <span className="ml-1 text-amber-600 normal-case font-normal">
                            (auto · overridable)
                          </span>
                        )}
                      </label>
                      {isOS ? (
                        <input
                          type="number"
                          value={formData.receivableRs || ""}
                          onChange={(e) => {
                            handleChange("receivableRs", e.target.value);
                            setIsManualReceivable(true);
                          }}
                          className={
                            receivableMismatch
                              ? `${inp} border-amber-400 bg-amber-50`
                              : inpNormal
                          }
                          placeholder="Auto: InvoiceValue − TDS − Payments received"
                        />
                      ) : (
                        <input
                          type="text"
                          value={formData.receivableRs || ""}
                          readOnly
                          className={inpAuto}
                          placeholder="Auto-calculated"
                        />
                      )}
                      <MismatchHint
                        show={isOS && receivableMismatch}
                        expected={expectedReceivable}
                        label="Receivable"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
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
                      <p className="text-xs text-amber-500 mt-1">
                        📌 Alert Ping
                      </p>
                    </div>

                    <div>
                      <label className={lbl}>
                        Bank Name &amp; Acct No{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.bankName || ""}
                        onChange={(e) =>
                          handleChange("bankName", e.target.value)
                        }
                        className={fi("bankName")}
                      >
                        <option value="">Select Bank</option>
                        {banks.map((bank) => (
                          <option key={bank.id} value={bank.bank_name}>
                            {bank.bank_name}
                          </option>
                        ))}
                      </select>
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
                        Advance Payment Ref — Link to Invoice
                      </label>
                      <div className="space-y-2">
                        {formData.refNoPaymentMade.map((ref, idx) => (
                          <div
                            key={idx}
                            className="relative"
                            ref={
                              idx === formData.refNoPaymentMade.length - 1
                                ? refDropdownRef
                                : null
                            }
                          >
                            {/* Input row */}
                            <div className="flex items-center gap-2 w-full">
                              <div className="relative flex-1 min-w-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                <input
                                  type="text"
                                  value={ref}
                                  onChange={(e) => {
                                    const updated = [
                                      ...formData.refNoPaymentMade,
                                    ];
                                    updated[idx] = e.target.value;
                                    handleChange("refNoPaymentMade", updated);
                                    setRefSearchQuery(e.target.value);
                                    setShowRefDropdown(true);
                                  }}
                                  onFocus={() => {
                                    setRefSearchQuery(ref);
                                    setShowRefDropdown(true);
                                  }}
                                  className="w-full pl-9 pr-3 bg-white border border-gray-200 text-gray-800 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder-gray-400"
                                  placeholder="Search by client name, ref no or amount…"
                                />
                              </div>
                              {formData.refNoPaymentMade.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated =
                                      formData.refNoPaymentMade.filter(
                                        (_, i) => i !== idx
                                      );
                                    handleChange("refNoPaymentMade", updated);
                                  }}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition flex-shrink-0"
                                  title="Remove this ref"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                              {idx === formData.refNoPaymentMade.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleChange("refNoPaymentMade", [
                                      ...formData.refNoPaymentMade,
                                      "",
                                    ])
                                  }
                                  className="p-1.5 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition flex-shrink-0"
                                  title="Add another ref"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {/* Dropdown — only show for the currently focused input */}
                            {showRefDropdown &&
                              idx === formData.refNoPaymentMade.length - 1 && (
                                <div className="absolute z-30 left-0 right-8 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                                  {(() => {
                                    const q = refSearchQuery
                                      .toLowerCase()
                                      .trim();
                                    const alreadySelected =
                                      formData.refNoPaymentMade.filter((r) =>
                                        r.trim()
                                      );

                                    const filtered = availableRefs.filter(
                                      (r) => {
                                        // Hide already selected refs
                                        if (alreadySelected.includes(r.ref))
                                          return false;
                                        // Filter by query
                                        if (!q) return true;
                                        return (
                                          r.ref
                                            ?.toLowerCase()
                                            .includes(q) ||
                                          r.client_name
                                            ?.toLowerCase()
                                            .includes(q) ||
                                          String(r.amount || "").includes(q)
                                        );
                                      }
                                    );

                                    if (filtered.length === 0) {
                                      return (
                                        <div className="px-4 py-3 text-xs text-gray-400 text-center">
                                          {q
                                            ? `No available refs matching "${refSearchQuery}"`
                                            : "No available advance refs — all are closed or already linked"}
                                        </div>
                                      );
                                    }

                                    return filtered.map((r) => (
                                      <button
                                        key={r.ref}
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          const updated = [
                                            ...formData.refNoPaymentMade,
                                          ];
                                          updated[idx] = r.ref;
                                          handleChange(
                                            "refNoPaymentMade",
                                            updated
                                          );
                                          setShowRefDropdown(false);
                                          setRefSearchQuery("");
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          {/* Left — type badge + ref + client + date */}
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                              {/* CA = red (outflow), PR = green (inflow) */}
                                              <span
                                                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                                  r.flow === "out"
                                                    ? "bg-red-50 text-red-600 border-red-200" // CA — red — money went OUT
                                                    : "bg-emerald-50 text-emerald-700 border-emerald-200" // PR — green — money came IN
                                                }`}
                                              >
                                                {r.flow === "out"
                                                  ? "⬆ CA"
                                                  : "⬇ PR"}
                                              </span>
                                              <span className="font-mono text-xs font-semibold text-gray-700">
                                                {r.ref}
                                              </span>
                                              <span
                                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                                  r.status === "Pending"
                                                    ? "bg-amber-50 text-amber-600 border border-amber-200"
                                                    : r.status ===
                                                      "Partially Paid"
                                                    ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                                                    : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                                }`}
                                              >
                                                {r.status}
                                              </span>
                                            </div>
                                            {/* Client name — bold */}
                                            <p className="text-sm font-semibold text-gray-800 truncate">
                                              {r.client_name}
                                            </p>
                                            {/* Date */}
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                              {r.date
                                                ? new Date(
                                                    r.date
                                                  ).toLocaleDateString(
                                                    "en-IN",
                                                    {
                                                      day: "2-digit",
                                                      month: "short",
                                                      year: "numeric",
                                                    }
                                                  )
                                                : "—"}
                                            </p>
                                          </div>
                                          {/* Right — amount */}
                                          <div className="text-right flex-shrink-0">
                                            <p
                                              className={`text-sm font-black ${
                                                r.flow === "out"
                                                  ? "text-red-600"
                                                  : "text-emerald-600"
                                              }`}
                                            >
                                              {r.flow === "out" ? "−" : "+"}₹
                                              {Number(
                                                r.amount || 0
                                              ).toLocaleString("en-IN")}
                                            </p>
                                            {r.flow === "out" &&
                                              Number(r.pending_due) > 0 && (
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                  Pending: ₹
                                                  {Number(
                                                    r.pending_due || 0
                                                  ).toLocaleString("en-IN")}
                                                </p>
                                              )}
                                          </div>
                                        </div>
                                      </button>
                                    ));
                                  })()}
                                </div>
                              )}

                            {/* Show linked ref info if already filled */}
                            {ref.trim() && (() => {
                              const linked = availableRefs.find(
                                (r) => r.ref === ref.trim()
                              );
                              if (!linked)
                                return (
                                  <p className="text-[11px] text-gray-400 mt-1 ml-1">
                                    Ref typed manually:{" "}
                                    <span className="font-mono font-semibold text-gray-600">
                                      {ref}
                                    </span>
                                  </p>
                                );
                              return (
                                <div
                                  className={`mt-1 px-3 py-2 rounded-lg border flex items-center justify-between ${
                                    linked.flow === "out"
                                      ? "bg-red-50 border-red-200"
                                      : "bg-emerald-50 border-emerald-200"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`text-[10px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                        linked.flow === "out"
                                          ? "bg-red-100 text-red-600"
                                          : "bg-emerald-100 text-emerald-700"
                                      }`}
                                    >
                                      {linked.flow === "out" ? "⬆ CA" : "⬇ PR"}
                                    </span>
                                    <div className="min-w-0">
                                      <p
                                        className="text-xs font-bold truncate"
                                        style={{
                                          color:
                                            linked.flow === "out"
                                              ? "#dc2626"
                                              : "#059669",
                                        }}
                                      >
                                        {linked.client_name}
                                      </p>
                                      <p className="text-[10px] text-gray-400">
                                        {linked.date
                                          ? new Date(
                                              linked.date
                                            ).toLocaleDateString("en-IN", {
                                              day: "2-digit",
                                              month: "short",
                                              year: "numeric",
                                            })
                                          : ""}
                                      </p>
                                    </div>
                                  </div>
                                  <span
                                    className={`text-sm font-black flex-shrink-0 ml-2 ${
                                      linked.flow === "out"
                                        ? "text-red-600"
                                        : "text-emerald-600"
                                    }`}
                                  >
                                    {linked.flow === "out" ? "−" : "+"}₹
                                    {Number(linked.amount || 0).toLocaleString(
                                      "en-IN"
                                    )}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-amber-500 mt-1.5">
                        💡 Search by client name, ref no or amount — only
                        open/unlinked advances shown
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 3: OS Extra Fields */}
                {isOS && (
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
                      </div>
                      <div>
                        <label className={lbl}>
                          Co ESI = ER ESIC + EE ESIC
                        </label>
                        <input
                          type="number"
                          value={formData.coESI}
                          onChange={(e) =>
                            handleChange("coESI", e.target.value)
                          }
                          className={inpNormal}
                          placeholder="₹ 0"
                        />
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
                        <p className="text-xs text-rose-500 mt-1">
                          Gross Value - Co
                        </p>
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
                        <p className="text-xs text-amber-500 mt-1">
                          📌 Alert Ping
                        </p>
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
                        <p className="text-xs text-amber-500 mt-1">
                          📌 Alert Ping
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-4 mt-4">
                      {[
                        {
                          field: "expectedOutflowInHand",
                          label: 'Expected Outflow "In hand"',
                        },
                        {
                          field: "expectedOutflowPF",
                          label: 'Expected Outflow "PF"',
                          hint: "As per master due date",
                        },
                        {
                          field: "expectedOutflowESI",
                          label: 'Expected Outflow "ESI"',
                          hint: "As per master due date",
                        },
                        {
                          field: "expectedOutflowGST",
                          label: 'Expected Outflow "GST"',
                          hint: "As per master due date",
                        },
                        {
                          field: "expectedOutflowTax",
                          label: 'Expected Outflow "Tax Deducted"',
                          hint: "As per master due date",
                        },
                      ].map(({ field, label, hint }) => (
                        <div key={field}>
                          <label className={lbl}>{label}</label>
                          <input
                            type="date"
                            value={formData[field]}
                            onChange={(e) =>
                              handleChange(field, e.target.value)
                            }
                            className={inpNormal}
                          />
                          {hint && (
                            <p className="text-xs text-gray-400 mt-1">{hint}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  {canSave && (
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
                  )}
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